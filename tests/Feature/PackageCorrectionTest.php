<?php

use App\Models\Procedure;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Symfony\Component\Process\Process;
use Tests\TestCase;

function packageAuditFixture(TestCase $test, int $allowance = 1, string $role = 'admin'): array
{
    $user = User::factory()->create(['username' => fake()->unique()->userName(), 'role' => $role, 'is_active' => true]);
    $token = Crypt::encryptString(json_encode(['user_id' => $user->id, 'expires_at' => time() + 3600], JSON_THROW_ON_ERROR));
    $test->withToken($token);
    $client = $test->postJson('/api/clients', ['first_name' => 'Audit', 'last_name' => 'Test'])->assertCreated()->json();
    $service = $test->postJson('/api/services', ['name' => 'Audit facial'])->assertCreated()->json();
    $sale = $test->postJson('/api/sales', ['client_id' => $client['id'], 'package_service_id' => $service['id'], 'included_sessions' => $allowance, 'package_purchase_key' => 'audit-package-purchase-001', 'sale_date' => '2026-10-25', 'items' => [['description' => 'Facial package', 'unit_price' => '12000.00']]])->assertCreated()->json();
    $item = $test->postJson('/api/inventory/items', ['name' => 'Audit serum', 'current_quantity' => '10.000', 'acquisition_cost' => '20.00'])->assertCreated()->json();
    $payload = ['client_id' => $client['id'], 'service_id' => $service['id'], 'procedure_date' => '2026-10-25', 'completion_key' => 'audit-session-completion-001', 'supplies' => [['inventory_item_id' => $item['id'], 'quantity_used' => '1.125']]];
    $procedure = $test->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertCreated()->json();
    $sale = $test->getJson('/api/sales/'.$sale['id'])->assertOk()->json();

    return [$sale, $procedure, $payload, $item, $user, $token];
}

function packageAuditPath(array $sale, array $procedure, string $action): string
{
    return '/api/sales/'.$sale['id'].($action === 'cancel' ? '/cancel-package' : '/sessions/'.$procedure['id'].'/reverse');
}

test('administrator reversals preserve original completion and supply history while restoring allowance exactly once', function () {
    [$sale, $procedure, $payload, $item, $user] = packageAuditFixture($this);
    $original = DB::table('procedures')->where('id', $procedure['id'])->first();
    $supplies = DB::table('procedure_supplies')->get()->toJson();
    $stock = DB::table('inventory_items')->get()->toJson();
    $movements = DB::table('inventory_transactions')->get()->toJson();
    $this->travelTo(now()->setDate(2026, 10, 25)->setTime(2, 0));

    $this->postJson(packageAuditPath($sale, $procedure, 'reverse'), ['reason' => '  Incorrect completed visit entry  ', 'expected_version' => $sale['version']])->assertOk()->assertJsonPath('reversed_by_user_id', $user->id)->assertJsonPath('reversal_reason', 'Incorrect completed visit entry')->assertJsonPath('reversed_at', '2026-10-25T02:00:00.000000Z');
    $after = DB::table('procedures')->where('id', $procedure['id'])->first();
    expect(Arr::except((array) $after, ['reversed_at', 'reversed_by_user_id', 'reversal_reason', 'updated_at']))->toBe(Arr::except((array) $original, ['reversed_at', 'reversed_by_user_id', 'reversal_reason', 'updated_at']));
    expect(DB::table('procedure_supplies')->get()->toJson())->toBe($supplies);
    expect(DB::table('inventory_items')->get()->toJson())->toBe($stock);
    expect(DB::table('inventory_transactions')->get()->toJson())->toBe($movements);
    expect(Procedure::findOrFail($procedure['id'])->reversed_by->id)->toBe($user->id);
    $this->getJson('/api/sales/'.$sale['id'].'/sessions')->assertOk()->assertJsonPath('completed_sessions', 0)->assertJsonPath('remaining_sessions', 1)->assertJsonPath('reversed_sessions', 1)->assertJsonPath('procedures.0.id', $procedure['id'])->assertJsonPath('procedures.0.reversed_by.username', $user->username);
    $this->postJson(packageAuditPath($sale, $procedure, 'reverse'), ['reason' => 'Overwrite original reason', 'expected_version' => 2])->assertConflict();
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertOk()->assertJsonPath('reversal_reason', 'Incorrect completed visit entry');
    $this->assertDatabaseHas('sales', ['id' => $sale['id'], 'version' => 2, 'total_amount' => '12000.00', 'payment_status' => 'unpaid']);
    $payload['completion_key'] = 'audit-session-completion-002';
    $payload['supplies'] = [];
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertCreated()->assertJsonPath('session_number', 2);
    $this->getJson('/api/sales/'.$sale['id'].'/sessions')->assertOk()->assertJsonPath('completed_sessions', 1)->assertJsonPath('remaining_sessions', 0)->assertJsonPath('reversed_sessions', 1)->assertJsonCount(2, 'procedures');
    $this->assertDatabaseHas('inventory_items', ['id' => $item['id'], 'current_quantity' => '8.875']);
});

