// only edit /common/commonTypes.ts 
// These are copied

import type { UE, UserEventInput } from "./userEventTypes.js";


/**
 * TABLES
 * These are the tables in the database
 * 
 * MAIN
 * - events - events
 * - organizers - organizers, linked to events
 * - location_areas - areas where events are held - for example NYC, Spain
 *
 * USERS
 * - users - list of users
 * 
 * WISHLISTS
 * - event_wishlists - a list of events a user has added to their wishlist/my calendar
 * - swipe_mode_choices - a list of events a user has swiped on (liked or not)
 * 
 * PROMO CODES
 * - promo_codes - promo codes for events. Can be event specific or organizer specific
 * - promo_code_events - links promo codes to events
 * 
 *  COMMUNITIES
 * - communities - list of communities. Communities a public community (for an organizer) or a private community (for example a private WhatsApp group), braod interest group (acro or Kink)
 * - community_curators - admins of a community
 * - community_memberships - if you follow or a join a community
 * - event_communities - is an event a part of a community (ex: Acro or a certain organizer)
 * 
 * BUDDIES
 * - buddies - friends of the user
 * - buddy_lists - lists of buddies. A user can have many buddy lists (friends, rope bunnies, poly circles, etc)
 * - buddy_list_buddies - many to many relationship between buddy_lists and buddies
 * 
 * TRACKING
 * - user_events - tracks all clicks and actions a user has taken on an event
 * 
 * ML
 *  - classifications - metadata on event. Tags to search by. For example, comfort level (beginner, intermediate, advanced), accessibility
 * 
 * OTHER
 * - kinks: kink database
*/


export interface Event extends EventDataSource {
    id: number;
    /**
     * The original id from the source (Eventbrite, Plura, etc)
     */
    original_id?: string;
    /**
     * The name of the event
     */
    name: string;
    /**
     * The start date of the event
     */
    start_date: string;
    /**
     * The end date of the event
     */
    end_date: string;
    /**
     * The url to buy the ticket
     */
    ticket_url: string;
    /**
     * The url of the image/thumbnail/cover image
     */
    image_url?: string;
    /**
     * The url of the video (if any)
     */
    video_url?: string;
    /**
     * The url of the event (usually same as the ticket_url)
     */
    event_url?: string;
    /**
     * The location/address of the event
     */
    location: string;
    /**
     * Neighborhood for the event (e.g. Bushwick, Midtown)
     */
    neighborhood?: string;
    /**
     * The city of the event
     */
    city?: string;
    /**
     * The region of the event
     */
    region?: string;
    /**
     * The country of the event
     */
    country?: string;
    /**
     * The price of the event (freeform text)
     */
    price?: string;
    /**
     * Best-guess ticket price (e.g. "$25")
     */
    short_price?: string | null;
    /**
     * The description of the event, markdown formatted
     */
    description: string;
    /**
     * The tags of the event
     */
    tags?: string[];
    /**
     * Optional event categories (freeform text).
     */
    event_categories?: string | null;
    /**
     * The type of the event (workshop, munch, play_party, festival, conference, retreat; fallback: event; legacy: performance, discussion)
     */
    type: EventTypes;
    /**
     * The recurring type of the event (none, weekly, monthly)
     */
    recurring?: 'none' | 'weekly' | 'monthly'

    /**
     * The latitude of the event
     */
    lat?: number;
    /**
     * The longitude of the event
     */
    lon?: number;

    /**
     * The visibility of the event (public or private)
     * You must be a member of the community to see the event if private
     */
    visibility?: 'public' | 'private';

    /**
     * Approval workflow status
     */
    approval_status?: 'pending' | 'approved' | 'rejected' | null;
    /**
     * Classification workflow status.
     */
    classification_status?: 'queued' | 'auto_classified' | 'admin_classified' | string | null;

    /**
     * True when submitted by end users through in-app submissions.
     */
    user_submitted?: boolean | null;

    /**
     * Whether hidden from listings (default false).
     */
    hidden?: boolean | null;

    /**
     * When true, prevents automated upserts from overwriting this event.
     */
    frozen?: boolean | null;

    // Only shows in facilitator profile
    facilitator_only?: boolean

    /**
     * Foreign keys (when loaded directly from events table).
     */
    organizer_id?: number | null;
    location_area_id?: string | null;

    /**
     * DEPENDENCIES
     */

    /**
     * the organizer record (joined on organizer_id)
     */

    organizer: Organizer;
    /**
     * The location area the event belongs to (joined on location_area_id)
     * A location area is a city, region, country, etc
     */
    location_area?: LocationArea;
    /**
     * The communities the event belongs to (many to many via join table event_communities)
     * For example, a community could be "Acro" or "Conscious Touch"
     */
    communities?: Community[];

    classification?: Classification;

    /**
     * The promo codes for the event
     * May be event specific or organizer specific
     */
    promo_codes?: PromoCode[];

