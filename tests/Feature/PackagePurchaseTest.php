<?php

use App\Models\Procedure;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

function packagePurchasePayload(TestCase $test, string $role = 'staff'): array
{
    $user = User::factory()->create(['username' => fake()->unique()->userName(), 'role' => $role, 'is_active' => true]);
    $test->withToken(Crypt::encryptString(json_encode(['user_id' => $user->id, 'expires_at' => time() + 3600], JSON_THROW_ON_ERROR)));
    $client = $test->postJson('/api/clients', ['first_name' => 'Ana', 'last_name' => 'Santos'])->assertCreated()->json();
    $service = $test->postJson('/api/services', ['name' => 'Facial', 'default_price' => '2500.00'])->assertCreated()->json();

    return ['client_id' => $client['id'], 'sale_date' => '2026-10-25', 'package_service_id' => $service['id'], 'included_sessions' => 6, 'package_purchase_key' => 'package-purchase-request-001', 'items' => [['description' => 'Six facial sessions', 'quantity' => 1, 'unit_price' => '12000.00']]];
}

function packageCorrectionPayload(array $sale): array
{
    return ['expected_version' => $sale['version'], 'reason' => 'Correct agreed purchase price', 'sale_date' => '2026-10-25', 'notes' => 'Approved correction', 'items' => [['id' => $sale['items'][0]['id'], 'description' => 'Six facial sessions corrected price', 'quantity' => 1, 'unit_price' => '11000.00']]];
}

test('staff can buy one package without creating treatments payments or stock movements', function () {
    $payload = packagePurchasePayload($this);
    $item = $this->postJson('/api/inventory/items', ['name' => 'Serum', 'current_quantity' => '10.000'])->assertCreated()->json();
    $movements = DB::table('inventory_transactions')->count();

    $sale = $this->postJson('/api/sales', $payload)->assertCreated()->assertJsonPath('total_amount', 12000)->assertJsonPath('payment_status', 'unpaid')->assertJsonPath('included_sessions', 6)->assertJsonMissingPath('package_purchase_fingerprint')->json();

    $this->assertDatabaseHas('sales', ['id' => $sale['id'], 'client_id' => $payload['client_id'], 'package_service_id' => $payload['package_service_id'], 'included_sessions' => 6, 'total_amount' => '12000.00']);
    $this->assertDatabaseCount('sale_items', 1);
    $this->assertDatabaseCount('procedures', 0);
    $this->assertDatabaseCount('payments', 0);
    $this->assertDatabaseCount('inventory_transactions', $movements);
    $this->assertDatabaseHas('inventory_items', ['id' => $item['id'], 'current_quantity' => '10.000']);
    $model = Sale::findOrFail($sale['id']);
    expect($model->package_service->id)->toBe($payload['package_service_id']);
    expect($model->package_procedures)->toHaveCount(0);
    $this->getJson('/api/sales/'.$sale['id'].'/summary')->assertOk()->assertJsonPath('remaining_balance', 12000);
});

test('ordinary sales retain fractional lines and do not infer packages from descriptions', function () {
    $payload = packagePurchasePayload($this);
    unset($payload['package_service_id'], $payload['included_sessions'], $payload['package_purchase_key']);
    $payload['items'] = [['description' => 'Six facial sessions prepaid package', 'quantity' => '0.500', 'unit_price' => '100.00'], ['description' => 'Add-on', 'unit_price' => '20.00']];

    $sale = $this->postJson('/api/sales', $payload)->assertCreated()->assertJsonPath('total_amount', 70)->json();
    $this->postJson('/api/sales', $payload)->assertCreated();
    $this->assertDatabaseHas('sales', ['id' => $sale['id'], 'package_service_id' => null, 'included_sessions' => null, 'package_purchase_key' => null]);
    $this->assertDatabaseCount('sales', 2);
});

test('invalid package purchase fields return 422 without a partial sale', function (array $changes, string $field) {
    $payload = array_replace(packagePurchasePayload($this), $changes);

    $this->postJson('/api/sales', $payload)->assertUnprocessable()->assertJsonValidationErrors($field);
    $this->assertDatabaseCount('sales', 0);
    $this->assertDatabaseCount('sale_items', 0);
})->with([
    'missing treatment' => [['package_service_id' => null], 'package_service_id'],
    'missing allowance' => [['included_sessions' => null], 'included_sessions'],
    'missing request key' => [['package_purchase_key' => null], 'package_purchase_key'],
    'zero allowance' => [['included_sessions' => 0], 'included_sessions'],
    'negative allowance' => [['included_sessions' => -1], 'included_sessions'],
    'fractional allowance' => [['included_sessions' => 1.5], 'included_sessions'],
    'oversized allowance' => [['included_sessions' => 2147483648], 'included_sessions'],
    'missing service' => [['package_service_id' => 999999], 'package_service_id'],
    'short key' => [['package_purchase_key' => 'short'], 'package_purchase_key'],
    'long key' => [['package_purchase_key' => str_repeat('a', 65)], 'package_purchase_key'],
    'ambiguous key' => [['package_purchase_key' => 'PACKAGE-PURCHASE-REQUEST'], 'package_purchase_key'],
    'injected fingerprint' => [['package_purchase_fingerprint' => str_repeat('a', 64)], 'package_purchase_fingerprint'],
    'negative price' => [['items' => [['description' => 'Package', 'unit_price' => '-1.00']]], 'items.0.unit_price'],
]);