test('cancellation preserves payments debt and inventory and blocks new sessions while allowing saved retries and debt collection', function () {
    [$sale, $procedure, $payload, $item, $user] = packageAuditFixture($this, 2);
    $this->postJson('/api/payments', ['sale_id' => $sale['id'], 'payment_date' => '2026-10-25', 'amount' => '4000.00', 'expected_remaining_balance' => '12000.00', 'idempotency_key' => 'audit-package-payment-001', 'payment_method' => 'cash'])->assertCreated();
    $sale = $this->getJson('/api/sales/'.$sale['id'])->assertOk()->json();
    $payments = DB::table('payments')->get()->toJson();
    $procedures = DB::table('procedures')->get()->toJson();
    $stock = DB::table('inventory_items')->get()->toJson();
    $this->travelTo(now()->setDate(2026, 10, 25)->setTime(3, 0));

    $this->postJson(packageAuditPath($sale, $procedure, 'cancel'), ['reason' => '  Customer canceled remaining treatment  ', 'expected_version' => $sale['version']])->assertOk()->assertJsonPath('canceled_by_user_id', $user->id)->assertJsonPath('cancellation_reason', 'Customer canceled remaining treatment')->assertJsonPath('canceled_at', '2026-10-25T03:00:00.000000Z');
    expect(DB::table('payments')->get()->toJson())->toBe($payments);
    expect(DB::table('procedures')->get()->toJson())->toBe($procedures);
    expect(DB::table('inventory_items')->get()->toJson())->toBe($stock);
    expect(Sale::findOrFail($sale['id'])->canceled_by->id)->toBe($user->id);
    $this->getJson('/api/payments/sale/'.$sale['id'])->assertOk()->assertJsonPath('remaining_balance', 8000)->assertJsonPath('total_paid', 4000)->assertJsonPath('payment_status', 'partial');
    $this->getJson('/api/sales/'.$sale['id'].'/sessions')->assertOk()->assertJsonPath('is_canceled', true)->assertJsonPath('remaining_sessions', 1)->assertJsonPath('completed_sessions', 1)->assertJsonPath('canceled_by.username', $user->username);
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertOk()->assertJsonPath('id', $procedure['id']);
    $payload['completion_key'] = 'audit-session-completion-002';
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertConflict()->assertJsonPath('detail', 'This package is canceled and cannot receive additional sessions.');
    $this->postJson(packageAuditPath($sale, $procedure, 'cancel'), ['reason' => 'Changed reason', 'expected_version' => 3])->assertConflict();
    $this->postJson('/api/payments', ['sale_id' => $sale['id'], 'payment_date' => '2026-10-25', 'amount' => '3000.00', 'expected_remaining_balance' => '8000.00', 'idempotency_key' => 'audit-package-payment-002', 'payment_method' => 'cash'])->assertCreated();
    $this->getJson('/api/payments/sale/'.$sale['id'])->assertOk()->assertJsonPath('remaining_balance', 5000);
    $this->assertDatabaseCount('procedures', 1);
    $this->assertDatabaseHas('inventory_items', ['id' => $item['id'], 'current_quantity' => '8.875']);
    $this->assertDatabaseHas('sales', ['id' => $sale['id'], 'total_amount' => '12000.00', 'cancellation_reason' => 'Customer canceled remaining treatment']);
});

