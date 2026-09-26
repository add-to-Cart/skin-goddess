import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingCart, Users, AlertCircle, Receipt,
  CalendarClock, Package,
} from 'lucide-react'
import dashboardService from '@/services/dashboardService'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/shared/StatCard'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const FOLLOW_UP_STATUS = {
  upcoming: 'info',
  due:      'warning',
  overdue:  'danger',
}

export default function DashboardPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    dashboardService.getSummary()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const today = new Date().toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  if (loading) return <LoadingState message="Loading dashboard…" />
  if (error)   return <div className="mt-4"><ErrorState message={error} /></div>

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={today}
      />

      {/* ── Key stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Today's Sales"
          value={formatCurrency(data.todays_sales_total)}
          sub={`${data.todays_sales_count} transaction${data.todays_sales_count !== 1 ? 's' : ''}`}
          accent="brand"
          icon={ShoppingCart}
        />
        <StatCard
          label="Clients Served"
          value={data.clients_served_today}
          sub={`${data.new_clients_today} new today`}
          accent="success"
          icon={Users}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(data.outstanding_payments_total)}
          sub={`${data.outstanding_payments_count} unpaid / partial`}
          accent="warning"
          icon={AlertCircle}
        />
        <StatCard
          label="Today's Expenses"
          value={formatCurrency(data.todays_expenses_total)}
          accent="danger"
          icon={Receipt}
        />
      </div>

      {/* ── Two-column section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* Follow-ups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" style={{ color: 'var(--color-brand)' }} />
              Upcoming Follow-ups
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/follow-ups">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {data.overdue_follow_ups_count > 0 && (
              <div className="mx-5 mt-4">
                <ErrorState
                  message={`${data.overdue_follow_ups_count} overdue follow-up${data.overdue_follow_ups_count !== 1 ? 's' : ''} need attention`}
                />
              </div>
            )}
            {data.upcoming_follow_ups.length === 0 ? (
              <p className="px-5 py-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                No upcoming follow-ups this week.
              </p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
                {data.upcoming_follow_ups.map((f) => (
                  <div key={f.follow_up_id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/clients/${f.client_id}`}
                        className="text-sm font-medium truncate block hover:underline"
                        style={{ color: 'var(--color-text)' }}
                      >
                        {f.client_name}
                      </Link>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {f.follow_up_date}
                      </span>
                    </div>
                    <Badge variant={FOLLOW_UP_STATUS[f.status] ?? 'neutral'}>
                      {f.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low stock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" style={{ color: 'var(--color-warning)' }} />
              Low Stock Alerts
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/inventory">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {data.low_stock_items.length === 0 ? (
              <p className="px-5 py-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                All stock levels are healthy.
              </p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
                {data.low_stock_items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                      {item.name}
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-danger)' }}>
                        {item.current_quantity} {item.unit}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        min {item.minimum_stock_level}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Attendance summary ── */}
      <Card className="max-w-xs">
        <CardHeader>
          <CardTitle>Today's Attendance</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/attendance">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{ color: 'var(--color-text-muted)' }}>Present</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>
                {data.present_today}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{ color: 'var(--color-text-muted)' }}>Absent</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-danger)' }}>
                {data.absent_today}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