test('package purchases reject multiple lines nonunit quantities and billed procedures', function (string $variant) {
    $payload = packagePurchasePayload($this);
    if ($variant === 'multiple') {
        $payload['items'][] = $payload['items'][0];
    } elseif ($variant === 'quantity') {
        $payload['items'][0]['quantity'] = 6;
    } else {
        $procedure = $this->postJson('/api/procedures', ['client_id' => $payload['client_id'], 'service_id' => $payload['package_service_id'], 'procedure_date' => '2026-10-25'])->assertCreated()->json();
        $payload['items'][0]['procedure_id'] = $procedure['id'];
    }

    $this->postJson('/api/sales', $payload)->assertUnprocessable();
    $this->assertDatabaseCount('sales', 0);
    $this->assertDatabaseCount('sale_items', 0);
})->with(['multiple', 'quantity', 'procedure']);

test('equivalent package retries return the original sale while new keys permit separate purchases', function () {
    $payload = packagePurchasePayload($this);
    $sale = $this->postJson('/api/sales', $payload)->assertCreated()->json();
    $retry = $payload;
    $retry['client_id'] = (string) $payload['client_id'];
    $retry['included_sessions'] = '6';
    $retry['items'][0]['quantity'] = '1.000';
    $retry['items'][0]['unit_price'] = 12000;
    $retry['notes'] = null;
    $this->postJson('/api/sales', $retry)->assertOk()->assertJsonPath('id', $sale['id']);
    unset($retry['items'][0]['quantity']);
    $this->postJson('/api/sales', $retry)->assertOk();
    $this->assertDatabaseCount('sales', 1);
    $this->assertDatabaseCount('sale_items', 1);

    $payload['package_purchase_key'] = 'package-purchase-request-002';
    $this->postJson('/api/sales', $payload)->assertCreated();
    $this->assertDatabaseCount('sales', 2);
});

test('changed package request key payload returns 409 without another sale', function (string $field) {
    $payload = packagePurchasePayload($this);
    $this->postJson('/api/sales', $payload)->assertCreated();
    if ($field === 'client_id') {
        $payload[$field] = $this->postJson('/api/clients', ['first_name' => 'Other', 'last_name' => 'Client'])->assertCreated()->json('id');
    } elseif ($field === 'package_service_id') {
        $payload[$field] = $this->postJson('/api/services', ['name' => 'Other facial'])->assertCreated()->json('id');
    } elseif ($field === 'included_sessions') {
        $payload[$field] = 7;
    } elseif ($field === 'sale_date') {
        $payload[$field] = '2026-10-26';
    } elseif ($field === 'notes') {
        $payload[$field] = 'Changed agreement';
    } else {
        $payload['items'][0][$field] = $field === 'description' ? 'Different package' : '13000.00';
    }

    $this->postJson('/api/sales', $payload)->assertConflict();
    $this->assertDatabaseCount('sales', 1);
    $this->assertDatabaseCount('sale_items', 1);
    $this->assertDatabaseHas('sales', ['total_amount' => '12000.00', 'included_sessions' => 6]);
})->with(['client_id', 'package_service_id', 'included_sessions', 'sale_date', 'notes', 'description', 'unit_price']);

test('inactive service rejects new package purchases but preserves successful retries', function () {
    $payload = packagePurchasePayload($this);
    $sale = $this->postJson('/api/sales', $payload)->assertCreated()->json();
    $this->patchJson('/api/services/'.$payload['package_service_id'], ['is_active' => false])->assertOk();

    $this->postJson('/api/sales', $payload)->assertOk()->assertJsonPath('id', $sale['id']);
    $payload['package_purchase_key'] = 'package-purchase-request-002';
    $this->postJson('/api/sales', $payload)->assertUnprocessable();
    $this->assertDatabaseCount('sales', 1);
});

