import { useState, useEffect } from 'react'
import { BarChart2 } from 'lucide-react'
import reportsService from '@/services/reportsService'
import clientsService from '@/services/clientsService'
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ── Shared date range picker ──────────────────────────────────────────────────

function DateRangePicker({ fromId, toId, from, to, onFrom, onTo, optionalLabel = false }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={fromId}>From{optionalLabel ? ' (optional)' : ''}</Label>
        <Input id={fromId} type="date" className="w-40" value={from} onChange={(e) => onFrom(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={toId}>To{optionalLabel ? ' (optional)' : ''}</Label>
        <Input id={toId} type="date" className="w-40" value={to} onChange={(e) => onTo(e.target.value)} />
      </div>
    </div>
  )
}

// ── Report panels ─────────────────────────────────────────────────────────────

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
            <StatCard label="Total Sales"   value={formatCurrency(data.total_sales)}   accent="brand" />
            <StatCard label="Transactions"  value={data.transaction_count}             accent="neutral" />
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
          <DateRangePicker fromId="sr-from" toId="sr-to"
            from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <Button variant="secondary" onClick={run} disabled={loading || !from || !to}>Run</Button>
        </div>
        {error && <ErrorState message={error} />}
        {loading && <LoadingState message="Running report…" />}
        {data && !loading && (
          <div className="grid grid-cols-3 gap-3 mt-2">
            <StatCard label="Total Sales"  value={formatCurrency(data.total_sales)}      accent="brand" />
            <StatCard label="Collected"    value={formatCurrency(data.total_collected)}  accent="success" />
            <StatCard label="Outstanding"  value={formatCurrency(data.total_outstanding)} accent="warning" />
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
          <DateRangePicker fromId="ec-from" toId="ec-to"
            from={from} to={to} onFrom={setFrom} onTo={setTo} optionalLabel />
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
                  <span className="font-semibold"
                    style={{ color: r.is_low_stock ? 'var(--color-danger)' : 'var(--color-text)' }}>
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

/**
 * InventoryUsageByProcedureReport
 * Answers: "What supplies were consumed across all procedures in a date range?"
 * Useful for understanding total material costs over a period.
 * Backend: GET /reports/inventory/usage-by-procedure
 */
function InventoryUsageByProcedureReport() {
  const [from, setFrom]       = useState('')
  const [to, setTo]           = useState('')
  const [rows, setRows]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  function run() {
    setLoading(true); setError(null)
    reportsService.inventoryUsageByProcedure({
      date_from: from || undefined,
      date_to:   to   || undefined,
    })
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  const totalCost = rows?.reduce((s, r) => s + (r.total_cost ?? 0), 0) ?? 0

  return (
    <Card>
      <CardHeader><CardTitle>Supply Usage by Procedure</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Total supplies consumed across all procedures, with material cost.
          Optionally filter by procedure date range.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <DateRangePicker fromId="up-from" toId="up-to"
            from={from} to={to} onFrom={setFrom} onTo={setTo} optionalLabel />
          <Button variant="secondary" onClick={run} disabled={loading}>Run</Button>
        </div>
        {error && <ErrorState message={error} />}
        {loading && <LoadingState message="Running report…" />}
        {rows && !loading && (
          rows.length === 0
            ? (
              <EmptyState icon={BarChart2}
                title="No supply usage found"
                description="No procedures with recorded supplies for this date range." />
            ) : (
              <>
                {/* Summary stat */}
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Items Used (types)" value={rows.length}            accent="neutral" />
                  <StatCard label="Total Material Cost" value={formatCurrency(totalCost)} accent="warning" />
                </div>
                <DataTable
                  columns={['Item', 'Unit', 'Total Qty Used', 'Total Cost']}
                  rows={rows.map((r) => [
                    <span className="font-semibold">{r.item_name}</span>,
                    <span style={{ color: 'var(--color-text-muted)' }}>{r.unit ?? '—'}</span>,
                    <span className="font-medium">{r.total_quantity_used}</span>,
                    <span className="font-semibold">
                      {r.total_cost ? formatCurrency(r.total_cost) : '—'}
                    </span>,
                  ])}
                  emptyState={null}
                />
              </>
            )
        )}
      </CardContent>
    </Card>
  )
}

/**
 * InventoryUsageByClientReport
 * Answers: "How much did this client cost us in supplies?"
 * This is a capability the manual process cannot provide at all.
 * Backend: GET /reports/inventory/usage-by-client
 */
function InventoryUsageByClientReport() {
  const [clients, setClients]   = useState([])
  const [clientId, setClientId] = useState('')
  const [rows, setRows]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [loadingClients, setLoadingClients] = useState(false)
  const [error, setError]       = useState(null)

  // Load client list on mount
  useEffect(() => {
    setLoadingClients(true)
    clientsService.getAll()
      .then(setClients)
      .catch(() => {})
      .finally(() => setLoadingClients(false))
  }, [])

  function run() {
    setLoading(true); setError(null); setRows(null)
    reportsService.inventoryUsageByClient(clientId || undefined)
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  // Group rows by client when running for all clients
  const clientMap = {}
  clients.forEach((c) => { clientMap[c.id] = `${c.first_name} ${c.last_name}` })

  const totalCost = rows?.reduce((s, r) => s + (r.total_cost ?? 0), 0) ?? 0

  return (
    <Card>
      <CardHeader><CardTitle>Supply Usage by Client</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Supplies consumed per client — answers "How much did this client cost us in materials?"
          Leave client blank to see all clients.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Client (optional — leave blank for all)</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All clients…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All clients</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.first_name} {c.last_name}
                    {c.phone ? ` — ${c.phone}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="secondary" onClick={run} disabled={loading || loadingClients}>
            Run
          </Button>
        </div>
        {error && <ErrorState message={error} />}
        {loading && <LoadingState message="Running report…" />}
        {rows && !loading && (
          rows.length === 0
            ? (
              <EmptyState icon={BarChart2}
                title="No supply usage found"
                description="No procedures with recorded supplies for this selection." />
            ) : (
              <>
                {totalCost > 0 && (
                  <StatCard label="Total Material Cost" value={formatCurrency(totalCost)} accent="warning" />
                )}
                {/* When showing all clients, group by client_id */}
                {clientId ? (
                  <DataTable
                    columns={['Item', 'Unit', 'Total Qty', 'Cost']}
                    rows={rows.map((r) => [
                      <span className="font-semibold">{r.item_name}</span>,
                      <span style={{ color: 'var(--color-text-muted)' }}>{r.unit ?? '—'}</span>,
                      <span className="font-medium">{r.total_quantity_used}</span>,
                      <span className="font-semibold">
                        {r.total_cost ? formatCurrency(r.total_cost) : '—'}
                      </span>,
                    ])}
                    emptyState={null}
                  />
                ) : (
                  <DataTable
                    columns={['Client', 'Item', 'Unit', 'Total Qty', 'Cost']}
                    rows={rows.map((r) => [
                      <span className="font-semibold">
                        {clientMap[r.client_id] ?? `Client #${r.client_id}`}
                      </span>,
                      <span>{r.item_name}</span>,
                      <span style={{ color: 'var(--color-text-muted)' }}>{r.unit ?? '—'}</span>,
                      <span className="font-medium">{r.total_quantity_used}</span>,
                      <span className="font-semibold">
                        {r.total_cost ? formatCurrency(r.total_cost) : '—'}
                      </span>,
                    ])}
                    emptyState={null}
                  />
                )}
              </>
            )
        )}
      </CardContent>
    </Card>
  )
}

