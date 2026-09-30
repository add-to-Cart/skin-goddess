import base64
import json
import unittest
from unittest.mock import MagicMock, patch
from urllib.error import URLError

from app.services.email_service import (
    EmailConfigurationError,
    EmailDeliveryError,
    send_invoice_email,
)


class BrevoEmailTests(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(
            "os.environ",
            {
                "EMAIL_PROVIDER": "brevo",
                "BREVO_API_KEY": "test-api-key",
                "EMAIL_FROM": "clinic@example.com",
                "EMAIL_FROM_NAME": "Test Clinic",
            },
            clear=True,
        )
        self.environment.start()
        self.addCleanup(self.environment.stop)

    def test_posts_invoice_pdf_as_attachment_to_brevo(self):
        response = MagicMock()
        response.status = 201
        response.__enter__.return_value = response

        with patch(
            "app.services.email_service.urllib.request.urlopen",
            return_value=response,
        ) as urlopen:
            send_invoice_email(
                recipient_email="client@example.com",
                recipient_name="Client Name",
                invoice_number="INV-00001",
                pdf_bytes=b"%PDF-test-content",
                sale_date="2026-09-28",
                total_amount="1,000.00",
                remaining_balance="500.00",
                business_name="Test Clinic",
            )

        request = urlopen.call_args.args[0]
        self.assertEqual(request.full_url, "https://api.brevo.com/v3/smtp/email")
        self.assertEqual(request.get_header("Api-key"), "test-api-key")
        payload = json.loads(request.data)
        self.assertEqual(payload["to"][0]["email"], "client@example.com")
        attachment = payload["attachment"][0]
        self.assertEqual(attachment["name"], "INV-00001.pdf")
        self.assertEqual(
            base64.b64decode(attachment["content"]), b"%PDF-test-content"
        )

    def test_requires_api_key_and_sender(self):
        with patch.dict("os.environ", {"BREVO_API_KEY": ""}):
            with self.assertRaisesRegex(EmailConfigurationError, "BREVO_API_KEY"):
                send_invoice_email(
                    "client@example.com", "Client", "INV-1", b"pdf", "date",
                    "100.00", "0.00", "Test Clinic",
                )

    def test_provider_network_error_is_sanitized(self):
        with patch(
            "app.services.email_service.urllib.request.urlopen",
            side_effect=URLError("sensitive transport detail"),
        ):
            with self.assertRaises(EmailDeliveryError) as raised:
                send_invoice_email(
                    "client@example.com", "Client", "INV-1", b"pdf", "date",
                    "100.00", "0.00", "Test Clinic",
                )

        self.assertNotIn("sensitive", str(raised.exception))
        self.assertNotIn("test-api-key", str(raised.exception))


class MailjetEmailTests(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(
            "os.environ",
            {
                "EMAIL_PROVIDER": "mailjet",
                "MAILJET_API_KEY": "test-mailjet-key",
                "MAILJET_SECRET_KEY": "test-mailjet-secret",
                "EMAIL_FROM": "clinic@example.com",
                "EMAIL_FROM_NAME": "Test Clinic",
            },
            clear=True,
        )
        self.environment.start()
        self.addCleanup(self.environment.stop)

    def test_posts_invoice_pdf_as_attachment_to_mailjet(self):
        response = MagicMock()
        response.status = 200
        response.__enter__.return_value = response
        response.read.return_value = json.dumps({
            "Messages": [{
                "Status": "success",
                "To": [{"Email": "client@example.com", "MessageID": 12345}],
            }],
        }).encode("utf-8")

        with patch(
            "app.services.email_service.urllib.request.urlopen",
            return_value=response,
        ) as urlopen:
            message_id = send_invoice_email(
                recipient_email="client@example.com",
                recipient_name="Client Name",
                invoice_number="INV-00001",
                pdf_bytes=b"%PDF-test-content",
                sale_date="2026-09-28",
                total_amount="1,000.00",
                remaining_balance="500.00",
                business_name="Test Clinic",
            )

        self.assertEqual(message_id, "12345")
        request = urlopen.call_args.args[0]
        self.assertEqual(request.full_url, "https://api.mailjet.com/v3.1/send")
        self.assertEqual(request.get_header("Authorization").split()[0], "Basic")
        payload = json.loads(request.data)
        message = payload["Messages"][0]
        self.assertEqual(message["To"][0]["Email"], "client@example.com")
        attachment = message["Attachments"][0]
        self.assertEqual(attachment["Filename"], "INV-00001.pdf")
        self.assertEqual(
            base64.b64decode(attachment["Base64Content"]), b"%PDF-test-content"
        )

    def test_rejects_mailjet_per_message_error_in_http_200_response(self):
        response = MagicMock()
        response.status = 200
        response.__enter__.return_value = response
        response.read.return_value = json.dumps({
            "Messages": [{"Status": "error", "Errors": [{"ErrorMessage": "rejected"}]}],
        }).encode("utf-8")

        with patch(
            "app.services.email_service.urllib.request.urlopen",
            return_value=response,
        ):
            with self.assertRaisesRegex(EmailDeliveryError, "did not accept"):
                send_invoice_email(
                    "client@example.com", "Client", "INV-1", b"pdf", "date",
                    "100.00", "0.00", "Test Clinic",
                )

    def test_requires_api_credentials_and_sender(self):
        with patch.dict("os.environ", {"MAILJET_SECRET_KEY": ""}):
            with self.assertRaisesRegex(EmailConfigurationError, "MAILJET_SECRET_KEY"):
                send_invoice_email(
                    "client@example.com", "Client", "INV-1", b"pdf", "date",
                    "100.00", "0.00", "Test Clinic",
                )


class SmtpEmailTests(unittest.TestCase):
    def test_port_465_authenticates_and_sends(self):
        environment = patch.dict(
            "os.environ",
            {
                "EMAIL_PROVIDER": "smtp",
                "SMTP_HOST": "smtp.example.com",
                "SMTP_PORT": "465",
                "SMTP_USER": "smtp-user",
                "SMTP_PASSWORD": "smtp-password",
                "SMTP_FROM": "clinic@example.com",
            },
            clear=True,
        )
        environment.start()
        self.addCleanup(environment.stop)

        smtp_server = MagicMock()
        smtp_connection = MagicMock()
        smtp_connection.__enter__.return_value = smtp_server

        with patch(
            "app.services.email_service.smtplib.SMTP_SSL",
            return_value=smtp_connection,
        ) as smtp_ssl:
            send_invoice_email(
                "client@example.com", "Client", "INV-1", b"pdf", "date",
                "100.00", "0.00", "Test Clinic",
            )

        smtp_ssl.assert_called_once_with("smtp.example.com", 465, timeout=30)
        smtp_server.login.assert_called_once_with("smtp-user", "smtp-password")
        smtp_server.sendmail.assert_called_once()


if __name__ == "__main__":
    unittest.main()