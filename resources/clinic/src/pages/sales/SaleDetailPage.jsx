import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Mail, Plus } from 'lucide-react'
import paymentsService from '@/services/paymentsService'
import salesService from '@/services/salesService'
import invoiceService from '@/services/invoiceService'
import clientsService from '@/services/clientsService'
import servicesService from '@/services/servicesService'
import authService from '@/services/authService'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/shared/StatCard'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import { DataTable, MobileCard, MobileField } from '@/components/shared/DataTable'
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
import SaleForm from './SaleForm'
import PackageSessions from './PackageSessions'
import FormDialog, { FormField } from '@/components/shared/FormDialog'

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
      setSuccess(`Invoice accepted for delivery to ${result.sent_to}`)
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

function VoidPaymentDialog({ payment, clientContext, saleId, onClose, onSaved }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { setReason(''); setError(null) }, [payment])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!reason.trim()) { setError('Enter the reason for voiding this payment.'); return }
    setSubmitting(true)
    setError(null)
    try {
      await paymentsService.void(payment.id, reason.trim())
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={Boolean(payment)}
      onClose={onClose}
      title="Void Payment"
      description="This keeps the payment in the audit history and removes it from the sale balance."
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel="Void Payment"
      error={error}
    >
      <p className="text-sm wrap-anywhere">{clientContext} · Sale #{saleId} · {payment.receipt_number} · {formatCurrency(payment.amount)}</p>
      <FormField label="Void Reason" required>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
      </FormField>
    </FormDialog>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function SaleDetailPage() {
  const { id } = useParams()
  const invoiceNumber = `INV-${String(id).padStart(5, '0')}`

  const [sale, setSale]               = useState(null)
  const [history, setHistory]         = useState(null)
  const [client, setClient] = useState(null)
  const [clientError, setClientError] = useState(null)
  const loadVersion = useRef(0)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(null)
  const [emailOpen, setEmailOpen]     = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [voidingPayment, setVoidingPayment] = useState(null)
  const [correctionOpen, setCorrectionOpen] = useState(false)
  const [corrections, setCorrections] = useState([])
  const [packageProgress, setPackageProgress] = useState(null)
  const [packageTreatment, setPackageTreatment] = useState(null)
  const isAdmin = authService.isAdmin()

  const loadData = useCallback(() => {
    const version = ++loadVersion.current
    setLoading(true)
    setError(null)
    setClient(null)
    setClientError(null)
    Promise.all([
      salesService.getById(id),
      paymentsService.getHistoryBySale(id),
      salesService.getCorrections(id),
    ])
      .then(async ([s, h, revisions]) => {
        if (version !== loadVersion.current) return
        if (s.package_service_id) {
          const [progress, treatment] = await Promise.all([salesService.getSessions(id), servicesService.getById(s.package_service_id)])
          if (version !== loadVersion.current) return
          setPackageProgress(progress)
          setPackageTreatment(treatment)
        } else { setPackageProgress(null); setPackageTreatment(null) }
        setSale(s)
        setHistory(h)
        setCorrections(revisions)
        return clientsService.getById(s.client_id)
          .then((c) => { if (version === loadVersion.current) setClient(c) })
          .catch((error) => { if (version === loadVersion.current) setClientError(error.message) })
      })
      .catch((e) => { if (version === loadVersion.current) setError(e.message) })
      .finally(() => { if (version === loadVersion.current) setLoading(false) })
  }, [id])

  useEffect(() => { loadData(); return () => { loadVersion.current += 1 } }, [loadData])

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
  if (error)   return <div className="mt-4"><ErrorState message={error} /><Button variant="outline" onClick={loadData}>Retry loading sale</Button></div>

  const clientContext = `${client ? `${client.first_name} ${client.last_name}` : 'Name unavailable'} · Client #${sale.client_id}`
  return (
    <div className="sale-detail min-w-0">
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
          <span className="flex flex-wrap items-center gap-2">
            {sale.sale_date}
            <Badge variant={STATUS_VARIANT[sale.payment_status] ?? 'neutral'}>
              {sale.payment_status}
            </Badge>
            {sale.package_service_id && <Badge variant={sale.canceled_at ? 'danger' : 'info'}>{sale.canceled_at ? 'Canceled package' : 'Treatment package'}</Badge>}
          </span>
        }
      >
        {isAdmin && <Button variant="outline" size="sm" onClick={() => setCorrectionOpen(true)}>Correct Sale</Button>}
        <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
          <Download className="h-4 w-4" />
          {downloading ? 'Generating…' : 'Download Invoice'}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setEmailOpen(true)}>
          <Mail className="h-4 w-4" />
          Send Invoice
        </Button>
        <Button size="sm" disabled={!history || Number(history.remaining_balance) <= 0} onClick={() => setPaymentOpen(true)}>
          <Plus className="h-4 w-4" /> Record Payment
        </Button>
      </PageHeader>

      <div className="mb-4 text-sm wrap-anywhere"><p className="font-semibold">{clientContext}</p><p>{invoiceNumber} · {sale.sale_date}</p>{clientError && <p role="status">Client details unavailable: {clientError}. Use the client ID to verify this sale.</p>}{history && Number(history.remaining_balance) <= 0 && <p>No outstanding balance. Payment history remains available below.</p>}</div>
      {downloadError && <ErrorState message={downloadError} className="mb-4" />}
      {corrections.length > 0 && <p className="text-sm mb-4" role="status">Corrected invoice · revision {corrections[0].revision}. The invoice number is unchanged; previous values are preserved below.</p>}

      {/* Payment summary stats */}
      {history && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <StatCard label="Total billed" value={formatCurrency(history.total_amount)} accent="neutral" />
          <StatCard label="Recorded payments" value={formatCurrency(history.total_paid)} accent="success" />
          <StatCard
            label="Outstanding Payment"
            value={formatCurrency(history.remaining_balance)}
            accent={history.remaining_balance > 0 ? 'danger' : 'success'}
          />
        </div>
      )}

      {packageProgress && packageTreatment && <PackageSessions clientContext={clientContext} key={`${sale.id}-${packageProgress.version}`} sale={sale} progress={packageProgress} treatment={packageTreatment} balance={history.remaining_balance} onChanged={loadData} />}

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
            mobileRows={sale.items.map((item) => <MobileCard key={item.id}><strong className="wrap-anywhere">{item.description}</strong><MobileField label="Quantity" value={item.quantity} /><MobileField label="Unit price" value={formatCurrency(item.unit_price)} /><MobileField label="Line total" value={formatCurrency(item.line_total)} /></MobileCard>)}
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
                mobileRows={history.payments.map((payment) => <MobileCard key={payment.id} actions={isAdmin && payment.status === 'recorded' ? <Button variant="outline" onClick={() => setVoidingPayment(payment)}>Void payment</Button> : null}><strong>{payment.receipt_number}</strong><Badge variant={payment.status === 'voided' ? 'danger' : 'success'}>{payment.status}</Badge><MobileField label="Date" value={payment.payment_date} /><MobileField label="Method" value={payment.payment_method || 'Not recorded'} /><MobileField label="Reference" value={payment.reference_number || 'Not recorded'} /><MobileField label="Amount" value={formatCurrency(payment.amount)} /><MobileField label={payment.status === 'voided' ? 'Void reason' : 'Notes'} value={payment.status === 'voided' ? payment.void_reason : payment.notes} /></MobileCard>)}
                columns={['Date', 'Receipt', 'Method', 'Reference', 'Amount', 'Status', 'Notes', '']}
                rows={history.payments.map((p) => [
                  <span className="font-medium whitespace-nowrap">{p.payment_date}</span>,
                  <span className="text-xs font-mono">{p.receipt_number}</span>,
                  <span style={{ color: 'var(--color-text-muted)' }}>{p.payment_method ?? '—'}</span>,
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{p.reference_number ?? '—'}</span>,
                  <span className="font-semibold">{formatCurrency(p.amount)}</span>,
                  <Badge variant={p.status === 'voided' ? 'danger' : 'success'}>{p.status}</Badge>,
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{p.status === 'voided' ? p.void_reason : p.notes ?? '—'}</span>,
                  isAdmin && p.status === 'recorded'
                    ? <Button variant="ghost" size="sm" onClick={() => setVoidingPayment(p)}>Void</Button>
                    : null,
                ])}
                emptyState={null}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Send Invoice Dialog */}
      {corrections.length > 0 && <Card className="mt-5">
        <CardHeader><CardTitle>Sale Correction History</CardTitle></CardHeader>
        <CardContent>
          {corrections.map((correction) => <details key={correction.id} className="mb-4">
            <summary className="cursor-pointer">Revision {correction.revision} · {correction.corrected_by_username} · {new Date(correction.created_at).toLocaleString('en-PH')}</summary>
            <p className="text-sm my-3">Reason: {correction.reason}</p>
            {[['Before', correction.before_snapshot], ['After', correction.after_snapshot]].map(([label, snapshot]) => <section key={label} className="mb-4" aria-label={`${label} correction ${correction.revision}`}>
              <h3 className="font-semibold">{label}</h3>
              <p className="text-sm">{snapshot.sale_date} · {formatCurrency(snapshot.total_amount)} · {snapshot.payment_status}</p>
              <p className="text-sm">Notes: {snapshot.notes || '—'}</p>
              <DataTable mobileRows={snapshot.items.map((item, index) => <MobileCard key={item.id ?? index}><strong className="wrap-anywhere">{item.description}</strong><MobileField label="Quantity" value={item.quantity} /><MobileField label="Unit price" value={formatCurrency(item.unit_price)} /><MobileField label="Line total" value={formatCurrency(item.line_total)} /></MobileCard>)} columns={['Description', 'Qty', 'Unit Price', 'Total']} rows={snapshot.items.map((item) => [item.description, item.quantity, formatCurrency(item.unit_price), formatCurrency(item.line_total)])} />
            </section>)}
          </details>)}
        </CardContent>
      </Card>}
      {correctionOpen && <SaleForm clientContext={clientContext} open={correctionOpen} sale={sale} onClose={() => setCorrectionOpen(false)} onSaved={() => { setCorrectionOpen(false); loadData() }} onReload={() => { setCorrectionOpen(false); loadData() }} />}
      <SendInvoiceDialog
        key={`${id}-${client?.email || ''}`}
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        saleId={Number(id)}
        clientEmail={client?.email || ''}
        invoiceNumber={invoiceNumber}
      />

      {/* Record Payment Dialog */}
      <PaymentForm
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        saleId={Number(id)}
        context={`${clientContext} · Sale #${sale.id} · ${invoiceNumber}`}
        remainingBalance={history ? Number(history.remaining_balance) : null}
        onSaved={() => { setPaymentOpen(false); loadData() }}
      />

      {voidingPayment && (
        <VoidPaymentDialog
          clientContext={clientContext}
          saleId={sale.id}
          payment={voidingPayment}
          onClose={() => setVoidingPayment(null)}
          onSaved={() => { setVoidingPayment(null); loadData() }}
        />
      )}
    </div>
  )
}
