import { useEffect, useState, useCallback } from 'react'
import { Receipt, Search, Plus } from 'lucide-react'
import expensesService from '@/services/expensesService'
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const CATEGORIES = ['inventory', 'supplies', 'rent', 'utilities', 'salary', 'equipment', 'other']

// ── Expense Form ──────────────────────────────────────────────────────────────

const EMPTY = { expense_date: todayISO(), description: '', category: 'other', amount: '', notes: '' }

function ExpenseForm({ open, onClose, expense = null, onSaved }) {
  const isEdit = Boolean(expense)
  const [fields, setFields]     = useState(EMPTY)
  const [errors, setErrors]     = useState({})
  const [apiError, setApiError] = useState(null)
  const [submitting, setSubmit] = useState(false)

  useEffect(() => {
    if (open) {
      setFields(expense
        ? {
            expense_date: expense.expense_date,
            description:  expense.description,
            category:     expense.category ?? 'other',
            amount:       String(expense.amount),
            notes:        expense.notes ?? '',
          }
        : EMPTY
      )
      setErrors({})
      setApiError(null)
    }
  }, [open, expense])

  function set(field, value) {
    setFields((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }))
  }

  function validate() {
    const e = {}
    if (!fields.expense_date) e.expense_date = 'Date is required.'
    if (!fields.description.trim()) e.description = 'Description is required.'
    const amt = parseFloat(fields.amount)
    if (!fields.amount || isNaN(amt)) e.amount = 'Enter a valid amount.'
    if (!isNaN(amt) && amt <= 0)      e.amount = 'Amount must be greater than ₱0.'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const v = validate()
    if (Object.keys(v).length) { setErrors(v); return }

    const payload = {
      expense_date: fields.expense_date,
      description:  fields.description.trim(),
      category:     fields.category || null,
      amount:       parseFloat(fields.amount),
      notes:        fields.notes.trim() || null,
    }

    setSubmit(true)
    setApiError(null)
    try {
      const saved = isEdit
        ? await expensesService.update(expense.id, payload)
        : await expensesService.create(payload)
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
      title={isEdit ? 'Edit Expense' : 'Record Expense'}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel={isEdit ? 'Save Changes' : 'Record Expense'}
      error={apiError}
    >
      <FormField label="Date" required error={errors.expense_date}>
        <Input type="date" value={fields.expense_date}
          onChange={(e) => set('expense_date', e.target.value)} />
      </FormField>
      <FormField label="Description" required error={errors.description}>
        <Input value={fields.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="e.g. Serum restock, Utility bill"
          autoFocus />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Category">
          <Select value={fields.category} onValueChange={(v) => set('category', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Amount (₱)" required error={errors.amount}>
          <Input type="number" min="0.01" step="0.01" value={fields.amount}
            onChange={(e) => set('amount', e.target.value)} placeholder="0.00" />
        </FormField>
      </div>
      <FormField label="Notes">
        <Input value={fields.notes}
          onChange={(e) => set('notes', e.target.value)} placeholder="Optional notes…" />
      </FormField>
    </FormDialog>
  )
}

// ── Expenses Page ─────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([])
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing]   = useState(null)

  const load = useCallback((params = {}) => {
    setLoading(true)
    expensesService.getAll(params)
      .then(setExpenses)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function handleFilter(e) {
    e.preventDefault()
    load({
      search: search || undefined,
      category: category !== 'all' ? category : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    })
  }

  function handleSaved() {
    setFormOpen(false)
    setEditing(null)
    load({
      search: search || undefined,
      category: category !== 'all' ? category : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    })
  }

  function openEdit(exp) {
    setEditing(exp)
    setFormOpen(true)
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div>
      <PageHeader title="Expenses" subtitle="Track all business expenditures">
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="h-4 w-4" /> Record Expense
        </Button>
      </PageHeader>

      {/* Filter toolbar */}
      <form onSubmit={handleFilter} className="flex flex-wrap items-end gap-2 mb-5">
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
            style={{ color: 'var(--color-text-muted)' }} />
          <Input className="pl-8" placeholder="Search expenses…" value={search}
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
        <div className="flex items-center gap-1.5">
          <Input type="date" className="w-36" value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)} aria-label="Date from" />
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>to</span>
          <Input type="date" className="w-36" value={dateTo}
            onChange={(e) => setDateTo(e.target.value)} aria-label="Date to" />
        </div>
        <Button type="submit" variant="secondary" size="sm">Filter</Button>
        <span className="text-sm ml-auto" style={{ color: 'var(--color-text-muted)' }}>
          {expenses.length} record{expenses.length !== 1 ? 's' : ''} — {formatCurrency(total)}
        </span>
      </form>

      {error && <ErrorState message={error} className="mb-4" />}

      {loading ? (
        <LoadingState message="Loading expenses…" />
      ) : (
        <DataTable
          columns={['Date', 'Description', 'Category', 'Amount', 'Notes', '']}
          rows={expenses.map((e) => [
            <span className="whitespace-nowrap">{e.expense_date}</span>,
            <span className="font-semibold">{e.description}</span>,
            <Badge variant="neutral">{e.category ?? 'other'}</Badge>,
            <span className="font-semibold">{formatCurrency(e.amount)}</span>,
            <span className="text-xs max-w-[160px] truncate"
              style={{ color: 'var(--color-text-muted)' }} title={e.notes}>
              {e.notes ?? '—'}
            </span>,
            <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>Edit</Button>,
          ])}
          mobileRows={expenses.map((e) => (
            <MobileCard
              key={e.id}
              actions={<Button variant="ghost" size="sm" onClick={() => openEdit(e)}>Edit</Button>}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm">{e.description}</span>
                <span className="font-bold text-sm">{formatCurrency(e.amount)}</span>
              </div>
              <MobileField label="Date" value={e.expense_date} />
              <MobileField label="Category" value={e.category ?? 'other'} />
              {e.notes && <MobileField label="Notes" value={e.notes} />}
            </MobileCard>
          ))}
          emptyState={
            <EmptyState icon={Receipt} title="No expenses found"
              description="Record your first expense to start tracking expenditures.">
              <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
                <Plus className="h-4 w-4" /> Record Expense
              </Button>
            </EmptyState>
          }
        />
      )}

      <ExpenseForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        expense={editing}
        onSaved={handleSaved}
      />
    </div>
  )
}
