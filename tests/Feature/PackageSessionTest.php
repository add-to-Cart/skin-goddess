<?php

use App\Models\Procedure;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Symfony\Component\Process\Process;
use Tests\TestCase;

function packageSessionFixture(TestCase $test, int $allowance = 2): array
{
    $user = User::factory()->create(['username' => fake()->unique()->userName(), 'role' => 'staff', 'is_active' => true]);
    $token = Crypt::encryptString(json_encode(['user_id' => $user->id, 'expires_at' => time() + 3600], JSON_THROW_ON_ERROR));
    $test->withToken($token);
    $client = $test->postJson('/api/clients', ['first_name' => 'Session', 'last_name' => 'Test'])->assertCreated()->json();
    $service = $test->postJson('/api/services', ['name' => 'Facial'])->assertCreated()->json();
    $sale = $test->postJson('/api/sales', ['client_id' => $client['id'], 'sale_date' => '2026-10-25', 'package_service_id' => $service['id'], 'included_sessions' => $allowance, 'package_purchase_key' => 'session-package-purchase-001', 'items' => [['description' => 'Facial package', 'unit_price' => '12000.00']]])->assertCreated()->json();
    $item = $test->postJson('/api/inventory/items', ['name' => 'Serum', 'current_quantity' => '10.000', 'acquisition_cost' => '20.00'])->assertCreated()->json();
    $payload = ['client_id' => $client['id'], 'service_id' => $service['id'], 'procedure_date' => '2026-10-25', 'completion_key' => 'package-session-completion-001', 'supplies' => [['inventory_item_id' => $item['id'], 'quantity_used' => '1.125']]];

    return [$sale, $payload, $item, $user, $token];
}

test('staff complete unpaid package sessions without creating another bill or payment', function () {
    [$sale, $payload, $item, $user] = packageSessionFixture($this);
    $this->getJson('/api/sales/'.$sale['id'].'/sessions')->assertOk()->assertJsonPath('completed_sessions', 0)->assertJsonPath('remaining_sessions', 2);

    $procedure = $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertCreated()->assertJsonPath('package_sale_id', $sale['id'])->assertJsonPath('session_number', 1)->assertJsonPath('price', null)->assertJsonPath('completed_by_user_id', $user->id)->assertJsonMissingPath('completion_fingerprint')->json();

    $this->assertDatabaseHas('procedures', ['id' => $procedure['id'], 'package_sale_id' => $sale['id'], 'completed_by_user_id' => $user->id]);
    $this->assertDatabaseHas('inventory_items', ['id' => $item['id'], 'current_quantity' => '8.875']);
    $this->assertDatabaseHas('procedure_supplies', ['procedure_id' => $procedure['id'], 'quantity_used' => '1.125', 'unit_cost_at_use' => '20.00']);
    $this->assertDatabaseHas('inventory_transactions', ['reference_type' => 'procedure_supply', 'quantity_after' => '8.875']);
    $this->assertDatabaseCount('sales', 1);
    $this->assertDatabaseCount('sale_items', 1);
    $this->assertDatabaseCount('payments', 0);
    $this->getJson('/api/sales/'.$sale['id'].'/summary')->assertOk()->assertJsonPath('remaining_balance', 12000)->assertJsonPath('payment_status', 'unpaid')->assertJsonPath('version', 1);
    $this->getJson('/api/sales/'.$sale['id'].'/sessions')->assertOk()->assertJsonPath('completed_sessions', 1)->assertJsonPath('remaining_sessions', 1)->assertJsonPath('procedures.0.id', $procedure['id']);
    expect(Procedure::findOrFail($procedure['id'])->completed_by->id)->toBe($user->id);
});

test('the final session exhausts allowance and a seventh or repeated request cannot overconsume', function () {
    [$sale, $payload, $item] = packageSessionFixture($this, 1);
    $procedure = $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertCreated()->json();
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertOk()->assertJsonPath('id', $procedure['id']);
    $payload['completion_key'] = 'package-session-completion-002';

    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertConflict()->assertJsonPath('detail', 'This package has no remaining sessions.');
    $this->assertDatabaseCount('procedures', 1);
    $this->assertDatabaseCount('procedure_supplies', 1);
    $this->assertDatabaseCount('inventory_transactions', 2);
    $this->assertDatabaseHas('inventory_items', ['id' => $item['id'], 'current_quantity' => '8.875']);
    $this->getJson('/api/sales/'.$sale['id'].'/sessions')->assertOk()->assertJsonPath('remaining_sessions', 0);
});

