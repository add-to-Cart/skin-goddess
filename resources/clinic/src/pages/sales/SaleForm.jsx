import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import salesService from '@/services/salesService'
import clientsService from '@/services/clientsService'
import servicesService from '@/services/servicesService'
import authService from '@/services/authService'
import { newPackageRequestKey, readPendingPackage, savePendingPackage, clearPendingPackage, packageRequestMayHaveSaved } from '@/lib/packageRequests'
import { formatCurrency, todayISO } from '@/lib/utils'
import FormDialog, { FormField } from '@/components/shared/FormDialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import SearchSelect from '@/components/shared/SearchSelect'
import { clientLabel, serviceLabel } from '@/lib/lookupLabels'

export default function SaleForm({ open, onClose, onSaved, defaultClientId = null, sale = null, onReload = null, clientContext = '' }) {
  const correcting = Boolean(sale)
  const [clientId, setClientId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')
  const [items, setItems] = useState([{ description: '', quantity: '1', unit_price: '' }])
  const [packageMode, setPackageMode] = useState(false)
  const [packageServiceId, setPackageServiceId] = useState('')
  const [includedSessions, setIncludedSessions] = useState('')
  const [pending, setPending] = useState(null)
  const [reviewed, setReviewed] = useState(false)
  const [storageReady, setStorageReady] = useState(false)
  const pendingKey = `sg_package_purchase_${authService.getUsername()}`
  const isPackage = correcting ? Boolean(sale.package_service_id) : packageMode
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState(null)
  const [submitting, setSubmit] = useState(false)

  useEffect(() => {
    if (!open) return
    setClientId(defaultClientId ? String(defaultClientId) : '')
    setDate(sale?.sale_date ?? todayISO())
    setNotes(sale?.notes ?? '')
    setReason('')
    setItems(sale ? sale.items.map((item) => ({ id: item.id, description: item.description, quantity: String(item.quantity), unit_price: String(item.unit_price) })) : [{ description: '', quantity: '1', unit_price: '' }])
    setErrors({})
    setApiError(null)
    setPackageMode(Boolean(sale?.package_service_id))
    setPackageServiceId(String(sale?.package_service_id ?? ''))
    setIncludedSessions(String(sale?.included_sessions ?? ''))
    setPending(null)
    setReviewed(false)
    setStorageReady(false)
    try {
      const saved = correcting ? null : readPendingPackage(pendingKey)
      if (saved) {
        setPending(saved)
        setPackageMode(true)
        setClientId(String(saved.client_id))
        setDate(saved.sale_date)
        setNotes(saved.notes ?? '')
        setItems(saved.items.map((item) => ({ ...item, quantity: '1', unit_price: String(item.unit_price) })))
        setPackageServiceId(String(saved.package_service_id))
        setIncludedSessions(String(saved.included_sessions))
      }
      setStorageReady(true)
    } catch {
      setApiError('Pending purchase could not be read. Review sales history before clearing browser storage or starting another purchase.')
    }
  }, [open, sale, defaultClientId, correcting, pendingKey])

  function updateItem(index, field, value) {
    setItems((rows) => rows.map((row, position) => position === index ? { ...row, [field]: value } : row))
  }
  const lineTotal = (row) => (parseFloat(row.quantity) || 0) * (parseFloat(row.unit_price) || 0)
  const grandTotal = items.reduce((sum, row) => sum + lineTotal(row), 0)
  function validate() {
    const validation = {}
    if (!correcting && !clientId) validation.clientId = 'Select a client.'
    if (correcting && !reason.trim()) validation.reason = 'Enter the reason for this correction.'
    if (!date) validation.date = 'Sale date is required.'
    if (items.length === 0) validation.items = 'Add at least one line item.'
    if (isPackage && !correcting && !packageServiceId) validation.packageServiceId = 'Choose the purchased treatment.'
    if (isPackage && !correcting && (!Number.isInteger(Number(includedSessions)) || Number(includedSessions) < 1 || Number(includedSessions) > 2147483647)) validation.includedSessions = 'Enter a positive whole number of sessions.'
    items.forEach((row, index) => {
      if (!row.description.trim()) validation[`desc_${index}`] = 'Description required.'
      if (!row.quantity || parseFloat(row.quantity) <= 0) validation[`qty_${index}`] = 'Enter qty > 0.'
      if (!row.unit_price || parseFloat(row.unit_price) < 0) validation[`price_${index}`] = 'Enter price ≥ 0.'
    })
    return validation
  }
  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting || (isPackage && !correcting && !storageReady)) return
    const validation = validate()
    if (Object.keys(validation).length) { setErrors(validation); return }
    const payload = { sale_date: date, notes: notes.trim() || null, items: items.map((row) => ({ ...(correcting && row.id ? { id: row.id } : {}), description: row.description.trim(), quantity: parseFloat(row.quantity), unit_price: parseFloat(row.unit_price) })) }
    if (correcting) {
      payload.reason = reason.trim()
      payload.expected_version = sale.version
    } else {
      payload.client_id = Number(clientId)
      if (isPackage) {
        payload.package_service_id = Number(packageServiceId)
        payload.included_sessions = Number(includedSessions)
        payload.package_purchase_key = newPackageRequestKey()
      }
    }
    setSubmit(true)
    setApiError(null)
    try {
      const submitted = pending ?? payload
      if (isPackage && !correcting) { savePendingPackage(pendingKey, submitted); setPending(submitted) }
      const saved = correcting ? await salesService.update(sale.id, payload) : await salesService.create(submitted)
      if (isPackage && !correcting) { clearPendingPackage(pendingKey); setPending(null) }
      onSaved(saved)
    } catch (error) {
      if (isPackage && !correcting && !packageRequestMayHaveSaved(error)) { clearPendingPackage(pendingKey); setPending(null) }
      setApiError(error.message)
    } finally { setSubmit(false) }
  }

  return <FormDialog open={open} onClose={onClose} title={correcting ? 'Correct Sale' : 'New Sale'} description={correcting ? 'Client and purchased entitlement stay fixed. A reason and original values are retained; existing payments stay unchanged. The corrected total cannot be below recorded payments.' : 'Record an ordinary sale or one purchased treatment package.'} onSubmit={handleSubmit} submitting={submitting} submitLabel={correcting ? 'Save Correction' : pending ? 'Retry Pending Purchase' : isPackage ? 'Purchase Package' : 'Create Sale'} error={apiError}>
    {clientContext && <p className="text-sm font-medium wrap-anywhere">{clientContext}{correcting ? ` · Sale #${sale.id}` : ''}</p>}
    {pending && <div className="rounded-lg border p-3 text-sm" role="status">
      <p>A purchase for client #{pending.client_id} is pending confirmation. Retry the same request to check its result; fields stay locked.</p>
      <a href="/sales" target="_blank" rel="noreferrer" className="underline">Review sales history in another tab</a>
      <label className="flex items-center gap-2 mt-3"><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />I reviewed the history and want to discard this pending request.</label>
      <Button type="button" variant="outline" disabled={!reviewed || submitting} onClick={() => { clearPendingPackage(pendingKey); setPending(null); setReviewed(false); setApiError(null) }}>Discard pending request</Button>
    </div>}
    <fieldset disabled={submitting || Boolean(pending)} className="contents">
      {!correcting && <FormField label="Sale type"><select value={packageMode ? 'package' : 'ordinary'} className="w-full rounded-md border p-2" onChange={(event) => { const selected = event.target.value === 'package'; setPackageMode(selected); if (selected) setItems([{ description: '', quantity: '1', unit_price: '' }]) }}><option value="ordinary">Ordinary sale</option><option value="package">Treatment package</option></select></FormField>}
      {!defaultClientId && !correcting && <FormField label="Client" required error={errors.clientId}><SearchSelect searchHint="Name, phone or #ID — at least 2 characters." aria-label="Client" value={clientId} onChange={setClientId} search={clientsService.lookup} getLabel={clientLabel} /></FormField>}
      {defaultClientId && !correcting && !clientContext && <p className="text-sm">Client #{clientId}</p>}
      {isPackage && !correcting && <>
        <FormField label="Purchased treatment" required error={errors.packageServiceId}><SearchSelect aria-label="Purchased treatment" value={packageServiceId} onChange={(value, service) => { setPackageServiceId(value); if (service) updateItem(0, 'description', `${service.name} package`) }} search={servicesService.lookup} getLabel={serviceLabel} minLength={1} /></FormField>
        <FormField label="Included sessions" required error={errors.includedSessions}><Input type="number" min="1" step="1" value={includedSessions} onChange={(event) => setIncludedSessions(event.target.value)} /></FormField>
        <p className="text-sm">Enter the full package price once. No supplies are deducted at purchase.</p>
      </>}
      {correcting && isPackage && <p className="text-sm">Purchased allowance: {sale.included_sessions} sessions. Treatment and allowance cannot be changed here.</p>}
      <FormField label="Sale Date" required error={errors.date}><Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></FormField>
      <section aria-label="Sale items">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2"><h3 className="text-sm font-medium">{isPackage ? 'Package purchase' : 'Line items'}</h3>{!isPackage && <Button type="button" variant="ghost" size="sm" onClick={() => setItems((rows) => [...rows, { description: '', quantity: '1', unit_price: '' }])}><Plus />Add item</Button>}</div>
        {errors.items && <p role="alert">{errors.items}</p>}
        {items.map((row, index) => <div key={index} className="mb-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]">
          {!isPackage && !correcting && <div className="mb-3"><FormField label="Use catalog price (optional)"><SearchSelect aria-label={`Catalog item ${index + 1}`} value="" search={servicesService.lookup} getLabel={serviceLabel} minLength={1} onChange={(_, service) => { if (service) { updateItem(index, 'description', service.name); if (service.default_price != null) updateItem(index, 'unit_price', String(service.default_price)) } }} /></FormField></div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 items-start">
            <div className="sm:col-span-2"><FormField label="Description" required error={errors[`desc_${index}`]}><Input value={row.description} onChange={(event) => updateItem(index, 'description', event.target.value)} /></FormField></div>
            {!isPackage && <FormField label="Quantity" required error={errors[`qty_${index}`]}><Input type="number" min="0.001" step="0.001" value={row.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} /></FormField>}
            <FormField label={isPackage ? 'Full package price (₱)' : 'Unit price (₱)'} required error={errors[`price_${index}`]}><Input type="number" min="0" step="0.01" value={row.unit_price} onChange={(event) => updateItem(index, 'unit_price', event.target.value)} /></FormField>
            {!isPackage && <Button type="button" variant="ghost" className="justify-self-start" onClick={() => setItems((rows) => rows.filter((_, position) => position !== index))} disabled={items.length === 1} aria-label={`Remove item ${index + 1}`}><Trash2 />Remove item</Button>}
          </div><p className="text-sm text-right mt-2">Line total: {formatCurrency(lineTotal(row))}</p>
        </div>)}
        <div className="flex flex-wrap justify-between gap-2 pt-2 border-t border-[var(--color-border)]"><span>{correcting ? 'Corrected billed total' : 'Billed total'}</span><strong>{formatCurrency(grandTotal)}</strong></div>
        {correcting && <p className="text-sm mt-2">Original billed total: {formatCurrency(sale.total_amount)}. Existing payments stay unchanged.</p>}
      </section>
      <FormField label="Notes"><Input value={notes} onChange={(event) => setNotes(event.target.value)} /></FormField>
      {correcting && <FormField label="Correction Reason" hint="Explain the error and why it is changing." required error={errors.reason}><textarea className="w-full rounded-md border p-3 text-sm" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000} /></FormField>}
    </fieldset>
    {correcting && apiError && onReload && <Button type="button" variant="outline" onClick={onReload} disabled={submitting}>Discard edits and reload sale</Button>}
  </FormDialog>
}