test('reversing an incorrect session on a canceled package never reactivates it', function () {
    [$sale, $procedure, $payload] = packageAuditFixture($this);
    $this->postJson(packageAuditPath($sale, $procedure, 'cancel'), ['reason' => 'Stopped treatment', 'expected_version' => 1])->assertOk();
    $this->postJson(packageAuditPath($sale, $procedure, 'reverse'), ['reason' => 'Visit recorded in error', 'expected_version' => 2])->assertOk();
    $payload['completion_key'] = 'audit-session-completion-002';
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertConflict();
    $this->getJson('/api/sales/'.$sale['id'].'/sessions')->assertOk()->assertJsonPath('is_canceled', true)->assertJsonPath('remaining_sessions', 1)->assertJsonPath('completed_sessions', 0);
});

test('audit actions return 403 for staff and 401 without authentication', function (string $action, string $role) {
    [$sale, $procedure] = packageAuditFixture($this, 1, 'staff');
    if ($role === 'anonymous') {
        $this->withToken('');
    }
    $this->postJson(packageAuditPath($sale, $procedure, $action), ['reason' => 'Unauthorized action', 'expected_version' => 1])->assertStatus($role === 'anonymous' ? 401 : 403);
    $this->assertDatabaseHas('sales', ['id' => $sale['id'], 'version' => 1, 'canceled_at' => null]);
    $this->assertDatabaseHas('procedures', ['id' => $procedure['id'], 'reversed_at' => null]);
})->with(['reverse', 'cancel'])->with(['staff', 'anonymous']);

test('audit actions reject invalid reasons or versions with 422 and no changes', function (array $changes, string $field, string $action) {
    [$sale, $procedure] = packageAuditFixture($this);
    $this->postJson(packageAuditPath($sale, $procedure, $action), array_replace(['reason' => 'Correct error', 'expected_version' => 1], $changes))->assertUnprocessable()->assertJsonValidationErrors($field);
    $this->assertDatabaseHas('sales', ['id' => $sale['id'], 'version' => 1, 'canceled_at' => null]);
    $this->assertDatabaseHas('procedures', ['id' => $procedure['id'], 'reversed_at' => null]);
})->with([
    'missing reason' => [['reason' => null], 'reason'],
    'blank reason' => [['reason' => '   '], 'reason'],
    'long reason' => [['reason' => str_repeat('a', 2001)], 'reason'],
    'array reason' => [['reason' => ['incorrect']], 'reason'],
    'missing version' => [['expected_version' => null], 'expected_version'],
    'negative version' => [['expected_version' => -1], 'expected_version'],
])->with(['reverse', 'cancel']);

test('a payment change makes both administrator audit actions stale', function (string $action) {
    [$sale, $procedure] = packageAuditFixture($this);
    $this->postJson('/api/payments', ['sale_id' => $sale['id'], 'payment_date' => '2026-10-25', 'amount' => '4000.00', 'expected_remaining_balance' => '12000.00', 'idempotency_key' => 'audit-stale-payment-001', 'payment_method' => 'cash'])->assertCreated();
    $this->postJson(packageAuditPath($sale, $procedure, $action), ['reason' => 'Stale review', 'expected_version' => $sale['version']])->assertConflict();
    $this->assertDatabaseHas('sales', ['id' => $sale['id'], 'version' => 2, 'canceled_at' => null]);
    $this->assertDatabaseHas('procedures', ['id' => $procedure['id'], 'reversed_at' => null]);
})->with(['reverse', 'cancel']);

