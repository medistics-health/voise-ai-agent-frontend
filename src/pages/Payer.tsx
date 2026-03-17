import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { CreditCard, Search, Pencil, Trash2, PlusCircle } from 'lucide-react'
import AppModal from '../components/AppModal'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import TablePagination from '../components/TablePagination'

interface Payer {
  id: string
  name: string
  claimMdId: string
  createdAt: string
}

interface PayerFormValues {
  name: string
  claimMdId: string
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

const defaultValues: PayerFormValues = {
  name: '',
  claimMdId: '',
}

const label = (text: string, required = false) => (
  <label className="label">
    {text}{required && <span className="text-red-500 ml-1">*</span>}
  </label>
)

export default function Payer() {
  const [payers, setPayers] = useState<Payer[]>([])
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editingPayer, setEditingPayer] = useState<Payer | null>(null)
  const [payerToDelete, setPayerToDelete] = useState<Payer | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PayerFormValues>({ defaultValues })

  const fetchPayers = useCallback(async (page: number, searchTerm: string) => {
    setLoading(true)
    try {
      const res = await api.get('/payers', { params: { page, limit: 10, search: searchTerm } })
      setPayers(res.data.data.payers ?? [])
      setPagination(res.data.data.pagination)
    } catch {
      toast.error('Failed to load payers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPayers(1, search)
  }, [search, fetchPayers])

  useEffect(() => {
    const timer = setTimeout(() => setSearch(inputValue), 350)
    return () => clearTimeout(timer)
  }, [inputValue])

  const openCreateModal = () => {
    setEditingPayer(null)
    reset(defaultValues)
    setIsModalOpen(true)
  }

  const openEditModal = (payer: Payer) => {
    setEditingPayer(payer)
    reset({
      name: payer.name || '',
      claimMdId: payer.claimMdId || '',
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setEditingPayer(null)
    reset(defaultValues)
    setIsModalOpen(false)
  }

  const onSubmit = async (values: PayerFormValues) => {
    setSaving(true)
    try {
      if (editingPayer) {
        await api.put(`/payers/${editingPayer.id}`, values)
        toast.success('Payer updated')
      } else {
        await api.post('/payers', values)
        toast.success('Payer created')
      }
      closeModal()
      fetchPayers(1, search)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Unable to save payer')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!payerToDelete) return
    setDeleting(true)
    try {
      await api.delete(`/payers/${payerToDelete.id}`)
      toast.success('Payer deleted')
      setPayerToDelete(null)
      fetchPayers(1, search)
    } catch {
      toast.error('Unable to delete payer')
    } finally {
      setDeleting(false)
    }
  }

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return
    fetchPayers(page, search)
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Payers"
        subtitle="Manage insurance payers with Claim MD IDs."
        icon={CreditCard}
        action={
          <button onClick={openCreateModal} className="btn-primary inline-flex items-center gap-2 flex-shrink-0">
          <PlusCircle size={14} /> Add Payer
          </button>
        }
      />

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="text" placeholder="Search payers..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="input-field pl-9" />
      </div>

      <div className="table-shell">
        {loading ? (
          <div className="p-16 flex justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : payers.length === 0 ? (
          <div className="p-16 text-center"><CreditCard size={40} className="text-brand-300 mx-auto mb-3" /><p className="text-slate-500 text-sm">No payers found.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-[0.15em] border-b border-brand-100 bg-brand-50/80">
                  <th className="px-4 py-2.5 text-left">Payer Name</th>
                  <th className="px-4 py-2.5 text-left">Claim MD ID</th>
                  <th className="px-4 py-2.5 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {payers.map((payer) => (
                  <tr key={payer.id} className="hover:bg-brand-50/40 transition-colors">
                    <td className="px-4 py-2 text-ink-950 font-semibold text-xs">{payer.name}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-mono">{payer.claimMdId}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditModal(payer)} className="btn-ghost px-3 py-2 text-xs inline-flex items-center gap-2"><Pencil size={13} />Edit</button>
                        <button onClick={() => setPayerToDelete(payer)} className="px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold inline-flex items-center gap-2"><Trash2 size={13} />Delete</button>
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
        <AppModal title={editingPayer ? 'Edit Payer' : 'Add Payer'} subtitle="Required fields are marked with an asterisk." onClose={closeModal} maxWidthClassName="max-w-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
              <div>
                {label('Payer Name', true)}
                <input
                  {...register('name', { required: 'Payer name is required' })}
                  className="input-field"
                  placeholder="Enter payer name"
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                {label('Claim MD ID', true)}
                <input
                  {...register('claimMdId', { required: 'Claim MD ID is required' })}
                  className="input-field"
                  placeholder="Enter Claim MD ID"
                />
                {errors.claimMdId && <p className="text-xs text-red-600 mt-1">{errors.claimMdId.message}</p>}
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

      {payerToDelete && (
        <ConfirmDialog
          title="Delete Payer"
          message={`Payer "${payerToDelete.name}" will be soft deleted.`}
          confirmLabel="Delete Payer"
          onConfirm={handleDelete}
          onClose={() => !deleting && setPayerToDelete(null)}
          confirmDisabled={deleting}
        />
      )}
    </div>
  )
}
