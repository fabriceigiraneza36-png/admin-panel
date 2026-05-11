import React, { useEffect, useState, useCallback } from 'react'
import {
  CalendarCheck, Eye, Pencil, Trash2, RefreshCw,
  CheckCircle, XCircle, Download, Filter,
} from 'lucide-react'
import { bookingsAPI }    from '@api/bookings'
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination         from '@components/common/Pagination'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge              from '@components/common/Badge'
import Avatar             from '@components/common/Avatar'
import ConfirmDialog      from '@components/common/ConfirmDialog'
import Dropdown           from '@components/common/Dropdown'
import { useModal }       from '@hooks/useModal'
import { useToast }       from '@hooks/useToast'
import { usePagination }  from '@hooks/usePagination'
import { useDebounce }    from '@hooks/useDebounce'
import { formatDate, formatBookingNumber, formatTimeAgo } from '@utils/formatters'
import { BOOKING_STATUSES } from '@utils/constants'
import { getErrorMessage } from '@api/client'
import { downloadBlob }   from '@utils/helpers'

export default function Bookings() {
  const toast       = useToast()
  const pag         = usePagination()
  const viewModal   = useModal()
  const editModal   = useModal()
  const deleteModal = useModal()

  const [items,     setItems]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [search,    setSearch]    = useState('')
  const [status,    setStatus]    = useState('')
  const [sortBy,    setSortBy]    = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [editForm,  setEditForm]  = useState({ status: '', admin_notes: '' })

  const dSearch = useDebounce(search, 400)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: pag.page, limit: pag.limit, sortBy, order: sortOrder,
        ...(dSearch && { search: dSearch }), ...(status && { status }),
      }
      const { data } = await bookingsAPI.getAll(params)
      setItems(data.data || data.bookings || [])
      pag.setTotal(data.pagination?.total || data.total || 0)
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setLoading(false) }
  }, [pag.page, pag.limit, sortBy, sortOrder, dSearch, status])

  useEffect(() => { load() }, [load])

  const openEdit = (b) => {
    setEditForm({ status: b.status || 'pending', admin_notes: b.admin_notes || '' })
    editModal.open(b)
  }

  const handleUpdate = async () => {
    setSaving(true)
    try {
      await bookingsAPI.update(editModal.data.id, editForm)
      toast.success('Booking updated')
      editModal.close(); load()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  const handleQuickStatus = async (b, newStatus) => {
    try {
      await bookingsAPI.updateStatus(b.id, { status: newStatus })
      toast.success(`Booking ${newStatus}`)
      load()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const handleDelete = async () => {
    try {
      await bookingsAPI.remove(deleteModal.data.id)
      toast.success('Booking deleted')
      deleteModal.close(); load()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const handleExport = async () => {
    try {
      const { data } = await bookingsAPI.exportAll({ status })
      downloadBlob(data, `bookings-${Date.now()}.csv`)
      toast.success('Export downloaded')
    } catch (e) { toast.error('Export failed') }
  }

  const handleSort = (k, o) => { setSortBy(k); setSortOrder(o); pag.reset() }

  const columns = [
    {
      key: 'booking_number', label: 'Booking #', sortable: true,
      render: (v) => <span className="font-mono font-bold text-primary-700">{formatBookingNumber(v)}</span>,
    },
    {
      key: 'full_name', label: 'Guest', sortable: true,
      render: (_, r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.full_name} size="sm" rounded="lg" />
          <div>
            <p className="font-semibold text-slate-800 text-sm">{r.full_name}</p>
            <p className="text-xs text-slate-400">{r.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'travel_date', label: 'Travel Date', sortable: true, render: (v) => formatDate(v) },
    {
      key: 'number_of_travelers', label: 'Travelers', align: 'center',
      render: (v) => <span className="font-bold">{v || 1}</span>,
    },
    {
      key: 'status', label: 'Status',
      render: (v) => <Badge status={v} label={v} />,
    },
    { key: 'created_at', label: 'Created', sortable: true, render: (v) => formatTimeAgo(v) },
    {
      key: 'actions', label: '', align: 'right', width: '140px',
      render: (_, r) => (
        <TableActions>
          <TableAction icon={Eye}         label="View"    onClick={() => viewModal.open(r)} />
          {r.status === 'pending' && (
            <TableAction icon={CheckCircle} label="Confirm" onClick={() => handleQuickStatus(r, 'confirmed')} variant="success" />
          )}
          <TableAction icon={Pencil}      label="Edit"    onClick={() => openEdit(r)} />
          <TableAction icon={Trash2}      label="Delete"  onClick={() => deleteModal.open(r)} variant="danger" />
        </TableActions>
      ),
    },
  ]

  return (
    <div className="space-y-5 page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <CalendarCheck size={28} className="text-primary-600" /> Bookings
          </h1>
          <p className="page-subtitle">Manage booking requests ({pag.total} total)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary btn-sm"><Download size={14} /> Export</button>
          <button onClick={load} disabled={loading} className="btn-secondary btn-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      <div className="card p-4">
        <FilterBar>
          <SearchBar value={search} onChange={setSearch} placeholder="Search bookings…" className="max-w-sm" />
          <FilterSelect label="Status" value={status}
            onChange={(v) => { setStatus(v); pag.reset() }}
            options={[{ value: '', label: 'All Status' }, ...BOOKING_STATUSES]} />
        </FilterBar>
      </div>

      <div className="card">
        <Table columns={columns} data={items} loading={loading} sortBy={sortBy}
          sortOrder={sortOrder} onSort={handleSort} onRowClick={(r) => viewModal.open(r)} />
        <Pagination page={pag.page} totalPages={pag.totalPages} total={pag.total}
          limit={pag.limit} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
          onNext={pag.next} onPrev={pag.prev} onGoTo={pag.goTo} onPageSizeChange={pag.setPageSize} />
      </div>

      {/* View */}
      <Modal isOpen={viewModal.isOpen} onClose={viewModal.close}
        title={`Booking ${formatBookingNumber(viewModal.data?.booking_number)}`}
        size="md" icon={<CalendarCheck size={20} />}
        footer={<div className="flex justify-end gap-2">
          <button onClick={viewModal.close} className="btn-secondary">Close</button>
          <button onClick={() => { viewModal.close(); openEdit(viewModal.data) }} className="btn-primary">
            <Pencil size={14} /> Edit</button>
        </div>}>
        {viewModal.data && (
          <div className="space-y-6">
            <ModalSection title="Guest Information">
              <ModalGrid>
                <ModalField label="Full Name"    value={viewModal.data.full_name} />
                <ModalField label="Email"        value={viewModal.data.email} />
                <ModalField label="Phone"        value={viewModal.data.phone} />
                <ModalField label="WhatsApp"     value={viewModal.data.whatsapp} />
                <ModalField label="Nationality"  value={viewModal.data.nationality} />
                <ModalField label="Status"       value={<Badge status={viewModal.data.status} label={viewModal.data.status} />} />
              </ModalGrid>
            </ModalSection>
            <ModalSection title="Trip Details">
              <ModalGrid>
                <ModalField label="Travel Date"  value={formatDate(viewModal.data.travel_date)} />
                <ModalField label="Return Date"  value={formatDate(viewModal.data.return_date)} />
                <ModalField label="Travelers"    value={viewModal.data.number_of_travelers} />
                <ModalField label="Accommodation" value={viewModal.data.accommodation_type} />
              </ModalGrid>
              <ModalField label="Special Requests" value={viewModal.data.special_requests} />
              <ModalField label="Admin Notes" value={viewModal.data.admin_notes} />
            </ModalSection>
          </div>
        )}
      </Modal>

      {/* Edit status */}
      <Modal isOpen={editModal.isOpen} onClose={editModal.close}
        title="Update Booking" size="sm" icon={<Pencil size={20} />}
        footer={<div className="flex justify-end gap-2">
          <button onClick={editModal.close} className="btn-secondary" disabled={saving}>Cancel</button>
          <button onClick={handleUpdate} className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Update'}</button>
        </div>}>
        <div className="space-y-4">
          <Dropdown label="Status" value={editForm.status}
            onChange={(v) => setEditForm((p) => ({ ...p, status: v }))}
            options={BOOKING_STATUSES} />
          <div className="input-group">
            <label className="input-label">Admin Notes</label>
            <textarea className="input min-h-[100px]" value={editForm.admin_notes}
              onChange={(e) => setEditForm((p) => ({ ...p, admin_notes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close}
        onConfirm={handleDelete} type="delete" title="Delete this booking?"
        description="This action cannot be undone." />
    </div>
  )
}