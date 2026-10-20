<?php

use App\Mail\ClinicInvoice;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

function correctionFixture(TestCase $test, string $role = 'admin'): array
{
    $test->travelTo(now()->setDate(2026, 10, 20)->setTime(2, 0));
    $user = User::factory()->create(['username' => fake()->unique()->userName(), 'role' => $role, 'is_active' => true]);
    $test->withToken(Crypt::encryptString(json_encode(['user_id' => $user->id, 'expires_at' => time() + 3600], JSON_THROW_ON_ERROR)));
    $client = $test->postJson('/api/clients', ['first_name' => 'Maria', 'last_name' => 'Santos'])->assertCreated()->json();
    $sale = $test->postJson('/api/sales', ['client_id' => $client['id'], 'sale_date' => '2026-10-20', 'notes' => 'Original note', 'items' => [['description' => 'Facial', 'quantity' => 1, 'unit_price' => '100.00']]])->assertCreated()->json();

    return [$sale, $user];
}

function correctionPayload(array $sale): array
{
    return ['expected_version' => $sale['version'], 'reason' => 'Correct the price entered at checkout', 'sale_date' => '2026-10-19', 'notes' => 'Corrected note', 'items' => [['id' => $sale['items'][0]['id'], 'description' => 'Corrected facial', 'quantity' => 2, 'unit_price' => '75.00']]];
}

function correctionPayment(TestCase $test, array $sale, string $amount = '40.00'): array
{
    return $test->postJson('/api/payments', ['sale_id' => $sale['id'], 'payment_date' => '2026-10-20', 'amount' => $amount, 'expected_remaining_balance' => $sale['total_amount'], 'idempotency_key' => 'correction-payment-request', 'payment_method' => 'cash'])->assertCreated()->json();
}

test('administrator correction retains original values actor time and every payment', function () {
    [$sale, $user] = correctionFixture($this);
    $payment = correctionPayment($this, $sale);
    $paymentsBefore = DB::table('payments')->get()->toJson();
    $sale = $this->getJson('/api/sales/'.$sale['id'])->assertOk()->json();

    $this->patchJson('/api/sales/'.$sale['id'], correctionPayload($sale))->assertOk()->assertJsonPath('total_amount', 150)->assertJsonPath('payment_status', 'partial')->assertJsonPath('version', 2);

    $this->assertDatabaseHas('sales', ['id' => $sale['id'], 'sale_date' => '2026-10-19', 'notes' => 'Corrected note', 'total_amount' => '150.00']);
    expect(DB::table('payments')->get()->toJson())->toBe($paymentsBefore);
    $this->assertDatabaseHas('payments', ['id' => $payment['id'], 'status' => 'recorded']);
    $this->getJson('/api/payments/sale/'.$sale['id'])->assertOk()->assertJsonPath('remaining_balance', 110);
    $history = $this->getJson('/api/sales/'.$sale['id'].'/corrections')->assertOk()->assertJsonCount(1)->assertJsonPath('0.corrected_by_user_id', $user->id)->assertJsonPath('0.corrected_by_username', $user->username)->assertJsonPath('0.created_at', '2026-10-20T02:00:00.000000Z')->assertJsonPath('0.before_snapshot.total_amount', 100)->assertJsonPath('0.after_snapshot.total_amount', 150)->json();
    expect($history[0]['before_snapshot']['items'][0]['description'])->toBe('Facial');
    expect($history[0]['after_snapshot']['items'][0]['description'])->toBe('Corrected facial');
    $this->assertDatabaseCount('sale_corrections', 1);
});

test('sale updates return 401 without authentication and 403 for staff including date only updates', function () {
    $this->patchJson('/api/sales/1', [])->assertUnauthorized();
    [$sale] = correctionFixture($this, 'staff');

    $this->patchJson('/api/sales/'.$sale['id'], correctionPayload($sale))->assertForbidden();
    $this->putJson('/api/sales/'.$sale['id'], ['sale_date' => '2026-10-19'])->assertForbidden();

    $this->assertDatabaseHas('sales', ['id' => $sale['id'], 'sale_date' => '2026-10-20', 'version' => 0]);
    $this->assertDatabaseCount('sale_corrections', 0);
});