test('package identity fields cannot be changed or added through sale corrections', function (string $field, bool $package) {
    $payload = packagePurchasePayload($this, 'admin');
    if (! $package) {
        unset($payload['package_service_id'], $payload['included_sessions'], $payload['package_purchase_key']);
    }
    $sale = $this->postJson('/api/sales', $payload)->assertCreated()->json();
    $correction = packageCorrectionPayload($sale);
    $correction[$field] = in_array($field, ['package_purchase_key', 'package_purchase_fingerprint'], true) ? 'replacement-request-key' : 999;

    $this->patchJson('/api/sales/'.$sale['id'], $correction)->assertUnprocessable()->assertJsonValidationErrors($field);
    $this->assertDatabaseCount('sale_corrections', 0);
    $this->assertDatabaseHas('sales', ['id' => $sale['id'], 'total_amount' => '12000.00', 'version' => 0]);
})->with(['client_id', 'package_service_id', 'included_sessions', 'package_purchase_key', 'package_purchase_fingerprint'])->with([true, false]);

test('package corrections must retain the original single line and quantity one', function (string $variant) {
    $payload = packagePurchasePayload($this, 'admin');
    $sale = $this->postJson('/api/sales', $payload)->assertCreated()->json();
    $correction = packageCorrectionPayload($sale);
    if ($variant === 'added') {
        $correction['items'][] = ['description' => 'Add-on', 'quantity' => 1, 'unit_price' => '10.00'];
    } elseif ($variant === 'quantity') {
        $correction['items'][0]['quantity'] = 2;
    } else {
        unset($correction['items'][0]['id']);
    }

    $this->patchJson('/api/sales/'.$sale['id'], $correction)->assertUnprocessable();
    $this->assertDatabaseCount('sale_corrections', 0);
    $this->assertDatabaseHas('sale_items', ['id' => $sale['items'][0]['id'], 'quantity' => '1.000', 'unit_price' => '12000.00']);
})->with(['added', 'quantity', 'replaced']);

test('audited package price corrections preserve payment behavior and original purchase retries', function () {
    $payload = packagePurchasePayload($this, 'admin');
    $sale = $this->postJson('/api/sales', $payload)->assertCreated()->json();
    $payment = $this->postJson('/api/payments', ['sale_id' => $sale['id'], 'amount' => '4000.00', 'payment_date' => '2026-10-25', 'payment_method' => 'cash', 'idempotency_key' => 'package-payment-request-001', 'expected_remaining_balance' => '12000.00'])->assertCreated()->json();
    $sale = $this->getJson('/api/sales/'.$sale['id'])->assertOk()->json();
    $correction = packageCorrectionPayload($sale);
    $correction['items'][0]['unit_price'] = '3000.00';
    $this->patchJson('/api/sales/'.$sale['id'], $correction)->assertConflict();
    $correction['items'][0]['unit_price'] = '11000.00';
    $this->patchJson('/api/sales/'.$sale['id'], $correction)->assertOk()->assertJsonPath('total_amount', 11000)->assertJsonPath('included_sessions', 6);
    $this->getJson('/api/sales/'.$sale['id'].'/corrections')->assertOk()->assertJsonPath('0.before_snapshot.total_amount', 12000)->assertJsonPath('0.after_snapshot.total_amount', 11000)->assertJsonPath('0.reason', $correction['reason']);
    $this->postJson('/api/sales', $payload)->assertOk()->assertJsonPath('id', $sale['id'])->assertJsonPath('total_amount', 11000);
    $this->getJson('/api/payments/sale/'.$sale['id'])->assertOk()->assertJsonPath('remaining_balance', 7000);
    $this->postJson('/api/payments/'.$payment['id'].'/void', ['reason' => 'Incorrect cash entry'])->assertOk();
    $this->getJson('/api/payments/sale/'.$sale['id'])->assertOk()->assertJsonPath('remaining_balance', 11000)->assertJsonPath('payment_status', 'unpaid');
    $this->assertDatabaseCount('sales', 1);
    $this->assertDatabaseCount('sale_corrections', 1);
    $this->assertDatabaseHas('payments', ['id' => $payment['id'], 'amount' => '4000.00', 'status' => 'voided']);
});