    /**
     * Is this event a weekly pick?
     */
    weekly_pick?: boolean;

    /**
     * This isn't the full description, we just get the one that shows up on top of
     * Eventbrite page and then scrape the full description later
     */
    short_description?: string;

    /**
     * This is our own description of the event
     */
    custom_description?: string;

    /**
     * Is this event a play party?
     */
    play_party?: boolean;


    is_munch?: boolean;
    munch_id?: number;

    vetted?: boolean;
    vetting_url?: string;

    non_ny?: boolean;

    media?: EventMedia[]
    bio?: string;

    hosts?: string[];

    /**
     * Facilitator ids (uuid array).
     */
    facilitators?: string[] | null;
}

export type EventDuplicateMode = 'heuristic' | 'ai' | 'hybrid';

export type EventDuplicateAiResult = {
    decision: 'duplicate' | 'not_duplicate' | 'unsure';
    confidence: number | null;
    rationale?: string | null;
};

export type EventDuplicateCandidate = {
    eventA: Event;
    eventB: Event;
    score: number;
    reasons: string[];
    ai?: EventDuplicateAiResult | null;
};

export type EventDuplicateRequest = {
    startDate?: string;
    endDate?: string;
    maxHoursApart?: number;
    minScore?: number;
    limit?: number;
    mode?: EventDuplicateMode;
    includeHidden?: boolean;
    includePrivate?: boolean;
    includeUnapproved?: boolean;
};

export type EventDuplicateResponse = {
    generatedAt: string;
    totalCandidates: number;
    mode: EventDuplicateMode;
    candidates: EventDuplicateCandidate[];
    warnings?: string[];
};

export type MergeEventRequest = {
    sourceEventId: number;
    targetEventId: number;
    deleteSource?: boolean;
    preferSource?: boolean;
};

export type MergeEventResponse = {
    merged_from: number;
    merged_into: number;
    event: Event;
    warnings?: { table: string; message: string }[];
};

// Scrape job/task tracking
export type ScrapeJobRecord = {
    id: string;
    status: string;
    priority: number;
    total_tasks: number;
    completed_tasks: number;
    failed_tasks: number;
    created_at: string;
    created_by_auth_user_id?: string | null;
    started_at?: string | null;
    finished_at?: string | null;
    source?: string | null;
    mode?: string | null;
    metadata?: any;
    result?: {
        inserted: number;
        updated: number;
        failed: number;
    };
};

export type ScrapeTaskRecord = {
    id: string;
    job_id: string;
    url: string;
    source?: string | null;
    status: string;
    priority: number;
    attempts: number;
    event_id?: number | null;
    result?: {
        inserted?: boolean;
        updated?: boolean;
        failed?: boolean;
        errorMessage?: string;
        insertedIds?: string[];
        updatedIds?: string[];
        failedIds?: string[];
    } | any;
    last_error?: string | null;
    created_at: string;
    started_at?: string | null;
    finished_at?: string | null;
};

export type ScrapeJobWithTasks = ScrapeJobRecord & { tasks: ScrapeTaskRecord[] };

/**
 * Metadata about the source of the event
 * used to override the default values when importing from a source
 * For example, the dataset may be applied to all events from a source
 */
export interface EventDataSource {
    /**
     * Where the event was scraped from
     */
    source_url?: string;
    /**
     * The timestamp the event was scraped
     */
    timestamp_scraped?: string;
    /**
     * The dataset the event was scraped from
     * Group of events that are from the same source with common logic
     */
    dataset?: "Kink" | "Whatsapp POC" | 'Acro' | 'Conscious Touch';

    /**
     * The platform the event was scraped from
     * For example, WhatsApp, gmail, website-ai-discovery, ticketing-eventbrite
     */
    source_origination_platform?:
        | "WhatsApp"
        | "organizer_api"
        | 'acrofestivals'
        | 'facebook'
        | 'lu.ma'
        | 'csv'
        | 'website-ai-discovery'
        | 'gmail'
        | 'user_submitted'
        | 'admin'
        | `ticketing-${string}`;

    /**
     * The ticketing platform the event is sold on
     * For example, Eventbrite, Plura, Partiful, Luma, website, etc
     */
    source_ticketing_platform?:
        | "Eventbrite"
        | "Plura"
        | "Partiful"
        | "Luma"
        | "lu.ma"
        | "Forbidden Tickets"
        | "ForbiddenTickets"
        | "TicketTailor"
        | "DICE"
        | "WithFriends"
        | "Meetup"
        | "ResidentAdvisor"
        | "website"
        | "Unknown";

    /**
     * The group id the event belongs to
     * Usually for WhatsApp groups
     */
    source_origination_group_id?: string;
    /**
     * The group name the event belongs to
     * Usually for WhatsApp groups
     */
    source_origination_group_name?: string;
}

