<?php

namespace App\Http\Controllers;

use App\Mail\ClinicInvoice;
use App\Models\Sale;
use Brick\Math\BigDecimal;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpFoundation\Response;

class InvoiceController extends Controller
{
    public function download(int $id): Response
    {
        $context = $this->context($id);

        return response($this->pdf($context), 200, ['Content-Type' => 'application/pdf', 'Content-Disposition' => 'attachment; filename="'.$context['invoice_number'].'.pdf"']);
    }

    public function send(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['recipient_email' => 'nullable|email|max:255']);
        $context = $this->context($id);
        $email = $data['recipient_email'] ?? $context['client']['email'];
        abort_unless($email, 422, 'No email address available. Add an email to the client profile or supply recipient_email.');
        abort_unless(config('mail.default') === 'smtp' && config('mail.mailers.smtp.host') && config('mail.from.address'), 503, 'Invoice email delivery requires the existing clinic SMTP account to be configured in Laravel.');
        $pdf = $this->pdf($context);
        try {
            Mail::to($email)->send(new ClinicInvoice($context, $pdf));
        } catch (\Throwable $exception) {
            report($exception);
            abort(502, 'Invoice email could not be sent. Please try again later.');
        }

        return response()->json(['message' => 'Invoice '.$context['invoice_number'].' accepted for delivery to '.$email, 'invoice_number' => $context['invoice_number'], 'sent_to' => $email, 'provider_message_id' => null]);
    }

    /** @return array<string, mixed> */
    private function context(int $id): array
    {
        return DB::transaction(function () use ($id): array {
            $sale = Sale::sharedLock()->findOrFail($id);
            $sale->load(['client', 'items', 'payments' => fn ($query) => $query->where('status', 'recorded')->orderBy('payment_date')->orderBy('id')]);
            $revision = (int) DB::table('sale_corrections')->where('sale_id', $id)->max('revision');
            $paid = BigDecimal::zero();
            foreach ($sale->payments as $payment) {
                $paid = $paid->plus($payment->amount);
            }

            return ['business' => config('clinic.business'), 'correction_revision' => $revision, 'invoice_number' => 'INV-'.str_pad((string) $id, 5, '0', STR_PAD_LEFT), 'sale_date' => $sale->sale_date->toDateString(), 'payment_status' => $sale->payment_status, 'client' => ['full_name' => $sale->client->first_name.' '.$sale->client->last_name, 'phone' => $sale->client->phone, 'email' => $sale->client->email, 'address' => $sale->client->address], 'items' => $sale->items->map(fn ($item) => ['description' => $item->description, 'quantity' => $item->quantity, 'unit_price' => $item->unit_price, 'line_total' => $item->line_total])->all(), 'payments' => $sale->payments->map(fn ($payment) => ['payment_date' => $payment->payment_date->toDateString(), 'payment_method' => $payment->payment_method, 'amount' => $payment->amount])->all(), 'total_amount' => $sale->total_amount, 'total_paid' => (string) $paid->toScale(2), 'remaining_balance' => (string) BigDecimal::of($sale->total_amount)->minus($paid)->toScale(2)];
        });
    }

    /** @param array<string, mixed> $context */
    private function pdf(array $context): string
    {
        $options = new Options;
        $options->set('isRemoteEnabled', false);
        $options->set('isPhpEnabled', false);
        $options->set('chroot', resource_path('views'));
        $dompdf = new Dompdf($options);
        $dompdf->loadHtml(view('invoice', $context)->render());
        $dompdf->setPaper('A4');
        $dompdf->render();

        return $dompdf->output();
    }
}
