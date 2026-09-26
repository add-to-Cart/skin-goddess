/**
 * Invoice service
 *
 * downloadInvoice  — fetches the PDF as a blob and triggers a browser download.
 *                    No new tab, no navigation — the file just downloads.
 *
 * sendInvoice      — calls the backend to email the PDF to the client.
 *                    recipientEmail is optional; omit it to use the client's
 *                    email on file.
 */

/**
 * Download the invoice PDF for a sale.
 * @param {number} saleId
 * @param {string} invoiceNumber  — used as the suggested filename, e.g. "INV-00042"
 */
async function downloadInvoice(saleId, invoiceNumber) {
  const response = await fetch(`/api/sales/${saleId}/invoice`, {
    method: 'GET',
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data?.detail || `Failed to generate invoice (${response.status})`)
  }

  // Convert the response to a blob and trigger a browser download
  const blob = await response.blob()
  const url  = URL.createObjectURL(blob)

  const link    = document.createElement('a')
  link.href     = url
  link.download = `${invoiceNumber}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Release the object URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}

/**
 * Email the invoice PDF to the client.
 * @param {number}      saleId
 * @param {string|null} recipientEmail  — override the client's email on file, or null to use it
 * @returns {Promise<{ message: string, invoice_number: string, sent_to: string }>}
 */
async function sendInvoice(saleId, recipientEmail = null) {
  const body = {}
  if (recipientEmail) body.recipient_email = recipientEmail

  const response = await fetch(`/api/sales/${saleId}/send-invoice`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.detail || `Failed to send invoice (${response.status})`)
  }

  return data
}

const invoiceService = { downloadInvoice, sendInvoice }
export default invoiceService