/**
  * A scraper returns this: it's a normalized NormalizedEventInput
  * before community/location dependencies are resolved.
  */
export interface NormalizedEventInput extends Omit<Event, 'id' | 'organizer' | 'location_area' | 'communities' | 'promo_codes'> {
    id?: number;
    organizer: CreateOrganizerInput;
    /**
     * The location area the event belongs to (joined on location_area_id)
     * A location area is a city, region, country, etc
     */
    location_area?: Omit<LocationArea, 'id'> | { id: string };
    /**
     * The communities the event belongs to (many to many via join table event_communities)
     * For example, a community could be "Acro" or "Conscious Touch"
     */
    communities?: Omit<Community, 'id'>[] | { id: string }[];

    /**
     * The promo codes for the event
     * May be event specific or organizer specific
     */
    promo_codes?: Omit<PromoCode, 'id'> | { id: string };

    metadata?: Record<string, unknown>;
}

/**
 * Payload for user-submitted events (manual entry).
 */
export type UserSubmittedEventInput = {
    name: string;
    organizer_name: string;
    organizer_url?: string;
    start_date: string;
    end_date?: string;
    ticket_url?: string;
    event_url?: string;
    image_url?: string;
    location: string;
    city?: string;
    region?: string;
    description: string;
    price?: string;
};

/**
 * ResolvedDependenciesEventInput is the version of an event that is ready
 * to be inserted into the database. It has all dependencies resolved.
 *
 * Scrapers first return `NormalizedEventInput`, which may contain references
 * to external entities (like `organizer`, `location_area`, `communities`) as full objects
 * or partials without an ID.
 *
 * These dependencies must be:
 *  - Upserted: Inserted or updated in the database (e.g. matching on name or original_id)
 *  - Resolved: Their database `id` must be retrieved
 *
 * This type represents the result of that process. All references to dependent entities
 * are now stored by foreign keys (`organizer_id`, `location_area_id`).
 *
 * Communities and promo codes (which are many-to-many relationships) are *not*
 * stored as fields on the event row itself — they are inserted into separate join tables
 * *after* the main event is inserted.
 */
export type ResolvedDependenciesEventInput =
    // Start with everything on the Event type...
    Omit<Event,
        | 'id'                // Will be generated by the database
        | 'organizer'         // Now resolved into organizer_id
        | 'location_area'     // Now resolved into location_area_id
        | 'communities'       // Many-to-many, handled via join table
        | 'promo_codes'       // Many-to-many, handled via join table
    > & {
        /**
         * ID of the resolved organizer (upserted beforehand)
         */
        organizer_id: number;

        /**
         * ID of the resolved location area (upserted beforehand)
         */
        location_area_id: string;
    };


/**
 * Table: buddies
 * Stores buddy relationships between two users.
 */
export interface Buddy {
    /** Primary key. Automatically incremented integer. */
    id: number;

    /** References public.users.user_id or auth.users.id (nullable). */
    auth_user_id: string | null;

    /** References public.users.user_id or auth.users.id (nullable). */
    buddy_auth_user_id: string | null;
}

/**
 * Table: buddy_list_buddies
 * Join table that associates a buddy_list with multiple buddies.
 */
export interface BuddyListBuddy {
    /** Primary key. Automatically incremented integer. */
    id: number;

    /** References buddy_lists.id (nullable). */
    buddy_list_id: number | null;

    /** References buddies.id (nullable). */
    buddy_id: number | null;
}

/**
 * Table: buddy_lists
 * Lists of buddies created by a specific user.
 */
export interface BuddyList {
    /** Primary key. Automatically incremented integer. */
    id: number;

    /** References users.id (nullable). */
    user_id: string | null;

    /** Name of the buddy list (required). */
    name: string;
}


export type Community = {
    id: string;
    name: string;
    code?: string;
    auth_type?: 'code' | 'approval';
    type?: 'interest_group' | 'organizer_public_community' | 'organizer_private_community' | 'private_community';
    organizer_id?: string;
    description?: string;
    visibility?: 'private' | 'public';

    /** Creation timestamp (defaults to now, with time zone). */
    created_at?: string | null;

    /** Community name (required). */

    /** Join code (nullable). */
    join_code?: string | null;
}

export const ACTIVE_EVENT_TYPES = [
    'workshop',
    'munch',
    'play_party',
    'festival',
    'conference',
    'retreat',
] as const;

export const FALLBACK_EVENT_TYPE = 'event' as const;

export const LEGACY_EVENT_TYPES = [
    'performance',
    'discussion',
] as const;

export type ActiveEventType = (typeof ACTIVE_EVENT_TYPES)[number];
export type LegacyEventType = (typeof LEGACY_EVENT_TYPES)[number];

export type EventTypes = ActiveEventType | typeof FALLBACK_EVENT_TYPE | LegacyEventType;

