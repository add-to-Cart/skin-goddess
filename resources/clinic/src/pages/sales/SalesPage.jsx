import StatusFilter from '@/components/shared/StatusFilter'
import RecordSearch from '@/components/shared/RecordSearch'
import RecordPagination from '@/components/shared/RecordPagination'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, ReceiptText, Eye, ArrowUpRight, RotateCw, Plus } from 'lucide-react'
import salesService from '@/services/salesService'
import { getSaleSummary } from './saleSummaryCache'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import { DataTable, MobileCard, MobileField } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import SaleForm from './SaleForm'

const STATUS_FILTERS = ['all', 'unpaid', 'partial', 'paid']
const STATUS_VARIANT = { paid: 'success', partial: 'warning', unpaid: 'danger' }

export default function SalesPage() {
  const [query, setQuery] = useState({ status: 'all', search: '', cursor: null, revision: 0 })
  const [search, setSearch] = useState('')
  const [list, setList] = useState({ status: 'loading', sales: [], clients: {} })
  const [expanded, setExpanded] = useState(new Set())
  const [formOpen, setFormOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const summaryCache = useRef(new Map())
  const listRequest = useRef(null)
  const generation = useRef(0)

  useEffect(() => {
    let active = true
    generation.current += 1
    async function load() {
      try {
        if (!listRequest.current || listRequest.current.query !== query) {
          listRequest.current = { query, request: salesService.getPage({ search: query.search, cursor: query.cursor, include_client: true, ...(query.status === 'all' ? {} : { payment_status: query.status }) }) }
        }
        const page = await listRequest.current.request
        const sales = page.data
        if (!active) return
        const clients = Object.fromEntries(sales.filter((sale) => sale.client).map((sale) => [sale.client_id, `${sale.client.first_name} ${sale.client.last_name}`]))
        setList({ status: 'ready', sales, clients, page })
        // Limit concurrent balance requests; filtering reuses unchanged sale versions.
        for (let offset = 0; offset < sales.length && active; offset += 4) {
          const updates = await Promise.all(sales.slice(offset, offset + 4).map(async (sale) => {
            try { return { id: sale.id, financial: await getSaleSummary(sale, summaryCache.current, salesService.getSummary) } }
            catch (error) { return { id: sale.id, summaryError: error.message } }
          }))
          if (active) setList((current) => ({ ...current, sales: current.sales.map((sale) => {
            const update = updates.find((entry) => entry.id === sale.id)
            return update ? { ...sale, ...update } : sale
          }) }))
        }
      } catch (error) {
        if (active) setList({ status: 'error', sales: [], clients: {}, message: error.message })
      }
    }
    load()
    return () => { active = false }
  }, [query])

  function load(status = query.status, fresh = false, cursor = null, searchTerm = query.search) {
    generation.current += 1
    if (fresh) { summaryCache.current = new Map() }
    setExpanded(new Set())
    setList({ status: 'loading', sales: [], clients: {} })
    setQuery((current) => ({ status, search: searchTerm, cursor, revision: current.revision + 1 }))
  }
  function toggle(id) {
    setExpanded((current) => {
      const next = new Set(current)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  async function retrySummary(sale) {
    const requestGeneration = generation.current
    setList((current) => ({ ...current, sales: current.sales.map((row) => row.id === sale.id ? { ...row, summaryError: null } : row) }))
    let update
    try { update = { financial: await getSaleSummary(sale, summaryCache.current, salesService.getSummary), summaryError: null } }
    catch (error) { update = { summaryError: error.message } }
    if (generation.current === requestGeneration) setList((current) => ({ ...current, sales: current.sales.map((row) => row.id === sale.id ? { ...row, ...update } : row) }))
  }
  function identity(sale) {
    return <div className="flex min-w-0 items-start gap-2"><ReceiptText aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-brand)]" /><div><Link className="font-semibold hover:underline" to={`/sales/${sale.id}`}>Sale #{sale.id}</Link><p className="mt-1 whitespace-nowrap text-xs">{sale.sale_date}</p></div></div>
  }
  function clientIdentity(sale) {
    return <div className="min-w-0"><span className="font-medium wrap-anywhere">{list.clients[sale.client_id] || 'Name unavailable'}{sale.client?.is_active === false ? ' (archived)' : ''}</span><p className="mt-1 text-xs">#{sale.client_id}</p></div>
  }
  function type(sale) {
    const current = sale.financial ?? sale
    return current.package_service_id ? current.canceled_at ? <Badge variant="danger">Canceled package</Badge> : <Badge variant="info">Treatment package</Badge> : <Badge variant="neutral">Ordinary sale</Badge>
  }
  function paymentStatus(sale) {
    return sale.financial ? <Badge variant={STATUS_VARIANT[sale.financial.payment_status] ?? 'neutral'}>Payment: {sale.financial.payment_status}</Badge> : <span className="text-xs">{sale.summaryError ? 'Payment status unconfirmed' : 'Checking payment status…'}</span>
  }
  function paid(sale) {
    return sale.financial ? formatCurrency(sale.financial.total_paid) : sale.summaryError ? 'Unavailable' : 'Loading…'
  }
  function outstanding(sale) {
    if (sale.financial) return <span className={Number(sale.financial.remaining_balance) > 0 ? 'font-semibold text-[var(--color-danger)]' : 'font-semibold'}>{formatCurrency(sale.financial.remaining_balance)}</span>
    if (!sale.summaryError) return <span>Loading…</span>
    return <div className="space-y-1 text-sm" role="status"><p>Balance unavailable</p><p className="text-xs wrap-anywhere">{sale.summaryError}</p><Button variant="outline" size="sm" aria-label={`Retry balance for Sale #${sale.id}`} onClick={() => retrySummary(sale)}>Retry balance</Button></div>
  }
  function details(sale) {
    const current = sale.financial ?? sale
    return <div className="min-w-0 space-y-4">
      <h3 className="font-semibold">Sale #{sale.id} items</h3>
      <DataTable mobileBreakpoint="lg" columns={['Description', 'Quantity', 'Unit price', 'Line total']} rowKeys={current.items.map((item) => item.id)} rows={current.items.map((item) => [<span className="wrap-anywhere">{item.description}</span>, item.quantity, formatCurrency(item.unit_price), formatCurrency(item.line_total)])}
        mobileRows={current.items.map((item) => <div key={item.id} className="min-w-0 border-b border-[var(--color-border)] pb-3"><strong className="text-sm wrap-anywhere">{item.description}</strong><MobileField label="Quantity" value={item.quantity} /><MobileField label="Unit price" value={formatCurrency(item.unit_price)} /><MobileField label="Line total" value={formatCurrency(item.line_total)} /></div>)} emptyState={<EmptyState title="No sale items" />} />
      <div><h3 className="text-sm font-semibold">Sale notes</h3><p className="whitespace-pre-wrap text-sm wrap-anywhere">{current.notes || 'No notes recorded.'}</p></div>
    </div>
  }
  function actions(sale, layout) {
    const open = expanded.has(sale.id)
    return <div className="flex flex-wrap items-center gap-1">
      <Button variant="ghost" size="sm" aria-label={`${open ? 'Hide' : 'Show'} items for Sale #${sale.id}`} aria-expanded={open} aria-controls={`sale-${layout}-details-${sale.id}`} onClick={() => toggle(sale.id)}><Eye aria-hidden="true" />{open ? 'Hide items' : 'Items'}</Button>
      <Button variant="outline" size="sm" asChild><Link aria-label={`Open Sale #${sale.id}`} to={`/sales/${sale.id}`}>Open sale<ArrowUpRight aria-hidden="true" /></Link></Button>
    </div>
  }

  const { sales } = list
  const settled = sales.filter((sale) => sale.financial || sale.summaryError).length
  const total = sales.reduce((sum, sale) => sum + Number(sale.financial?.total_amount ?? sale.total_amount), 0)
  return <div className="interactive-list min-w-0">
    <PageHeader title="Sales"><Button size="sm" onClick={() => setFormOpen(true)}><Plus aria-hidden="true" />Add Sale</Button></PageHeader>
    {notice && <p role="status" className="mb-4 rounded-md border border-[var(--color-border)] bg-[var(--color-brand-soft)] p-3 text-sm">{notice}</p>}
    <RecordSearch label="Search sales" value={search} onChange={setSearch} onSearch={() => load(query.status, false, null, search.trim())}>
      <StatusFilter label="Payment status" value={query.status} options={STATUS_FILTERS} onChange={(status) => load(status)} />
      <Button className="record-refresh" variant="ghost" size="icon" title="Refresh sales" aria-label="Refresh sales" onClick={() => load(query.status, true, query.cursor)}><RotateCw aria-hidden="true" /></Button>
    </RecordSearch>
    <div role="status" className="record-results-summary">{list.status === 'ready' ? <><span>{sales.length} sales</span><span title="Sum of billed amounts in the current page of results">Page total <strong>{formatCurrency(total)}</strong></span>{settled < sales.length && <span>Checking balances…</span>}</> : list.status === 'loading' ? 'Loading sales…' : 'Sales unavailable'}</div>
    {list.status === 'error' ? <div className="space-y-3"><ErrorState message={`${notice ? 'The sale was saved, but the list could not be refreshed. ' : ''}${list.message}`} /><Button variant="outline" onClick={() => load()}>Retry sales list</Button></div> : list.status === 'loading' ? <LoadingState message="Loading sales…" /> : <DataTable
      mobileBreakpoint="lg"
      columns={['Sale / date', 'Client', 'Billed', 'Recorded payments', 'Outstanding', 'Status', 'Actions']}
      rowKeys={sales.map((sale) => sale.id)}
      rows={sales.map((sale) => [identity(sale), clientIdentity(sale), <span className="tabular-nums">{formatCurrency(sale.financial?.total_amount ?? sale.total_amount)}</span>, <span className="tabular-nums">{paid(sale)}</span>, outstanding(sale), <div className="flex flex-col items-start gap-2">{type(sale)}{paymentStatus(sale)}</div>, actions(sale, 'desktop')])}
      rowDetails={sales.map((sale) => ({ id: `sale-desktop-details-${sale.id}`, expanded: expanded.has(sale.id), content: expanded.has(sale.id) ? details(sale) : null }))}
      mobileRows={sales.map((sale) => <MobileCard key={sale.id} actions={actions(sale, 'mobile')}>
        {identity(sale)}{clientIdentity(sale)}<div className="mt-2 flex flex-wrap gap-2">{type(sale)}{paymentStatus(sale)}</div>
        <MobileField label="Billed" value={formatCurrency(sale.financial?.total_amount ?? sale.total_amount)} /><MobileField label="Recorded payments" value={paid(sale)} /><div className="clinic-mobile-field"><span>Outstanding</span><div className="min-w-0 text-right">{outstanding(sale)}</div></div>
        <div id={`sale-mobile-details-${sale.id}`} hidden={!expanded.has(sale.id)} className="mt-3 border-t border-[var(--color-border)] pt-3">{expanded.has(sale.id) && details(sale)}</div>
      </MobileCard>)}
      emptyState={<EmptyState icon={ShoppingCart} title="No sales found" description="Try another payment-status filter, or use Add Sale above." />}
    />}
    {list.status === 'ready' && <RecordPagination page={list.page} cursor={query.cursor} onPage={(cursor) => load(query.status, false, cursor)} />}
    <SaleForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={(sale) => { setFormOpen(false); setNotice(`Sale #${sale.id} created. Payments are recorded separately.`); load() }} />
  </div>
}
