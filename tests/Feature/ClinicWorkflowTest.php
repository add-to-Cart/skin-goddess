<?php

use App\Mail\ClinicInvoice;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

function clinicHeaders(string $role = 'admin'): array
{
    $user = User::factory()->create(['username' => fake()->unique()->userName(), 'hashed_password' => Hash::make('clinic-test-password'), 'role' => $role, 'is_active' => true]);

    return ['Authorization' => 'Bearer '.Crypt::encryptString(json_encode(['user_id' => $user->id, 'expires_at' => time() + 3600]))];
}

function clinicClientAndService($test): array
{
    $client = $test->postJson('/api/clients', ['first_name' => 'Test', 'last_name' => 'Client'])->assertCreated()->json();
    $service = $test->postJson('/api/services', ['name' => 'Facial', 'default_price' => '100.00'])->assertCreated()->json();

    return [$client['id'], $service['id']];
}

test('clinic endpoints return 401 without a valid token', function () {
    $this->getJson('/api/clients')->assertUnauthorized()->assertJsonStructure(['detail']);
    $this->withToken('invalid-token')->getJson('/api/dashboard')->assertUnauthorized();
});

test('expired or malformed encrypted credentials return 401', function () {
    $invalid = Crypt::encryptString(json_encode(['user_id' => [], 'expires_at' => time() + 3600]));
    $expired = Crypt::encryptString(json_encode(['user_id' => 1, 'expires_at' => time() - 1]));

    $this->withToken($invalid)->getJson('/api/clients')->assertUnauthorized();
    $this->withToken($expired)->getJson('/api/clients')->assertUnauthorized();
});

test('staff receive 403 on financial reports expenses and user management', function () {
    $this->withHeaders(clinicHeaders('staff'));

    $this->getJson('/api/reports/sales/daily')->assertForbidden();
    $this->postJson('/api/expenses', ['expense_date' => '2026-10-14', 'description' => 'Rent', 'amount' => '100.00'])->assertForbidden();
    $this->getJson('/api/auth/users')->assertForbidden();
    $this->assertDatabaseCount('expenses', 0);
});

