import { useId } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function RecordSearch({ value, onChange, onSearch, label = 'Search records', hint = 'Search by client name, phone, email, client ID or record ID.', children }) {
  const id = useId()
  return <div className="record-toolbar">
    <form className="record-search" role="search" onSubmit={(event) => { event.preventDefault(); onSearch() }}>
      <label htmlFor={id}>{label}</label>
      <div className="record-search-controls"><Input id={id} value={value} maxLength={100} onChange={(event) => onChange(event.target.value)} aria-describedby={`${id}-hint`} /><Button type="submit" variant="outline" size="icon" title={label} aria-label={label}><Search aria-hidden="true" /></Button></div>
      <p id={`${id}-hint`} className="sr-only">{hint}</p>
    </form>
    {children}
  </div>
}
