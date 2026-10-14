<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('name')->nullable()->change();
            $table->string('email')->nullable()->change();
            $table->string('password')->nullable()->change();
            $table->string('username', 100)->nullable()->unique();
            $table->string('hashed_password', 255)->nullable();
            $table->string('role', 20)->default('staff');
            $table->boolean('is_active')->default(true);
        });
        Schema::create('clients', function (Blueprint $table): void {
            $table->engine = 'InnoDB';
            $table->id();
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('phone', 30)->nullable();
            $table->string('email', 255)->nullable();
            $table->string('address', 500)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->dateTime('created_at', 6)->useCurrent();
            $table->dateTime('updated_at', 6)->useCurrent()->useCurrentOnUpdate();
        });

        Schema::create('expenses', function (Blueprint $table): void {
            $table->engine = 'InnoDB';
            $table->id();
            $table->date('expense_date');
            $table->string('description', 300);
            $table->string('category', 50)->nullable();
            $table->decimal('amount', 10, 2);
            $table->text('notes')->nullable();
            $table->dateTime('created_at', 6)->useCurrent();
            $table->dateTime('updated_at', 6)->useCurrent()->useCurrentOnUpdate();
        });

        Schema::create('inventory_items', function (Blueprint $table): void {
            $table->engine = 'InnoDB';
            $table->id();
            $table->string('name', 200);
            $table->string('category', 50)->nullable();
            $table->string('unit', 50)->nullable();
            $table->decimal('current_quantity', 10, 3)->default(0);
            $table->decimal('minimum_stock_level', 10, 3)->nullable();
            $table->decimal('acquisition_cost', 10, 2)->nullable();
            $table->decimal('selling_price', 10, 2)->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->dateTime('created_at', 6)->useCurrent();
            $table->dateTime('updated_at', 6)->useCurrent()->useCurrentOnUpdate();
        });

        Schema::create('inventory_purchases', function (Blueprint $table): void {
            $table->engine = 'InnoDB';
            $table->id();
            $table->date('purchase_date');
            $table->string('supplier_name', 200)->nullable();
            $table->string('supplier_contact', 200)->nullable();
            $table->decimal('total_cost', 10, 2)->nullable();
            $table->text('notes')->nullable();
            $table->dateTime('created_at', 6)->useCurrent();
            $table->dateTime('updated_at', 6)->useCurrent()->useCurrentOnUpdate();
        });

        Schema::create('services', function (Blueprint $table): void {
            $table->engine = 'InnoDB';
            $table->id();
            $table->string('name', 200);
            $table->text('description')->nullable();
            $table->decimal('default_price', 10, 2)->nullable();
            $table->integer('duration_minutes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->dateTime('created_at', 6)->useCurrent();
            $table->dateTime('updated_at', 6)->useCurrent()->useCurrentOnUpdate();
        });

        Schema::create('inventory_purchase_items', function (Blueprint $table): void {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('purchase_id')->constrained('inventory_purchases');
            $table->foreignId('inventory_item_id')->constrained('inventory_items');
            $table->decimal('quantity', 10, 3);
            $table->decimal('unit_cost', 10, 2);
            $table->decimal('line_total', 10, 2)->nullable();
        });

        Schema::create('inventory_transactions', function (Blueprint $table): void {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('inventory_item_id')->constrained('inventory_items');
            $table->string('transaction_type', 30);
            $table->decimal('quantity_change', 10, 3);
            $table->decimal('quantity_after', 10, 3)->nullable();
            $table->string('reference_type', 50)->nullable();
            $table->integer('reference_id')->nullable();
            $table->text('notes')->nullable();
            $table->dateTime('created_at', 6)->useCurrent();
        });

        Schema::create('procedures', function (Blueprint $table): void {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('client_id')->constrained('clients');
            $table->foreignId('service_id')->constrained('services');
            $table->date('procedure_date');
            $table->integer('session_number')->nullable();
            $table->decimal('price', 10, 2)->nullable();
            $table->date('next_follow_up')->nullable();
            $table->text('notes')->nullable();
            $table->dateTime('created_at', 6)->useCurrent();
            $table->dateTime('updated_at', 6)->useCurrent()->useCurrentOnUpdate();
        });

        Schema::create('sales', function (Blueprint $table): void {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('client_id')->constrained('clients');
            $table->date('sale_date');
            $table->decimal('total_amount', 10, 2);
            $table->string('payment_status', 20)->default('unpaid');
            $table->text('notes')->nullable();
            $table->dateTime('created_at', 6)->useCurrent();
            $table->dateTime('updated_at', 6)->useCurrent()->useCurrentOnUpdate();
        });

        Schema::create('follow_ups', function (Blueprint $table): void {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('client_id')->constrained('clients');
            $table->foreignId('procedure_id')->nullable()->constrained('procedures');
            $table->date('follow_up_date');
            $table->string('status', 20)->default('upcoming');
            $table->text('notes')->nullable();
            $table->dateTime('created_at', 6)->useCurrent();
            $table->dateTime('updated_at', 6)->useCurrent()->useCurrentOnUpdate();
        });

        Schema::create('payments', function (Blueprint $table): void {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('sale_id')->constrained('sales');
            $table->date('payment_date');
            $table->decimal('amount', 10, 2);
            $table->string('payment_method', 50)->nullable();
            $table->string('idempotency_key', 64)->unique();
            $table->string('receipt_number', 40)->unique();
            $table->string('reference_number', 100)->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('recorded');
            $table->text('void_reason')->nullable();
            $table->dateTime('voided_at', 6)->nullable();
            $table->foreignId('recorded_by_user_id')->constrained('users');
            $table->foreignId('voided_by_user_id')->nullable()->constrained('users');
            $table->dateTime('created_at', 6)->useCurrent();
            $table->dateTime('updated_at', 6)->useCurrent()->useCurrentOnUpdate();
        });

        Schema::create('procedure_supplies', function (Blueprint $table): void {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('procedure_id')->constrained('procedures');
            $table->foreignId('inventory_item_id')->constrained('inventory_items');
            $table->decimal('quantity_used', 10, 3);
            $table->decimal('unit_cost_at_use', 10, 2)->nullable();
            $table->text('notes')->nullable();
            $table->dateTime('created_at', 6)->useCurrent();
        });

        Schema::create('sale_items', function (Blueprint $table): void {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('sale_id')->constrained('sales');
            $table->foreignId('procedure_id')->nullable()->constrained('procedures');
            $table->string('description', 300);
            $table->decimal('quantity', 10, 3)->default(1);
            $table->decimal('unit_price', 10, 2);
            $table->decimal('line_total', 10, 2);
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('procedure_supplies');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('follow_ups');
        Schema::dropIfExists('sales');
        Schema::dropIfExists('procedures');
        Schema::dropIfExists('inventory_transactions');
        Schema::dropIfExists('inventory_purchase_items');
        Schema::dropIfExists('services');
        Schema::dropIfExists('inventory_purchases');
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('clients');
        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique(['username']);
            $table->dropColumn(['username', 'hashed_password', 'role', 'is_active']);
        });
    }
};
