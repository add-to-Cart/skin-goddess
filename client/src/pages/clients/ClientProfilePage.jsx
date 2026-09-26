import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, Phone, Mail, MapPin, FileText,
  Stethoscope, ShoppingCart, CalendarClock, Users,
} from 'lucide-react'
import clientsService from '@/services/clientsService'
import proceduresService from '@/services/proceduresService'
import salesService from '@/services/salesService'
import followUpsService from '@/services/followUpsService'
import servicesService from '@/services/servicesService'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/shared/StatCard'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const PAYMENT_STATUS = { paid: 'success', partial: 'warning', unpaid: 'danger' }
const FOLLOW_UP_STATUS = { upcoming: 'info', due: 'warning', completed: 'success', cancelled: 'neutral' }

const TABS = ['Procedures', 'Sales & Payments', 'Follow-ups']

export default function ClientProfilePage() {
  const { id } = useParams()
  const [client, setClient]         = useState(null)
  const [procedures, setProcedures] = useState([])
  const [sales, setSales]           = useState([])
  const [followUps, setFollowUps]   = useState([])
  const [serviceMap, setServiceMap] = useState({}) // id → name
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [tab, setTab]               = useState(0)

  useEffect(() => {
    Promise.all([
      clientsService.getById(id),
      proceduresService.getAll({ client_id: id }),
      salesService.getAll({ client_id: id }),
      followUpsService.getAll({ client_id: id }),
      servicesService.getAll(false),
    ])
      .then(([c, procs, s, fu, svcs]) => {
        setClient(c)
        setProcedures(procs)
        setSales(s)
        setFollowUps(fu)
        // Build a quick id→name map for services
        const map = {}
        svcs.forEach((svc) => { map[svc.id] = svc.name })
        setServiceMap(map)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingState message="Loading client profile…" />
  if (error)   return <div className="mt-4"><ErrorState message={error} /></div>
  if (!client) return <div className="mt-4"><ErrorState message="Client not found." /></div>

  const totalBilled = sales.reduce((s, sale) => s + Number(sale.total_amount), 0)
  const totalPaid   = sales.reduce((s, sale) => s + Number(sale.total_paid ?? 0), 0)

  return (
    <div>
      {/* Back breadcrumb */}
      <div className="mb-4">
        <Link
          to="/clients"
          className="inline-flex items-center gap-1.5 text-sm hover:underline"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Clients
        </Link>
      </div>

      <PageHeader
        title={`${client.first_name} ${client.last_name}`}
        subtitle={`Client since ${new Date(client.created_at).toLocaleDateString('en-PH')}`}
      >
        {/* TODO: wire to EditClientModal */}
        <Button variant="secondary" size="sm">Edit</Button>
        <Badge variant={client.is_active ? 'success' : 'neutral'}>
          {client.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </PageHeader>

      {/* ── Summary row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Procedures" value={procedures.length} accent="brand" icon={Stethoscope} />
        <StatCard label="Total Billed" value={formatCurrency(totalBilled)} accent="info" icon={ShoppingCart} />
        <StatCard label="Follow-ups" value={followUps.length} accent="neutral" icon={CalendarClock} />
        <StatCard
          label="Last Session"
          value={procedures.length > 0 ? `#${procedures[0].session_number ?? '—'}` : '—'}
          sub={procedures.length > 0 ? procedures[0].procedure_date : 'No procedures yet'}
          accent="neutral"
          icon={Users}
        />
      </div>

      {/* ── Client info card ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {client.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" style={{ color: 'var(--color-brand)' }} />
                <span style={{ color: 'var(--color-text)' }}>{client.phone}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" style={{ color: 'var(--color-brand)' }} />
                <span style={{ color: 'var(--color-text)' }}>{client.email}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-start gap-2 sm:col-span-2">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} />
                <span style={{ color: 'var(--color-text)' }}>{client.address}</span>
              </div>
            )}
            {client.notes && (
              <div className="flex items-start gap-2 sm:col-span-2">
                <FileText className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--color-text-muted)' }} />
                <span style={{ color: 'var(--color-text-muted)' }}>{client.notes}</span>
              </div>
            )}
            {!client.phone && !client.email && !client.address && !client.notes && (
              <span style={{ color: 'var(--color-text-muted)' }}>No contact information on file.</span>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* ── Tab strip ── */}
      <div className="flex gap-0.5 border-b mb-5 overflow-x-auto" style={{ borderColor: 'var(--color-border)' }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className="px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
            style={{
              borderColor: tab === i ? 'var(--color-brand)' : 'transparent',
              color: tab === i ? 'var(--color-brand-strong)' : 'var(--color-text-muted)',
            }}
          >
            {t}
            {t === 'Procedures' && procedures.length > 0 && (
              <span className="ml-1.5 text-xs rounded-full px-1.5 py-0.5"
                style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand-strong)' }}>
                {procedures.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Procedures ── */}
      {tab === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Procedure History</CardTitle>
            {/* TODO: Add Procedure button */}
            <Button size="sm">+ Add Procedure</Button>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={['Date', 'Service', 'Session', 'Price', 'Follow-up', 'Notes']}
              rows={procedures.map((p) => [
                <span className="font-medium">{p.procedure_date}</span>,
                <span>{serviceMap[p.service_id] ?? `Service #${p.service_id}`}</span>,
                <span>{p.session_number ?? '—'}</span>,
                <span>{p.price != null ? formatCurrency(p.price) : '—'}</span>,
                <span style={{ color: 'var(--color-text-muted)' }}>{p.next_follow_up ?? '—'}</span>,
                <span className="text-xs max-w-[180px] truncate"
                  style={{ color: 'var(--color-text-muted)' }}
                  title={p.notes}
                >{p.notes ?? '—'}</span>,
              ])}
              emptyState={
                <EmptyState
                  icon={Stethoscope}
                  title="No procedures yet"
                  description="Record the first procedure for this client."
                />
              }
            />
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Sales & Payments ── */}
      {tab === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Sales &amp; Payments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={['Date', 'Total', 'Status', '']}
              rows={sales.map((s) => [
                <span className="font-medium">{s.sale_date}</span>,
                <span className="font-semibold">{formatCurrency(s.total_amount)}</span>,
                <Badge variant={PAYMENT_STATUS[s.payment_status] ?? 'neutral'}>
                  {s.payment_status}
                </Badge>,
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/sales/${s.id}`}>Detail</Link>
                </Button>,
              ])}
              emptyState={
                <EmptyState
                  icon={ShoppingCart}
                  title="No sales yet"
                  description="Sales will appear here once recorded."
                />
              }
            />
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Follow-ups ── */}
      {tab === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Follow-ups</CardTitle>
            {/* TODO: Add Follow-up button */}
            <Button size="sm">+ Add Follow-up</Button>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={['Date', 'Status', 'Notes']}
              rows={followUps.map((f) => [
                <span className="font-medium">{f.follow_up_date}</span>,
                <Badge variant={FOLLOW_UP_STATUS[f.status] ?? 'neutral'}>{f.status}</Badge>,
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{f.notes ?? '—'}</span>,
              ])}
              emptyState={
                <EmptyState
                  icon={CalendarClock}
                  title="No follow-ups scheduled"
                  description="Schedule a follow-up visit for this client."
                />
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
