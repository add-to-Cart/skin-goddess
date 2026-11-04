<?php

use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;

/** @return array<string, string> */
function clientAuthorizationHeaders(string $role): array
{
    $user = User::factory()->create(['username' => fake()->unique()->userName(), 'hashed_password' => Hash::make('test-password'), 'role' => $role, 'is_active' => true]);

    return ['Authorization' => 'Bearer '.Crypt::encryptString(json_encode(['user_id' => $user->id, 'expires_at' => time() + 3600]))];
}

test('client archiving returns 401 without authentication', function () {
    $this->deleteJson('/api/clients/1')->assertUnauthorized();
});

test('staff receive 403 when archiving a client and the client remains active', function () {
    $this->withHeaders(clientAuthorizationHeaders('staff'));
    $client = $this->postJson('/api/clients', ['first_name' => 'Synthetic', 'last_name' => 'Client'])->assertCreated()->json();

    $this->deleteJson('/api/clients/'.$client['id'])->assertForbidden()->assertJsonPath('detail', 'Admin access required.');

    $this->assertDatabaseHas('clients', ['id' => $client['id'], 'is_active' => true]);
});

test('administrators archive a client while retaining sales payments and treatments', function () {
    $this->withHeaders(clientAuthorizationHeaders('admin'));
    $client = $this->postJson('/api/clients', ['first_name' => 'Synthetic', 'last_name' => 'Client'])->assertCreated()->json();
    $sale = $this->postJson('/api/sales', ['client_id' => $client['id'], 'sale_date' => '2026-11-02', 'items' => [['description' => 'Synthetic sale', 'quantity' => 1, 'unit_price' => 100]]])->assertCreated()->json();
    $payment = $this->postJson('/api/payments', ['sale_id' => $sale['id'], 'payment_date' => '2026-11-02', 'amount' => 40, 'payment_method' => 'cash', 'idempotency_key' => 'client-archive-test-payment', 'expected_remaining_balance' => 100])->assertCreated()->json();
    $service = $this->postJson('/api/services', ['name' => 'Synthetic service'])->assertCreated()->json();
    $treatment = $this->postJson('/api/procedures', ['client_id' => $client['id'], 'service_id' => $service['id'], 'procedure_date' => '2026-11-02'])->assertCreated()->json();

    $this->deleteJson('/api/clients/'.$client['id'])->assertNoContent();

    $this->assertDatabaseHas('clients', ['id' => $client['id'], 'is_active' => false]);
    $this->assertDatabaseHas('sales', ['id' => $sale['id'], 'client_id' => $client['id'], 'total_amount' => 100]);
    $this->assertDatabaseHas('payments', ['id' => $payment['id'], 'sale_id' => $sale['id'], 'amount' => 40, 'status' => 'recorded']);
    $this->assertDatabaseHas('procedures', ['id' => $treatment['id'], 'client_id' => $client['id']]);
    $this->getJson('/api/clients')->assertOk()->assertJsonCount(0);
    $this->deleteJson('/api/clients/'.$client['id'])->assertNotFound();
});
