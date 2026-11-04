import { useEffect, useId, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

export default function SearchSelect({ value, onChange, search, getLabel, selectedLabel = '', searchHint, minLength = 2, id, disabled = false, ...inputProps }) {
  const generatedId = useId()
  const listId = `${id || generatedId}-results`
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [result, setResult] = useState({ query: null, status: 'idle', data: [] })
  const [retry, setRetry] = useState(0)
  const term = query.trim()
  const canSearch = term.length >= minLength
  const current = result.query === term ? result : { status: 'loading', data: [] }
  const options = canSearch && current.status === 'ready' ? current.data : []
  const activeOptionId = open && options[activeIndex] ? `${listId}-${options[activeIndex].id}` : undefined
  const selectedText = selected && String(selected.id) === String(value) ? getLabel(selected) : selectedLabel || `#${value}`

  useEffect(() => {
    if (!open || !canSearch || value) return
    let active = true
    const timer = setTimeout(() => {
      setResult({ query: term, status: 'loading', data: [] })
      search(term).then((response) => {
        if (!Array.isArray(response.data)) throw new Error('Search results could not be confirmed.')
        if (active) setResult({ query: term, status: 'ready', data: response.data.slice(0, 20), hasMore: response.has_more || response.data.length > 20 })
      }).catch((error) => {
        if (active) setResult({ query: term, status: 'error', data: [], message: error.message })
      })
    }, 250)
    return () => { active = false; clearTimeout(timer) }
  }, [term, canSearch, open, search, value, retry])

  useEffect(() => {
    if (activeOptionId) document.getElementById(activeOptionId)?.scrollIntoView({ block: 'nearest' })
  }, [activeOptionId])

  function choose(item) {
    setSelected(item)
    setQuery('')
    setOpen(false)
    onChange(String(item.id), item)
  }

  return <div className="min-w-0">
    <div className="relative">
      <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
      <Input {...inputProps} id={id || generatedId} disabled={disabled} role="combobox" aria-autocomplete="list" aria-expanded={open && !value} aria-busy={open && !value && canSearch && current.status === 'loading'} aria-controls={listId} aria-activedescendant={open && options[activeIndex] ? `${listId}-${options[activeIndex].id}` : undefined} autoComplete="off" className="pl-9 pr-11" value={value ? selectedText : query} onFocus={(event) => { setOpen(true); if (value) event.target.select() }} onBlur={() => setOpen(false)} onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(-1); if (value) onChange('', null) }} onKeyDown={(event) => {
        if (event.key === 'Escape' && open && !value) { event.preventDefault(); event.stopPropagation(); setOpen(false) }
        else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setOpen(true)
          setActiveIndex((index) => options.length ? event.key === 'ArrowDown' ? (index + 1) % options.length : index < 0 ? options.length - 1 : (index + options.length - 1) % options.length : 0)
        } else if (event.key === 'Enter' && open && !value) {
          event.preventDefault()
          if (options[activeIndex]) choose(options[activeIndex])
        }
      }} />
      {(value || query) && <button type="button" disabled={disabled} className="absolute right-0 top-0 grid h-11 w-11 place-items-center" aria-label={`Clear ${inputProps['aria-label'] || 'selection'}`} onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange('', null); setQuery(''); setSelected(null); setOpen(true); document.getElementById(id || generatedId)?.focus() }}><X size={16} aria-hidden="true" /></button>}
    </div>
    {open && !value && <div className="mt-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm">
      {!canSearch ? <p className="p-2 text-xs text-[var(--color-text-muted)]">{searchHint || `Enter at least ${minLength} characters.`}</p> : <>
        {current.status === 'loading' && <p className="p-2" role="status">Searching…</p>}
        {current.status === 'error' && <div className="p-2"><p role="alert">{current.message}</p><button type="button" className="min-h-11 underline" onMouseDown={(event) => event.preventDefault()} onClick={() => setRetry((count) => count + 1)}>Retry search</button></div>}
        {current.status === 'ready' && options.length === 0 && <p className="p-2" role="status">No matches.</p>}
      </>}
      <div id={listId} role="listbox" aria-label="Search results" className="max-h-60 overflow-y-auto">{options.map((item, index) => <button type="button" role="option" aria-selected={activeIndex === index} tabIndex={-1} id={`${listId}-${item.id}`} key={item.id} className={`flex min-h-11 w-full items-center rounded p-2 text-left wrap-anywhere ${activeIndex === index ? 'bg-[var(--color-brand-soft)]' : ''}`} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item)}>{getLabel(item)}</button>)}</div>
      {current.hasMore && <p className="p-2 text-xs text-[var(--color-text-muted)]">More matches available. Refine your search.</p>}
    </div>}
  </div>
}
