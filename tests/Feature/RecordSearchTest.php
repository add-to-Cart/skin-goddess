<?php

use App\Models\Client;
use App\Models\FollowUp;
use App\Models\InventoryItem;
use App\Models\Procedure;
use App\Models\Sale;
use App\Models\Service;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/** @return array<string, string> */
function recordSearchHeaders(): array
{
    $user = User::factory()->create(['username' => fake()->unique()->userName(), 'hashed_password' => Hash::make('search-test'), 'role' => 'staff', 'is_active' => true]);

    return ['Authorization' => 'Bearer '.Crypt::encryptString(json_encode(['user_id' => $user->id, 'expires_at' => time() + 3600]))];
}

test('lookup endpoints require authentication', function (string $path) {
    $this->getJson('/api/'.$path.'/lookup?search=Ana')->assertUnauthorized();
})->with(['clients', 'services', 'inventory/items']);

test('client lookup matches full names formatted phones and IDs without exposing notes', function (string $search) {
    $this->withHeaders(recordSearchHeaders());
    $client = Client::create(['first_name' => 'Ana Maria', 'last_name' => 'Santos', 'phone' => '(0912) 345-6789', 'notes' => 'Private fixture note']);
    Client::create(['first_name' => 'Ana Maria', 'last_name' => 'Santos', 'is_active' => false]);

    $term = $search === 'id' ? '#'.$client->id : $search;
    $this->getJson('/api/clients/lookup?'.http_build_query(['search' => $term]))->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $client->id)->assertJsonMissingPath('data.0.notes')->assertJsonMissingPath('data.0.address');
})->with(['full name' => 'ana santos', 'phone' => '09123456789', 'formatted phone' => '0912-345-6789', 'id' => 'id']);

test('empty lookup does not download the directory and long search is rejected', function () {
    $this->withHeaders(recordSearchHeaders());
    Client::create(['first_name' => 'Ana', 'last_name' => 'Santos']);
    $this->getJson('/api/clients/lookup')->assertOk()->assertExactJson(['data' => [], 'has_more' => false]);
    $this->getJson('/api/clients/lookup?search=A')->assertOk()->assertJsonCount(0, 'data');
    $this->getJson('/api/clients/lookup?search='.str_repeat('a', 101))->assertUnprocessable()->assertJsonValidationErrors('search');
});

test('lookup treats SQL wildcards as literal search characters', function () {
    $this->withHeaders(recordSearchHeaders());
    Client::create(['first_name' => 'Ana', 'last_name' => 'Santos']);
    $client = Client::create(['first_name' => 'Percent%Name', 'last_name' => 'Santos']);
    $this->getJson('/api/clients/lookup?'.http_build_query(['search' => '%Name']))->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $client->id);
});

test('client results stay bounded with fifty thousand clients and a last-record match is reachable', function () {
    $this->withHeaders(recordSearchHeaders());
    for ($offset = 0; $offset < 50000; $offset += 1000) {
        $rows = [];
        for ($index = $offset; $index < $offset + 1000; $index++) {
            $rows[] = ['first_name' => 'Scale', 'last_name' => sprintf('Person%05d', $index), 'phone' => '09'.str_pad((string) $index, 9, '0', STR_PAD_LEFT)];
        }
        DB::table('clients')->insert($rows);
    }

    $this->getJson('/api/clients/lookup?search=Scale')->assertOk()->assertJsonCount(20, 'data')->assertJsonPath('has_more', true);
    $this->getJson('/api/clients/lookup?search=Scale%20Person49999')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.last_name', 'Person49999');
    $this->getJson('/api/clients?paginated=1')->assertOk()->assertJsonCount(25, 'data')->assertJsonStructure(['next_cursor', 'prev_cursor']);
    $this->assertDatabaseCount('clients', 50000);
});

test('cursor pages do not skip clients sharing the same name', function () {
    $this->withHeaders(recordSearchHeaders());
    for ($index = 0; $index < 30; $index++) {
        Client::create(['first_name' => 'Same', 'last_name' => 'Name', 'phone' => (string) $index]);
    }
    $first = $this->getJson('/api/clients?paginated=1&search=Same')->assertOk()->assertJsonCount(25, 'data')->json();
    $second = $this->getJson('/api/clients?'.http_build_query(['paginated' => 1, 'search' => 'Same', 'cursor' => $first['next_cursor']]))->assertOk()->assertJsonCount(5, 'data')->json();
    expect(array_intersect(array_column($first['data'], 'id'), array_column($second['data'], 'id')))->toBeEmpty();
    $back = $this->getJson('/api/clients?'.http_build_query(['paginated' => 1, 'search' => 'Same', 'cursor' => $second['prev_cursor']]))->assertOk()->json();
    expect(array_column($back['data'], 'id'))->toBe(array_column($first['data'], 'id'));
});

