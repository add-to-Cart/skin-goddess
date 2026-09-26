import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import attendanceService from '@/services/attendanceService'
import employeesService from '@/services/employeesService'
import { todayISO } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import { DataTable, MobileCard, MobileField } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

const STATUS_VARIANT = {
  present:  'success',
  late:     'warning',
  absent:   'danger',
  leave:    'info',
}

export default function AttendancePage() {
  const [records, setRecords]     = useState([])
  const [employeeMap, setEmpMap]  = useState({})
  const [dateFilter, setDate]     = useState(todayISO())
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  function load(date) {
    setLoading(true)
    Promise.all([
      attendanceService.getAll({ date_from: date, date_to: date }),
      employeesService.getAll({ active_only: false }),
    ])
      .then(([recs, employees]) => {
        setRecords(recs)
        const em = {}
        employees.forEach((e) => { em[e.id] = `${e.first_name} ${e.last_name}` })
        setEmpMap(em)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(dateFilter) }, [dateFilter])

  const summary = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Daily time records">
        {/* TODO: Record Attendance form */}
        <Button size="sm">+ Record Attendance</Button>
      </PageHeader>

      {/* Date + summary row */}
      <div className="flex flex-wrap items-center gap-4 mb-5">
        <div className="flex items-center gap-2">
          <Label htmlFor="date-filter" className="text-sm">Date</Label>
          <Input
            id="date-filter"
            type="date"
            className="w-40"
            value={dateFilter}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {['present', 'late', 'absent', 'leave'].map((s) => (
            <Badge key={s} variant={STATUS_VARIANT[s]}>
              {summary[s] ?? 0} {s}
            </Badge>
          ))}
        </div>
      </div>

      {error && <ErrorState message={error} className="mb-4" />}

      {loading ? (
        <LoadingState message="Loading attendance…" />
      ) : (
        <DataTable
          columns={['Employee', 'Status', 'Time In', 'Time Out', 'Overtime (hrs)', 'Notes', '']}
          rows={records.map((r) => [
            <span className="font-semibold">
              {employeeMap[r.employee_id] ?? `Employee #${r.employee_id}`}
            </span>,
            <Badge variant={STATUS_VARIANT[r.status] ?? 'neutral'}>{r.status}</Badge>,
            <span style={{ color: 'var(--color-text-muted)' }}>{r.time_in ?? '—'}</span>,
            <span style={{ color: 'var(--color-text-muted)' }}>{r.time_out ?? '—'}</span>,
            <span style={{ color: 'var(--color-text-muted)' }}>{r.overtime_hours ?? '—'}</span>,
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{r.notes ?? '—'}</span>,
            /* TODO: Edit record */
            <Button variant="ghost" size="sm">Edit</Button>,
          ])}
          mobileRows={records.map((r) => (
            <MobileCard
              key={r.id}
              actions={<Button variant="ghost" size="sm">Edit</Button>}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  {employeeMap[r.employee_id] ?? `Employee #${r.employee_id}`}
                </span>
                <Badge variant={STATUS_VARIANT[r.status] ?? 'neutral'}>{r.status}</Badge>
              </div>
              <MobileField label="Time In" value={r.time_in ?? '—'} />
              <MobileField label="Time Out" value={r.time_out ?? '—'} />
              {r.overtime_hours && (
                <MobileField label="Overtime" value={`${r.overtime_hours} hrs`} />
              )}
              {r.notes && <MobileField label="Notes" value={r.notes} />}
            </MobileCard>
          ))}
          emptyState={
            <EmptyState
              icon={Clock}
              title="No attendance records for this date"
              description="Select a different date or record attendance for today."
            />
          }
        />
      )}
    </div>
  )
}
