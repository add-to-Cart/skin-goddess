"""Send invoice emails through Mailjet or Brevo's HTTPS API or optional SMTP."""

import base64
import json
import os
import smtplib
import urllib.error
import urllib.request
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


class EmailConfigurationError(RuntimeError):
    """Raised when the selected email provider is not configured."""


class EmailDeliveryError(RuntimeError):
    """Raised when an email provider cannot accept the invoice email."""


BREVO_EMAIL_URL = "https://api.brevo.com/v3/smtp/email"
MAILJET_SEND_URL = "https://api.mailjet.com/v3.1/send"


def send_invoice_email(
    recipient_email: str,
    recipient_name: str,
    invoice_number: str,
    pdf_bytes: bytes,
    sale_date: str,
    total_amount: str,
    remaining_balance: str,
    business_name: str,
) -> str | None:
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

    provider = os.getenv("EMAIL_PROVIDER", "mailjet").strip().lower()
    if provider == "mailjet":
        return _send_with_mailjet(
            recipient_email,
            recipient_name,
            invoice_number,
            pdf_bytes,
            body_text,
            body_html,
            business_name,
        )
    elif provider == "brevo":
        _send_with_brevo(
            recipient_email,
            recipient_name,
            invoice_number,
            pdf_bytes,
            body_text,
            body_html,
            business_name,
        )
    elif provider == "smtp":
        _send_with_smtp(
            recipient_email,
            invoice_number,
            pdf_bytes,
            body_text,
            body_html,
            business_name,
        )
    else:
        raise EmailConfigurationError(
            "EMAIL_PROVIDER must be 'mailjet', 'brevo', or 'smtp'."
        )


def _send_with_mailjet(
    recipient_email: str,
    recipient_name: str,
    invoice_number: str,
    pdf_bytes: bytes,
    body_text: str,
    body_html: str,
    business_name: str,
) -> str | None:
    api_key = os.getenv("MAILJET_API_KEY", "").strip()
    secret_key = os.getenv("MAILJET_SECRET_KEY", "").strip()
    sender_email = os.getenv("EMAIL_FROM", "").strip()
    if not api_key or not secret_key or not sender_email:
        raise EmailConfigurationError(
            "Invoice email is not configured. Set MAILJET_API_KEY, "
            "MAILJET_SECRET_KEY, and EMAIL_FROM."
        )

    credentials = base64.b64encode(
        f"{api_key}:{secret_key}".encode("utf-8")
    ).decode("ascii")
    payload = {
        "Messages": [{
            "From": {
                "Email": sender_email,
                "Name": os.getenv("EMAIL_FROM_NAME", business_name),
            },
            "To": [{"Email": recipient_email, "Name": recipient_name}],
            "Subject": f"Your Invoice from {business_name} - {invoice_number}",
            "TextPart": body_text,
            "HTMLPart": body_html,
            "Attachments": [{
                "ContentType": "application/pdf",
                "Filename": f"{invoice_number}.pdf",
                "Base64Content": base64.b64encode(pdf_bytes).decode("ascii"),
            }],
        }],
    }
    request = urllib.request.Request(
        MAILJET_SEND_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Basic {credentials}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            if not 200 <= response.status < 300:
                raise EmailDeliveryError(
                    "The email provider could not accept the invoice email."
                )
            try:
                result = json.loads(response.read())
            except (json.JSONDecodeError, UnicodeDecodeError) as exc:
                raise EmailDeliveryError(
                    "The email provider returned an invalid confirmation."
                ) from exc

            messages = result.get("Messages") if isinstance(result, dict) else None
            if not isinstance(messages, list) or len(messages) != 1:
                raise EmailDeliveryError(
                    "The email provider did not confirm the invoice email."
                )

            message = messages[0]
            if not isinstance(message, dict) or message.get("Status") != "success":
                raise EmailDeliveryError(
                    "The email provider did not accept the invoice email."
                )

            recipients = message.get("To")
            if not isinstance(recipients, list) or not any(
                isinstance(recipient, dict)
                and recipient.get("Email", "").casefold() == recipient_email.casefold()
                for recipient in recipients
            ):
                raise EmailDeliveryError(
                    "The email provider did not confirm the intended recipient."
                )

            return str(recipients[0]["MessageID"]) if recipients[0].get("MessageID") else None
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise EmailDeliveryError(
            "The email provider could not be reached. Please try again later."
        ) from exc


def _send_with_brevo(
        recipient_email: str,
        recipient_name: str,
        invoice_number: str,
        pdf_bytes: bytes,
        body_text: str,
        body_html: str,
        business_name: str,
) -> None:
    api_key = os.getenv("BREVO_API_KEY", "").strip()
    sender_email = os.getenv("EMAIL_FROM", "").strip()
    if not api_key or not sender_email:
        raise EmailConfigurationError(
            "Invoice email is not configured. Set BREVO_API_KEY and EMAIL_FROM."
        )

    payload = {
        "sender": {
            "name": os.getenv("EMAIL_FROM_NAME", business_name),
            "email": sender_email,
        },
        "to": [{"email": recipient_email, "name": recipient_name}],
        "subject": f"Your Invoice from {business_name} - {invoice_number}",
        "textContent": body_text,
        "htmlContent": body_html,
        "attachment": [{
            "name": f"{invoice_number}.pdf",
            "content": base64.b64encode(pdf_bytes).decode("ascii"),
        }],
    }
    request = urllib.request.Request(
        BREVO_EMAIL_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "api-key": api_key,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            if not 200 <= response.status < 300:
                raise EmailDeliveryError(
                    "The email provider could not accept the invoice email."
                )
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise EmailDeliveryError(
            "The email provider could not be reached. Please try again later."
        ) from exc


def _send_with_smtp(
        recipient_email: str,
        invoice_number: str,
        pdf_bytes: bytes,
        body_text: str,
        body_html: str,
        business_name: str,
) -> None:
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    smtp_from = os.getenv("SMTP_FROM", smtp_user)
    if not smtp_user or not smtp_password or not smtp_from:
        raise EmailConfigurationError(
            "SMTP is not configured. Set SMTP_USER, SMTP_PASSWORD, and SMTP_FROM."
        )

    msg = MIMEMultipart("mixed")
    msg["Subject"] = f"Your Invoice from {business_name} - {invoice_number}"
    msg["From"] = f"{business_name} <{smtp_from}>"
    msg["To"] = recipient_email

    alternative = MIMEMultipart("alternative")
    alternative.attach(MIMEText(body_text, "plain", "utf-8"))
    alternative.attach(MIMEText(body_html, "html", "utf-8"))
    msg.attach(alternative)

    pdf_attachment = MIMEBase("application", "pdf")
    pdf_attachment.set_payload(pdf_bytes)
    encoders.encode_base64(pdf_attachment)
    pdf_attachment.add_header(
        "Content-Disposition",
        "attachment",
        filename=f"{invoice_number}.pdf",
    )
    msg.attach(pdf_attachment)

    smtp_connection = (
        smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30)
        if smtp_port == 465
        else smtplib.SMTP(smtp_host, smtp_port, timeout=30)
    )
    with smtp_connection as server:
        if smtp_port != 465:
            server.ehlo()
            server.starttls()
            server.ehlo()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_from, recipient_email, msg.as_string())
