<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $purchase_id
 * @property int $inventory_item_id
 * @property string $quantity
 * @property string $unit_cost
 * @property string|null $line_total
 * @property-read InventoryPurchase $purchase
 * @property-read InventoryItem $inventory_item
 */
class InventoryPurchaseItem extends Model
{
    protected $table = 'inventory_purchase_items';

    protected $fillable = [
        'purchase_id',
        'inventory_item_id',
        'quantity',
        'unit_cost',
        'line_total',
    ];

    public $timestamps = false;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'unit_cost' => 'decimal:2',
            'line_total' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<InventoryPurchase, $this> */
    public function purchase(): BelongsTo
    {
        return $this->belongsTo(InventoryPurchase::class, 'purchase_id');
    }

    /** @return BelongsTo<InventoryItem, $this> */
    public function inventory_item(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }
}
