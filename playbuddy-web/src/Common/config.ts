// only edit /common/config.ts 
// These are copied
export const API_BASE_URL = 'https://api.playbuddy.me'

export const API_URL = {
    events: `${API_BASE_URL}/events`,
    eventsIcal: `${API_BASE_URL}/events?format=ical`,
    kinks: `${API_BASE_URL}/kinks`,
}

export const MISC_URLS = {
    addGoogleCalendar: () => {
        const encodedUrl = encodeURIComponent(API_URL.eventsIcal);
        return `https://www.google.com/calendar/render?cid=${encodedUrl}`;
    }
}

export const puppeteerConfig = {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true
}
