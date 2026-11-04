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
        Schema::table('sales', function (Blueprint $table): void {
            $table->dateTime('canceled_at', 6)->nullable();
            $table->foreignId('canceled_by_user_id')->nullable()->constrained('users');
            $table->text('cancellation_reason')->nullable();
        });

        Schema::table('procedures', function (Blueprint $table): void {
            $table->dateTime('reversed_at', 6)->nullable();
            $table->foreignId('reversed_by_user_id')->nullable()->constrained('users');
            $table->text('reversal_reason')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('procedures', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('reversed_by_user_id');
            $table->dropColumn(['reversed_at', 'reversal_reason']);
        });

        Schema::table('sales', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('canceled_by_user_id');
            $table->dropColumn(['canceled_at', 'cancellation_reason']);
        });
    }
};
