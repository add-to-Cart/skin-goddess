<?php

namespace App\Http\Controllers;

use App\Models\Procedure;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Service;
use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['search' => 'nullable|string|max:100', 'paginated' => 'sometimes|boolean', 'cursor' => 'nullable|string|max:2000']);
        $query = Sale::with('items');
        if ($search = trim($request->string('search')->toString())) {
            $query->where(function ($matches) use ($search): void {
                $matches->whereHas('client', fn ($client) => $client->matchingSearch($search));
                if (preg_match('/^#?(\d+)$/', $search, $id)) {
                    $matches->orWhere('id', $id[1]);
                }
            });
        }
        if ($request->boolean('include_client')) {
            $query->with('client:id,first_name,last_name,is_active');
        }
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

        if ($request->boolean('paginated')) {
            $query->select('sales.*')->selectRaw('sale_date as cursor_date')->orderByDesc('cursor_date');
        } else {
            $query->orderByDesc('sale_date');
        }
        $query->orderByDesc('id');

        return response()->json($request->boolean('paginated') ? $query->cursorPaginate(25) : $query->get());
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

    public function sessions(int $id): JsonResponse
    {
        return DB::transaction(function () use ($id): JsonResponse {
            $sale = Sale::sharedLock()->findOrFail($id);
            abort_unless($sale->package_service_id !== null, 422, 'This sale is not a treatment package.');
            $procedures = $sale->package_procedures()->with(['supplies_used.inventory_item', 'completed_by', 'reversed_by'])->orderBy('session_number')->get();
            $completed = $procedures->whereNull('reversed_at')->count();

            return response()->json([
                'sale_id' => $sale->id,
                'version' => $sale->version,
                'included_sessions' => $sale->included_sessions,
                'completed_sessions' => $completed,
                'remaining_sessions' => $sale->included_sessions - $completed,
                'reversed_sessions' => $procedures->count() - $completed,
                'is_canceled' => $sale->canceled_at !== null,
                'canceled_at' => $sale->canceled_at,
                'canceled_by_user_id' => $sale->canceled_by_user_id,
                'canceled_by' => $sale->canceled_by,
                'cancellation_reason' => $sale->cancellation_reason,
                'procedures' => $procedures,
            ]);
        });
    }

    public function cancelPackage(Request $request, int $id): JsonResponse
    {
        $reason = $request->input('reason');
        $request->merge(['reason' => is_string($reason) ? trim($reason) : $reason]);
        $data = $request->validate(['reason' => 'required|string|max:2000', 'expected_version' => 'required|integer|min:0']);
        $sale = DB::transaction(function () use ($id, $request, $data) {
            $sale = Sale::lockForUpdate()->findOrFail($id);
            abort_unless($sale->package_service_id !== null, 422, 'This sale is not a treatment package.');
            abort_if($sale->canceled_at !== null, 409, 'This package was already canceled.');
            abort_unless($sale->version === (int) $data['expected_version'], 409, 'This package or its payments changed. Reload and review the cancellation.');
            $sale->forceFill([
                'canceled_at' => now(),
                'canceled_by_user_id' => $request->user()->id,
                'cancellation_reason' => $data['reason'],
                'version' => $sale->version + 1,
            ])->save();

            return $sale->refresh()->load(['items', 'canceled_by']);
        }, 3);

        return response()->json($sale);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'client_id' => 'required|integer|exists:clients,id',
            'sale_date' => 'required|date_format:Y-m-d',
            'notes' => 'nullable|string',
            'package_service_id' => 'nullable|required_with:included_sessions,package_purchase_key|integer|exists:services,id',
            'included_sessions' => 'nullable|required_with:package_service_id,package_purchase_key|integer|min:1|max:2147483647',
            'package_purchase_key' => 'nullable|required_with:package_service_id,included_sessions|string|min:16|max:64|regex:/^[a-z0-9_-]+$/',
            'package_purchase_fingerprint' => 'prohibited',
            'canceled_at' => 'prohibited',
            'canceled_by_user_id' => 'prohibited',
            'cancellation_reason' => 'prohibited',
            'items' => 'required|array|min:1',
            'items.*.procedure_id' => 'nullable|integer|exists:procedures,id',
            'items.*.description' => 'required|string|max:300',
            'items.*.quantity' => 'sometimes|numeric|gt:0|max:9999999.999|decimal:0,3',
            'items.*.unit_price' => 'required|numeric|min:0|max:99999999.99|decimal:0,2',
        ]);
        $data['items'] = array_values($data['items']);
        $isPackage = isset($data['package_service_id']);
        $fingerprint = null;
        if ($isPackage) {
            abort_unless(count($data['items']) === 1, 422, 'A package sale must contain exactly one line.');
            $line = $data['items'][0];
            abort_unless(BigDecimal::of((string) ($line['quantity'] ?? 1))->isEqualTo(1), 422, 'A package line must have quantity one.');
            abort_if(isset($line['procedure_id']), 422, 'A package purchase cannot bill an existing procedure.');
            $fingerprint = $this->purchaseFingerprint($data);
        }
        $created = true;
        try {
            $sale = DB::transaction(function () use ($data, $isPackage, $fingerprint, &$created) {
                if ($isPackage) {
                    $service = Service::whereKey($data['package_service_id'])->lockForUpdate()->firstOrFail();
                    $existing = Sale::where('package_purchase_key', $data['package_purchase_key'])->lockForUpdate()->first();
                    if ($existing) {
                        abort_unless($existing->package_purchase_fingerprint === $fingerprint, 409, 'This package request key was already used for a different purchase.');
                        $created = false;

                        return $existing->load('items');
                    }
                    abort_unless($service->is_active, 422, 'Inactive treatments cannot be sold in a new package.');
                }
                $sale = Sale::create(Arr::except($data, 'items') + ['total_amount' => '0.00', 'payment_status' => 'unpaid']);
                if ($isPackage) {
                    $sale->forceFill(['package_purchase_fingerprint' => $fingerprint])->save();
                }
                $total = BigDecimal::zero();
                foreach ($data['items'] as $line) {
                    $line = Arr::only($line, ['procedure_id', 'description', 'quantity', 'unit_price']);
                    $line['quantity'] = $line['quantity'] ?? 1;
                    if (isset($line['procedure_id'])) {
                        $procedure = Procedure::where('client_id', $data['client_id'])->whereKey($line['procedure_id'])->first();
                        abort_unless($procedure !== null, 422, 'Procedure does not belong to this client.');
                        abort_if($procedure->package_sale_id !== null, 422, 'An included package session cannot be billed again.');
                    }
                    $rawLineTotal = BigDecimal::of((string) $line['quantity'])->multipliedBy((string) $line['unit_price']);
                    $lineTotal = $rawLineTotal->toScale(2, RoundingMode::HalfUp);
                    $total = $total->plus($rawLineTotal);
                    abort_if($total->isGreaterThan('99999999.99'), 422, 'Sale total exceeds its supported maximum.');
                    SaleItem::create($line + ['sale_id' => $sale->id, 'line_total' => (string) $lineTotal]);
                }
                $sale->update(['total_amount' => (string) $total->toScale(2, RoundingMode::HalfUp)]);

                return $sale->refresh()->load('items');
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            if (! $isPackage) {
                throw $exception;
            }
            $sale = Sale::where('package_purchase_key', $data['package_purchase_key'])->first();
            if (! $sale) {
                throw $exception;
            }
            abort_unless($sale->package_purchase_fingerprint === $fingerprint, 409, 'This package request key was already used for a different purchase.');
            $sale->load('items');
            $created = false;
        }

        return response()->json($sale, $created ? 201 : 200);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $request->merge(['reason' => trim((string) $request->input('reason'))]);
        $data = $request->validate([
            'expected_version' => 'required|integer|min:0',
            'reason' => 'required|string|max:2000',
            'client_id' => 'prohibited',
            'package_service_id' => 'prohibited',
            'included_sessions' => 'prohibited',
            'package_purchase_key' => 'prohibited',
            'package_purchase_fingerprint' => 'prohibited',
            'canceled_at' => 'prohibited',
            'canceled_by_user_id' => 'prohibited',
            'cancellation_reason' => 'prohibited',
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
            $data['items'] = array_values($data['items']);
            $before = $sale->toArray();
            $existingItems = $sale->items->keyBy('id');
            if ($sale->package_service_id !== null) {
                $line = $data['items'][0];
                abort_unless(count($data['items']) === 1 && $sale->items->count() === 1
                    && (int) ($line['id'] ?? 0) === $sale->items->first()->id
                    && BigDecimal::of((string) $line['quantity'])->isEqualTo(1), 422, 'A package correction must retain its original single line with quantity one.');
            }
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

    /** @param array{client_id: int|string, package_service_id: int|string, included_sessions: int|string, sale_date: string, notes?: string|null, items: array<int, array{description: string, unit_price: int|float|string, quantity?: int|float|string, procedure_id?: int|null}>} $data */
    private function purchaseFingerprint(array $data): string
    {
        return hash('sha256', json_encode([
            'client_id' => (int) $data['client_id'],
            'package_service_id' => (int) $data['package_service_id'],
            'included_sessions' => (int) $data['included_sessions'],
            'sale_date' => $data['sale_date'],
            'notes' => $data['notes'] ?? null,
            'description' => $data['items'][0]['description'],
            'unit_price' => (string) BigDecimal::of((string) $data['items'][0]['unit_price'])->toScale(2),
        ], JSON_THROW_ON_ERROR));
    }
}
