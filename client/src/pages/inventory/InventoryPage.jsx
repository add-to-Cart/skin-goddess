import { useEffect, useState, useCallback } from 'react'
import { Package, Search, Plus, Trash2 } from 'lucide-react'
import inventoryService from '@/services/inventoryService'
import { formatCurrency, todayISO } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import { DataTable, MobileCard, MobileField } from '@/components/shared/DataTable'
import FormDialog, { FormField } from '@/components/shared/FormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const CATEGORIES = ['medicine', 'supply', 'consumable', 'equipment', 'other']

// ── Add/Edit Item Form ────────────────────────────────────────────────────────

const EMPTY_ITEM = {
  name: '', category: 'supply', unit: '', current_quantity: '0',
  minimum_stock_level: '', acquisition_cost: '', description: '',
}

function ItemForm({ open, onClose, item = null, onSaved }) {
  const isEdit = Boolean(item)
  const [f, setF]               = useState(EMPTY_ITEM)
  const [errors, setErrors]     = useState({})
  const [apiError, setApiError] = useState(null)
  const [submitting, setSubmit] = useState(false)

  useEffect(() => {
    if (open) {
      setF(item ? {
        name:                item.name,
        category:            item.category ?? 'supply',
        unit:                item.unit ?? '',
        current_quantity:    String(item.current_quantity),
        minimum_stock_level: item.minimum_stock_level != null ? String(item.minimum_stock_level) : '',
        acquisition_cost:    item.acquisition_cost != null ? String(item.acquisition_cost) : '',
        description:         item.description ?? '',
      } : EMPTY_ITEM)
      setErrors({})
      setApiError(null)
    }
  }, [open, item])

  function set(field, value) {
    setF((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }))
  }

  function validate() {
    const e = {}
    if (!f.name.trim()) e.name = 'Item name is required.'
    if (f.current_quantity && isNaN(parseFloat(f.current_quantity))) e.current_quantity = 'Enter a valid number.'
    if (f.minimum_stock_level && isNaN(parseFloat(f.minimum_stock_level))) e.minimum_stock_level = 'Enter a valid number.'
    if (f.acquisition_cost && isNaN(parseFloat(f.acquisition_cost))) e.acquisition_cost = 'Enter a valid amount.'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const v = validate()
    if (Object.keys(v).length) { setErrors(v); return }

    const payload = {
      name:                f.name.trim(),
      category:            f.category || null,
      unit:                f.unit.trim() || null,
      minimum_stock_level: f.minimum_stock_level ? parseFloat(f.minimum_stock_level) : null,
      acquisition_cost:    f.acquisition_cost ? parseFloat(f.acquisition_cost) : null,
      description:         f.description.trim() || null,
      ...(!isEdit && { current_quantity: f.current_quantity ? parseFloat(f.current_quantity) : 0 }),
    }

    setSubmit(true)
    setApiError(null)
    try {
      const saved = isEdit
        ? await inventoryService.updateItem(item.id, payload)
        : await inventoryService.createItem(payload)
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
      title={isEdit ? 'Edit Item' : 'Add Inventory Item'}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel={isEdit ? 'Save Changes' : 'Add Item'}
      error={apiError}
    >
      <FormField label="Item Name" required error={errors.name}>
        <Input value={f.name} onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Hyaluronic Acid Serum" autoFocus />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Category">
          <Select value={f.category} onValueChange={(v) => set('category', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Unit" hint="pcs, ml, g, box…">
          <Input value={f.unit} onChange={(e) => set('unit', e.target.value)} placeholder="pcs" />
        </FormField>
      </div>
      {!isEdit && (
        <FormField label="Initial Quantity" error={errors.current_quantity}>
          <Input type="number" min="0" step="0.001" value={f.current_quantity}
            onChange={(e) => set('current_quantity', e.target.value)} placeholder="0" />
        </FormField>
      )}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Min Stock Level" error={errors.minimum_stock_level}
          hint="Alert when stock falls below this.">
          <Input type="number" min="0" step="0.001" value={f.minimum_stock_level}
            onChange={(e) => set('minimum_stock_level', e.target.value)} placeholder="0" />
        </FormField>
        <FormField label="Cost per Unit (₱)" error={errors.acquisition_cost}>
          <Input type="number" min="0" step="0.01" value={f.acquisition_cost}
            onChange={(e) => set('acquisition_cost', e.target.value)} placeholder="0.00" />
        </FormField>
      </div>
    </FormDialog>
  )
}

// ── Stock Adjust Form ─────────────────────────────────────────────────────────

function AdjustForm({ open, onClose, item, onSaved }) {
  const [direction, setDirection] = useState('add')
  const [quantity, setQuantity]   = useState('')
  const [notes, setNotes]         = useState('')
  const [error, setError]         = useState(null)
  const [apiError, setApiError]   = useState(null)
  const [submitting, setSubmit]   = useState(false)

  useEffect(() => {
    if (open) { setDirection('add'); setQuantity(''); setNotes(''); setError(null); setApiError(null) }
  }, [open])

  const qty     = parseFloat(quantity) || 0
  const current = item ? parseFloat(item.current_quantity) : 0
  const after   = direction === 'add' ? current + qty : current - qty

  async function handleSubmit(e) {
    e.preventDefault()
    if (!quantity || qty <= 0) { setError('Enter a quantity greater than 0.'); return }
    if (direction === 'subtract' && qty > current) {
      setError(`Cannot remove ${qty} — only ${current} ${item.unit ?? 'units'} in stock.`); return
    }

    setSubmit(true)
    setApiError(null)
    try {
      await inventoryService.adjustStock(item.id, { direction, quantity: qty, notes: notes.trim() || null })
      onSaved()
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
      title={`Adjust Stock — ${item?.name ?? ''}`}
      description={`Current stock: ${current} ${item?.unit ?? 'units'}`}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel="Adjust Stock"
      error={apiError}
    >
      <FormField label="Adjustment">
        <div className="flex gap-2">
          {['add', 'subtract'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors border"
              style={{
                background: direction === d ? 'var(--color-brand)' : 'var(--color-surface)',
                color: direction === d ? '#fff' : 'var(--color-text-muted)',
                borderColor: direction === d ? 'var(--color-brand)' : 'var(--color-border)',
              }}
            >
              {d === 'add' ? '+ Add stock' : '− Remove stock'}
            </button>
          ))}
        </div>
      </FormField>
      <FormField label="Quantity" required error={error}>
        <Input type="number" min="0.001" step="0.001" value={quantity}
          onChange={(e) => { setQuantity(e.target.value); setError(null) }}
          placeholder="0"
          autoFocus
        />
      </FormField>
      {quantity && qty > 0 && (
        <div className="rounded-lg p-3 text-sm"
          style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>After adjustment: </span>
          <span className="font-semibold" style={{ color: after < 0 ? 'var(--color-danger)' : 'var(--color-text)' }}>
            {after.toFixed(3)} {item?.unit ?? 'units'}
          </span>
        </div>
      )}
      <FormField label="Reason / Notes">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Physical count correction, expired stock removed…" />
      </FormField>
    </FormDialog>
  )
}

// ── Purchase Form ─────────────────────────────────────────────────────────────

function PurchaseForm({ open, onClose, onSaved }) {
  const [allItems, setAllItems] = useState([])
  const [date, setDate]         = useState(todayISO())
  const [supplier, setSupplier] = useState('')
  const [notes, setNotes]       = useState('')
  const [lines, setLines]       = useState([{ inventory_item_id: '', quantity: '', unit_cost: '' }])
  const [errors, setErrors]     = useState({})
  const [apiError, setApiError] = useState(null)
  const [submitting, setSubmit] = useState(false)

  useEffect(() => {
    if (open) {
      inventoryService.getItems({ active_only: true }).then(setAllItems).catch(() => {})
      setDate(todayISO())
      setSupplier('')
      setNotes('')
      setLines([{ inventory_item_id: '', quantity: '', unit_cost: '' }])
      setErrors({})
      setApiError(null)
    }
  }, [open])

  function updateLine(i, field, value) {
    setLines((prev) => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row))
  }

  function addLine() {
    setLines((prev) => [...prev, { inventory_item_id: '', quantity: '', unit_cost: '' }])
  }

  function removeLine(i) {
    setLines((prev) => prev.filter((_, idx) => idx !== i))
  }

  function validate() {
    const e = {}
    if (!date) e.date = 'Purchase date is required.'
    if (lines.length === 0) e.lines = 'Add at least one item.'
    lines.forEach((l, i) => {
      if (!l.inventory_item_id)        e[`item_${i}`] = 'Select an item.'
      if (!l.quantity || parseFloat(l.quantity) <= 0) e[`qty_${i}`]  = 'Enter qty > 0.'
      if (!l.unit_cost || parseFloat(l.unit_cost) < 0) e[`cost_${i}`] = 'Enter cost ≥ 0.'
    })
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const v = validate()
    if (Object.keys(v).length) { setErrors(v); return }

    const payload = {
      purchase_date:    date,
      supplier_name:    supplier.trim() || null,
      notes:            notes.trim() || null,
      items: lines.map((l) => ({
        inventory_item_id: Number(l.inventory_item_id),
        quantity:          parseFloat(l.quantity),
        unit_cost:         parseFloat(l.unit_cost),
      })),
    }

    setSubmit(true)
    setApiError(null)
    try {
      await inventoryService.createPurchase(payload)
      onSaved()
    } catch (err) {
      setApiError(err.message)
    } finally {
      setSubmit(false)
    }
  }

  const grandTotal = lines.reduce((s, l) => {
    const q = parseFloat(l.quantity) || 0
    const c = parseFloat(l.unit_cost) || 0
    return s + q * c
  }, 0)

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Record Purchase"
      description="Record incoming stock. Inventory quantities will be updated automatically."
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel="Record Purchase"
      error={apiError}
    >
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Purchase Date" required error={errors.date}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
        <FormField label="Supplier">
          <Input value={supplier} onChange={(e) => setSupplier(e.target.value)}
            placeholder="Supplier name" />
        </FormField>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Items Purchased</span>
          <Button type="button" variant="ghost" size="sm" onClick={addLine}>
            <Plus className="h-3.5 w-3.5" /> Add item
          </Button>
        </div>
        {errors.lines && (
          <p className="text-xs mb-2" style={{ color: 'var(--color-danger)' }}>{errors.lines}</p>
        )}
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-[1fr_64px_80px_28px] gap-2 mb-2 items-start">
            <div>
              <Select value={line.inventory_item_id}
                onValueChange={(v) => {
                  updateLine(i, 'inventory_item_id', v)
                  const item = allItems.find((it) => String(it.id) === v)
                  if (item?.acquisition_cost) updateLine(i, 'unit_cost', String(item.acquisition_cost))
                }}>
                <SelectTrigger className={errors[`item_${i}`] ? 'border-[var(--color-danger)]' : ''}>
                  <SelectValue placeholder="Select item…" />
                </SelectTrigger>
                <SelectContent>
                  {allItems.map((it) => (
                    <SelectItem key={it.id} value={String(it.id)}>
                      {it.name} ({it.current_quantity} {it.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors[`item_${i}`] && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-danger)' }}>
                  {errors[`item_${i}`]}
                </p>
              )}
            </div>
            <Input type="number" min="0.001" step="0.001" placeholder="Qty"
              value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)}
              className={errors[`qty_${i}`] ? 'border-[var(--color-danger)]' : ''} />
            <Input type="number" min="0" step="0.01" placeholder="Cost"
              value={line.unit_cost} onChange={(e) => updateLine(i, 'unit_cost', e.target.value)}
              className={errors[`cost_${i}`] ? 'border-[var(--color-danger)]' : ''} />
            <Button type="button" variant="ghost" size="icon-sm"
              onClick={() => removeLine(i)} disabled={lines.length === 1}>
              <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--color-danger)' }} />
            </Button>
          </div>
        ))}
        {lines.length > 0 && (
          <div className="flex justify-between pt-2 border-t text-sm"
            style={{ borderColor: 'var(--color-border)' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Total cost</span>
            <span className="font-bold">{formatCurrency(grandTotal)}</span>
          </div>
        )}
      </div>

      <FormField label="Notes">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes…" />
      </FormField>
    </FormDialog>
  )
}