export type ImportMethod = 'chrome_scraper' | 'eb_scraper' | 'ai_scraper' | 'custom_scraper';
export type IdentifierType = 'handle' | 'url';

export interface ImportSource {
    id: string;
    source: string; // e.g., fetlife handle, Eventbrite URL, or raw URL
    method: ImportMethod;
    identifier: string;
    identifier_type?: IdentifierType;
    approval_status?: 'pending' | 'approved' | 'rejected' | null;
    skip_existing?: boolean | null;
    message_sent?: boolean | null;
    is_festival?: boolean | null;
    is_excluded?: boolean | null;
    metadata: Record<string, any>;
    event_defaults: Record<string, any>;
    created_at: string;
    updated_at: string;
}

/**
 * Table: classifications
 * Classification metadata for events.
 */
export interface Classification {
    /** Primary key. Automatically incremented integer. */
    id: number;

    /** References events.id (unique, required). */
    event_id: number;

    comfort_level?: string | null;
    experience_level?: string | null;
    inclusivity?: string[] | null; // queer, bipoc, etc
    consent_and_safety_policies?: string[] | null;
    alcohol_and_substance_policies?: string[] | null;
    venue_type?: string | null;
    interactivity_level?: string | null;
    dress_code?: string | null;
    accessibility?: string[] | null;
    tags?: string[] | null;

    short_description?: string;
    type?: EventTypes;

    non_ny?: boolean;
    location?: string;
    neighborhood?: string;

    hosts?: string[];
    price?: string;
    short_price?: string | null;

    vetted?: boolean;
    vetting_url?: string;

    created_at?: string | null;
    updated_at?: string | null;
}

/**
 * Table: community_curators
 * Many-to-many table: which users are curators of which communities.
 */
export interface CommunityCurator {
    /** References communities.id (primary key part 1). */
    community_id: string;

    /** References users.id (primary key part 2). */
    curator_id: string;
}

/**
 * Table: community_memberships
 * Tracks user membership in communities.
 */
export interface CommunityMembership {
    /** Primary key (UUID). Defaults to gen_random_uuid(). */
    id: string;

    /** References auth.users.id (nullable). */
    auth_user_id: string | null;

    /** References communities.id (nullable). */
    community_id: string | null;

    /**
     * Role of the member (public_member, private_member, or admin).
     * Constrained by community_memberships_role_check.
     */
    role: string | null;

    /**
     * Status of membership (approved, pending, denied).
     * Constrained by community_memberships_status_check.
     */
    status: string | null;

    /**
     * How they joined (public or private).
     * Constrained by community_memberships_join_type_check.
     */
    join_type: string | null;

    /** References users.id (who approved this) (nullable). */
    approved_by: string | null;

    /** Creation timestamp (defaults to now). */
    created_at: string | null;

    /** Last update timestamp (defaults to now). */
    updated_at: string | null;
}

/**
 * Table: event_communities
 * Join table linking events and communities.
 */
export interface EventCommunity {
    /** References events.id (primary key part 1). */
    event_id: number;

    /** References communities.id (primary key part 2). */
    community_id: string;
}

/**
 * Table: event_wishlist
 * Tracks which user has wishlisted which event.
 */
export interface EventWishlist {
    /** Primary key (UUID). Defaults to uuid_generate_v4(). */
    id: string;

    /** References auth.users.id or users.user_id (nullable). */
    user_id: string | null;

    /** References events.id (nullable). */
    event_id: number | null;

    /** Creation timestamp (defaults to current_timestamp). */
    created_at: string | null;
}


/**
 * Table: kinks
 * Stores ideas labeled as 'kinks' (possibly a brainstorming or creative area).
 */
export interface Kink {
    /** Primary key. Automatically incremented integer. */
    id: number;

    /** Unique idea title. */
    idea_title: string;

    /** Level (nullable). */
    level: string | null;

    /** Materials required (nullable). */
    materials_required: string | null;

    /** Description of the idea (nullable). */
    idea_description: string | null;

    /** JSONB categories (nullable). */
    categories: any | null; // Or Record<string, unknown> if you want to be stricter

    /** Recommended flag (default false). */
    recommended: boolean | null;

    /** Current status (nullable). */
    status: string | null;

    /** Priority label (nullable). */
    to_do_priority: string | null;

    /** Timestamp with time zone (defaults to now). */
    created_at: string | null;

    /** Timestamp with time zone (defaults to now). */
    updated_at: string | null;
}

/**
 * Table: location_areas
 * Stores location information (city, region, country, etc.).
 */
export interface LocationArea {
    /** Primary key (UUID), defaults to uuid_generate_v4(). */
    id: string;

    /** Name of the location (required). */
    name: string;

    /** Short code or abbreviation (nullable). */
    code: string | null;

    /** City name (nullable). */
    city: string | null;

