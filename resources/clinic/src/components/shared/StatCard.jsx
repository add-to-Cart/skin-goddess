export default function StatCard({ label, value, sub, icon, accent = 'neutral' }) {
  return <div className={`clinic-stat clinic-stat-${accent}`}>
    <div className="clinic-stat-heading"><p className="clinic-stat-label">{label}</p>{icon && <span className="clinic-stat-icon" aria-hidden="true">{icon}</span>}</div>
    <p className="clinic-stat-value">{value}</p>
    {sub && <p className="clinic-stat-note">{sub}</p>}
  </div>
}
