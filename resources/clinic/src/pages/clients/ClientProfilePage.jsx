import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody } from '@/components/ui/dialog'
import { ArrowLeft, Pencil, UserRound, Archive, MoreHorizontal, Plus, ChevronDown, Info, Stethoscope, Receipt, CalendarClock } from 'lucide-react'
import authService from '@/services/authService'
import clientsService from '@/services/clientsService'
import proceduresService from '@/services/proceduresService'
import salesService from '@/services/salesService'
import followUpsService from '@/services/followUpsService'
import servicesService from '@/services/servicesService'
import { formatCurrency } from '@/lib/utils'
import { summarizeClientSales } from './profileFinancials'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import { DataTable, MobileCard, MobileField } from '@/components/shared/DataTable'
import FormDialog, { FormField } from '@/components/shared/FormDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import ClientForm from './ClientForm'
import ProcedureForm from '../procedures/ProcedureForm'
import FollowUpForm from '../follow-ups/FollowUpForm'
import SaleForm from '../sales/SaleForm'
import PaymentForm from '../sales/PaymentForm'

const PAYMENT_STATUS = { paid: 'success', partial: 'warning', unpaid: 'danger' }
const FOLLOW_UP_STATUS = { upcoming: 'info', due: 'warning', completed: 'success', cancelled: 'neutral' }
const TABS = ['Treatment records', 'Sales & payments', 'Follow-ups']

