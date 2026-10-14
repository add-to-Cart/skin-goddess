<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $username
 * @property string $hashed_password
 * @property string $role
 * @property bool $is_active
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
class ClinicUser extends Model
{
    protected $table = 'users';

    protected $fillable = [
        'username',
        'hashed_password',
        'role',
        'is_active',
    ];

    protected $hidden = ['hashed_password', 'password', 'remember_token', 'email_verified_at'];

    protected $visible = ['id', 'username', 'role', 'is_active', 'created_at', 'updated_at'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
