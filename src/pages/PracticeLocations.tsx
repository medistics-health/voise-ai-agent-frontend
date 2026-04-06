import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { MapPin, Search, Pencil, Trash2, PlusCircle } from 'lucide-react'
import AppModal from '../components/AppModal'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import TablePagination from '../components/TablePagination'
import AddressInput from '../components/AddressInput'
import MultiSelect, { MultiSelectOption } from '../components/MultiSelect'
import { formatFullAddress } from '../lib/address'

interface PracticeLocation {
  id: string
  name: string
  npi: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  zip: string
  createdAt: string
  providerIds?: string[]
  groupIds?: string[]
}

interface PracticeLocationFormValues {
  name: string
  npi: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  zip: string
  providerIds: string[]
  groupIds: string[]
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

const defaultValues: PracticeLocationFormValues = {
  name: '',
  npi: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  zip: '',
  providerIds: [],
  groupIds: [],
}

const label = (text: string, required = false) => (
  <label className="label">
    {text}{required && <span className="text-red-500 ml-1">*</span>}
  </label>
)

export default function PracticeLocations() {
  const [locations, setLocations] = useState<PracticeLocation[]>([])
  const [allProviders, setAllProviders] = useState<MultiSelectOption[]>([])
  const [allGroups, setAllGroups] = useState<MultiSelectOption[]>([])
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editingLocation, setEditingLocation] = useState<PracticeLocation | null>(null)
  const [locationToDelete, setLocationToDelete] = useState<PracticeLocation | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm<PracticeLocationFormValues>({ defaultValues })
  const providerIds = watch('providerIds')
  const groupIds = watch('groupIds')

