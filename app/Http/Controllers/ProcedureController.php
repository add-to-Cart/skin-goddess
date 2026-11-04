<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\Procedure;
use App\Models\ProcedureSupply;
use App\Models\Sale;
use App\Models\Service;
use Brick\Math\BigDecimal;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class ProcedureController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['search' => 'nullable|string|max:100', 'paginated' => 'sometimes|boolean', 'cursor' => 'nullable|string|max:2000']);
        $query = Procedure::with(['supplies_used', 'package_sale:id,canceled_at']);
        if ($search = trim($request->string('search')->toString())) {
            $query->where(function ($matches) use ($search): void {
                $matches->whereHas('client', fn ($client) => $client->matchingSearch($search));
                if (preg_match('/^#?(\d+)$/', $search, $id)) {
                    $matches->orWhere('id', $id[1]);
                }
            });
        }
        if ($request->boolean('include_client')) {
            $query->with(['client:id,first_name,last_name,is_active', 'service:id,name']);
        }
        if ($client = $request->input('client_id')) {
            $query->where('client_id', $client);
        }
        if ($from = $request->input('date_from')) {
            $query->whereDate('procedure_date', '>=', $from);
        }
        if ($to = $request->input('date_to')) {
            $query->whereDate('procedure_date', '<=', $to);
        }

        if ($request->boolean('paginated')) {
            $query->select('procedures.*')->selectRaw('procedure_date as cursor_date')->orderByDesc('cursor_date');
        } else {
            $query->orderByDesc('procedure_date');
        }
        $query->orderByDesc('id');

        return response()->json($request->boolean('paginated') ? $query->cursorPaginate(25) : $query->get());
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(Procedure::with('supplies_used')->findOrFail($id));
    }

    public function completePackage(Request $request, int $id): JsonResponse
    {
        $rules = $this->rules(false);
        $rules['session_number'] = 'prohibited';
        $rules['price'] = 'prohibited';
        $rules['completion_key'] = 'required|string|min:16|max:64|regex:/^[a-z0-9_-]+$/';
        $rules['supplies'] = 'sometimes|array';
        foreach ($this->supplyRules() as $key => $rule) {
            $rules['supplies.*.'.$key] = $rule;
        }
        $rules['supplies.*.inventory_item_id'] .= '|distinct';
        $data = $request->validate($rules);
        $supplies = array_values($data['supplies'] ?? []);
        usort($supplies, fn (array $first, array $second): int => $first['inventory_item_id'] <=> $second['inventory_item_id']);
        $fingerprint = $this->completionFingerprint($id, $data, $supplies);
        $created = true;
        try {
            $procedure = DB::transaction(function () use ($id, $data, $supplies, $fingerprint, $request, &$created) {
                $service = Service::whereKey($data['service_id'])->lockForUpdate()->firstOrFail();
                $sale = Sale::lockForUpdate()->findOrFail($id);
                abort_unless($sale->package_service_id !== null, 422, 'This sale is not a treatment package.');
                abort_unless($sale->client_id === (int) $data['client_id'] && $sale->package_service_id === (int) $data['service_id'], 422, 'The client and treatment must match the purchased package.');
                $existing = Procedure::where('completion_key', $data['completion_key'])->lockForUpdate()->first();
                if ($existing) {
                    abort_unless($existing->completion_fingerprint === $fingerprint, 409, 'This completion request key was already used for a different session.');
                    $created = false;

                    return $existing->load('supplies_used');
                }
                abort_if($sale->canceled_at !== null, 409, 'This package is canceled and cannot receive additional sessions.');
                abort_unless($service->is_active, 400, 'Inactive treatments and services cannot be used for new treatment records.');
                abort_if($sale->package_procedures()->whereNull('reversed_at')->count() >= $sale->included_sessions, 409, 'This package has no remaining sessions.');
                $sessionNumber = ((int) $sale->package_procedures()->max('session_number')) + 1;
                abort_if($sessionNumber > 2147483647, 409, 'The supported session number limit has been reached.');
                $procedure = new Procedure(Arr::only($data, ['client_id', 'service_id', 'procedure_date', 'next_follow_up', 'notes']));
                $procedure->forceFill([
                    'package_sale_id' => $sale->id,
                    'session_number' => $sessionNumber,
                    'price' => null,
                    'completion_key' => $data['completion_key'],
                    'completion_fingerprint' => $fingerprint,
                    'completed_by_user_id' => $request->user()->id,
                ])->save();
                foreach ($supplies as $supply) {
                    $this->recordSupply($procedure->id, $supply);
                }
                $sale->forceFill(['version' => $sale->version + 1])->save();

                return $procedure->refresh()->load('supplies_used');
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            $procedure = Procedure::where('completion_key', $data['completion_key'])->first();
            if (! $procedure) {
                throw $exception;
            }
            abort_unless($procedure->completion_fingerprint === $fingerprint, 409, 'This completion request key was already used for a different session.');
            $procedure->load('supplies_used');
            $created = false;
        }

        return response()->json($procedure, $created ? 201 : 200);
    }

    public function reversePackage(Request $request, int $id, int $procedureId): JsonResponse
    {
        $reason = $request->input('reason');
        $request->merge(['reason' => is_string($reason) ? trim($reason) : $reason]);
        $data = $request->validate(['reason' => 'required|string|max:2000', 'expected_version' => 'required|integer|min:0']);
        $procedure = DB::transaction(function () use ($id, $procedureId, $request, $data) {
            $sale = Sale::lockForUpdate()->findOrFail($id);
            abort_unless($sale->package_service_id !== null, 422, 'This sale is not a treatment package.');
            $procedure = $sale->package_procedures()->whereKey($procedureId)->lockForUpdate()->firstOrFail();
            abort_if($procedure->reversed_at !== null, 409, 'This package session was already reversed.');
            abort_unless($sale->version === (int) $data['expected_version'], 409, 'This package or its payments changed. Reload and review the session reversal.');
            $procedure->forceFill([
                'reversed_at' => now(),
                'reversed_by_user_id' => $request->user()->id,
                'reversal_reason' => $data['reason'],
            ])->save();
            $sale->forceFill(['version' => $sale->version + 1])->save();

            return $procedure->refresh()->load(['supplies_used', 'completed_by', 'reversed_by']);
        }, 3);

        return response()->json($procedure);
    }

    public function store(Request $request): JsonResponse
    {
        $rules = $this->rules(false) + ['supplies' => 'sometimes|array'];
        foreach ($this->supplyRules() as $key => $rule) {
            $rules['supplies.*.'.$key] = $rule;
        }
        $data = $request->validate($rules);
        $procedure = DB::transaction(function () use ($data) {
            $this->activeService($data['service_id']);
            $supplies = $data['supplies'] ?? [];
            unset($data['supplies']);
            $procedure = Procedure::create($data);
            usort($supplies, fn ($a, $b) => $a['inventory_item_id'] <=> $b['inventory_item_id']);
            foreach ($supplies as $supply) {
                $this->recordSupply($procedure->id, $supply);
            }

            return $procedure->refresh()->load('supplies_used');
        }, 3);

        return response()->json($procedure, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate($this->rules(true));
        $procedure = DB::transaction(function () use ($data, $id) {
            $procedure = Procedure::lockForUpdate()->findOrFail($id);
            abort_if($procedure->package_sale_id !== null, 409, 'Completed package sessions cannot be edited. An audited administrator correction is required.');
            if (isset($data['service_id']) && $data['service_id'] !== $procedure->service_id) {
                $this->activeService($data['service_id']);
            }
            $procedure->update($data);

            return $procedure->refresh()->load('supplies_used');
        });

        return response()->json($procedure);
    }

    public function addSupply(Request $request, int $id): JsonResponse
    {
        $data = $request->validate($this->supplyRules());
        $supply = DB::transaction(function () use ($id, $data) {
            $procedure = Procedure::lockForUpdate()->findOrFail($id);
            abort_if($procedure->package_sale_id !== null, 409, 'Package supplies must be recorded with session completion.');

            return $this->recordSupply($id, $data)->refresh();
        });

        return response()->json($supply, 201);
    }

    public function removeSupply(int $id, int $supplyId): Response
    {
        DB::transaction(function () use ($id, $supplyId) {
            $procedure = Procedure::lockForUpdate()->findOrFail($id);
            abort_if($procedure->package_sale_id !== null, 409, 'Package supply history cannot be removed or automatically restored.');
            $supply = ProcedureSupply::where('procedure_id', $id)->lockForUpdate()->findOrFail($supplyId);
            $item = InventoryItem::lockForUpdate()->findOrFail($supply->inventory_item_id);
            $after = BigDecimal::of($item->current_quantity)->plus($supply->quantity_used);
            abort_if($after->isGreaterThan('9999999.999'), 422, 'Inventory quantity exceeds its supported maximum.');
            $item->update(['current_quantity' => (string) $after]);
            InventoryTransaction::create(['inventory_item_id' => $item->id, 'transaction_type' => 'adjustment_add', 'quantity_change' => $supply->quantity_used, 'quantity_after' => (string) $after, 'reference_type' => 'procedure_supply_removal', 'reference_id' => $supply->id, 'notes' => "Reversed: supply removed from procedure {$id}"]);
            $supply->delete();
        });

        return response()->noContent();
    }

    /** @param array{inventory_item_id: int, quantity_used: int|float|string, unit_cost_at_use?: int|float|string|null, notes?: string|null} $data */
    private function recordSupply(int $id, array $data): ProcedureSupply
    {
        $item = InventoryItem::lockForUpdate()->findOrFail($data['inventory_item_id']);
        $after = BigDecimal::of($item->current_quantity)->minus((string) $data['quantity_used']);
        abort_if($after->isNegative(), 409, 'Insufficient inventory quantity.');
        $data = Arr::only($data, ['inventory_item_id', 'quantity_used', 'unit_cost_at_use', 'notes']);
        $data['unit_cost_at_use'] = $data['unit_cost_at_use'] ?? $item->acquisition_cost;
        $supply = ProcedureSupply::create($data + ['procedure_id' => $id]);
        $item->update(['current_quantity' => (string) $after]);
        InventoryTransaction::create(['inventory_item_id' => $item->id, 'transaction_type' => 'stock_out', 'quantity_change' => $data['quantity_used'], 'quantity_after' => (string) $after, 'reference_type' => 'procedure_supply', 'reference_id' => $supply->id, 'notes' => "Used in procedure {$id}"]);

        return $supply;
    }

    private function activeService(int $id): void
    {
        $service = Service::lockForUpdate()->findOrFail($id);
        abort_unless($service->is_active, 400, 'Inactive treatments and services cannot be used for new treatment records.');
    }

    /** @return array<string, string> */
    private function rules(bool $updating): array
    {
        $required = $updating ? 'sometimes|required' : 'required';

        $rules = ['package_sale_id' => 'prohibited', 'completion_key' => 'prohibited', 'completion_fingerprint' => 'prohibited', 'completed_by_user_id' => 'prohibited', 'service_id' => "$required|integer|exists:services,id", 'procedure_date' => "$required|date_format:Y-m-d", 'session_number' => 'nullable|integer|min:1', 'price' => 'nullable|numeric|min:0|max:99999999.99|decimal:0,2', 'next_follow_up' => 'nullable|date_format:Y-m-d', 'notes' => 'nullable|string'];
        $rules += ['reversed_at' => 'prohibited', 'reversed_by_user_id' => 'prohibited', 'reversal_reason' => 'prohibited'];
        if (! $updating) {
            $rules['client_id'] = 'required|integer|exists:clients,id';
        }

        return $rules;
    }

    /** @return array<string, string> */
    private function supplyRules(): array
    {
        return ['inventory_item_id' => 'required|integer|exists:inventory_items,id', 'quantity_used' => 'required|numeric|gt:0|max:9999999.999|decimal:0,3', 'unit_cost_at_use' => 'nullable|numeric|min:0|max:99999999.99|decimal:0,2', 'notes' => 'nullable|string'];
    }

    /**
     * @param  array{client_id: int|string, service_id: int|string, procedure_date: string, notes?: string|null, next_follow_up?: string|null}  $data
     * @param  array<int, array{inventory_item_id: int|string, quantity_used: int|float|string, unit_cost_at_use?: int|float|string|null, notes?: string|null}>  $supplies
     */
    private function completionFingerprint(int $saleId, array $data, array $supplies): string
    {
        return hash('sha256', json_encode([
            'sale_id' => $saleId,
            'client_id' => (int) $data['client_id'],
            'service_id' => (int) $data['service_id'],
            'procedure_date' => $data['procedure_date'],
            'next_follow_up' => $data['next_follow_up'] ?? null,
            'notes' => $data['notes'] ?? null,
            'supplies' => array_map(fn (array $supply): array => [
                'inventory_item_id' => (int) $supply['inventory_item_id'],
                'quantity_used' => (string) BigDecimal::of((string) $supply['quantity_used'])->toScale(3),
                'unit_cost_at_use' => isset($supply['unit_cost_at_use']) ? (string) BigDecimal::of((string) $supply['unit_cost_at_use'])->toScale(2) : null,
                'notes' => $supply['notes'] ?? null,
            ], $supplies),
        ], JSON_THROW_ON_ERROR));
    }
}
