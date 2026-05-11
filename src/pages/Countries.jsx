import React, { useEffect, useState, useCallback } from 'react'
import {
  Plus, Eye, Pencil, Trash2, Globe2,
  Search, Filter, RefreshCw, Star,
  Plane, PartyPopper, X,
} from 'lucide-react'
import { motion }          from 'framer-motion'
import { countriesAPI }    from '@api/countries'
import Table, { TableActions, TableAction } from '@components/common/Table'
import Pagination          from '@components/common/Pagination'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
import Modal, { ModalSection, ModalGrid, ModalField } from '@components/common/Modal'
import Badge, { BooleanBadge }   from '@components/common/Badge'
import Avatar              from '@components/common/Avatar'
import EmptyState          from '@components/common/EmptyState'
import ConfirmDialog       from '@components/common/ConfirmDialog'
import ImageUpload         from '@components/common/ImageUpload'
import TagInput            from '@components/common/TagInput'
import Dropdown            from '@components/common/Dropdown'
import Loader              from '@components/common/Loader'
import { useModal }        from '@hooks/useModal'
import { useToast }        from '@hooks/useToast'
import { usePagination }   from '@hooks/usePagination'
import { useDebounce }     from '@hooks/useDebounce'
import { formatDate, formatNumber, truncate } from '@utils/formatters'
import { CONTINENTS }      from '@utils/constants'
import { getErrorMessage } from '@api/client'

const INITIAL_FORM = {
  name: '', slug: '', official_name: '', capital: '', flag: '', flag_url: '',
  continent: '', region: '', sub_region: '', description: '', tagline: '',
  population: '', area: '', climate: '', best_time_to_visit: '', visa_info: '',
  health_info: '', currency: '', currency_symbol: '', timezone: '',
  calling_code: '', languages: [], official_languages: [], highlights: [],
  experiences: [], travel_tips: [], image_url: '', cover_image_url: '',
  latitude: '', longitude: '', is_featured: false, is_active: true,
}