test('reversal is scoped to the purchased package and cancellation rejects ordinary sales', function () {
    [$sale, $procedure, $payload] = packageAuditFixture($this);
    $ordinary = $this->postJson('/api/sales', ['client_id' => $payload['client_id'], 'sale_date' => '2026-10-25', 'items' => [['description' => 'Ordinary bill', 'unit_price' => '100.00']]])->assertCreated()->json();
    $this->postJson('/api/sales/'.$ordinary['id'].'/cancel-package', ['reason' => 'Wrong sale', 'expected_version' => 0])->assertUnprocessable();
    $otherPackage = $this->postJson('/api/sales', ['client_id' => $payload['client_id'], 'package_service_id' => $payload['service_id'], 'included_sessions' => 1, 'package_purchase_key' => 'audit-package-purchase-002', 'sale_date' => '2026-10-25', 'items' => [['description' => 'Second package', 'unit_price' => '10000.00']]])->assertCreated()->json();
    $this->postJson(packageAuditPath($otherPackage, $procedure, 'reverse'), ['reason' => 'Wrong package', 'expected_version' => 0])->assertNotFound();
    $this->postJson('/api/sales/999999/cancel-package', ['reason' => 'Unknown', 'expected_version' => 0])->assertNotFound();
    $this->postJson('/api/sales/'.$sale['id'].'/sessions/999999/reverse', ['reason' => 'Unknown', 'expected_version' => 1])->assertNotFound();
    $this->assertDatabaseHas('procedures', ['id' => $procedure['id'], 'reversed_at' => null]);
});

test('audit persistence failures roll back the state transition and sale version', function (string $action) {
    [$sale, $procedure, $payload, $item] = packageAuditFixture($this);
    Event::listen('eloquent.updated: '.Sale::class, function (): void {
        throw new RuntimeException('Simulated sale persistence failure');
    });
    try {
        $this->postJson(packageAuditPath($sale, $procedure, $action), ['reason' => 'Correct error', 'expected_version' => 1])->assertInternalServerError();
    } finally {
        Event::forget('eloquent.updated: '.Sale::class);
    }
    $this->assertDatabaseHas('sales', ['id' => $sale['id'], 'version' => 1, 'canceled_at' => null, 'cancellation_reason' => null]);
    $this->assertDatabaseHas('procedures', ['id' => $procedure['id'], 'reversed_at' => null, 'reversal_reason' => null]);
    $this->assertDatabaseHas('inventory_items', ['id' => $item['id'], 'current_quantity' => '8.875']);
    $this->postJson(packageAuditPath($sale, $procedure, $action), ['reason' => 'Correct error', 'expected_version' => 1])->assertOk();
})->with(['reverse', 'cancel']);

test('cancellation audit fields cannot be forged by purchase or ordinary sale correction', function (string $field) {
    [$sale, $procedure, $payload] = packageAuditFixture($this);
    $value = $field === 'canceled_by_user_id' ? 999 : 'forged';
    $this->postJson('/api/sales', ['client_id' => $payload['client_id'], 'sale_date' => '2026-10-25', $field => $value, 'items' => [['description' => 'Forged cancellation', 'unit_price' => '100.00']]])->assertUnprocessable()->assertJsonValidationErrors($field);
    $this->patchJson('/api/sales/'.$sale['id'], ['reason' => 'Bypass cancellation', 'expected_version' => 1, 'sale_date' => '2026-10-25', 'notes' => null, $field => $value, 'items' => [['id' => $sale['items'][0]['id'], 'description' => 'Package', 'quantity' => 1, 'unit_price' => '12000.00']]])->assertUnprocessable()->assertJsonValidationErrors($field);
    $this->assertDatabaseCount('sales', 1);
    $this->assertDatabaseHas('sales', ['id' => $sale['id'], 'canceled_at' => null]);
})->with(['canceled_at', 'canceled_by_user_id', 'cancellation_reason']);

