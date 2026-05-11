import React, { useEffect, useState, useCallback } from 'react'
import {
    Users as UsersIcon, Eye, UserX, UserCheck,
    Trash2, RefreshCw, Download, Shield,
} from 'lucide-react'
import apiClient from '@api/client'
import { getErrorMessage } from '@api/client'
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination from '@components/common/Pagination'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge from '@components/common/Badge'
import Avatar from '@components/common/Avatar'
import ConfirmDialog from '@components/common/ConfirmDialog'
import { useModal } from '@hooks/useModal'
import { useToast } from '@hooks/useToast'
import { usePagination } from '@hooks/usePagination'
import { useDebounce } from '@hooks/useDebounce'
import { formatDate, formatTimeAgo } from '@utils/formatters'
import { downloadBlob } from '@utils/helpers'

export default function UsersPage() {
    const toast = useToast()
    const pag = usePagination()
    const viewModal = useModal()
    const deleteModal = useModal()

    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [sortBy, setSortBy] = useState('created_at')
    const [sortOrder, setSortOrder] = useState('desc')

    const dSearch = useDebounce(search, 400)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const { data } = await apiClient.get('/users', {
                params: {
                    page: pag.page,
                    limit: pag.limit,
                    sortBy,
                    order: sortOrder,
                    ...(dSearch && { search: dSearch }),
                    ...(statusFilter && { status: statusFilter }),
                },
            })
            setItems(data.data || data.users || [])
            pag.setTotal(data.pagination?.total || data.total || 0)
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }, [pag.page, pag.limit, sortBy, sortOrder, dSearch, statusFilter]) // eslint-disable-line

    useEffect(() => { load() }, [load])

    const handleToggleActive = async (user) => {
        try {
            if (user.is_active) {
                await apiClient.post(`/users/${user.id}/deactivate`)
                toast.success(`${user.full_name || 'User'} deactivated`)
            } else {
                await apiClient.post(`/users/${user.id}/activate`)
                toast.success(`${user.full_name || 'User'} activated`)
            }
            load()
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    const handleDelete = async () => {
        try {
            await apiClient.delete(`/users/${deleteModal.data.id}`)
            toast.success('User deleted')
            deleteModal.close()
            load()
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    const handleExport = async () => {
        try {
            const { data } = await apiClient.get('/users/export', { responseType: 'blob' })
            downloadBlob(data, `users-${Date.now()}.csv`)
            toast.success('Users exported')
        } catch {
            /* Try manual CSV if endpoint not available */
            try {
                const { data } = await apiClient.get('/users', { params: { limit: 1000 } })
                const rows = data.data || []
                const csv = [
                    'ID,Email,Full Name,Phone,Nationality,Provider,Verified,Active,Created',
                    ...rows.map((r) =>
                        [r.id, r.email, r.full_name || '', r.phone || '',
                        r.nationality || '', r.auth_provider || '',
                        r.is_verified, r.is_active,
                        r.created_at ? new Date(r.created_at).toISOString() : ''].join(',')
                    ),
                ].join('\n')
                downloadBlob(csv, `users-${Date.now()}.csv`)
                toast.success('Users exported')
            } catch (e2) {
                toast.error('Export failed')
            }
        }
    }

    const columns = [
        {
            key: 'full_name',
            label: 'User',
            sortable: true,
            render: (_, r) => (
                <div className="flex items-center gap-3">
                    <Avatar
                        src={r.avatar_url}
                        name={r.full_name || r.email}
                        size="sm"
                        rounded="full"
                    />
                    <div>
                        <p className="font-semibold text-gray-800 text-sm">
                            {r.full_name || '—'}
                        </p>
                        <p className="text-xs text-gray-400">{r.email}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'auth_provider',
            label: 'Provider',
            render: (v) => (
                <span className="badge-blue capitalize">{v || 'email'}</span>
            ),
        },
        {
            key: 'is_verified',
            label: 'Verified',
            align: 'center',
            render: (v) => v
                ? <Shield size={15} className="text-emerald-500 mx-auto" />
                : <span className="text-gray-300 text-xs mx-auto block text-center">—</span>,
        },
        {
            key: 'is_active',
            label: 'Status',
            render: (v) => (
                <Badge
                    status={v ? 'active' : 'inactive'}
                    label={v ? 'Active' : 'Inactive'}
                />
            ),
        },
        {
            key: 'last_login',
            label: 'Last Login',
            sortable: true,
            render: (v) => v
                ? <span className="text-sm text-gray-600">{formatTimeAgo(v)}</span>
                : <span className="text-gray-300 text-sm">Never</span>,
        },
        {
            key: 'created_at',
            label: 'Joined',
            sortable: true,
            render: (v) => (
                <span className="text-sm text-gray-600">{formatDate(v)}</span>
            ),
        },
        {
            key: 'actions',
            label: '',
            align: 'right',
            width: '120px',
            render: (_, r) => (
                <TableActions>
                    <TableAction
                        icon={Eye}
                        label="View"
                        onClick={() => viewModal.open(r)}
                    />
                    <TableAction
                        icon={r.is_active ? UserX : UserCheck}
                        label={r.is_active ? 'Deactivate' : 'Activate'}
                        onClick={() => handleToggleActive(r)}
                        variant={r.is_active ? 'warning' : 'success'}
                    />
                    <TableAction
                        icon={Trash2}
                        label="Delete"
                        onClick={() => deleteModal.open(r)}
                        variant="danger"
                    />
                </TableActions>
            ),
        },
    ]

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <UsersIcon size={26} className="text-emerald-600" />
                        Users
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage registered users ({pag.total} total)
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold
                       text-emerald-700 bg-emerald-50 border border-emerald-200
                       rounded-xl hover:bg-emerald-100 transition-all"
                    >
                        <Download size={14} /> Export
                    </button>
                    <button
                        onClick={load}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold
                       text-emerald-700 bg-emerald-50 border border-emerald-200
                       rounded-xl hover:bg-emerald-100 transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <FilterBar>
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder="Search by name, email…"
                        className="max-w-sm"
                    />
                    <FilterSelect
                        label="Status"
                        value={statusFilter}
                        onChange={(v) => { setStatusFilter(v); pag.reset() }}
                        options={[
                            { value: '', label: 'All Users' },
                            { value: 'active', label: 'Active' },
                            { value: 'inactive', label: 'Inactive' },
                            { value: 'verified', label: 'Verified' },
                        ]}
                    />
                </FilterBar>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <Table
                    columns={columns}
                    data={items}
                    loading={loading}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={(k, o) => { setSortBy(k); setSortOrder(o); pag.reset() }}
                    onRowClick={(r) => viewModal.open(r)}
                    emptyMessage="No users found"
                />
                <Pagination
                    page={pag.page}
                    totalPages={pag.totalPages}
                    total={pag.total}
                    limit={pag.limit}
                    hasNext={pag.hasNext}
                    hasPrev={pag.hasPrev}
                    onNext={pag.next}
                    onPrev={pag.prev}
                    onGoTo={pag.goTo}
                    onPageSizeChange={pag.setPageSize}
                />
            </div>

            {/* View modal */}
            <Modal
                isOpen={viewModal.isOpen}
                onClose={viewModal.close}
                title={viewModal.data?.full_name || 'User Details'}
                size="md"
                icon={<UsersIcon size={20} />}
                footer={
                    <div className="flex justify-end">
                        <button onClick={viewModal.close} className="btn-secondary">
                            Close
                        </button>
                    </div>
                }
            >
                {viewModal.data && (
                    <div className="space-y-5">
                        {/* Profile card */}
                        <div className="flex items-center gap-4 p-4 rounded-2xl"
                            style={{ background: '#f0fdf4', border: '1px solid #d1fae5' }}>
                            <Avatar
                                src={viewModal.data.avatar_url}
                                name={viewModal.data.full_name || viewModal.data.email}
                                size="xl"
                                rounded="2xl"
                            />
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    {viewModal.data.full_name || '—'}
                                </h3>
                                <p className="text-sm text-gray-500">{viewModal.data.email}</p>
                                <div className="flex gap-2 mt-2">
                                    <Badge
                                        status={viewModal.data.is_active ? 'active' : 'inactive'}
                                        label={viewModal.data.is_active ? 'Active' : 'Inactive'}
                                    />
                                    {viewModal.data.is_verified && (
                                        <span className="inline-flex items-center gap-1 text-xs
                                     font-bold px-2 py-1 rounded-full"
                                            style={{ background: '#dcfce7', color: '#065f46' }}>
                                            <Shield size={10} /> Verified
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Details */}
                        <ModalSection title="Account Details">
                            <ModalGrid>
                                <ModalField label="Phone" value={viewModal.data.phone || '—'} />
                                <ModalField label="Nationality" value={viewModal.data.nationality || '—'} />
                                <ModalField label="Auth Provider" value={viewModal.data.auth_provider || 'email'} />
                                <ModalField label="Last Login" value={formatTimeAgo(viewModal.data.last_login)} />
                                <ModalField label="Joined" value={formatDate(viewModal.data.created_at)} />
                                <ModalField label="Updated" value={formatDate(viewModal.data.updated_at)} />
                            </ModalGrid>
                        </ModalSection>
                    </div>
                )}
            </Modal>

            {/* Delete confirm */}
            <ConfirmDialog
                isOpen={deleteModal.isOpen}
                onClose={deleteModal.close}
                onConfirm={handleDelete}
                type="delete"
                title="Delete this user?"
                description="This permanently removes the user account and all their data."
            />
        </div>
    )
}