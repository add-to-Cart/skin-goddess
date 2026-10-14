<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $sale_id
 * @property Carbon $payment_date
 * @property string $amount
 * @property string|null $payment_method
 * @property string $idempotency_key
 * @property string $receipt_number
 * @property string|null $reference_number
 * @property string|null $notes
 * @property string $status
 * @property string|null $void_reason
 * @property Carbon|null $voided_at
 * @property int $recorded_by_user_id
 * @property int|null $voided_by_user_id
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Sale $sale
 * @property-read ClinicUser $recorded_by
 * @property-read ClinicUser $voided_by
 */
class Payment extends Model
{
    protected $table = 'payments';

    protected $fillable = [
        'sale_id',
        'payment_date',
        'amount',
        'payment_method',
        'idempotency_key',
        'receipt_number',
        'reference_number',
        'notes',
        'status',
        'void_reason',
        'voided_at',
        'recorded_by_user_id',
        'voided_by_user_id',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'payment_date' => 'date:Y-m-d',
            'amount' => 'decimal:2',
            'voided_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Sale, $this> */
    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class, 'sale_id');
    }

    /** @return BelongsTo<ClinicUser, $this> */
    public function recorded_by(): BelongsTo
    {
        return $this->belongsTo(ClinicUser::class, 'recorded_by_user_id');
    }

    /** @return BelongsTo<ClinicUser, $this> */
    public function voided_by(): BelongsTo
    {
        return $this->belongsTo(ClinicUser::class, 'voided_by_user_id');
    }
}
