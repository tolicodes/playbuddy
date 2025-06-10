export declare const API_BASE_URL_PROD = "https://playbuddy-api-929140353915.us-east1.run.app";
export declare const API_BASE_URL_LOCAL = "http://localhost:8080";
export declare const API_BASE_URL: string;
export declare const API_URL: {
    events: string;
    eventsIcal: string;
    wishlistEventsIcal: string;
    kinks: string;
};
export declare const MISC_URLS: {
    addGoogleCalendar: ({ wishlist, authUserId }?: {
        wishlist?: boolean | undefined;
        authUserId?: string | undefined;
    }) => string;
};
export declare const puppeteerConfig: {
    args: string[];
    headless: boolean;
};
export declare const APP_STORE_URL = "https://playbuddy.me/ios";
export declare const GOOGLE_PLAY_URL = "https://playbuddy.me/android";
export declare const DEEP_LINK_BASE = "https://l.playbuddy.me/";
//# sourceMappingURL=config.d.ts.map