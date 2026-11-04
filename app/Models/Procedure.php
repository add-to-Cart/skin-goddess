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
 * @property int $service_id
 * @property Carbon $procedure_date
 * @property int|null $session_number
 * @property int|null $package_sale_id
 * @property string|null $completion_key
 * @property string|null $completion_fingerprint
 * @property int|null $completed_by_user_id
 * @property Carbon|null $reversed_at
 * @property int|null $reversed_by_user_id
 * @property string|null $reversal_reason
 * @property-read ClinicUser|null $reversed_by
 * @property-read ClinicUser|null $completed_by
 * @property-read Sale|null $package_sale
 * @property string|null $price
 * @property Carbon|null $next_follow_up
 * @property string|null $notes
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Client $client
 * @property-read Service $service
 * @property-read Collection<int, ProcedureSupply> $supplies_used
 * @property-read Collection<int, FollowUp> $follow_ups
 * @property-read Collection<int, SaleItem> $sale_items
 */
class Procedure extends Model
{
    protected $table = 'procedures';

    protected $fillable = [
        'client_id',
        'service_id',
        'procedure_date',
        'session_number',
        'price',
        'next_follow_up',
        'notes',
    ];

    protected $hidden = ['completion_fingerprint'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'procedure_date' => 'date:Y-m-d',
            'package_sale_id' => 'integer',
            'completed_by_user_id' => 'integer',
            'reversed_at' => 'datetime',
            'reversed_by_user_id' => 'integer',
            'price' => 'decimal:2',
            'next_follow_up' => 'date:Y-m-d',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Client, $this> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    /** @return BelongsTo<Service, $this> */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class, 'service_id');
    }

    /** @return HasMany<ProcedureSupply, $this> */
    public function supplies_used(): HasMany
    {
        return $this->hasMany(ProcedureSupply::class, 'procedure_id');
    }

    /** @return HasMany<FollowUp, $this> */
    public function follow_ups(): HasMany
    {
        return $this->hasMany(FollowUp::class, 'procedure_id');
    }

    /** @return HasMany<SaleItem, $this> */
    public function sale_items(): HasMany
    {
        return $this->hasMany(SaleItem::class, 'procedure_id');
    }

    /** @return BelongsTo<Sale, $this> */
    public function package_sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class, 'package_sale_id');
    }

    /** @return BelongsTo<ClinicUser, $this> */
    public function completed_by(): BelongsTo
    {
        return $this->belongsTo(ClinicUser::class, 'completed_by_user_id');
    }

    /** @return BelongsTo<ClinicUser, $this> */
    public function reversed_by(): BelongsTo
    {
        return $this->belongsTo(ClinicUser::class, 'reversed_by_user_id');
    }
}
