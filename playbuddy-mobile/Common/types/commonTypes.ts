// only edit /common/commonTypes.ts 
// These are copied

import { UE, UserEventInput } from "./userEventTypes";


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
    image_url: string;
    /**
     * The url of the video (if any)
     */
    video_url?: string;
    /**
     * The url of the event (usually same as the ticket_url)
     */
    event_url: string;
    /**
     * The location/address of the event
     */
    location: string;
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
    price: string;
    /**
     * The description of the event, markdown formatted
     */
    description: string;
    /**
     * The tags of the event
     */
    tags: string[];
    /**
     * The type of the event (event or retreat)
     */
    type: 'event' | 'retreat'
    /**
     * The recurring type of the event (none, weekly, monthly)
     */
    recurring: 'none' | 'weekly' | 'monthly'

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

    vetted?: boolean;

}

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
     * For example, WhatsApp, Eventbrite, Plura, etc
     */
    source_origination_platform?: "WhatsApp" | "organizer_api" | 'acrofestivals' | 'facebook' | 'lu.ma' | 'csv';

    /**
     * The ticketing platform the event is sold on
     * For example, Eventbrite, Plura, Partiful, lu.ma, etc
     */
    source_ticketing_platform?: "Eventbrite" | "Plura" | "Partiful" | "lu.ma";

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
    organizer: Omit<Organizer, 'id'> | { id: string };
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
        organizer_id: string;

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


/**
 * Table: classifications
 * Classification metadata for events.
 */
export interface Classification {
    /** Primary key. Automatically incremented integer. */
    id: number;

    /** References events.id (unique, required). */
    event_id: number;

    /** Event type label (nullable). */
    event_type: string | null;

    /** Comfort level (nullable). */
    comfort_level: string | null;

    /** Experience level (nullable). */
    experience_level: string | null;

    /** Inclusivity info (nullable). */
    inclusivity: string | null;

    /** Consent/safety policies (array of text, nullable). */
    consent_and_safety_policies: string[] | null;

    /** Alcohol/substance policies (array of text, nullable). */
    alcohol_and_substance_policies: string[] | null;

    /** Venue type (nullable). */
    venue_type: string | null;

    /** How interactive the event is (nullable). */
    interactivity_level: string | null;

    /** Dress codes (array of text, nullable). */
    dress_code: string[] | null;

    /** Accessibility features (array of text, nullable). */
    accessibility: string[] | null;

    /** Themes (array of text, nullable). */
    event_themes: string[] | null;

    /** Creation timestamp (defaults to now). */
    created_at: string | null;

    /** Last update timestamp (defaults to now, auto-updated via trigger). */
    updated_at: string | null;
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
}

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
    url: string;

    /** Original ID from external source (nullable). */
    original_id?: string | null;

    /** Array of aliases (nullable). */
    aliases?: string[] | null;

    /** Whether hidden from listings (default false). */
    hidden?: boolean | null;

    /**
     * The promo codes for the event
     * May be event specific or organizer specific
     */
    promo_codes?: PromoCode[]
}

export type CreateOrganizerInput = Omit<Organizer, "id"> | { id: string };

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
    scope: string;

    /** Creation timestamp (defaults to now). */
    created_at: string | null;

    /** Last update timestamp (defaults to now). */
    updated_at: string | null;

    /** Product type (nullable). */
    product_type: string | null;
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

    /** References deep_links.id (nullable). */
    initial_deep_link_id: string | null;
}

export interface DeepLinkEvent {
    event: Event;
    description: string;
    featured_promo_code: PromoCode;
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

    /**
     * An array of promo codes associated with this deep link.
     */
    promo_codes: PromoCode[];

    featured_event: Event;

    featured_promo_code: PromoCode;

    deep_link_events: DeepLinkEvent[]

    campaign_start_date?: string;
    campaign_end_date?: string;
    channel?: string;
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
}


export { UE };