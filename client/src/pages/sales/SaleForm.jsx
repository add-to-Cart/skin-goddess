import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import salesService from '@/services/salesService'
import clientsService from '@/services/clientsService'
import servicesService from '@/services/servicesService'
import { formatCurrency, todayISO } from '@/lib/utils'
import FormDialog, { FormField } from '@/components/shared/FormDialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

/**
 * SaleForm — create a new sale with line items.
 *
 * Props:
 *   open             — boolean
 *   onClose          — () => void
 *   onSaved          — (sale) => void
 *   defaultClientId  — pre-select client (optional)
 */
export default function SaleForm({ open, onClose, onSaved, defaultClientId = null }) {
  const [clients, setClients]   = useState([])
  const [services, setServices] = useState([])

  const [clientId, setClientId] = useState('')
  const [date, setDate]         = useState(todayISO())
  const [notes, setNotes]       = useState('')
  const [items, setItems]       = useState([{ description: '', quantity: '1', unit_price: '' }])

  const [errors, setErrors]     = useState({})
  const [apiError, setApiError] = useState(null)
  const [submitting, setSubmit] = useState(false)

  useEffect(() => {
    if (!open) return
    const clientsP  = defaultClientId ? Promise.resolve(null) : clientsService.getAll()
    const servicesP = servicesService.getAll(true)
    Promise.all([clientsP, servicesP]).then(([cls, svcs]) => {
      if (cls) setClients(cls)
      setServices(svcs)
    })

    setClientId(defaultClientId ? String(defaultClientId) : '')
    setDate(todayISO())
    setNotes('')
    setItems([{ description: '', quantity: '1', unit_price: '' }])
    setErrors({})
    setApiError(null)
  }, [open])

  function addItem() {
    setItems((prev) => [...prev, { description: '', quantity: '1', unit_price: '' }])
  }

  function removeItem(i) {
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateItem(i, field, value) {
    setItems((prev) => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row))
  }

  // Fill description when service is selected
  function pickService(i, serviceId) {
    const svc = services.find((s) => String(s.id) === serviceId)
    if (!svc) return
    updateItem(i, 'description', svc.name)
    if (svc.default_price != null) updateItem(i, 'unit_price', String(svc.default_price))
  }

  const lineTotal  = (row) => {
    const q = parseFloat(row.quantity) || 0
    const p = parseFloat(row.unit_price) || 0
    return q * p
  }
  const grandTotal = items.reduce((sum, row) => sum + lineTotal(row), 0)

  function validate() {
    const e = {}
    if (!clientId) e.clientId = 'Select a client.'
    if (!date)     e.date     = 'Sale date is required.'
    if (items.length === 0) e.items = 'Add at least one line item.'
    items.forEach((row, i) => {
      if (!row.description.trim()) e[`desc_${i}`] = 'Description required.'
      if (!row.quantity || parseFloat(row.quantity) <= 0) e[`qty_${i}`] = 'Enter qty > 0.'
      if (!row.unit_price || parseFloat(row.unit_price) < 0) e[`price_${i}`] = 'Enter price ≥ 0.'
    })
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const v = validate()
    if (Object.keys(v).length) { setErrors(v); return }

    const payload = {
      client_id: Number(clientId),
      sale_date: date,
      notes: notes.trim() || null,
      items: items.map((row) => ({
        description: row.description.trim(),
        quantity: parseFloat(row.quantity),
        unit_price: parseFloat(row.unit_price),
      })),
    }

    setSubmit(true)
    setApiError(null)
    try {
      const saved = await salesService.create(payload)
      onSaved(saved)
    } catch (err) {
      setApiError(err.message)
    } finally {
      setSubmit(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="New Sale"
      description="Record a sale transaction. Add one or more line items."
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel="Create Sale"
      error={apiError}
    >
      {/* Client */}
      {!defaultClientId && (
        <FormField label="Client" required error={errors.clientId}>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger>
              <SelectValue placeholder="Select client…" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.first_name} {c.last_name}{c.phone ? ` — ${c.phone}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}

      {/* Date */}
      <FormField label="Sale Date" required error={errors.date}>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </FormField>

      {/* Line items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            Line Items
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={addItem}>
            <Plus className="h-3.5 w-3.5" /> Add item
          </Button>
        </div>
        {errors.items && (
          <p className="text-xs mb-2" style={{ color: 'var(--color-danger)' }}>{errors.items}</p>
        )}
        {items.map((row, i) => (
          <div key={i} className="mb-3 p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}>
            {/* Quick-pick service */}
            {services.length > 0 && (
              <div className="mb-2">
                <Select onValueChange={(v) => pickService(i, v)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Pick from services (optional)…" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-[1fr_64px_80px_28px] gap-2 items-start">
              <div>
                <Input
                  placeholder="Description"
                  value={row.description}
                  onChange={(e) => updateItem(i, 'description', e.target.value)}
                  className={errors[`desc_${i}`] ? 'border-[var(--color-danger)]' : ''}
                />
                {errors[`desc_${i}`] && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-danger)' }}>
                    {errors[`desc_${i}`]}
                  </p>
                )}
              </div>
              <div>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Qty"
                  value={row.quantity}
                  onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                  className={errors[`qty_${i}`] ? 'border-[var(--color-danger)]' : ''}
                />
              </div>
              <div>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Price"
                  value={row.unit_price}
                  onChange={(e) => updateItem(i, 'unit_price', e.target.value)}
                  className={errors[`price_${i}`] ? 'border-[var(--color-danger)]' : ''}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeItem(i)}
                disabled={items.length === 1}
                aria-label="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--color-danger)' }} />
              </Button>
            </div>
            <p className="text-xs text-right mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {formatCurrency(lineTotal(row))}
            </p>
          </div>
        ))}
        {/* Grand total preview */}
        <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Total</span>
          <span className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
            {formatCurrency(grandTotal)}
          </span>
        </div>
      </div>

      {/* Notes */}
      <FormField label="Notes">
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes…"
        />
      </FormField>
    </FormDialog>
  )
}