export default function ClientProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [archiveError, setArchiveError] = useState(null)
  const [snapshot, setSnapshot] = useState({ status: 'loading' })
  const [reload, setReload] = useState(0)
  const [tab, setTab] = useState(0)
  const [editClientOpen, setEditClientOpen] = useState(false)
  const [procedureFormOpen, setProcedureFormOpen] = useState(false)
  const [editingProcedure, setEditingProcedure] = useState(null)
  const [saleFormOpen, setSaleFormOpen] = useState(false)
  const [followUpFormOpen, setFollowUpFormOpen] = useState(false)
  const [paymentChoiceOpen, setPaymentChoiceOpen] = useState(false)
  const [paymentChoice, setPaymentChoice] = useState('')
  const [paymentSale, setPaymentSale] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [client, procedures, saleRows, followUps, services] = await Promise.all([
          clientsService.getById(id), proceduresService.getAll({ client_id: id }),
          salesService.getAll({ client_id: id }), followUpsService.getAll({ client_id: id }), servicesService.getAll(false),
        ])
        const sales = await Promise.all(saleRows.map(async (sale) => {
          const [financial, progress] = await Promise.all([
            salesService.getSummary(sale.id), sale.package_service_id ? salesService.getSessions(sale.id) : Promise.resolve(null),
          ])
          return { ...sale, ...financial, financial, progress }
        }))
        const totals = summarizeClientSales(sales)
        if (active) setSnapshot({ status: 'ready', client, procedures, sales, followUps, totals, serviceMap: Object.fromEntries(services.map((service) => [service.id, service.name])) })
      } catch (error) {
        if (active) setSnapshot({ status: 'error', clientId: id, message: error.message })
      }
    }
    load()
    return () => { active = false }
  }, [id, reload])

  function refresh() {
    setSnapshot({ status: 'loading' })
    setReload((value) => value + 1)
  }
  function openTreatment(procedure = null) {
    setEditingProcedure(procedure)
    setProcedureFormOpen(true)
  }

  if (snapshot.status === 'error' && snapshot.clientId === id) return <div className="space-y-3"><ErrorState message={`Client profile unavailable: ${snapshot.message} Financial totals have not been displayed.`} /><Button variant="outline" onClick={refresh}>Retry client profile</Button><Link className="block" to="/clients">Back to clients</Link></div>
  if (snapshot.status !== 'ready' || String(snapshot.client.id) !== id) return <LoadingState message="Loading client details, balances and package history…" />

  const { client, procedures, sales, followUps, totals, serviceMap } = snapshot
  const clientName = `${client.first_name} ${client.last_name}`
  const packages = sales.filter((sale) => sale.progress)
  const payableSales = sales.filter((sale) => Number(sale.financial.remaining_balance) > 0)
  const selectedPayment = payableSales.find((sale) => String(sale.id) === paymentChoice)
  const packageState = (sale) => sale.progress.is_canceled ? 'Canceled — no new sessions' : sale.progress.remaining_sessions === 0 ? 'All sessions used' : 'Sessions available'
  const treatmentName = (procedure) => serviceMap[procedure.service_id] ?? `Treatment #${procedure.service_id}`
  const treatmentPrice = (procedure) => procedure.package_sale_id ? 'Included in package' : procedure.price != null ? formatCurrency(procedure.price) : '—'
  function treatmentStatus(procedure) {
    return <div className="flex flex-wrap gap-1">{procedure.package_sale_id ? <Badge variant={procedure.reversed_at ? 'danger' : 'success'}>{procedure.reversed_at ? 'Reversed — excluded from progress' : 'Completed package session'}</Badge> : <Badge variant="neutral">Standalone record</Badge>}{procedure.package_sale?.canceled_at && <Badge variant="danger">Canceled package</Badge>}</div>
  }
  function treatmentAction(procedure) {
    return procedure.package_sale_id ? <Button variant="outline" asChild><Link to={`/sales/${procedure.package_sale_id}`}>Purchase #{procedure.package_sale_id} history</Link></Button> : <Button variant="ghost" size="icon" title={`Edit treatment #${procedure.id}`} aria-label={`Edit treatment #${procedure.id}`} onClick={() => openTreatment(procedure)}><Pencil aria-hidden="true" /></Button>
  }
  function saleAction(sale) {
    return <Button variant="outline" asChild><Link to={`/sales/${sale.id}`}>Sale #{sale.id} details</Link></Button>
  }

  return <div className="client-profile min-w-0 space-y-5">
    <Link to="/clients" className="inline-flex min-h-11 items-center gap-2 text-sm"><ArrowLeft size={16} />Clients</Link>
    <section aria-labelledby="client-name" className="profile-overview">
      <header className="profile-heading">
        <div className="profile-person"><span className="profile-avatar" aria-hidden="true"><UserRound size={26} /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h1 id="client-name" className="text-2xl font-semibold wrap-anywhere">{clientName}</h1><Badge variant={client.is_active ? 'success' : 'neutral'}>{client.is_active ? 'Active' : 'Inactive'}</Badge></div><p className="mt-1 text-sm text-[var(--color-text-muted)]">Client #{client.id}{client.phone ? ` · ${client.phone}` : ''}</p></div></div>
        <div className="profile-heading-actions">
          <Menu.Root modal={false}><Menu.Trigger asChild><Button aria-label="New record" className="gap-2"><Plus aria-hidden="true" />New record<ChevronDown aria-hidden="true" /></Button></Menu.Trigger><Menu.Portal><Menu.Content align="end" sideOffset={8} collisionPadding={16} className="profile-menu" onCloseAutoFocus={(event) => { if (procedureFormOpen || saleFormOpen || followUpFormOpen) event.preventDefault() }}>
            <Menu.Item className="profile-menu-item" onSelect={() => openTreatment()}><Stethoscope aria-hidden="true" />Treatment record</Menu.Item>
            <Menu.Item className="profile-menu-item" onSelect={() => setSaleFormOpen(true)}><Receipt aria-hidden="true" />Sale or package</Menu.Item>
            <Menu.Item className="profile-menu-item" onSelect={() => setFollowUpFormOpen(true)}><CalendarClock aria-hidden="true" />Follow-up reminder</Menu.Item>
          </Menu.Content></Menu.Portal></Menu.Root>
          <Menu.Root modal={false}><Menu.Trigger asChild><Button variant="ghost" size="icon" title="Client options" aria-label="Client options"><MoreHorizontal aria-hidden="true" /></Button></Menu.Trigger><Menu.Portal><Menu.Content align="end" sideOffset={8} collisionPadding={16} className="profile-menu" onCloseAutoFocus={(event) => { if (detailsOpen || editClientOpen || archiveOpen) event.preventDefault() }}>
            <Menu.Item className="profile-menu-item" onSelect={() => setDetailsOpen(true)}><Info aria-hidden="true" />Client details</Menu.Item>
            <Menu.Item className="profile-menu-item" onSelect={() => setEditClientOpen(true)}><Pencil aria-hidden="true" />Edit client</Menu.Item>
            {authService.isAdmin() && <><Menu.Separator className="my-1 border-t border-[var(--color-border)]" /><Menu.Item className="profile-menu-item text-[var(--color-danger)]" onSelect={() => { setArchiveError(null); setArchiveOpen(true) }}><Archive aria-hidden="true" />Archive client</Menu.Item></>}
          </Menu.Content></Menu.Portal></Menu.Root>
        </div>
      </header>
      {client.notes && <p className="profile-notes whitespace-pre-wrap wrap-anywhere"><strong>Client notes: </strong>{client.notes}</p>}
      <div className="profile-financial"><dl className="profile-money">
        {[['Total billed', totals.total_amount], ['Recorded payments', totals.total_paid], ['Outstanding balance', totals.remaining_balance]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-[var(--color-text-muted)]">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums wrap-anywhere">{formatCurrency(value)}</dd></div>)}
      </dl>{payableSales.length > 0 && <Button variant="outline" onClick={() => { setPaymentChoice(''); setPaymentChoiceOpen(true) }}>Record Payment</Button>}</div>
    </section>

    {packages.length > 0 && <section aria-labelledby="purchased-packages">
      <h2 id="purchased-packages" className="mb-3 text-base font-semibold">Packages ({packages.length})</h2>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">{packages.map((purchase) => <article key={purchase.id} className="min-w-0 rounded-md border bg-[var(--color-surface)] p-4" aria-label={`Purchase #${purchase.id}`}>
        <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h3 className="font-semibold wrap-anywhere">{serviceMap[purchase.package_service_id] ?? purchase.items[0]?.description}</h3><p className="mt-1 text-xs">Purchase #{purchase.id} · {purchase.sale_date}</p></div><Button variant="ghost" asChild><Link to={`/sales/${purchase.id}`}>Open #{purchase.id}</Link></Button></div>
        <div className="my-3 flex flex-wrap gap-2"><Badge variant={purchase.progress.is_canceled ? 'danger' : purchase.progress.remaining_sessions === 0 ? 'neutral' : 'success'}>{packageState(purchase)}</Badge><Badge variant={PAYMENT_STATUS[purchase.payment_status] ?? 'neutral'}>Payment: {purchase.payment_status}</Badge></div>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">{[['Price', purchase.financial.total_amount], ['Recorded payments', purchase.financial.total_paid], ['Outstanding', purchase.financial.remaining_balance]].map(([label, value]) => <div key={label}><dt className="text-xs text-[var(--color-text-muted)]">{label}</dt><dd className="mt-1 font-semibold tabular-nums wrap-anywhere">{formatCurrency(value)}</dd></div>)}</dl>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t pt-3 text-sm"><div><dt className="inline text-[var(--color-text-muted)]">Completed </dt><dd className="inline font-semibold">{purchase.progress.completed_sessions}/{purchase.progress.included_sessions}</dd></div><div><dt className="inline text-[var(--color-text-muted)]">{purchase.progress.is_canceled ? 'Unused — not redeemable ' : 'Remaining '}</dt><dd className="inline font-semibold">{purchase.progress.remaining_sessions}</dd></div></dl>
        {purchase.progress.reversed_sessions > 0 && <p className="mt-2 text-xs">{purchase.progress.reversed_sessions} reversed record(s), excluded from progress.</p>}
        {purchase.progress.is_canceled && <p className="mt-2 text-xs">Cancellation does not settle debt or refund payments.</p>}
      </article>)}</div>
    </section>}

    <section aria-label="Client history">
      <div className="profile-tabs" role="tablist" aria-label="Client history">{TABS.map((label, index) => <button type="button" role="tab" key={label} id={`client-tab-${index}`} aria-selected={tab === index} aria-controls={`client-panel-${index}`} tabIndex={tab === index ? 0 : -1} className="profile-tab" onClick={() => setTab(index)} onKeyDown={(event) => {
        let next
        if (event.key === 'ArrowRight') next = (index + 1) % TABS.length
        else if (event.key === 'ArrowLeft') next = (index + TABS.length - 1) % TABS.length
        else if (event.key === 'Home') next = 0
        else if (event.key === 'End') next = TABS.length - 1
        else return
        event.preventDefault()
        setTab(next)
        document.getElementById(`client-tab-${next}`)?.focus()
      }}>{label}<span className="profile-tab-count">{[procedures.length, sales.length, followUps.length][index]}</span></button>)}</div>
      <div id="client-panel-0" role="tabpanel" aria-labelledby="client-tab-0" tabIndex={0} hidden={tab !== 0} className="profile-history-panel">
      {tab === 0 && <Card>
        <CardContent className="min-w-0 p-0">
          <DataTable mobileBreakpoint="lg" columns={['Date', 'Treatment', 'Record status', 'Treatment price', 'Follow-up', 'Supplies', '']} rows={procedures.map((procedure) => [procedure.procedure_date, treatmentName(procedure), <div>{procedure.session_number != null && <p>History #{procedure.session_number}</p>}{treatmentStatus(procedure)}</div>, treatmentPrice(procedure), procedure.next_follow_up ?? '—', `${procedure.supplies_used?.length ?? 0} items`, treatmentAction(procedure)])}
            mobileRows={procedures.map((procedure) => <MobileCard key={procedure.id} actions={treatmentAction(procedure)}><strong className="wrap-anywhere">{treatmentName(procedure)}</strong><MobileField label="Date" value={procedure.procedure_date} /><MobileField label="History #" value={procedure.session_number} />{treatmentStatus(procedure)}<MobileField label="Treatment price" value={treatmentPrice(procedure)} /><MobileField label="Follow-up" value={procedure.next_follow_up ?? '—'} /><MobileField label="Supply items" value={procedure.supplies_used?.length ?? 0} /></MobileCard>)} emptyState={<EmptyState title="No treatment records" description="Add a treatment from New record." />} />
        </CardContent>
      </Card>}
      </div>
      <div id="client-panel-1" role="tabpanel" aria-labelledby="client-tab-1" tabIndex={0} hidden={tab !== 1} className="profile-history-panel">
      {tab === 1 && <Card>
        <CardContent className="min-w-0 p-0">
          <DataTable mobileBreakpoint="lg" columns={['Sale / date', 'Type / payment status', 'Billed', 'Recorded payments', 'Outstanding', '']} rows={sales.map((sale) => [<div>Sale #{sale.id}<p>{sale.sale_date}</p></div>, <div>{sale.package_service_id ? sale.progress.is_canceled ? 'Canceled package' : 'Treatment package' : 'Ordinary sale'}<p>{sale.payment_status}</p></div>, formatCurrency(sale.financial.total_amount), formatCurrency(sale.financial.total_paid), formatCurrency(sale.financial.remaining_balance), saleAction(sale)])}
            mobileRows={sales.map((sale) => <MobileCard key={sale.id} actions={saleAction(sale)}><strong>Sale #{sale.id} · {sale.sale_date}</strong><span>{sale.package_service_id ? sale.progress.is_canceled ? 'Canceled package' : 'Treatment package' : 'Ordinary sale'}</span><Badge variant={PAYMENT_STATUS[sale.payment_status] ?? 'neutral'}>Payment: {sale.payment_status}</Badge><MobileField label="Billed" value={formatCurrency(sale.financial.total_amount)} /><MobileField label="Recorded payments" value={formatCurrency(sale.financial.total_paid)} /><MobileField label="Outstanding" value={formatCurrency(sale.financial.remaining_balance)} /></MobileCard>)} emptyState={<EmptyState title="No sales recorded" description="Use New record to add a sale or package." />} />
        </CardContent>
      </Card>}
      </div>
      <div id="client-panel-2" role="tabpanel" aria-labelledby="client-tab-2" tabIndex={0} hidden={tab !== 2} className="profile-history-panel">
      {tab === 2 && <Card>
        <CardHeader className="flex-wrap gap-3"><CardTitle>Follow-ups</CardTitle><Button variant="outline" onClick={() => setFollowUpFormOpen(true)}>Schedule follow-up</Button></CardHeader>
        <CardContent className="min-w-0 p-0"><DataTable mobileBreakpoint="lg" columns={['Date', 'Status', 'Notes']} rows={followUps.map((followUp) => [followUp.follow_up_date, <Badge variant={FOLLOW_UP_STATUS[followUp.status] ?? 'neutral'}>{followUp.status}</Badge>, <span className="whitespace-pre-wrap wrap-anywhere">{followUp.notes ?? '—'}</span>])}
          mobileRows={followUps.map((followUp) => <MobileCard key={followUp.id}><MobileField label="Date" value={followUp.follow_up_date} /><Badge variant={FOLLOW_UP_STATUS[followUp.status] ?? 'neutral'}>{followUp.status}</Badge>{followUp.notes && <p className="whitespace-pre-wrap wrap-anywhere">{followUp.notes}</p>}</MobileCard>)} emptyState={<EmptyState title="No follow-ups scheduled" description="Reminders are scheduled separately from treatment dates." />} /><div className="p-4"><Link className="inline-flex min-h-11 items-center" to="/follow-ups">Open follow-up worklist</Link></div></CardContent>
      </Card>}
      </div>
    </section>

    <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}><DialogContent><DialogHeader><DialogTitle>Client details</DialogTitle><DialogDescription>{clientName} · Client #{client.id}</DialogDescription></DialogHeader><DialogBody><dl className="profile-details">{[['Phone', client.phone], ['Email', client.email], ['Address', client.address], ['Registered', new Date(client.created_at).toLocaleDateString('en-PH')]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="whitespace-pre-wrap wrap-anywhere">{value || 'Not recorded'}</dd></div>)}</dl></DialogBody></DialogContent></Dialog>
    {paymentChoiceOpen && <FormDialog open onClose={() => setPaymentChoiceOpen(false)} title="Choose sale for payment" description={`${clientName} · Client #${client.id}. Each payment belongs to one sale.`} submitLabel="Continue to payment" submitDisabled={!selectedPayment} onSubmit={(event) => { event.preventDefault(); if (selectedPayment) { setPaymentChoiceOpen(false); setPaymentSale(selectedPayment) } }}>
      <FormField label="Sale receiving payment" required><select aria-label="Sale receiving payment" className="min-h-11 w-full min-w-0 rounded-md border p-2" value={paymentChoice} onChange={(event) => setPaymentChoice(event.target.value)}><option value="">Select a specific sale</option>{payableSales.map((sale) => <option key={sale.id} value={sale.id}>Sale #{sale.id} · {sale.sale_date} · {formatCurrency(sale.financial.remaining_balance)} outstanding{sale.progress?.is_canceled ? ' · Canceled package' : ''}</option>)}</select></FormField>
      {selectedPayment && <div className="space-y-2 text-sm wrap-anywhere"><p>Sale #{selectedPayment.id} · {selectedPayment.items.map((item) => item.description).join(', ')}</p><p>Billed {formatCurrency(selectedPayment.financial.total_amount)} · Recorded payments {formatCurrency(selectedPayment.financial.total_paid)} · Outstanding {formatCurrency(selectedPayment.financial.remaining_balance)}</p></div>}
    </FormDialog>}
    {paymentSale && <PaymentForm key={paymentSale.id} open saleId={paymentSale.id} context={`${clientName} · Client #${client.id} · Sale #${paymentSale.id}`} remainingBalance={Number(paymentSale.financial.remaining_balance)} onClose={() => setPaymentSale(null)} onSaved={() => { setPaymentSale(null); setTab(1); refresh() }} />}
    {archiveOpen && <FormDialog open onClose={() => setArchiveOpen(false)} title="Archive client?" description={`${clientName} · Client #${client.id}`} submitting={archiving} submitLabel="Archive client" error={archiveError} onSubmit={async (event) => {
      event.preventDefault()
      if (archiving) return
      setArchiving(true)
      setArchiveError(null)
      try { await clientsService.deactivate(client.id); navigate('/clients', { replace: true }) }
      catch (error) { setArchiveError(error.message) }
      finally { setArchiving(false) }
    }}><p className="text-sm">Removes this client from active lists. Sales, payments, treatment history and outstanding balances remain recorded.</p></FormDialog>}
    <ClientForm open={editClientOpen} onClose={() => setEditClientOpen(false)} client={client} onSaved={() => { setEditClientOpen(false); refresh() }} />
    <ProcedureForm open={procedureFormOpen} onClose={() => { setProcedureFormOpen(false); setEditingProcedure(null) }} procedure={editingProcedure} defaultClientId={editingProcedure ? null : Number(id)} serviceMap={editingProcedure ? serviceMap : null} clientName={clientName} onSaved={() => { setProcedureFormOpen(false); setEditingProcedure(null); setTab(0); refresh() }} />
    <FollowUpForm clientContext={`${clientName} · Client #${client.id}`} open={followUpFormOpen} onClose={() => setFollowUpFormOpen(false)} defaultClientId={Number(id)} onSaved={() => { setFollowUpFormOpen(false); setTab(2); refresh() }} />
    <SaleForm clientContext={`${clientName} · Client #${client.id}`} open={saleFormOpen} onClose={() => setSaleFormOpen(false)} defaultClientId={Number(id)} onSaved={() => { setSaleFormOpen(false); setTab(1); refresh() }} />
  </div>
}
