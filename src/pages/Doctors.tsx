import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { Stethoscope, Search, Pencil, Trash2, PlusCircle } from 'lucide-react'
import AppModal from '../components/AppModal'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import TablePagination from '../components/TablePagination'
import AddressInput from '../components/AddressInput'
import { formatFullAddress } from '../lib/address'

interface Doctor {
  id: string
  name: string
  npi: string
  phone?: string
  fax?: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  zip: string
  createdAt: string
}

interface DoctorFormValues {
  name: string
  npi: string
  phone?: string
  fax?: string
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

const defaultValues: DoctorFormValues = {
  name: '',
  npi: '',
  phone: '',
  fax: '',
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

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
  const [doctorToDelete, setDoctorToDelete] = useState<Doctor | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<DoctorFormValues>({ defaultValues })

  const fetchDoctors = useCallback(async (page: number, searchTerm: string) => {
    setLoading(true)
    try {
      const res = await api.get('/doctors', { params: { page, limit: 10, search: searchTerm } })
      setDoctors(res.data.data.doctors ?? [])
      setPagination(res.data.data.pagination)
    } catch {
      toast.error('Failed to load doctors')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDoctors(1, search)
  }, [search, fetchDoctors])

  useEffect(() => {
    const timer = setTimeout(() => setSearch(inputValue), 350)
    return () => clearTimeout(timer)
  }, [inputValue])

  const openCreateModal = () => {
    setEditingDoctor(null)
    reset(defaultValues)
    setIsModalOpen(true)
  }

  const openEditModal = (doctor: Doctor) => {
    setEditingDoctor(doctor)
    reset({
      name: doctor.name || '',
      npi: doctor.npi || '',
      phone: doctor.phone || '',
      fax: doctor.fax || '',
      addressLine1: doctor.addressLine1 || '',
      addressLine2: doctor.addressLine2 || '',
      city: doctor.city || '',
      state: doctor.state || '',
      zip: doctor.zip || '',
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setEditingDoctor(null)
    reset(defaultValues)
    setIsModalOpen(false)
  }

  const onSubmit = async (values: DoctorFormValues) => {
    setSaving(true)
    try {
      if (editingDoctor) {
        await api.put(`/doctors/${editingDoctor.id}`, values)
        toast.success('Doctor updated')
      } else {
        await api.post('/doctors', values)
        toast.success('Doctor created')
      }
      closeModal()
      fetchDoctors(1, search)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Unable to save doctor')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!doctorToDelete) return
    setDeleting(true)
    try {
      await api.delete(`/doctors/${doctorToDelete.id}`)
      toast.success('Doctor deleted')
      setDoctorToDelete(null)
      fetchDoctors(1, search)
    } catch {
      toast.error('Unable to delete doctor')
    } finally {
      setDeleting(false)
    }
  }

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return
    fetchDoctors(page, search)
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Doctors"
        subtitle="Manage healthcare providers with NPI, contact information, and location details."
        icon={Stethoscope}
        action={
          <button onClick={openCreateModal} className="btn-primary inline-flex items-center gap-2 flex-shrink-0">
          <PlusCircle size={14} /> Add Doctor
          </button>
        }
      />

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="text" placeholder="Search doctors..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="input-field pl-9" />
      </div>

      <div className="table-shell">
        {loading ? (
          <div className="p-16 flex justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : doctors.length === 0 ? (
          <div className="p-16 text-center"><Stethoscope size={40} className="text-brand-300 mx-auto mb-3" /><p className="text-slate-500 text-sm">No doctors found.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-[0.15em] border-b border-brand-100 bg-brand-50/80">
                  <th className="px-4 py-2.5 text-left">Name</th>
                  <th className="px-4 py-2.5 text-left">NPI</th>
                  <th className="px-4 py-2.5 text-left">Phone</th>
                  <th className="px-4 py-2.5 text-left">Address</th>
                  <th className="px-4 py-2.5 text-left">City</th>
                  <th className="px-4 py-2.5 text-left">State</th>
                  <th className="px-4 py-2.5 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {doctors.map((doctor) => (
                  <tr key={doctor.id} className="hover:bg-brand-50/40 transition-colors">
                    <td className="px-4 py-2 text-ink-950 font-semibold text-xs">{doctor.name}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-mono">{doctor.npi}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs">{doctor.phone || '-'}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs max-w-[320px] whitespace-normal">{formatFullAddress(doctor) || ' - '}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs">{doctor.city}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-semibold">{doctor.state}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditModal(doctor)} className="btn-ghost px-3 py-2 text-xs inline-flex items-center gap-2"><Pencil size={13} />Edit</button>
                        <button onClick={() => setDoctorToDelete(doctor)} className="px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold inline-flex items-center gap-2"><Trash2 size={13} />Delete</button>
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
        <AppModal title={editingDoctor ? 'Edit Doctor' : 'Add Doctor'} subtitle="Required fields are marked with an asterisk." onClose={closeModal}>
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
              <div>
                {label('Phone')}
                <input className="input-field" {...register('phone', { pattern: { value: /^[0-9()+\-\s]*$/, message: 'Enter a valid phone number' } })} />
                {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
              </div>
              <div>
                {label('Fax')}
                <input className="input-field" {...register('fax', { pattern: { value: /^[0-9()+\-\s]*$/, message: 'Enter a valid fax number' } })} />
                {errors.fax && <p className="text-xs text-red-600 mt-1">{errors.fax.message}</p>}
              </div>
              <AddressInput fieldNamePrefix="address" register={register} errors={errors} watch={watch} />
              <div className="md:col-span-2 xl:col-span-3 flex items-center gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2"><PlusCircle size={14} />{saving ? 'Saving...' : editingDoctor ? 'Update Doctor' : 'Create Doctor'}</button>
                <button type="button" onClick={closeModal} className="btn-ghost">Cancel</button>
              </div>
          </form>
        </AppModal>
      )}

      {doctorToDelete && (
        <ConfirmDialog
          title="Delete Doctor"
          message={`Doctor "${doctorToDelete.name}" will be soft deleted.`}
          confirmLabel="Delete Doctor"
          onConfirm={handleDelete}
          onClose={() => !deleting && setDoctorToDelete(null)}
          confirmDisabled={deleting}
        />
      )}
    </div>
  )
}
