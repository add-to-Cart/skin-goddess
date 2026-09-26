import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import proceduresService from '@/services/proceduresService'
import clientsService from '@/services/clientsService'
import servicesService from '@/services/servicesService'
import inventoryService from '@/services/inventoryService'
import { todayISO } from '@/lib/utils'
import FormDialog, { FormField } from '@/components/shared/FormDialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

/**
 * ProcedureForm — create OR edit a procedure.
 *
 * Create mode: procedure = null
 * Edit mode:   procedure = existing procedure object
 *
 * Edit mode uses PATCH /api/procedures/{id} for the core fields.
 * Supplies already on the procedure are shown read-only with a remove button
 * (DELETE /api/procedures/{id}/supplies/{supplyId}).
 * New supplies can be added (POST /api/procedures/{id}/supplies).
 *
 * Props:
 *   open                — boolean
 *   onClose             — () => void
 *   onSaved             — () => void
 *   procedure           — existing procedure object (edit mode) or null (create mode)
 *   defaultClientId     — pre-select a client in create mode (optional)
 *   existingProcedures  — all procedures for this client — used to suggest session # in create mode
 *   serviceMap          — { id: name } already loaded (optional, will fetch if missing)
 */
export default function ProcedureForm({
  open,
  onClose,
  onSaved,
  procedure = null,
  defaultClientId = null,
  existingProcedures = [],
  serviceMap: serviceMapProp = null,
}) {
  const isEdit = Boolean(procedure)

  // Reference data
  const [clients,   setClients]   = useState([])
  const [services,  setServices]  = useState([])
  const [inventory, setInventory] = useState([])

  // Core fields
  const [clientId,      setClientId]   = useState('')
  const [serviceId,     setServiceId]  = useState('')
  const [date,          setDate]       = useState(todayISO())
  const [sessionNumber, setSession]    = useState('')
  const [price,         setPrice]      = useState('')
  const [nextFollowUp,  setFollowUp]   = useState('')
  const [notes,         setNotes]      = useState('')

  // Supplies in CREATE mode — new rows to be submitted inline
  const [newSupplies, setNewSupplies] = useState([])

  // Supplies in EDIT mode
  // existingSupplyRows — already saved, each has { id, inventory_item_id, name, quantity_used }
  const [existingSupplyRows, setExistingSupplyRows] = useState([])
  // addSupplyRows — new rows to be POSTed individually after PATCH
  const [addSupplyRows, setAddSupplyRows] = useState([])
  // pendingRemovals — supply IDs to DELETE before returning
  const [pendingRemovals, setPendingRemovals] = useState([])

  // UI
  const [errors,     setErrors]     = useState({})
  const [apiError,   setApiError]   = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [loadingRef, setLoadingRef] = useState(false)

  // ── Populate on open ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setLoadingRef(true)
    setErrors({})
    setApiError(null)

    const clientsP  = (defaultClientId || isEdit) ? Promise.resolve(null) : clientsService.getAll()
    const servicesP = serviceMapProp               ? Promise.resolve(null) : servicesService.getAll(true)
    const invP      = inventoryService.getItems({ active_only: true })

    Promise.all([clientsP, servicesP, invP])
      .then(([cls, svcs, inv]) => {
        if (cls)  setClients(cls)
        if (svcs) setServices(svcs)
        setInventory(inv)
      })
      .finally(() => setLoadingRef(false))

    if (isEdit) {
      // Populate from existing procedure
      setClientId(String(procedure.client_id))
      setServiceId(String(procedure.service_id))
      setDate(procedure.procedure_date)
      setSession(procedure.session_number != null ? String(procedure.session_number) : '')
      setPrice(procedure.price != null ? String(procedure.price) : '')
      setFollowUp(procedure.next_follow_up ?? '')
      setNotes(procedure.notes ?? '')
      // Load existing supplies from the procedure object
      setExistingSupplyRows(
        (procedure.supplies_used ?? []).map((s) => ({
          id:                s.id,
          inventory_item_id: s.inventory_item_id,
          quantity_used:     String(s.quantity_used),
          name:              null, // resolved below once inventory loads
        }))
      )
      setAddSupplyRows([])
      setPendingRemovals([])
    } else {
      setClientId(defaultClientId ? String(defaultClientId) : '')
      setServiceId('')
      setDate(todayISO())
      setSession('')
      setPrice('')
      setFollowUp('')
      setNotes('')
      setNewSupplies([])
    }
  }, [open])

  // Resolve supply names once inventory is loaded (edit mode)
  useEffect(() => {
    if (!isEdit || inventory.length === 0) return
    setExistingSupplyRows((rows) =>
      rows.map((r) => ({
        ...r,
        name: inventory.find((i) => i.id === r.inventory_item_id)?.name ?? `Item #${r.inventory_item_id}`,
      }))
    )
  }, [inventory, isEdit])

  // ── Service list ────────────────────────────────────────────────────────────
  const serviceList = serviceMapProp
    ? Object.entries(serviceMapProp).map(([id, name]) => ({ id: Number(id), name, default_price: null }))
    : services

  // ── Session suggestion (create mode only) ───────────────────────────────────
  useEffect(() => {
    if (isEdit || !serviceId || !clientId) return
    const svId  = Number(serviceId)
    const count = existingProcedures.filter((p) => p.service_id === svId).length
    setSession(String(count + 1))
    const svc = serviceList.find((s) => s.id === svId)
    if (svc?.default_price != null) setPrice(String(svc.default_price))
  }, [serviceId, clientId, isEdit])

  // ── Supply helpers (create mode) ────────────────────────────────────────────
  function addNewSupplyRow() {
    setNewSupplies((s) => [...s, { inventory_item_id: '', quantity_used: '1' }])
  }
  function removeNewSupply(i) {
    setNewSupplies((s) => s.filter((_, idx) => idx !== i))
  }
  function updateNewSupply(i, field, value) {
    setNewSupplies((s) => s.map((row, idx) => idx === i ? { ...row, [field]: value } : row))
  }

  // ── Supply helpers (edit mode — new rows to add) ────────────────────────────
  function addEditSupplyRow() {
    setAddSupplyRows((s) => [...s, { inventory_item_id: '', quantity_used: '1' }])
  }
  function removeEditSupplyRow(i) {
    setAddSupplyRows((s) => s.filter((_, idx) => idx !== i))
  }
  function updateEditSupplyRow(i, field, value) {
    setAddSupplyRows((s) => s.map((row, idx) => idx === i ? { ...row, [field]: value } : row))
  }

  // Mark an existing supply for deletion
  function markForRemoval(supplyId) {
    setPendingRemovals((prev) => [...prev, supplyId])
    setExistingSupplyRows((rows) => rows.filter((r) => r.id !== supplyId))
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate() {
    const e = {}
    if (!isEdit && !clientId)  e.clientId  = 'Select a client.'
    if (!isEdit && !serviceId) e.serviceId = 'Select a service.'
    if (!date)                 e.date      = 'Procedure date is required.'
    if (price && (isNaN(parseFloat(price)) || parseFloat(price) < 0))
      e.price = 'Enter a valid price.'

    const supplyRows = isEdit ? addSupplyRows : newSupplies
    supplyRows.forEach((s, i) => {
      if (!s.inventory_item_id)               e[`supply_item_${i}`] = 'Select an item.'
      if (!s.quantity_used || parseFloat(s.quantity_used) <= 0)
        e[`supply_qty_${i}`] = 'Enter quantity > 0.'
    })
    return e
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    const v = validate()
    if (Object.keys(v).length) { setErrors(v); return }

    setSubmitting(true)
    setApiError(null)

    try {
      if (isEdit) {
        // 1. PATCH core fields
        await proceduresService.update(procedure.id, {
          service_id:     Number(serviceId) || undefined,
          procedure_date: date,
          session_number: sessionNumber ? parseInt(sessionNumber) : null,
          price:          price ? parseFloat(price) : null,
          next_follow_up: nextFollowUp || null,
          notes:          notes.trim() || null,
        })

        // 2. DELETE removed supplies (reverses inventory deduction in backend)
        await Promise.all(
          pendingRemovals.map((sid) =>
            proceduresService.removeSupply(procedure.id, sid)
          )
        )

        // 3. POST new supply rows (deducts inventory per row in backend)
        await Promise.all(
          addSupplyRows
            .filter((s) => s.inventory_item_id)
            .map((s) =>
              proceduresService.addSupply(procedure.id, {
                inventory_item_id: Number(s.inventory_item_id),
                quantity_used:     parseFloat(s.quantity_used),
              })
            )
        )
      } else {
        // CREATE — single POST with inline supplies
        await proceduresService.create({
          client_id:      Number(clientId),
          service_id:     Number(serviceId),
          procedure_date: date,
          session_number: sessionNumber ? parseInt(sessionNumber) : null,
          price:          price ? parseFloat(price) : null,
          next_follow_up: nextFollowUp || null,
          notes:          notes.trim() || null,
          supplies: newSupplies
            .filter((s) => s.inventory_item_id)
            .map((s) => ({
              inventory_item_id: Number(s.inventory_item_id),
              quantity_used:     parseFloat(s.quantity_used),
            })),
        })
      }

      onSaved()
    } catch (err) {
      setApiError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const supplyRows   = isEdit ? addSupplyRows    : newSupplies
  const addSupplyRow = isEdit ? addEditSupplyRow : addNewSupplyRow
  const removeSupply = isEdit ? removeEditSupplyRow : removeNewSupply
  const updateSupply = isEdit ? updateEditSupplyRow : updateNewSupply

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Procedure' : 'Record Procedure'}
      description={
        isEdit
          ? 'Update procedure details. Removed supplies will reverse their inventory deduction.'
          : 'Record a treatment performed on a client. Supplies used will automatically deduct from inventory.'
      }
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel={isEdit ? 'Save Changes' : 'Save Procedure'}
      error={apiError}
    >
      {loadingRef && (
        <p className="text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
          Loading…
        </p>
      )}

      {/* Client — create mode only, not editable */}
      {!defaultClientId && !isEdit && (
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

      {/* Service — editable in both modes */}
      <FormField label="Service / Procedure" required={!isEdit} error={errors.serviceId}>
        <Select value={serviceId} onValueChange={setServiceId}>
          <SelectTrigger>
            <SelectValue placeholder="Select service…" />
          </SelectTrigger>
          <SelectContent>
            {serviceList.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Procedure Date" required error={errors.date}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
        <FormField
          label="Session #"
          hint={!isEdit && sessionNumber ? `Suggested: session ${sessionNumber}` : undefined}
        >
          <Input
            type="number" min="1"
            value={sessionNumber}
            onChange={(e) => setSession(e.target.value)}
            placeholder="1"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Price (₱)" error={errors.price} hint="Leave blank for service default.">
          <Input
            type="number" min="0" step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
          />
        </FormField>
        <FormField label="Next Follow-up Date">
          <Input
            type="date"
            value={nextFollowUp}
            onChange={(e) => setFollowUp(e.target.value)}
            min={date}
          />
        </FormField>
      </div>

      <FormField label="Notes">
        <textarea
          className="flex min-h-[64px] w-full rounded-lg border px-3 py-2 text-sm resize-y"
          style={{
            borderColor: 'var(--color-border)',
            background:  'var(--color-surface)',
            color:       'var(--color-text)',
          }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional procedure notes…"
        />
      </FormField>

      {/* ── Supplies section ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            Supplies / Consumables Used
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={addSupplyRow}>
            <Plus className="h-3.5 w-3.5" /> Add supply
          </Button>
        </div>

        {/* Edit mode: show already-saved supplies */}
        {isEdit && existingSupplyRows.length > 0 && (
          <div className="mb-3">
            <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              Saved supplies — click ✕ to remove (reverses inventory deduction):
            </p>
            {existingSupplyRows.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-lg px-3 py-2 mb-1 text-sm"
                style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)' }}
              >
                <span>
                  {row.name ?? `Item #${row.inventory_item_id}`}
                  <span className="ml-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    × {row.quantity_used}
                  </span>
                </span>
                <Button
                  type="button" variant="ghost" size="icon-sm"
                  onClick={() => markForRemoval(row.id)}
                  aria-label="Remove supply"
                >
                  <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--color-danger)' }} />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* New supply rows (both modes) */}
        {supplyRows.length === 0 && !isEdit && (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            No supplies recorded. Click "Add supply" if any inventory items were used.
          </p>
        )}
        {isEdit && supplyRows.length === 0 && existingSupplyRows.length === 0 && (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            No supplies recorded. Click "Add supply" to add new ones.
          </p>
        )}

        {supplyRows.map((row, i) => (
          <div key={i} className="flex items-start gap-2 mb-2">
            <div className="flex-1">
              <Select
                value={row.inventory_item_id}
                onValueChange={(v) => updateSupply(i, 'inventory_item_id', v)}
              >
                <SelectTrigger
                  className={errors[`supply_item_${i}`] ? 'border-[var(--color-danger)]' : ''}
                >
                  <SelectValue placeholder="Select item…" />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name} ({item.current_quantity} {item.unit} in stock)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors[`supply_item_${i}`] && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-danger)' }}>
                  {errors[`supply_item_${i}`]}
                </p>
              )}
            </div>
            <div className="w-24 shrink-0">
              <Input
                type="number" min="0.001" step="0.001"
                value={row.quantity_used}
                onChange={(e) => updateSupply(i, 'quantity_used', e.target.value)}
                placeholder="Qty"
                className={errors[`supply_qty_${i}`] ? 'border-[var(--color-danger)]' : ''}
              />
              {errors[`supply_qty_${i}`] && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-danger)' }}>
                  {errors[`supply_qty_${i}`]}
                </p>
              )}
            </div>
            <Button
              type="button" variant="ghost" size="icon-sm"
              onClick={() => removeSupply(i)} aria-label="Remove"
              className="mt-0.5"
            >
              <Trash2 className="h-4 w-4" style={{ color: 'var(--color-danger)' }} />
            </Button>
          </div>
        ))}

        {(supplyRows.length > 0 || (isEdit && addSupplyRows.length > 0)) && (
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {isEdit
              ? 'New supplies will deduct from inventory on save.'
              : 'Inventory will be automatically deducted when you save.'}
          </p>
        )}
      </div>
    </FormDialog>
  )
}