  const fetchLocations = useCallback(async (page: number, searchTerm: string) => {
    setLoading(true)
    try {
      const res = await api.get('/practice-locations', { params: { page, limit: 10, search: searchTerm } })
      setLocations(res.data.data.practiceLocations ?? [])
      setPagination(res.data.data.pagination)
    } catch {
      toast.error('Failed to load practice locations')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchProviders = useCallback(async () => {
    try {
      const res = await api.get('/providers', { params: { limit: 1000 } })
      setAllProviders(
        res.data.data.providers?.map((p: any) => ({
          id: p.id,
          name: p.name,
          label: p.npi,
        })) ?? []
      )
    } catch {
      toast.error('Failed to load providers')
    }
  }, [])

  const fetchGroups = useCallback(async () => {
    try {
      const res = await api.get('/groups', { params: { limit: 1000 } })
      setAllGroups(
        res.data.data.groups?.map((g: any) => ({
          id: g.id,
          name: g.name,
          label: g.category,
        })) ?? []
      )
    } catch {
      toast.error('Failed to load groups')
    }
  }, [])

  useEffect(() => {
    fetchLocations(1, search)
  }, [search, fetchLocations])

  useEffect(() => {
    const timer = setTimeout(() => setSearch(inputValue), 350)
    return () => clearTimeout(timer)
  }, [inputValue])

  useEffect(() => {
    fetchProviders()
    fetchGroups()
  }, [fetchProviders, fetchGroups])

  const openCreateModal = () => {
    setEditingLocation(null)
    reset(defaultValues)
    setIsModalOpen(true)
  }

  const openEditModal = (location: PracticeLocation) => {
    setEditingLocation(location)
    reset({
      name: location.name || '',
      npi: location.npi || '',
      addressLine1: location.addressLine1 || '',
      addressLine2: location.addressLine2 || '',
      city: location.city || '',
      state: location.state || '',
      zip: location.zip || '',
      providerIds: location.providerIds || [],
      groupIds: location.groupIds || [],
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setEditingLocation(null)
    reset(defaultValues)
    setIsModalOpen(false)
  }

  const onSubmit = async (values: PracticeLocationFormValues) => {
    setSaving(true)
    try {
      if (editingLocation) {
        await api.put(`/practice-locations/${editingLocation.id}`, {
          name: values.name,
          npi: values.npi,
          addressLine1: values.addressLine1,
          addressLine2: values.addressLine2,
          city: values.city,
          state: values.state,
          zip: values.zip,
        })
        // Update provider relationships
        await api.put(`/practice-locations/${editingLocation.id}/providers`, {
          providerIds: values.providerIds,
        })
        // Update group relationships
        await api.put(`/practice-locations/${editingLocation.id}/groups`, {
          groupIds: values.groupIds,
        })
        toast.success('Practice location updated')
      } else {
        const createRes = await api.post('/practice-locations', {
          name: values.name,
          npi: values.npi,
          addressLine1: values.addressLine1,
          addressLine2: values.addressLine2,
          city: values.city,
          state: values.state,
          zip: values.zip,
        })
        // Update provider relationships for new location
        if (values.providerIds.length > 0) {
          await api.put(`/practice-locations/${createRes.data.data.id}/providers`, {
            providerIds: values.providerIds,
          })
        }
        // Update group relationships for new location
        if (values.groupIds.length > 0) {
          await api.put(`/practice-locations/${createRes.data.data.id}/groups`, {
            groupIds: values.groupIds,
          })
        }
        toast.success('Practice location created')
      }
      closeModal()
      fetchLocations(1, search)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Unable to save practice location')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!locationToDelete) return
    setDeleting(true)
    try {
      await api.delete(`/practice-locations/${locationToDelete.id}`)
      toast.success('Practice location deleted')
      setLocationToDelete(null)
      fetchLocations(1, search)
    } catch {
      toast.error('Unable to delete practice location')
    } finally {
      setDeleting(false)
    }
  }

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return
    fetchLocations(page, search)
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Practice Locations"
        subtitle="Manage practice locations with providers and groups."
        icon={MapPin}
        action={
          <button onClick={openCreateModal} className="btn-primary inline-flex items-center gap-2 flex-shrink-0">
          <PlusCircle size={14} /> Add Location
          </button>
        }
      />

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="text" placeholder="Search locations..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="input-field pl-9" />
      </div>

      <div className="table-shell">
        {loading ? (
          <div className="p-16 flex justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : locations.length === 0 ? (
          <div className="p-16 text-center"><MapPin size={40} className="text-brand-300 mx-auto mb-3" /><p className="text-slate-500 text-sm">No locations found.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-[0.15em] border-b border-brand-100 bg-brand-50/80">
                  <th className="px-4 py-2.5 text-left">Name</th>
                  <th className="px-4 py-2.5 text-left">NPI</th>
                  <th className="px-4 py-2.5 text-left">Address</th>
                  <th className="px-4 py-2.5 text-left">Providers</th>
                  <th className="px-4 py-2.5 text-left">Groups</th>
                  <th className="px-4 py-2.5 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {locations.map((location) => (
                  <tr key={location.id} className="hover:bg-brand-50/40 transition-colors">
                    <td className="px-4 py-2 text-ink-950 font-semibold text-xs">{location.name}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-mono">{location.npi}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs max-w-[320px] whitespace-normal">
                      {formatFullAddress(location) || ' - '}
                    </td>
                    <td className="px-4 py-2 text-slate-500 text-xs">
                      {location.providerIds && location.providerIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {location.providerIds.slice(0, 1).map((providerId) => {
                            const provider = allProviders.find(p => p.id === providerId)
                            return (
                              <span key={providerId} className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                                {provider?.name || 'Unknown'}
                              </span>
                            )
                          })}
                          {location.providerIds.length > 1 && (
                            <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                              +{location.providerIds.length - 1}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-500 text-xs">
                      {location.groupIds && location.groupIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {location.groupIds.slice(0, 1).map((groupId) => {
                            const group = allGroups.find(g => g.id === groupId)
                            return (
                              <span key={groupId} className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                                {group?.name || 'Unknown'}
                              </span>
                            )
                          })}
                          {location.groupIds.length > 1 && (
                            <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                              +{location.groupIds.length - 1}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(location)}
                          className="btn-ghost px-3 py-2 text-xs inline-flex items-center gap-2"
                        >
                          <Pencil size={13} />
                          Edit
                        </button>
                        <button
                          onClick={() => setLocationToDelete(location)}
                          className="px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold inline-flex items-center gap-2"
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <TablePagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={goToPage} />
      </div>

      {isModalOpen && (
        <AppModal
          title={editingLocation ? 'Edit Location' : 'Add Location'}
          subtitle="Required fields are marked with an asterisk."
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 p-6 pb-64">
            <div>
              {label('Location Name', true)}
              <input
                className="input-field"
                {...register('name', {
                  required: 'Name is required',
                  minLength: { value: 3, message: 'Minimum 3 characters' },
                  maxLength: { value: 255, message: 'Maximum 255 characters' },
                })}
              />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              {label('NPI', true)}
              <input
                className="input-field"
                {...register('npi', {
                  required: 'NPI is required',
                  pattern: { value: /^\d{10}$/, message: 'NPI must be 10 digits' },
                })}
              />
              {errors.npi && <p className="text-xs text-red-600 mt-1">{errors.npi.message}</p>}
            </div>

            <AddressInput fieldNamePrefix="address" register={register} errors={errors} watch={watch} />

            <div>
              {label('Providers')}
              <MultiSelect
                options={allProviders}
                selectedIds={providerIds}
                onChange={(ids) => setValue('providerIds', ids)}
                placeholder="Search and select providers..."
              />
            </div>

            <div>
              {label('Groups')}
              <MultiSelect
                options={allGroups}
                selectedIds={groupIds}
                onChange={(ids) => setValue('groupIds', ids)}
                placeholder="Search and select groups..."
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
                <PlusCircle size={14} />
                {saving ? 'Saving...' : editingLocation ? 'Update Location' : 'Create Location'}
              </button>
              <button type="button" onClick={closeModal} className="btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </AppModal>
      )}

      {locationToDelete && (
        <ConfirmDialog
          title="Delete Practice Location"
          message={`Location "${locationToDelete.name}" will be deleted.`}
          confirmLabel="Delete Location"
          onConfirm={handleDelete}
          onClose={() => !deleting && setLocationToDelete(null)}
          confirmDisabled={deleting}
        />
      )}
    </div>
  )
}
