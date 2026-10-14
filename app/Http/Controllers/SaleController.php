<?php

namespace App\Http\Controllers;

use App\Models\Procedure;
use App\Models\Sale;
use App\Models\SaleItem;
use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Sale::with('items');
        foreach (['client_id', 'payment_status'] as $field) {
            if ($request->filled($field)) {
                $query->where($field, $request->input($field));
            }
        }
        if ($from = $request->input('date_from')) {
            $query->whereDate('sale_date', '>=', $from);
        }
        if ($to = $request->input('date_to')) {
            $query->whereDate('sale_date', '<=', $to);
        }

        return response()->json($query->orderByDesc('sale_date')->orderByDesc('id')->get());
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(Sale::with('items')->findOrFail($id));
    }

    public function summary(int $id): JsonResponse
    {
        $sale = Sale::findOrFail($id);
        $paid = (string) $sale->payments()->where('status', 'recorded')->sum('amount');

        return response()->json($sale->toArray() + ['total_paid' => $paid, 'remaining_balance' => (string) BigDecimal::of($sale->total_amount)->minus($paid)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['client_id' => 'required|integer|exists:clients,id', 'sale_date' => 'required|date_format:Y-m-d', 'notes' => 'nullable|string', 'items' => 'required|array|min:1', 'items.*.procedure_id' => 'nullable|integer|exists:procedures,id', 'items.*.description' => 'required|string|max:300', 'items.*.quantity' => 'sometimes|numeric|gt:0|max:9999999.999|decimal:0,3', 'items.*.unit_price' => 'required|numeric|min:0|max:99999999.99|decimal:0,2']);
        $sale = DB::transaction(function () use ($data) {
            $sale = Sale::create(Arr::except($data, 'items') + ['total_amount' => '0.00', 'payment_status' => 'unpaid']);
            $total = BigDecimal::zero();
            foreach ($data['items'] as $line) {
                $line = Arr::only($line, ['procedure_id', 'description', 'quantity', 'unit_price']);
                $line['quantity'] = $line['quantity'] ?? 1;
                if (isset($line['procedure_id'])) {
                    abort_unless(Procedure::where('client_id', $data['client_id'])->whereKey($line['procedure_id'])->exists(), 422, 'Procedure does not belong to this client.');
                }
                $rawLineTotal = BigDecimal::of((string) $line['quantity'])->multipliedBy((string) $line['unit_price']);
                $lineTotal = $rawLineTotal->toScale(2, RoundingMode::HalfUp);
                $total = $total->plus($rawLineTotal);
                abort_if($total->isGreaterThan('99999999.99'), 422, 'Sale total exceeds its supported maximum.');
                SaleItem::create($line + ['sale_id' => $sale->id, 'line_total' => (string) $lineTotal]);
            }
            $sale->update(['total_amount' => (string) $total->toScale(2, RoundingMode::HalfUp)]);

            return $sale->refresh()->load('items');
        });

        return response()->json($sale, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['sale_date' => 'sometimes|required|date_format:Y-m-d', 'notes' => 'nullable|string']);
        $sale = DB::transaction(function () use ($id, $data) {
            $sale = Sale::lockForUpdate()->findOrFail($id);
            $sale->update($data);

            return $sale->refresh()->load('items');
        });

        return response()->json($sale);
    }
}
