// only edit /common/commonTypes.ts 
// These are copied

export type Organizer = {
    id: string;
    original_id?: string;
    name: string;
    url: string;
    hidden?: boolean
    promo_codes: PromoCode[];
}

export type LocationArea = {
    id: string;
    name: string;
    code: string;
    city: string;
    region: string;
    country: string;
    aliases: string[];
    entity_type: string;
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
}

export interface PromoCode {
    id: string;
    promo_code: string;
    discount: number;
    discount_type: 'percent' | 'fixed';
    scope: 'event' | 'organizer';
    organizer_id?: string;
    event_id?: string;
}

export interface Event extends SourceMetadata {
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
     * The visibility of the event (public or private)
     * You must be a member of the community to see the event if private
     */
    visibility?: 'public' | 'private';

    /**
     * The promo codes for the event
     * May be event specific or organizer specific
     */
    promo_codes?: PromoCode[];

}

/**
 * Metadata about the source of the event
 * used to override the default values when importing from a source
 * For example, the dataset may be applied to all events from a source
 */
export interface SourceMetadata {
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
    source_origination_platform?: "WhatsApp" | "organizer_api" | 'acrofestivals' | 'facebook' | 'lu.ma';

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



    /**
     * CREATE NEW RECORD IMPORTS
     * These are used to create other entities when importing from a source
     * For example we can create a new organizer or specify an existing one
     */

    /**
     * The communities the event belongs to
     * For example, the communities for a certain WhatsApp group (Youtopia or Conscious Touch)
     */
    communities?: {
        id: string;
    }[];

    type?: 'event' | 'retreat'

    promo_codes?: PromoCode[];

}

// Metadata for a list of events
interface EventMetadata extends SourceMetadata {
    id: string;
}

export type EventsMetadata = EventMetadata[];


// either pass an id or inputs to create a new one
export type CreateOrganizerInput = { original_id?: string; name: string; url: string } | { id: string }


export type CreateLocationAreaInput = { code: string; name?: string } | { id: string }
export type CreateCommunityInput = { name?: string; code: string } | { id: string }

// We don't want to include id in the create input
export type CreateEventInput = Omit<Event,
    "id" | "organizer" | "location_area" | "communities"
> & {
    organizer: CreateOrganizerInput;
    location_area?: CreateLocationAreaInput;
    communities?: CreateCommunityInput[];
    metadata?: any;
} & SourceMetadata


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
 * 
 * 
*/
