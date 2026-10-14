export default function PageHeader({ title, subtitle, children }) {
  return <div className="clinic-page-heading">
    <div className="min-w-0"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    {children && <div className="clinic-page-actions">{children}</div>}
  </div>
}