export default function Countries() {
  const toast    = useToast()
  const pag      = usePagination()
  const viewModal   = useModal()
  const formModal   = useModal()
  const deleteModal = useModal()

  const [countries, setCountries]  = useState([])
  const [loading,   setLoading]    = useState(true)
  const [saving,    setSaving]     = useState(false)
  const [search,    setSearch]     = useState('')
  const [continent, setContinent]  = useState('')
  const [featured,  setFeatured]   = useState('')
  const [sortBy,    setSortBy]     = useState('name')
  const [sortOrder, setSortOrder]  = useState('asc')
  const [form,      setForm]       = useState(INITIAL_FORM)
  const [editing,   setEditing]    = useState(null)

  const debouncedSearch = useDebounce(search, 400)

  /* ── Load data ── */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page:     pag.page,
        limit:    pag.limit,
        sortBy,
        order:    sortOrder,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(continent       && { continent }),
        ...(featured        && { featured: featured === 'true' }),
      }
      const { data } = await countriesAPI.getAll(params)
      setCountries(data.data || data.countries || [])
      pag.setTotal(data.pagination?.total || data.total || 0)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [pag.page, pag.limit, sortBy, sortOrder, debouncedSearch, continent, featured])

  useEffect(() => { load() }, [load])

  /* ── Form helpers ── */
  const openCreate = () => {
    setForm(INITIAL_FORM)
    setEditing(null)
    formModal.open()
  }

  const openEdit = (c) => {
    setForm({
      name:              c.name || '',
      slug:              c.slug || '',
      official_name:     c.official_name || '',
      capital:           c.capital || '',
      flag:              c.flag || '',
      flag_url:          c.flag_url || '',
      continent:         c.continent || '',
      region:            c.region || '',
      sub_region:        c.sub_region || '',
      description:       c.description || '',
      tagline:           c.tagline || '',
      population:        c.population || '',
      area:              c.area || '',
      climate:           c.climate || '',
      best_time_to_visit:c.best_time_to_visit || '',
      visa_info:         c.visa_info || '',
      health_info:       c.health_info || '',
      currency:          c.currency || '',
      currency_symbol:   c.currency_symbol || '',
      timezone:          c.timezone || '',
      calling_code:      c.calling_code || '',
      languages:         c.languages || [],
      official_languages:c.official_languages || [],
      highlights:        c.highlights || [],
      experiences:       c.experiences || [],
      travel_tips:       c.travel_tips || [],
      image_url:         c.image_url || '',
      cover_image_url:   c.cover_image_url || '',
      latitude:          c.latitude || '',
      longitude:         c.longitude || '',
      is_featured:       !!c.is_featured,
      is_active:         c.is_active !== false,
    })
    setEditing(c)
    formModal.open()
  }

  const updateField = (key, val) =>
    setForm((prev) => ({ ...prev, [key]: val }))

  /* ── Save (create / update) ── */
  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Country name is required')
    if (!form.continent)   return toast.error('Continent is required')

    setSaving(true)
    try {
      const payload = {
        ...form,
        population: form.population ? Number(form.population) : null,
        area:       form.area       ? Number(form.area)       : null,
        latitude:   form.latitude   ? Number(form.latitude)   : null,
        longitude:  form.longitude  ? Number(form.longitude)  : null,
        slug:       form.slug || form.name.toLowerCase().replace(/\s+/g, '-'),
      }

      if (editing) {
        await countriesAPI.update(editing.id, payload)
        toast.success('Country updated')
      } else {
        await countriesAPI.create(payload)
        toast.success('Country created')
      }
      formModal.close()
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  /* ── Delete ── */
  const handleDelete = async () => {
    try {
      await countriesAPI.remove(deleteModal.data.id)
      toast.success('Country deleted')
      deleteModal.close()
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  /* ── Sort handler ── */
  const handleSort = (key, order) => {
    setSortBy(key)
    setSortOrder(order)
    pag.reset()
  }

  /* ── Table columns ── */
  const columns = [
    {
      key: 'name', label: 'Country', sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          {row.flag ? (
            <span className="text-2xl">{row.flag}</span>
          ) : (
            <Avatar name={row.name} size="sm" rounded="lg" />
          )}
          <div>
            <p className="font-semibold text-slate-800">{row.name}</p>
            <p className="text-xs text-slate-400">{row.capital || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'continent', label: 'Continent', sortable: true,
      render: (v) => (
        <span className="badge-green">{v || '—'}</span>
      ),
    },
    {
      key: 'population', label: 'Population', sortable: true, align: 'right',
      render: (v) => formatNumber(v),
    },
    {
      key: 'destination_count', label: 'Destinations', sortable: true, align: 'center',
      render: (v) => (
        <span className="font-bold text-primary-700">{v || 0}</span>
      ),
    },
    {
      key: 'is_featured', label: 'Featured', align: 'center',
      render: (v) => v ? (
        <Star size={16} className="text-amber-500 fill-amber-500 mx-auto" />
      ) : (
        <span className="text-slate-300">—</span>
      ),
    },
    {
      key: 'is_active', label: 'Status',
      render: (v) => (
        <Badge
          status={v ? 'active' : 'inactive'}
          label={v ? 'Active' : 'Inactive'}
        />
      ),
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
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Globe2 size={28} className="text-primary-600" />
            Countries
          </h1>
          <p className="page-subtitle">
            Manage all countries ({pag.total} total)
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="btn-secondary btn-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> Add Country
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card p-4">
        <FilterBar>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search countries…"
            className="max-w-sm"
          />
          <FilterSelect
            label="Continent"
            value={continent}
            onChange={(v) => { setContinent(v); pag.reset() }}
            options={[
              { value: '', label: 'All Continents' },
              ...CONTINENTS.map((c) => ({ value: c, label: c })),
            ]}
          />
          <FilterSelect
            label="Featured"
            value={featured}
            onChange={(v) => { setFeatured(v); pag.reset() }}
            options={[
              { value: '',      label: 'All' },
              { value: 'true',  label: 'Featured' },
              { value: 'false', label: 'Not Featured' },
            ]}
          />
        </FilterBar>
      </div>

      {/* ── Table ── */}
      <div className="card">
        <Table
          columns={columns}
          data={countries}
          loading={loading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onRowClick={(row) => viewModal.open(row)}
          emptyMessage="No countries found"
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

      {/* ── View modal ── */}
      <Modal
        isOpen={viewModal.isOpen}
        onClose={viewModal.close}
        title={viewModal.data?.name}
        subtitle={viewModal.data?.official_name}
        size="lg"
        icon={
          viewModal.data?.flag
            ? <span className="text-2xl">{viewModal.data.flag}</span>
            : <Globe2 size={20} />
        }
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={viewModal.close} className="btn-secondary">Close</button>
            <button
              onClick={() => { viewModal.close(); openEdit(viewModal.data) }}
              className="btn-primary"
            >
              <Pencil size={14} /> Edit
            </button>
          </div>
        }
      >
        {viewModal.data && (
          <div className="space-y-6">
            {/* Cover image */}
            {(viewModal.data.image_url || viewModal.data.cover_image_url) && (
              <img
                src={viewModal.data.cover_image_url || viewModal.data.image_url}
                alt={viewModal.data.name}
                className="w-full h-48 object-cover rounded-2xl"
              />
            )}

            <ModalSection title="General Information">
              <ModalGrid>
                <ModalField label="Capital"     value={viewModal.data.capital} />
                <ModalField label="Continent"   value={viewModal.data.continent} />
                <ModalField label="Region"      value={viewModal.data.region} />
                <ModalField label="Population"  value={formatNumber(viewModal.data.population)} />
                <ModalField label="Area"        value={viewModal.data.area ? `${formatNumber(viewModal.data.area)} km²` : '—'} />
                <ModalField label="Currency"    value={`${viewModal.data.currency || ''} ${viewModal.data.currency_symbol || ''}`} />
                <ModalField label="Timezone"    value={viewModal.data.timezone} />
                <ModalField label="Calling Code" value={viewModal.data.calling_code} />
              </ModalGrid>
            </ModalSection>

            <ModalSection title="Travel Info">
              <ModalGrid>
                <ModalField label="Best Time"   value={viewModal.data.best_time_to_visit} />
                <ModalField label="Climate"     value={viewModal.data.climate} />
              </ModalGrid>
              <ModalField label="Languages"
                value={viewModal.data.languages?.join(', ')} />
              <ModalField label="Description" value={viewModal.data.description} />
            </ModalSection>

            {viewModal.data.highlights?.length > 0 && (
              <ModalSection title="Highlights">
                <div className="flex flex-wrap gap-2">
                  {viewModal.data.highlights.map((h, i) => (
                    <span key={i} className="badge-green">{h}</span>
                  ))}
                </div>
              </ModalSection>
            )}

            <ModalSection title="Status">
              <ModalGrid>
                <ModalField label="Featured"
                  value={<BooleanBadge value={viewModal.data.is_featured} />} />
                <ModalField label="Active"
                  value={<BooleanBadge value={viewModal.data.is_active} trueLabel="Active" falseLabel="Inactive" />} />
                <ModalField label="Destinations" value={viewModal.data.destination_count} />
                <ModalField label="Views"        value={formatNumber(viewModal.data.view_count)} />
              </ModalGrid>
            </ModalSection>
          </div>
        )}
      </Modal>

      {/* ── Create / Edit modal ── */}
      <Modal
        isOpen={formModal.isOpen}
        onClose={formModal.close}
        title={editing ? 'Edit Country' : 'Add New Country'}
        subtitle={editing ? `Editing ${editing.name}` : 'Fill in country details'}
        size="xl"
        icon={<Globe2 size={20} />}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={formModal.close} className="btn-secondary" disabled={saving}>
              Cancel
            </button>
            <button onClick={handleSave} className="btn-primary" disabled={saving}>
              {saving ? (
                <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
              ) : editing ? (
                <><Pencil size={14} /> Update Country</>
              ) : (
                <><Plus size={14} /> Create Country</>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Basic */}
          <ModalSection title="Basic Information">
            <ModalGrid>
              <div className="input-group">
                <label className="input-label">Country Name *</label>
                <input className="input" value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g., Rwanda" />
              </div>
              <div className="input-group">
                <label className="input-label">Slug</label>
                <input className="input" value={form.slug}
                  onChange={(e) => updateField('slug', e.target.value)}
                  placeholder="auto-generated from name" />
              </div>
              <div className="input-group">
                <label className="input-label">Official Name</label>
                <input className="input" value={form.official_name}
                  onChange={(e) => updateField('official_name', e.target.value)}
                  placeholder="e.g., Republic of Rwanda" />
              </div>
              <div className="input-group">
                <label className="input-label">Capital</label>
                <input className="input" value={form.capital}
                  onChange={(e) => updateField('capital', e.target.value)}
                  placeholder="e.g., Kigali" />
              </div>
              <div className="input-group">
                <label className="input-label">Flag Emoji</label>
                <input className="input" value={form.flag}
                  onChange={(e) => updateField('flag', e.target.value)}
                  placeholder="🇷🇼" />
              </div>
              <div className="input-group">
                <label className="input-label">Tagline</label>
                <input className="input" value={form.tagline}
                  onChange={(e) => updateField('tagline', e.target.value)}
                  placeholder="Land of a thousand hills" />
              </div>
            </ModalGrid>
          </ModalSection>

          {/* Geography */}
          <ModalSection title="Geography">
            <ModalGrid>
              <Dropdown label="Continent *" value={form.continent}
                onChange={(v) => updateField('continent', v)}
                options={CONTINENTS.map((c) => ({ value: c, label: c }))}
                placeholder="Select continent" />
              <div className="input-group">
                <label className="input-label">Region</label>
                <input className="input" value={form.region}
                  onChange={(e) => updateField('region', e.target.value)}
                  placeholder="e.g., East Africa" />
              </div>
              <div className="input-group">
                <label className="input-label">Population</label>
                <input className="input" type="number" value={form.population}
                  onChange={(e) => updateField('population', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Area (km²)</label>
                <input className="input" type="number" value={form.area}
                  onChange={(e) => updateField('area', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Latitude</label>
                <input className="input" type="number" step="any" value={form.latitude}
                  onChange={(e) => updateField('latitude', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Longitude</label>
                <input className="input" type="number" step="any" value={form.longitude}
                  onChange={(e) => updateField('longitude', e.target.value)} />
              </div>
            </ModalGrid>
          </ModalSection>

          {/* Details */}
          <ModalSection title="Details">
            <ModalGrid>
              <div className="input-group">
                <label className="input-label">Currency</label>
                <input className="input" value={form.currency}
                  onChange={(e) => updateField('currency', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Currency Symbol</label>
                <input className="input" value={form.currency_symbol}
                  onChange={(e) => updateField('currency_symbol', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Timezone</label>
                <input className="input" value={form.timezone}
                  onChange={(e) => updateField('timezone', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Calling Code</label>
                <input className="input" value={form.calling_code}
                  onChange={(e) => updateField('calling_code', e.target.value)} placeholder="+250" />
              </div>
            </ModalGrid>
          </ModalSection>

          {/* Travel */}
          <ModalSection title="Travel Information">
            <ModalGrid>
              <div className="input-group">
                <label className="input-label">Climate</label>
                <textarea className="input min-h-[80px]" value={form.climate}
                  onChange={(e) => updateField('climate', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Best Time to Visit</label>
                <input className="input" value={form.best_time_to_visit}
                  onChange={(e) => updateField('best_time_to_visit', e.target.value)} />
              </div>
            </ModalGrid>
            <div className="input-group">
              <label className="input-label">Description</label>
              <textarea className="input min-h-[100px]" value={form.description}
                onChange={(e) => updateField('description', e.target.value)} />
            </div>
          </ModalSection>

          {/* Arrays */}
          <ModalSection title="Lists">
            <TagInput label="Languages" value={form.languages}
              onChange={(v) => updateField('languages', v)} />
            <TagInput label="Highlights" value={form.highlights}
              onChange={(v) => updateField('highlights', v)} />
            <TagInput label="Experiences" value={form.experiences}
              onChange={(v) => updateField('experiences', v)} />
            <TagInput label="Travel Tips" value={form.travel_tips}
              onChange={(v) => updateField('travel_tips', v)} />
          </ModalSection>

          {/* Images */}
          <ModalSection title="Images">
            <ModalGrid>
              <ImageUpload label="Country Image" value={form.image_url}
                onChange={(v) => updateField('image_url', v)} folder="countries" />
              <ImageUpload label="Cover Image" value={form.cover_image_url}
                onChange={(v) => updateField('cover_image_url', v)} folder="countries" />
            </ModalGrid>
          </ModalSection>

          {/* Toggles */}
          <ModalSection title="Status">
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_featured}
                  onChange={(e) => updateField('is_featured', e.target.checked)}
                  className="w-5 h-5 rounded-lg text-primary-600 border-surface-300
                             focus:ring-primary-500 cursor-pointer" />
                <span className="text-sm font-medium text-slate-700">Featured</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_active}
                  onChange={(e) => updateField('is_active', e.target.checked)}
                  className="w-5 h-5 rounded-lg text-primary-600 border-surface-300
                             focus:ring-primary-500 cursor-pointer" />
                <span className="text-sm font-medium text-slate-700">Active</span>
              </label>
            </div>
          </ModalSection>
        </div>
      </Modal>

      {/* ── Delete confirm ── */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDelete}
        type="delete"
        title={`Delete ${deleteModal.data?.name}?`}
        description="This will permanently remove the country and all associated data."
      />
    </div>
  )
}