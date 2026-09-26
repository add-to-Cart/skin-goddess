import { useState } from 'react'
import { BarChart2 } from 'lucide-react'
import reportsService from '@/services/reportsService'
import { formatCurrency, todayISO } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import StatCard from '@/components/shared/StatCard'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

// ── Individual report panels ───────────────────────────────────────────────────

function SalesDailyReport() {
  const [date, setDate]       = useState(todayISO())
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  function run() {
    setLoading(true); setError(null)
    reportsService.salesDaily(date)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  return (
    <Card>
      <CardHeader><CardTitle>Daily Sales</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ds-date">Date</Label>
            <Input id="ds-date" type="date" className="w-40" value={date}
              onChange={(e) => setDate(e.target.value)} />
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>Run</Button>
        </div>
        {error && <ErrorState message={error} />}
        {loading && <LoadingState message="Running report…" />}
        {data && !loading && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            <StatCard label="Total Sales" value={formatCurrency(data.total_sales)} accent="brand" />
            <StatCard label="Transactions" value={data.transaction_count} accent="neutral" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SalesRangeReport() {
  const [from, setFrom]       = useState('')
  const [to, setTo]           = useState('')
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  function run() {
    if (!from || !to) return
    setLoading(true); setError(null)
    reportsService.salesRange(from, to)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  return (
    <Card>
      <CardHeader><CardTitle>Sales — Date Range</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sr-from">From</Label>
            <Input id="sr-from" type="date" className="w-40" value={from}
              onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sr-to">To</Label>
            <Input id="sr-to" type="date" className="w-40" value={to}
              onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button variant="secondary" onClick={run} disabled={loading || !from || !to}>Run</Button>
        </div>
        {error && <ErrorState message={error} />}
        {loading && <LoadingState message="Running report…" />}
        {data && !loading && (
          <div className="grid grid-cols-3 gap-3 mt-2">
            <StatCard label="Total Sales" value={formatCurrency(data.total_sales)} accent="brand" />
            <StatCard label="Collected" value={formatCurrency(data.total_collected)} accent="success" />
            <StatCard label="Outstanding" value={formatCurrency(data.total_outstanding)} accent="warning" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ExpensesByCategoryReport() {
  const [from, setFrom]       = useState('')
  const [to, setTo]           = useState('')
  const [rows, setRows]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  function run() {
    setLoading(true); setError(null)
    reportsService.expensesByCategory({ date_from: from || undefined, date_to: to || undefined })
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  return (
    <Card>
      <CardHeader><CardTitle>Expenses by Category</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ec-from">From (optional)</Label>
            <Input id="ec-from" type="date" className="w-40" value={from}
              onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ec-to">To (optional)</Label>
            <Input id="ec-to" type="date" className="w-40" value={to}
              onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>Run</Button>
        </div>
        {error && <ErrorState message={error} />}
        {loading && <LoadingState message="Running report…" />}
        {rows && !loading && (
          rows.length === 0
            ? <EmptyState icon={BarChart2} title="No expense data for this range." />
            : (
              <DataTable
                columns={['Category', 'Count', 'Total']}
                rows={rows.map((r) => [
                  <Badge variant="neutral">{r.category}</Badge>,
                  <span style={{ color: 'var(--color-text-muted)' }}>{r.count}</span>,
                  <span className="font-semibold">{formatCurrency(r.total)}</span>,
                ])}
                emptyState={null}
              />
            )
        )}
      </CardContent>
    </Card>
  )
}

function OutstandingBalancesReport() {
  const [rows, setRows]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  function run() {
    setLoading(true); setError(null)
    reportsService.outstandingBalances()
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outstanding Client Balances</CardTitle>
        <Button variant="secondary" size="sm" onClick={run} disabled={loading}>Run</Button>
      </CardHeader>
      <CardContent className="p-0">
        {error && <div className="px-5 pt-4"><ErrorState message={error} /></div>}
        {loading && <LoadingState message="Running report…" />}
        {rows && !loading && (
          rows.length === 0
            ? <EmptyState icon={BarChart2} title="No outstanding balances." />
            : (
              <DataTable
                columns={['Client', 'Billed', 'Paid', 'Balance']}
                rows={rows.map((r) => [
                  <span className="font-semibold">{r.client_name}</span>,
                  <span>{formatCurrency(r.total_billed)}</span>,
                  <span style={{ color: 'var(--color-success)' }}>{formatCurrency(r.total_paid)}</span>,
                  <span className="font-bold" style={{ color: 'var(--color-danger)' }}>
                    {formatCurrency(r.remaining_balance)}
                  </span>,
                ])}
                emptyState={null}
              />
            )
        )}
      </CardContent>
    </Card>
  )
}

function InventoryStockReport() {
  const [rows, setRows]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  function run() {
    setLoading(true); setError(null)
    reportsService.inventoryCurrentStock()
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Inventory Stock</CardTitle>
        <Button variant="secondary" size="sm" onClick={run} disabled={loading}>Run</Button>
      </CardHeader>
      <CardContent className="p-0">
        {error && <div className="px-5 pt-4"><ErrorState message={error} /></div>}
        {loading && <LoadingState message="Running report…" />}
        {rows && !loading && (
          rows.length === 0
            ? <EmptyState icon={BarChart2} title="No inventory data." />
            : (
              <DataTable
                columns={['Item', 'Category', 'In Stock', 'Min Level', 'Status']}
                rows={rows.map((r) => [
                  <span className="font-semibold">{r.name}</span>,
                  <Badge variant="neutral">{r.category ?? '—'}</Badge>,
                  <span
                    className="font-semibold"
                    style={{ color: r.is_low_stock ? 'var(--color-danger)' : 'var(--color-text)' }}
                  >
                    {r.current_quantity} {r.unit}
                  </span>,
                  <span style={{ color: 'var(--color-text-muted)' }}>{r.minimum_stock_level ?? '—'}</span>,
                  <Badge variant={r.is_low_stock ? 'danger' : 'success'}>
                    {r.is_low_stock ? 'Low' : 'OK'}
                  </Badge>,
                ])}
                emptyState={null}
              />
            )
        )}
      </CardContent>
    </Card>
  )
}

// ── Reports Page ───────────────────────────────────────────────────────────────

const REPORT_SECTIONS = [
  { key: 'sales-daily',       label: 'Daily Sales',           Component: SalesDailyReport },
  { key: 'sales-range',       label: 'Sales Range',           Component: SalesRangeReport },
  { key: 'expenses-category', label: 'Expenses by Category',  Component: ExpensesByCategoryReport },
  { key: 'outstanding',       label: 'Outstanding Balances',  Component: OutstandingBalancesReport },
  { key: 'inventory-stock',   label: 'Inventory Stock',       Component: InventoryStockReport },
]

export default function ReportsPage() {
  const [active, setActive] = useState('sales-daily')
  const ActiveComponent = REPORT_SECTIONS.find((r) => r.key === active)?.Component

  return (
    <div>
      <PageHeader title="Reports" subtitle="Business analytics and summaries" />

      {/* Tab strip */}
      <div className="flex gap-0.5 overflow-x-auto border-b mb-6 pb-0"
        style={{ borderColor: 'var(--color-border)' }}>
        {REPORT_SECTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className="px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
            style={{
              borderColor: active === key ? 'var(--color-brand)' : 'transparent',
              color: active === key ? 'var(--color-brand-strong)' : 'var(--color-text-muted)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {ActiveComponent && <ActiveComponent />}
    </div>
  )
}
