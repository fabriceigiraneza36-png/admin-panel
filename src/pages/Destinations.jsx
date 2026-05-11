import React, { useEffect, useState, useCallback } from 'react'
import {
  Plus, Eye, Pencil, Trash2, MapPin, RefreshCw,
  Star, Globe2, Image, ListOrdered, HelpCircle,
} from 'lucide-react'
import { destinationsAPI }  from '@api/destinations'
import { countriesAPI }     from '@api/countries'
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination           from '@components/common/Pagination'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge, { BooleanBadge } from '@components/common/Badge'
import Avatar               from '@components/common/Avatar'
import ConfirmDialog        from '@components/common/ConfirmDialog'
import ImageUpload          from '@components/common/ImageUpload'
import TagInput             from '@components/common/TagInput'
import Dropdown             from '@components/common/Dropdown'
import { useModal }         from '@hooks/useModal'
import { useToast }         from '@hooks/useToast'
import { usePagination }    from '@hooks/usePagination'
import { useDebounce }      from '@hooks/useDebounce'
import { formatDate, formatNumber, formatRating } from '@utils/formatters'
import { DESTINATION_CATEGORIES, DIFFICULTY_LEVELS, DESTINATION_STATUSES } from '@utils/constants'
import { getErrorMessage }  from '@api/client'

const INIT_FORM = {
  name: '', slug: '', country_id: '', tagline: '', description: '',
  short_description: '', category: '', difficulty: '', destination_type: '',
  region: '', nearest_city: '', nearest_airport: '', best_time_to_visit: '',
  highlights: [], activities: [], wildlife: [], image_url: '', cover_image_url: '',
  duration_days: '', min_group_size: 1, max_group_size: '', min_age: '',
  fitness_level: '', latitude: '', longitude: '', altitude_meters: '',
  status: 'draft', is_featured: false, is_popular: false,
  is_eco_friendly: false, is_family_friendly: false, is_active: true,
  meta_title: '', meta_description: '',
}