test('package session linking is unavailable through ordinary procedure create or update', function () {
    $payload = packagePurchasePayload($this);
    $sale = $this->postJson('/api/sales', $payload)->assertCreated()->json();
    $visit = ['client_id' => $payload['client_id'], 'service_id' => $payload['package_service_id'], 'procedure_date' => '2026-10-25'];

    $this->postJson('/api/procedures', $visit + ['package_sale_id' => $sale['id']])->assertUnprocessable()->assertJsonValidationErrors('package_sale_id');
    $this->assertDatabaseCount('procedures', 0);
    $procedure = $this->postJson('/api/procedures', $visit)->assertCreated()->json();
    $this->patchJson('/api/procedures/'.$procedure['id'], ['package_sale_id' => $sale['id']])->assertUnprocessable();
    $this->assertDatabaseHas('procedures', ['id' => $procedure['id'], 'package_sale_id' => null]);

    $model = Procedure::findOrFail($procedure['id']);
    $model->forceFill(['package_sale_id' => $sale['id']])->save();
    expect($model->package_sale->id)->toBe($sale['id']);
    expect(Sale::findOrFail($sale['id'])->package_procedures->modelKeys())->toBe([$procedure['id']]);
});

test('a package line persistence error rolls back the purchase and permits a retry', function () {
    $payload = packagePurchasePayload($this);
    Event::listen('eloquent.creating: '.SaleItem::class, function (): void {
        throw new RuntimeException('Simulated line persistence failure');
    });
    try {
        $this->postJson('/api/sales', $payload)->assertInternalServerError();
    } finally {
        Event::forget('eloquent.creating: '.SaleItem::class);
    }
    $this->assertDatabaseCount('sales', 0);
    $this->assertDatabaseCount('sale_items', 0);
    $this->postJson('/api/sales', $payload)->assertCreated();
});

test('anonymous package purchase is unauthorized and staff corrections are forbidden', function () {
    $payload = packagePurchasePayload($this);
    $sale = $this->postJson('/api/sales', $payload)->assertCreated()->json();
    $this->patchJson('/api/sales/'.$sale['id'], packageCorrectionPayload($sale))->assertForbidden();
    $this->withToken('')->postJson('/api/sales', $payload)->assertUnauthorized();
    $this->assertDatabaseCount('sales', 1);
    $this->assertDatabaseCount('sale_corrections', 0);
});

test('the database rejects duplicate purchase keys independently of request validation', function () {
    $payload = packagePurchasePayload($this);
    $sale = $this->postJson('/api/sales', $payload)->assertCreated()->json();

    expect(fn () => Sale::create(['client_id' => $payload['client_id'], 'sale_date' => '2026-10-25', 'total_amount' => '12000.00', 'payment_status' => 'unpaid', 'package_service_id' => $payload['package_service_id'], 'included_sessions' => 6, 'package_purchase_key' => $payload['package_purchase_key']]))->toThrow(UniqueConstraintViolationException::class);

    $this->assertDatabaseCount('sales', 1);
    $this->postJson('/api/sales', $payload)->assertOk()->assertJsonPath('id', $sale['id']);
});

test('the additive migration preserves existing ordinary sales payments and procedures', function () {
    /** SQLite foreign-key table rebuilds must run outside the test's wrapping transaction. */
    DB::rollBack();
    $auditMigration = require database_path('migrations/2026_10_24_163127_add_package_reversal_and_cancellation_audit.php');
    $auditMigration->down();
    $completionMigration = require database_path('migrations/2026_10_24_161715_add_package_completion_fields.php');
    $completionMigration->down();
    $migration = require database_path('migrations/2026_10_24_160253_add_package_purchase_fields.php');
    $migration->down();
    try {
        $payload = packagePurchasePayload($this);
        unset($payload['package_service_id'], $payload['included_sessions'], $payload['package_purchase_key']);
        $sale = $this->postJson('/api/sales', $payload)->assertCreated()->json();
        $serviceId = $this->getJson('/api/services')->assertOk()->json('0.id');
        $procedure = $this->postJson('/api/procedures', ['client_id' => $payload['client_id'], 'service_id' => $serviceId, 'procedure_date' => '2026-10-25'])->assertCreated()->json();
        $payment = $this->postJson('/api/payments', ['sale_id' => $sale['id'], 'amount' => '4000.00', 'payment_date' => '2026-10-25', 'payment_method' => 'cash', 'idempotency_key' => 'legacy-payment-request-001', 'expected_remaining_balance' => '12000.00'])->assertCreated()->json();
    } finally {
        $migration->up();
        $completionMigration->up();
        $auditMigration->up();
    }

    $this->getJson('/api/payments/sale/'.$sale['id'])->assertOk()->assertJsonPath('remaining_balance', 8000)->assertJsonPath('payment_status', 'partial');
    $this->assertDatabaseHas('sales', ['id' => $sale['id'], 'package_service_id' => null, 'included_sessions' => null, 'package_purchase_key' => null, 'package_purchase_fingerprint' => null]);
    $this->assertDatabaseHas('procedures', ['id' => $procedure['id'], 'package_sale_id' => null]);
    $this->assertDatabaseHas('payments', ['id' => $payment['id'], 'amount' => '4000.00', 'status' => 'recorded']);
});
