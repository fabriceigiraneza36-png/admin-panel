import React from 'react'
import SearchBar, { FilterBar, FilterSelect } from '@components/common/SearchBar'
import { BOOKING_STATUSES } from '@utils/constants'

export default function BookingFilters({ search, onSearch, status, onStatus, onReset }) {
  return (
    <div className="card p-4">
      <FilterBar>
        <SearchBar value={search} onChange={onSearch} placeholder="Search bookings by name, email, number…" className="max-w-sm" />
        <FilterSelect label="Status" value={status} onChange={onStatus}
          options={[{ value: '', label: 'All Statuses' }, ...BOOKING_STATUSES]} />
        {(search || status) && (
          <button onClick={onReset} className="btn-ghost btn-sm text-slate-500">Clear Filters</button>
        )}
      </FilterBar>
    </div>
  )
}