// only edit /common/config.ts 
// These are copied

export const API_BASE_URL_PROD = 'https://api.playbuddy.me'

export const API_BASE_URL_LOCAL = 'http://192.168.1.104:8080'
export const API_BASE_URL = process.env.NODE_ENV === 'production' ? API_BASE_URL_PROD : API_BASE_URL_LOCAL;

export const API_URL = {
    events: `${API_BASE_URL}/events`,
    // has to be http:// for google calendar to work
    eventsIcal: `http://api.playbuddy.me/events?format=ical`,
    wishlistEventsIcal: `http://api.playbuddy.me/events?format=ical&wishlist=true`,
    kinks: `${API_BASE_URL}/kinks`,
}

export const MISC_URLS = {
    addGoogleCalendar: ({ wishlist, authUserId }: { wishlist?: boolean, authUserId?: string } = {}) => {
        const encodedUrl = encodeURIComponent(wishlist
            ? `${API_URL.wishlistEventsIcal}&authUserId=${authUserId}`
            : API_URL.eventsIcal
        );
        return `https://www.google.com/calendar/render?cid=${encodedUrl}`;
    },
}

export const puppeteerConfig = {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true
}


export const APP_STORE_URL = 'https://playbuddy.me/ios';
export const GOOGLE_PLAY_URL = 'https://playbuddy.me/android';