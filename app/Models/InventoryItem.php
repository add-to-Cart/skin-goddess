<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string|null $category
 * @property string|null $unit
 * @property string $current_quantity
 * @property string|null $minimum_stock_level
 * @property string|null $acquisition_cost
 * @property string|null $selling_price
 * @property string|null $description
 * @property bool $is_active
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Collection<int, InventoryTransaction> $transactions
 * @property-read Collection<int, InventoryPurchaseItem> $purchase_items
 * @property-read Collection<int, ProcedureSupply> $procedure_supplies
 */
class InventoryItem extends Model
{
    protected $table = 'inventory_items';

    protected $fillable = [
        'name',
        'category',
        'unit',
        'current_quantity',
        'minimum_stock_level',
        'acquisition_cost',
        'selling_price',
        'description',
        'is_active',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'current_quantity' => 'decimal:3',
            'minimum_stock_level' => 'decimal:3',
            'acquisition_cost' => 'decimal:2',
            'selling_price' => 'decimal:2',
            'is_active' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /** @return HasMany<InventoryTransaction, $this> */
    public function transactions(): HasMany
    {
        return $this->hasMany(InventoryTransaction::class, 'inventory_item_id');
    }

    /** @return HasMany<InventoryPurchaseItem, $this> */
    public function purchase_items(): HasMany
    {
        return $this->hasMany(InventoryPurchaseItem::class, 'inventory_item_id');
    }

    /** @return HasMany<ProcedureSupply, $this> */
    public function procedure_supplies(): HasMany
    {
        return $this->hasMany(ProcedureSupply::class, 'inventory_item_id');
    }
}
