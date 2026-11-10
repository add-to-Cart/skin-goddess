import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Archive, Pencil, UserRound } from 'lucide-react'
import authService from '@/services/authService'
import clientsService from '@/services/clientsService'
import proceduresService from '@/services/proceduresService'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import RecordSearch from '@/components/shared/RecordSearch'
import RecordPagination from '@/components/shared/RecordPagination'
import { DataTable, MobileCard, MobileField } from '@/components/shared/DataTable'
import FormDialog from '@/components/shared/FormDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import ClientForm from './ClientForm'

export default function ClientProfilePage() {
  const { id } = useParams()
  return <ClientProfile key={id} id={id} />
}

function ClientProfile({ id }) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState({ status: 'loading' })
  const [retry, setRetry] = useState(0)
  const [editClientOpen, setEditClientOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [archiveError, setArchiveError] = useState(null)

  useEffect(() => {
    let active = true
    clientsService.getById(id)
      .then((client) => { if (active) setProfile({ status: 'ready', client }) })
      .catch((error) => { if (active) setProfile({ status: 'error', message: error.message }) })
    return () => { active = false }
  }, [id, retry])

  const { client } = profile
  const clientName = client ? `${client.first_name} ${client.last_name}` : ''

  async function archiveClient(event) {
    event.preventDefault()
    if (archiving) return
    setArchiving(true)
    setArchiveError(null)
    try {
      await clientsService.deactivate(client.id)
      navigate('/clients', { replace: true })
    } catch (error) {
      setArchiveError(error.message)
    } finally {
      setArchiving(false)
    }
  }

  return <div className="client-profile min-w-0 space-y-5">
    <Link to="/clients" className="inline-flex min-h-11 items-center gap-2 text-sm"><ArrowLeft size={16} aria-hidden="true" />Clients</Link>
    {profile.status === 'loading' && <LoadingState message="Loading client details…" />}
    {profile.status === 'error' && <div className="space-y-3">
      <ErrorState message={profile.message} />
      <Button variant="outline" onClick={() => { setProfile({ status: 'loading' }); setRetry((value) => value + 1) }}>Retry client details</Button>
    </div>}
    {client && <>
      <section aria-labelledby="client-name" className="profile-overview">
        <header className="profile-heading">
          <div className="profile-person">
            <span className="profile-avatar" aria-hidden="true"><UserRound size={26} /></span>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 id="client-name" className="text-2xl font-semibold wrap-anywhere">{clientName}</h1>
              <Badge variant={client.is_active ? 'success' : 'neutral'}>{client.is_active ? 'Active' : 'Inactive'}</Badge>
            </div>
          </div>
          <div className="profile-heading-actions">
            <Button variant="outline" onClick={() => setEditClientOpen(true)}><Pencil aria-hidden="true" />Edit details</Button>
            {authService.isAdmin() && client.is_active && (
              <Button variant="ghost" size="icon" title="Archive client" aria-label="Archive client" onClick={() => { setArchiveError(null); setArchiveOpen(true) }}>
                <Archive aria-hidden="true" />
              </Button>
            )}
          </div>
        </header>
        <dl className="profile-details">
          {[
            ['Phone', client.phone],
            ['Email', client.email],
            ['Address', client.address],
            ['Registered', client.created_at && new Date(client.created_at).toLocaleDateString('en-PH')],
          ].map(([label, value]) => <div key={label} className="min-w-0">
            <dt>{label}</dt>
            <dd className="whitespace-pre-wrap wrap-anywhere">{value || 'Not recorded'}</dd>
          </div>)}
        </dl>
        {client.notes && <p className="profile-notes whitespace-pre-wrap wrap-anywhere"><strong>Client notes</strong><br />{client.notes}</p>}
      </section>

      <TreatmentHistory clientId={id} />

      {archiveOpen && <FormDialog open onClose={() => setArchiveOpen(false)} title="Archive client?" description={clientName} submitting={archiving} submitLabel="Archive client" error={archiveError} onSubmit={archiveClient}>
        <p className="text-sm">This removes the client from active lists and keeps their records.</p>
      </FormDialog>}
      <ClientForm open={editClientOpen} onClose={() => setEditClientOpen(false)} client={client} onSaved={(savedClient) => {
        setEditClientOpen(false)
        setProfile({ status: 'ready', client: savedClient })
      }} />
    </>}
  </div>
}

function TreatmentHistory({ clientId }) {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState({ search: '', cursor: null })
  const [history, setHistory] = useState({ status: 'loading' })

  useEffect(() => {
    let active = true
    proceduresService.getPage({ client_id: clientId, include_client: true, treatment_search: query.search, cursor: query.cursor })
      .then((page) => { if (active) setHistory({ status: 'ready', page }) })
      .catch((error) => { if (active) setHistory({ status: 'error', message: error.message }) })
    return () => { active = false }
  }, [clientId, query])

  function load(nextQuery) {
    setHistory({ status: 'loading' })
    setQuery(nextQuery)
  }

  const { page } = history

  function treatmentName(treatment) {
    return <span className="wrap-anywhere">
      {treatment.service?.name ?? 'Treatment'}
      {treatment.reversed_at && <> <Badge variant="neutral">Reversed</Badge></>}
    </span>
  }

  return <section aria-labelledby="treatment-history">
    <h2 id="treatment-history" className="mb-3 text-lg font-semibold">Treatment history</h2>
    <RecordSearch label="Search treatment history" hint="Search by treatment name or notes." value={search} onChange={setSearch} onSearch={() => load({ search: search.trim(), cursor: null })}>
      {(search || query.search) && <Button variant="ghost" onClick={() => { setSearch(''); load({ search: '', cursor: null }) }}>Clear search</Button>}
    </RecordSearch>
    {history.status === 'loading' && <LoadingState message="Loading treatment history…" />}
    {history.status === 'error' && <div className="space-y-3">
      <ErrorState message={history.message} />
      <Button variant="outline" onClick={() => load({ ...query })}>Retry treatment history</Button>
    </div>}
    {page && <>
      <Card>
        <CardContent className="min-w-0 p-0">
          <DataTable
            mobileBreakpoint="lg"
            columns={['Date', 'Treatment', 'Return date', 'Notes']}
            rows={page.data.map((treatment) => [
              <span className="whitespace-nowrap">{treatment.procedure_date}</span>,
              treatmentName(treatment),
              <span className="whitespace-nowrap">{treatment.next_follow_up ?? '—'}</span>,
              <span className="whitespace-pre-wrap wrap-anywhere">{treatment.notes || '—'}</span>,
            ])}
            mobileRows={page.data.map((treatment) => <MobileCard key={treatment.id}>
              <strong>{treatmentName(treatment)}</strong>
              <MobileField label="Date" value={treatment.procedure_date} />
              <MobileField label="Return date" value={treatment.next_follow_up ?? '—'} />
              {treatment.notes && <p className="whitespace-pre-wrap wrap-anywhere">{treatment.notes}</p>}
            </MobileCard>)}
            emptyState={<EmptyState title={query.search ? 'No matching treatments' : 'No treatment records'} />}
          />
        </CardContent>
      </Card>
      <RecordPagination page={page} cursor={query.cursor} showPageSize={false} onPage={(cursor) => load({ ...query, cursor })} />
    </>}
  </section>
}