test('new keys number sessions per purchase while equivalent normalized retries consume nothing', function () {
    [$sale, $payload] = packageSessionFixture($this);
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertCreated()->assertJsonPath('session_number', 1);
    $payload['client_id'] = (string) $payload['client_id'];
    $payload['service_id'] = (string) $payload['service_id'];
    $payload['supplies'][0]['quantity_used'] = 1.125;
    $payload['notes'] = null;
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertOk()->assertJsonPath('session_number', 1);
    $payload['completion_key'] = 'package-session-completion-002';
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertCreated()->assertJsonPath('session_number', 2);
    $this->assertDatabaseCount('procedures', 2);
});

test('changed completion payload with the same key returns 409 and retains original stock', function (string $field) {
    [$sale, $payload, $item] = packageSessionFixture($this);
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertCreated();
    if ($field === 'quantity_used') {
        $payload['supplies'][0][$field] = '2.000';
    } elseif ($field === 'unit_cost_at_use') {
        $payload['supplies'][0][$field] = '30.00';
    } elseif ($field === 'supplies') {
        $payload[$field] = [];
    } else {
        $payload[$field] = $field === 'notes' ? 'Changed treatment' : '2026-10-26';
    }

    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertConflict();
    $this->assertDatabaseCount('procedures', 1);
    $this->assertDatabaseHas('inventory_items', ['id' => $item['id'], 'current_quantity' => '8.875']);
})->with(['quantity_used', 'unit_cost_at_use', 'supplies', 'procedure_date', 'next_follow_up', 'notes']);

test('package client and service must match and ordinary sales have no session entitlement', function (string $variant) {
    [$sale, $payload] = packageSessionFixture($this);
    if ($variant === 'client') {
        $payload['client_id'] = $this->postJson('/api/clients', ['first_name' => 'Other', 'last_name' => 'Client'])->assertCreated()->json('id');
    } elseif ($variant === 'service') {
        $payload['service_id'] = $this->postJson('/api/services', ['name' => 'Other treatment'])->assertCreated()->json('id');
    } else {
        $sale = $this->postJson('/api/sales', ['client_id' => $payload['client_id'], 'sale_date' => '2026-10-25', 'items' => [['description' => 'Six sessions informal', 'unit_price' => '100.00']]])->assertCreated()->json();
        $this->getJson('/api/sales/'.$sale['id'].'/sessions')->assertUnprocessable();
    }
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertUnprocessable();
    $this->assertDatabaseCount('procedures', 0);
})->with(['client', 'service', 'ordinary']);

test('one completion key cannot consume two different package purchases', function () {
    [$sale, $payload] = packageSessionFixture($this);
    $other = $this->postJson('/api/sales', ['client_id' => $payload['client_id'], 'sale_date' => '2026-10-25', 'package_service_id' => $payload['service_id'], 'included_sessions' => 2, 'package_purchase_key' => 'session-package-purchase-002', 'items' => [['description' => 'Second package', 'unit_price' => '10000.00']]])->assertCreated()->json();
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertCreated();
    $this->postJson('/api/sales/'.$other['id'].'/sessions', $payload)->assertConflict();
    $payload['completion_key'] = 'package-session-completion-002';
    $this->postJson('/api/sales/'.$other['id'].'/sessions', $payload)->assertCreated()->assertJsonPath('session_number', 1);
    $this->getJson('/api/sales/'.$sale['id'].'/sessions')->assertOk()->assertJsonPath('remaining_sessions', 1);
    $this->getJson('/api/sales/'.$other['id'].'/sessions')->assertOk()->assertJsonPath('remaining_sessions', 1);
});

test('completion rollback restores stock allowance request key and sale version after insufficient supplies', function () {
    [$sale, $payload, $item] = packageSessionFixture($this);
    $other = $this->postJson('/api/inventory/items', ['name' => 'Mask', 'current_quantity' => '0.500'])->assertCreated()->json();
    $payload['supplies'][] = ['inventory_item_id' => $other['id'], 'quantity_used' => '1.000'];

    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertConflict();
    $this->assertDatabaseCount('procedures', 0);
    $this->assertDatabaseCount('procedure_supplies', 0);
    $this->assertDatabaseCount('inventory_transactions', 2);
    $this->assertDatabaseHas('sales', ['id' => $sale['id'], 'version' => 0]);
    $this->assertDatabaseHas('inventory_items', ['id' => $item['id'], 'current_quantity' => '10.000']);
    $this->postJson('/api/inventory/items/'.$other['id'].'/adjust', ['direction' => 'add', 'quantity' => '1.000'])->assertOk();
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertCreated()->assertJsonPath('session_number', 1);
});

