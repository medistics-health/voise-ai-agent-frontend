import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { Users, Search, User, Pencil, PlusCircle } from 'lucide-react'
import AppModal from '../components/AppModal'
import PageHeader from '../components/PageHeader'
import TablePagination from '../components/TablePagination'

interface Patient {
  id: string
  firstName: string
  lastName: string
  middleName?: string
  dob: string
  gender?: string
  email?: string
  mobileNumber?: string
  address?: string
  zipCode?: string
  payerName: string
  createdAt: string
}

interface PatientFormValues {
  firstName: string
  lastName: string
  middleName: string
  dob: string
  gender: string
  email: string
  mobileNumber: string
  address: string
  zipCode: string
  payerName: string
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

const defaultValues: PatientFormValues = {
  firstName: '',
  lastName: '',
  middleName: '',
  dob: '',
  gender: '',
  email: '',
  mobileNumber: '',
  address: '',
  zipCode: '',
  payerName: '',
}

const label = (text: string, required = false) => (
  <label className="label">
    {text}{required && <span className="text-red-500 ml-1">*</span>}
  </label>
)

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PatientFormValues>({ defaultValues })

  const fetchPatients = useCallback(async (page: number, searchTerm: string) => {
    setLoading(true)
    try {
      const res = await api.get('/patients', { params: { page, limit: 10, search: searchTerm } })
      setPatients(res.data.data.patients ?? [])
      setPagination(res.data.data.pagination)
    } catch {
      toast.error('Failed to load patients')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPatients(1, search)
  }, [search, fetchPatients])

  useEffect(() => {
    const timer = setTimeout(() => setSearch(inputValue), 350)
    return () => clearTimeout(timer)
  }, [inputValue])

  const openCreateModal = () => {
    setEditingPatient(null)
    reset(defaultValues)
    setIsModalOpen(true)
  }

  const openEditModal = (patient: Patient) => {
    setEditingPatient(patient)
    reset({
      firstName: patient.firstName || '',
      lastName: patient.lastName || '',
      middleName: patient.middleName || '',
      dob: patient.dob || '',
      gender: patient.gender || '',
      email: patient.email || '',
      mobileNumber: patient.mobileNumber || '',
      address: patient.address || '',
      zipCode: patient.zipCode || '',
      payerName: patient.payerName || '',
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setEditingPatient(null)
    reset(defaultValues)
    setIsModalOpen(false)
  }

  const onSubmit = async (values: PatientFormValues) => {
    setSaving(true)
    try {
      if (editingPatient) {
        await api.put(`/patients/${editingPatient.id}`, values)
        toast.success('Patient updated')
      } else {
        await api.post('/patients', values)
        toast.success('Patient created')
      }
      closeModal()
      fetchPatients(1, search)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Unable to save patient')
    } finally {
      setSaving(false)
    }
  }

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return
    fetchPatients(page, search)
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Patients"
        subtitle="Manage patient records with demographics and insurance information."
        icon={Users}
        action={
          <button onClick={openCreateModal} className="btn-primary inline-flex items-center gap-2 flex-shrink-0">
          <PlusCircle size={14} /> Add Patient
          </button>
        }
      />

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="text" placeholder="Search patients..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="input-field pl-9" />
      </div>

      <div className="table-shell">
        {loading ? (
          <div className="p-16 flex justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : patients.length === 0 ? (
          <div className="p-16 text-center"><Users size={40} className="text-brand-300 mx-auto mb-3" /><p className="text-slate-500 text-sm">No patients found.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-[0.15em] border-b border-brand-100 bg-brand-50/80">
                  <th className="px-4 py-2.5 text-left">Patient</th>
                  <th className="px-4 py-2.5 text-left">DOB</th>
                  <th className="px-4 py-2.5 text-left">Gender</th>
                  <th className="px-4 py-2.5 text-left">Contact</th>
                  <th className="px-4 py-2.5 text-left">Address</th>
                  <th className="px-4 py-2.5 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-brand-50/40 transition-colors">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-brand-50 flex-shrink-0 flex items-center justify-center border border-brand-100"><User size={12} className="text-brand-600" /></div>
                        <div className="min-w-0">
                          <p className="text-ink-950 font-semibold text-xs truncate">{patient.firstName} {patient.middleName ? `${patient.middleName} ` : ''}{patient.lastName}</p>
                          <p className="text-xs text-slate-500 truncate">{patient.payerName || ' - '}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-semibold">{patient.dob}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-semibold">{patient.gender || ' - '}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs">
                      <div className="flex flex-col gap-0.5">
                        {patient.email && <span>{patient.email}</span>}
                        {patient.mobileNumber && <span>{patient.mobileNumber}</span>}
                        {!patient.email && !patient.mobileNumber && <span> - </span>}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-slate-500 text-xs max-w-[220px] truncate">{patient.address ? `${patient.address}${patient.zipCode ? `, ${patient.zipCode}` : ''}` : ' - '}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditModal(patient)} className="btn-ghost px-3 py-2 text-xs inline-flex items-center gap-2"><Pencil size={13} />Edit</button>
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
        <AppModal title={editingPatient ? 'Edit Patient' : 'Add Patient'} subtitle="Required fields are marked with an asterisk." onClose={closeModal}>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
              <div>
                {label('First Name', true)}
                <input className="input-field" {...register('firstName', { required: 'First name is required', minLength: { value: 2, message: 'Minimum 2 characters' }, pattern: { value: /^[A-Za-z\s'-]+$/, message: 'Only letters allowed' } })} />
                {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                {label('Last Name', true)}
                <input className="input-field" {...register('lastName', { required: 'Last name is required', minLength: { value: 2, message: 'Minimum 2 characters' }, pattern: { value: /^[A-Za-z\s'-]+$/, message: 'Only letters allowed' } })} />
                {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName.message}</p>}
              </div>
              <div>
                {label('Middle Name')}
                <input className="input-field" {...register('middleName', { pattern: { value: /^[A-Za-z\s'-]*$/, message: 'Only letters allowed' } })} />
                {errors.middleName && <p className="text-xs text-red-600 mt-1">{errors.middleName.message}</p>}
              </div>
              <div>
                {label('DOB', true)}
                <input type="date" max={new Date().toISOString().split('T')[0]} className="input-field" {...register('dob', { required: 'DOB is required' })} />
                {errors.dob && <p className="text-xs text-red-600 mt-1">{errors.dob.message}</p>}
              </div>
              <div>
                {label('Gender', true)}
                <select className="input-field" {...register('gender', { required: 'Gender is required' })}>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && <p className="text-xs text-red-600 mt-1">{errors.gender.message}</p>}
              </div>
              <div>
                {label('Email')}
                <input type="email" className="input-field" {...register('email', { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' } })} />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
              </div>
              <div>
                {label('Mobile Number')}
                <input className="input-field" {...register('mobileNumber', { pattern: { value: /^[0-9()+\-\s]{7,20}$/, message: 'Enter a valid mobile number' } })} />
                {errors.mobileNumber && <p className="text-xs text-red-600 mt-1">{errors.mobileNumber.message}</p>}
              </div>
              <div>
                {label('Address')}
                <input className="input-field" {...register('address', { maxLength: { value: 255, message: 'Maximum 255 characters' } })} />
                {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address.message}</p>}
              </div>
              <div>
                {label('Zip Code')}
                <input className="input-field" {...register('zipCode', { pattern: { value: /^[A-Za-z0-9\-\s]{4,12}$/, message: 'Enter a valid ZIP code' } })} />
                {errors.zipCode && <p className="text-xs text-red-600 mt-1">{errors.zipCode.message}</p>}
              </div>
              <div>
                {label('Payer Name', true)}
                <input className="input-field" {...register('payerName', { required: 'Payer name is required', maxLength: { value: 100, message: 'Maximum 100 characters' } })} />
                {errors.payerName && <p className="text-xs text-red-600 mt-1">{errors.payerName.message}</p>}
              </div>
              <div className="md:col-span-2 xl:col-span-3 flex items-center gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2"><PlusCircle size={14} />{saving ? 'Saving...' : editingPatient ? 'Update Patient' : 'Create Patient'}</button>
                <button type="button" onClick={closeModal} className="btn-ghost">Cancel</button>
              </div>
          </form>
        </AppModal>
      )}
    </div>
  )
}
