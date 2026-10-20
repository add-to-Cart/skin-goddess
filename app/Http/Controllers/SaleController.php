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
use Illuminate\Support\Carbon;
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
        $request->merge(['reason' => trim((string) $request->input('reason'))]);
        $data = $request->validate([
            'expected_version' => 'required|integer|min:0',
            'reason' => 'required|string|max:2000',
            'client_id' => 'prohibited',
            'sale_date' => 'required|date_format:Y-m-d',
            'notes' => 'present|nullable|string',
            'items' => 'required|array|min:1',
            'items.*.id' => 'nullable|integer|distinct|min:1',
            'items.*.procedure_id' => 'prohibited',
            'items.*.description' => 'required|string|max:300',
            'items.*.quantity' => 'required|numeric|gt:0|max:9999999.999|decimal:0,3',
            'items.*.unit_price' => 'required|numeric|min:0|max:99999999.99|decimal:0,2',
        ]);
        $sale = DB::transaction(function () use ($id, $data, $request) {
            $sale = Sale::lockForUpdate()->findOrFail($id);
            abort_unless($sale->version === (int) $data['expected_version'], 409, 'This sale or its payments changed. Reload the sale and review your correction again.');
            $sale->load('items');
            $before = $sale->toArray();
            $existingItems = $sale->items->keyBy('id');
            $total = BigDecimal::zero();
            $lines = [];
            foreach ($data['items'] as $line) {
                $line = Arr::only($line, ['id', 'description', 'quantity', 'unit_price']);
                if (isset($line['id'])) {
                    abort_unless($existingItems->has($line['id']), 422, 'A line item does not belong to this sale.');
                }
                $rawLineTotal = BigDecimal::of((string) $line['quantity'])->multipliedBy((string) $line['unit_price']);
                $total = $total->plus($rawLineTotal);
                abort_if($total->isGreaterThan('99999999.99'), 422, 'Sale total exceeds its supported maximum.');
                $line['line_total'] = (string) $rawLineTotal->toScale(2, RoundingMode::HalfUp);
                $lines[] = $line;
            }
            $total = $total->toScale(2, RoundingMode::HalfUp);
            $paid = BigDecimal::of((string) $sale->payments()->where('status', 'recorded')->sum('amount'));
            abort_if($total->isLessThan($paid), 409, 'The corrected total cannot be below recorded payments. Refunds are not supported yet.');

            $retainedIds = array_filter(array_column($lines, 'id'));
            $sale->items()->whereNotIn('id', $retainedIds)->delete();
            foreach ($lines as $line) {
                if (isset($line['id'])) {
                    $existingItems[$line['id']]->update(Arr::except($line, 'id'));
                } else {
                    $sale->items()->create(Arr::except($line, 'id'));
                }
            }
            $sale->forceFill([
                'sale_date' => $data['sale_date'],
                'notes' => $data['notes'],
                'total_amount' => (string) $total,
                'payment_status' => $paid->isLessThanOrEqualTo(0) ? 'unpaid' : ($paid->isGreaterThanOrEqualTo($total) ? 'paid' : 'partial'),
                'version' => $sale->version + 1,
            ])->save();
            $sale->refresh()->load('items');
            DB::table('sale_corrections')->insert([
                'sale_id' => $sale->id,
                'revision' => ((int) DB::table('sale_corrections')->where('sale_id', $sale->id)->max('revision')) + 1,
                'corrected_by_user_id' => $request->user()->id,
                'reason' => $data['reason'],
                'before_snapshot' => json_encode($before, JSON_THROW_ON_ERROR),
                'after_snapshot' => json_encode($sale->toArray(), JSON_THROW_ON_ERROR),
                'created_at' => now(),
            ]);

            return $sale;
        }, 3);

        return response()->json($sale);
    }

    public function corrections(int $id): JsonResponse
    {
        Sale::findOrFail($id);
        $corrections = DB::table('sale_corrections')
            ->join('users', 'users.id', '=', 'sale_corrections.corrected_by_user_id')
            ->where('sale_id', $id)
            ->select('sale_corrections.*', 'users.username as corrected_by_username')
            ->orderByDesc('revision')->get()
            ->map(function (object $correction): object {
                $correction->before_snapshot = json_decode($correction->before_snapshot, true, flags: JSON_THROW_ON_ERROR);
                $correction->after_snapshot = json_decode($correction->after_snapshot, true, flags: JSON_THROW_ON_ERROR);
                $correction->created_at = Carbon::parse($correction->created_at, 'UTC')->toISOString();

                return $correction;
            });

        return response()->json($corrections);
    }
}
