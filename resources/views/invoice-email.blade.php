Dear {{ $client['full_name'] }},

Please find your invoice attached to this email.

Invoice Number: {{ $invoice_number }}
@if($correction_revision > 0)
Corrected invoice — revision {{ $correction_revision }}
@endif
Date: {{ $sale_date }}
Total Amount: PHP {{ $total_amount }}
Balance Due: PHP {{ $remaining_balance }}

Thank you for trusting {{ $business['name'] }}.

This document is a billing summary. It is not an official BIR receipt.