    /** Region name (nullable). */
    region: string | null;

    /** Country name (nullable). */
    country: string | null;

    /** The type of entity (e.g. city, region, venue) (nullable). */
    entity_type: string | null;

    /** Array of text aliases (nullable). */
    aliases: string[] | null;

    /** IANA timezone (nullable). */
    timezone: string | null;

    /** Whether this location area is shown in onboarding. */
    shown: boolean;
}

export type CreateLocationAreaInput = {
    name: string;
    code?: string | null;
    city?: string | null;
    region?: string | null;
    country?: string | null;
    entity_type?: string | null;
    aliases?: string[] | null;
    timezone?: string | null;
    shown?: boolean | null;
};

export type UpdateLocationAreaInput = CreateLocationAreaInput & {
    id: string;
};

/**
 * Table: organizers
 * Stores organizer information for events.
 */
export interface Organizer {
    /** Primary key. Automatically incremented integer. */
    id: number;

    /** Organizer name (unique, required). */
    name: string;

    /** Organizer URL (required). */
    url?: string;

    /** Original ID from external source (nullable). */
    original_id?: string | null;

    /** Array of aliases (nullable). */
    aliases?: string[] | null;

    /** Whether hidden from listings (default false). */
    hidden?: boolean | null;

    /** Organizer bio (nullable). */
    bio?: string | null;

    /** 
     * The promo codes for the event
     * May be event specific or organizer specific
     */
    promo_codes?: PromoCode[]

    instagram_handle?: string;
    fetlife_handle?: string;
    fetlife_handles?: string[] | null;

    membership_app_url?: string | null;
    membership_only?: boolean | null;

    vetted?: boolean | null;
    vetted_instructions?: string | null;
}

export type CreateOrganizerInput = {
    id?: number;
    name?: string;
    url?: string;
    original_id?: string;
    aliases?: string[];
    hidden?: boolean;
    fetlife_handle?: string;
    fetlife_handles?: string[];
    instagram_handle?: string;
    vetted?: boolean;
    vetted_instructions?: string;
}

/**
 * Table: promo_code_event
 * Many-to-many table linking promo codes to events.
 */
export interface PromoCodeEvent {
    /** Creation timestamp (defaults to now). */
    created_at: string;

    /** References events.id (nullable). */
    event_id: number | null;

    /** References promo_codes.id (UUID) (nullable). */
    promo_code_id: string | null;

    /** Primary key (UUID). Defaults to gen_random_uuid(). */
    id: string;
}

/**
 * Table: promo_codes
 * Stores discount or promotional codes for events.
 */
export interface PromoCode {
    /** Primary key (UUID). Defaults to gen_random_uuid(). */
    id: string;

    /** References organizers.id (nullable). */
    organizer_id: number | null;

    /** Actual promo code string (required). */
    promo_code: string;

    /** Discount value (numeric(6,2), must be >= 0). */
    discount: number;

    /**
     * Discount type (percent or fixed).
     * Constrained by promo_codes_discount_type_check.
     */
    discount_type: string;

    /**
     * Scope of this code (organizer or event).
     * Constrained by promo_codes_scope_check.
     */
    scope?: string;

    /** Commission percentage (percent, e.g. 10.0 for 10%). */
    commission_percentage: number | null;

    /** Creation timestamp (defaults to now). */
    created_at: string | null;

    /** Last update timestamp (defaults to now). */
    updated_at: string | null;

    /** Product type (nullable). */
    product_type: string | null;
}

/**
 * Table: promo_code_redemptions
 * Stores redemption stats for promo codes.
 */
export interface PromoCodeRedemption {
    /** Primary key (UUID). Defaults to gen_random_uuid(). */
    id: string;

    /** References promo_codes.id (UUID). */
    promo_code_id: string;

    /** Date/time of redemption. */
    redemption_date: string;

    /** Gross amount at redemption time (numeric). */
    gross_amount: number;

    /** Commission percentage snapshot. */
    commission_percentage: number;

    /** Commission amount snapshot (numeric). */
    commission_amount: number;

    /** Creation timestamp (defaults to now). */
    created_at: string | null;
}

export interface CreatePromoCodeRedemptionInput {
    promo_code_id: string;
    redemption_date: string;
    gross_amount: number;
    commission_percentage?: number | null;
    commission_amount?: number | null;
}

export interface PromoCodeRedemptionImportRow {
    promo_code_id?: string | null;
    promo_code?: string | null;
    date?: string | null;
    redemption_date?: string | null;
    gross_amount?: number | string | null;
    commission_percentage?: number | string | null;
    commission_amount?: number | string | null;
}

export interface PromoCodeRedemptionImportRequest {
    promo_code_id?: string | null;
    promo_code?: string | null;
    organizer_id?: number | null;
    organizer_name?: string | null;
    source?: string | null;
    rows: PromoCodeRedemptionImportRow[];
}

