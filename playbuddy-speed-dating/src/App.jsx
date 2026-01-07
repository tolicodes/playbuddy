import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const STORAGE_KEYS = {
  number: 'playbuddy-speed-dating-number',
  choices: 'playbuddy-speed-dating-choices',
  contact: 'playbuddy-speed-dating-contact',
}

const ROWS = Array.from({ length: 20 }, (_, index) => index + 1)

const OPTIONS = [
  { value: 'flirt', label: 'Flirt', className: 'is-flirt', Icon: HeartIcon },
  { value: 'bud', label: 'Bud', className: 'is-bud', Icon: SmileIcon },
  { value: 'both', label: 'Both', className: 'is-both', Icon: BothIcon },
  { value: 'none', label: 'None', className: 'is-none', Icon: NoneIcon },
]

const CONTACT_METHODS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
]

const CONTACT_FIELD_CONFIG = {
  instagram: {
    label: 'Instagram handle',
    placeholder: 'knotty_nights',
    helper: "We'll share your handle with your matches.",
    type: 'text',
    inputMode: 'text',
    autoComplete: 'username',
    prefix: '@',
  },
  email: {
    label: 'Contact email (shown to matches)',
    placeholder: 'afterglow@playbuddy.me',
    helper: 'This can be different from your match-results email.',
    type: 'email',
    inputMode: 'email',
    autoComplete: 'email',
  },
  phone: {
    label: 'Phone number',
    placeholder: '(555) 696-6969',
    helper: 'Only shared with your matches.',
    type: 'tel',
    inputMode: 'tel',
    autoComplete: 'tel',
  },
}

const VALID_CHOICES = new Set(OPTIONS.map((option) => option.value))

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INSTAGRAM_REGEX = /^[a-zA-Z0-9._]{1,30}$/

const createDefaultChoices = () =>
  Object.fromEntries(ROWS.map((row) => [row, 'none']))

const createDefaultContact = () => ({
  resultsEmail: '',
  displayName: '',
  contactMethod: '',
  contactValue: '',
})

const normalizeInstagram = (value) =>
  value.replace(/^@+/, '').replace(/\s+/g, '').slice(0, 30)

const normalizePhone = (value) => {
  if (!value) {
    return ''
  }

  const trimmed = value.trim()
  const hasPlus = trimmed.startsWith('+')
  const digitsOnly = trimmed.replace(/\D/g, '').slice(0, 15)
  return hasPlus ? `+${digitsOnly}` : digitsOnly
}

