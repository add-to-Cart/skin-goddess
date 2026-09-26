import { useEffect, useState } from 'react'
import { UserCheck, Search } from 'lucide-react'
import employeesService from '@/services/employeesService'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import { DataTable, MobileCard, MobileField } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [search, setSearch]       = useState('')
  const [showAll, setShowAll]     = useState(false)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  function load(params) {
    setLoading(true)
    employeesService.getAll(params)
      .then(setEmployees)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load({ active_only: !showAll })
  }, [showAll])

  function handleSearch(e) {
    e.preventDefault()
    load({ search: search || undefined, active_only: !showAll })
  }

  return (
    <div>
      <PageHeader title="Employees" subtitle="Team member records">
        {/* TODO: Add Employee form */}
        <Button size="sm">+ Add Employee</Button>
      </PageHeader>

      <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
            style={{ color: 'var(--color-text-muted)' }} />
          <Input
            className="pl-8"
            placeholder="Search by name or position…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">Search</Button>
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-inactive"
            checked={showAll}
            onCheckedChange={setShowAll}
          />
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
            /* TODO: Edit Employee */
            <Button variant="ghost" size="sm">Edit</Button>,
          ])}
          mobileRows={employees.map((emp) => (
            <MobileCard
              key={emp.id}
              actions={<Button variant="ghost" size="sm">Edit</Button>}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  {emp.first_name} {emp.last_name}
                </span>
                <Badge variant={emp.is_active ? 'success' : 'neutral'}>
                  {emp.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <MobileField label="Position" value={emp.position ?? '—'} />
              <MobileField label="Salary" value={emp.salary_type ?? '—'} />
              <MobileField label="Phone" value={emp.phone ?? '—'} />
              <MobileField label="Hired" value={emp.date_hired ?? '—'} />
            </MobileCard>
          ))}
          emptyState={
            <EmptyState
              icon={UserCheck}
              title="No employees found"
              description="Add your first team member to get started."
            />
          }
        />
      )}
    </div>
  )
}
