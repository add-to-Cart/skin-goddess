<?php

use App\Http\Controllers\ClientController;
use App\Http\Controllers\ClinicAuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\FollowUpController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProcedureController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\ServiceController;
use App\Http\Middleware\ClinicAuthentication;
use Illuminate\Support\Facades\Route;

Route::post('auth/login', [ClinicAuthController::class, 'login'])->middleware('throttle:10,1');
Route::middleware(ClinicAuthentication::class)->group(function (): void {
    Route::get('auth/me', [ClinicAuthController::class, 'me']);
    Route::post('auth/logout', [ClinicAuthController::class, 'logout']);
    Route::get('dashboard', [DashboardController::class, 'index']);
    Route::apiResource('clients', ClientController::class);
    Route::apiResource('services', ServiceController::class)->except('destroy');
    Route::get('follow-ups/upcoming', [FollowUpController::class, 'upcoming']);
    Route::get('follow-ups/overdue', [FollowUpController::class, 'overdue']);
    Route::apiResource('follow-ups', FollowUpController::class)->except('destroy');
    Route::apiResource('procedures', ProcedureController::class)->except('destroy');
    Route::post('procedures/{id}/supplies', [ProcedureController::class, 'addSupply']);
    Route::delete('procedures/{id}/supplies/{supplyId}', [ProcedureController::class, 'removeSupply']);
    Route::apiResource('inventory/items', InventoryController::class)->except('destroy');
    Route::post('inventory/items/{id}/adjust', [InventoryController::class, 'adjust']);
    Route::get('inventory/items/{id}/history', [InventoryController::class, 'history']);
    Route::get('inventory/transactions', [InventoryController::class, 'transactions']);
    Route::get('inventory/purchases', [InventoryController::class, 'purchases']);
    Route::post('inventory/purchases', [InventoryController::class, 'storePurchase']);
    Route::get('inventory/purchases/{id}', [InventoryController::class, 'purchase']);
    Route::apiResource('sales', SaleController::class)->except(['destroy', 'update']);
    Route::get('sales/{id}/corrections', [SaleController::class, 'corrections']);
    Route::get('sales/{id}/summary', [SaleController::class, 'summary']);
    Route::get('sales/{id}/invoice', [InvoiceController::class, 'download']);
    Route::post('sales/{id}/send-invoice', [InvoiceController::class, 'send']);
    Route::get('payments/sale/{id}', [PaymentController::class, 'history']);
    Route::get('payments', [PaymentController::class, 'index']);
    Route::post('payments', [PaymentController::class, 'store']);
    Route::get('payments/{id}', [PaymentController::class, 'show']);
    Route::match(['patch', 'delete'], 'payments/{id}', [PaymentController::class, 'immutable']);
});
Route::middleware(ClinicAuthentication::class.':admin')->group(function (): void {
    Route::match(['put', 'patch'], 'sales/{id}', [SaleController::class, 'update']);
    Route::apiResource('auth/users', ClinicAuthController::class)->except('show');
    Route::apiResource('expenses', ExpenseController::class);
    Route::post('payments/{id}/void', [PaymentController::class, 'void']);
    Route::get('reports/sales/daily', [ReportController::class, 'salesDaily']);
    Route::get('reports/sales/range', [ReportController::class, 'salesRange']);
    Route::get('reports/expenses/daily', [ReportController::class, 'expensesDaily']);
    Route::get('reports/expenses/range', [ReportController::class, 'expensesRange']);
    Route::get('reports/expenses/by-category', [ReportController::class, 'expensesByCategory']);
    Route::get('reports/inventory/current-stock', [ReportController::class, 'currentStock']);
    Route::get('reports/inventory/usage-by-procedure', [ReportController::class, 'usageByProcedure']);
    Route::get('reports/inventory/usage-by-client', [ReportController::class, 'usageByClient']);
    Route::get('reports/clients/outstanding-balances', [ReportController::class, 'outstandingBalances']);
    Route::get('reports/clients/follow-ups', [ReportController::class, 'followUps']);
});

Route::fallback(fn () => response()->json(['detail' => 'API endpoint not found.'], 404));
