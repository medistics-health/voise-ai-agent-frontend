import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { Users, Search, Pencil, Trash2, PlusCircle } from 'lucide-react'
import AppModal from '../components/AppModal'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import TablePagination from '../components/TablePagination'
import AddressInput from '../components/AddressInput'
import { formatFullAddress } from '../lib/address'
import { TableSkeleton } from '../components/Skeleton'

interface Provider {
  id: string
  name: string
  npi: string
  phone?: string | null
  fax?: string | null
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  zip: string
  ein: string
  createdAt: string
}

interface ProviderFormValues {
  name: string
  npi: string
  phone: string
  fax: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  zip: string
  ein: string
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

const defaultValues: ProviderFormValues = {
  name: '',
  npi: '',
  phone: '',
  fax: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  zip: '',
  ein: '',
}

const label = (text: string, required = false) => (
  <label className="label">
    {text}{required && <span className="text-red-500 ml-1">*</span>}
  </label>
)

export default function Providers() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [providerToDelete, setProviderToDelete] = useState<Provider | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<ProviderFormValues>({ defaultValues })

  const fetchProviders = useCallback(async (page: number, searchTerm: string) => {
    setLoading(true)
    try {
      const res = await api.get('/providers', { params: { page, limit: 10, search: searchTerm } })
      setProviders(res.data.data.providers ?? [])
      setPagination(res.data.data.pagination)
    } catch {
      toast.error('Failed to load providers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProviders(1, search)
  }, [search, fetchProviders])

  useEffect(() => {
    const timer = setTimeout(() => setSearch(inputValue), 350)
    return () => clearTimeout(timer)
  }, [inputValue])

  const openCreateModal = () => {
    setEditingProvider(null)
    reset(defaultValues)
    setIsModalOpen(true)
  }

  const openEditModal = (provider: Provider) => {
    setEditingProvider(provider)
    reset({
      name: provider.name || '',
      npi: provider.npi || '',
      phone: provider.phone || '',
      fax: provider.fax || '',
      addressLine1: provider.addressLine1 || '',
      addressLine2: provider.addressLine2 || '',
      city: provider.city || '',
      state: provider.state || '',
      zip: provider.zip || '',
      ein: provider.ein || '',
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setEditingProvider(null)
    reset(defaultValues)
    setIsModalOpen(false)
  }

  const onSubmit = async (values: ProviderFormValues) => {
    setSaving(true)
    
    // Sanitize string values
    const sanitizedValues = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        typeof value === 'string' ? value.trim() : value
      ])
    ) as ProviderFormValues;

    try {
      if (editingProvider) {
        await api.put(`/providers/${editingProvider.id}`, sanitizedValues)
        toast.success('Provider updated')
      } else {
        await api.post('/providers', sanitizedValues)
        toast.success('Provider created')
      }
      closeModal()
      fetchProviders(1, search)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Unable to save provider')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!providerToDelete) return
    setDeleting(true)
    try {
      await api.delete(`/providers/${providerToDelete.id}`)
      toast.success('Provider deleted')
      setProviderToDelete(null)
      fetchProviders(1, search)
    } catch {
      toast.error('Unable to delete provider')
    } finally {
      setDeleting(false)
    }
  }

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return
    fetchProviders(page, search)
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Providers"
        subtitle="Manage healthcare providers with NPI, EIN, and location details."
        icon={Users}
        action={
          <button onClick={openCreateModal} className="btn-primary inline-flex items-center gap-2 flex-shrink-0">
            <PlusCircle size={14} /> Add Provider
          </button>
        }
      />

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search providers..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="input-field pl-9"
        />
      </div>

      <div className="table-shell">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={6} />
          </div>
        ) : providers.length === 0 ? (
          <div className="p-16 text-center">
            <Users size={40} className="text-brand-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No providers found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-[0.15em] border-b border-brand-100 bg-brand-50/80">
                  <th className="px-4 py-2.5 text-left">Name</th>
                  <th className="px-4 py-2.5 text-left">NPI</th>
                  <th className="px-4 py-2.5 text-left">Phone</th>
                  <th className="px-4 py-2.5 text-left">Address</th>
                  <th className="px-4 py-2.5 text-left">EIN</th>
                  <th className="px-4 py-2.5 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {providers.map((provider) => (
                  <tr key={provider.id} className="hover:bg-brand-50/40 transition-colors">
                    <td className="px-4 py-2 text-ink-950 font-semibold text-xs">{provider.name}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-mono">{provider.npi}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs">{provider.phone || '-'}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs max-w-[320px] whitespace-normal">
                      {formatFullAddress(provider) || ' - '}
                    </td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-mono">{provider.ein}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(provider)}
                          className="btn-ghost px-3 py-2 text-xs inline-flex items-center gap-2"
                        >
                          <Pencil size={13} />
                          Edit
                        </button>
                        <button
                          onClick={() => setProviderToDelete(provider)}
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
        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={goToPage}
        />
      </div>

      {isModalOpen && (
        <AppModal
          title={editingProvider ? 'Edit Provider' : 'Add Provider'}
          subtitle="Required fields are marked with an asterisk."
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
            <div className="xl:col-span-2">
              {label('Name', true)}
              <input
                className="input-field"
                {...register('name', {
                  required: 'Name is required',
                  minLength: { value: 3, message: 'Minimum 3 characters' },
                  maxLength: { value: 255, message: 'Maximum 255 characters' },
                  validate: (v) => v.trim().length > 0 || 'Name cannot be only spaces',
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
            <div>
              {label('Phone')}
              <input
                className="input-field"
                {...register('phone', {
                  maxLength: { value: 20, message: 'Maximum 20 characters' },
                })}
                placeholder="(555) 123-4567"
              />
              {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              {label('Fax')}
              <input
                className="input-field"
                {...register('fax', {
                  maxLength: { value: 20, message: 'Maximum 20 characters' },
                })}
                placeholder="(555) 123-4568"
              />
              {errors.fax && <p className="text-xs text-red-600 mt-1">{errors.fax.message}</p>}
            </div>
            <div>
              {label('EIN', true)}
              <input
                className="input-field"
                {...register('ein', {
                  required: 'EIN is required',
                  pattern: { value: /^\d{9}$/, message: 'EIN must be 9 digits' },
                })}
              />
              {errors.ein && <p className="text-xs text-red-600 mt-1">{errors.ein.message}</p>}
            </div>
            <AddressInput fieldNamePrefix="address" register={register} errors={errors} watch={watch} />
            <div className="md:col-span-2 xl:col-span-3 flex items-center gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
                <PlusCircle size={14} />
                {saving ? 'Saving...' : editingProvider ? 'Update Provider' : 'Create Provider'}
              </button>
              <button type="button" onClick={closeModal} className="btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </AppModal>
      )}

      {providerToDelete && (
        <ConfirmDialog
          title="Delete Provider"
          message={`Provider "${providerToDelete.name}" will be deleted.`}
          confirmLabel="Delete Provider"
          onConfirm={handleDelete}
          onClose={() => !deleting && setProviderToDelete(null)}
          confirmDisabled={deleting}
        />
      )}
    </div>
  )
}
