import { useEffect, useState } from 'react'
import { UserCog, Plus, KeyRound, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react'
import usersService from '@/services/usersService'
import authService from '@/services/authService'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import FormDialog, { FormField } from '@/components/shared/FormDialog'
import { DataTable, MobileCard, MobileField } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem,
} from '@/components/ui/select'

// ── helpers ──────────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  return (
    <Badge variant={role === 'admin' ? 'default' : 'neutral'}>
      {role === 'admin' ? 'Admin' : 'Staff'}
    </Badge>
  )
}

function StatusBadge({ isActive }) {
  return (
    <Badge variant={isActive ? 'success' : 'neutral'}>
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  )
}

const EMPTY_CREATE = { username: '', password: '', role: 'staff' }
const EMPTY_EDIT   = { role: 'staff', is_active: true, password: '' }

// ── main component ────────────────────────────────────────────────────────────

export default function UserManagementPage() {
  const [users,       setUsers]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  // create dialog
  const [createOpen,  setCreateOpen]  = useState(false)
  const [createForm,  setCreateForm]  = useState(EMPTY_CREATE)
  const [createErr,   setCreateErr]   = useState(null)
  const [creating,    setCreating]    = useState(false)

  // edit dialog
  const [editTarget,  setEditTarget]  = useState(null)   // user object
  const [editForm,    setEditForm]    = useState(EMPTY_EDIT)
  const [editErr,     setEditErr]     = useState(null)
  const [editing,     setEditing]     = useState(false)

  const currentUsername = authService.getUsername()

  function load() {
    setLoading(true)
    setError(null)
    usersService.getAll()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // ── create ────────────────────────────────────────────────────────────────

  function openCreate() {
    setCreateForm(EMPTY_CREATE)
    setCreateErr(null)
    setCreateOpen(true)
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!createForm.username.trim()) { setCreateErr('Username is required.'); return }
    if (createForm.password.length < 6) { setCreateErr('Password must be at least 6 characters.'); return }
    setCreating(true)
    setCreateErr(null)
    try {
      await usersService.create({
        username: createForm.username.trim(),
        password: createForm.password,
        role:     createForm.role,
      })
      setCreateOpen(false)
      load()
    } catch (err) {
      setCreateErr(err.message)
    } finally {
      setCreating(false)
    }
  }

  // ── edit ──────────────────────────────────────────────────────────────────

  function openEdit(user) {
    setEditTarget(user)
    setEditForm({ role: user.role, is_active: user.is_active, password: '' })
    setEditErr(null)
  }

  async function handleEdit(e) {
    e.preventDefault()
    if (editForm.password && editForm.password.length < 6) {
      setEditErr('New password must be at least 6 characters.')
      return
    }
    setEditing(true)
    setEditErr(null)
    const payload = { role: editForm.role, is_active: editForm.is_active }
    if (editForm.password) payload.password = editForm.password
    try {
      await usersService.update(editTarget.id, payload)
      setEditTarget(null)
      load()
    } catch (err) {
      setEditErr(err.message)
    } finally {
      setEditing(false)
    }
  }

  // ── delete ────────────────────────────────────────────────────────────────

  async function handleDelete(user) {
    if (!window.confirm(`Delete user "${user.username}"? This cannot be undone.`)) return
    try {
      await usersService.remove(user.id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  const emptyEl = (
    <EmptyState
      icon={UserCog}
      title="No users found"
      description="Create a staff account to get started."
    >
      <Button size="sm" onClick={openCreate}>
        <Plus className="h-4 w-4" /> Add User
      </Button>
    </EmptyState>
  )

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Admin can create and manage staff accounts."
      >
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </PageHeader>

      {error && <ErrorState message={error} className="mb-4" />}

      {loading ? (
        <LoadingState message="Loading users…" />
      ) : (
        <DataTable
          columns={['Username', 'Role', 'Status', 'Created', 'Actions']}
          rows={users.map((u) => {
            const isSelf = u.username === currentUsername
            return [
              <span className="font-medium flex items-center gap-1.5">
                {u.username}
                {isSelf && (
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand-strong)' }}>
                    you
                  </span>
                )}
              </span>,
              <RoleBadge role={u.role} />,
              <StatusBadge isActive={u.is_active} />,
              <span style={{ color: 'var(--color-text-muted)' }}>
                {new Date(u.created_at).toLocaleDateString('en-PH')}
              </span>,
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(u)}
                  title="Edit user"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Edit
                </Button>
                {!isSelf && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(u)}
                    title="Delete user"
                    style={{ color: 'var(--color-danger)' }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>,
            ]
          })}
          mobileRows={users.map((u) => {
            const isSelf = u.username === currentUsername
            return (
              <MobileCard
                key={u.id}
                actions={
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                      <KeyRound className="h-3.5 w-3.5" /> Edit
                    </Button>
                    {!isSelf && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(u)}
                        style={{ color: 'var(--color-danger)' }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                    {u.username} {isSelf && <span className="text-xs" style={{ color: 'var(--color-brand-strong)' }}>(you)</span>}
                  </span>
                  <StatusBadge isActive={u.is_active} />
                </div>
                <MobileField label="Role" value={<RoleBadge role={u.role} />} />
                <MobileField label="Created" value={new Date(u.created_at).toLocaleDateString('en-PH')} />
              </MobileCard>
            )
          })}
          emptyState={emptyEl}
        />
      )}

      {/* ── Create user dialog ──────────────────────────────────────────── */}
      <FormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add User"
        description="Create a new staff or admin account."
        onSubmit={handleCreate}
        submitting={creating}
        submitLabel="Create User"
        error={createErr}
      >
        <FormField label="Username" required>
          <Input
            autoFocus
            placeholder="e.g. staff_jane"
            value={createForm.username}
            onChange={(e) => setCreateForm(f => ({ ...f, username: e.target.value }))}
          />
        </FormField>

        <FormField label="Password" required hint="Minimum 6 characters.">
          <Input
            type="password"
            placeholder="••••••••"
            value={createForm.password}
            onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))}
          />
        </FormField>

        <FormField label="Role" required>
          <Select
            value={createForm.role}
            onValueChange={(v) => setCreateForm(f => ({ ...f, role: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </FormDialog>

      {/* ── Edit user dialog ────────────────────────────────────────────── */}
      <FormDialog
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title={`Edit User — ${editTarget?.username}`}
        description="Update role, status, or reset the password."
        onSubmit={handleEdit}
        submitting={editing}
        submitLabel="Save Changes"
        error={editErr}
      >
        <FormField label="Role" required>
          <Select
            value={editForm.role}
            onValueChange={(v) => setEditForm(f => ({ ...f, role: v }))}
            disabled={editTarget?.username === currentUsername}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          {editTarget?.username === currentUsername && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              You cannot change your own role.
            </p>
          )}
        </FormField>

        <FormField label="Status" required>
          <Select
            value={editForm.is_active ? 'active' : 'inactive'}
            onValueChange={(v) => setEditForm(f => ({ ...f, is_active: v === 'active' }))}
            disabled={editTarget?.username === currentUsername}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" /> Active
                </span>
              </SelectItem>
              <SelectItem value="inactive">
                <span className="flex items-center gap-2">
                  <ShieldOff className="h-3.5 w-3.5" /> Inactive
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          label="New Password"
          hint="Leave blank to keep the current password."
        >
          <Input
            type="password"
            placeholder="••••••••"
            value={editForm.password}
            onChange={(e) => setEditForm(f => ({ ...f, password: e.target.value }))}
          />
        </FormField>
      </FormDialog>
    </div>
  )
}
