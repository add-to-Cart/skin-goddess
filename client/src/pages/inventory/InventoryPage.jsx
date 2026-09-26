import { useEffect, useState } from 'react'
import { Package, Search } from 'lucide-react'
import inventoryService from '@/services/inventoryService'
import { formatCurrency } from '@/lib/utils'
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const CATEGORIES = ['all', 'medicine', 'supply', 'consumable', 'equipment', 'other']

export default function InventoryPage() {
  const [items, setItems]       = useState([])
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('all')
  const [lowOnly, setLowOnly]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  function load(params) {
    setLoading(true)
    inventoryService.getItems(params)
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load({
      search: search || undefined,
      category: category !== 'all' ? category : undefined,
      low_stock_only: lowOnly || undefined,
    })
  }, [category, lowOnly])

  function handleSearch(e) {
    e.preventDefault()
    load({
      search: search || undefined,
      category: category !== 'all' ? category : undefined,
      low_stock_only: lowOnly || undefined,
    })
  }

  const lowCount = items.filter((i) => i.is_low_stock).length

  const empty = (
    <EmptyState
      icon={Package}
      title="No items found"
      description={lowOnly ? 'No items are below minimum stock level.' : 'Add inventory items to track stock.'}
    />
  )

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Stock levels and movement">
        <Button variant="secondary" size="sm">+ Purchase</Button>
        <Button size="sm">+ Add Item</Button>
      </PageHeader>

      {lowCount > 0 && (
        <ErrorState
          className="mb-4"
          message={`${lowCount} item${lowCount !== 1 ? 's are' : ' is'} below minimum stock level.`}
        />
      )}

      {/* Toolbar */}
      <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
            style={{ color: 'var(--color-text-muted)' }} />
          <Input
            className="pl-8"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Checkbox
            id="low-stock"
            checked={lowOnly}
            onCheckedChange={setLowOnly}
          />
          <Label htmlFor="low-stock" className="text-sm cursor-pointer">Low stock only</Label>
        </div>
        <Button type="submit" variant="secondary" size="sm">Search</Button>
      </form>

      {error && <ErrorState message={error} className="mb-4" />}

      {loading ? (
        <LoadingState message="Loading inventory…" />
      ) : (
        <DataTable
          columns={['Name', 'Category', 'Unit', 'In Stock', 'Min', 'Cost', 'Status', '']}
          rows={items.map((item) => [
            <span className="font-semibold">{item.name}</span>,
            <Badge variant="neutral">{item.category ?? 'other'}</Badge>,
            <span style={{ color: 'var(--color-text-muted)' }}>{item.unit ?? '—'}</span>,
            <span
              className="font-semibold"
              style={{ color: item.is_low_stock ? 'var(--color-danger)' : 'var(--color-text)' }}
            >
              {item.current_quantity}
            </span>,
            <span style={{ color: 'var(--color-text-muted)' }}>{item.minimum_stock_level ?? '—'}</span>,
            <span>
              {item.acquisition_cost != null ? formatCurrency(item.acquisition_cost) : '—'}
            </span>,
            <Badge variant={item.is_low_stock ? 'danger' : 'success'}>
              {item.is_low_stock ? 'Low stock' : 'OK'}
            </Badge>,
            /* TODO: Adjust Stock modal */
            <Button variant="ghost" size="sm">Adjust</Button>,
          ])}
          mobileRows={items.map((item) => (
            <MobileCard
              key={item.id}
              actions={<Button variant="ghost" size="sm">Adjust stock</Button>}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  {item.name}
                </span>
                <Badge variant={item.is_low_stock ? 'danger' : 'success'}>
                  {item.is_low_stock ? 'Low stock' : 'OK'}
                </Badge>
              </div>
              <MobileField label="Category" value={item.category ?? 'other'} />
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>In stock</span>
                <span
                  className="font-semibold"
                  style={{ color: item.is_low_stock ? 'var(--color-danger)' : 'var(--color-text)' }}
                >
                  {item.current_quantity} {item.unit}
                </span>
              </div>
              <MobileField label="Min level" value={`${item.minimum_stock_level ?? '—'} ${item.unit ?? ''}`} />
              {item.acquisition_cost != null && (
                <MobileField label="Cost" value={formatCurrency(item.acquisition_cost)} />
              )}
            </MobileCard>
          ))}
          emptyState={empty}
        />
      )}
    </div>
  )
}
