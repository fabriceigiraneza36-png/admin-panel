import React, { useEffect, useState, useCallback } from 'react'
import { Mail, Trash2, RefreshCw, Send, Download, UserPlus } from 'lucide-react'
import { subscribersAPI }    from '@api/subscribers'
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination            from '@components/common/Pagination'
import SearchBar             from '@components/common/SearchBar'
import Modal                 from '@components/common/Modal'
import Badge                 from '@components/common/Badge'
import ConfirmDialog         from '@components/common/ConfirmDialog'
import { useModal }          from '@hooks/useModal'
import { useToast }          from '@hooks/useToast'
import { usePagination }     from '@hooks/usePagination'
import { useDebounce }       from '@hooks/useDebounce'
import { formatDate }        from '@utils/formatters'
import { getErrorMessage }   from '@api/client'

export default function Subscribers() {
  const toast = useToast(), pag = usePagination(), deleteModal = useModal(), newsletterModal = useModal()
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true), [sending, setSending] = useState(false)
  const [search, setSearch] = useState(''), [nlForm, setNlForm] = useState({ subject: '', body: '' })
  const dSearch = useDebounce(search, 400)

  const load = useCallback(async () => {
    setLoading(true)
    try { const { data } = await subscribersAPI.getAll({ page: pag.page, limit: pag.limit, ...(dSearch && { search: dSearch }) })
      setItems(data.data || data.subscribers || []); pag.setTotal(data.pagination?.total || data.total || 0) }
    catch (e) { toast.error(getErrorMessage(e)) } finally { setLoading(false) }
  }, [pag.page, pag.limit, dSearch])
  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    try { await subscribersAPI.remove(deleteModal.data.id); toast.success('Unsubscribed'); deleteModal.close(); load() }
    catch (e) { toast.error(getErrorMessage(e)) }
  }

  const handleSendNewsletter = async () => {
    if (!nlForm.subject.trim() || !nlForm.body.trim()) return toast.error('Subject and body required')
    setSending(true)
    try { await subscribersAPI.sendNewsletter(nlForm); toast.success('Newsletter sent!'); setNlForm({ subject: '', body: '' }); newsletterModal.close() }
    catch (e) { toast.error(getErrorMessage(e)) } finally { setSending(false) }
  }

  const columns = [
    { key: 'email', label: 'Email', sortable: true, render: (v) => <span className="font-medium text-slate-800">{v}</span> },
    { key: 'is_active', label: 'Status', render: (v) => <Badge status={v ? 'active' : 'inactive'} label={v ? 'Active' : 'Unsubscribed'} /> },
    { key: 'subscribed_at', label: 'Subscribed', sortable: true, render: (v) => formatDate(v) },
    { key: 'actions', label: '', align: 'right', width: '60px', render: (_, r) => (
      <TableActions><TableAction icon={Trash2} label="Remove" onClick={() => deleteModal.open(r)} variant="danger" /></TableActions>
    )},
  ]

  return (
    <div className="space-y-5 page-enter">
      <div className="page-header"><div><h1 className="page-title flex items-center gap-2"><Mail size={28} className="text-primary-600" /> Subscribers</h1><p className="page-subtitle">{pag.total} subscribers</p></div>
        <div className="flex gap-2"><button onClick={load} disabled={loading} className="btn-secondary btn-sm"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={() => newsletterModal.open()} className="btn-primary"><Send size={16} /> Send Newsletter</button></div></div>

      <div className="card p-4"><SearchBar value={search} onChange={setSearch} placeholder="Search by email…" className="max-w-sm" /></div>

      <div className="card"><Table columns={columns} data={items} loading={loading} />
        <Pagination {...pag} onNext={pag.next} onPrev={pag.prev} onGoTo={pag.goTo} onPageSizeChange={pag.setPageSize} /></div>

      <Modal isOpen={newsletterModal.isOpen} onClose={newsletterModal.close} title="Send Newsletter" size="md" icon={<Send size={20} />}
        footer={<div className="flex justify-end gap-2"><button onClick={newsletterModal.close} className="btn-secondary" disabled={sending}>Cancel</button>
          <button onClick={handleSendNewsletter} className="btn-primary" disabled={sending}>{sending ? 'Sending…' : <><Send size={14} /> Send to {pag.total} subscribers</>}</button></div>}>
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">This will send an email to all {pag.total} active subscribers.</div>
          <div className="input-group"><label className="input-label">Subject *</label><input className="input" value={nlForm.subject} onChange={(e) => setNlForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Newsletter subject" /></div>
          <div className="input-group"><label className="input-label">Body *</label><textarea className="input min-h-[200px]" value={nlForm.body} onChange={(e) => setNlForm((p) => ({ ...p, body: e.target.value }))} placeholder="Newsletter content…" /></div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} type="delete" title="Remove subscriber?" description={`This will unsubscribe ${deleteModal.data?.email}`} />
    </div>
  )
}