import React, { useEffect, useState, useCallback } from 'react'
import { MessageSquare, Eye, Trash2, RefreshCw, Star as StarIcon, Mail, Reply, Archive, AlertTriangle } from 'lucide-react'
import { contactAPI }        from '@api/contact'
import { maintenanceAPI }    from '@api/maintenance'
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination            from '@components/common/Pagination'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge, { PriorityBadge } from '@components/common/Badge'
import Avatar                from '@components/common/Avatar'
import ConfirmDialog         from '@components/common/ConfirmDialog'
import { useModal }          from '@hooks/useModal'
import { useToast }          from '@hooks/useToast'
import { usePagination }     from '@hooks/usePagination'
import { useDebounce }       from '@hooks/useDebounce'
import { formatDate, formatTimeAgo } from '@utils/formatters'
import { CONTACT_STATUSES, PRIORITY_OPTIONS } from '@utils/constants'
import { getErrorMessage }   from '@api/client'

export default function Contact() {
  const toast = useToast(), pag = usePagination(), viewModal = useModal(), deleteModal = useModal(), replyModal = useModal()
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(''), [statusFilt, setStatusFilt] = useState(''), [priorityFilt, setPriorityFilt] = useState('')
  const [sortBy, setSortBy] = useState('created_at'), [sortOrder, setSortOrder] = useState('desc')
  const [replyText, setReplyText] = useState('')
  const [clearing, setClearing] = useState(false)
  const [clearConfirm, setClearConfirm] = useState({ open: false })
  const dSearch = useDebounce(search, 400)

  const load = useCallback(async () => {
    setLoading(true)
    try { const { data } = await contactAPI.getAll({ page: pag.page, limit: pag.limit, sortBy, order: sortOrder, ...(dSearch && { search: dSearch }), ...(statusFilt && { status: statusFilt }), ...(priorityFilt && { priority: priorityFilt }) })
      setItems(data.data || data.messages || []); pag.setTotal(data.pagination?.total || data.total || 0) }
    catch (e) { toast.error(getErrorMessage(e)) } finally { setLoading(false) }
  }, [pag.page, pag.limit, sortBy, sortOrder, dSearch, statusFilt, priorityFilt])
  useEffect(() => { load() }, [load])

  const markAs = async (msg, status) => {
    try { await contactAPI.update(msg.id, { status, is_read: true }); toast.success(`Marked as ${status}`); load() }
    catch (e) { toast.error(getErrorMessage(e)) }
  }

  const handleReply = async () => {
    if (!replyText.trim()) return toast.error('Reply text required')
    try { await contactAPI.reply(replyModal.data.id, { body: replyText, subject: `Re: ${replyModal.data.subject || 'Your inquiry'}` })
      toast.success('Reply sent'); setReplyText(''); replyModal.close(); load() }
    catch (e) { toast.error(getErrorMessage(e)) }
  }

  const handleDelete = async () => {
    try { await contactAPI.remove(deleteModal.data.id); toast.success('Deleted'); deleteModal.close(); load() }
    catch (e) { toast.error(getErrorMessage(e)) }
  }

  const handleClearAll = async () => {
    setClearing(true)
    try {
      const { data } = await maintenanceAPI.purgeCategory('contact', 'DELETE_ALL')
      toast.success(data.message || 'All contact messages cleared')
      setItems([])
      pag.setTotal(0)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setClearing(false)
      setClearConfirm({ open: false })
    }
  }

  const handleSort = (k, o) => { setSortBy(k); setSortOrder(o); pag.reset() }

  const columns = [
    { key: 'full_name', label: 'From', sortable: true, render: (_, r) => (
      <div className="flex items-center gap-3">
        <Avatar name={r.full_name} size="sm" rounded="lg" />
        <div><p className={`text-sm ${r.is_read ? 'text-slate-600' : 'font-bold text-slate-800'}`}>{r.full_name}</p><p className="text-xs text-slate-400">{r.email}</p></div>
        {!r.is_read && <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />}
      </div>
    )},
    { key: 'subject', label: 'Subject', render: (v, r) => <p className={`max-w-[200px] truncate text-sm ${r.is_read ? '' : 'font-semibold'}`}>{v || '(no subject)'}</p> },
    { key: 'status', label: 'Status', render: (v) => <Badge status={v} label={v} /> },
    { key: 'priority', label: 'Priority', render: (v) => <PriorityBadge priority={v} /> },
    { key: 'created_at', label: 'Received', sortable: true, render: (v) => formatTimeAgo(v) },
    { key: 'actions', label: '', align: 'right', width: '140px', render: (_, r) => (
      <TableActions>
        <TableAction icon={Eye} label="View" onClick={() => viewModal.open(r)} />
        <TableAction icon={Reply} label="Reply" onClick={() => { setReplyText(''); replyModal.open(r) }} variant="success" />
        <TableAction icon={Archive} label="Archive" onClick={() => markAs(r, 'archived')} />
        <TableAction icon={Trash2} label="Delete" onClick={() => deleteModal.open(r)} variant="danger" />
      </TableActions>
    )},
  ]

  return (
    <div className="space-y-5 page-enter">
      <div className="page-header"><div><h1 className="page-title flex items-center gap-2"><MessageSquare size={28} className="text-primary-600" /> Contact Messages</h1><p className="page-subtitle">{pag.total} messages</p></div>
        <button onClick={load} disabled={loading} className="btn-secondary btn-sm"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
        <button onClick={() => setClearConfirm({ open: true })} disabled={loading || pag.total === 0} className="btn-danger btn-sm">Clear All</button>
      </div>

      <div className="card p-4"><FilterBar>
        <SearchBar value={search} onChange={setSearch} placeholder="Search messages…" className="max-w-sm" />
        <FilterSelect label="Status" value={statusFilt} onChange={(v) => { setStatusFilt(v); pag.reset() }} options={[{ value: '', label: 'All' }, ...CONTACT_STATUSES]} />
        <FilterSelect label="Priority" value={priorityFilt} onChange={(v) => { setPriorityFilt(v); pag.reset() }} options={[{ value: '', label: 'All' }, ...PRIORITY_OPTIONS]} />
      </FilterBar></div>

      <div className="card"><Table columns={columns} data={items} loading={loading} sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} onRowClick={(r) => viewModal.open(r)} />
        <Pagination {...pag} onNext={pag.next} onPrev={pag.prev} onGoTo={pag.goTo} onPageSizeChange={pag.setPageSize} /></div>

      <Modal isOpen={viewModal.isOpen} onClose={viewModal.close} title="Message Details" size="md" icon={<MessageSquare size={20} />}
        footer={<div className="flex justify-end gap-2"><button onClick={viewModal.close} className="btn-secondary">Close</button><button onClick={() => { viewModal.close(); setReplyText(''); replyModal.open(viewModal.data) }} className="btn-primary"><Reply size={14} /> Reply</button></div>}>
        {viewModal.data && (<div className="space-y-5">
          <div className="flex items-center gap-4 p-4 bg-primary-50 rounded-2xl">
            <Avatar name={viewModal.data.full_name} size="lg" rounded="xl" />
            <div><h3 className="font-bold text-slate-800">{viewModal.data.full_name}</h3><p className="text-sm text-slate-500">{viewModal.data.email}</p>
              <div className="flex gap-2 mt-1"><Badge status={viewModal.data.status} label={viewModal.data.status} size="xs" /><PriorityBadge priority={viewModal.data.priority} /></div></div>
          </div>
          <ModalGrid><ModalField label="Phone" value={viewModal.data.phone} /><ModalField label="WhatsApp" value={viewModal.data.whatsapp} /><ModalField label="Subject" value={viewModal.data.subject} /><ModalField label="Received" value={formatDate(viewModal.data.created_at)} /></ModalGrid>
          {viewModal.data.trip_type && <ModalGrid><ModalField label="Trip Type" value={viewModal.data.trip_type} /><ModalField label="Travel Date" value={formatDate(viewModal.data.travel_date)} /><ModalField label="Travelers" value={viewModal.data.number_of_travelers} /></ModalGrid>}
          <ModalSection title="Message"><p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-surface-50 p-4 rounded-xl border border-surface-200">{viewModal.data.message}</p></ModalSection>
        </div>)}
      </Modal>

      <Modal isOpen={replyModal.isOpen} onClose={replyModal.close} title={`Reply to ${replyModal.data?.full_name}`} size="md" icon={<Reply size={20} />}
        footer={<div className="flex justify-end gap-2"><button onClick={replyModal.close} className="btn-secondary">Cancel</button><button onClick={handleReply} className="btn-primary" disabled={!replyText.trim()}><Mail size={14} /> Send Reply</button></div>}>
        <div className="space-y-4">
          <div className="p-3 bg-surface-50 rounded-xl text-sm text-slate-500 border border-surface-200"><p className="font-semibold text-slate-700 mb-1">{replyModal.data?.subject || 'Original message'}</p><p className="line-clamp-3">{replyModal.data?.message}</p></div>
          <div className="input-group"><label className="input-label">Your Reply</label><textarea className="input min-h-[150px]" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type your reply…" /></div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} type="delete" title="Delete message?" description="This cannot be undone." />

      <ConfirmDialog isOpen={clearConfirm.open} onClose={() => setClearConfirm({ open: false })} onConfirm={handleClearAll} type="delete" title="Clear all contact messages?" description="This will permanently delete every contact submission. This cannot be undone." confirmLabel="Clear All" loading={clearing} />
    </div>
  )
}