// ── Inventory Page ────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [items, setItems]         = useState([])
  const [search, setSearch]       = useState('')
  const [category, setCategory]   = useState('all')
  const [lowOnly, setLowOnly]     = useState(false)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [itemFormOpen, setItemFormOpen]     = useState(false)
  const [editingItem, setEditingItem]       = useState(null)
  const [adjustItem, setAdjustItem]         = useState(null)
  const [purchaseOpen, setPurchaseOpen]     = useState(false)

  const loadItems = useCallback((params) => {
    setLoading(true)
    inventoryService.getItems(params ?? {
      search: search || undefined,
      category: category !== 'all' ? category : undefined,
      low_stock_only: lowOnly || undefined,
    })
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [search, category, lowOnly])

  useEffect(() => { loadItems() }, [category, lowOnly])

  function handleSearch(e) {
    e.preventDefault()
    loadItems({ search: search || undefined, category: category !== 'all' ? category : undefined, low_stock_only: lowOnly || undefined })
  }

  function handleItemSaved() {
    setItemFormOpen(false)
    setEditingItem(null)
    loadItems()
  }

  function handleAdjustSaved() {
    setAdjustItem(null)
    loadItems()
  }

  function handlePurchaseSaved() {
    setPurchaseOpen(false)
    loadItems()
  }

  const lowCount = items.filter((i) => i.is_low_stock).length

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Stock levels and movement">
        <Button variant="secondary" size="sm" onClick={() => setPurchaseOpen(true)}>
          <Plus className="h-4 w-4" /> Record Purchase
        </Button>
        <Button size="sm" onClick={() => { setEditingItem(null); setItemFormOpen(true) }}>
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </PageHeader>

      {lowCount > 0 && (
        <ErrorState className="mb-4"
          message={`${lowCount} item${lowCount !== 1 ? 's are' : ' is'} below minimum stock level.`} />
      )}

      <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
            style={{ color: 'var(--color-text-muted)' }} />
          <Input className="pl-8" placeholder="Search items…" value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Checkbox id="low-stock" checked={lowOnly} onCheckedChange={setLowOnly} />
          <Label htmlFor="low-stock" className="text-sm cursor-pointer">Low stock only</Label>
        </div>
        <Button type="submit" variant="secondary" size="sm">Search</Button>
      </form>

      {error && <ErrorState message={error} className="mb-4" />}

      {loading ? (
        <LoadingState message="Loading inventory…" />
      ) : (
        <DataTable
          columns={['Name', 'Category', 'Unit', 'In Stock', 'Min', 'Cost', 'Status', '']}
          rows={items.map((item) => [
            <span className="font-semibold">{item.name}</span>,
            <Badge variant="neutral">{item.category ?? 'other'}</Badge>,
            <span style={{ color: 'var(--color-text-muted)' }}>{item.unit ?? '—'}</span>,
            <span className="font-semibold"
              style={{ color: item.is_low_stock ? 'var(--color-danger)' : 'var(--color-text)' }}>
              {item.current_quantity}
            </span>,
            <span style={{ color: 'var(--color-text-muted)' }}>{item.minimum_stock_level ?? '—'}</span>,
            <span>{item.acquisition_cost != null ? formatCurrency(item.acquisition_cost) : '—'}</span>,
            <Badge variant={item.is_low_stock ? 'danger' : 'success'}>
              {item.is_low_stock ? 'Low stock' : 'OK'}
            </Badge>,
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setAdjustItem(item)}>Adjust</Button>
              <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setItemFormOpen(true) }}>Edit</Button>
            </div>,
          ])}
          mobileRows={items.map((item) => (
            <MobileCard key={item.id}
              actions={
                <>
                  <Button variant="ghost" size="sm" onClick={() => setAdjustItem(item)}>Adjust</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setItemFormOpen(true) }}>Edit</Button>
                </>
              }>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm">{item.name}</span>
                <Badge variant={item.is_low_stock ? 'danger' : 'success'}>
                  {item.is_low_stock ? 'Low' : 'OK'}
                </Badge>
              </div>
              <MobileField label="Category" value={item.category ?? 'other'} />
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>In stock</span>
                <span className="font-semibold"
                  style={{ color: item.is_low_stock ? 'var(--color-danger)' : 'var(--color-text)' }}>
                  {item.current_quantity} {item.unit}
                </span>
              </div>
              <MobileField label="Min level" value={`${item.minimum_stock_level ?? '—'} ${item.unit ?? ''}`} />
              {item.acquisition_cost != null && (
                <MobileField label="Cost" value={formatCurrency(item.acquisition_cost)} />
              )}
            </MobileCard>
          ))}
          emptyState={
            <EmptyState icon={Package} title="No items found"
              description={lowOnly ? 'No items are below minimum stock level.' : 'Add inventory items to track stock.'}>
              {!lowOnly && (
                <Button size="sm" onClick={() => { setEditingItem(null); setItemFormOpen(true) }}>
                  <Plus className="h-4 w-4" /> Add Item
                </Button>
              )}
            </EmptyState>
          }
        />
      )}

      <ItemForm
        open={itemFormOpen}
        onClose={() => { setItemFormOpen(false); setEditingItem(null) }}
        item={editingItem}
        onSaved={handleItemSaved}
      />
      <AdjustForm
        open={Boolean(adjustItem)}
        onClose={() => setAdjustItem(null)}
        item={adjustItem}
        onSaved={handleAdjustSaved}
      />
      <PurchaseForm
        open={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
        onSaved={handlePurchaseSaved}
      />
    </div>
  )
}