test('corrections return 422 for missing reason version invalid lines and client changes', function (array $changes, string $errorField) {
    [$sale] = correctionFixture($this);
    $payload = array_replace(correctionPayload($sale), $changes);

    $this->patchJson('/api/sales/'.$sale['id'], $payload)->assertUnprocessable()->assertJsonValidationErrors($errorField);

    $this->assertDatabaseHas('sales', ['id' => $sale['id'], 'total_amount' => '100.00', 'version' => 0]);
    $this->assertDatabaseHas('sale_items', ['id' => $sale['items'][0]['id'], 'description' => 'Facial']);
    $this->assertDatabaseCount('sale_corrections', 0);
})->with([
    'blank reason' => [['reason' => '   '], 'reason'],
    'missing version' => [['expected_version' => null], 'expected_version'],
    'client change' => [['client_id' => 999], 'client_id'],
    'no lines' => [['items' => []], 'items'],
    'zero quantity' => [['items' => [['description' => 'Facial', 'quantity' => 0, 'unit_price' => 5]]], 'items.0.quantity'],
    'negative price' => [['items' => [['description' => 'Facial', 'quantity' => 1, 'unit_price' => -1]]], 'items.0.unit_price'],
    'excess price precision' => [['items' => [['description' => 'Facial', 'quantity' => 1, 'unit_price' => '1.001']]], 'items.0.unit_price'],
    'change procedure link' => [['items' => [['procedure_id' => 999, 'description' => 'Facial', 'quantity' => 1, 'unit_price' => 5]]], 'items.0.procedure_id'],
]);

test('correction below recorded payments returns 409 with no changes', function () {
    [$sale] = correctionFixture($this);
    correctionPayment($this, $sale);
    $sale = $this->getJson('/api/sales/'.$sale['id'])->assertOk()->json();
    $before = Sale::with('items')->findOrFail($sale['id'])->toArray();
    $payload = correctionPayload($sale);
    $payload['items'][0]['quantity'] = 1;
    $payload['items'][0]['unit_price'] = '39.99';

    $this->patchJson('/api/sales/'.$sale['id'], $payload)->assertConflict()->assertJsonPath('detail', 'The corrected total cannot be below recorded payments. Refunds are not supported yet.');

    expect(Sale::with('items')->findOrFail($sale['id'])->toArray())->toBe($before);
    $this->assertDatabaseCount('sale_corrections', 0);
    $this->assertDatabaseHas('payments', ['amount' => '40.00', 'status' => 'recorded']);
});

test('correction equal to recorded payments marks the sale paid and excludes voided amounts', function () {
    [$sale] = correctionFixture($this);
    $payment = correctionPayment($this, $sale);
    $sale = $this->getJson('/api/sales/'.$sale['id'])->assertOk()->json();
    $payload = correctionPayload($sale);
    $payload['items'][0]['quantity'] = 1;
    $payload['items'][0]['unit_price'] = '40.00';

    $corrected = $this->patchJson('/api/sales/'.$sale['id'], $payload)->assertOk()->assertJsonPath('payment_status', 'paid')->json();

    $this->getJson('/api/sales/'.$sale['id'].'/summary')->assertOk()->assertJsonPath('remaining_balance', 0);
    $this->postJson('/api/payments/'.$payment['id'].'/void', ['reason' => 'Incorrect cash entry'])->assertOk();
    $corrected = $this->getJson('/api/sales/'.$sale['id'])->assertOk()->json();
    $payload = correctionPayload($corrected);
    $payload['items'][0]['quantity'] = 1;
    $payload['items'][0]['unit_price'] = '10.00';
    $this->patchJson('/api/sales/'.$sale['id'], $payload)->assertOk()->assertJsonPath('payment_status', 'unpaid');
    $this->assertDatabaseCount('sale_corrections', 2);
    $this->getJson('/api/sales/'.$sale['id'].'/corrections')->assertOk()->assertJsonPath('0.revision', 2)->assertJsonPath('1.revision', 1);
});