export default function Destinations() {
  const toast       = useToast()
  const pag         = usePagination()
  const viewModal   = useModal()
  const formModal   = useModal()
  const deleteModal = useModal()

  const [items,     setItems]      = useState([])
  const [countries, setCountries]  = useState([])
  const [loading,   setLoading]    = useState(true)
  const [saving,    setSaving]     = useState(false)
  const [search,    setSearch]     = useState('')
  const [category,  setCategory]   = useState('')
  const [status,    setStatus]     = useState('')
  const [sortBy,    setSortBy]     = useState('name')
  const [sortOrder, setSortOrder]  = useState('asc')
  const [form,      setForm]       = useState(INIT_FORM)
  const [editing,   setEditing]    = useState(null)

  const dSearch = useDebounce(search, 400)

  /* ── Load ── */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: pag.page, limit: pag.limit, sortBy, order: sortOrder,
        ...(dSearch  && { search: dSearch }),
        ...(category && { category }),
        ...(status   && { status }),
      }
      const { data } = await destinationsAPI.getAll(params)
      setItems(data.data || data.destinations || [])
      pag.setTotal(data.pagination?.total || data.total || 0)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [pag.page, pag.limit, sortBy, sortOrder, dSearch, category, status])

  useEffect(() => { load() }, [load])

  /* Load countries for dropdown */
  useEffect(() => {
    countriesAPI.getAll({ limit: 300 }).then(({ data }) => {
      setCountries(data.data || data.countries || [])
    }).catch(() => {})
  }, [])

  const countryOpts = [
    { value: '', label: 'Select country…' },
    ...countries.map((c) => ({ value: String(c.id), label: `${c.flag || ''} ${c.name}` })),
  ]

  /* ── Form helpers ── */
  const openCreate = () => { setForm(INIT_FORM); setEditing(null); formModal.open() }

  const openEdit = (d) => {
    const f = { ...INIT_FORM }
    Object.keys(f).forEach((k) => { if (d[k] !== undefined && d[k] !== null) f[k] = d[k] })
    f.country_id = String(d.country_id || '')
    setForm(f)
    setEditing(d)
    formModal.open()
  }

  const upd = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  /* ── Save ── */
  const handleSave = async () => {
    if (!form.name.trim())  return toast.error('Name is required')
    if (!form.country_id)   return toast.error('Country is required')
    setSaving(true)
    try {
      const payload = {
        ...form,
        country_id:     Number(form.country_id),
        duration_days:  form.duration_days  ? Number(form.duration_days)  : null,
        max_group_size: form.max_group_size ? Number(form.max_group_size) : null,
        min_age:        form.min_age        ? Number(form.min_age)        : null,
        altitude_meters:form.altitude_meters? Number(form.altitude_meters): null,
        latitude:       form.latitude       ? Number(form.latitude)       : null,
        longitude:      form.longitude      ? Number(form.longitude)      : null,
        slug:           form.slug || form.name.toLowerCase().replace(/\s+/g, '-'),
      }
      if (editing) {
        await destinationsAPI.update(editing.id, payload)
        toast.success('Destination updated')
      } else {
        await destinationsAPI.create(payload)
        toast.success('Destination created')
      }
      formModal.close()
      load()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  /* ── Delete ── */
  const handleDelete = async () => {
    try {
      await destinationsAPI.remove(deleteModal.data.id)
      toast.success('Destination deleted')
      deleteModal.close(); load()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const handleSort = (k, o) => { setSortBy(k); setSortOrder(o); pag.reset() }

  /* ── Table ── */
  const columns = [
    {
      key: 'name', label: 'Destination', sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <Avatar src={row.image_url || row.thumbnail_url} name={row.name} size="sm" rounded="lg" />
          <div>
            <p className="font-semibold text-slate-800 max-w-[180px] truncate">{row.name}</p>
            <p className="text-xs text-slate-400">{row.region || row.category || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'country_name', label: 'Country', sortable: false,
      render: (_, row) => {
        const c = countries.find((x) => x.id === row.country_id)
        return <span className="text-sm text-slate-600">{c?.flag} {c?.name || `#${row.country_id}`}</span>
      },
    },
    {
      key: 'category', label: 'Category',
      render: (v) => v ? <span className="badge-blue capitalize">{v}</span> : '—',
    },
    {
      key: 'rating', label: 'Rating', sortable: true, align: 'center',
      render: (v) => (
        <span className="flex items-center gap-1 justify-center">
          <Star size={12} className="text-amber-500 fill-amber-500" />
          <span className="font-bold text-sm">{formatRating(v)}</span>
        </span>
      ),
    },
    {
      key: 'status', label: 'Status',
      render: (v) => <Badge status={v} label={v} />,
    },
    {
      key: 'is_featured', label: 'Featured', align: 'center',
      render: (v) => v ? <Star size={16} className="text-amber-500 fill-amber-500 mx-auto" /> : <span className="text-slate-300">—</span>,
    },
    {
      key: 'actions', label: '', align: 'right', width: '100px',
      render: (_, row) => (
        <TableActions>
          <TableAction icon={Eye}    label="View"   onClick={() => viewModal.open(row)} />
          <TableAction icon={Pencil} label="Edit"   onClick={() => openEdit(row)} />
          <TableAction icon={Trash2} label="Delete" onClick={() => deleteModal.open(row)} variant="danger" />
        </TableActions>
      ),
    },
  ]

  return (
    <div className="space-y-5 page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <MapPin size={28} className="text-primary-600" /> Destinations
          </h1>
          <p className="page-subtitle">Manage destinations ({pag.total} total)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="btn-secondary btn-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Destination</button>
        </div>
      </div>

      <div className="card p-4">
        <FilterBar>
          <SearchBar value={search} onChange={setSearch} placeholder="Search destinations…" className="max-w-sm" />
          <FilterSelect label="Category" value={category}
            onChange={(v) => { setCategory(v); pag.reset() }}
            options={[{ value: '', label: 'All Categories' }, ...DESTINATION_CATEGORIES.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))]} />
          <FilterSelect label="Status" value={status}
            onChange={(v) => { setStatus(v); pag.reset() }}
            options={[{ value: '', label: 'All Status' }, ...DESTINATION_STATUSES]} />
        </FilterBar>
      </div>

      <div className="card">
        <Table columns={columns} data={items} loading={loading} sortBy={sortBy}
          sortOrder={sortOrder} onSort={handleSort} onRowClick={(r) => viewModal.open(r)} />
        <Pagination page={pag.page} totalPages={pag.totalPages} total={pag.total}
          limit={pag.limit} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
          onNext={pag.next} onPrev={pag.prev} onGoTo={pag.goTo} onPageSizeChange={pag.setPageSize} />
      </div>

      {/* ── View modal ── */}
      <Modal isOpen={viewModal.isOpen} onClose={viewModal.close}
        title={viewModal.data?.name} size="lg" icon={<MapPin size={20} />}
        footer={<div className="flex justify-end gap-2">
          <button onClick={viewModal.close} className="btn-secondary">Close</button>
          <button onClick={() => { viewModal.close(); openEdit(viewModal.data) }} className="btn-primary"><Pencil size={14} /> Edit</button>
        </div>}>
        {viewModal.data && (
          <div className="space-y-6">
            {(viewModal.data.image_url || viewModal.data.cover_image_url) && (
              <img src={viewModal.data.cover_image_url || viewModal.data.image_url}
                alt={viewModal.data.name} className="w-full h-48 object-cover rounded-2xl" />
            )}
            <ModalSection title="Overview">
              <ModalGrid>
                <ModalField label="Country" value={countries.find((c) => c.id === viewModal.data.country_id)?.name} />
                <ModalField label="Category" value={viewModal.data.category} />
                <ModalField label="Difficulty" value={viewModal.data.difficulty} />
                <ModalField label="Duration" value={viewModal.data.duration_days ? `${viewModal.data.duration_days} days` : '—'} />
                <ModalField label="Rating" value={<span className="flex items-center gap-1"><Star size={14} className="text-amber-500 fill-amber-500" /> {formatRating(viewModal.data.rating)} ({viewModal.data.review_count} reviews)</span>} />
                <ModalField label="Status" value={<Badge status={viewModal.data.status} label={viewModal.data.status} />} />
              </ModalGrid>
              <ModalField label="Description" value={viewModal.data.description} />
            </ModalSection>
            {viewModal.data.highlights?.length > 0 && (
              <ModalSection title="Highlights">
                <div className="flex flex-wrap gap-2">
                  {viewModal.data.highlights.map((h, i) => <span key={i} className="badge-green">{h}</span>)}
                </div>
              </ModalSection>
            )}
            <ModalSection title="Stats">
              <ModalGrid cols={4}>
                <ModalField label="Views" value={formatNumber(viewModal.data.view_count)} />
                <ModalField label="Bookings" value={formatNumber(viewModal.data.booking_count)} />
                <ModalField label="Wishlists" value={formatNumber(viewModal.data.wishlist_count)} />
                <ModalField label="Created" value={formatDate(viewModal.data.created_at)} />
              </ModalGrid>
            </ModalSection>
          </div>
        )}
      </Modal>

      {/* ── Create / Edit modal ── */}
      <Modal isOpen={formModal.isOpen} onClose={formModal.close}
        title={editing ? 'Edit Destination' : 'Add Destination'} size="xl" icon={<MapPin size={20} />}
        footer={<div className="flex justify-end gap-2">
          <button onClick={formModal.close} className="btn-secondary" disabled={saving}>Cancel</button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            {saving ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</> :
              editing ? <><Pencil size={14} /> Update</> : <><Plus size={14} /> Create</>}
          </button>
        </div>}>
        <div className="space-y-6">
          <ModalSection title="Basic">
            <ModalGrid>
              <div className="input-group"><label className="input-label">Name *</label>
                <input className="input" value={form.name} onChange={(e) => upd('name', e.target.value)} placeholder="e.g., Volcanoes National Park" /></div>
              <div className="input-group"><label className="input-label">Slug</label>
                <input className="input" value={form.slug} onChange={(e) => upd('slug', e.target.value)} /></div>
              <Dropdown label="Country *" value={form.country_id} onChange={(v) => upd('country_id', v)} options={countryOpts} searchable />
              <Dropdown label="Category" value={form.category} onChange={(v) => upd('category', v)}
                options={[{ value: '', label: 'Select…' }, ...DESTINATION_CATEGORIES.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))]} />
              <Dropdown label="Difficulty" value={form.difficulty} onChange={(v) => upd('difficulty', v)}
                options={[{ value: '', label: 'Select…' }, ...DIFFICULTY_LEVELS]} />
              <Dropdown label="Status" value={form.status} onChange={(v) => upd('status', v)} options={DESTINATION_STATUSES} />
            </ModalGrid>
            <div className="input-group"><label className="input-label">Tagline</label>
              <input className="input" value={form.tagline} onChange={(e) => upd('tagline', e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Description</label>
              <textarea className="input min-h-[100px]" value={form.description} onChange={(e) => upd('description', e.target.value)} /></div>
          </ModalSection>

          <ModalSection title="Location & Details">
            <ModalGrid>
              <div className="input-group"><label className="input-label">Region</label>
                <input className="input" value={form.region} onChange={(e) => upd('region', e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Nearest City</label>
                <input className="input" value={form.nearest_city} onChange={(e) => upd('nearest_city', e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Duration (days)</label>
                <input className="input" type="number" value={form.duration_days} onChange={(e) => upd('duration_days', e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Best Time to Visit</label>
                <input className="input" value={form.best_time_to_visit} onChange={(e) => upd('best_time_to_visit', e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Latitude</label>
                <input className="input" type="number" step="any" value={form.latitude} onChange={(e) => upd('latitude', e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Longitude</label>
                <input className="input" type="number" step="any" value={form.longitude} onChange={(e) => upd('longitude', e.target.value)} /></div>
            </ModalGrid>
          </ModalSection>

          <ModalSection title="Lists">
            <TagInput label="Highlights" value={form.highlights} onChange={(v) => upd('highlights', v)} />
            <TagInput label="Activities" value={form.activities} onChange={(v) => upd('activities', v)} />
            <TagInput label="Wildlife" value={form.wildlife} onChange={(v) => upd('wildlife', v)} />
          </ModalSection>

          <ModalSection title="Images">
            <ModalGrid>
              <ImageUpload label="Main Image" value={form.image_url} onChange={(v) => upd('image_url', v)} folder="destinations" />
              <ImageUpload label="Cover Image" value={form.cover_image_url} onChange={(v) => upd('cover_image_url', v)} folder="destinations" />
            </ModalGrid>
          </ModalSection>

          <ModalSection title="Flags">
            <div className="flex flex-wrap gap-6">
              {[
                { k: 'is_featured',        l: 'Featured'        },
                { k: 'is_popular',         l: 'Popular'         },
                { k: 'is_eco_friendly',    l: 'Eco-Friendly'    },
                { k: 'is_family_friendly', l: 'Family Friendly' },
                { k: 'is_active',          l: 'Active'          },
              ].map(({ k, l }) => (
                <label key={k} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!form[k]} onChange={(e) => upd(k, e.target.checked)}
                    className="w-5 h-5 rounded-lg text-primary-600 border-surface-300 focus:ring-primary-500 cursor-pointer" />
                  <span className="text-sm font-medium text-slate-700">{l}</span>
                </label>
              ))}
            </div>
          </ModalSection>
        </div>
      </Modal>

      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} type="delete"
        title={`Delete ${deleteModal.data?.name}?`} description="This will permanently remove the destination." />
    </div>
  )
}