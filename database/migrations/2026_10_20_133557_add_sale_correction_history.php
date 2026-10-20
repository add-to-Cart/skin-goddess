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
            $table->unsignedInteger('version')->default(0);
        });

        Schema::create('sale_corrections', function (Blueprint $table): void {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('sale_id')->constrained('sales');
            $table->unsignedInteger('revision');
            $table->foreignId('corrected_by_user_id')->constrained('users');
            $table->text('reason');
            $table->json('before_snapshot');
            $table->json('after_snapshot');
            $table->dateTime('created_at', 6);
            $table->unique(['sale_id', 'revision']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sale_corrections');
        Schema::table('sales', function (Blueprint $table): void {
            $table->dropColumn('version');
        });
    }
};
