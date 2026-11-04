import { useState } from 'react'
import salesService from '@/services/salesService'
import inventoryService from '@/services/inventoryService'
import authService from '@/services/authService'
import { todayISO } from '@/lib/utils'
import { newPackageRequestKey, readPendingPackage, savePendingPackage, clearPendingPackage, packageRequestMayHaveSaved } from '@/lib/packageRequests'
import FormDialog, { FormField } from '@/components/shared/FormDialog'
import SearchSelect from '@/components/shared/SearchSelect'
import { supplyLabel } from '@/lib/lookupLabels'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function PackageSessionForm({ sale, treatmentName, clientContext = '', remainingSessions, onClose, onSaved, onReload }) {
  const storageKey = `sg_package_completion_${authService.getUsername()}_${sale.id}`
  const [initial] = useState(() => {
    try { return { pending: readPendingPackage(storageKey) } }
    catch { return { error: 'The saved completion could not be read. Review the package history before discarding the pending request.' } }
  })
  const [pending, setPending] = useState(initial.pending ?? null)
  const [ready, setReady] = useState(!initial.error)
  const [reviewed, setReviewed] = useState(false)
  const [date, setDate] = useState(initial.pending?.procedure_date ?? todayISO())
  const [notes, setNotes] = useState(initial.pending?.notes ?? '')
  const [followUp, setFollowUp] = useState(initial.pending?.next_follow_up ?? '')
  const [supplies, setSupplies] = useState(initial.pending?.supplies ?? [])
  const [noneUsed, setNoneUsed] = useState(initial.pending ? initial.pending.supplies.length === 0 : false)
  const [inventory, setInventory] = useState([])
  const [error, setError] = useState(initial.error ?? null)
  const [saving, setSaving] = useState(false)

  function updateSupply(index, field, value) {
    setSupplies((rows) => rows.map((row, position) => position === index ? { ...row, [field]: value } : row))
  }

  async function submit(event) {
    event.preventDefault()
    if (!ready || saving) return
    if (!pending) {
      if (!date || date > todayISO()) { setError('Enter the date of a completed treatment, today or earlier.'); return }
      if (!noneUsed && supplies.length === 0) { setError('Add actual supplies used, or confirm that no additional supplies were used.'); return }
      if (!noneUsed && supplies.some((row) => !row.inventory_item_id || !Number.isFinite(Number(row.quantity_used)) || Number(row.quantity_used) <= 0 || !/^\d+(\.\d{1,3})?$/.test(String(row.quantity_used)))) { setError('Choose each supply and enter a positive quantity with up to three decimal places.'); return }
      if (new Set(supplies.map((row) => String(row.inventory_item_id))).size !== supplies.length) { setError('Combine quantities for the same supply into one row.'); return }
    }
    const payload = pending ?? {
      client_id: sale.client_id,
      service_id: sale.package_service_id,
      procedure_date: date,
      next_follow_up: followUp || null,
      notes: notes.trim() || null,
      completion_key: newPackageRequestKey(),
      supplies: noneUsed ? [] : supplies.map((row) => ({ inventory_item_id: Number(row.inventory_item_id), quantity_used: row.quantity_used })),
    }
    setSaving(true)
    setError(null)
    try {
      savePendingPackage(storageKey, payload)
      setPending(payload)
      const saved = await salesService.completeSession(sale.id, payload)
      clearPendingPackage(storageKey)
      onSaved(saved)
    } catch (failure) {
      if (!packageRequestMayHaveSaved(failure)) { clearPendingPackage(storageKey); setPending(null) }
      setError(failure.message)
    } finally { setSaving(false) }
  }

  return <FormDialog open onClose={onClose} title="Complete Package Session" description={`${clientContext ? `${clientContext} · ` : ''}Purchase #${sale.id} · ${treatmentName}${remainingSessions != null ? ` · ${remainingSessions} remaining sessions` : ''}. This records an actual completed visit without another sale or charge.`} onSubmit={submit} submitting={saving} submitDisabled={!ready} submitLabel={pending ? 'Retry Pending Completion' : 'Record Completed Session'} error={error}>
    {(pending || !ready) && <section className="rounded-lg border p-3 text-sm" role="status">
      <p>A completion is pending confirmation. Retry the original request to check its result. It will not deduct supplies twice.</p>
      <label className="flex items-center gap-2 mt-3"><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />I reviewed this package’s session history before discarding this request.</label>
      <Button type="button" variant="outline" disabled={!reviewed || saving} onClick={() => { clearPendingPackage(storageKey); setPending(null); setReady(true); setReviewed(false); setError(null) }}>Discard pending request</Button>
    </section>}
    <p className="text-sm">If correcting a reversed entry, do not deduct supplies that are already recorded in its history.</p>
    <fieldset disabled={saving || Boolean(pending) || !ready} className="contents">
      <FormField label="Completed treatment date" required><Input aria-label="Completed treatment date" type="date" max={todayISO()} value={date} onChange={(event) => setDate(event.target.value)} /></FormField>
      <FormField label="Follow-up date"><Input aria-label="Package follow-up date" type="date" value={followUp} onChange={(event) => setFollowUp(event.target.value)} /></FormField>
      <FormField label="Treatment notes"><Input aria-label="Treatment notes" value={notes} onChange={(event) => setNotes(event.target.value)} /></FormField>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={noneUsed} onChange={(event) => { setNoneUsed(event.target.checked); if (event.target.checked) setSupplies([]) }} />No additional supplies used</label>
      {!noneUsed && <section className="flex flex-col gap-3" aria-label="Supplies used">
        {supplies.map((row, index) => <div key={index} className="rounded-lg border p-3 flex flex-col gap-2">
          <FormField label={`Supply ${index + 1}`}><SearchSelect aria-label={`Supply ${index + 1}`} value={row.inventory_item_id} search={inventoryService.lookup} getLabel={supplyLabel} selectedLabel={inventory.find((item) => String(item.id) === String(row.inventory_item_id))?.name} minLength={1} onChange={(value, item) => { updateSupply(index, 'inventory_item_id', value); if (item) setInventory((items) => [...items.filter((entry) => entry.id !== item.id), item]) }} /></FormField>
          <FormField label={`Quantity used ${index + 1}${inventory.find((item) => String(item.id) === String(row.inventory_item_id))?.unit ? ` (${inventory.find((item) => String(item.id) === String(row.inventory_item_id)).unit})` : ''}`}><Input aria-label={`Quantity used ${index + 1}${inventory.find((item) => String(item.id) === String(row.inventory_item_id))?.unit ? ` (${inventory.find((item) => String(item.id) === String(row.inventory_item_id)).unit})` : ''}`} type="number" min="0.001" step="0.001" value={row.quantity_used} onChange={(event) => updateSupply(index, 'quantity_used', event.target.value)} /></FormField>
          <Button type="button" variant="ghost" onClick={() => setSupplies((rows) => rows.filter((_, position) => position !== index))}>Remove supply {index + 1}</Button>
        </div>)}
        <Button type="button" variant="outline" onClick={() => setSupplies((rows) => [...rows, { inventory_item_id: '', quantity_used: '' }])}>Add supply</Button>
      </section>}
    </fieldset>
    {error && <Button type="button" variant="outline" disabled={saving} onClick={onReload}>Close and refresh package history</Button>}
  </FormDialog>
}