test('imported bcrypt passwords authenticate and protected responses hide password hashes', function () {
    User::factory()->create(['username' => 'clinic', 'hashed_password' => password_hash('correct-password', PASSWORD_BCRYPT), 'role' => 'admin', 'is_active' => true]);

    $login = $this->post('/api/auth/login', ['username' => ' CLINIC ', 'password' => 'correct-password'], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('role', 'admin');
    $this->withToken($login->json('access_token'))->getJson('/api/auth/me')->assertOk()->assertJsonMissingPath('hashed_password')->assertJsonMissingPath('password');
    $this->postJson('/api/auth/login', ['username' => 'clinic', 'password' => 'incorrect'])->assertUnauthorized();
});

test('client creation editing search and archived history persist', function () {
    $this->withHeaders(clinicHeaders());
    $client = $this->postJson('/api/clients', ['first_name' => 'Maria', 'last_name' => 'Santos', 'phone' => '12345'])->assertCreated()->json();

    $this->patchJson('/api/clients/'.$client['id'], ['phone' => '67890'])->assertOk()->assertJsonPath('phone', '67890');
    $this->getJson('/api/clients?search=Santos')->assertOk()->assertJsonCount(1);
    $this->deleteJson('/api/clients/'.$client['id'])->assertNoContent();
    $this->getJson('/api/clients')->assertJsonCount(0);
    $this->assertDatabaseHas('clients', ['id' => $client['id'], 'phone' => '67890', 'is_active' => false]);
});

test('procedure supplies deduct stock and removal restores it exactly once', function () {
    $this->withHeaders(clinicHeaders());
    [$clientId, $serviceId] = clinicClientAndService($this);
    $item = $this->postJson('/api/inventory/items', ['name' => 'Serum', 'current_quantity' => '5.000', 'acquisition_cost' => '20.00'])->assertCreated()->json();

    $procedure = $this->postJson('/api/procedures', ['client_id' => $clientId, 'service_id' => $serviceId, 'procedure_date' => '2026-10-14', 'supplies' => [['inventory_item_id' => $item['id'], 'quantity_used' => '1.125']]])->assertCreated()->json();
    $this->assertDatabaseHas('inventory_items', ['id' => $item['id'], 'current_quantity' => '3.875']);
    $this->patchJson('/api/procedures/'.$procedure['id'], ['client_id' => $clientId, 'notes' => 'Updated treatment'])->assertOk();
    $this->assertDatabaseHas('inventory_items', ['id' => $item['id'], 'current_quantity' => '3.875']);
    $supplyId = $procedure['supplies_used'][0]['id'];
    $this->deleteJson('/api/procedures/'.$procedure['id'].'/supplies/'.$supplyId)->assertNoContent();
    $this->deleteJson('/api/procedures/'.$procedure['id'].'/supplies/'.$supplyId)->assertNotFound();
    $this->assertDatabaseHas('inventory_items', ['id' => $item['id'], 'current_quantity' => '5.000']);
    $this->assertDatabaseCount('procedure_supplies', 0);
    $this->assertDatabaseCount('inventory_transactions', 3);
});

test('insufficient stock returns 409 and rolls back the complete procedure', function () {
    $this->withHeaders(clinicHeaders());
    [$clientId, $serviceId] = clinicClientAndService($this);
    $item = $this->postJson('/api/inventory/items', ['name' => 'Serum', 'current_quantity' => '1.000'])->assertCreated()->json();

    $this->postJson('/api/procedures', ['client_id' => $clientId, 'service_id' => $serviceId, 'procedure_date' => '2026-10-14', 'supplies' => [['inventory_item_id' => $item['id'], 'quantity_used' => '0.500'], ['inventory_item_id' => $item['id'], 'quantity_used' => '0.750']]])->assertConflict()->assertJsonPath('detail', 'Insufficient inventory quantity.');

    $this->assertDatabaseCount('procedures', 0);
    $this->assertDatabaseCount('procedure_supplies', 0);
    $this->assertDatabaseCount('inventory_transactions', 1);
    $this->assertDatabaseHas('inventory_items', ['id' => $item['id'], 'current_quantity' => '1.000']);
});

test('supply input cannot override its procedure or calculated stock', function () {
    $this->withHeaders(clinicHeaders());
    [$clientId, $serviceId] = clinicClientAndService($this);
    $item = $this->postJson('/api/inventory/items', ['name' => 'Serum', 'current_quantity' => '5.000'])->assertCreated()->json();

    $procedure = $this->postJson('/api/procedures', ['client_id' => $clientId, 'service_id' => $serviceId, 'procedure_date' => '2026-10-14', 'supplies' => [['inventory_item_id' => $item['id'], 'quantity_used' => '1.000', 'procedure_id' => 999, 'id' => 999]]])->assertCreated()->json();

    $this->assertDatabaseHas('procedure_supplies', ['procedure_id' => $procedure['id']]);
    $this->assertDatabaseMissing('procedure_supplies', ['id' => 999]);
});

test('purchases stock additions and invalid deductions preserve stock and audit totals', function () {
    $this->withHeaders(clinicHeaders());
    $item = $this->postJson('/api/inventory/items', ['name' => 'Serum'])->assertCreated()->json();

    $this->postJson('/api/inventory/purchases', ['purchase_date' => '2026-10-14', 'items' => [['inventory_item_id' => $item['id'], 'quantity' => '2.500', 'unit_cost' => '10.20']]])->assertCreated()->assertJsonPath('total_cost', 25.5);
    $this->postJson('/api/inventory/items/'.$item['id'].'/adjust', ['direction' => 'subtract', 'quantity' => '3.000'])->assertConflict();
    $this->postJson('/api/inventory/items/'.$item['id'].'/adjust', ['direction' => 'add', 'quantity' => '-1.000'])->assertUnprocessable();
    $this->assertDatabaseHas('inventory_items', ['id' => $item['id'], 'current_quantity' => '2.500', 'acquisition_cost' => '10.20']);
    $this->assertDatabaseCount('inventory_transactions', 1);
});

test('partial payments retries stale balances overpayments and voids keep financial totals correct', function () {
    $this->withHeaders(clinicHeaders());
    [$clientId] = clinicClientAndService($this);
    $sale = $this->postJson('/api/sales', ['client_id' => $clientId, 'sale_date' => '2026-10-14', 'items' => [['description' => 'Facial', 'quantity' => '1.000', 'unit_price' => '100.10']]])->assertCreated()->assertJsonPath('total_amount', 100.1)->json();
    $data = ['sale_id' => $sale['id'], 'payment_date' => '2026-10-14', 'amount' => '30.05', 'expected_remaining_balance' => '100.10', 'idempotency_key' => 'test-payment-request-001', 'payment_method' => 'cash'];

    $payment = $this->postJson('/api/payments', $data)->assertCreated()->json();
    $this->postJson('/api/payments', $data)->assertOk()->assertJsonPath('id', $payment['id']);
    $this->postJson('/api/payments', array_replace($data, ['idempotency_key' => 'test-payment-request-002']))->assertConflict();
    $this->postJson('/api/payments', array_replace($data, ['idempotency_key' => 'test-payment-request-003', 'amount' => '70.06', 'expected_remaining_balance' => '70.05']))->assertConflict();
    $this->getJson('/api/sales/'.$sale['id'].'/summary')->assertOk()->assertJsonPath('remaining_balance', 70.05)->assertJsonPath('payment_status', 'partial');
    $this->assertDatabaseCount('payments', 1);
    $this->postJson('/api/payments/'.$payment['id'].'/void', ['reason' => 'Incorrect amount'])->assertOk()->assertJsonPath('status', 'voided');
    $this->getJson('/api/sales/'.$sale['id'].'/summary')->assertJsonPath('remaining_balance', 100.1)->assertJsonPath('payment_status', 'unpaid');
    $this->patchJson('/api/payments/'.$payment['id'], ['amount' => 1])->assertStatus(405);
    $this->assertDatabaseHas('payments', ['id' => $payment['id'], 'amount' => '30.05', 'status' => 'voided', 'void_reason' => 'Incorrect amount']);
});

test('sale totals use decimal line arithmetic and expense reports match entries', function () {
    $this->withHeaders(clinicHeaders());
    [$clientId] = clinicClientAndService($this);
    $this->postJson('/api/sales', ['client_id' => $clientId, 'sale_date' => '2026-10-14', 'items' => [['description' => 'Line one', 'quantity' => 3, 'unit_price' => '0.10'], ['description' => 'Line two', 'quantity' => 1, 'unit_price' => '0.20']]])->assertCreated()->assertJsonPath('total_amount', 0.5);
    $this->postJson('/api/expenses', ['expense_date' => '2026-10-14', 'description' => 'Rent', 'category' => 'rent', 'amount' => '20.10'])->assertCreated();

    $this->getJson('/api/reports/sales/range?date_from=2026-10-14&date_to=2026-10-14')->assertOk()->assertJsonPath('total_sales', 0.5)->assertJsonPath('total_outstanding', 0.5);
    $this->getJson('/api/reports/expenses/daily?report_date=2026-10-14')->assertOk()->assertJsonPath('total_expenses', 20.1);
    $this->assertDatabaseHas('sales', ['total_amount' => '0.50']);
});

test('missing client fields produce helpful validation messages with 422', function () {
    $this->withHeaders(clinicHeaders());

    $this->postJson('/api/clients', [])->assertUnprocessable()->assertJsonPath('detail', 'The first name field is required. The last name field is required.');
    $this->assertDatabaseCount('clients', 0);
});

test('invoices download as PDFs and unconfigured email delivery returns 503', function () {
    $this->withHeaders(clinicHeaders());
    [$clientId] = clinicClientAndService($this);
    $sale = $this->postJson('/api/sales', ['client_id' => $clientId, 'sale_date' => '2026-10-14', 'items' => [['description' => 'Facial', 'unit_price' => '100.00']]])->assertCreated()->json();

    $pdf = $this->get('/api/sales/'.$sale['id'].'/invoice')->assertOk()->assertHeader('Content-Type', 'application/pdf');
    expect(substr($pdf->getContent(), 0, 5))->toBe('%PDF-');
    $this->postJson('/api/sales/'.$sale['id'].'/send-invoice', ['recipient_email' => 'client@example.test'])->assertStatus(503)->assertJsonPath('detail', 'Invoice email delivery requires the existing clinic SMTP account to be configured in Laravel.');
});

test('fractional sale totals preserve the source aggregate rounding rule', function () {
    $this->withHeaders(clinicHeaders());
    [$clientId] = clinicClientAndService($this);

    $this->postJson('/api/sales', ['client_id' => $clientId, 'sale_date' => '2026-10-14', 'items' => [['description' => 'First', 'quantity' => '0.500', 'unit_price' => '0.01'], ['description' => 'Second', 'quantity' => '0.500', 'unit_price' => '0.01']]])->assertCreated()->assertJsonPath('total_amount', 0.01);
    $this->assertDatabaseHas('sales', ['total_amount' => '0.01']);
});

test('configured invoice email dispatches a PDF to the requested recipient without live delivery', function () {
    $this->withHeaders(clinicHeaders());
    [$clientId] = clinicClientAndService($this);
    $sale = $this->postJson('/api/sales', ['client_id' => $clientId, 'sale_date' => '2026-10-14', 'items' => [['description' => 'Facial', 'unit_price' => '100.00']]])->assertCreated()->json();
    config(['mail.default' => 'smtp', 'mail.mailers.smtp.host' => 'smtp.example.test']);
    Mail::fake();

    $this->postJson('/api/sales/'.$sale['id'].'/send-invoice', ['recipient_email' => 'client@example.test'])->assertOk()->assertJsonPath('sent_to', 'client@example.test');

    Mail::assertSent(ClinicInvoice::class, fn (ClinicInvoice $mail) => $mail->hasTo('client@example.test') && str_starts_with($mail->pdfBytes, '%PDF-') && $mail->context['total_amount'] === '100.00');
});
