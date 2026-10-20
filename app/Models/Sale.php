<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $client_id
 * @property Carbon $sale_date
 * @property string $total_amount
 * @property string $payment_status
 * @property string|null $notes
 * @property int $version
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Client $client
 * @property-read Collection<int, SaleItem> $items
 * @property-read Collection<int, Payment> $payments
 */
class Sale extends Model
{
    protected $table = 'sales';

    protected $fillable = [
        'client_id',
        'sale_date',
        'total_amount',
        'payment_status',
        'notes',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'sale_date' => 'date:Y-m-d',
            'total_amount' => 'decimal:2',
            'version' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Client, $this> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    /** @return HasMany<SaleItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class, 'sale_id');
    }

    /** @return HasMany<Payment, $this> */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'sale_id');
    }
}