test('package completion is immutable and cannot be billed or have supplies restored through ordinary endpoints', function () {
    [$sale, $payload, $item] = packageSessionFixture($this);
    $procedure = $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertCreated()->json();
    $this->patchJson('/api/procedures/'.$procedure['id'], ['notes' => 'Overwrite history'])->assertConflict();
    $this->postJson('/api/procedures/'.$procedure['id'].'/supplies', ['inventory_item_id' => $item['id'], 'quantity_used' => '1.000'])->assertConflict();
    $this->deleteJson('/api/procedures/'.$procedure['id'].'/supplies/'.$procedure['supplies_used'][0]['id'])->assertConflict();
    $this->postJson('/api/sales', ['client_id' => $payload['client_id'], 'sale_date' => '2026-10-25', 'items' => [['procedure_id' => $procedure['id'], 'description' => 'Included session rebilled', 'unit_price' => '2500.00']]])->assertUnprocessable();
    $this->assertDatabaseCount('sales', 1);
    $this->assertDatabaseCount('procedure_supplies', 1);
    $this->assertDatabaseHas('inventory_items', ['id' => $item['id'], 'current_quantity' => '8.875']);
    $this->assertDatabaseHas('procedures', ['id' => $procedure['id'], 'notes' => null]);
});

test('invalid or forged completion input returns 422 without treatment or stock changes', function (array $changes, string $field) {
    [$sale, $payload, $item] = packageSessionFixture($this);
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', array_replace($payload, $changes))->assertUnprocessable()->assertJsonValidationErrors($field);
    $this->assertDatabaseCount('procedures', 0);
    $this->assertDatabaseHas('inventory_items', ['id' => $item['id'], 'current_quantity' => '10.000']);
})->with([
    'missing key' => [['completion_key' => null], 'completion_key'],
    'short key' => [['completion_key' => 'short'], 'completion_key'],
    'invalid key' => [['completion_key' => 'INVALID-COMPLETION-KEY'], 'completion_key'],
    'price' => [['price' => '1.00'], 'price'],
    'number' => [['session_number' => 99], 'session_number'],
    'actor' => [['completed_by_user_id' => 999], 'completed_by_user_id'],
    'fingerprint' => [['completion_fingerprint' => 'forged'], 'completion_fingerprint'],
    'purchase link' => [['package_sale_id' => 999], 'package_sale_id'],
    'invalid date' => [['procedure_date' => 'invalid'], 'procedure_date'],
]);

test('duplicate supply IDs are rejected and supply order is irrelevant to completion retries', function () {
    [$sale, $payload] = packageSessionFixture($this);
    $duplicate = $payload;
    $duplicate['supplies'][] = $duplicate['supplies'][0];
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $duplicate)->assertUnprocessable();
    $other = $this->postJson('/api/inventory/items', ['name' => 'Mask', 'current_quantity' => '5.000'])->assertCreated()->json();
    $payload['supplies'][] = ['inventory_item_id' => $other['id'], 'quantity_used' => '1.000', 'unit_cost_at_use' => '5.00'];
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertCreated();
    $payload['supplies'] = array_reverse($payload['supplies']);
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertOk();
    $this->assertDatabaseCount('procedure_supplies', 2);
});

test('inactive service blocks new completions but preserves retries of saved sessions', function () {
    [$sale, $payload] = packageSessionFixture($this);
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertCreated();
    $this->patchJson('/api/services/'.$payload['service_id'], ['is_active' => false])->assertOk();
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertOk();
    $payload['completion_key'] = 'package-session-completion-002';
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertStatus(400);
    $this->assertDatabaseCount('procedures', 1);
});

test('package progress and later payment voids remain independent of full or partial payment', function (string $amount, int $balance, string $status) {
    [$sale, $payload, $item, $user] = packageSessionFixture($this);
    $payment = $this->postJson('/api/payments', ['sale_id' => $sale['id'], 'payment_date' => '2026-10-25', 'amount' => $amount, 'expected_remaining_balance' => '12000.00', 'idempotency_key' => 'package-session-payment-001', 'payment_method' => 'cash'])->assertCreated()->json();
    $this->getJson('/api/sales/'.$sale['id'].'/sessions')->assertOk()->assertJsonPath('remaining_sessions', 2);
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertCreated();
    $this->getJson('/api/sales/'.$sale['id'].'/summary')->assertOk()->assertJsonPath('payment_status', $status)->assertJsonPath('remaining_balance', $balance);
    $user->forceFill(['role' => 'admin'])->save();
    $this->postJson('/api/payments/'.$payment['id'].'/void', ['reason' => 'Incorrect recorded cash'])->assertOk();
    $this->getJson('/api/sales/'.$sale['id'].'/sessions')->assertOk()->assertJsonPath('remaining_sessions', 1);
    $payload['completion_key'] = 'package-session-completion-002';
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertCreated();
    $this->getJson('/api/sales/'.$sale['id'].'/summary')->assertOk()->assertJsonPath('remaining_balance', 12000);
})->with(['paid in full' => ['12000.00', 0, 'paid'], 'partly paid' => ['4000.00', 8000, 'partial']]);

