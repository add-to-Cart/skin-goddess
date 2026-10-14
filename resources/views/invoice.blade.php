<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Invoice {{ $invoice_number }}</title>
<style>
/* Use literal colors and actual tables supported by xhtml2pdf. */
@page { size: A4; margin: 18mm; }
body { font-family: DejaVu Sans; font-size: 10pt; line-height: 12pt; color: #35272c; }
h1 { font-family: DejaVu Serif; font-size: 25pt; line-height: 28pt; color: #bd6378; margin: 0 0 6pt; padding: 0; }
h2 { font-family: DejaVu Serif; font-size: 16pt; line-height: 18pt; color: #542b3a; margin: 12pt 0 6pt; padding: 0; }
p { margin: 0 0 3pt; padding: 0; }
table { width: 100%; }
td, th { vertical-align: top; padding: 7pt; }
.header td, .details td { padding: 0 0 14pt; }
.right { text-align: right; }
.muted { color: #82747a; font-size: 9pt; }
.label { color: #bd6378; font-size: 9pt; font-weight: bold; }
.items th, .payments th { background-color: #fff0f2; color: #542b3a; text-align: left; }
.items td, .payments td, .totals td { border-bottom: 0.5pt solid #f0dfe3; }
.grand { background-color: #fff0f2; color: #bd6378; font-weight: bold; }
.notice { margin-top: 18pt; font-size: 8pt; color: #82747a; }
.footer { margin-top: 16pt; text-align: center; color: #bd6378; }
</style>
</head>
<body>
<table class="header"><tr>
<td width="65%">
<h1>{{ $business['name'] }}</h1>
<p class="label">{{ $business['tagline'] }}</p>
<p class="muted">
@if($business['address']){{ $business['address'] }}<br>@endif
@if($business['phone']){{ $business['phone'] }}<br>@endif
@if($business['email']){{ $business['email'] }}@endif
</p>
</td>
<td width="35%" class="right">
<h2>Invoice</h2>
<p><strong>{{ $invoice_number }}</strong></p>
<p class="muted">Date: {{ $sale_date }}</p>
</td>
</tr></table>
<table class="details"><tr>
<td width="65%">
<p class="label">Prepared for</p>
<p><strong>{{ $client['full_name'] }}</strong></p>
<p class="muted">
@if($client['phone']){{ $client['phone'] }}<br>@endif
@if($client['email']){{ $client['email'] }}<br>@endif
@if($client['address']){{ $client['address'] }}@endif
</p>
</td>
<td width="35%" class="right">
<p class="label">Payment status</p>
<p>{{ ucwords(str_replace('_', ' ', $payment_status)) }}</p>
</td>
</tr></table>
<h2>Treatment &amp; Services</h2>
<table class="items" repeat="1">
<tr><th width="46%">Description</th><th width="12%">Qty</th>
<th width="21%">Unit Price (PHP)</th><th width="21%">Amount (PHP)</th></tr>
@forelse($items as $item)
<tr><td>{{ $item['description'] }}</td><td class="right">{{ $item['quantity'] }}</td>
<td class="right">{{ $item['unit_price'] }}</td><td class="right">{{ $item['line_total'] }}</td></tr>
@empty
<tr><td colspan="4">No invoice items recorded.</td></tr>
@endforelse
</table>
<h2>Amount Summary</h2>
<table class="totals">
<tr class="grand"><td width="75%">Total Amount (PHP)</td><td width="25%" class="right">{{ $total_amount }}</td></tr>
<tr><td>Total Paid (PHP)</td><td class="right">{{ $total_paid }}</td></tr>
<tr><td><strong>Balance Due (PHP)</strong></td><td class="right"><strong>{{ $remaining_balance }}</strong></td></tr>
</table>
@if($payments)
<h2>Payment History</h2>
<table class="payments" repeat="1">
<tr><th width="34%">Date</th><th width="33%">Payment Method</th><th width="33%">Amount (PHP)</th></tr>
@foreach($payments as $payment)
<tr><td>{{ $payment['payment_date'] }}</td><td>{{ $payment['payment_method'] ?: '-' }}</td>
<td class="right">{{ $payment['amount'] }}</td></tr>
@endforeach
</table>
@endif
<p class="notice"><strong>Billing notice:</strong> This document is an invoice or billing summary,
not a substitute for a BIR-compliant invoice or other required tax document.
Please retain the applicable official tax documentation issued by the business.</p>
<p class="footer">{{ $business['name'] }}<br><span class="muted">Thank you for choosing us.</span></p>
</body>
</html>
