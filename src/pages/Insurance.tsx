import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { Shield, Search, Pencil, Trash2, PlusCircle } from 'lucide-react'
import AppModal from '../components/AppModal'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import TablePagination from '../components/TablePagination'
import AddressInput from '../components/AddressInput'
import { formatFullAddress } from '../lib/address'
import { TableSkeleton } from '../components/Skeleton'

interface Insurance {
  id: string
  name: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  zip: string
  workingHoursStart?: string
  workingHoursEnd?: string
  workingDays?: string
  timezone?: string
  createdAt: string
}

interface InsuranceFormValues {
  name: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  zip: string
  workingHoursStart?: string
  workingHoursEnd?: string
  workingDays?: string
  timezone?: string
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

const defaultValues: InsuranceFormValues = {
  name: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  zip: '',
  workingHoursStart: '',
  workingHoursEnd: '',
  workingDays: 'Mon-Fri',
  timezone: 'America/New_York',
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

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<InsuranceFormValues>({ defaultValues })

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
      phone: insurance.phone || '',
      addressLine1: insurance.addressLine1 || '',
      addressLine2: insurance.addressLine2 || '',
      city: insurance.city || '',
      state: insurance.state || '',
      zip: insurance.zip || '',
      workingHoursStart: insurance.workingHoursStart || '',
      workingHoursEnd: insurance.workingHoursEnd || '',
      workingDays: insurance.workingDays || 'Mon-Fri',
      timezone: insurance.timezone || 'America/New_York',
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

    const sanitizedValues = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        typeof value === 'string' ? value.trim() : value
      ])
    ) as InsuranceFormValues;

    if (sanitizedValues.workingHoursStart && sanitizedValues.workingHoursEnd) {
      if (sanitizedValues.workingHoursStart >= sanitizedValues.workingHoursEnd) {
        toast.error('End time must be after start time');
        setSaving(false);
        return;
      }
    }

    try {
      if (editingInsurance) {
        await api.put(`/insurances/${editingInsurance.id}`, sanitizedValues)
        toast.success('Insurance updated')
      } else {
        await api.post('/insurances', sanitizedValues)
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
        title="Insurance"
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
          <div className="p-6">
            <TableSkeleton rows={8} cols={7} />
          </div>
        ) : insurances.length === 0 ? (
          <div className="p-16 text-center">
            <Shield size={40} className="text-brand-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No insurances found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-[0.15em] border-b border-brand-100 bg-brand-50/80">
                  <th className="px-4 py-2.5 text-left">Insurance Name</th>
                  <th className="px-4 py-2.5 text-left">Address</th>
                  <th className="px-4 py-2.5 text-left">City</th>
                  <th className="px-4 py-2.5 text-left">State</th>
                  <th className="px-4 py-2.5 text-left">Phone</th>
                  <th className="px-4 py-2.5 text-left">Hours</th>
                  <th className="px-4 py-2.5 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {insurances.map((insurance) => (
                  <tr key={insurance.id} className="hover:bg-brand-50/40 transition-colors">
                    <td className="px-4 py-2 text-ink-950 font-semibold text-xs">{insurance.name}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs max-w-[320px] whitespace-normal">{formatFullAddress(insurance) || ' - '}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs">{insurance.city}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-semibold">{insurance.state}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-mono">{insurance.phone}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs whitespace-nowrap">
                      {insurance.workingHoursStart && insurance.workingHoursEnd
                        ? `${insurance.workingHoursStart} - ${insurance.workingHoursEnd} ${insurance.timezone?.split('/')[1]?.replace('_', ' ') || ''}`
                        : 'Anytime'}
                    </td>
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
        <AppModal title={editingInsurance ? 'Edit Insurance' : 'Add Insurance'} subtitle="Required fields are marked with an asterisk." onClose={closeModal}>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
              <div className="xl:col-span-2">
                {label('Insurance Name', true)}
                <input
                  {...register('name', { required: 'Insurance name is required', minLength: { value: 3, message: 'Minimum 3 characters' }, maxLength: { value: 255, message: 'Maximum 255 characters' }, validate: (v) => v.trim().length > 0 || 'Name cannot be only spaces' })}
                  className="input-field"
                  placeholder="Enter insurance name"
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                {label('Phone Number', true)}
                <input
                  {...register('phone', { required: 'Phone number is required', pattern: { value: /^[0-9()+\-\s]*$/, message: 'Enter a valid phone number' }, validate: (v) => v.trim().length > 0 || 'Phone cannot be only spaces' })}
                  className="input-field"
                  placeholder="Enter phone number"
                  type="tel"
                />
                {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
              </div>

              <AddressInput fieldNamePrefix="address" register={register} errors={errors} watch={watch} />

              <div className="md:col-span-2 xl:col-span-3 border-t border-brand-100 pt-4 mt-2">
                <h4 className="text-sm font-semibold text-ink-900 mb-4">Calling Hours (Optional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    {label('Start Time')}
                    <input type="time" {...register('workingHoursStart')} className="input-field" />
                  </div>
                  <div>
                    {label('End Time')}
                    <input type="time" {...register('workingHoursEnd')} className="input-field" />
                  </div>
                  <div>
                    {label('Working Days')}
                    <select {...register('workingDays')} className="input-field">
                      <option value="Mon-Fri">Monday - Friday</option>
                      <option value="Mon-Sat">Monday - Saturday</option>
                      <option value="Mon-Sun">Everyday</option>
                    </select>
                  </div>
                  <div>
                    {label('Timezone')}
                    <select {...register('timezone')} className="input-field">
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 xl:col-span-3 flex items-center gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2"><PlusCircle size={14} />{saving ? 'Saving...' : editingInsurance ? 'Update Insurance' : 'Create Insurance'}</button>
                <button type="button" onClick={closeModal} className="btn-ghost">Cancel</button>
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
