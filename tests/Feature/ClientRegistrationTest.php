<?php

use App\Models\Client;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;

/** @return array<string, string> */
function clientRegistrationHeaders(): array
{
    $user = User::factory()->create(['username' => fake()->unique()->userName(), 'hashed_password' => Hash::make('test-password'), 'role' => 'staff', 'is_active' => true]);

    return ['Authorization' => 'Bearer '.Crypt::encryptString(json_encode(['user_id' => $user->id, 'expires_at' => time() + 3600]))];
}

test('repeated registration returns 409 without changing the original client', function (array $original, array $retry) {
    $this->withHeaders(clientRegistrationHeaders());
    $client = $this->postJson('/api/clients', $original)->assertCreated()->json();

    $this->postJson('/api/clients', $retry)->assertConflict()->assertJsonPath('existing_client.id', $client['id']);

    $this->assertDatabaseCount('clients', 1);
    $this->assertDatabaseHas('clients', ['id' => $client['id'], 'first_name' => $client['first_name'], 'last_name' => $client['last_name'], 'phone' => $client['phone'], 'email' => $client['email']]);
})->with([
    'formatted phone and case' => [['first_name' => 'Ana', 'last_name' => 'Santos', 'phone' => '0912 345 6789'], ['first_name' => ' ana ', 'last_name' => 'SANTOS', 'phone' => '0912-345-6789', 'notes' => 'Changed notes do not create another person']],
    'same email and different phone' => [['first_name' => 'Ana', 'last_name' => 'Santos', 'email' => 'ana@example.invalid'], ['first_name' => 'ANA', 'last_name' => 'santos', 'email' => 'ANA@example.invalid', 'phone' => '12345']],
]);

test('same names with distinct contact details remain separate clients', function () {
    $this->withHeaders(clientRegistrationHeaders());
    $this->postJson('/api/clients', ['first_name' => 'Ana', 'last_name' => 'Santos', 'phone' => '111'])->assertCreated();
    $this->postJson('/api/clients', ['first_name' => 'Ana', 'last_name' => 'Santos', 'phone' => '222'])->assertCreated();

    $this->assertDatabaseCount('clients', 2);
});

test('unicode whitespace cannot create an empty client name', function () {
    $this->withHeaders(clientRegistrationHeaders());
    $this->postJson('/api/clients', ['first_name' => "\u{3164}", 'last_name' => 'Santos'])->assertUnprocessable()->assertJsonPath('errors.first_name.0', 'The first name field is required.');
    $this->assertDatabaseCount('clients', 0);
});

test('different people sharing a phone are not treated as duplicates', function () {
    $this->withHeaders(clientRegistrationHeaders());
    $this->postJson('/api/clients', ['first_name' => 'Ana', 'last_name' => 'Santos', 'phone' => '111'])->assertCreated();
    $this->postJson('/api/clients', ['first_name' => 'Bea', 'last_name' => 'Santos', 'phone' => '111'])->assertCreated();

    $this->assertDatabaseCount('clients', 2);
});

test('archived registrations cannot silently create a replacement client', function () {
    $this->withHeaders(clientRegistrationHeaders());
    $data = ['first_name' => 'Ana', 'last_name' => 'Santos', 'email' => 'ana@example.invalid'];
    $client = $this->postJson('/api/clients', $data)->assertCreated()->json();
    Client::findOrFail($client['id'])->update(['is_active' => false]);

    $this->postJson('/api/clients', $data)->assertConflict()->assertJsonPath('existing_client.is_active', false);

    $this->assertDatabaseCount('clients', 1);
    $this->assertDatabaseHas('clients', ['id' => $client['id'], 'is_active' => false]);
});

test('a busy registration lock returns 409 without creating a client', function () {
    $this->withHeaders(clientRegistrationHeaders());
    $lock = Cache::lock('clinic-client-registration', 30);
    expect($lock->get())->toBeTrue();
    try {
        $this->postJson('/api/clients', ['first_name' => 'Ana', 'last_name' => 'Santos'])->assertConflict()->assertJsonPath('detail', 'Another client registration is being saved. Please retry in a moment.');
        $this->assertDatabaseCount('clients', 0);
    } finally {
        $lock->release();
    }
});

test('retrying a registration key returns its original client without contact details', function () {
    $this->withHeaders(clientRegistrationHeaders());
    $data = ['first_name' => 'Ana', 'last_name' => 'Santos', 'registration_key' => 'client-registration-test-001'];
    $client = $this->postJson('/api/clients', $data)->assertCreated()->json();
    $this->postJson('/api/clients', $data)->assertOk()->assertJsonPath('id', $client['id']);
    $this->postJson('/api/clients', [...$data, 'notes' => 'Changed details'])->assertConflict();
    $this->assertDatabaseCount('clients', 1);
    $this->assertDatabaseHas('clients', ['id' => $client['id'], 'notes' => null]);
});

test('a name alone does not block distinct registrations', function () {
    $this->withHeaders(clientRegistrationHeaders());
    $data = ['first_name' => 'Ana', 'last_name' => 'Santos'];
    $this->postJson('/api/clients', $data)->assertCreated();
    $this->postJson('/api/clients', $data)->assertCreated();
    $this->assertDatabaseCount('clients', 2);
});

test('invalid registration keys return 422 without creating a client', function (mixed $key) {
    $this->withHeaders(clientRegistrationHeaders());
    $this->postJson('/api/clients', ['first_name' => 'Ana', 'last_name' => 'Santos', 'registration_key' => $key])->assertUnprocessable()->assertJsonValidationErrors('registration_key');
    $this->assertDatabaseCount('clients', 0);
})->with([
    'short' => ['short'],
    'long' => [str_repeat('x', 101)],
    'invalid characters' => ['client/registration/key'],
    'non-string' => [['invalid']],
]);
