import { useId } from 'react'

export default function StatusFilter({ label, value, options, onChange }) {
  const id = useId()
  return <div className="record-status-filter"><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option === 'all' ? 'All statuses' : option.charAt(0).toUpperCase() + option.slice(1)}</option>)}</select></div>
}
