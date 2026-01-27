import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import ReactMarkdown from 'react-markdown'
import './App.css'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'https://api.playbuddy.me'
const EVENTS_URL = `${API_BASE_URL}/events`

const TABS = [
  { label: 'All', value: 'all' },
  { label: 'Retreats', value: 'retreat' },
  { label: 'Festivals', value: 'festival' },
  { label: 'Conferences', value: 'conference' },
  { label: 'Immersions', value: 'immersion' },
  { label: 'Tantra', value: 'tantra' },
  { label: 'Somatic', value: 'somatic' },
  { label: 'Couples', value: 'couples' },
  { label: 'Queer', value: 'queer' },
  { label: 'Weekend', value: 'weekend' },
]

const MONTH_LABELS = [
  'Any month',
  'February 2026',
  'March 2026',
  'April 2026',
  'May 2026',
  'June 2026',
  'July 2026',
  'September 2026',
  'October 2026',
]

type EventOrganizer = {
  name?: string | null
}

type EventClassification = {
  tags?: string[] | null
  experience_level?: string | null
  interactivity_level?: string | null
}

type ApiEvent = {
  id: number
  name: string
  start_date: string
  end_date?: string | null
  description?: string | null
  image_url?: string | null
  organizer?: EventOrganizer | null
  location?: string | null
  neighborhood?: string | null
  city?: string | null
  region?: string | null
  country?: string | null
  short_price?: string | null
  price?: string | null
  ticket_url?: string | null
  event_url?: string | null
  type?: string | null
  tags?: string[] | null
  classification?: EventClassification | null
}

const normalize = (value?: string | null) => (value ?? '').toLowerCase().trim()

const formatDateRange = (start?: string | null, end?: string | null) => {
  if (!start) {
    return 'Date TBA'
  }

  const startDate = new Date(start)
  if (Number.isNaN(startDate.getTime())) {
    return 'Date TBA'
  }

  const startLabel = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  if (!end) {
    return startLabel
  }

  const endDate = new Date(end)
  if (Number.isNaN(endDate.getTime())) {
    return startLabel
  }

  const endLabel = endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return `${startLabel} - ${endLabel}`
}

const getNights = (start?: string | null, end?: string | null) => {
  if (!start || !end) return null
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null
  }
  const diff = endDate.getTime() - startDate.getTime()
  if (diff <= 0) return null
  const nights = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  return nights
}

