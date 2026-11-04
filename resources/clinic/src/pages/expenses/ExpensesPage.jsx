import { useEffect, useState, useCallback, useRef } from 'react'
import { Receipt, Search, Plus, Pencil } from 'lucide-react'
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
        : { ...EMPTY, expense_date: todayISO() }
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
    if (submitting) return
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
          autoFocus />
      </FormField>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            onChange={(e) => set('amount', e.target.value)} />
        </FormField>
      </div>
      <FormField label="Notes">
        <Input value={fields.notes}
          onChange={(e) => set('notes', e.target.value)} />
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

  const loadVersion = useRef(0)
  const appliedFilters = useRef({})
  const [notice, setNotice] = useState('')
  const load = useCallback((params = appliedFilters.current) => {
    appliedFilters.current = params
    const version = ++loadVersion.current
    setError(null)
    setLoading(true)
    expensesService.getAll(params)
      .then((rows) => { if (version === loadVersion.current) setExpenses(rows) })
      .catch((e) => { if (version === loadVersion.current) setError(e.message) })
      .finally(() => { if (version === loadVersion.current) setLoading(false) })
  }, [])

  useEffect(() => { load(); return () => { loadVersion.current += 1 } }, [load])

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
    setNotice('Expense saved.')
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
    <div className="interactive-list min-w-0">
      <PageHeader title="Expenses" subtitle="Track all business expenditures">
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="h-4 w-4" /> Record Expense
        </Button>
      </PageHeader>

      {notice && <p role="status" className="mb-4 text-sm">{notice}</p>}
      {/* Filter toolbar */}
      <form onSubmit={handleFilter} className="flex flex-wrap items-end gap-2 mb-5">
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
            style={{ color: 'var(--color-text-muted)' }} />
          <Input aria-label="Search expenses" className="pl-8" value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger aria-label="Expense category" className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
          <Input type="date" className="w-full min-w-0 sm:w-36" value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)} aria-label="Date from" />
          <Input type="date" className="w-full min-w-0 sm:w-36" value={dateTo}
            onChange={(e) => setDateTo(e.target.value)} aria-label="Date to" />
        </div>
        <Button type="submit" variant="secondary" size="sm">Filter</Button>
        <span className="text-sm ml-auto" style={{ color: 'var(--color-text-muted)' }}>
          {loading ? 'Loading expenses…' : error ? 'Expense totals unavailable' : `${expenses.length} records · Filtered expense total: ${formatCurrency(total)}`}
        </span>
      </form>

      {error && <ErrorState message={error} className="mb-4" />}

      {loading ? (
        <LoadingState message="Loading expenses…" />
      ) : error ? <div><p className="mb-3 text-sm">{notice ? 'Expense saved, but the list could not be refreshed. Do not record it again.' : 'Expense results could not be confirmed.'}</p><Button variant="outline" onClick={() => load()}>Retry expenses</Button></div> : (
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
            <Button variant="ghost" size="icon" title={`Edit expense #${e.id}`} aria-label={`Edit expense #${e.id}`} onClick={() => openEdit(e)}><Pencil aria-hidden="true" /></Button>,
          ])}
          mobileRows={expenses.map((e) => (
            <MobileCard
              key={e.id}
              actions={<Button variant="ghost" size="icon" title={`Edit expense #${e.id}`} aria-label={`Edit expense #${e.id}`} onClick={() => openEdit(e)}><Pencil aria-hidden="true" /></Button>}
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
              description="Try changing the filters, or record an expense.">
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
