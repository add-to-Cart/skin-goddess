<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $first_name
 * @property string $last_name
 * @property string|null $phone
 * @property string|null $email
 * @property string|null $address
 * @property string|null $notes
 * @property bool $is_active
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Collection<int, Procedure> $procedures
 * @property-read Collection<int, FollowUp> $follow_ups
 * @property-read Collection<int, Sale> $sales
 */
class Client extends Model
{
    protected $table = 'clients';

    protected $fillable = [
        'first_name',
        'last_name',
        'phone',
        'email',
        'address',
        'notes',
        'is_active',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /** @param Builder<Client> $query */
    public function scopeMatchingSearch(Builder $query, string $search): void
    {
        $search = Str::squish($search);
        if ($search === '') {
            return;
        }
        $query->where(function (Builder $matches) use ($search): void {
            $matches->where(function (Builder $name) use ($search): void {
                foreach (explode(' ', $search) as $term) {
                    $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], Str::lower($term)).'%';
                    $name->where(function (Builder $part) use ($pattern): void {
                        foreach (['first_name', 'last_name', 'phone', 'email'] as $column) {
                            $part->orWhereRaw("LOWER({$column}) LIKE ? ESCAPE '!'", [$pattern]);
                        }
                    });
                }
            });
            if (preg_match('/^#?(\d+)$/', $search, $id)) {
                $matches->orWhere('id', $id[1]);
            }
            if (preg_match('/^[+()\d\s-]+$/', $search)) {
                $digits = preg_replace('/\D/', '', $search);
                if ($digits !== '') {
                    $matches->orWhereRaw("REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') LIKE ?", ['%'.$digits.'%']);
                }
            }
        });
    }

    /** @return HasMany<Procedure, $this> */
    public function procedures(): HasMany
    {
        return $this->hasMany(Procedure::class, 'client_id');
    }

    /** @return HasMany<FollowUp, $this> */
    public function follow_ups(): HasMany
    {
        return $this->hasMany(FollowUp::class, 'client_id');
    }

    /** @return HasMany<Sale, $this> */
    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class, 'client_id');
    }
}
