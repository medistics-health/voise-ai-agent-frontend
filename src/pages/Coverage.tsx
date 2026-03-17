import { useEffect, useState } from 'react'
import api from '../lib/api'
import { ShieldCheck, UserRound } from 'lucide-react'
import PageHeader from '../components/PageHeader'

interface CoverageRow {
  id: string
  patientId: string
  planName?: string
  memberId?: string
  subscriberId?: string
  groupName?: string
  groupNumber?: string
  mbi?: string
  policyNumber?: string
  benefitPeriodStart?: string
  benefitPeriodEnd?: string
  createdAt: string
  patient?: {
    id: string
    firstName: string
    middleName?: string
    lastName: string
    dob: string
    gender?: string
  }
}

function patientName(row: CoverageRow) {
  return [row.patient?.firstName, row.patient?.middleName, row.patient?.lastName].filter(Boolean).join(' ')
}

export default function Coverage() {
  const [rows, setRows] = useState<CoverageRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/eligibility/coverage')
      .then((res) => setRows(res.data.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Coverage"
        subtitle="Patient-wise coverage data saved from the extended coverage API response."
        icon={ShieldCheck}
      />

      <div className="table-shell">
        {loading ? (
          <div className="p-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-16 text-center">
            <ShieldCheck size={40} className="text-brand-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No coverage records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-[0.15em] border-b border-brand-100 bg-brand-50/80">
                  <th className="px-4 py-2.5 text-left">Patient</th>
                  <th className="px-4 py-2.5 text-left">DOB</th>
                  <th className="px-4 py-2.5 text-left">Gender</th>
                  <th className="px-4 py-2.5 text-left">Plan Name</th>
                  <th className="px-4 py-2.5 text-left">Member ID</th>
                  <th className="px-4 py-2.5 text-left">Subscriber ID</th>
                  <th className="px-4 py-2.5 text-left">Group Name</th>
                  <th className="px-4 py-2.5 text-left">Group Number</th>
                  <th className="px-4 py-2.5 text-left">MBI</th>
                  <th className="px-4 py-2.5 text-left">Policy Number</th>
                  <th className="px-4 py-2.5 text-left">Benefit Period</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-brand-50/40 transition-colors">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex-shrink-0 flex items-center justify-center">
                          <UserRound size={12} className="text-brand-600" />
                        </div>
                        <span className="text-ink-950 font-semibold whitespace-nowrap text-xs">{patientName(row)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-semibold whitespace-nowrap">{row.patient?.dob ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-semibold whitespace-nowrap">{row.patient?.gender ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-700 text-xs font-semibold max-w-[240px] truncate">{row.planName ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-mono whitespace-nowrap">{row.memberId ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-mono whitespace-nowrap">{row.subscriberId ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-700 text-xs font-semibold whitespace-nowrap">{row.groupName ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-mono whitespace-nowrap">{row.groupNumber ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-mono whitespace-nowrap">{row.mbi ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-600 text-xs font-mono whitespace-nowrap">{row.policyNumber ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs whitespace-nowrap">
                      {row.benefitPeriodStart && row.benefitPeriodEnd ? `${row.benefitPeriodStart} -> ${row.benefitPeriodEnd}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
