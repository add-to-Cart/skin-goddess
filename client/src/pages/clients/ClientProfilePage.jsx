import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, Phone, Mail, MapPin, FileText,
  Stethoscope, ShoppingCart, CalendarClock, Users, Plus,
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
import ClientForm from './ClientForm'
import ProcedureForm from '../procedures/ProcedureForm'
import FollowUpForm from '../follow-ups/FollowUpForm'
import SaleForm from '../sales/SaleForm'

const PAYMENT_STATUS  = { paid: 'success', partial: 'warning', unpaid: 'danger' }
const FOLLOW_UP_STATUS = { upcoming: 'info', due: 'warning', completed: 'success', cancelled: 'neutral' }
const TABS = ['Procedures', 'Sales & Payments', 'Follow-ups']

export default function ClientProfilePage() {
  const { id } = useParams()

  const [client, setClient]         = useState(null)
  const [procedures, setProcedures] = useState([])
  const [sales, setSales]           = useState([])
  const [followUps, setFollowUps]   = useState([])
  const [serviceMap, setServiceMap] = useState({})
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [tab, setTab]               = useState(0)

  // Modal state
  const [editClientOpen,    setEditClientOpen]    = useState(false)
  const [procedureFormOpen, setProcedureFormOpen] = useState(false)
  const [editingProcedure,  setEditingProcedure]  = useState(null)
  const [saleFormOpen,      setSaleFormOpen]      = useState(false)
  const [followUpFormOpen,  setFollowUpFormOpen]  = useState(false)

  function openNewProcedure()  { setEditingProcedure(null); setProcedureFormOpen(true) }
  function openEditProcedure(p) { setEditingProcedure(p);   setProcedureFormOpen(true) }

  const loadAll = useCallback(() => {
    setLoading(true)
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
        const map = {}
        svcs.forEach((svc) => { map[svc.id] = svc.name })
        setServiceMap(map)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { loadAll() }, [loadAll])

  if (loading) return <LoadingState message="Loading client profile…" />
  if (error)   return <div className="mt-4"><ErrorState message={error} /></div>
  if (!client) return <div className="mt-4"><ErrorState message="Client not found." /></div>

  const totalBilled = sales.reduce((s, sale) => s + Number(sale.total_amount), 0)

  return (
    <div>
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
        <Button variant="secondary" size="sm" onClick={() => setEditClientOpen(true)}>
          Edit
        </Button>
        <Badge variant={client.is_active ? 'success' : 'neutral'}>
          {client.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </PageHeader>

      {/* Summary stats */}
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

      {/* Contact info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {client.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" style={{ color: 'var(--color-brand)' }} />
                <span>{client.phone}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" style={{ color: 'var(--color-brand)' }} />
                <span>{client.email}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-start gap-2 sm:col-span-2">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} />
                <span>{client.address}</span>
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

      {/* Tab strip */}
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
            {i === 0 && procedures.length > 0 && (
              <span className="ml-1.5 text-xs rounded-full px-1.5 py-0.5"
                style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand-strong)' }}>
                {procedures.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Procedures tab */}
      {tab === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Procedure History</CardTitle>
            <Button size="sm" onClick={openNewProcedure}>
              <Plus className="h-4 w-4" /> Add Procedure
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={['Date', 'Service', 'Session', 'Price', 'Follow-up', 'Supplies', '']}
              rows={procedures.map((p) => [
                <span className="font-medium whitespace-nowrap">{p.procedure_date}</span>,
                <span>{serviceMap[p.service_id] ?? `Service #${p.service_id}`}</span>,
                <span>{p.session_number ?? '—'}</span>,
                <span>{p.price != null ? formatCurrency(p.price) : '—'}</span>,
                <span style={{ color: 'var(--color-text-muted)' }}>{p.next_follow_up ?? '—'}</span>,
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {(p.supplies_used?.length ?? 0)} item{(p.supplies_used?.length ?? 0) !== 1 ? 's' : ''}
                </span>,
                <Button variant="ghost" size="sm" onClick={() => openEditProcedure(p)}>Edit</Button>,
              ])}
              emptyState={
                <EmptyState
                  icon={Stethoscope}
                  title="No procedures yet"
                  description="Record the first procedure for this client."
                >
                  <Button size="sm" onClick={openNewProcedure}>
                    <Plus className="h-4 w-4" /> Add Procedure
                  </Button>
                </EmptyState>
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Sales & Payments tab */}
      {tab === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Sales &amp; Payments</CardTitle>
            <Button size="sm" onClick={() => setSaleFormOpen(true)}>
              <Plus className="h-4 w-4" /> Add Sale
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={['Date', 'Total', 'Status', '']}
              rows={sales.map((s) => [
                <span className="font-medium whitespace-nowrap">{s.sale_date}</span>,
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
                  description="Record a sale transaction for this client."
                >
                  <Button size="sm" onClick={() => setSaleFormOpen(true)}>
                    <Plus className="h-4 w-4" /> Add Sale
                  </Button>
                </EmptyState>
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Follow-ups tab */}
      {tab === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Follow-ups</CardTitle>
            <Button size="sm" onClick={() => setFollowUpFormOpen(true)}>
              <Plus className="h-4 w-4" /> Add Follow-up
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={['Date', 'Status', 'Notes']}
              rows={followUps.map((f) => [
                <span className="font-medium whitespace-nowrap">{f.follow_up_date}</span>,
                <Badge variant={FOLLOW_UP_STATUS[f.status] ?? 'neutral'}>{f.status}</Badge>,
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{f.notes ?? '—'}</span>,
              ])}
              emptyState={
                <EmptyState
                  icon={CalendarClock}
                  title="No follow-ups scheduled"
                  description="Schedule a follow-up visit for this client."
                >
                  <Button size="sm" onClick={() => setFollowUpFormOpen(true)}>
                    <Plus className="h-4 w-4" /> Add Follow-up
                  </Button>
                </EmptyState>
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <ClientForm
        open={editClientOpen}
        onClose={() => setEditClientOpen(false)}
        client={client}
        onSaved={(updated) => { setClient(updated); setEditClientOpen(false) }}
      />

      <ProcedureForm
        open={procedureFormOpen}
        onClose={() => { setProcedureFormOpen(false); setEditingProcedure(null) }}
        procedure={editingProcedure}
        defaultClientId={editingProcedure ? null : Number(id)}
        existingProcedures={procedures}
        serviceMap={serviceMap}
        onSaved={() => {
          setProcedureFormOpen(false)
          setEditingProcedure(null)
          loadAll()
          setTab(0)
        }}
      />

      <FollowUpForm
        open={followUpFormOpen}
        onClose={() => setFollowUpFormOpen(false)}
        defaultClientId={Number(id)}
        onSaved={() => { loadAll(); setFollowUpFormOpen(false); setTab(2) }}
      />

      <SaleForm
        open={saleFormOpen}
        onClose={() => setSaleFormOpen(false)}
        defaultClientId={Number(id)}
        onSaved={() => { setSaleFormOpen(false); loadAll(); setTab(1) }}
      />
    </div>
  )
}
