import { useState } from 'react'
import salesService from '@/services/salesService'
import authService from '@/services/authService'
import { readPendingPackage } from '@/lib/packageRequests'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import FormDialog, { FormField } from '@/components/shared/FormDialog'
import PackageSessionForm from '../procedures/PackageSessionForm'

function PackageAuditDialog({ sale, progress, procedure, clientContext, onClose, onSaved }) {
  const reversing = Boolean(procedure)
  const [reason, setReason] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [version] = useState(progress.version)
  async function submit(event) {
    event.preventDefault()
    if (saving || blocked) return
    if (!reason.trim()) { setError('Enter the administrator review reason.'); return }
    setSaving(true)
    setError(null)
    try {
      const data = { reason: reason.trim(), expected_version: version }
      if (reversing) await salesService.reverseSession(sale.id, procedure.id, data)
      else await salesService.cancelPackage(sale.id, data)
      onSaved()
    } catch (failure) {
      setError(failure.message)
      if (failure.status === 409) setBlocked(true)
    } finally { setSaving(false) }
  }
  return <FormDialog open onClose={onClose} title={reversing ? `Reverse Session #${procedure.session_number}` : 'Cancel Package'} description={reversing ? 'Only reverse an incorrect completion. Its original history remains and one session returns to the allowance. Consumed supplies are not restored.' : 'Stops all new sessions. Payments, debt and consumed supplies remain unchanged. No refund is calculated. This cannot be reopened here.'} onSubmit={submit} submitting={saving} submitDisabled={blocked} submitLabel={reversing ? 'Reverse Incorrect Session' : 'Confirm Package Cancellation'} error={error}>
    <p className="text-sm font-medium wrap-anywhere">{clientContext} · Purchase #{sale.id}{procedure ? ` · History #${procedure.session_number}` : ''}</p>
    <FormField label={reversing ? 'Reversal reason' : 'Cancellation reason'} required><textarea className="w-full rounded-md border p-3 text-sm" aria-label={reversing ? 'Reversal reason' : 'Cancellation reason'} value={reason} maxLength={2000} onChange={(event) => setReason(event.target.value)} autoFocus /></FormField>
    {error && <Button type="button" variant="outline" disabled={saving} onClick={onSaved}>Reload and review package</Button>}
  </FormDialog>
}

const dateTime = (value) => new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })

export default function PackageSessions({ sale, progress, treatment, clientContext = '', onChanged }) {
  const [completing, setCompleting] = useState(false)
  const [audit, setAudit] = useState(null)
  const [hasPending] = useState(() => {
    try { return Boolean(readPendingPackage(`sg_package_completion_${authService.getUsername()}_${sale.id}`)) }
    catch { return true }
  })
  const isAdmin = authService.isAdmin()
  const canComplete = !progress.is_canceled && progress.remaining_sessions > 0 && treatment.is_active
  return <Card className="mb-5">
    <CardHeader className="flex-wrap gap-3"><CardTitle>Package Sessions</CardTitle><Badge variant={progress.is_canceled ? 'danger' : progress.remaining_sessions === 0 ? 'neutral' : 'success'}>{progress.is_canceled ? 'Canceled package' : progress.remaining_sessions === 0 ? 'All sessions used' : 'Active package'}</Badge></CardHeader>
    <CardContent className="flex flex-col gap-4">
      <p className="font-semibold">{treatment.name} · Purchase #{sale.id} · {sale.sale_date}</p>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm"><div><dt>Included</dt><dd className="text-xl font-semibold">{progress.included_sessions}</dd></div><div><dt>Completed</dt><dd className="text-xl font-semibold">{progress.completed_sessions}</dd></div><div><dt>{progress.is_canceled ? 'Unused (not redeemable)' : 'Remaining sessions'}</dt><dd className="text-xl font-semibold">{progress.remaining_sessions}</dd></div></dl>
      {progress.is_canceled && <div className="rounded-lg border p-3 text-sm" role="status"><p>Canceled by {progress.canceled_by?.username ?? `account #${progress.canceled_by_user_id}`} · {dateTime(progress.canceled_at)}</p><p>Reason: {progress.cancellation_reason}</p><p>No new sessions, refund, debt forgiveness or stock restoration.</p></div>}
      {!treatment.is_active && <p className="text-sm" role="status">This catalog treatment is inactive. Review its availability before recording a new session.</p>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={!canComplete && !hasPending} onClick={() => setCompleting(true)}>{hasPending ? 'Resolve Pending Completion' : 'Complete Package Session'}</Button>
        {isAdmin && !progress.is_canceled && <Button variant="outline" onClick={() => setAudit({ procedure: null })}>Cancel Package</Button>}
      </div>
      <details><summary className="min-h-11 cursor-pointer py-3 font-semibold">Session history ({progress.procedures.length} records)</summary>
      {progress.procedures.length === 0 && <p className="text-sm">No completed sessions recorded.</p>}
      {progress.procedures.map((procedure) => <article key={procedure.id} className="rounded-lg border p-3 flex flex-col gap-2">
        <div className="flex flex-wrap justify-between gap-2"><strong>Session #{procedure.session_number} · {procedure.procedure_date}</strong><Badge variant={procedure.reversed_at ? 'danger' : 'success'}>{procedure.reversed_at ? 'Reversed' : 'Completed'}</Badge></div>
        <p className="text-sm">Recorded by {procedure.completed_by?.username ?? `account #${procedure.completed_by_user_id}`} · {dateTime(procedure.created_at)}</p>
        {procedure.notes && <p className="text-sm">Notes: {procedure.notes}</p>}
        {procedure.next_follow_up && <p className="text-sm">Follow-up date: {procedure.next_follow_up} (reminders are scheduled separately).</p>}
        <details className="text-sm"><summary>Supplies recorded: {procedure.supplies_used.length}</summary><ul>{procedure.supplies_used.map((supply) => <li key={supply.id}>{supply.inventory_item?.name ?? `Supply #${supply.inventory_item_id}`} · {supply.quantity_used} {supply.inventory_item?.unit ?? ''}</li>)}</ul></details>
        {procedure.reversed_at && <p className="text-sm">Reversed by {procedure.reversed_by?.username ?? `account #${procedure.reversed_by_user_id}`} · {dateTime(procedure.reversed_at)} · Reason: {procedure.reversal_reason}. Supplies remain recorded.</p>}
        {isAdmin && !procedure.reversed_at && <Button variant="outline" size="sm" onClick={() => setAudit({ procedure })}>Reverse Session #{procedure.session_number}</Button>}
      </article>)}
      </details>
    </CardContent>
    {completing && <PackageSessionForm clientContext={clientContext} remainingSessions={progress.remaining_sessions} sale={sale} treatmentName={treatment.name} onClose={() => setCompleting(false)} onSaved={() => { setCompleting(false); onChanged() }} onReload={() => { setCompleting(false); onChanged() }} />}
    {audit && <PackageAuditDialog clientContext={clientContext} sale={sale} progress={progress} procedure={audit.procedure} onClose={() => setAudit(null)} onSaved={() => { setAudit(null); onChanged() }} />}
  </Card>
}
