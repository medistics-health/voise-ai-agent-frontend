import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  AlertCircle,
  CalendarClock,
  ListOrdered,
  Pause,
  Play,
  PlusCircle,
  RefreshCw,
  Trash2,
  UserRound,
} from 'lucide-react'
import api from '../lib/api'
import PageHeader from '../components/PageHeader'
import TablePagination from '../components/TablePagination'
import AppModal from '../components/AppModal'

type QueueStatus = 'active' | 'paused' | 'completed' | 'cancelled'
type QueueItemStatus =
  | 'pending'
  | 'calling'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'no_answer'
  | 'outside_hours'
type QueueFilterType = 'all_unverified' | 'by_location' | 'specific_patients'

interface QueueSummary {
  id: string
  name: string
  description?: string | null
  status: QueueStatus
  totalCount: number
  processedCount: number
  scheduledAt?: string | null
  createdAt: string
  practiceLocation?: {
    id: string
    name: string
  } | null
  createdBy?: {
    id: string
    email: string
  } | null
}

interface QueueItem {
  id: string
  status: QueueItemStatus
  attemptCount: number
  lastAttemptAt?: string | null
  notes?: string | null
  callSessionId?: string | null
  patient: {
    id: string
    firstName: string
    lastName: string
    dob: string
    provider?: { name: string } | null
    practiceGroup?: { name: string } | null
    practiceLocation?: { name: string } | null
    insurance?: { name: string; phone?: string | null } | null
  }
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface PracticeLocationOption {
  id: string
  name: string
}

interface PatientOption {
  id: string
  firstName: string
  lastName: string
  dob: string
  memberPlanStatus?: string | null
}

const queueStatusClasses: Record<QueueStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  paused: 'bg-amber-100 text-amber-700 border border-amber-200',
  completed: 'bg-blue-100 text-blue-700 border border-blue-200',
  cancelled: 'bg-rose-100 text-rose-700 border border-rose-200',
}

const queueItemStatusClasses: Record<QueueItemStatus, string> = {
  pending: 'bg-brand-50 text-brand-700 border border-brand-200',
  calling: 'bg-blue-100 text-blue-700 border border-blue-200',
  completed: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-700 border border-rose-200',
  failed: 'bg-red-100 text-red-700 border border-red-200',
  no_answer: 'bg-amber-100 text-amber-700 border border-amber-200',
  outside_hours: 'bg-slate-100 text-slate-700 border border-slate-200',
}

const defaultPagination: Pagination = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
}

const defaultCreateForm = {
  name: '',
  description: '',
  filterType: 'all_unverified' as QueueFilterType,
  practiceLocationId: '',
  scheduledAt: '',
  patientIds: [] as string[],
}

const formatQueueStatus = (status: QueueStatus) =>
  status.charAt(0).toUpperCase() + status.slice(1)