test('reversal audit fields cannot be forged in ordinary records or package completion', function (string $field) {
    [$sale, $procedure, $payload] = packageAuditFixture($this, 2);
    $value = $field === 'reversed_by_user_id' ? 999 : 'forged';
    $ordinary = Arr::only($payload, ['client_id', 'service_id', 'procedure_date']);
    $this->postJson('/api/procedures', $ordinary + [$field => $value])->assertUnprocessable()->assertJsonValidationErrors($field);
    $this->patchJson('/api/procedures/'.$procedure['id'], [$field => $value])->assertUnprocessable()->assertJsonValidationErrors($field);
    $payload['completion_key'] = 'audit-session-completion-002';
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload + [$field => $value])->assertUnprocessable()->assertJsonValidationErrors($field);
    $this->assertDatabaseCount('procedures', 1);
    $this->assertDatabaseHas('procedures', ['id' => $procedure['id'], 'reversed_at' => null]);
})->with(['reversed_at', 'reversed_by_user_id', 'reversal_reason']);

test('audited financial corrections and payment voids remain available without reactivating a canceled package', function () {
    [$sale, $procedure] = packageAuditFixture($this);
    $payment = $this->postJson('/api/payments', ['sale_id' => $sale['id'], 'payment_date' => '2026-10-25', 'amount' => '4000.00', 'expected_remaining_balance' => '12000.00', 'idempotency_key' => 'audit-correction-payment-001', 'payment_method' => 'cash'])->assertCreated()->json();
    $this->postJson(packageAuditPath($sale, $procedure, 'cancel'), ['reason' => 'Customer canceled', 'expected_version' => 2])->assertOk();
    $this->patchJson('/api/sales/'.$sale['id'], ['reason' => 'Correct purchase price', 'expected_version' => 3, 'sale_date' => '2026-10-25', 'notes' => null, 'items' => [['id' => $sale['items'][0]['id'], 'description' => 'Corrected package price', 'quantity' => 1, 'unit_price' => '10000.00']]])->assertOk()->assertJsonPath('cancellation_reason', 'Customer canceled');
    $this->postJson('/api/payments/'.$payment['id'].'/void', ['reason' => 'Incorrect cash entry'])->assertOk();
    $this->getJson('/api/payments/sale/'.$sale['id'])->assertOk()->assertJsonPath('remaining_balance', 10000)->assertJsonPath('payment_status', 'unpaid');
    $this->getJson('/api/sales/'.$sale['id'].'/sessions')->assertOk()->assertJsonPath('is_canceled', true);
    $this->assertDatabaseCount('sale_corrections', 1);
});