export interface PromoCodeRedemptionImportResult {
    inserted_count: number;
    skipped_count: number;
    promo_code_ids?: string[];
    errors?: Array<{
        index: number;
        message: string;
    }>;
}

export interface PromoCodeRedemptionSummary {
    promo_code_id: string;
    redemption_count: number;
}

export interface PromoCodeRedemptionQuarter {
    quarter: string;
    start_date: string;
    end_date: string;
    redemption_count: number;
    gross_total: number;
    commission_total: number;
}

export interface PromoCodeRedemptionSeriesPoint {
    date: string;
    redemption_count: number;
    gross_total: number;
    commission_total: number;
}

export interface PromoCodeRedemptionStats {
    promo_code_id: string;
    totals: {
        redemption_count: number;
        gross_total: number;
        commission_total: number;
        avg_gross: number;
        avg_commission: number;
    };
    quarters: PromoCodeRedemptionQuarter[];
    series: {
        last_30_days: PromoCodeRedemptionSeriesPoint[];
        last_3_months: PromoCodeRedemptionSeriesPoint[];
        all_time: PromoCodeRedemptionSeriesPoint[];
    };
}

export interface CreatePromoCodeInput {
    /** References organizers.id (nullable). */
    organizer_id: number;
    /** Actual promo code string (required). */
    promo_code: string;

    /** Discount value (numeric(6,2), must be >= 0). */
    discount: number;

    /**
     * Discount type (percent or fixed).
     * Constrained by promo_codes_discount_type_check.
     */
    discount_type: string;

    /**
     * Scope of this code (organizer or event).
     * Constrained by promo_codes_scope_check.
     */
    scope?: string;

    /** Commission percentage (percent, e.g. 10.0 for 10%). */
    commission_percentage: number;

}

export interface UpdatePromoCodeInput {

    id: string;

    organizer_id: number;

    /** Actual promo code string (required). */
    promo_code: string;

    /** Discount value (numeric(6,2), must be >= 0). */
    discount: number;

    /**
     * Discount type (percent or fixed).
     * Constrained by promo_codes_discount_type_check.
     */
    discount_type: string;

    /**
     * Scope of this code (organizer or event).
     * Constrained by promo_codes_scope_check.
     */
    scope?: string;

    /** Commission percentage (percent, e.g. 10.0 for 10%). */
    commission_percentage: number;

}

/**
 * Table: swipe_mode_choices
 * Tracks user "wishlist" or "skip" interactions for an event (in swipe mode).
 */
export interface SwipeModeChoice {
    /** References events.id, required. */
    event_id: number;

    /** References auth.users.id, required. */
    user_id: string;

    /** Choice ("wishlist" or "skip"). */
    choice: 'wishlist' | 'skip';

    /** List name (default "main"). */
    list: string | null;

    /** Timestamp without time zone (defaults to now). */
    created_at: string | null;

    /** Primary key (UUID). Defaults to gen_random_uuid(). */
    id: string;
}

/**
 * Table: user_events
 * Stores arbitrary user events (like analytics or logs).
 */
export type UserEvent = UserEventInput & {
    /** Primary key (bigint) with BY DEFAULT identity. */
    id: number;

    /** Creation timestamp (with time zone, defaults to now). */
    created_at: string;

    /** References users.user_id (nullable). */
    auth_user_id: string | null;

    /** Device identifier (nullable). */
    device_id: string | null;
}


/**
 * Table: users
 * Stores application user profiles, linked to auth.users.
 */
export interface Users {
    /** Primary key (UUID). Defaults to uuid_generate_v4(). */
    id: string;

    /** References auth.users.id (unique, nullable). */
    user_id: string | null;

    /** Share code (nullable). */
    share_code: string | null;

    /** Creation timestamp (defaults to now). */
    created_at: string | null;

    /** Display name (nullable). */
    name: string | null;

    /** URL for user avatar (nullable). */
    avatar_url: string | null;

    /** References location_areas.id (nullable). */
    selected_location_area_id: string | null;

    /** References communities.id (nullable). */
    selected_community_id: string | null;

    /** Consent to share calendar with other users (defaults to false). */
    share_calendar: boolean | null;

    /** Consent to receive the newsletter (defaults to false). */
    joined_newsletter: boolean | null;

    /** References deep_links.id (nullable). */
    initial_deep_link_id: string | null;

    /** User role (nullable). */
    role?: string | null;
}

export interface DeepLinkEvent {
    event: Event;
    description: string;
    featured_promo_code: PromoCode;
}

export interface DeepLinkEventRecord {
    deep_link_id: string;
    event_id: number;
    featured_promo_code_id?: string | null;
    description?: string | null;
}

export interface DeepLinkPromoCode {
    id: string;
    deep_link_id: string;
    promo_code_id: string;
}

