<?php

use App\Models\User;
use Illuminate\Support\Facades\Crypt;

test('package screens receive a consistent review version supply names and safe actor history', function () {
    $user = User::factory()->create(['username' => 'presentation_admin', 'role' => 'admin', 'is_active' => true]);
    $this->withToken(Crypt::encryptString(json_encode(['user_id' => $user->id, 'expires_at' => time() + 3600], JSON_THROW_ON_ERROR)));
    $client = $this->postJson('/api/clients', ['first_name' => 'Presentation', 'last_name' => 'Test'])->assertCreated()->json();
    $service = $this->postJson('/api/services', ['name' => 'Facial'])->assertCreated()->json();
    $item = $this->postJson('/api/inventory/items', ['name' => 'Serum', 'unit' => 'ml', 'current_quantity' => '5.000'])->assertCreated()->json();
    $sale = $this->postJson('/api/sales', ['client_id' => $client['id'], 'package_service_id' => $service['id'], 'included_sessions' => 2, 'package_purchase_key' => 'presentation-purchase-001', 'sale_date' => '2026-10-25', 'items' => [['description' => 'Facial package', 'unit_price' => '12000.00']]])->assertCreated()->json();
    $procedure = $this->postJson('/api/sales/'.$sale['id'].'/sessions', ['client_id' => $client['id'], 'service_id' => $service['id'], 'procedure_date' => '2026-10-25', 'completion_key' => 'presentation-completion-001', 'supplies' => [['inventory_item_id' => $item['id'], 'quantity_used' => '1.000']]])->assertCreated()->json();

    $this->getJson('/api/sales/'.$sale['id'].'/sessions')->assertOk()->assertJsonPath('version', 1)->assertJsonPath('procedures.0.supplies_used.0.inventory_item.name', 'Serum')->assertJsonPath('procedures.0.completed_by.username', 'presentation_admin')->assertJsonMissingPath('procedures.0.completed_by.hashed_password');
    $this->postJson('/api/sales/'.$sale['id'].'/cancel-package', ['reason' => 'Reviewed cancellation', 'expected_version' => 1])->assertOk();
    $this->postJson('/api/sales/'.$sale['id'].'/sessions/'.$procedure['id'].'/reverse', ['reason' => 'Incorrect entry', 'expected_version' => 2])->assertOk();
    $this->getJson('/api/sales/'.$sale['id'].'/sessions')->assertOk()->assertJsonPath('version', 3)->assertJsonPath('is_canceled', true)->assertJsonPath('remaining_sessions', 2)->assertJsonPath('reversed_sessions', 1)->assertJsonPath('procedures.0.reversed_by.username', 'presentation_admin');
    $this->getJson('/api/procedures?client_id='.$client['id'])->assertOk()->assertJsonPath('0.package_sale.id', $sale['id'])->assertJsonPath('0.package_sale.canceled_at', fn ($value): bool => $value !== null);
});
