import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import dashboardService from '@/services/dashboardService'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/shared/StatCard'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import { Badge } from '@/components/ui/badge'

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    dashboardService.getSummary().then(setData).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])

  const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  if (loading) return <LoadingState message="Loading dashboard…" />
  if (error) return <ErrorState message={error} />

  return <div>
    <PageHeader title="Dashboard" subtitle={today} />
    <section aria-label="Today's clinic summary" className="clinic-stats">
      <StatCard label="Today's sales" value={formatCurrency(data.todays_sales_total)} sub={`${data.todays_sales_count} transaction${data.todays_sales_count !== 1 ? 's' : ''}`} />
      <StatCard label="Clients served" value={data.clients_served_today} sub={`${data.new_clients_today} new today`} />
      <StatCard label="Outstanding balance" value={formatCurrency(data.outstanding_payments_total)} sub={`${data.outstanding_payments_count} unpaid / partial`} />
      <StatCard label="Today's expenses" value={formatCurrency(data.todays_expenses_total)} />
    </section>
    <div className="clinic-dashboard-columns">
      <section aria-labelledby="follow-ups-heading">
        <div className="clinic-section-heading"><h2 id="follow-ups-heading">Follow-ups this week</h2><Link to="/follow-ups">View schedule</Link></div>
        {data.overdue_follow_ups_count > 0 && <p className="clinic-follow-up-notice" role="status"><Link to="/follow-ups">{data.overdue_follow_ups_count} overdue follow-up{data.overdue_follow_ups_count !== 1 ? 's' : ''} need attention</Link></p>}
        {data.upcoming_follow_ups.length === 0 ? <div className="clinic-follow-up-empty"><p>No follow-ups scheduled this week.</p><p>Client follow-ups for the next seven days will appear here.</p></div> : data.upcoming_follow_ups.map(followUp => <div className="clinic-follow-up" key={followUp.follow_up_id}>
          <div className="min-w-0"><Link to={`/clients/${followUp.client_id}`}>{followUp.client_name}</Link><p>{followUp.follow_up_date}</p></div>
          <Badge variant={followUp.status === 'due' ? 'warning' : 'neutral'}>{followUp.status}</Badge>
        </div>)}
      </section>
      <section aria-labelledby="daily-work-heading">
        <div className="clinic-section-heading"><h2 id="daily-work-heading">Daily work</h2></div>
        {[['/clients', 'Client records', 'Find a client or register someone new.'], ['/treatment-records', 'Treatment records', 'Review visits or record a treatment.'], ['/sales', 'Sales & payments', 'Review transactions and record payments.']].map(([to, title, description]) => <Link className="clinic-quick-link" to={to} key={to}><div><strong>{title}</strong><span>{description}</span></div><ArrowUpRight size={17} strokeWidth={1.5} aria-hidden="true" /></Link>)}
      </section>
    </div>
  </div>
}