const formatQueueItemStatus = (status: QueueItemStatus) =>
  status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Not scheduled'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export default function CallQueue() {
  const [queues, setQueues] = useState<QueueSummary[]>([])
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null)
  const [items, setItems] = useState<QueueItem[]>([])
  const [pagination, setPagination] = useState<Pagination>(defaultPagination)
  const [loadingQueues, setLoadingQueues] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [locations, setLocations] = useState<PracticeLocationOption[]>([])
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [createForm, setCreateForm] = useState(defaultCreateForm)

  const selectedQueue = queues.find((queue) => queue.id === selectedQueueId) ?? null
  const totalQueuedPatients = queues.reduce((sum, queue) => sum + queue.totalCount, 0)
  const pendingPatientsEstimate = queues.reduce(
    (sum, queue) => sum + Math.max(queue.totalCount - queue.processedCount, 0),
    0
  )
  const activeQueues = queues.filter((queue) => queue.status === 'active').length
  const selectedQueuePending = items.filter((item) => item.status === 'pending').length

  const fetchQueues = async (preserveSelection = true) => {
    setLoadingQueues(true)
    try {
      const res = await api.get('/call-queues')
      const queueList: QueueSummary[] = Array.isArray(res.data?.data) ? res.data.data : []
      setQueues(queueList)

      if (queueList.length === 0) {
        setSelectedQueueId(null)
        setItems([])
        setPagination(defaultPagination)
      } else if (!preserveSelection || !queueList.some((queue) => queue.id === selectedQueueId)) {
        setSelectedQueueId(queueList[0].id)
      }
    } catch (err) {
      console.error('Failed to load call queues', err)
      toast.error('Failed to load call queues')
    } finally {
      setLoadingQueues(false)
    }
  }

  const fetchQueueItems = async (queueId: string, page = 1) => {
    setLoadingItems(true)
    try {
      const res = await api.get(`/call-queues/${queueId}/items`, {
        params: { page, limit: 10 },
      })
      setItems(res.data?.data?.items ?? [])
      setPagination(res.data?.data?.pagination ?? defaultPagination)
    } catch (err) {
      console.error('Failed to load queue items', err)
      toast.error('Failed to load queue items')
      setItems([])
      setPagination(defaultPagination)
    } finally {
      setLoadingItems(false)
    }
  }

  const loadCreateOptions = async () => {
    try {
      const [locationRes, patientRes] = await Promise.all([
        api.get('/practice-locations', { params: { page: 1, limit: 100 } }),
        api.get('/patients', { params: { page: 1, limit: 100, memberPlanStatus: 'null' } }),
      ])

      setLocations(locationRes.data?.data?.practiceLocations ?? [])
      setPatients(patientRes.data?.data?.patients ?? [])
    } catch (err) {
      console.error('Failed to load queue creation options', err)
      toast.error('Failed to load queue creation options')
    }
  }

  useEffect(() => {
    fetchQueues(false)
  }, [])

  useEffect(() => {
    if (selectedQueueId) {
      fetchQueueItems(selectedQueueId, 1)
    }
  }, [selectedQueueId])

  const openCreateModal = async () => {
    setCreateOpen(true)
    setCreateForm(defaultCreateForm)
    await loadCreateOptions()
  }

  const handleQueueAction = async (action: 'pause' | 'resume' | 'cancel') => {
    if (!selectedQueue) return

    setActionLoading(true)
    try {
      await api.patch(`/call-queues/${selectedQueue.id}/${action}`)
      toast.success(`Queue ${action}d`)
      await fetchQueues()
      await fetchQueueItems(selectedQueue.id, pagination.page)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Failed to ${action} queue`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelItem = async (itemId: string) => {
    if (!selectedQueueId) return

    try {
      await api.patch(`/call-queues/items/${itemId}/cancel`)
      toast.success('Queue item cancelled')
      await fetchQueues()
      await fetchQueueItems(selectedQueueId, pagination.page)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to cancel queue item')
    }
  }

  const togglePatient = (patientId: string) => {
    setCreateForm((current) => ({
      ...current,
      patientIds: current.patientIds.includes(patientId)
        ? current.patientIds.filter((id) => id !== patientId)
        : [...current.patientIds, patientId],
    }))
  }

  const handleCreateQueue = async () => {
    if (!createForm.name.trim()) {
      toast.error('Queue name is required')
      return
    }

    if (createForm.filterType === 'by_location' && !createForm.practiceLocationId) {
      toast.error('Select a location for location-based queues')
      return
    }

    if (createForm.filterType === 'specific_patients' && createForm.patientIds.length === 0) {
      toast.error('Select at least one patient')
      return
    }

    setCreateLoading(true)
    try {
      const payload = {
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        filterType: createForm.filterType,
        practiceLocationId:
          createForm.filterType === 'by_location' ? createForm.practiceLocationId : undefined,
        patientIds:
          createForm.filterType === 'specific_patients' ? createForm.patientIds : undefined,
        scheduledAt: createForm.scheduledAt || undefined,
      }

      const res = await api.post('/call-queues', payload)
      const createdQueueId = res.data?.data?.id as string | undefined
      toast.success('Queue created')
      setCreateOpen(false)
      setCreateForm(defaultCreateForm)
      await fetchQueues(false)
      if (createdQueueId) {
        setSelectedQueueId(createdQueueId)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create queue')
    } finally {
      setCreateLoading(false)
    }
  }

  return (
    <div className="p-8 space-y-6  mx-auto">
      <PageHeader
        title="Queue Management"
        subtitle="Create queues, monitor progress, and control automated call processing."
        icon={ListOrdered}
        action={
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => fetchQueues()}
              className="btn-ghost inline-flex items-center gap-2"
            >
              <RefreshCw size={14} className={loadingQueues ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={openCreateModal}
              className="btn-primary inline-flex items-center gap-2"
            >
              <PlusCircle size={14} />
              Create Queue
            </button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Total Queues
          </p>
          <p className="text-3xl font-bold text-ink-950 mt-3">{queues.length}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Active Queues
          </p>
          <p className="text-3xl font-bold text-ink-950 mt-3">{activeQueues}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Patients In Queue
          </p>
          <p className="text-3xl font-bold text-ink-950 mt-3">{totalQueuedPatients}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Still Pending
          </p>
          <p className="text-3xl font-bold text-ink-950 mt-3">{pendingPatientsEstimate}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px,minmax(0,1fr)]">
        <section className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-brand-100 bg-brand-50/50">
            <h2 className="text-sm font-bold text-ink-950">Queues</h2>
            <p className="text-sm text-slate-500">Select a queue to view live items.</p>
          </div>

          {loadingQueues ? (
            <div className="p-10 flex justify-center">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : queues.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <ListOrdered size={36} className="mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No call queues created yet.</p>
              <p className="text-sm mt-1">Create a queue for unverified patients or a location.</p>
            </div>
          ) : (
            <div className="divide-y divide-brand-100">
              {queues.map((queue) => {
                const isSelected = queue.id === selectedQueueId
                const progress = queue.totalCount > 0
                  ? Math.round((queue.processedCount / queue.totalCount) * 100)
                  : 0

                return (
                  <button
                    key={queue.id}
                    type="button"
                    onClick={() => setSelectedQueueId(queue.id)}
                    className={`w-full text-left px-5 py-4 transition-colors ${
                      isSelected ? 'bg-brand-50/70' : 'hover:bg-brand-50/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-950 truncate">{queue.name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {queue.practiceLocation?.name || 'All locations'}
                        </p>
                      </div>
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${queueStatusClasses[queue.status]}`}
                      >
                        {formatQueueStatus(queue.status)}
                      </span>
                    </div>
                    {queue.description && (
                      <p className="text-sm text-slate-600 mt-3 line-clamp-2">{queue.description}</p>
                    )}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                        <span>
                          {queue.processedCount} / {queue.totalCount} processed
                        </span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>{formatDateTime(queue.scheduledAt || queue.createdAt)}</span>
                      <span>{Math.max(queue.totalCount - queue.processedCount, 0)} remaining</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <section className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-brand-100 bg-brand-50/50 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-bold text-ink-950">
                {selectedQueue ? selectedQueue.name : 'Queue Details'}
              </h2>
              <p className="text-sm text-slate-500">
                {selectedQueue
                  ? `${selectedQueuePending} pending items in the current page view.`
                  : 'Choose a queue to inspect its items.'}
              </p>
            </div>

            {selectedQueue && (
              <div className="flex flex-wrap gap-2">
                {selectedQueue.status === 'active' && (
                  <button
                    onClick={() => handleQueueAction('pause')}
                    disabled={actionLoading}
                    className="btn-ghost inline-flex items-center gap-2"
                  >
                    <Pause size={14} />
                    Pause
                  </button>
                )}
                {selectedQueue.status === 'paused' && (
                  <button
                    onClick={() => handleQueueAction('resume')}
                    disabled={actionLoading}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Play size={14} />
                    Resume
                  </button>
                )}
                {selectedQueue.status !== 'cancelled' && selectedQueue.status !== 'completed' && (
                  <button
                    onClick={() => handleQueueAction('cancel')}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                    Cancel Queue
                  </button>
                )}
              </div>
            )}
          </div>

          {!selectedQueue ? (
            <div className="p-10 text-center text-slate-500">
              <AlertCircle size={34} className="mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No queue selected.</p>
            </div>
          ) : loadingItems ? (
            <div className="p-10 flex justify-center">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              <ListOrdered size={34} className="mx-auto mb-3 text-slate-300" />
              <p className="font-medium">This queue has no items yet.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 text-xs uppercase tracking-[0.15em] border-b border-brand-100 bg-brand-50/80">
                      <th className="px-4 py-2.5 text-left">Patient</th>
                      <th className="px-4 py-2.5 text-left">Coverage</th>
                      <th className="px-4 py-2.5 text-left">Status</th>
                      <th className="px-4 py-2.5 text-left">Attempts</th>
                      <th className="px-4 py-2.5 text-left">Last Attempt</th>
                      <th className="px-4 py-2.5 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-100">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-brand-50/40 transition-colors">
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                              <UserRound size={14} className="text-brand-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-ink-950">
                                {item.patient.firstName} {item.patient.lastName}
                              </p>
                              <p className="text-slate-500 mt-1">DOB: {item.patient.dob}</p>
                              <p className="text-slate-500 mt-1">
                                {item.patient.practiceLocation?.name || 'No location'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-1 text-slate-600">
                            <p>{item.patient.insurance?.name || 'No insurance linked'}</p>
                            <p>{item.patient.practiceGroup?.name || 'No practice group'}</p>
                            <p>{item.patient.provider?.name || 'No provider'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${queueItemStatusClasses[item.status]}`}
                          >
                            {formatQueueItemStatus(item.status)}
                          </span>
                          {item.notes && (
                            <p className="text-slate-500 text-xs mt-2 max-w-[220px]">{item.notes}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-slate-600 font-semibold">
                          {item.attemptCount}
                        </td>
                        <td className="px-4 py-3 align-top text-slate-500">
                          {item.lastAttemptAt ? formatDateTime(item.lastAttemptAt) : 'Not attempted'}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <button
                            onClick={() => handleCancelItem(item.id)}
                            disabled={item.status !== 'pending' && item.status !== 'outside_hours'}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={13} />
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <TablePagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                onPageChange={(page) => selectedQueueId && fetchQueueItems(selectedQueueId, page)}
              />
            </>
          )}
        </section>
      </div>

      {createOpen && (
        <AppModal
          title="Create Queue"
          subtitle="Build a queue from unverified patients, a location, or a specific patient list."
          onClose={() => !createLoading && setCreateOpen(false)}
          maxWidthClassName="max-w-3xl"
        >
          <div className="p-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Queue Name</label>
                <input
                  className="input-field"
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Morning unverified queue"
                />
              </div>
              <div>
                <label className="label">Scheduled Start</label>
                <div className="relative">
                  <CalendarClock
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="datetime-local"
                    className="input-field pl-9"
                    value={createForm.scheduledAt}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        scheduledAt: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                className="input-field min-h-[88px]"
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Optional notes for the admin team."
              />
            </div>

            <div>
              <label className="label">Queue Source</label>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  {
                    value: 'all_unverified' as QueueFilterType,
                    title: 'All Unverified',
                    description: 'Creates a queue from patients without a plan status.',
                  },
                  {
                    value: 'by_location' as QueueFilterType,
                    title: 'By Location',
                    description: 'Queues unverified patients for one location.',
                  },
                  {
                    value: 'specific_patients' as QueueFilterType,
                    title: 'Specific Patients',
                    description: 'Queues only the selected patients.',
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setCreateForm((current) => ({
                        ...current,
                        filterType: option.value,
                        patientIds:
                          option.value === 'specific_patients' ? current.patientIds : [],
                        practiceLocationId:
                          option.value === 'by_location' ? current.practiceLocationId : '',
                      }))
                    }
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      createForm.filterType === option.value
                        ? 'border-brand-300 bg-brand-50'
                        : 'border-slate-200 hover:border-brand-200 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-semibold text-ink-950">{option.title}</p>
                    <p className="text-sm text-slate-500 mt-1">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {createForm.filterType === 'by_location' && (
              <div>
                <label className="label">Location</label>
                <select
                  className="input-field"
                  value={createForm.practiceLocationId}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      practiceLocationId: event.target.value,
                    }))
                  }
                >
                  <option value="">Select a location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {createForm.filterType === 'specific_patients' && (
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <label className="label">Patients</label>
                  <span className="text-xs font-medium text-slate-500">
                    {createForm.patientIds.length} selected
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100">
                  {patients.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500">No unverified patients available.</div>
                  ) : (
                    patients.map((patient) => (
                      <label
                        key={patient.id}
                        className="flex items-center gap-3 p-4 hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={createForm.patientIds.includes(patient.id)}
                          onChange={() => togglePatient(patient.id)}
                        />
                        <div>
                          <p className="text-sm font-semibold text-ink-950">
                            {patient.firstName} {patient.lastName}
                          </p>
                          <p className="text-xs text-slate-500">
                            DOB: {patient.dob}
                            {patient.memberPlanStatus ? ` • ${patient.memberPlanStatus}` : ' • Unverified'}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                disabled={createLoading}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateQueue}
                disabled={createLoading}
                className="btn-primary inline-flex items-center gap-2"
              >
                <PlusCircle size={14} />
                {createLoading ? 'Creating...' : 'Create Queue'}
              </button>
            </div>
          </div>
        </AppModal>
      )}
    </div>
  )
}
