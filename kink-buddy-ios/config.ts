export const API_BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://api.kinkbuddy.org'
    : 'http://localhost:8080';


export const EVENTS_API_URL = 'https://api.kinkbuddy.org/events'
export const EVENTS_ICAL_URL = 'http://api.kinkbuddy.org/events?format=ical'

export const puppeteerConfig = {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true
}
