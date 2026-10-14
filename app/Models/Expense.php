<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property Carbon $expense_date
 * @property string $description
 * @property string|null $category
 * @property string $amount
 * @property string|null $notes
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
class Expense extends Model
{
    protected $table = 'expenses';

    protected $fillable = [
        'expense_date',
        'description',
        'category',
        'amount',
        'notes',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'expense_date' => 'date:Y-m-d',
            'amount' => 'decimal:2',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
