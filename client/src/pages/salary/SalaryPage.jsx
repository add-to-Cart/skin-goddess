import { useEffect, useState } from 'react'
import { Banknote } from 'lucide-react'
import salaryService from '@/services/salaryService'
import employeesService from '@/services/employeesService'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import { DataTable, MobileCard, MobileField } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const STATUS_FILTERS = ['all', 'pending', 'released']

export default function SalaryPage() {
  const [records, setRecords]       = useState([])
  const [employeeMap, setEmpMap]    = useState({})
  const [status, setStatus]         = useState('all')
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      salaryService.getAll(status !== 'all' ? { status } : {}),
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
  }, [status])

  return (
    <div>
      <PageHeader title="Salary" subtitle="Salary release records">
        {/* TODO: Add Salary Record form */}
        <Button size="sm">+ Add Salary Record</Button>
      </PageHeader>

      {/* Status filter */}
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

      {/* Note card */}
      <Card className="mb-5">
        <CardContent className="py-3">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Note: </span>
            Payroll calculation rules (daily, hourly, commission, etc.) are not yet finalized.
            This page records salary releases. Calculation logic will be added once business rules are confirmed.
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
                <Badge variant={r.status === 'released' ? 'success' : 'warning'}>{r.status}</Badge>
              </div>
              <MobileField
                label="Period"
                value={`${r.period_start} → ${r.period_end}`}
              />
              <MobileField label="Gross" value={formatCurrency(r.gross_amount)} />
              <MobileField label="Deductions" value={formatCurrency(r.deductions)} />
              <div className="flex items-baseline justify-between gap-2 text-sm pt-1 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
                <span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Net</span>
                <span className="font-bold" style={{ color: 'var(--color-text)' }}>
                  {formatCurrency(r.net_amount)}
                </span>
              </div>
            </MobileCard>
          ))}
          emptyState={
            <EmptyState
              icon={Banknote}
              title="No salary records found"
              description="Add salary release records for your team."
            />
          }
        />
      )}
    </div>
  )
}
