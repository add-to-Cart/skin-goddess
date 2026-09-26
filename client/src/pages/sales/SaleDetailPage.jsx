import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Mail, Plus } from 'lucide-react'
import paymentsService from '@/services/paymentsService'
import salesService from '@/services/salesService'
import invoiceService from '@/services/invoiceService'
import clientsService from '@/services/clientsService'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/shared/StatCard'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogBody, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import PaymentForm from './PaymentForm'

const STATUS_VARIANT = { paid: 'success', partial: 'warning', unpaid: 'danger' }

// ── Send Invoice Dialog ────────────────────────────────────────────────────────

function SendInvoiceDialog({ open, onClose, saleId, clientEmail, invoiceNumber }) {
  const [email, setEmail]     = useState(clientEmail || '')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError]     = useState(null)

  // Keep email in sync when prop changes
  useEffect(() => { setEmail(clientEmail || '') }, [clientEmail])

  async function handleSend(e) {
    e.preventDefault()
    setSending(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await invoiceService.sendInvoice(saleId, email || null)
      setSuccess(`Invoice sent to ${result.sent_to}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  function handleClose() {
    setSuccess(null)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Invoice by Email</DialogTitle>
          <DialogDescription>
            Invoice <strong>{invoiceNumber}</strong> will be attached as a PDF.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <DialogBody>
            <div
              className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
              style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}
              role="status"
            >
              ✓ {success}
            </div>
          </DialogBody>
        ) : (
          <form onSubmit={handleSend}>
            <DialogBody className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invoice-email">Recipient Email</Label>
                <Input
                  id="invoice-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@example.com"
                  required
                  aria-describedby="invoice-email-hint"
                />
                <p id="invoice-email-hint" className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Pre-filled from the client profile. You can change it if needed.
                </p>
              </div>
              {error && <ErrorState message={error} />}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={sending}>
                {sending ? 'Sending…' : 'Send Invoice'}
              </Button>
            </DialogFooter>
          </form>
        )}

        {success && (
          <DialogFooter>
            <Button variant="ghost" onClick={handleClose}>Close</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function SaleDetailPage() {
  const { id } = useParams()
  const invoiceNumber = `INV-${String(id).padStart(5, '0')}`

  const [sale, setSale]               = useState(null)
  const [history, setHistory]         = useState(null)
  const [clientEmail, setClientEmail] = useState('')
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(null)
  const [emailOpen, setEmailOpen]     = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      salesService.getById(id),
      paymentsService.getHistoryBySale(id),
    ])
      .then(([s, h]) => {
        setSale(s)
        setHistory(h)
        return clientsService.getById(s.client_id)
          .then((c) => { if (c?.email) setClientEmail(c.email) })
          .catch(() => null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  async function handleDownload() {
    setDownloading(true)
    setDownloadError(null)
    try {
      await invoiceService.downloadInvoice(Number(id), invoiceNumber)
    } catch (err) {
      setDownloadError(err.message)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) return <LoadingState message="Loading sale…" />
  if (error)   return <div className="mt-4"><ErrorState message={error} /></div>

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          to="/sales"
          className="inline-flex items-center gap-1.5 text-sm hover:underline"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Sales
        </Link>
      </div>

      <PageHeader
        title={`Sale #${sale.id}`}
        subtitle={
          <span className="flex items-center gap-2">
            {sale.sale_date}
            <Badge variant={STATUS_VARIANT[sale.payment_status] ?? 'neutral'}>
              {sale.payment_status}
            </Badge>
          </span>
        }
      >
        <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
          <Download className="h-4 w-4" />
          {downloading ? 'Generating…' : 'Download'}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setEmailOpen(true)}>
          <Mail className="h-4 w-4" />
          Send Invoice
        </Button>
        <Button size="sm" onClick={() => setPaymentOpen(true)}>
          <Plus className="h-4 w-4" /> Record Payment
        </Button>
      </PageHeader>

      {downloadError && <ErrorState message={downloadError} className="mb-4" />}

      {/* Payment summary stats */}
      {history && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Total" value={formatCurrency(history.total_amount)} accent="neutral" />
          <StatCard label="Paid" value={formatCurrency(history.total_paid)} accent="success" />
          <StatCard
            label="Remaining"
            value={formatCurrency(history.remaining_balance)}
            accent={history.remaining_balance > 0 ? 'danger' : 'success'}
          />
        </div>
      )}

      {/* Line items */}
      <Card className="mb-5">
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
          <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
            {invoiceNumber}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={['Description', 'Qty', 'Unit Price', 'Total']}
            rows={sale.items.map((item) => [
              <span className="font-medium">{item.description}</span>,
              <span style={{ color: 'var(--color-text-muted)' }}>{item.quantity}</span>,
              <span>{formatCurrency(item.unit_price)}</span>,
              <span className="font-semibold">{formatCurrency(item.line_total)}</span>,
            ])}
            emptyState={<EmptyState title="No line items" />}
          />
        </CardContent>
      </Card>

      {/* Payment history */}
      {history && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {history.payments.length === 0 ? (
              <EmptyState title="No payments recorded yet" description="Use + Record Payment to add one." />
            ) : (
              <DataTable
                columns={['Date', 'Method', 'Amount', 'Notes']}
                rows={history.payments.map((p) => [
                  <span className="font-medium whitespace-nowrap">{p.payment_date}</span>,
                  <span style={{ color: 'var(--color-text-muted)' }}>{p.payment_method ?? '—'}</span>,
                  <span className="font-semibold">{formatCurrency(p.amount)}</span>,
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{p.notes ?? '—'}</span>,
                ])}
                emptyState={null}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Send Invoice Dialog */}
      <SendInvoiceDialog
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        saleId={Number(id)}
        clientEmail={clientEmail}
        invoiceNumber={invoiceNumber}
      />

      {/* Record Payment Dialog */}
      <PaymentForm
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        saleId={Number(id)}
        remainingBalance={history?.remaining_balance ?? null}
        onSaved={() => { setPaymentOpen(false); loadData() }}
      />
    </div>
  )
}
