/**
 * PageHeader
 * Consistent page-level title + actions bar.
 * Usage:
 *   <PageHeader title="Clients" subtitle="Manage client records">
 *     <Button>+ Add Client</Button>
 *   </PageHeader>
 */
export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {children}
        </div>
      )}
    </div>
  )
}
