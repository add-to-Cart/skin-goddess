import { useEffect, useState } from 'react'
import proceduresService from '@/services/proceduresService'
import clientsService from '@/services/clientsService'
import servicesService from '@/services/servicesService'
import { todayISO } from '@/lib/utils'
import FormDialog, { FormField } from '@/components/shared/FormDialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function ProcedureForm({ open, onClose, onSaved, procedure = null, defaultClientId = null, serviceMap = null }) {
  const [clients, setClients] = useState([])
  const [services, setServices] = useState([])
  const [form, setForm] = useState({ client_id: '', service_id: '', procedure_date: todayISO(), price: '', next_follow_up: '', notes: '' })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const editing = Boolean(procedure)

  useEffect(() => {
    if (!open) return
    Promise.all([editing || defaultClientId ? Promise.resolve([]) : clientsService.getAll(), serviceMap ? Promise.resolve([]) : servicesService.getAll(true)])
      .then(([clientRows, serviceRows]) => { setClients(clientRows); setServices(serviceRows) })
      .catch((e) => setError(e.message))
    setError(null)
    setForm(procedure ? {
      client_id: String(procedure.client_id), service_id: String(procedure.service_id), procedure_date: procedure.procedure_date,
      price: procedure.price ?? '', next_follow_up: procedure.next_follow_up ?? '', notes: procedure.notes ?? '',
    } : { client_id: defaultClientId ? String(defaultClientId) : '', service_id: '', procedure_date: todayISO(), price: '', next_follow_up: '', notes: '' })
  }, [open, procedure, defaultClientId, serviceMap])

  const choices = serviceMap ? Object.entries(serviceMap).map(([id, name]) => ({ id, name })) : services
  const set = (field) => (value) => setForm((current) => ({ ...current, [field]: value }))
  async function submit(event) {
    event.preventDefault()
    if (!editing && (!form.client_id || !form.service_id)) { setError('Choose a client and treatment.'); return }
    setSaving(true); setError(null)
    const payload = { ...form, service_id: Number(form.service_id), price: form.price === '' ? null : Number(form.price), next_follow_up: form.next_follow_up || null, notes: form.notes.trim() || null }
    if (!editing) payload.client_id = Number(form.client_id)
    try { editing ? await proceduresService.update(procedure.id, payload) : await proceduresService.create(payload); onSaved() } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return <FormDialog open={open} onClose={onClose} title={editing ? 'Edit Treatment Record' : 'Record Treatment'} onSubmit={submit} submitting={saving} submitLabel="Save" error={error}>
    {!editing && <FormField label="Client" required><Select value={form.client_id} onValueChange={set('client_id')}><SelectTrigger><SelectValue placeholder="Choose client" /></SelectTrigger><SelectContent>{clients.map((client) => <SelectItem key={client.id} value={String(client.id)}>{client.first_name} {client.last_name}</SelectItem>)}</SelectContent></Select></FormField>}
    <FormField label="Treatment or Service" required><Select value={form.service_id} onValueChange={set('service_id')}><SelectTrigger><SelectValue placeholder="Choose treatment" /></SelectTrigger><SelectContent>{choices.map((service) => <SelectItem key={service.id} value={String(service.id)}>{service.name}</SelectItem>)}</SelectContent></Select></FormField>
    <FormField label="Date" required><Input type="date" value={form.procedure_date} onChange={(e) => set('procedure_date')(e.target.value)} /></FormField>
    <FormField label="Price charged"><Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set('price')(e.target.value)} /></FormField>
    <FormField label="Follow-up date"><Input type="date" value={form.next_follow_up} onChange={(e) => set('next_follow_up')(e.target.value)} /></FormField>
    <FormField label="Notes"><Input value={form.notes} onChange={(e) => set('notes')(e.target.value)} /></FormField>
  </FormDialog>
}
