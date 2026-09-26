import { useEffect, useState } from 'react'
import { Receipt, Search } from 'lucide-react'
import expensesService from '@/services/expensesService'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import { DataTable, MobileCard, MobileField } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const CATEGORIES = ['all', 'inventory', 'supplies', 'rent', 'utilities', 'salary', 'equipment', 'other']

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([])
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  function load(params = {}) {
    setLoading(true)
    expensesService.getAll(params)
      .then(setExpenses)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function handleFilter(e) {
    e.preventDefault()
    load({
      search: search || undefined,
      category: category !== 'all' ? category : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    })
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div>
      <PageHeader title="Expenses" subtitle="Track all business expenditures">
        {/* TODO: Add Expense modal */}
        <Button size="sm">+ Add Expense</Button>
      </PageHeader>

      {/* Filter toolbar */}
      <form onSubmit={handleFilter} className="flex flex-wrap items-end gap-2 mb-5">
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
            style={{ color: 'var(--color-text-muted)' }} />
          <Input
            className="pl-8"
            placeholder="Search expenses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            className="w-36"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="Date from"
          />
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>to</span>
          <Input
            type="date"
            className="w-36"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="Date to"
          />
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
              style={{ color: 'var(--color-text-muted)' }}
              title={e.notes}
            >
              {e.notes ?? '—'}
            </span>,
            /* TODO: Edit / Delete */
            <Button variant="ghost" size="sm">Edit</Button>,
          ])}
          mobileRows={expenses.map((e) => (
            <MobileCard
              key={e.id}
              actions={<Button variant="ghost" size="sm">Edit</Button>}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  {e.description}
                </span>
                <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                  {formatCurrency(e.amount)}
                </span>
              </div>
              <MobileField label="Date" value={e.expense_date} />
              <MobileField label="Category" value={e.category ?? 'other'} />
              {e.notes && <MobileField label="Notes" value={e.notes} />}
            </MobileCard>
          ))}
          emptyState={
            <EmptyState
              icon={Receipt}
              title="No expenses found"
              description="Add your first expense to start tracking expenditures."
            />
          }
        />
      )}
    </div>
  )
}
