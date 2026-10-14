export default function StatCard({ label, value, sub }) {
  return <div className="clinic-stat">
    <p className="clinic-stat-label">{label}</p>
    <p className="clinic-stat-value">{value}</p>
    {sub && <p className="clinic-stat-note">{sub}</p>}
  </div>
}
