<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property Carbon $purchase_date
 * @property string|null $supplier_name
 * @property string|null $supplier_contact
 * @property string|null $total_cost
 * @property string|null $notes
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Collection<int, InventoryPurchaseItem> $items
 */
class InventoryPurchase extends Model
{
    protected $table = 'inventory_purchases';

    protected $fillable = [
        'purchase_date',
        'supplier_name',
        'supplier_contact',
        'total_cost',
        'notes',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'purchase_date' => 'date:Y-m-d',
            'total_cost' => 'decimal:2',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /** @return HasMany<InventoryPurchaseItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(InventoryPurchaseItem::class, 'purchase_id');
    }
}
