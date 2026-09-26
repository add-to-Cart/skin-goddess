import { useEffect, useState, useCallback } from 'react'
import { Banknote, Plus } from 'lucide-react'
import salaryService from '@/services/salaryService'
import employeesService from '@/services/employeesService'
import { formatCurrency, todayISO } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import { DataTable, MobileCard, MobileField } from '@/components/shared/DataTable'
import FormDialog, { FormField } from '@/components/shared/FormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const STATUS_FILTERS = ['all', 'pending', 'released']

// ── Salary Form ───────────────────────────────────────────────────────────────

const EMPTY = {
  employee_id: '', period_start: '', period_end: '', gross_amount: '',
  deductions: '0', net_amount: '', release_date: '', status: 'pending', notes: '',
}

function SalaryForm({ open, onClose, record = null, employees, onSaved }) {
  const isEdit = Boolean(record)
  const [f, setF]               = useState(EMPTY)
  const [errors, setErrors]     = useState({})
  const [apiError, setApiError] = useState(null)
  const [submitting, setSubmit] = useState(false)

  useEffect(() => {
    if (open) {
      setF(record ? {
        employee_id:  String(record.employee_id),
        period_start: record.period_start,
        period_end:   record.period_end,
        gross_amount: String(record.gross_amount),
        deductions:   String(record.deductions),
        net_amount:   String(record.net_amount),
        release_date: record.release_date ?? '',
        status:       record.status,
        notes:        record.notes ?? '',
      } : EMPTY)
      setErrors({})
      setApiError(null)
    }
  }, [open, record])

  function set(field, value) {
    setF((prev) => {
      const next = { ...prev, [field]: value }
      // Auto-calculate net when gross or deductions change
      if (field === 'gross_amount' || field === 'deductions') {
        const g = parseFloat(field === 'gross_amount' ? value : next.gross_amount) || 0
        const d = parseFloat(field === 'deductions'   ? value : next.deductions)   || 0
        next.net_amount = String(Math.max(g - d, 0))
      }
      return next
    })
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }))
  }

  function validate() {
    const e = {}
    if (!f.employee_id && !isEdit) e.employee_id = 'Select an employee.'
    if (!f.period_start)  e.period_start  = 'Period start is required.'
    if (!f.period_end)    e.period_end    = 'Period end is required.'
    if (f.period_start && f.period_end && f.period_start > f.period_end)
      e.period_end = 'End date must be after start date.'
    const g = parseFloat(f.gross_amount)
    if (!f.gross_amount || isNaN(g) || g < 0) e.gross_amount = 'Enter a valid gross amount ≥ 0.'
    const d = parseFloat(f.deductions)
    if (isNaN(d) || d < 0) e.deductions = 'Deductions cannot be negative.'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const v = validate()
    if (Object.keys(v).length) { setErrors(v); return }

    const gross = parseFloat(f.gross_amount)
    const deductions = parseFloat(f.deductions) || 0

    const payload = {
      employee_id:  isEdit ? undefined : Number(f.employee_id),
      period_start: f.period_start,
      period_end:   f.period_end,
      gross_amount: gross,
      deductions,
      net_amount:   Math.max(gross - deductions, 0),
      release_date: f.release_date || null,
      status:       f.status,
      notes:        f.notes.trim() || null,
    }
    // Remove undefined for create
    if (isEdit) delete payload.employee_id

    setSubmit(true)
    setApiError(null)
    try {
      const saved = isEdit
        ? await salaryService.update(record.id, payload)
        : await salaryService.create(payload)
      onSaved(saved)
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
      title={isEdit ? 'Edit Salary Record' : 'Add Salary Record'}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel={isEdit ? 'Save Changes' : 'Add Record'}
      error={apiError}
    >
      {!isEdit && (
        <FormField label="Employee" required error={errors.employee_id}>
          <Select value={f.employee_id} onValueChange={(v) => set('employee_id', v)}>
            <SelectTrigger><SelectValue placeholder="Select employee…" /></SelectTrigger>
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
        <FormField label="Period Start" required error={errors.period_start}>
          <Input type="date" value={f.period_start}
            onChange={(e) => set('period_start', e.target.value)} />
        </FormField>
        <FormField label="Period End" required error={errors.period_end}>
          <Input type="date" value={f.period_end}
            onChange={(e) => set('period_end', e.target.value)} />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Gross Amount (₱)" required error={errors.gross_amount}>
          <Input type="number" min="0" step="0.01" value={f.gross_amount}
            onChange={(e) => set('gross_amount', e.target.value)} placeholder="0.00" />
        </FormField>
        <FormField label="Deductions (₱)" error={errors.deductions}>
          <Input type="number" min="0" step="0.01" value={f.deductions}
            onChange={(e) => set('deductions', e.target.value)} placeholder="0.00" />
        </FormField>
      </div>

      {/* Net preview */}
      {f.gross_amount && (
        <div className="rounded-lg px-4 py-3 text-sm flex justify-between"
          style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>Net Amount</span>
          <span className="font-bold" style={{ color: 'var(--color-text)' }}>
            {formatCurrency(parseFloat(f.net_amount) || 0)}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Release Date">
          <Input type="date" value={f.release_date}
            onChange={(e) => set('release_date', e.target.value)} />
        </FormField>
        <FormField label="Status">
          <Select value={f.status} onValueChange={(v) => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="released">Released</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <FormField label="Notes">
        <Input value={f.notes} onChange={(e) => set('notes', e.target.value)}
          placeholder="Optional notes…" />
      </FormField>
    </FormDialog>
  )
}

// ── Salary Page ───────────────────────────────────────────────────────────────

export default function SalaryPage() {
  const [records, setRecords]       = useState([])
  const [employees, setEmployees]   = useState([])
  const [employeeMap, setEmpMap]    = useState({})
  const [status, setStatus]         = useState('all')
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [formOpen, setFormOpen]     = useState(false)
  const [editing, setEditing]       = useState(null)

  const loadRecords = useCallback(() => {
    setLoading(true)
    salaryService.getAll(status !== 'all' ? { status } : {})
      .then(setRecords)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [status])

  useEffect(() => {
    employeesService.getAll({ active_only: false }).then((emps) => {
      setEmployees(emps)
      const em = {}
      emps.forEach((e) => { em[e.id] = `${e.first_name} ${e.last_name}` })
      setEmpMap(em)
    }).catch(() => {})
  }, [])

  useEffect(() => { loadRecords() }, [loadRecords])

  function openEdit(r) {
    setEditing(r)
    setFormOpen(true)
  }

  return (
    <div>
      <PageHeader title="Salary" subtitle="Salary release records">
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="h-4 w-4" /> Add Record
        </Button>
      </PageHeader>

      <div className="flex items-center gap-1 mb-5">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: status === s ? 'var(--color-brand)' : 'var(--color-surface)',
              color: status === s ? '#fff' : 'var(--color-text-muted)',
              border: `1px solid ${status === s ? 'var(--color-brand)' : 'var(--color-border)'}`,
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span className="text-sm ml-auto" style={{ color: 'var(--color-text-muted)' }}>
          {records.length} record{records.length !== 1 ? 's' : ''}
        </span>
      </div>

      <Card className="mb-5">
        <CardContent className="py-3">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Note: </span>
            Payroll calculation rules are not yet finalized. Net amount is computed as
            Gross − Deductions. This page records salary releases.
          </p>
        </CardContent>
      </Card>

      {error && <ErrorState message={error} className="mb-4" />}

      {loading ? (
        <LoadingState message="Loading salary records…" />
      ) : (
        <DataTable
          columns={['Employee', 'Period', 'Gross', 'Deductions', 'Net', 'Release Date', 'Status', '']}
          rows={records.map((r) => [
            <span className="font-semibold">
              {employeeMap[r.employee_id] ?? `Employee #${r.employee_id}`}
            </span>,
            <span className="whitespace-nowrap text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {r.period_start} → {r.period_end}
            </span>,
            <span>{formatCurrency(r.gross_amount)}</span>,
            <span style={{ color: 'var(--color-danger)' }}>{formatCurrency(r.deductions)}</span>,
            <span className="font-semibold">{formatCurrency(r.net_amount)}</span>,
            <span style={{ color: 'var(--color-text-muted)' }}>{r.release_date ?? '—'}</span>,
            <Badge variant={r.status === 'released' ? 'success' : 'warning'}>{r.status}</Badge>,
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
                <Badge variant={r.status === 'released' ? 'success' : 'warning'}>{r.status}</Badge>
              </div>
              <MobileField label="Period" value={`${r.period_start} → ${r.period_end}`} />
              <MobileField label="Gross"  value={formatCurrency(r.gross_amount)} />
              <MobileField label="Deductions" value={formatCurrency(r.deductions)} />
              <div className="flex items-baseline justify-between gap-2 text-sm pt-1 border-t"
                style={{ borderColor: 'var(--color-border-subtle)' }}>
                <span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Net</span>
                <span className="font-bold">{formatCurrency(r.net_amount)}</span>
              </div>
            </MobileCard>
          ))}
          emptyState={
            <EmptyState icon={Banknote} title="No salary records found"
              description="Add salary release records for your team.">
              <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
                <Plus className="h-4 w-4" /> Add Record
              </Button>
            </EmptyState>
          }
        />
      )}

      <SalaryForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        record={editing}
        employees={employees}
        onSaved={() => { setFormOpen(false); setEditing(null); loadRecords() }}
      />
    </div>
  )
}
