<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $inventory_item_id
 * @property string $transaction_type
 * @property string $quantity_change
 * @property string|null $quantity_after
 * @property string|null $reference_type
 * @property int|null $reference_id
 * @property string|null $notes
 * @property Carbon $created_at
 * @property-read InventoryItem $inventory_item
 */
class InventoryTransaction extends Model
{
    protected $table = 'inventory_transactions';

    protected $fillable = [
        'inventory_item_id',
        'transaction_type',
        'quantity_change',
        'quantity_after',
        'reference_type',
        'reference_id',
        'notes',
    ];

    public const UPDATED_AT = null;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'quantity_change' => 'decimal:3',
            'quantity_after' => 'decimal:3',
            'created_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<InventoryItem, $this> */
    public function inventory_item(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }
}
