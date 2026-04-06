import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'

export interface MultiSelectOption {
  id: string
  name: string
  label?: string
  practiceLocationId?: string
  groupId?: string
  providerId?: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selectedIds: string[]
  onChange: (selectedIds: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  filters?: {
    practiceLocationId?: string
    groupId?: string
    providerId?: string
  }
}

export default function MultiSelect({
  options,
  selectedIds,
  onChange,
  placeholder = 'Select items...',
  disabled = false,
  className = '',
  filters = {},
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dropdownAbove, setDropdownAbove] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOptions = options.filter((opt) => selectedIds.includes(opt.id))
  const filteredOptions = options.filter(
    (opt) =>
      !selectedIds.includes(opt.id) &&
      (opt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt.label && opt.label.toLowerCase().includes(searchTerm.toLowerCase())))
  )

  const handleSelect = (option: MultiSelectOption) => {
    onChange([...selectedIds, option.id])
    setSearchTerm('')
  }

  const handleRemove = (id: string) => {
    onChange(selectedIds.filter((selectedId) => selectedId !== id))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') setIsOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && containerRef.current && dropdownRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const dropdownHeight = dropdownRef.current.offsetHeight
      const spaceBelow = window.innerHeight - rect.bottom
      
      setDropdownAbove(spaceBelow < dropdownHeight + 10)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="min-h-9 border border-slate-300 rounded-lg bg-white p-2 flex flex-wrap gap-2 items-start">
        {selectedOptions.length > 0 ? (
          <>
            {selectedOptions.map((option) => (
              <div
                key={option.id}
                className="inline-flex items-center gap-1 bg-brand-100 text-brand-700 px-2 py-1 rounded text-xs font-medium"
              >
                <span>
                  {option.name}
                  {option.label && <span className="text-brand-600 ml-1">({option.label})</span>}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(option.id)}
                  className="hover:text-brand-900 transition-colors"
                  disabled={disabled}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setIsOpen(true)
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={selectedIds.length === 0 ? placeholder : ''}
              disabled={disabled}
              className="flex-1 min-w-[120px] outline-none bg-transparent text-xs placeholder-slate-400"
            />
          </>
        ) : (
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full outline-none bg-transparent text-xs placeholder-slate-400"
          />
        )}
        <ChevronDown
          size={14}
          className={`ml-auto text-slate-400 transition-transform flex-shrink-0 ${isOpen ? 'transform rotate-180' : ''}`}
        />
      </div>

      {isOpen && (
        <div 
          ref={dropdownRef}
          className={`absolute left-0 right-0 bg-white border border-slate-300 rounded-lg shadow-xl z-50 max-h-56 overflow-y-auto ${
            dropdownAbove ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option)}
                className="w-full text-left px-3 py-2 hover:bg-brand-50 transition-colors text-xs border-b border-slate-100 last:border-b-0"
              >
                <div className="font-medium text-ink-950">{option.name}</div>
                {option.label && <div className="text-xs text-slate-500">{option.label}</div>}
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-xs text-slate-500 text-center">No options available</div>
          )}
        </div>
      )}
    </div>
  )
}
