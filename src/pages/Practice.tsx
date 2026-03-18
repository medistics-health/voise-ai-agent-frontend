import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { Briefcase, Search, Pencil, Trash2, PlusCircle } from 'lucide-react'
import AppModal from '../components/AppModal'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import TablePagination from '../components/TablePagination'
import AddressInput from '../components/AddressInput'
import { formatFullAddress } from '../lib/address'

interface Practice {
  id: string
  name: string
  npi: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  zip: string
  createdAt: string
}

interface PracticeFormValues {
  name: string
  npi: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  zip: string
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

const defaultValues: PracticeFormValues = {
  name: '',
  npi: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  zip: '',
}

const label = (text: string, required = false) => (
  <label className="label">
    {text}{required && <span className="text-red-500 ml-1">*</span>}
  </label>
)

export default function PracticeModule() {
  const [practices, setPractices] = useState<Practice[]>([])
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editingPractice, setEditingPractice] = useState<Practice | null>(null)
  const [practiceToDelete, setPracticeToDelete] = useState<Practice | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<PracticeFormValues>({ defaultValues })

  const fetchPractices = useCallback(async (page: number, searchTerm: string) => {
    setLoading(true)
    try {
      const res = await api.get('/practices', { params: { page, limit: 10, search: searchTerm } })
      setPractices(res.data.data.practices ?? [])
      setPagination(res.data.data.pagination)
    } catch {
      toast.error('Failed to load practices')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPractices(1, search)
  }, [search, fetchPractices])

  useEffect(() => {
    const timer = setTimeout(() => setSearch(inputValue), 350)
    return () => clearTimeout(timer)
  }, [inputValue])

  const openCreateModal = () => {
    setEditingPractice(null)
    reset(defaultValues)
    setIsModalOpen(true)
  }

  const openEditModal = (practice: Practice) => {
    setEditingPractice(practice)
    reset({
      name: practice.name || '',
      npi: practice.npi || '',
      addressLine1: practice.addressLine1 || '',
      addressLine2: practice.addressLine2 || '',
      city: practice.city || '',
      state: practice.state || '',
      zip: practice.zip || '',
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setEditingPractice(null)
    reset(defaultValues)
    setIsModalOpen(false)
  }

  const onSubmit = async (values: PracticeFormValues) => {
    setSaving(true)
    try {
      if (editingPractice) {
        await api.put(`/practices/${editingPractice.id}`, values)
        toast.success('Practice updated')
      } else {
        await api.post('/practices', values)
        toast.success('Practice created')
      }
      closeModal()
      fetchPractices(1, search)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Unable to save practice')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!practiceToDelete) return
    setDeleting(true)
    try {
      await api.delete(`/practices/${practiceToDelete.id}`)
      toast.success('Practice deleted')
      setPracticeToDelete(null)
      fetchPractices(1, search)
    } catch {
      toast.error('Unable to delete practice')
    } finally {
      setDeleting(false)
    }
  }

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return
    fetchPractices(page, search)
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Practices Group"
        subtitle="Manage medical practices with NPI and address information."
        icon={Briefcase}
        action={
          <button onClick={openCreateModal} className="btn-primary inline-flex items-center gap-2 flex-shrink-0">
          <PlusCircle size={14} /> Add Practice
          </button>
        }
      />

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="text" placeholder="Search practices..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="input-field pl-9" />
      </div>

      <div className="table-shell">
        {loading ? (
          <div className="p-16 flex justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : practices.length === 0 ? (
          <div className="p-16 text-center"><Briefcase size={40} className="text-brand-300 mx-auto mb-3" /><p className="text-slate-500 text-sm">No practices found.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-[0.15em] border-b border-brand-100 bg-brand-50/80">
                  <th className="px-4 py-2.5 text-left">Practice Name</th>
                  <th className="px-4 py-2.5 text-left">Address</th>
                  <th className="px-4 py-2.5 text-left">City</th>
                  <th className="px-4 py-2.5 text-left">State</th>
                  <th className="px-4 py-2.5 text-left">NPI</th>
                  <th className="px-4 py-2.5 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {practices.map((practice) => (
                  <tr key={practice.id} className="hover:bg-brand-50/40 transition-colors">
                    <td className="px-4 py-2 text-ink-950 font-semibold text-xs">{practice.name}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs max-w-[320px] whitespace-normal">{formatFullAddress(practice) || ' - '}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs">{practice.city}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-semibold">{practice.state}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-mono">{practice.npi}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditModal(practice)} className="btn-ghost px-3 py-2 text-xs inline-flex items-center gap-2"><Pencil size={13} />Edit</button>
                        <button onClick={() => setPracticeToDelete(practice)} className="px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold inline-flex items-center gap-2"><Trash2 size={13} />Delete</button>
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
        <AppModal title={editingPractice ? 'Edit Practice' : 'Add Practice'} subtitle="Required fields are marked with an asterisk." onClose={closeModal}>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
              <div className="xl:col-span-2">
                {label('Practice Name', true)}
                <input
                  {...register('name', { required: 'Practice name is required', minLength: { value: 3, message: 'Minimum 3 characters' }, maxLength: { value: 255, message: 'Maximum 255 characters' } })}
                  className="input-field"
                  placeholder="Enter practice name"
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                {label('NPI', true)}
                <input
                  {...register('npi', { required: 'NPI is required', pattern: { value: /^\d{10}$/, message: 'NPI must be 10 digits' } })}
                  className="input-field"
                  placeholder="Enter NPI"
                />
                {errors.npi && <p className="text-xs text-red-600 mt-1">{errors.npi.message}</p>}
              </div>

              <AddressInput fieldNamePrefix="address" register={register} errors={errors} watch={watch} />

              <div className="md:col-span-2 xl:col-span-3 flex items-center gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2"><PlusCircle size={14} />{saving ? 'Saving...' : editingPractice ? 'Update Practice' : 'Create Practice'}</button>
                <button type="button" onClick={closeModal} className="btn-ghost">Cancel</button>
              </div>
          </form>
        </AppModal>
      )}

      {practiceToDelete && (
        <ConfirmDialog
          title="Delete Practice"
          message={`Practice "${practiceToDelete.name}" will be soft deleted.`}
          confirmLabel="Delete Practice"
          onConfirm={handleDelete}
          onClose={() => !deleting && setPracticeToDelete(null)}
          confirmDisabled={deleting}
        />
      )}
    </div>
  )
}
