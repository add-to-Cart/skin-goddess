<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use App\Models\InventoryPurchase;
use App\Models\InventoryPurchaseItem;
use App\Models\InventoryTransaction;
use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = InventoryItem::query();
        if ($request->boolean('active_only', true)) {
            $query->where('is_active', true);
        }
        if ($search = $request->input('search')) {
            $query->whereLike('name', "%{$search}%");
        }
        if ($category = $request->input('category')) {
            $query->where('category', $category);
        }
        if ($request->boolean('low_stock_only')) {
            $query->whereNotNull('minimum_stock_level')->whereColumn('current_quantity', '<=', 'minimum_stock_level');
        }

        return response()->json($query->orderBy('name')->get()->map(fn ($item) => $this->itemResponse($item)));
    }

    public function show(int $id): JsonResponse
    {
        return response()->json($this->itemResponse(InventoryItem::findOrFail($id)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules(false));
        $item = DB::transaction(function () use ($data) {
            $item = InventoryItem::create($data)->refresh();
            if (BigDecimal::of($item->current_quantity)->isGreaterThan(0)) {
                InventoryTransaction::create(['inventory_item_id' => $item->id, 'transaction_type' => 'stock_in', 'quantity_change' => $item->current_quantity, 'quantity_after' => $item->current_quantity, 'reference_type' => 'opening_stock', 'notes' => 'Opening inventory quantity']);
            }

            return $item;
        });

        return response()->json($this->itemResponse($item), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate($this->rules(true));
        $item = DB::transaction(function () use ($id, $data) {
            $item = InventoryItem::lockForUpdate()->findOrFail($id);
            $item->update($data);

            return $item->refresh();
        });

        return response()->json($this->itemResponse($item));
    }

    public function adjust(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['inventory_item_id' => 'sometimes|integer|in:'.$id, 'direction' => 'required|in:add,subtract', 'quantity' => 'required|numeric|gt:0|max:9999999.999|decimal:0,3', 'notes' => 'nullable|string']);
        $item = DB::transaction(function () use ($id, $data) {
            $item = InventoryItem::lockForUpdate()->findOrFail($id);
            $quantity = BigDecimal::of($item->current_quantity);
            $after = $data['direction'] === 'add' ? $quantity->plus((string) $data['quantity']) : $quantity->minus((string) $data['quantity']);
            abort_if($after->isNegative(), 409, 'Insufficient inventory quantity.');
            abort_if($after->isGreaterThan('9999999.999'), 422, 'Inventory quantity exceeds its supported maximum.');
            $item->update(['current_quantity' => (string) $after]);
            InventoryTransaction::create(['inventory_item_id' => $id, 'transaction_type' => $data['direction'] === 'add' ? 'adjustment_add' : 'adjustment_sub', 'quantity_change' => $data['quantity'], 'quantity_after' => (string) $after, 'reference_type' => 'manual_adjustment', 'notes' => $data['notes'] ?? null]);

            return $item->refresh();
        });

        return response()->json($this->itemResponse($item));
    }

    public function history(int $id): JsonResponse
    {
        InventoryItem::findOrFail($id);

        return response()->json(InventoryTransaction::where('inventory_item_id', $id)->orderByDesc('created_at')->orderByDesc('id')->get());
    }

    public function transactions(Request $request): JsonResponse
    {
        $query = InventoryTransaction::query();
        if ($id = $request->input('item_id')) {
            $query->where('inventory_item_id', $id);
        }
        if ($type = $request->input('transaction_type')) {
            $query->where('transaction_type', $type);
        }
        if ($from = $request->input('date_from')) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->input('date_to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        return response()->json($query->orderByDesc('created_at')->orderByDesc('id')->get());
    }

    public function purchases(Request $request): JsonResponse
    {
        $query = InventoryPurchase::with('items');
        if ($from = $request->input('date_from')) {
            $query->whereDate('purchase_date', '>=', $from);
        }
        if ($to = $request->input('date_to')) {
            $query->whereDate('purchase_date', '<=', $to);
        }

        return response()->json($query->orderByDesc('purchase_date')->orderByDesc('id')->get());
    }

    public function purchase(int $id): JsonResponse
    {
        return response()->json(InventoryPurchase::with('items')->findOrFail($id));
    }

    public function storePurchase(Request $request): JsonResponse
    {
        $data = $request->validate(['purchase_date' => 'required|date_format:Y-m-d', 'supplier_name' => 'nullable|string|max:200', 'supplier_contact' => 'nullable|string|max:200', 'notes' => 'nullable|string', 'items' => 'required|array|min:1', 'items.*.inventory_item_id' => 'required|integer|exists:inventory_items,id', 'items.*.quantity' => 'required|numeric|gt:0|max:9999999.999|decimal:0,3', 'items.*.unit_cost' => 'required|numeric|min:0|max:99999999.99|decimal:0,2']);
        $purchase = DB::transaction(function () use ($data) {
            $items = InventoryItem::whereIn('id', array_column($data['items'], 'inventory_item_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $purchase = InventoryPurchase::create(Arr::except($data, 'items'));
            $total = BigDecimal::zero();
            foreach ($data['items'] as $line) {
                $line = Arr::only($line, ['inventory_item_id', 'quantity', 'unit_cost']);
                $item = $items[$line['inventory_item_id']];
                $rawLineTotal = BigDecimal::of((string) $line['quantity'])->multipliedBy((string) $line['unit_cost']);
                $lineTotal = $rawLineTotal->toScale(2, RoundingMode::HalfUp);
                $total = $total->plus($rawLineTotal);
                $after = BigDecimal::of($item->current_quantity)->plus((string) $line['quantity']);
                abort_if($after->isGreaterThan('9999999.999'), 422, 'Inventory quantity exceeds its supported maximum.');
                abort_if($total->isGreaterThan('99999999.99'), 422, 'Purchase total exceeds its supported maximum.');
                InventoryPurchaseItem::create($line + ['purchase_id' => $purchase->id, 'line_total' => (string) $lineTotal]);
                $item->update(['current_quantity' => (string) $after, 'acquisition_cost' => $line['unit_cost']]);
                InventoryTransaction::create(['inventory_item_id' => $item->id, 'transaction_type' => 'stock_in', 'quantity_change' => $line['quantity'], 'quantity_after' => (string) $after, 'reference_type' => 'inventory_purchase', 'reference_id' => $purchase->id, 'notes' => 'Purchase from '.($data['supplier_name'] ?? 'supplier')]);
            }
            $purchase->update(['total_cost' => (string) $total->toScale(2, RoundingMode::HalfUp)]);

            return $purchase->refresh()->load('items');
        }, 3);

        return response()->json($purchase, 201);
    }

    /** @return array<string, mixed> */
    private function itemResponse(InventoryItem $item): array
    {
        return $item->toArray() + ['is_low_stock' => $item->minimum_stock_level !== null && BigDecimal::of($item->current_quantity)->isLessThanOrEqualTo($item->minimum_stock_level)];
    }

    /** @return array<string, string> */
    private function rules(bool $updating): array
    {
        return ['name' => ($updating ? 'sometimes|required' : 'required').'|string|max:200', 'category' => 'nullable|string|max:50', 'unit' => 'nullable|string|max:50', 'current_quantity' => $updating ? 'prohibited' : 'sometimes|numeric|min:0|max:9999999.999|decimal:0,3', 'minimum_stock_level' => 'nullable|numeric|min:0|max:9999999.999|decimal:0,3', 'acquisition_cost' => 'nullable|numeric|min:0|max:99999999.99|decimal:0,2', 'selling_price' => 'nullable|numeric|min:0|max:99999999.99|decimal:0,2', 'description' => 'nullable|string', 'is_active' => $updating ? 'sometimes|boolean' : 'prohibited'];
    }
}