const formatPhoneForDisplay = (value) => {
  if (!value) {
    return ''
  }

  if (value.startsWith('+')) {
    const digits = value.slice(1)
    return `+${digits.replace(/(\d{3})(?=\d)/g, '$1 ')}`
  }

  const digits = value

  if (digits.length <= 3) {
    return digits
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  }

  const main = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(
    6,
    10
  )}`

  if (digits.length <= 10) {
    return main
  }

  return `${main} ${digits.slice(10)}`
}

const getInitialNumber = () => {
  if (typeof window === 'undefined') {
    return 1
  }

  const stored = window.localStorage.getItem(STORAGE_KEYS.number)
  const parsed = stored ? Number(stored) : null

  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 20) {
    return parsed
  }

  const generated = Math.floor(Math.random() * 20) + 1
  window.localStorage.setItem(STORAGE_KEYS.number, String(generated))
  return generated
}

const getInitialChoices = () => {
  if (typeof window === 'undefined') {
    return createDefaultChoices()
  }

  const stored = window.localStorage.getItem(STORAGE_KEYS.choices)
  if (!stored) {
    return createDefaultChoices()
  }

  try {
    const parsed = JSON.parse(stored)
    return sanitizeChoices(parsed)
  } catch {
    return createDefaultChoices()
  }
}

const getInitialContact = () => createDefaultContact()

const sanitizeChoices = (raw) => {
  const defaults = createDefaultChoices()

  if (!raw || typeof raw !== 'object') {
    return defaults
  }

  ROWS.forEach((row) => {
    const value = raw[row]
    if (VALID_CHOICES.has(value)) {
      defaults[row] = value
    }
  })

  return defaults
}

const saveChoicesToStorage = (choices, number) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEYS.number, String(number))
  window.localStorage.setItem(STORAGE_KEYS.choices, JSON.stringify(choices))
}

const saveContactToStorage = (contact) => {
  if (typeof window === 'undefined') {
    return
  }

  const payload = {
    results_email: contact.resultsEmail.trim(),
    display_name: contact.displayName.trim(),
    contact_method: contact.contactMethod,
    contact_value: contact.contactValue.trim(),
  }

  window.localStorage.setItem(STORAGE_KEYS.contact, JSON.stringify(payload))
}

const vibrate = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(12)
  }
}

const isValidEmail = (value) => EMAIL_REGEX.test(value)

const isValidName = (value) => {
  const trimmed = value.trim()
  return trimmed.length >= 2 && trimmed.length <= 30
}

const isValidInstagram = (value) => INSTAGRAM_REGEX.test(value)

const isValidPhone = (value) => {
  if (!value) {
    return false
  }

  const digits = value.startsWith('+') ? value.slice(1) : value
  return digits.length >= 7 && digits.length <= 15
}

const getContactValueError = (method, value) => {
  if (!method) {
    return 'Select a contact method first.'
  }

  if (!value) {
    return 'This field is required.'
  }

  if (method === 'instagram' && !isValidInstagram(value)) {
    return 'Use letters, numbers, periods, or underscores (1-30).'
  }

  if (method === 'email' && !isValidEmail(value.trim())) {
    return 'Enter a valid email address.'
  }

  if (method === 'phone' && !isValidPhone(value)) {
    return 'Enter a valid phone number.'
  }

  return ''
}

function App() {
  const [step, setStep] = useState('contact')
  const [yourNumber] = useState(getInitialNumber)
  const [choices, setChoices] = useState(getInitialChoices)
  const [contact, setContact] = useState(getInitialContact)
  const [toast, setToast] = useState('')
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [touched, setTouched] = useState({
    resultsEmail: false,
    displayName: false,
    contactValue: false,
  })
  const toastTimer = useRef(null)

  const completedCount = useMemo(
    () => Object.values(choices).filter((value) => value !== 'none').length,
    [choices]
  )

  const resultsEmailValid = isValidEmail(contact.resultsEmail.trim())
  const displayNameValid = isValidName(contact.displayName)
  const contactMethodValid = CONTACT_METHODS.some(
    (method) => method.value === contact.contactMethod
  )
  const contactValueValid = contactMethodValid
    ? contact.contactMethod === 'instagram'
      ? isValidInstagram(contact.contactValue)
      : contact.contactMethod === 'phone'
      ? isValidPhone(contact.contactValue)
      : isValidEmail(contact.contactValue.trim())
    : false

  const canContinue =
    resultsEmailValid && displayNameValid && contactMethodValid && contactValueValid

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current)
      }
    }
  }, [])

  const showToast = (message) => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current)
    }

    setToast(message)
    toastTimer.current = setTimeout(() => {
      setToast('')
      toastTimer.current = null
    }, 1800)
  }

  const handleSelect = (row, value) => {
    setChoices((prev) => ({
      ...prev,
      [row]: value,
    }))
    vibrate()
  }

  const handleSave = () => {
    saveChoicesToStorage(choices, yourNumber)
    showToast('Saved')
    setStep('confirmation')
  }

  const handleClear = () => {
    const cleared = createDefaultChoices()
    setChoices(cleared)
    saveChoicesToStorage(cleared, yourNumber)
    showToast('Cleared')
  }

  const handleContactChange = (field, value) => {
    setContact((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleContactMethodChange = (method) => {
    setContact((prev) => ({
      ...prev,
      contactMethod: method,
      contactValue: prev.contactMethod === method ? prev.contactValue : '',
    }))
    setTouched((prev) => ({ ...prev, contactValue: false }))
  }

  const handleContactValueChange = (value) => {
    setContact((prev) => {
      let nextValue = value

      if (prev.contactMethod === 'instagram') {
        nextValue = normalizeInstagram(value)
      } else if (prev.contactMethod === 'phone') {
        nextValue = normalizePhone(value)
      }

      return {
        ...prev,
        contactValue: nextValue,
      }
    })
  }

  const handleContinue = (event) => {
    if (event) {
      event.preventDefault()
    }

    if (!canContinue) {
      setTouched({
        resultsEmail: true,
        displayName: true,
        contactValue: true,
      })
      return
    }

    saveContactToStorage(contact)
    setStep('choices')
  }

  const contactConfig = contact.contactMethod
    ? CONTACT_FIELD_CONFIG[contact.contactMethod]
    : null

  const contactValueDisplay =
    contact.contactMethod === 'phone'
      ? formatPhoneForDisplay(contact.contactValue)
      : contact.contactValue

  const resultsEmailError =
    touched.resultsEmail && !resultsEmailValid
      ? contact.resultsEmail
        ? 'Enter a valid email address.'
        : 'Email is required.'
      : ''
  const displayNameError =
    touched.displayName && !displayNameValid
      ? 'Name must be 2-30 characters.'
      : ''
  const contactValueError =
    touched.contactValue && !contactValueValid
      ? getContactValueError(contact.contactMethod, contact.contactValue)
      : ''

  return (
    <div className="app">
      {step === 'contact' ? (
        <div className="screen contact-screen">
          <header className="contact-header">
            <img
              src="/playbuddy-logo.png"
              alt="PlayBuddy logo"
              className="logo"
            />
            <div>
              <p className="eyebrow">PLAYBUDDY PRESENTS</p>
              <h1>Pagan&apos;s Paradise Speed Dating &amp; Friending</h1>
              <p className="subtitle">
                We will email your match results.
                <br />
                Matches will only see the contact method you choose.
              </p>
            </div>
          </header>

          <form className="contact-card" onSubmit={handleContinue}>
            <div className="form-group">
              <label className="form-label" htmlFor="results-email">
                Email for match results
              </label>
              <input
                id="results-email"
                type="email"
                className={`text-input ${resultsEmailError ? 'has-error' : ''}`}
                placeholder="knotty.nights@example.com"
                value={contact.resultsEmail}
                onChange={(event) =>
                  handleContactChange('resultsEmail', event.target.value)
                }
                onBlur={() =>
                  setTouched((prev) => ({ ...prev, resultsEmail: true }))
                }
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
              <p
                className={`form-helper ${resultsEmailError ? 'is-error' : ''}`}
              >
                {resultsEmailError || 'We only use this to send your matches.'}
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="display-name">
                Your name (shown to matches)
              </label>
              <input
                id="display-name"
                type="text"
                className={`text-input ${displayNameError ? 'has-error' : ''}`}
                placeholder="RopeBunny"
                value={contact.displayName}
                onChange={(event) =>
                  handleContactChange('displayName', event.target.value)
                }
                onBlur={() =>
                  setTouched((prev) => ({ ...prev, displayName: true }))
                }
                autoComplete="name"
                maxLength={30}
                required
              />
              <p
                className={`form-helper ${displayNameError ? 'is-error' : ''}`}
              >
                {displayNameError || 'First name or nickname is fine.'}
              </p>
            </div>

            <div className="form-group">
              <p className="form-label">How should matches contact you?</p>
              <div className="contact-methods">
                {CONTACT_METHODS.map((method) => (
                  <label
                    key={method.value}
                    className={`radio-pill ${
                      contact.contactMethod === method.value
                        ? 'is-selected'
                        : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="contact-method"
                      value={method.value}
                      checked={contact.contactMethod === method.value}
                      onChange={() => handleContactMethodChange(method.value)}
                    />
                    <span>{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {contactConfig ? (
              <div className="form-group">
                <label className="form-label" htmlFor="contact-value">
                  {contactConfig.label}
                </label>
                {contactConfig.prefix ? (
                  <div
                    className={`input-row ${contactValueError ? 'has-error' : ''}`}
                  >
                    <span className="input-prefix">{contactConfig.prefix}</span>
                    <input
                      id="contact-value"
                      type={contactConfig.type}
                      className={`text-input has-prefix ${
                        contactValueError ? 'has-error' : ''
                      }`}
                      placeholder={contactConfig.placeholder}
                      value={contactValueDisplay}
                      onChange={(event) =>
                        handleContactValueChange(event.target.value)
                      }
                      onBlur={() =>
                        setTouched((prev) => ({ ...prev, contactValue: true }))
                      }
                      autoComplete={contactConfig.autoComplete}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode={contactConfig.inputMode}
                      required
                    />
                  </div>
                ) : (
                  <input
                    id="contact-value"
                    type={contactConfig.type}
                    className={`text-input ${
                      contactValueError ? 'has-error' : ''
                    }`}
                    placeholder={contactConfig.placeholder}
                    value={contactValueDisplay}
                    onChange={(event) =>
                      handleContactValueChange(event.target.value)
                    }
                    onBlur={() =>
                      setTouched((prev) => ({ ...prev, contactValue: true }))
                    }
                    autoComplete={contactConfig.autoComplete}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode={contactConfig.inputMode}
                    required
                  />
                )}
                <p
                  className={`form-helper ${contactValueError ? 'is-error' : ''}`}
                >
                  {contactValueError || contactConfig.helper}
                </p>
              </div>
            ) : null}

            <section className="action-bar contact-actions">
              <button
                className="btn primary"
                type="submit"
                disabled={!canContinue}
              >
                Continue
              </button>
              <button
                className="link-button"
                type="button"
                onClick={() => setPrivacyOpen(true)}
              >
                Privacy details
              </button>
            </section>
          </form>

          {privacyOpen ? (
            <div
              className="modal-backdrop"
              role="dialog"
              aria-modal="true"
              aria-labelledby="privacy-title"
              onClick={() => setPrivacyOpen(false)}
            >
              <div
                className="modal"
                onClick={(event) => event.stopPropagation()}
              >
                <h2 id="privacy-title">Privacy details</h2>
                <p>
                  Only the contact method you pick is shared. Your results email
                  is never shown.
                </p>
                <button
                  className="btn primary"
                  type="button"
                  onClick={() => setPrivacyOpen(false)}
                >
                  Got it
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : step === 'choices' ? (
        <div className="screen choices-screen">
          <header className="top-bar">
            <img
              src="/playbuddy-logo.png"
              alt="PlayBuddy logo"
              className="logo"
            />
            <div>
              <p className="eyebrow">PlayBuddy Presents</p>
              <h1>Pagan&apos;s kinky speed dating</h1>
            </div>
          </header>

          <section className="number-card">
            <div className="number-label">Your Number</div>
            <div className="number-value">{yourNumber}</div>
            <div className="number-subtext">Use this at the event.</div>
          </section>

          <section className="grid" aria-label="Choices grid">
            <div className="grid-header">
              <div className="grid-spacer">#</div>
              {OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className={`grid-header-cell ${option.className}`}
                >
                  <option.Icon />
                  <span>{option.label}</span>
                </div>
              ))}
            </div>

            <div className="grid-body">
              {ROWS.map((row, index) => (
                <div
                  key={row}
                  className={`grid-row ${
                    index % 2 === 0 ? 'row-even' : 'row-odd'
                  }`}
                  role="radiogroup"
                  aria-labelledby={`row-${row}-label`}
                  style={{ animationDelay: `${120 + index * 18}ms` }}
                >
                  <div id={`row-${row}-label`} className="row-number">
                    {row}
                  </div>
                  {OPTIONS.map((option) => (
                    <label
                      key={`${row}-${option.value}`}
                      className={`option-cell ${option.className} ${
                        choices[row] === option.value ? 'is-selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name={`row-${row}`}
                        value={option.value}
                        checked={choices[row] === option.value}
                        onChange={() => handleSelect(row, option.value)}
                      />
                      <span className="radio" aria-hidden="true" />
                      <span className="sr-only">{option.label}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section className="action-bar">
            <div className="progress">Completed: {completedCount}/20</div>
            <div className="actions">
              <button
                className="btn primary"
                type="button"
                onClick={handleSave}
              >
                Save
              </button>
              <button className="btn ghost" type="button" onClick={handleClear}>
                Clear all
              </button>
            </div>
            <p className="helper-text">
              You must pick one per row (None is allowed).
            </p>
          </section>

        </div>
      ) : (
        <div className="screen confirmation-screen">
          <section className="confirmation-card">
            <h2 className="confirmation-title">
              Your matches will be emailed shortly after the event!
            </h2>
          </section>

          <section className="promo-card">
            <p className="promo-kicker">Get 20% off</p>
            <img
              src="/playbuddy-logo-favicon.jpeg"
              alt="PlayBuddy logo"
              className="promo-logo"
            />
            <p className="promo-text">
              Get 20% off future Pagan&apos;s events.
              <br />
              <strong>Discover NYC&apos;s coolest kink events.</strong>
            </p>
            <button className="btn primary" type="button">
              Download
            </button>
          </section>
        </div>
      )}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="icon">
      <path d="M10 16.6l-1.4-1.3c-3.6-3.2-5.6-5-5.6-7.6 0-2 1.6-3.6 3.7-3.6 1.4 0 2.7.7 3.3 1.8.6-1.1 2-1.8 3.3-1.8 2.1 0 3.7 1.6 3.7 3.6 0 2.6-2 4.4-5.6 7.6L10 16.6z" />
    </svg>
  )
}

function SmileIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="icon">
      <circle cx="10" cy="10" r="7" fill="none" strokeWidth="1.6" />
      <circle cx="7.5" cy="8.5" r="0.8" />
      <circle cx="12.5" cy="8.5" r="0.8" />
      <path
        d="M6.8 11.2c.9 1 2 1.5 3.2 1.5s2.3-.5 3.2-1.5"
        fill="none"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function BothIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="icon">
      <circle cx="8" cy="10" r="5" fill="none" strokeWidth="1.6" />
      <circle cx="12" cy="10" r="5" fill="none" strokeWidth="1.6" />
    </svg>
  )
}

function NoneIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="icon">
      <circle cx="10" cy="10" r="7" fill="none" strokeWidth="1.6" />
      <path d="M6.5 10h7" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export default App
