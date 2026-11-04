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
            $table->foreignId('package_service_id')->nullable()->constrained('services');
            $table->unsignedInteger('included_sessions')->nullable();
            $table->string('package_purchase_key', 64)->nullable()->unique();
            $table->string('package_purchase_fingerprint', 64)->nullable();
        });

        Schema::table('procedures', function (Blueprint $table): void {
            $table->foreignId('package_sale_id')->nullable()->index()->constrained('sales');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('procedures', function (Blueprint $table): void {
            $table->dropForeign(['package_sale_id']);
            $table->dropIndex(['package_sale_id']);
            $table->dropColumn('package_sale_id');
        });

        Schema::table('sales', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('package_service_id');
            $table->dropUnique(['package_purchase_key']);
            $table->dropColumn(['included_sessions', 'package_purchase_key', 'package_purchase_fingerprint']);
        });
    }
};
