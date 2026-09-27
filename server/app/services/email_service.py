"""
Email service
=============
Sends emails via SMTP using Python's built-in smtplib.
No external email SDK required — completely free.

Configuration is read from environment variables:

    SMTP_HOST     — e.g. smtp.gmail.com  or  smtp-relay.brevo.com
    SMTP_PORT     — 587 (TLS/STARTTLS, recommended) or 465 (SSL)
    SMTP_USER     — your email address or SMTP username
    SMTP_PASSWORD — your app password (Gmail) or SMTP key (Brevo)
    SMTP_FROM     — the "From" address shown to recipients
                    defaults to SMTP_USER if not set

Gmail setup:
  1. Enable 2-Factor Authentication on your Google account.
  2. Go to Google Account → Security → App Passwords.
  3. Create an app password (select "Mail" + "Windows Computer").
  4. Use that 16-character password as SMTP_PASSWORD.
  5. Set SMTP_HOST=smtp.gmail.com, SMTP_PORT=587.

Brevo (formerly Sendinblue) setup:
  1. Create a free account at brevo.com.
  2. Go to SMTP & API → SMTP.
  3. Copy the SMTP server, port, login, and password.
  4. Free tier: 300 emails/day.
"""

import os
import smtplib
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# ── SMTP config from environment ──────────────────────────────────────────────
SMTP_HOST     = os.getenv("SMTP_HOST",     "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER     = os.getenv("SMTP_USER",     "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM     = os.getenv("SMTP_FROM",     SMTP_USER)


def send_invoice_email(
    recipient_email: str,
    recipient_name: str,
    invoice_number: str,
    pdf_bytes: bytes,
    sale_date: str,
    total_amount: str,
    remaining_balance: str,
    business_name: str,
) -> None:
    """
    Send an invoice PDF to the client via email.

    Parameters
    ----------
    recipient_email    : client's email address
    recipient_name     : client's full name (used in greeting)
    invoice_number     : e.g. "INV-00042"
    pdf_bytes          : the rendered PDF as raw bytes
    sale_date          : formatted date string for the email body
    total_amount       : formatted total (e.g. "10,000.00")
    remaining_balance  : formatted balance (e.g. "3,000.00")
    business_name      : shown in subject and signature
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        raise RuntimeError(
            "SMTP credentials are not configured. "
            "Set SMTP_USER and SMTP_PASSWORD in your .env file."
        )

    # ── Build the email ───────────────────────────────────────────────────────
    msg = MIMEMultipart("mixed")
    msg["Subject"] = f"Your Invoice from {business_name} — {invoice_number}"
    msg["From"]    = f"{business_name} <{SMTP_FROM}>"
    msg["To"]      = recipient_email

    # Plain-text body
    body_text = f"""\
Dear {recipient_name},

Please find your invoice attached to this email.

Invoice Number : {invoice_number}
Date           : {sale_date}
Total Amount   : ₱{total_amount}
Balance Due    : ₱{remaining_balance}

If you have any questions about this invoice, please don't hesitate to reach out.

Thank you for trusting {business_name}.

Warm regards,
{business_name}

---
This document is a billing summary. It is not an official BIR receipt.
An official receipt will be issued separately as required by the BIR.
"""

    # HTML body (nicer in modern email clients)
    body_html = f"""\
<html>
<body style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a2e;line-height:1.6;">
  <p>Dear <strong>{recipient_name}</strong>,</p>
  <p>Please find your invoice attached to this email.</p>
  <table style="border-collapse:collapse;margin:16px 0;">
    <tr>
      <td style="padding:4px 16px 4px 0;color:#666;">Invoice Number</td>
      <td style="padding:4px 0;font-weight:bold;">{invoice_number}</td>
    </tr>
    <tr>
      <td style="padding:4px 16px 4px 0;color:#666;">Date</td>
      <td style="padding:4px 0;">{sale_date}</td>
    </tr>
    <tr>
      <td style="padding:4px 16px 4px 0;color:#666;">Total Amount</td>
      <td style="padding:4px 0;">₱{total_amount}</td>
    </tr>
    <tr>
      <td style="padding:4px 16px 4px 0;color:#666;">Balance Due</td>
      <td style="padding:4px 0;color:#e74c3c;font-weight:bold;">₱{remaining_balance}</td>
    </tr>
  </table>
  <p>If you have any questions about this invoice, please don't hesitate to reach out.</p>
  <p>Thank you for trusting <strong>{business_name}</strong>.</p>
  <br>
  <p style="color:#888;font-size:11px;">
    This document is a billing summary. It is not an official BIR receipt.
    An official receipt will be issued separately as required by the BIR.
  </p>
</body>
</html>
"""

    # Attach both plain text and HTML alternatives
    alternative = MIMEMultipart("alternative")
    alternative.attach(MIMEText(body_text, "plain", "utf-8"))
    alternative.attach(MIMEText(body_html,  "html",  "utf-8"))
    msg.attach(alternative)

    # Attach the PDF
    pdf_attachment = MIMEBase("application", "pdf")
    pdf_attachment.set_payload(pdf_bytes)
    encoders.encode_base64(pdf_attachment)
    pdf_attachment.add_header(
        "Content-Disposition",
        "attachment",
        filename=f"{invoice_number}.pdf",
    )
    msg.attach(pdf_attachment)

    # Port 465 uses implicit TLS; other configured ports use STARTTLS.
    smtp_connection = (
      smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=30)
      if SMTP_PORT == 465
      else smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30)
    )
    with smtp_connection as server:
      if SMTP_PORT != 465:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM, recipient_email, msg.as_string())