test('stale correction after another correction payment or void returns 409', function (string $operation) {
    [$sale] = correctionFixture($this);
    if ($operation === 'void') {
        $payment = correctionPayment($this, $sale);
        $sale = $this->getJson('/api/sales/'.$sale['id'])->assertOk()->json();
    }
    $payload = correctionPayload($sale);
    if ($operation === 'correction') {
        $this->patchJson('/api/sales/'.$sale['id'], $payload)->assertOk();
    } elseif ($operation === 'payment') {
        correctionPayment($this, $sale);
    } else {
        $this->postJson('/api/payments/'.$payment['id'].'/void', ['reason' => 'Wrong payment'])->assertOk();
    }
    $before = Sale::with('items')->findOrFail($sale['id'])->toArray();
    $historyCount = DB::table('sale_corrections')->count();

    $this->patchJson('/api/sales/'.$sale['id'], $payload)->assertConflict()->assertJsonPath('detail', 'This sale or its payments changed. Reload the sale and review your correction again.');

    expect(Sale::with('items')->findOrFail($sale['id'])->toArray())->toBe($before);
    $this->assertDatabaseCount('sale_corrections', $historyCount);
})->with(['correction', 'payment', 'void']);

test('foreign sale lines return 422 without modifying either sale', function () {
    [$sale] = correctionFixture($this);
    $other = $this->postJson('/api/sales', ['client_id' => $sale['client_id'], 'sale_date' => '2026-10-20', 'items' => [['description' => 'Other visit', 'unit_price' => 50]]])->assertCreated()->json();
    $payload = correctionPayload($sale);
    $payload['items'][0]['id'] = $other['items'][0]['id'];

    $this->patchJson('/api/sales/'.$sale['id'], $payload)->assertUnprocessable()->assertJsonPath('detail', 'A line item does not belong to this sale.');

    $this->assertDatabaseHas('sale_items', ['id' => $other['items'][0]['id'], 'description' => 'Other visit']);
    $this->assertDatabaseHas('sale_items', ['id' => $sale['items'][0]['id'], 'description' => 'Facial']);
    $this->assertDatabaseCount('sale_corrections', 0);
});

test('added and removed lines preserve history and aggregate decimal rounding', function () {
    [$sale] = correctionFixture($this);
    $payload = correctionPayload($sale);
    $payload['items'] = [['description' => 'First', 'quantity' => '0.500', 'unit_price' => '0.01', 'line_total' => 999], ['description' => 'Second', 'quantity' => '0.500', 'unit_price' => '0.01']];
    $payload['total_amount'] = 999;

    $this->patchJson('/api/sales/'.$sale['id'], $payload)->assertOk()->assertJsonPath('total_amount', 0.01)->assertJsonCount(2, 'items');

    $this->assertDatabaseMissing('sale_items', ['id' => $sale['items'][0]['id']]);
    $this->getJson('/api/sales/'.$sale['id'].'/corrections')->assertOk()->assertJsonPath('0.before_snapshot.items.0.id', $sale['items'][0]['id'])->assertJsonPath('0.after_snapshot.items.0.line_total', 0.01);
});

test('an error after line changes rolls back the entire correction', function () {
    [$sale] = correctionFixture($this);
    $before = Sale::with('items')->findOrFail($sale['id'])->toArray();
    Event::listen('eloquent.updated: '.Sale::class, function (): void {
        throw new RuntimeException('Simulated persistence failure');
    });

    try {
        $this->patchJson('/api/sales/'.$sale['id'], correctionPayload($sale))->assertInternalServerError();
    } finally {
        Event::forget('eloquent.updated: '.Sale::class);
    }

    expect(Sale::with('items')->findOrFail($sale['id'])->toArray())->toBe($before);
    $this->assertDatabaseCount('sale_corrections', 0);
});

