import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ReceiptText, UsersRound, Wallet, Banknote, CalendarDays, CalendarCheck, Stethoscope } from 'lucide-react'
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

  return <div className="clinic-dashboard">
    <PageHeader title="Dashboard" subtitle={today} />
    <section aria-label="Today's clinic summary" className="clinic-stats">
      <StatCard icon={<ReceiptText size={19} />} accent="brand" label="Billed today" value={formatCurrency(data.todays_sales_total)} sub={`${data.todays_sales_count} transaction${data.todays_sales_count !== 1 ? 's' : ''}`} />
      <StatCard icon={<UsersRound size={19} />} label="Clients seen" value={data.clients_served_today} sub={`${data.new_clients_today} new today`} />
      <StatCard icon={<Wallet size={19} />} accent={Number(data.outstanding_payments_total) > 0 ? 'warning' : 'neutral'} label="Outstanding" value={formatCurrency(data.outstanding_payments_total)} sub={`${data.outstanding_payments_count} unpaid / partial`} />
      <StatCard icon={<Banknote size={19} />} label="Expenses today" value={formatCurrency(data.todays_expenses_total)} />
    </section>
    <div className="clinic-dashboard-columns">
      <section aria-labelledby="follow-ups-heading">
        <div className="clinic-section-heading"><h2 id="follow-ups-heading"><CalendarDays size={18} aria-hidden="true" />This week</h2><Link to="/follow-ups">View schedule</Link></div>
        {data.overdue_follow_ups_count > 0 && <p className="clinic-follow-up-notice" role="status"><Link to="/follow-ups">{data.overdue_follow_ups_count} overdue follow-up{data.overdue_follow_ups_count !== 1 ? 's' : ''} need attention</Link></p>}
        {data.upcoming_follow_ups.length === 0 ? <div className="clinic-follow-up-empty"><CalendarCheck size={28} aria-hidden="true" /><p>No follow-ups scheduled</p><Link to="/follow-ups">Manage follow-ups<ArrowUpRight size={15} aria-hidden="true" /></Link></div> : data.upcoming_follow_ups.map(followUp => <div className="clinic-follow-up" key={followUp.follow_up_id}>
          <div className="clinic-agenda-date" aria-label={followUp.follow_up_date}><span>{new Date(`${followUp.follow_up_date}T12:00:00`).toLocaleDateString('en-PH', { month: 'short' })}</span><strong>{new Date(`${followUp.follow_up_date}T12:00:00`).getDate()}</strong></div><div className="min-w-0 flex-1"><Link to="/follow-ups">{followUp.client_name}</Link><p>Follow-up visit</p></div>
          <Badge variant={followUp.status === 'due' ? 'warning' : 'neutral'}>{followUp.status}</Badge>
        </div>)}
      </section>
      <section aria-labelledby="daily-work-heading">
        <div className="clinic-section-heading"><h2 id="daily-work-heading">Daily work</h2></div>
        {[
          { to: '/clients', title: 'Clients', note: 'Find or register', icon: UsersRound },
          { to: '/treatment-records', title: 'Treatments', note: 'Review or record a visit', icon: Stethoscope },
          { to: '/sales', title: 'Sales & payments', note: 'Billing and collections', icon: ReceiptText },
        ].map(({ to, title, note, icon: Icon }) => <Link className="clinic-quick-link" to={to} key={to}><span className="clinic-work-icon"><Icon size={20} strokeWidth={1.7} aria-hidden="true" /></span><div className="min-w-0 flex-1"><strong>{title}</strong><span>{note}</span></div><ArrowUpRight size={17} strokeWidth={1.5} aria-hidden="true" /></Link>)}
      </section>
    </div>
  </div>
}
