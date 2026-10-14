<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\InventoryItem;
use App\Models\Payment;
use App\Models\Sale;
use Brick\Math\BigDecimal;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function salesDaily(Request $request): JsonResponse
    {
        $date = $request->validate(['report_date' => 'sometimes|date_format:Y-m-d'])['report_date'] ?? today(config('clinic.timezone'))->toDateString();
        $sales = Sale::whereDate('sale_date', $date);

        return response()->json(['date' => $date, 'total_sales' => (string) $sales->sum('total_amount'), 'transaction_count' => $sales->count()]);
    }

    public function salesRange(Request $request): JsonResponse
    {
        $data = $request->validate(['date_from' => 'required|date_format:Y-m-d', 'date_to' => 'required|date_format:Y-m-d|after_or_equal:date_from']);
        $sales = Sale::whereBetween('sale_date', [$data['date_from'], $data['date_to']]);
        $total = (string) $sales->sum('total_amount');
        $paid = (string) Payment::where('status', 'recorded')->whereIn('sale_id', (clone $sales)->select('id'))->sum('amount');

        return response()->json($data + ['total_sales' => $total, 'transaction_count' => $sales->count(), 'total_collected' => $paid, 'total_outstanding' => (string) BigDecimal::of($total)->minus($paid)]);
    }

    public function expensesDaily(Request $request): JsonResponse
    {
        $date = $request->validate(['report_date' => 'sometimes|date_format:Y-m-d'])['report_date'] ?? today(config('clinic.timezone'))->toDateString();

        return response()->json(['date' => $date, 'total_expenses' => (string) Expense::whereDate('expense_date', $date)->sum('amount')]);
    }

    public function expensesRange(Request $request): JsonResponse
    {
        $data = $request->validate(['date_from' => 'required|date_format:Y-m-d', 'date_to' => 'required|date_format:Y-m-d|after_or_equal:date_from']);

        return response()->json($data + ['total_expenses' => (string) Expense::whereBetween('expense_date', [$data['date_from'], $data['date_to']])->sum('amount')]);
    }

    public function expensesByCategory(Request $request): JsonResponse
    {
        $query = DB::table('expenses')->selectRaw("COALESCE(category, 'uncategorized') AS category, SUM(amount) AS total, COUNT(*) AS count")->groupBy('category');
        $this->dates($request, $query, 'expense_date');

        return response()->json($query->get());
    }

    public function currentStock(): JsonResponse
    {
        return response()->json(InventoryItem::where('is_active', true)->orderBy('name')->get()->map(fn ($item) => ['id' => $item->id, 'name' => $item->name, 'category' => $item->category, 'unit' => $item->unit, 'current_quantity' => $item->current_quantity, 'minimum_stock_level' => $item->minimum_stock_level, 'acquisition_cost' => $item->acquisition_cost, 'is_low_stock' => $item->minimum_stock_level !== null && BigDecimal::of($item->current_quantity)->isLessThanOrEqualTo($item->minimum_stock_level)]));
    }

    public function usageByProcedure(Request $request): JsonResponse
    {
        $query = $this->usageQuery()->selectRaw('inventory_items.id AS item_id, inventory_items.name AS item_name, inventory_items.unit, SUM(procedure_supplies.quantity_used) AS total_quantity_used, COALESCE(SUM(procedure_supplies.quantity_used * procedure_supplies.unit_cost_at_use), 0) AS total_cost')->groupBy('inventory_items.id', 'inventory_items.name', 'inventory_items.unit');
        $this->dates($request, $query, 'procedures.procedure_date');

        return response()->json($query->get());
    }

    public function usageByClient(Request $request): JsonResponse
    {
        $query = $this->usageQuery()->selectRaw('procedures.client_id, inventory_items.id AS item_id, inventory_items.name AS item_name, inventory_items.unit, SUM(procedure_supplies.quantity_used) AS total_quantity_used, COALESCE(SUM(procedure_supplies.quantity_used * procedure_supplies.unit_cost_at_use), 0) AS total_cost')->groupBy('procedures.client_id', 'inventory_items.id', 'inventory_items.name', 'inventory_items.unit');
        if ($client = $request->input('client_id')) {
            $query->where('procedures.client_id', $client);
        }

        return response()->json($query->get());
    }

    public function outstandingBalances(): JsonResponse
    {
        $paid = DB::table('payments')->where('status', 'recorded')->selectRaw('sale_id, SUM(amount) AS paid')->groupBy('sale_id');
        $rows = DB::table('clients')->join('sales', 'sales.client_id', '=', 'clients.id')->leftJoinSub($paid, 'paid', 'paid.sale_id', '=', 'sales.id')->whereIn('sales.payment_status', ['unpaid', 'partial'])->selectRaw('clients.id AS client_id, clients.first_name, clients.last_name, SUM(sales.total_amount) AS total_billed, COALESCE(SUM(paid.paid), 0) AS total_paid')->groupBy('clients.id', 'clients.first_name', 'clients.last_name')->orderBy('clients.last_name')->orderBy('clients.first_name')->get();

        return response()->json($rows->map(fn ($row) => ['client_id' => $row->client_id, 'client_name' => $row->first_name.' '.$row->last_name, 'total_billed' => (string) $row->total_billed, 'total_paid' => (string) $row->total_paid, 'remaining_balance' => (string) BigDecimal::of((string) $row->total_billed)->minus((string) $row->total_paid)]));
    }

    public function followUps(Request $request): JsonResponse
    {
        $query = DB::table('follow_ups')->join('clients', 'clients.id', '=', 'follow_ups.client_id')->select('follow_ups.id', 'follow_ups.follow_up_date', 'follow_ups.status', 'follow_ups.client_id', 'clients.first_name', 'clients.last_name');
        if ($status = $request->input('status')) {
            $query->where('follow_ups.status', $status);
        }

        return response()->json($query->orderBy('follow_up_date')->get()->map(fn ($row) => ['follow_up_id' => $row->id, 'follow_up_date' => $row->follow_up_date, 'status' => $row->status, 'client_id' => $row->client_id, 'client_name' => $row->first_name.' '.$row->last_name]));
    }

    private function usageQuery(): Builder
    {
        return DB::table('inventory_items')->join('procedure_supplies', 'procedure_supplies.inventory_item_id', '=', 'inventory_items.id')->join('procedures', 'procedures.id', '=', 'procedure_supplies.procedure_id');
    }

    private function dates(Request $request, Builder $query, string $column): void
    {
        $data = $request->validate(['date_from' => 'sometimes|date_format:Y-m-d', 'date_to' => 'sometimes|date_format:Y-m-d']);
        if (isset($data['date_from'])) {
            $query->whereDate($column, '>=', $data['date_from']);
        }
        if (isset($data['date_to'])) {
            $query->whereDate($column, '<=', $data['date_to']);
        }
    }
}