test('concurrent MySQL audit and completion requests preserve terminal states and session allowance', function (string $scenario) {
    if (DB::connection()->getDriverName() !== 'mysql') {
        $this->markTestSkipped('Requires the dedicated MySQL verification database and independent PHP processes.');
    }
    expect(DB::connection()->getDatabaseName())->toBe('skin_goddess_verification');
    expect(config('database.connections.mysql.url'))->toBeEmpty();
    DB::commit();
    [$sale, $procedure, $payload, $item, $user, $token] = packageAuditFixture($this, $scenario === 'cancel versus completion' ? 2 : 1);
    $auditAction = $scenario === 'cancel versus completion' ? 'cancel' : 'reverse';
    $requests = [['path' => packageAuditPath($sale, $procedure, $auditAction), 'payload' => ['reason' => 'Administrator reviewed incorrect record', 'expected_version' => 1]]];
    $payload['completion_key'] = 'audit-session-completion-002';
    $payload['supplies'] = [];
    $requests[] = $scenario === 'duplicate reversal' ? $requests[0] : ['path' => '/api/sales/'.$sale['id'].'/sessions', 'payload' => $payload];
    $connection = config('database.connections.mysql');
    $environment = [
        'APP_ENV' => 'testing', 'DB_CONNECTION' => 'mysql', 'DB_DATABASE' => 'skin_goddess_verification',
        'DB_HOST' => $connection['host'], 'DB_PORT' => (string) $connection['port'],
        'DB_USERNAME' => $connection['username'], 'DB_PASSWORD' => $connection['password'], 'DB_URL' => '',
        'CACHE_STORE' => 'array', 'SESSION_DRIVER' => 'array', 'MAIL_MAILER' => 'array', 'QUEUE_CONNECTION' => 'sync',
    ];
    $workerCode = <<<'PHP'
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if ($app->environment() !== 'testing' || config('database.default') !== 'mysql'
    || config('database.connections.mysql.database') !== 'skin_goddess_verification'
    || ! empty(config('database.connections.mysql.url'))) {
    throw new RuntimeException('Refusing an unsafe concurrent test database.');
}
$input = json_decode(base64_decode($argv[1]), true, flags: JSON_THROW_ON_ERROR);
$request = Illuminate\Http\Request::create($input['path'], 'POST', [], [], [], [
    'CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json',
    'HTTP_AUTHORIZATION' => 'Bearer '.$input['token'],
], json_encode($input['payload'], JSON_THROW_ON_ERROR));
echo "READY\n";
flush();
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle($request);
echo 'RESULT:'.json_encode(['status' => $response->getStatusCode()], JSON_THROW_ON_ERROR);
$kernel->terminate($request, $response);
PHP;
    $workers = [];
    DB::beginTransaction();
    DB::table('sales')->where('id', $sale['id'])->lockForUpdate()->first();
    try {
        foreach ($requests as $request) {
            $input = base64_encode(json_encode($request + ['token' => $token], JSON_THROW_ON_ERROR));
            $worker = new Process([PHP_BINARY, '-r', $workerCode, '--', $input], base_path(), $environment);
            $worker->setTimeout(30);
            $worker->start();
            $workers[] = $worker;
        }
        foreach ($workers as $worker) {
            expect($worker->waitUntil(fn (string $type, string $output): bool => str_contains($output, 'READY')))->toBeTrue();
        }
        DB::commit();
        $statuses = [];
        foreach ($workers as $worker) {
            expect($worker->wait())->toBe(0);
            expect($worker->getOutput())->toContain('RESULT:');
            $result = json_decode(explode('RESULT:', $worker->getOutput(), 2)[1], true, flags: JSON_THROW_ON_ERROR);
            $statuses[] = $result['status'];
        }
        $history = $this->getJson('/api/sales/'.$sale['id'].'/sessions')->assertOk()->json();
        if ($scenario === 'duplicate reversal') {
            sort($statuses);
            expect($statuses)->toBe([200, 409]);
            expect($history['remaining_sessions'])->toBe(1);
            expect($history['reversed_sessions'])->toBe(1);
            $this->assertDatabaseHas('sales', ['id' => $sale['id'], 'version' => 2]);
        } elseif ($scenario === 'cancel versus completion') {
            if ($statuses[0] === 200) {
                expect($statuses[1])->toBe(409);
                expect($history['is_canceled'])->toBeTrue();
                expect($history['completed_sessions'])->toBe(1);
            } else {
                expect($statuses)->toBe([409, 201]);
                expect($history['is_canceled'])->toBeFalse();
                expect($history['completed_sessions'])->toBe(2);
                $this->postJson(packageAuditPath($sale, $procedure, 'cancel'), ['reason' => 'Reviewed newly completed session', 'expected_version' => 2])->assertOk();
            }
            $this->postJson('/api/sales/'.$sale['id'].'/sessions', array_replace($payload, ['completion_key' => 'audit-session-completion-003']))->assertConflict();
        } else {
            expect($statuses[0])->toBe(200);
            expect($statuses[1])->toBeIn([201, 409]);
            expect($history['reversed_sessions'])->toBe(1);
            expect($history['completed_sessions'])->toBe($statuses[1] === 201 ? 1 : 0);
            expect($history['remaining_sessions'])->toBe($statuses[1] === 201 ? 0 : 1);
            if ($statuses[1] === 201) {
                expect($history['procedures'][1]['session_number'])->toBe(2);
            }
        }
        $this->assertDatabaseCount('procedure_supplies', 1);
        $this->assertDatabaseCount('inventory_transactions', 2);
        $this->assertDatabaseHas('inventory_items', ['id' => $item['id'], 'current_quantity' => '8.875']);
    } finally {
        while (DB::transactionLevel() > 0) {
            DB::rollBack();
        }
        foreach ($workers as $worker) {
            if ($worker->isRunning()) {
                $worker->stop(1);
            }
        }
    }
})->with(['duplicate reversal', 'cancel versus completion', 'reverse versus completion']);
