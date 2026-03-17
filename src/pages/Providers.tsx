import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { Building2, Search, Pencil, Trash2, PlusCircle } from 'lucide-react'
import AppModal from '../components/AppModal'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import TablePagination from '../components/TablePagination'

interface Provider {
  id: string
  name: string
  npi: string
  addressLine1: string
  city: string
  state: string
  zip: string
  ein: string
  createdAt: string
}

interface ProviderFormValues {
  name: string
  npi: string
  addressLine1: string
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
  addressLine1: '',
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

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProviderFormValues>({ defaultValues })

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
      addressLine1: provider.addressLine1 || '',
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
    try {
      if (editingProvider) {
        await api.put(`/providers/${editingProvider.id}`, values)
        toast.success('Provider updated')
      } else {
        await api.post('/providers', values)
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
        icon={Building2}
        action={
          <button onClick={openCreateModal} className="btn-primary inline-flex items-center gap-2 flex-shrink-0">
          <PlusCircle size={14} /> Add Provider
          </button>
        }
      />

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="text" placeholder="Search providers..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="input-field pl-9" />
      </div>

      <div className="table-shell">
        {loading ? (
          <div className="p-16 flex justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : providers.length === 0 ? (
          <div className="p-16 text-center"><Building2 size={40} className="text-brand-300 mx-auto mb-3" /><p className="text-slate-500 text-sm">No providers found.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-[0.15em] border-b border-brand-100 bg-brand-50/80">
                  <th className="px-4 py-2.5 text-left">Name</th>
                  <th className="px-4 py-2.5 text-left">NPI</th>
                  <th className="px-4 py-2.5 text-left">Address</th>
                  <th className="px-4 py-2.5 text-left">State</th>
                  <th className="px-4 py-2.5 text-left">Zip</th>
                  <th className="px-4 py-2.5 text-left">EIN</th>
                  <th className="px-4 py-2.5 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {providers.map((provider) => (
                  <tr key={provider.id} className="hover:bg-brand-50/40 transition-colors">
                    <td className="px-4 py-2 text-ink-950 font-semibold text-xs">{provider.name}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-mono">{provider.npi}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs">{provider.addressLine1}, {provider.city}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-semibold">{provider.state}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-semibold">{provider.zip}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-mono">{provider.ein}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditModal(provider)} className="btn-ghost px-3 py-2 text-xs inline-flex items-center gap-2"><Pencil size={13} />Edit</button>
                        <button onClick={() => setProviderToDelete(provider)} className="px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold inline-flex items-center gap-2"><Trash2 size={13} />Delete</button>
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
        <AppModal title={editingProvider ? 'Edit Provider' : 'Add Provider'} subtitle="Required fields are marked with an asterisk." onClose={closeModal}>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
              <div className="xl:col-span-2">
                {label('Name', true)}
                <input className="input-field" {...register('name', { required: 'Name is required', minLength: { value: 3, message: 'Minimum 3 characters' }, maxLength: { value: 255, message: 'Maximum 255 characters' } })} />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                {label('NPI', true)}
                <input className="input-field" {...register('npi', { required: 'NPI is required', pattern: { value: /^\d{10}$/, message: 'NPI must be 10 digits' } })} />
                {errors.npi && <p className="text-xs text-red-600 mt-1">{errors.npi.message}</p>}
              </div>
              <div className="xl:col-span-2">
                {label('Address Line 1', true)}
                <input className="input-field" {...register('addressLine1', { required: 'Address is required', maxLength: { value: 255, message: 'Maximum 255 characters' } })} />
                {errors.addressLine1 && <p className="text-xs text-red-600 mt-1">{errors.addressLine1.message}</p>}
              </div>
              <div>
                {label('City', true)}
                <input className="input-field" {...register('city', { required: 'City is required', pattern: { value: /^[A-Za-z\s.'-]+$/, message: 'Enter a valid city' } })} />
                {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city.message}</p>}
              </div>
              <div>
                {label('State', true)}
                <input className="input-field" maxLength={2} {...register('state', { required: 'State is required', pattern: { value: /^[A-Za-z]{2}$/, message: 'Use 2-letter state code' } })} />
                {errors.state && <p className="text-xs text-red-600 mt-1">{errors.state.message}</p>}
              </div>
              <div>
                {label('Zip', true)}
                <input className="input-field" {...register('zip', { required: 'ZIP is required', pattern: { value: /^\d{5}(\d{4})?$|^\d{5}-\d{4}$/, message: 'Enter a valid ZIP' } })} />
                {errors.zip && <p className="text-xs text-red-600 mt-1">{errors.zip.message}</p>}
              </div>
              <div>
                {label('EIN', true)}
                <input className="input-field" {...register('ein', { required: 'EIN is required', pattern: { value: /^\d{9}$/, message: 'EIN must be 9 digits' } })} />
                {errors.ein && <p className="text-xs text-red-600 mt-1">{errors.ein.message}</p>}
              </div>
              <div className="md:col-span-2 xl:col-span-3 flex items-center gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2"><PlusCircle size={14} />{saving ? 'Saving...' : editingProvider ? 'Update Provider' : 'Create Provider'}</button>
                <button type="button" onClick={closeModal} className="btn-ghost">Cancel</button>
              </div>
          </form>
        </AppModal>
      )}

      {providerToDelete && (
        <ConfirmDialog
          title="Delete Provider"
          message={`Provider "${providerToDelete.name}" will be soft deleted.`}
          confirmLabel="Delete Provider"
          onConfirm={handleDelete}
          onClose={() => !deleting && setProviderToDelete(null)}
          confirmDisabled={deleting}
        />
      )}
    </div>
  )
}