// ── Reports Page ───────────────────────────────────────────────────────────────

const REPORT_SECTIONS = [
  { key: 'sales-daily',        label: 'Daily Sales',              Component: SalesDailyReport },
  { key: 'sales-range',        label: 'Sales Range',              Component: SalesRangeReport },
  { key: 'expenses-category',  label: 'Expenses by Category',     Component: ExpensesByCategoryReport },
  { key: 'outstanding',        label: 'Outstanding Balances',     Component: OutstandingBalancesReport },
  { key: 'inventory-stock',    label: 'Inventory Stock',          Component: InventoryStockReport },
  { key: 'usage-by-procedure', label: 'Supply Usage (Procedures)', Component: InventoryUsageByProcedureReport },
  { key: 'usage-by-client',    label: 'Supply Usage (Client)',    Component: InventoryUsageByClientReport },
]

export default function ReportsPage() {
  const [active, setActive] = useState('sales-daily')
  const ActiveComponent = REPORT_SECTIONS.find((r) => r.key === active)?.Component

  return (
    <div>
      <PageHeader title="Reports" subtitle="Business analytics and summaries" />

      {/* Tab strip — scrollable on mobile */}
      <div
        className="flex gap-0.5 overflow-x-auto border-b mb-6"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {REPORT_SECTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className="px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0"
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
