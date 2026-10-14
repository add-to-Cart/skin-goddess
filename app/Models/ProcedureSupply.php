<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $procedure_id
 * @property int $inventory_item_id
 * @property string $quantity_used
 * @property string|null $unit_cost_at_use
 * @property string|null $notes
 * @property Carbon $created_at
 * @property-read Procedure $procedure
 * @property-read InventoryItem $inventory_item
 */
class ProcedureSupply extends Model
{
    protected $table = 'procedure_supplies';

    protected $fillable = [
        'procedure_id',
        'inventory_item_id',
        'quantity_used',
        'unit_cost_at_use',
        'notes',
    ];

    public const UPDATED_AT = null;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'quantity_used' => 'decimal:3',
            'unit_cost_at_use' => 'decimal:2',
            'created_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Procedure, $this> */
    public function procedure(): BelongsTo
    {
        return $this->belongsTo(Procedure::class, 'procedure_id');
    }

    /** @return BelongsTo<InventoryItem, $this> */
    public function inventory_item(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }
}
