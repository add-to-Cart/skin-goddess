<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\Procedure;
use App\Models\ProcedureSupply;
use App\Models\Service;
use Brick\Math\BigDecimal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class ProcedureController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Procedure::with('supplies_used');
        if ($client = $request->input('client_id')) {
            $query->where('client_id', $client);
        }
        if ($from = $request->input('date_from')) {
            $query->whereDate('procedure_date', '>=', $from);
        }
        if ($to = $request->input('date_to')) {
            $query->whereDate('procedure_date', '<=', $to);
        }

        return response()->json($query->orderByDesc('procedure_date')->orderByDesc('id')->get());
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(Procedure::with('supplies_used')->findOrFail($id));
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
            Procedure::lockForUpdate()->findOrFail($id);

            return $this->recordSupply($id, $data)->refresh();
        });

        return response()->json($supply, 201);
    }

    public function removeSupply(int $id, int $supplyId): Response
    {
        DB::transaction(function () use ($id, $supplyId) {
            Procedure::lockForUpdate()->findOrFail($id);
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

        $rules = ['service_id' => "$required|integer|exists:services,id", 'procedure_date' => "$required|date_format:Y-m-d", 'session_number' => 'nullable|integer|min:1', 'price' => 'nullable|numeric|min:0|max:99999999.99|decimal:0,2', 'next_follow_up' => 'nullable|date_format:Y-m-d', 'notes' => 'nullable|string'];
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
}