test('corrected invoice keeps its number identifies revision and uses corrected values', function () {
    [$sale] = correctionFixture($this);
    $payload = correctionPayload($sale);
    $payload['items'][0]['description'] = '<script>alert(1)</script> Facial';
    $this->patchJson('/api/sales/'.$sale['id'], $payload)->assertOk();
    config(['mail.default' => 'smtp', 'mail.mailers.smtp.host' => 'smtp.example.test']);
    Mail::fake();

    $this->postJson('/api/sales/'.$sale['id'].'/send-invoice', ['recipient_email' => 'maria@example.test'])->assertOk()->assertJsonPath('invoice_number', 'INV-'.str_pad((string) $sale['id'], 5, '0', STR_PAD_LEFT));

    Mail::assertSent(ClinicInvoice::class, function (ClinicInvoice $mail) use ($sale): bool {
        $html = view('invoice', $mail->context)->render();
        expect($html)->toContain('Corrected invoice')->toContain('&lt;script&gt;')->not->toContain('<script>alert');
        expect($mail->render())->toContain('Corrected invoice');

        return $mail->context['correction_revision'] === 1 && $mail->context['total_amount'] === '150.00' && $mail->context['invoice_number'] === 'INV-'.str_pad((string) $sale['id'], 5, '0', STR_PAD_LEFT) && str_starts_with($mail->pdfBytes, '%PDF-');
    });
});

test('retained sale lines keep their original procedure links during correction', function () {
    [$sale] = correctionFixture($this);
    $service = $this->postJson('/api/services', ['name' => 'Facial'])->assertCreated()->json();
    $procedure = $this->postJson('/api/procedures', ['client_id' => $sale['client_id'], 'service_id' => $service['id'], 'procedure_date' => '2026-10-20'])->assertCreated()->json();
    $linkedSale = $this->postJson('/api/sales', ['client_id' => $sale['client_id'], 'sale_date' => '2026-10-20', 'items' => [['procedure_id' => $procedure['id'], 'description' => 'Linked facial', 'unit_price' => 100]]])->assertCreated()->json();

    $this->patchJson('/api/sales/'.$linkedSale['id'], correctionPayload($linkedSale))->assertOk()->assertJsonPath('items.0.procedure_id', $procedure['id']);

    $this->getJson('/api/sales/'.$linkedSale['id'].'/corrections')->assertOk()->assertJsonPath('0.before_snapshot.items.0.procedure_id', $procedure['id'])->assertJsonPath('0.after_snapshot.items.0.procedure_id', $procedure['id']);
    $this->assertDatabaseHas('procedures', ['id' => $procedure['id'], 'client_id' => $sale['client_id']]);
});

test('increasing a paid sale reopens only the additional balance and reports corrected totals', function () {
    [$sale] = correctionFixture($this);
    correctionPayment($this, $sale, '100.00');
    $sale = $this->getJson('/api/sales/'.$sale['id'])->assertOk()->assertJsonPath('payment_status', 'paid')->json();

    $this->patchJson('/api/sales/'.$sale['id'], correctionPayload($sale))->assertOk()->assertJsonPath('payment_status', 'partial');

    $this->getJson('/api/sales/'.$sale['id'].'/summary')->assertOk()->assertJsonPath('total_paid', 100)->assertJsonPath('remaining_balance', 50);
    $this->getJson('/api/reports/sales/range?date_from=2026-10-19&date_to=2026-10-19')->assertOk()->assertJsonPath('total_sales', 150)->assertJsonPath('total_collected', 100)->assertJsonPath('total_outstanding', 50);
    $this->getJson('/api/reports/sales/daily?report_date=2026-10-20')->assertOk()->assertJsonPath('total_sales', 0);
    $this->assertDatabaseHas('payments', ['sale_id' => $sale['id'], 'amount' => '100.00', 'status' => 'recorded']);
});
