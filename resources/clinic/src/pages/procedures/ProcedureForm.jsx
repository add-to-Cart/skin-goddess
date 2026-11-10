import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import proceduresService from '@/services/proceduresService'
import clientsService from '@/services/clientsService'
import servicesService from '@/services/servicesService'
import salesService from '@/services/salesService'
import { todayISO } from '@/lib/utils'
import FormDialog, { FormField } from '@/components/shared/FormDialog'
import { Input } from '@/components/ui/input'
import SearchSelect from '@/components/shared/SearchSelect'
import { clientLabel, serviceLabel } from '@/lib/lookupLabels'

export default function ProcedureForm({ open, onClose, onSaved, procedure = null, defaultClientId = null, serviceMap = null, clientName = '' }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ client_id: '', service_id: '', procedure_date: todayISO(), next_follow_up: '', notes: '' })
  const [selectedService, setSelectedService] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [billingMode, setBillingMode] = useState('ordinary')
  const [packages, setPackages] = useState([])
  const [packageId, setPackageId] = useState('')
  const editing = Boolean(procedure)
  const keepsRecordedPrice = editing && form.service_id === String(procedure.service_id)
  const price = keepsRecordedPrice ? procedure.price : selectedService?.default_price

  useEffect(() => {
    if (!open) return
    setError(null)
    setBillingMode('ordinary')
    setPackageId('')
    setSelectedService(null)
    setForm(procedure ? {
      client_id: String(procedure.client_id), service_id: String(procedure.service_id), procedure_date: procedure.procedure_date,
      next_follow_up: procedure.next_follow_up ?? '', notes: procedure.notes ?? '',
    } : { client_id: defaultClientId ? String(defaultClientId) : '', service_id: '', procedure_date: todayISO(), next_follow_up: '', notes: '' })
  }, [open, procedure, defaultClientId, serviceMap, editing])

  useEffect(() => {
    if (!open || editing || billingMode !== 'package' || !form.client_id) return
    let active = true
    salesService.getAll({ client_id: form.client_id }).then((rows) => { if (active) setPackages(rows.filter((sale) => sale.package_service_id)) }).catch((failure) => { if (active) setError(`Package choices could not be loaded: ${failure.message}`) })
    return () => { active = false }
  }, [open, editing, billingMode, form.client_id])

  const set = (field) => (value) => setForm((current) => ({ ...current, [field]: value }))
  async function submit(event) {
    event.preventDefault()
    if (saving) return
    if (!editing && billingMode === 'package') {
      if (!packageId || !packages.some((sale) => String(sale.id) === packageId && String(sale.client_id) === form.client_id)) { setError('Choose the exact purchased package.'); return }
      onClose()
      navigate(`/sales/${packageId}`)
      return
    }
    if (!form.client_id || !form.service_id) { setError('Choose a client and treatment.'); return }
    setSaving(true); setError(null)
    const payload = { ...form, service_id: Number(form.service_id), next_follow_up: form.next_follow_up || null, notes: form.notes.trim() || null }
    if (!editing) payload.client_id = Number(form.client_id)
    try { editing ? await proceduresService.update(procedure.id, payload) : await proceduresService.create(payload); onSaved() } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return <FormDialog open={open} onClose={onClose} title={editing ? 'Edit Treatment Record' : 'Record Treatment'} description={clientName ? `${clientName} · Client #${defaultClientId ?? procedure?.client_id}` : undefined} onSubmit={submit} submitting={saving} submitLabel={billingMode === 'package' ? 'Open Purchased Package' : 'Save'} error={error}>
    {!editing && <FormField label="Treatment entry"><select aria-label="Treatment entry" className="w-full rounded-md border p-2" value={billingMode} onChange={(event) => { setBillingMode(event.target.value); setPackageId(''); setPackages([]); setError(null) }}><option value="ordinary">Standalone treatment record</option><option value="package">Use a purchased package</option></select></FormField>}
    {!editing && !defaultClientId && <FormField label="Client" required><SearchSelect searchHint="Name, phone or #ID — at least 2 characters." aria-label="Client" value={form.client_id} search={clientsService.lookup} getLabel={clientLabel} onChange={(value) => { set('client_id')(value); setPackageId(''); setPackages([]) }} /></FormField>}
    {!editing && billingMode === 'package' ? <>
      <FormField label="Purchased package" required><select aria-label="Purchased package" className="w-full rounded-md border p-2" value={packageId} onChange={(event) => setPackageId(event.target.value)}><option value="">Choose the exact purchase</option>{packages.filter((sale) => String(sale.client_id) === form.client_id).map((sale) => <option key={sale.id} value={sale.id}>Purchase #{sale.id} · {sale.sale_date} · {sale.items[0]?.description} · {sale.included_sessions} included{sale.canceled_at ? ' · Canceled' : ''}</option>)}</select></FormField>
      <p className="text-sm">Open the purchase to review its balance, valid sessions and cancellation status before recording completion. Included sessions create no additional bill.</p>
    </> : <>
    <FormField label="Treatment or Service" required><SearchSelect aria-label="Treatment or Service" value={form.service_id} search={servicesService.lookup} getLabel={serviceLabel} selectedLabel={serviceMap?.[form.service_id]} minLength={1} onChange={(value, service) => { set('service_id')(value); setSelectedService(service) }} /></FormField>
    <FormField label="Date" required><Input type="date" value={form.procedure_date} onChange={(e) => set('procedure_date')(e.target.value)} /></FormField>
    <FormField label={keepsRecordedPrice ? 'Recorded price (₱)' : 'Catalog price (₱)'} hint={keepsRecordedPrice ? undefined : 'Set in Treatment & Services.'}>
      <Input readOnly value={form.service_id ? price ?? (keepsRecordedPrice ? 'No price recorded' : 'No catalog price set') : ''} placeholder="Select a treatment or service" />
    </FormField>
    <FormField label="Return date" hint="For a scheduled reminder, use Follow-ups."><Input type="date" value={form.next_follow_up} onChange={(e) => set('next_follow_up')(e.target.value)} /></FormField>
    <FormField label="Notes"><Input value={form.notes} onChange={(e) => set('notes')(e.target.value)} /></FormField>
    </>}
  </FormDialog>
}
