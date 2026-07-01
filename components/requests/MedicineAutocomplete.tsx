'use client'

import { useState, useEffect, useRef } from 'react'

interface Medicine {
  id: string
  name: string
  synonyms: string[]
}

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function MedicineAutocomplete({ value, onChange, placeholder }: Props) {
  const [suggestions, setSuggestions] = useState<Medicine[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  function doSearch(q: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 2) { setSuggestions([]); setOpen(false); return }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/medicines/search?q=${encodeURIComponent(q)}`)
        if (!res.ok) { console.error('medicines search HTTP', res.status); setSuggestions([]); return }
        const json = await res.json()
        const results = json.data ?? []
        console.log('[autocomplete]', q, '->', results.length, 'résultats')
        setSuggestions(results)
        setOpen(results.length > 0)
        setActiveIndex(-1)
      } catch (err) {
        console.error('[autocomplete] fetch error:', err)
        setSuggestions([])
      }
    }, 250)
  }

  // Sync externe (si valeur réinitialisée depuis le parent)
  useEffect(() => {
    if (value.length < 2) { setSuggestions([]); setOpen(false) }
  }, [value])

  // Fermer si clic extérieur
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function select(name: string) {
    onChange(name)
    setOpen(false)
    setSuggestions([])
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      select(suggestions[activeIndex].name)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Trouver le synonyme correspondant à la recherche pour l'afficher
  function matchedSynonym(med: Medicine): string | null {
    const q = value.toLowerCase()
    return med.synonyms.find(s => s.toLowerCase().includes(q)) ?? null
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); doSearch(e.target.value) }}
        onKeyDown={onKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
        autoComplete="off"
      />

      {open && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((med, i) => {
            const synonym = matchedSynonym(med)
            return (
              <li
                key={med.id}
                onMouseDown={() => select(med.name)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`px-3 py-2 cursor-pointer text-sm ${
                  i === activeIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <span className="font-medium text-gray-900">{med.name}</span>
                {synonym && synonym.toLowerCase() !== med.name.toLowerCase() && (
                  <span className="ml-2 text-xs text-gray-400">({synonym})</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
