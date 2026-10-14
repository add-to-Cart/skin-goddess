<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Expense;
use App\Models\FollowUp;
use App\Models\Payment;
use App\Models\Procedure;
use App\Models\Sale;
use Brick\Math\BigDecimal;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $today = today(config('clinic.timezone'))->toDateString();
        $outstanding = Sale::whereIn('payment_status', ['unpaid', 'partial']);
        $paid = (string) Payment::where('status', 'recorded')->whereIn('sale_id', (clone $outstanding)->select('id'))->sum('amount');
        $balance = BigDecimal::of((string) $outstanding->sum('total_amount'))->minus($paid);
        $upcoming = FollowUp::with('client')->whereIn('status', ['upcoming', 'due'])->whereBetween('follow_up_date', [$today, today(config('clinic.timezone'))->addDays(7)->toDateString()])->orderBy('follow_up_date')->limit(10)->get()->map(fn ($followUp) => ['follow_up_id' => $followUp->id, 'client_id' => $followUp->client_id, 'client_name' => $followUp->client->first_name.' '.$followUp->client->last_name, 'follow_up_date' => $followUp->follow_up_date->toDateString(), 'procedure_name' => null, 'status' => $followUp->status]);

        return response()->json(['todays_sales_total' => (string) Sale::whereDate('sale_date', $today)->sum('total_amount'), 'todays_sales_count' => Sale::whereDate('sale_date', $today)->count(), 'clients_served_today' => Procedure::whereDate('procedure_date', $today)->distinct()->count('client_id'), 'new_clients_today' => Client::whereDate('created_at', $today)->count(), 'outstanding_payments_total' => $balance->isNegative() ? '0.00' : (string) $balance, 'outstanding_payments_count' => $outstanding->count(), 'upcoming_follow_ups' => $upcoming, 'overdue_follow_ups_count' => FollowUp::whereIn('status', ['upcoming', 'due'])->whereDate('follow_up_date', '<', $today)->count(), 'todays_expenses_total' => (string) Expense::whereDate('expense_date', $today)->sum('amount')]);
    }
}
