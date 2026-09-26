import { useEffect, useState, useCallback } from 'react'
import { Clock, Plus } from 'lucide-react'
import attendanceService from '@/services/attendanceService'
import employeesService from '@/services/employeesService'
import { todayISO } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import { DataTable, MobileCard, MobileField } from '@/components/shared/DataTable'
import FormDialog, { FormField } from '@/components/shared/FormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const STATUS_VARIANT = { present: 'success', late: 'warning', absent: 'danger', leave: 'info' }
const STATUSES = ['present', 'late', 'absent', 'leave']

// ── Attendance Form ───────────────────────────────────────────────────────────

function AttendanceForm({ open, onClose, onSaved, employees, record = null, defaultDate }) {
  const isEdit = Boolean(record)
  const [employeeId, setEmpId]    = useState('')
  const [date, setDate]           = useState(defaultDate ?? todayISO())
  const [status, setStatus]       = useState('present')
  const [timeIn, setTimeIn]       = useState('')
  const [timeOut, setTimeOut]     = useState('')
  const [overtime, setOvertime]   = useState('')
  const [notes, setNotes]         = useState('')
  const [errors, setErrors]       = useState({})
  const [apiError, setApiError]   = useState(null)
  const [submitting, setSubmit]   = useState(false)

  useEffect(() => {
    if (open) {
      if (record) {
        setEmpId(String(record.employee_id))
        setDate(record.attendance_date)
        setStatus(record.status)
        setTimeIn(record.time_in  ?? '')
        setTimeOut(record.time_out ?? '')
        setOvertime(record.overtime_hours != null ? String(record.overtime_hours) : '')
        setNotes(record.notes ?? '')
      } else {
        setEmpId('')
        setDate(defaultDate ?? todayISO())
        setStatus('present')
        setTimeIn('')
        setTimeOut('')
        setOvertime('')
        setNotes('')
      }
      setErrors({})
      setApiError(null)
    }
  }, [open, record])

  function validate() {
    const e = {}
    if (!employeeId && !isEdit) e.employeeId = 'Select an employee.'
    if (!date)                   e.date       = 'Date is required.'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const v = validate()
    if (Object.keys(v).length) { setErrors(v); return }

    setSubmit(true)
    setApiError(null)
    try {
      if (isEdit) {
        await attendanceService.update(record.id, {
          status,
          time_in:        timeIn  || null,
          time_out:       timeOut || null,
          overtime_hours: overtime ? parseFloat(overtime) : null,
          notes:          notes.trim() || null,
        })
      } else {
        await attendanceService.create({
          employee_id:     Number(employeeId),
          attendance_date: date,
          status,
          time_in:         timeIn  || null,
          time_out:        timeOut || null,
          overtime_hours:  overtime ? parseFloat(overtime) : null,
          notes:           notes.trim() || null,
        })
      }
      onSaved()
    } catch (err) {
      setApiError(err.message)
    } finally {
      setSubmit(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Attendance' : 'Record Attendance'}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel={isEdit ? 'Save Changes' : 'Record'}
      error={apiError}
    >
      {!isEdit && (
        <FormField label="Employee" required error={errors.employeeId}>
          <Select value={employeeId} onValueChange={setEmpId}>
            <SelectTrigger>
              <SelectValue placeholder="Select employee…" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={String(emp.id)}>
                  {emp.first_name} {emp.last_name}
                  {emp.position ? ` — ${emp.position}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Date" required error={errors.date}>
          <Input type="date" value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isEdit} />
        </FormField>
        <FormField label="Status">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      {(status === 'present' || status === 'late') && (
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Time In">
            <Input type="time" value={timeIn} onChange={(e) => setTimeIn(e.target.value)} />
          </FormField>
          <FormField label="Time Out">
            <Input type="time" value={timeOut} onChange={(e) => setTimeOut(e.target.value)} />
          </FormField>
        </div>
      )}

      {(status === 'present' || status === 'late') && (
        <FormField label="Overtime (hours)">
          <Input type="number" min="0" step="0.25" value={overtime}
            onChange={(e) => setOvertime(e.target.value)} placeholder="0" />
        </FormField>
      )}

      <FormField label="Notes">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes…" />
      </FormField>
    </FormDialog>
  )
}

// ── Attendance Page ───────────────────────────────────────────────────────────

export default function AttendancePage() {
  const [records, setRecords]     = useState([])
  const [employees, setEmployees] = useState([])
  const [employeeMap, setEmpMap]  = useState({})
  const [dateFilter, setDate]     = useState(todayISO())
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [formOpen, setFormOpen]   = useState(false)
  const [editing, setEditing]     = useState(null)

  const loadRecords = useCallback(() => {
    setLoading(true)
    attendanceService.getAll({ date_from: dateFilter, date_to: dateFilter })
      .then(setRecords)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [dateFilter])

  // Load employees once (for the form and name lookup)
  useEffect(() => {
    employeesService.getAll({ active_only: false }).then((emps) => {
      setEmployees(emps)
      const em = {}
      emps.forEach((e) => { em[e.id] = `${e.first_name} ${e.last_name}` })
      setEmpMap(em)
    }).catch(() => {})
  }, [])

  useEffect(() => { loadRecords() }, [loadRecords])

  function openEdit(record) {
    setEditing(record)
    setFormOpen(true)
  }

  const summary = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Daily time records">
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="h-4 w-4" /> Record Attendance
        </Button>
      </PageHeader>

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
          columns={['Employee', 'Status', 'Time In', 'Time Out', 'Overtime', 'Notes', '']}
          rows={records.map((r) => [
            <span className="font-semibold">
              {employeeMap[r.employee_id] ?? `Employee #${r.employee_id}`}
            </span>,
            <Badge variant={STATUS_VARIANT[r.status] ?? 'neutral'}>{r.status}</Badge>,
            <span style={{ color: 'var(--color-text-muted)' }}>{r.time_in  ?? '—'}</span>,
            <span style={{ color: 'var(--color-text-muted)' }}>{r.time_out ?? '—'}</span>,
            <span style={{ color: 'var(--color-text-muted)' }}>
              {r.overtime_hours ? `${r.overtime_hours}h` : '—'}
            </span>,
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {r.notes ?? '—'}
            </span>,
            <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>Edit</Button>,
          ])}
          mobileRows={records.map((r) => (
            <MobileCard
              key={r.id}
              actions={<Button variant="ghost" size="sm" onClick={() => openEdit(r)}>Edit</Button>}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm">
                  {employeeMap[r.employee_id] ?? `Employee #${r.employee_id}`}
                </span>
                <Badge variant={STATUS_VARIANT[r.status] ?? 'neutral'}>{r.status}</Badge>
              </div>
              <MobileField label="Time In"  value={r.time_in  ?? '—'} />
              <MobileField label="Time Out" value={r.time_out ?? '—'} />
              {r.overtime_hours && (
                <MobileField label="Overtime" value={`${r.overtime_hours}h`} />
              )}
              {r.notes && <MobileField label="Notes" value={r.notes} />}
            </MobileCard>
          ))}
          emptyState={
            <EmptyState icon={Clock} title="No attendance records for this date"
              description="Record attendance for each employee.">
              <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
                <Plus className="h-4 w-4" /> Record Attendance
              </Button>
            </EmptyState>
          }
        />
      )}

      <AttendanceForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        onSaved={() => { setFormOpen(false); setEditing(null); loadRecords() }}
        employees={employees}
        record={editing}
        defaultDate={dateFilter}
      />
    </div>
  )
}