test('registration name checks support full valid name lengths without unrelated substring matches', function () {
    $this->withHeaders(recordSearchHeaders());
    Client::create(['first_name' => 'Ana', 'last_name' => 'DeSantos']);
    $client = Client::create(['first_name' => str_repeat('a', 100), 'last_name' => str_repeat('b', 100)]);
    $this->getJson('/api/clients/lookup?'.http_build_query(['first_name' => $client->first_name, 'last_name' => $client->last_name]))->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $client->id);
    $this->getJson('/api/clients/lookup?first_name=Ana&last_name=Santos')->assertOk()->assertJsonCount(0, 'data');
});

test('catalog and supply lookup return bounded active choices with only needed fields', function () {
    $this->withHeaders(recordSearchHeaders());
    for ($index = 0; $index < 25; $index++) {
        Service::create(['name' => 'Facial '.$index, 'default_price' => '100.00']);
        InventoryItem::create(['name' => 'Serum '.$index, 'current_quantity' => '5.000', 'unit' => 'ml', 'acquisition_cost' => '50.00']);
    }
    Service::create(['name' => 'Facial archived', 'is_active' => false]);
    InventoryItem::create(['name' => 'Serum archived', 'is_active' => false]);
    $this->getJson('/api/services/lookup?search=Facial')->assertOk()->assertJsonCount(20, 'data')->assertJsonPath('has_more', true)->assertJsonMissing(['name' => 'Facial archived']);
    $this->getJson('/api/inventory/items/lookup?search=Serum')->assertOk()->assertJsonCount(20, 'data')->assertJsonPath('has_more', true)->assertJsonPath('data.0.unit', 'ml')->assertJsonMissingPath('data.0.acquisition_cost');
    $this->getJson('/api/services/lookup')->assertOk()->assertJsonCount(0, 'data');
    $this->getJson('/api/inventory/items/lookup')->assertOk()->assertJsonCount(0, 'data');
});

test('worklists can load safe client identities with their records including archived clients', function () {
    $this->withHeaders(recordSearchHeaders());
    $client = Client::create(['first_name' => 'Ana', 'last_name' => 'Santos', 'notes' => 'Private fixture note']);
    $service = Service::create(['name' => 'Facial']);
    $this->postJson('/api/sales', ['client_id' => $client->id, 'sale_date' => '2026-11-02', 'items' => [['description' => 'Facial', 'quantity' => 1, 'unit_price' => 100]]])->assertCreated();
    $this->postJson('/api/procedures', ['client_id' => $client->id, 'service_id' => $service->id, 'procedure_date' => '2026-11-02'])->assertCreated();
    $this->postJson('/api/follow-ups', ['client_id' => $client->id, 'follow_up_date' => '2026-11-03'])->assertCreated();
    $client->update(['is_active' => false]);
    foreach (['sales', 'procedures', 'follow-ups'] as $path) {
        $this->getJson('/api/'.$path.'?include_client=1')->assertOk()->assertJsonPath('0.client.id', $client->id)->assertJsonPath('0.client.first_name', 'Ana')->assertJsonPath('0.client.is_active', false)->assertJsonMissingPath('0.client.notes');
    }
});

test('transaction worklists search on the server and paginate without losing same-date records', function (string $path, string $model, string $dateField) {
    $this->withHeaders(recordSearchHeaders());
    $client = Client::create(['first_name' => 'Scale', 'last_name' => 'Person', 'phone' => '09123456789']);
    $service = Service::create(['name' => 'Facial']);
    for ($index = 0; $index < 30; $index++) {
        $attributes = ['client_id' => $client->id, $dateField => '2026-01-01'];
        if ($path === 'sales') {
            $attributes['total_amount'] = 0;
        }
        if ($path === 'procedures') {
            $attributes['service_id'] = $service->id;
        }
        $model::create($attributes);
    }
    $params = ['paginated' => 1, 'include_client' => 1, 'search' => 'Scale Person'];
    $first = $this->getJson('/api/'.$path.'?'.http_build_query($params))->assertOk()->assertJsonCount(25, 'data')->assertJsonPath('data.0.client.first_name', 'Scale')->json();
    $second = $this->getJson('/api/'.$path.'?'.http_build_query([...$params, 'cursor' => $first['next_cursor']]))->assertOk()->assertJsonCount(5, 'data')->json();
    expect(array_intersect(array_column($first['data'], 'id'), array_column($second['data'], 'id')))->toBeEmpty();
    $this->getJson('/api/'.$path.'?'.http_build_query([...$params, 'search' => 'missing person']))->assertOk()->assertJsonCount(0, 'data');
    $back = $this->getJson('/api/'.$path.'?'.http_build_query([...$params, 'cursor' => $second['prev_cursor']]))->assertOk()->json();
    expect(array_column($back['data'], 'id'))->toBe(array_column($first['data'], 'id'));
    if ($path === 'follow-ups') {
        $this->getJson('/api/follow-ups/overdue?count_only=1')->assertOk()->assertExactJson(['count' => 30]);
    }
})->with([
    ['sales', Sale::class, 'sale_date'],
    ['procedures', Procedure::class, 'procedure_date'],
    ['follow-ups', FollowUp::class, 'follow_up_date'],
]);
