import { useEffect, useState, useCallback } from 'react'
import { UserCheck, Search, Plus } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const SALARY_TYPES = ['daily', 'hourly', 'monthly', 'commission', 'other']

// ── Employee Form ─────────────────────────────────────────────────────────────

const EMPTY = {
  first_name: '', last_name: '', phone: '', email: '',
  address: '', position: '', salary_type: 'daily', date_hired: '', notes: '',
}

function EmployeeForm({ open, onClose, employee = null, onSaved }) {
  const isEdit = Boolean(employee)
  const [f, setF]               = useState(EMPTY)
  const [errors, setErrors]     = useState({})
  const [apiError, setApiError] = useState(null)
  const [submitting, setSubmit] = useState(false)

  useEffect(() => {
    if (open) {
      setF(employee ? {
        first_name:   employee.first_name ?? '',
        last_name:    employee.last_name  ?? '',
        phone:        employee.phone      ?? '',
        email:        employee.email      ?? '',
        address:      employee.address    ?? '',
        position:     employee.position   ?? '',
        salary_type:  employee.salary_type ?? 'daily',
        date_hired:   employee.date_hired  ?? '',
        notes:        employee.notes      ?? '',
      } : EMPTY)
      setErrors({})
      setApiError(null)
    }
  }, [open, employee])

  function set(field, value) {
    setF((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }))
  }

  function validate() {
    const e = {}
    if (!f.first_name.trim()) e.first_name = 'First name is required.'
    if (!f.last_name.trim())  e.last_name  = 'Last name is required.'
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
      e.email = 'Enter a valid email address.'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const v = validate()
    if (Object.keys(v).length) { setErrors(v); return }

    const payload = {
      first_name:  f.first_name.trim(),
      last_name:   f.last_name.trim(),
      phone:       f.phone.trim()    || null,
      email:       f.email.trim()    || null,
      address:     f.address.trim()  || null,
      position:    f.position.trim() || null,
      salary_type: f.salary_type     || null,
      date_hired:  f.date_hired      || null,
      notes:       f.notes.trim()    || null,
    }

    setSubmit(true)
    setApiError(null)
    try {
      const saved = isEdit
        ? await employeesService.update(employee.id, payload)
        : await employeesService.create(payload)
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
      title={isEdit ? 'Edit Employee' : 'Add Employee'}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel={isEdit ? 'Save Changes' : 'Add Employee'}
      error={apiError}
    >
      <div className="grid grid-cols-2 gap-4">
        <FormField label="First Name" required error={errors.first_name}>
          <Input value={f.first_name} onChange={(e) => set('first_name', e.target.value)}
            placeholder="Maria" autoFocus />
        </FormField>
        <FormField label="Last Name" required error={errors.last_name}>
          <Input value={f.last_name} onChange={(e) => set('last_name', e.target.value)}
            placeholder="Santos" />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Position">
          <Input value={f.position} onChange={(e) => set('position', e.target.value)}
            placeholder="Aesthetician" />
        </FormField>
        <FormField label="Salary Type">
          <Select value={f.salary_type} onValueChange={(v) => set('salary_type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SALARY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Phone">
          <Input type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)}
            placeholder="09XX XXX XXXX" />
        </FormField>
        <FormField label="Date Hired">
          <Input type="date" value={f.date_hired}
            onChange={(e) => set('date_hired', e.target.value)} />
        </FormField>
      </div>

      <FormField label="Email" error={errors.email}>
        <Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)}
          placeholder="employee@example.com" />
      </FormField>

      <FormField label="Address">
        <Input value={f.address} onChange={(e) => set('address', e.target.value)}
          placeholder="Street, City" />
      </FormField>

      <FormField label="Notes">
        <textarea
          className="flex min-h-[60px] w-full rounded-lg border px-3 py-2 text-sm resize-y"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
          }}
          value={f.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Optional notes…"
        />
      </FormField>
    </FormDialog>
  )
}

// ── Employees Page ────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [search, setSearch]       = useState('')
  const [showAll, setShowAll]     = useState(false)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [formOpen, setFormOpen]   = useState(false)
  const [editing, setEditing]     = useState(null)

  const loadAll = useCallback(() => {
    setLoading(true)
    employeesService.getAll({ active_only: !showAll })
      .then(setEmployees)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [showAll])

  useEffect(() => { loadAll() }, [loadAll])

  function handleSearch(e) {
    e.preventDefault()
    setLoading(true)
    employeesService.getAll({ search: search || undefined, active_only: !showAll })
      .then(setEmployees)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  function openEdit(emp) {
    setEditing(emp)
    setFormOpen(true)
  }

  async function toggleActive(emp) {
    try {
      await employeesService.update(emp.id, { is_active: !emp.is_active })
      loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <PageHeader title="Employees" subtitle="Team member records">
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="h-4 w-4" /> Add Employee
        </Button>
      </PageHeader>

      <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
            style={{ color: 'var(--color-text-muted)' }} />
          <Input className="pl-8" placeholder="Search by name or position…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button type="submit" variant="secondary" size="sm">Search</Button>
        <div className="flex items-center gap-2">
          <Checkbox id="show-inactive" checked={showAll} onCheckedChange={setShowAll} />
          <Label htmlFor="show-inactive" className="text-sm cursor-pointer">Show inactive</Label>
        </div>
      </form>

      {error && <ErrorState message={error} className="mb-4" />}

      {loading ? (
        <LoadingState message="Loading employees…" />
      ) : (
        <DataTable
          columns={['Name', 'Position', 'Salary Type', 'Phone', 'Date Hired', 'Status', '']}
          rows={employees.map((emp) => [
            <span className="font-semibold">{emp.last_name}, {emp.first_name}</span>,
            <span style={{ color: 'var(--color-text-muted)' }}>{emp.position ?? '—'}</span>,
            <span style={{ color: 'var(--color-text-muted)' }}>{emp.salary_type ?? '—'}</span>,
            <span style={{ color: 'var(--color-text-muted)' }}>{emp.phone ?? '—'}</span>,
            <span style={{ color: 'var(--color-text-muted)' }} className="whitespace-nowrap">
              {emp.date_hired ?? '—'}
            </span>,
            <Badge variant={emp.is_active ? 'success' : 'neutral'}>
              {emp.is_active ? 'Active' : 'Inactive'}
            </Badge>,
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => openEdit(emp)}>Edit</Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleActive(emp)}
                style={{ color: emp.is_active ? 'var(--color-danger)' : 'var(--color-success)' }}
              >
                {emp.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>,
          ])}
          mobileRows={employees.map((emp) => (
            <MobileCard
              key={emp.id}
              actions={
                <>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(emp)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(emp)}
                    style={{ color: emp.is_active ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {emp.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </>
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm">
                  {emp.first_name} {emp.last_name}
                </span>
                <Badge variant={emp.is_active ? 'success' : 'neutral'}>
                  {emp.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <MobileField label="Position"    value={emp.position   ?? '—'} />
              <MobileField label="Salary Type" value={emp.salary_type ?? '—'} />
              <MobileField label="Phone"       value={emp.phone      ?? '—'} />
              <MobileField label="Hired"       value={emp.date_hired  ?? '—'} />
            </MobileCard>
          ))}
          emptyState={
            <EmptyState icon={UserCheck} title="No employees found"
              description="Add your first team member.">
              <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
                <Plus className="h-4 w-4" /> Add Employee
              </Button>
            </EmptyState>
          }
        />
      )}

      <EmployeeForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        employee={editing}
        onSaved={() => { setFormOpen(false); setEditing(null); loadAll() }}
      />
    </div>
  )
}
