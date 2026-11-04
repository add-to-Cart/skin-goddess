<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('procedures', function (Blueprint $table): void {
            $table->string('completion_key', 64)->nullable()->unique();
            $table->string('completion_fingerprint', 64)->nullable();
            $table->foreignId('completed_by_user_id')->nullable()->constrained('users');
            $table->unique(['package_sale_id', 'session_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('procedures', function (Blueprint $table): void {
            $table->dropUnique(['package_sale_id', 'session_number']);
            $table->dropUnique(['completion_key']);
            $table->dropConstrainedForeignId('completed_by_user_id');
            $table->dropColumn(['completion_key', 'completion_fingerprint']);
        });
    }
};
