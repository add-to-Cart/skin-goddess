/**
 * Invoice service
 *
 * downloadInvoice  — fetches the PDF as a blob and triggers a browser download.
 * sendInvoice      — calls the backend to email the PDF to the client.
 *
 * Both functions use raw fetch (not the shared api client) because they handle
 * a non-JSON response (PDF blob). They manually attach the Bearer token from
 * the same tokenStore used by apiClient.js so authorization is consistent,
 * and they prepend the same VITE_API_BASE so the correct backend is called in
 * both development and production.
 */
import { tokenStore, VITE_API_BASE } from './apiClient'

function authHeaders() {
  const token = tokenStore.get()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Download the invoice PDF for a sale.
 * @param {number} saleId
 * @param {string} invoiceNumber  — used as the suggested filename, e.g. "INV-00042"
 */
async function downloadInvoice(saleId, invoiceNumber) {
  const response = await fetch(
    `${VITE_API_BASE}/api/sales/${saleId}/invoice`,
    {
      method:  'GET',
      headers: authHeaders(),
    }
  )

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data?.detail || `Failed to generate invoice (${response.status})`)
  }

  const blob = await response.blob()
  const url  = URL.createObjectURL(blob)

  const link    = document.createElement('a')
  link.href     = url
  link.download = `${invoiceNumber}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  setTimeout(() => URL.revokeObjectURL(url), 3000)
}

/**
 * Email the invoice PDF to the client.
 * @param {number}      saleId
 * @param {string|null} recipientEmail
 * @returns {Promise<{ message: string, invoice_number: string, sent_to: string }>}
 */
async function sendInvoice(saleId, recipientEmail = null) {
  const body = {}
  if (recipientEmail) body.recipient_email = recipientEmail

  const response = await fetch(
    `${VITE_API_BASE}/api/sales/${saleId}/send-invoice`,
    {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify(body),
    }
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.detail || `Failed to send invoice (${response.status})`)
  }

  return data
}

const invoiceService = { downloadInvoice, sendInvoice }
export default invoiceService