test('sessions without supplies consume allowance without stock changes and ordinary numbering remains independent', function () {
    [$sale, $payload, $item] = packageSessionFixture($this);
    unset($payload['supplies']);
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertCreated()->assertJsonPath('session_number', 1);
    $ordinary = ['client_id' => $payload['client_id'], 'service_id' => $payload['service_id'], 'procedure_date' => '2026-10-25', 'session_number' => 1];
    $this->postJson('/api/procedures', $ordinary)->assertCreated();
    $this->postJson('/api/procedures', $ordinary)->assertCreated();
    $this->assertDatabaseHas('inventory_items', ['id' => $item['id'], 'current_quantity' => '10.000']);
    $this->assertDatabaseCount('inventory_transactions', 1);
    $this->assertDatabaseCount('procedure_supplies', 0);
    $this->getJson('/api/sales/'.$sale['id'].'/sessions')->assertOk()->assertJsonPath('completed_sessions', 1)->assertJsonPath('remaining_sessions', 1);
});

test('completion persistence failure leaves stock and progress unchanged', function () {
    [$sale, $payload, $item] = packageSessionFixture($this);
    Event::listen('eloquent.updating: '.Sale::class, function (): void {
        throw new RuntimeException('Simulated version persistence failure');
    });
    try {
        $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertInternalServerError();
    } finally {
        Event::forget('eloquent.updating: '.Sale::class);
    }
    $this->assertDatabaseCount('procedures', 0);
    $this->assertDatabaseCount('procedure_supplies', 0);
    $this->assertDatabaseHas('inventory_items', ['id' => $item['id'], 'current_quantity' => '10.000']);
    $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertCreated();
});

test('session numbers and completion keys are independently protected by database uniqueness', function () {
    [$sale, $payload] = packageSessionFixture($this);
    $procedure = $this->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertCreated()->json();
    $model = Procedure::findOrFail($procedure['id']);
    $duplicateKey = $model->replicate();
    $duplicateKey->session_number = 2;
    expect(fn () => $duplicateKey->save())->toThrow(UniqueConstraintViolationException::class);
    $duplicateNumber = $model->replicate();
    $duplicateNumber->completion_key = 'package-session-completion-002';
    expect(fn () => $duplicateNumber->save())->toThrow(UniqueConstraintViolationException::class);
    $this->assertDatabaseCount('procedures', 1);
});

test('session endpoints reject anonymous requests and unknown packages', function () {
    [$sale, $payload] = packageSessionFixture($this);
    $this->getJson('/api/sales/999999/sessions')->assertNotFound();
    $this->postJson('/api/sales/999999/sessions', $payload)->assertNotFound();
    $this->withToken('')->postJson('/api/sales/'.$sale['id'].'/sessions', $payload)->assertUnauthorized();
    $this->getJson('/api/sales/'.$sale['id'].'/sessions')->assertUnauthorized();
    $this->assertDatabaseCount('procedures', 0);
});

test('concurrent MySQL completions serialize the final allowance and identical retries', function (bool $sameRequest) {
    if (DB::connection()->getDriverName() !== 'mysql') {
        $this->markTestSkipped('Requires the dedicated MySQL verification database and independent PHP processes.');
    }
    expect(DB::connection()->getDatabaseName())->toBe('skin_goddess_verification');
    expect(config('database.connections.mysql.url'))->toBeEmpty();
    DB::commit();
    [$sale, $payload, $item, $user, $token] = packageSessionFixture($this, 1);
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
echo 'RESULT:'.json_encode(['status' => $response->getStatusCode(), 'body' => json_decode($response->getContent(), true)], JSON_THROW_ON_ERROR);
$kernel->terminate($request, $response);
PHP;
    $workers = [];
    DB::beginTransaction();
    DB::table('services')->where('id', $payload['service_id'])->lockForUpdate()->first();
    try {
        for ($index = 0; $index < 2; $index++) {
            $requestPayload = $payload;
            if (! $sameRequest && $index === 1) {
                $requestPayload['completion_key'] = 'package-session-completion-002';
            }
            $input = base64_encode(json_encode(['path' => '/api/sales/'.$sale['id'].'/sessions', 'token' => $token, 'payload' => $requestPayload], JSON_THROW_ON_ERROR));
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
        sort($statuses);
        expect($statuses)->toBe($sameRequest ? [200, 201] : [201, 409]);
        $this->assertDatabaseCount('procedures', 1);
        $this->assertDatabaseCount('procedure_supplies', 1);
        $this->assertDatabaseCount('sales', 1);
        $this->assertDatabaseHas('inventory_items', ['id' => $item['id'], 'current_quantity' => '8.875']);
        $this->getJson('/api/sales/'.$sale['id'].'/sessions')->assertOk()->assertJsonPath('remaining_sessions', 0);
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
})->with(['different completion requests' => false, 'identical request retry' => true]);