export interface DeepLinkBranchStats {
    id?: number;
    deep_link_id?: string | null;
    range_start_date?: string | null;
    range_end_date?: string | null;
    range_label?: string | null;
    range_days?: number | null;
    generated_at?: string | null;
    overall_clicks?: number | null;
    ios_link_clicks?: number | null;
    ios_install?: number | null;
    ios_reopen?: number | null;
    android_link_clicks?: number | null;
    android_install?: number | null;
    android_reopen?: number | null;
    desktop_link_clicks?: number | null;
    desktop_texts_sent?: number | null;
    desktop_ios_install?: number | null;
    desktop_ios_reopen?: number | null;
    desktop_android_install?: number | null;
    desktop_android_reopen?: number | null;
    source_url?: string | null;
    source_name?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

/**
 * Represents a single deep link record.
 */
export interface DeepLink {
    /** Primary key (UUID) */
    id: string;

    /** The user-facing slug or short code (e.g. "everyday") */
    name: string;
    /** Timestamp of creation (defaults to now) */
    created_at: string;

    /** Optional reference to an organizer (integer) */
    organizer: Organizer;

    /** Optional reference to a community (UUID) */
    community: Community;

    /** Campaign or metadata about this link (optional) */
    campaign?: string;

    /** The user-facing slug or short code (e.g. "everyday") */
    slug?: string;

    /** 
     * Type of deep link, e.g. "organizer_promo_code". 
     * Include this if your table stores it, otherwise omit.
     */
    type?: string;

    organizer_id?: number | null;
    community_id?: string | null;
    featured_event_id?: number | null;
    featured_promo_code_id?: string | null;
    status?: string | null;
    initialized_on?: string | null;
    print_run_id?: number | null;
    marketing_assignee_id?: number | null;
    print_run_asset_number?: number | null;
    facilitator_id?: string | null;

    /**
     * An array of promo codes associated with this deep link.
     */
    promo_codes: PromoCode[];

    featured_event: Event;

    featured_promo_code: PromoCode;

    deep_link_events: DeepLinkEvent[]

    branch_stats?: DeepLinkBranchStats | null;

    facilitatorId?: string;        // from facilitator_id

    campaign_start_date?: string;
    campaign_end_date?: string;
    channel?: string;

    printRunId?: number;           // from print_run_id
    marketingAssigneeId?: number;  // from marketing_assignee_id

    printRunAssetNumber?: number;  // from print_run_asset_number
}

export interface DeepLinkInput {
    id?: string;
    name?: string;
    campaign?: string;
    slug?: string;
    type?: string;
    organizer_id?: number;
    community_id?: string;
    featured_event_id?: number;
    featured_promo_code_id?: string;
    status?: string;
    initialized_on?: string;
    featured_event?: Event;
    featured_promo_code?: string;
    facilitator_id?: string;
    campaign_start_date?: string;
    campaign_end_date?: string;
    channel?: string;
    print_run_id?: number;
    marketing_assignee_id?: number;
    print_run_asset_number?: number;
}

export interface UserDeepLink {
    id: string;
    created_at: string;
    auth_user_id?: string | null;
    deep_link_id?: string | null;
    claimed_on?: string | null;
}

export type EventPopupStatus = 'draft' | 'published' | 'stopped';

export interface EventPopup {
    id: string;
    event_id?: number | null;
    title: string;
    body_markdown: string;
    status: EventPopupStatus;
    created_at: string;
    updated_at?: string | null;
    published_at?: string | null;
    expires_at?: string | null;
    stopped_at?: string | null;
    event?: Event;
}

export interface EventPopupInput {
    id?: string;
    event_id?: number | null;
    title: string;
    body_markdown: string;
    status?: EventPopupStatus;
    published_at?: string | null;
    expires_at?: string | null;
}

export type PushNotificationStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'canceled';

export interface PushNotification {
    id: string;
    event_id?: number | null;
    title: string;
    body: string;
    image_url?: string | null;
    status: PushNotificationStatus;
    send_at?: string | null;
    sent_at?: string | null;
    sent_count?: number | null;
    failed_count?: number | null;
    last_error?: string | null;
    created_by_auth_user_id?: string | null;
    created_at: string;
    updated_at?: string | null;
}

export interface PushNotificationInput {
    id?: string;
    event_id?: number | null;
    title: string;
    body: string;
    image_url?: string | null;
    status?: PushNotificationStatus;
    send_at?: string | null;
}

export interface PushToken {
    id: string;
    auth_user_id?: string | null;
    token: string;
    device_id?: string | null;
    platform?: string | null;
    created_at: string;
    updated_at?: string | null;
    last_seen_at?: string | null;
    disabled_at?: string | null;
    disable_reason?: string | null;
}

export interface PushTokenInput {
    token: string;
    device_id?: string | null;
    platform?: string | null;
}

export interface MarketingAssignee {
    id: number;
    name: string | null;
    role: string | null;
    created_at?: string | null;
    createdAt?: string | null;
}

export interface PrintRun {
    id: number;
    marketing_assignee_id?: number | null;
    start_number?: number | null;
    count?: number | null;
    media_type?: string | null;
    version?: string | null;
    qr_x?: number | null;
    qr_y?: number | null;
    qr_width?: number | null;
    qr_height?: number | null;
    created_at?: string | null;
    updated_at?: string | null;

