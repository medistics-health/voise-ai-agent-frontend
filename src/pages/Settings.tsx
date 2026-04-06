import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { AlertCircle, RotateCcw, Settings } from 'lucide-react'
import api from '../lib/api'
import PageHeader from '../components/PageHeader'

interface SettingField {
  key: string
  label: string
  type?: 'text' | 'textarea' | 'number' | 'password'
  placeholder?: string
}

interface SettingSection {
  id: string
  title: string
  description: string
  fields: SettingField[]
}

const sections: SettingSection[] = [
  {
    id: 'practice',
    title: 'Practice Info',
    description: 'Practice details used in greetings and system displays.',
    fields: [
      { key: 'practice.name', label: 'Practice Name', placeholder: 'Medical Practice' },
      { key: 'practice.hours', label: 'Practice Hours', placeholder: 'Mon-Fri 9am-5pm' },
      { key: 'practice.address', label: 'Address', type: 'textarea', placeholder: '123 Main St, New York, NY' },
      { key: 'practice.phone', label: 'Phone', placeholder: '+1 555 555 5555' },
      {
        key: 'practice.greeting',
        label: 'Agent Greeting',
        type: 'textarea',
        placeholder: 'Hello from {practiceName}. How can I help you today?',
      },
    ],
  },
  {
    id: 'livekit',
    title: 'LiveKit Server',
    description: 'Realtime transport and room settings for voice sessions.',
    fields: [
      { key: 'livekit.url', label: 'Server URL', placeholder: 'http://localhost:7880' },
      { key: 'livekit.wsUrl', label: 'WebSocket URL', placeholder: 'ws://localhost:7880' },
      { key: 'livekit.apiKey', label: 'API Key', type: 'password' },
      { key: 'livekit.apiSecret', label: 'API Secret', type: 'password' },
    ],
  },
  {
    id: 'deepgram',
    title: 'Deepgram',
    description: 'Speech-to-text and text-to-speech settings.',
    fields: [
      { key: 'deepgram.apiKey', label: 'API Key', type: 'password' },
      { key: 'deepgram.voiceModel', label: 'Voice Model', placeholder: 'aura-luna-en' },
    ],
  },
  {
    id: 'voice-agent',
    title: 'Voice Agent',
    description: 'Voice agent backend endpoint and related connectivity.',
    fields: [
      { key: 'voiceAgent.url', label: 'Backend URL', placeholder: 'http://localhost:4100' },
    ],
  },
  {
    id: 'agent',
    title: 'Agent Config',
    description: 'Core runtime behavior for response timing and verification.',
    fields: [
      { key: 'agent.responseTimeoutMs', label: 'Response Timeout (ms)', type: 'number', placeholder: '8000' },
      { key: 'agent.maxSilenceMs', label: 'Max Silence (ms)', type: 'number', placeholder: '120000' },
      { key: 'agent.maxCallDurationMs', label: 'Max Call Duration (ms)', type: 'number', placeholder: '0' },
      { key: 'agent.maxVerificationAttempts', label: 'Max Verification Attempts', type: 'number', placeholder: '3' },
    ],
  },
  {
    id: 'queue',
    title: 'Queue Runtime',
    description: 'Automated queue processor settings.',
    fields: [
      { key: 'queue.callCompletionDelayMs', label: 'Call Completion Delay (ms)', type: 'number', placeholder: '0' },
      { key: 'queue.pollIntervalMs', label: 'Processor Poll Interval (ms)', type: 'number', placeholder: '5000' },
    ],
  },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [initialSettings, setInitialSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingSectionId, setSavingSectionId] = useState<string | null>(null)
  const [activeSectionId, setActiveSectionId] = useState(sections[0].id)

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await api.get('/settings/list')
      const settingsMap: Record<string, string> = {}
      const list = Array.isArray(res.data?.data) ? res.data.data : []

      list.forEach((setting: { key: string; value: string | null }) => {
        settingsMap[setting.key] = setting.value ?? ''
      })

      setSettings(settingsMap)
      setInitialSettings(settingsMap)
    } catch (err) {
      console.error('Failed to load settings', err)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleChange = (key: string, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const handleResetSection = (section: SettingSection) => {
    setSettings((current) => {
      const next = { ...current }
      section.fields.forEach((field) => {
        next[field.key] = initialSettings[field.key] ?? ''
      })
      return next
    })
  }

  const handleSaveSection = async (section: SettingSection) => {
    setSavingSectionId(section.id)
    try {
      await api.post('/settings/bulk', {
        updates: section.fields.map((field) => ({
          key: field.key,
          value: settings[field.key] ?? '',
        })),
      })

      setInitialSettings((current) => ({
        ...current,
        ...Object.fromEntries(section.fields.map((field) => [field.key, settings[field.key] ?? ''])),
      }))
      toast.success(`${section.title} saved`)
    } catch (err) {
      console.error(`Failed to save ${section.title}`, err)
      toast.error(`Failed to save ${section.title}`)
    } finally {
      setSavingSectionId(null)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0]

  return (
    <div className="p-8 space-y-6  mx-auto">
      <PageHeader
        title="System Settings"
        subtitle="Manage practice info, infrastructure credentials, and runtime voice agent behavior."
        icon={Settings}
      />

      <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex gap-3 text-blue-900">
        <AlertCircle className="shrink-0 mt-0.5" size={18} />
        <div>
          <p className="text-sm font-semibold">Database-backed configuration</p>
          <p className="text-sm mt-1">
            These values are stored in `system_settings`. Use <code>{'{practiceName}'}</code> in
            the greeting field when you want the live practice name injected.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[250px,minmax(0,1fr)]">
        <aside className="glass-card p-3 h-fit">
          <div className="space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSectionId(section.id)}
                className={`w-full text-left rounded-2xl px-4 py-3 transition-colors ${
                  activeSectionId === section.id
                    ? 'bg-brand-50 border border-brand-200'
                    : 'border border-transparent hover:bg-slate-50'
                }`}
              >
                <p className="text-sm font-semibold text-ink-950">{section.title}</p>
                <p className="text-xs text-slate-500 mt-1">{section.description}</p>
              </button>
            ))}
          </div>
        </aside>

        <section className="glass-card overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-950">{activeSection.title}</h2>
            <p className="text-sm text-slate-500 mt-1">{activeSection.description}</p>
          </div>

          <div className="p-6">
            {activeSection.id === 'agent' || activeSection.id === 'queue' ? (
              <div className="space-y-5">
                {activeSection.fields.map((field) => (
                  <div key={field.key}>
                    <label className="label">{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea
                        className="input-field min-h-[96px]"
                        value={settings[field.key] ?? ''}
                        onChange={(event) => handleChange(field.key, event.target.value)}
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <input
                        type={field.type ?? 'text'}
                        className="input-field"
                        value={settings[field.key] ?? ''}
                        onChange={(event) => handleChange(field.key, event.target.value)}
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => handleResetSection(activeSection)}
              disabled={savingSectionId === activeSection.id}
              className="btn-ghost inline-flex items-center gap-2"
            >
              <RotateCcw size={14} />
              Reset Section
            </button>
            <button
              type="button"
              onClick={() => handleSaveSection(activeSection)}
              disabled={savingSectionId === activeSection.id}
              className="btn-primary"
            >
              {savingSectionId === activeSection.id ? 'Saving...' : 'Save Section'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
