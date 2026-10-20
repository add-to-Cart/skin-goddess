<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Sale;
use Brick\Math\BigDecimal;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Payment::query();
        if ($id = $request->input('sale_id')) {
            $query->where('sale_id', $id);
        }

        return response()->json($query->orderByDesc('payment_date')->orderByDesc('id')->get());
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(Payment::findOrFail($id));
    }

    public function history(int $id): JsonResponse
    {
        $sale = Sale::findOrFail($id);
        $paid = (string) $sale->payments()->where('status', 'recorded')->sum('amount');

        return response()->json(['sale_id' => $id, 'total_amount' => $sale->total_amount, 'total_paid' => $paid, 'remaining_balance' => (string) BigDecimal::of($sale->total_amount)->minus($paid), 'payment_status' => $sale->payment_status, 'payments' => $sale->payments()->orderBy('payment_date')->orderBy('id')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->merge(['idempotency_key' => trim((string) $request->input('idempotency_key')), 'reference_number' => trim((string) $request->input('reference_number')) ?: null]);
        $data = $request->validate(['sale_id' => 'required|integer|exists:sales,id', 'payment_date' => 'required|date_format:Y-m-d', 'amount' => 'required|numeric|gt:0|max:99999999.99|decimal:0,2', 'idempotency_key' => 'required|string|min:16|max:64', 'expected_remaining_balance' => 'required|numeric|min:0|max:99999999.99|decimal:0,2', 'payment_method' => 'nullable|in:cash,gcash,bank_transfer,card,other', 'reference_number' => 'nullable|required_if:payment_method,gcash,bank_transfer,card|string|max:100', 'notes' => 'nullable|string']);
        $created = true;
        try {
            $payment = DB::transaction(function () use ($data, $request, &$created) {
                $sale = Sale::whereKey($data['sale_id'])->lockForUpdate()->firstOrFail();
                $existing = Payment::where('idempotency_key', $data['idempotency_key'])->first();
                if ($existing) {
                    abort_if($existing->sale_id !== $sale->id, 409, 'This payment request key was already used for a different sale.');
                    $created = false;

                    return $existing;
                }
                $paid = (string) $sale->payments()->where('status', 'recorded')->sum('amount');
                $remaining = BigDecimal::of($sale->total_amount)->minus($paid);
                abort_unless($remaining->isEqualTo((string) $data['expected_remaining_balance']), 409, 'This sale balance changed while you were recording payment. Refresh the sale and confirm the amount again.');
                abort_if(BigDecimal::of((string) $data['amount'])->isGreaterThan($remaining), 409, 'Payment exceeds the remaining balance.');
                if ($data['reference_number'] !== null && in_array($data['payment_method'] ?? '', ['gcash', 'bank_transfer', 'card'], true)) {
                    abort_if(Payment::where('sale_id', $sale->id)->where('payment_method', $data['payment_method'])->where('reference_number', $data['reference_number'])->exists(), 409, 'A payment with this transaction reference already exists for this sale.');
                }
                $payment = Payment::create(Arr::except($data, 'expected_remaining_balance') + ['receipt_number' => 'PENDING-'.bin2hex(random_bytes(12)), 'status' => 'recorded', 'recorded_by_user_id' => $request->user()->id]);
                $payment->update(['receipt_number' => 'PAY-'.str_replace('-', '', $data['payment_date']).'-'.str_pad((string) $payment->id, 6, '0', STR_PAD_LEFT)]);
                $this->syncStatus($sale);

                return $payment->refresh();
            }, 3);
        } catch (QueryException $exception) {
            if (! in_array($exception->errorInfo[0] ?? '', ['23000', '23505'], true)) {
                throw $exception;
            }
            $payment = Payment::where('idempotency_key', $data['idempotency_key'])->first();
            abort_if(! $payment || $payment->sale_id !== $data['sale_id'], 409, 'This payment request key was already used.');
            $created = false;
        }

        return response()->json($payment, $created ? 201 : 200);
    }

    public function void(Request $request, int $id): JsonResponse
    {
        $request->merge(['reason' => trim((string) $request->input('reason'))]);
        $data = $request->validate(['reason' => 'required|string']);
        $original = Payment::findOrFail($id);
        $payment = DB::transaction(function () use ($original, $id, $request, $data) {
            $sale = Sale::lockForUpdate()->findOrFail($original->sale_id);
            $payment = Payment::lockForUpdate()->findOrFail($id);
            abort_if($payment->status === 'voided', 409, 'Payment is already voided');
            $payment->update(['status' => 'voided', 'void_reason' => $data['reason'], 'voided_at' => now(), 'voided_by_user_id' => $request->user()->id]);
            $this->syncStatus($sale);

            return $payment->refresh();
        });

        return response()->json($payment);
    }

    public function immutable(): JsonResponse
    {
        return response()->json(['detail' => 'Payments are immutable. Void an incorrect payment instead.'], 405);
    }

    private function syncStatus(Sale $sale): void
    {
        $paid = BigDecimal::of((string) $sale->payments()->where('status', 'recorded')->sum('amount'));
        $sale->forceFill(['payment_status' => $paid->isLessThanOrEqualTo(0) ? 'unpaid' : ($paid->isGreaterThanOrEqualTo($sale->total_amount) ? 'paid' : 'partial'), 'version' => $sale->version + 1])->save();
    }
}
