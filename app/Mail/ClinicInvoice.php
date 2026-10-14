<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class ClinicInvoice extends Mailable
{
    /** @param array<string, mixed> $context */
    public function __construct(public array $context, public string $pdfBytes) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your Invoice from '.$this->context['business']['name'].' - '.$this->context['invoice_number']);
    }

    public function content(): Content
    {
        return new Content(text: 'invoice-email', with: $this->context);
    }

    /** @return array<int, Attachment> */
    public function attachments(): array
    {
        return [Attachment::fromData(fn () => $this->pdfBytes, $this->context['invoice_number'].'.pdf')->withMime('application/pdf')];
    }
}