const getMonthValue = (start?: string | null) => {
  if (!start) return null
  const date = new Date(start)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

const LINK_REGEX = /((https?:\/\/|www\.)[^\s<]+)/g

const linkifyToMarkdown = (text: string) =>
  text.replace(LINK_REGEX, (match) => {
    const href = match.startsWith('http') ? match : `https://${match}`
    return `[${match}](${href})`
  })

const formatLongDate = (value?: string | null) => {
  if (!value) return 'Date TBA'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date TBA'
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const getLocationLabel = (event: ApiEvent) => {
  const neighborhood = event.neighborhood?.trim()
  const city = event.city?.trim()
  const region = event.region?.trim()
  const country = event.country?.trim()
  const compact = [neighborhood, city, region].filter(Boolean).join(', ')
  if (compact) return compact
  const location = event.location?.trim()
  if (location) return location
  if (country) return country
  return 'Location TBA'
}

const getTags = (event: ApiEvent) => {
  const tags = [
    ...(event.classification?.tags ?? []),
    ...(event.tags ?? []),
  ]
    .map((tag) => tag?.trim())
    .filter((tag): tag is string => Boolean(tag))

  if (event.type && normalize(event.type) !== 'event') {
    tags.push(event.type)
  }

  const unique = new Map<string, string>()
  tags.forEach((tag) => {
    const key = normalize(tag)
    if (key && !unique.has(key)) {
      unique.set(key, tag)
    }
  })

  return Array.from(unique.values())
}

const getTypeLabel = (event: ApiEvent) => {
  const typeMap: Record<string, string> = {
    retreat: 'Retreat',
    festival: 'Festival',
    conference: 'Conference',
    immersion: 'Immersion',
    residency: 'Residency',
  }

  const rawType = normalize(event.type)
  if (rawType && typeMap[rawType]) {
    return typeMap[rawType]
  }

  const tags = getTags(event).map(normalize)
  const tagMatch = tags.find((tag) => Boolean(typeMap[tag]))
  return tagMatch ? typeMap[tagMatch] : ''
}

const isRetreatLike = (event: ApiEvent) => {
  const type = normalize(event.type)
  const typeAllowlist = new Set([
    'retreat',
    'festival',
    'conference',
  ])

  return typeAllowlist.has(type)
}

const matchesQuery = (event: ApiEvent, query: string) => {
  if (!query) return true
  const haystack = [
    event.name,
    event.organizer?.name,
    event.location,
    event.neighborhood,
    event.city,
    event.region,
    event.country,
    ...getTags(event),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

const matchesTab = (event: ApiEvent, activeTab: string) => {
  if (!activeTab || activeTab === 'all') return true
  const tags = getTags(event).map(normalize)
  return tags.includes(activeTab)
}

const matchesMonth = (event: ApiEvent, month: string) => {
  if (!month || month === 'Any month') return true
  return getMonthValue(event.start_date) === month
}

function App() {
  const [events, setEvents] = useState<ApiEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(TABS[0].value)
  const [query, setQuery] = useState('')
  const [month, setMonth] = useState(MONTH_LABELS[0])
  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(EVENTS_URL, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`)
        }
        const payload = (await response.json()) as ApiEvent[]
        setEvents(Array.isArray(payload) ? payload : [])
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setError('Unable to load retreats right now.')
        setEvents([])
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = selectedEvent ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [selectedEvent])

  useEffect(() => {
    if (!selectedEvent) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedEvent(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedEvent])

  const retreats = useMemo(
    () => events.filter((event) => isRetreatLike(event)),
    [events]
  )

  const filtered = useMemo(() => {
    const queryValue = normalize(query)
    return retreats.filter((event) => (
      matchesTab(event, activeTab) &&
      matchesQuery(event, queryValue) &&
      matchesMonth(event, month)
    ))
  }, [retreats, activeTab, query, month])

  const modalRoot = typeof document !== 'undefined' ? document.body : null
  const modalContent = selectedEvent ? (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={() => setSelectedEvent(null)}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-title"
        onClick={(event) => event.stopPropagation()}
      >
        {(() => {
          const typeLabel = getTypeLabel(selectedEvent)
          const tags = getTags(selectedEvent).filter(
            (tag) => normalize(tag) !== 'retreat'
          )
          const organizerName = selectedEvent.organizer?.name?.trim() || 'Organizer'
          const priceLabel = selectedEvent.short_price || selectedEvent.price
          const locationLabel = getLocationLabel(selectedEvent)
          const description =
            typeof selectedEvent.description === 'string' ? selectedEvent.description : ''
          const formattedDate = formatDateRange(
            selectedEvent.start_date,
            selectedEvent.end_date
          )
          const ticketUrl = selectedEvent.ticket_url || selectedEvent.event_url

          const hasHeroImage = Boolean(selectedEvent.image_url)

          return (
            <>
              <div className="modal-event-detail">
                <div className={`modal-hero ${hasHeroImage ? 'is-image' : 'is-placeholder'}`}>
                {hasHeroImage ? (
                  <img
                    src={selectedEvent.image_url}
                    alt={selectedEvent.name}
                    className="modal-hero-image"
                  />
                ) : (
                  <div className="modal-hero-placeholder">PlayBuddy Event</div>
                )}
                {typeLabel ? (
                  <span className="modal-type-chip">{typeLabel}</span>
                ) : null}
                <div className="modal-hero-overlay" />
                <button
                  type="button"
                  className="modal-close"
                  aria-label="Close details"
                  onClick={() => setSelectedEvent(null)}
                >
                  Close
                </button>
                <div className="modal-hero-footer">
                  <h2 id="event-title">{selectedEvent.name}</h2>
                    <div className="modal-hero-organizer">
                      <span className="modal-organizer-dot" />
                      <span className="modal-hero-organizer-text">{organizerName}</span>
                    </div>
                  </div>
                </div>

                <div className="modal-header-sheet">
                  <div className="modal-meta-list">
                    <div className="modal-meta-line">
                      <span className="modal-meta-icon">📅</span>
                      <span className="modal-meta-text">{formattedDate}</span>
                    </div>
                    {locationLabel ? (
                      <div className="modal-meta-line">
                        <span className="modal-meta-icon">📍</span>
                        <span className="modal-meta-text">{locationLabel}</span>
                      </div>
                    ) : null}
                    {priceLabel ? (
                      <div className="modal-meta-line">
                        <span className="modal-meta-icon">🏷️</span>
                        <span className="modal-meta-text">{priceLabel}</span>
                      </div>
                    ) : null}
                  </div>

                  {tags.length > 0 ? (
                    <div className="modal-tag-row">
                      {tags.slice(0, 10).map((tag) => (
                        <span key={tag} className="modal-tag-chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="modal-action-row">
                    <button
                      className="modal-ticket-button"
                      type="button"
                      disabled={!ticketUrl}
                      onClick={() => {
                        if (ticketUrl) {
                          window.open(ticketUrl, '_blank')
                        }
                      }}
                    >
                      Get Tickets
                    </button>
                  </div>
                </div>

                <div className="modal-description">
                  <div className="modal-section-card">
                    <div className="modal-section-title">About</div>
                    {description ? (
                      <div className="modal-markdown">
                        <ReactMarkdown>
                          {linkifyToMarkdown(description)}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="modal-text">No description yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )
        })()}
      </div>
    </div>
  ) : null

  return (
    <div className="page">
      <header className="hero">
        <nav className="nav">
          <div className="brand">
            <div className="brand-mark">
              <img src="/awaken-mark.svg" alt="AltRetreats.life" />
            </div>
            <div>
              <p className="brand-title">AltRetreats.life</p>
              <p className="brand-subtitle">Find your people, find your pleasure</p>
            </div>
          </div>
        </nav>
      </header>

      <section className="content">
        <div className="filters">
          <label className="field">
            <span>Search</span>
            <input
              type="text"
              placeholder="Search retreats"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Month</span>
            <select value={month} onChange={(event) => setMonth(event.target.value)}>
              {MONTH_LABELS.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="tabs">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.value
            return (
              <button
                key={tab.value}
                className={`tab ${isActive ? 'tab-active' : ''}`}
                type="button"
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="section-header">
          <h2>Retreats</h2>
          <p className="section-subtext">{filtered.length} listed</p>
        </div>

        <div className="grid">
          {isLoading && <div className="state-card">Loading retreats...</div>}
          {!isLoading && error && <div className="state-card">{error}</div>}
          {!isLoading && !error && filtered.length === 0 && (
            <div className="state-card">No retreats match your filters.</div>
          )}
          {!isLoading && !error && filtered.map((event) => {
            const nights = getNights(event.start_date, event.end_date)
            const tags = getTags(event).filter((tag) => normalize(tag) !== 'retreat')
            const locationLabel = getLocationLabel(event)
            const priceLabel = event.short_price?.trim() || event.price?.trim() || ''
            const organizerName = event.organizer?.name?.trim()
            const typeLabel = getTypeLabel(event)

            return (
              <article
                key={event.id}
                className="retreat-card"
                role="button"
                tabIndex={0}
                onClick={() => setSelectedEvent(event)}
                onKeyDown={(keyEvent) => {
                  if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                    keyEvent.preventDefault()
                    setSelectedEvent(event)
                  }
                }}
              >
                <div className="retreat-image">
                  {event.image_url ? (
                    <img src={event.image_url} alt={event.name} loading="lazy" />
                  ) : (
                    <div className="image-placeholder">No image yet</div>
                  )}
                  {typeLabel ? (
                    <div className="type-badge">{typeLabel}</div>
                  ) : null}
                </div>
                <div className="retreat-body">
                  <div className="retreat-top">
                    <div>
                      <h3>{event.name}</h3>
                      {organizerName && (
                        <p className="retreat-host">Hosted by {organizerName}</p>
                      )}
                    </div>
                    {priceLabel && <div className="retreat-price">{priceLabel}</div>}
                  </div>
                  <div className="retreat-meta">
                    <span>{formatDateRange(event.start_date, event.end_date)}</span>
                    {nights ? <span>{nights} nights</span> : null}
                    <span>{locationLabel}</span>
                  </div>
                  {tags.length > 0 && (
                    <div className="retreat-tags">
                      {tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {modalRoot && modalContent ? createPortal(modalContent, modalRoot) : null}
    </div>
  )
}

export default App