    marketingAssigneeId?: number | null;
    startNumber?: number | null;
    mediaType?: 'business_card' | null;
    qrX?: number | null;
    qrY?: number | null;
    qrWidth?: number | null;
    qrHeight?: number | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}


export interface Munch {
    id: number;
    title: string;
    location: string;
    hosts: string;
    ig_handle: string;
    cadence: string;
    schedule_text: string;
    cost_of_entry: string;
    age_restriction: string;
    open_to_everyone: string;
    main_audience: string;
    status: string;
    notes: string;
    verified: boolean | null;
    tags: string[];
    website: string;
    fetlife_handle: string;
    organizer_id: number
}

export interface Media {
    id: string; // UUID
    auth_user_id?: string | null; // UUID, FK to users.user_id
    title: string | null;
    description: string | null;
    type: 'video' | 'image';
    storage_path: string;
    is_explicit: boolean;
    is_public: boolean;
    created_at: string; // ISO timestamp
    thumbnail_url?: string | null;
}


// Tag used by facilitators
export interface Tag {
    id: string;        // UUID
    name: string;
    entity: string;    // e.g. 'facilitator'
    type?: string | null;      // e.g. 'specialty'
}

// A media item (image or video) in the facilitator’s carousel
export interface FacilitatorMedia extends Media {
    id: string;             // UUID
    facilitator_id: string; // UUID
    sort_order: number;
    created_at: string;     // ISO timestamp
}

export interface FacilitatorMediaLink {
    id: string;
    facilitator_id: string;
    sort_order: number;
    created_at: string;
    media_id?: string | null;
}

export interface EventMedia extends Media {
    id: string; // UUID
    sort_order: number;
    event_id: number;
    created_at: string;     // ISO timestamp

};

export interface EventMediaLink {
    id: string;
    media_id: string;
    sort_order?: number | null;
    event_id: number;
    created_at?: string | null;
}


// Main Facilitator record, matching the updated schema
export interface Facilitator {
    id: string;                      // UUID
    name: string;
    bio?: string | null;
    profile_image_url?: string | null;
    intro_video_url?: string | null;
    instagram_handle?: string | null;
    fetlife_handle?: string | null;
    email?: string | null;
    location?: string | null;
    verified?: boolean;
    tags?: Tag[];
    media?: FacilitatorMedia[];
    event_ids: number[];
    follower_ids: string[];
    created_at: string;              // ISO timestamp
    updated_at: string;              // ISO timestamp
    is_following?: boolean;
    title?: string;
    website?: string;
    organizer_id?: number;
}

export interface FacilitatorAlias {
    id: string;
    facilitator_id: string;
    alias: string;
}

export interface FacilitatorEvent {
    facilitator_id: string;
    event_id: number;
}

export interface FacilitatorFollower {
    facilitator_id: string;
    auth_user_id: string;
    followed_at: string;
}

export interface FacilitatorNotification {
    facilitator_id: string;
    auth_user_id: string;
    subscribed: boolean;
    created_at: string;
}

export interface FacilitatorTag {
    facilitator_id: string;
    tag_id: string;
}

export type CreateFacilitatorInput = Omit<
    Facilitator,
    'id'
    | 'media'
    | 'events'
    | 'follower_count'
    | 'created_at'
    | 'updated_at'
    | 'tags'
    | 'event_ids'
    | 'follower_ids'
>;

export type UpdateFacilitatorInput = CreateFacilitatorInput & {
    id: string;
}

export type Attendee = {
    id: string;
    name: string;
    avatar_url: string;
}

export type EventAttendees = {
    event_id: number;
    attendees: Attendee[];
}

export const FOLLOWEE_TYPES = ['organizer', 'facilitator', 'event', 'munch'] as const;
export type FolloweeType = (typeof FOLLOWEE_TYPES)[number];

export type FollowDBRow = {
    id: string;
    auth_user_id: string;
    followee_type: FolloweeType
    followee_id: string;
    created_at: string;
}

export type Follow = {
    followee_type: FolloweeType
    followee_id: string;
}

export interface FollowPayload {
    followee_type: FolloweeType;
    followee_id: string;
}


export interface FestivalScheduleEvent {
    startDate: string;
    endDate: string;
    name: string;
    location: string;
    organizers: string[];
    description?: string;
}

export type TestType = {
    id: string;
    note?: string;
}

export type { UE };
