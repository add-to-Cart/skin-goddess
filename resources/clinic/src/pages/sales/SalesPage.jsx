import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, ChevronRight, Plus } from 'lucide-react'
import salesService from '@/services/salesService'
import clientsService from '@/services/clientsService'
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
  const [sales, setSales]         = useState([])
  const [clientMap, setClientMap] = useState({})
  const [statusFilter, setStatus] = useState('all')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [formOpen, setFormOpen]   = useState(false)

  const loadAll = useCallback(() => {
    setLoading(true)
    Promise.all([
      salesService.getAll(statusFilter !== 'all' ? { payment_status: statusFilter } : {}),
      clientsService.getAll(),
    ])
      .then(([s, clients]) => {
        setSales(s)
        const cm = {}
        clients.forEach((c) => { cm[c.id] = `${c.first_name} ${c.last_name}` })
        setClientMap(cm)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [statusFilter])

  useEffect(() => { loadAll() }, [loadAll])

  const total = sales.reduce((s, sale) => s + Number(sale.total_amount), 0)

  const empty = (
    <EmptyState
      icon={ShoppingCart}
      title="No sales found"
      description="Sales will appear here once recorded."
    />
  )

  return (
    <div>
      <PageHeader title="Sales" subtitle="Transaction history">
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> Add Sale
        </Button>
      </PageHeader>

      {/* Filter tabs + summary */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="flex items-center gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: statusFilter === s ? 'var(--color-brand)' : 'var(--color-surface)',
                color: statusFilter === s ? '#fff' : 'var(--color-text-muted)',
                border: `1px solid ${statusFilter === s ? 'var(--color-brand)' : 'var(--color-border)'}`,
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-sm ml-auto" style={{ color: 'var(--color-text-muted)' }}>
          {sales.length} sale{sales.length !== 1 ? 's' : ''} — {formatCurrency(total)}
        </span>
      </div>

      {error && <ErrorState message={error} className="mb-4" />}

      {loading ? (
        <LoadingState message="Loading sales…" />
      ) : (
        <DataTable
          columns={['Date', 'Client', 'Total', 'Payment', 'Notes', '']}
          rows={sales.map((s) => [
            <span className="font-medium whitespace-nowrap">{s.sale_date}</span>,
            <span>{clientMap[s.client_id] ?? `Client #${s.client_id}`}</span>,
            <span className="font-semibold">{formatCurrency(s.total_amount)}</span>,
            <Badge variant={STATUS_VARIANT[s.payment_status] ?? 'neutral'}>
              {s.payment_status}
            </Badge>,
            <span className="text-xs max-w-[160px] truncate"
              style={{ color: 'var(--color-text-muted)' }}
              title={s.notes}
            >
              {s.notes ?? '—'}
            </span>,
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/sales/${s.id}`}>
                Detail <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>,
          ])}
          mobileRows={sales.map((s) => (
            <MobileCard
              key={s.id}
              actions={
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/sales/${s.id}`}>
                    View detail <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  {clientMap[s.client_id] ?? `Client #${s.client_id}`}
                </span>
                <Badge variant={STATUS_VARIANT[s.payment_status] ?? 'neutral'}>
                  {s.payment_status}
                </Badge>
              </div>
              <MobileField label="Date" value={s.sale_date} />
              <MobileField label="Total" value={formatCurrency(s.total_amount)} />
              {s.notes && <MobileField label="Notes" value={s.notes} />}
            </MobileCard>
          ))}
          emptyState={empty}
        />
      )}

      <SaleForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(sale) => { setFormOpen(false); loadAll() }}
      />
    </div>
  )
}
