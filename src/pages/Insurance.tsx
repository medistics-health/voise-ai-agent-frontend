import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { Shield, Search, Pencil, Trash2, PlusCircle } from 'lucide-react'
import AppModal from '../components/AppModal'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import TablePagination from '../components/TablePagination'

interface Insurance {
  id: string
  name: string
  address: string
  phone: string
  createdAt: string
}

interface InsuranceFormValues {
  name: string
  address: string
  phone: string
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

const defaultValues: InsuranceFormValues = {
  name: '',
  address: '',
  phone: '',
}

const label = (text: string, required = false) => (
  <label className="label">
    {text}{required && <span className="text-red-500 ml-1">*</span>}
  </label>
)

export default function Insurance() {
  const [insurances, setInsurances] = useState<Insurance[]>([])
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editingInsurance, setEditingInsurance] = useState<Insurance | null>(null)
  const [insuranceToDelete, setInsuranceToDelete] = useState<Insurance | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InsuranceFormValues>({ defaultValues })

  const fetchInsurances = useCallback(async (page: number, searchTerm: string) => {
    setLoading(true)
    try {
      const res = await api.get('/insurances', { params: { page, limit: 10, search: searchTerm } })
      setInsurances(res.data.data.insurances ?? [])
      setPagination(res.data.data.pagination)
    } catch {
      toast.error('Failed to load insurances')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInsurances(1, search)
  }, [search, fetchInsurances])

  useEffect(() => {
    const timer = setTimeout(() => setSearch(inputValue), 350)
    return () => clearTimeout(timer)
  }, [inputValue])

  const openCreateModal = () => {
    setEditingInsurance(null)
    reset(defaultValues)
    setIsModalOpen(true)
  }

  const openEditModal = (insurance: Insurance) => {
    setEditingInsurance(insurance)
    reset({
      name: insurance.name || '',
      address: insurance.address || '',
      phone: insurance.phone || '',
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setEditingInsurance(null)
    reset(defaultValues)
    setIsModalOpen(false)
  }

  const onSubmit = async (values: InsuranceFormValues) => {
    setSaving(true)
    try {
      if (editingInsurance) {
        await api.put(`/insurances/${editingInsurance.id}`, values)
        toast.success('Insurance updated')
      } else {
        await api.post('/insurances', values)
        toast.success('Insurance created')
      }
      closeModal()
      fetchInsurances(1, search)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Unable to save insurance')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!insuranceToDelete) return
    setDeleting(true)
    try {
      await api.delete(`/insurances/${insuranceToDelete.id}`)
      toast.success('Insurance deleted')
      setInsuranceToDelete(null)
      fetchInsurances(1, search)
    } catch {
      toast.error('Unable to delete insurance')
    } finally {
      setDeleting(false)
    }
  }

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return
    fetchInsurances(page, search)
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Insurance Master"
        subtitle="Manage insurance companies with contact information."
        icon={Shield}
        action={
          <button onClick={openCreateModal} className="btn-primary inline-flex items-center gap-2 flex-shrink-0">
          <PlusCircle size={14} /> Add Insurance
          </button>
        }
      />

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="text" placeholder="Search insurances..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="input-field pl-9" />
      </div>

      <div className="table-shell">
        {loading ? (
          <div className="p-16 flex justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : insurances.length === 0 ? (
          <div className="p-16 text-center"><Shield size={40} className="text-brand-300 mx-auto mb-3" /><p className="text-slate-500 text-sm">No insurances found.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-[0.15em] border-b border-brand-100 bg-brand-50/80">
                  <th className="px-4 py-2.5 text-left">Insurance Name</th>
                  <th className="px-4 py-2.5 text-left">Address</th>
                  <th className="px-4 py-2.5 text-left">Phone</th>
                  <th className="px-4 py-2.5 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {insurances.map((insurance) => (
                  <tr key={insurance.id} className="hover:bg-brand-50/40 transition-colors">
                    <td className="px-4 py-2 text-ink-950 font-semibold text-xs">{insurance.name}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs">{insurance.address}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-mono">{insurance.phone}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditModal(insurance)} className="btn-ghost px-3 py-2 text-xs inline-flex items-center gap-2"><Pencil size={13} />Edit</button>
                        <button onClick={() => setInsuranceToDelete(insurance)} className="px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold inline-flex items-center gap-2"><Trash2 size={13} />Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TablePagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={goToPage} />

      {isModalOpen && (
        <AppModal title={editingInsurance ? 'Edit Insurance' : 'Add Insurance'} subtitle="Required fields are marked with an asterisk." onClose={closeModal} maxWidthClassName="max-w-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
              <div>
                {label('Insurance Name', true)}
                <input
                  {...register('name', { required: 'Insurance name is required' })}
                  className="input-field"
                  placeholder="Enter insurance name"
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                {label('Address', true)}
                <input
                  {...register('address', { required: 'Address is required' })}
                  className="input-field"
                  placeholder="Enter address"
                />
                {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address.message}</p>}
              </div>

              <div>
                {label('Phone Number', true)}
                <input
                  {...register('phone', { required: 'Phone number is required' })}
                  className="input-field"
                  placeholder="Enter phone number"
                  type="tel"
                />
                {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
          </form>
        </AppModal>
      )}

      {insuranceToDelete && (
        <ConfirmDialog
          title="Delete Insurance"
          message={`Insurance "${insuranceToDelete.name}" will be soft deleted.`}
          confirmLabel="Delete Insurance"
          onConfirm={handleDelete}
          onClose={() => !deleting && setInsuranceToDelete(null)}
          confirmDisabled={deleting}
        />
      )}
    </div>
  )
}
