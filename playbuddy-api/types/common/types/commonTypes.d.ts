import { UE, UserEventInput } from "./userEventTypes";
export interface Event extends EventDataSource {
    id: number;
    original_id?: string;
    name: string;
    start_date: string;
    end_date: string;
    ticket_url: string;
    image_url: string;
    video_url?: string;
    event_url: string;
    location: string;
    city?: string;
    region?: string;
    country?: string;
    price: string;
    description: string;
    tags: string[];
    type: 'event' | 'retreat';
    recurring: 'none' | 'weekly' | 'monthly';
    lat?: number;
    lon?: number;
    visibility?: 'public' | 'private';
    organizer: Organizer;
    location_area?: LocationArea;
    communities?: Community[];
    promo_codes?: PromoCode[];
    weekly_pick?: boolean;
    short_description?: string;
    custom_description?: string;
    play_party?: boolean;
    vetted?: boolean;
}
export interface EventDataSource {
    source_url?: string;
    timestamp_scraped?: string;
    dataset?: "Kink" | "Whatsapp POC" | 'Acro' | 'Conscious Touch';
    source_origination_platform?: "WhatsApp" | "organizer_api" | 'acrofestivals' | 'facebook' | 'lu.ma' | 'csv';
    source_ticketing_platform?: "Eventbrite" | "Plura" | "Partiful" | "lu.ma";
    source_origination_group_id?: string;
    source_origination_group_name?: string;
}
export interface NormalizedEventInput extends Omit<Event, 'id' | 'organizer' | 'location_area' | 'communities' | 'promo_codes'> {
    organizer: Omit<Organizer, 'id'> | {
        id: string;
    };
    location_area?: Omit<LocationArea, 'id'> | {
        id: string;
    };
    communities?: Omit<Community, 'id'>[] | {
        id: string;
    }[];
    promo_codes?: Omit<PromoCode, 'id'> | {
        id: string;
    };
    metadata?: Record<string, unknown>;
}
export type ResolvedDependenciesEventInput = Omit<Event, 'id' | 'organizer' | 'location_area' | 'communities' | 'promo_codes'> & {
    organizer_id: string;
    location_area_id: string;
};
export interface Buddy {
    id: number;
    auth_user_id: string | null;
    buddy_auth_user_id: string | null;
}
export interface BuddyListBuddy {
    id: number;
    buddy_list_id: number | null;
    buddy_id: number | null;
}
export interface BuddyList {
    id: number;
    user_id: string | null;
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
    created_at?: string | null;
    join_code?: string | null;
};
export interface Classification {
    id: number;
    event_id: number;
    event_type: string | null;
    comfort_level: string | null;
    experience_level: string | null;
    inclusivity: string | null;
    consent_and_safety_policies: string[] | null;
    alcohol_and_substance_policies: string[] | null;
    venue_type: string | null;
    interactivity_level: string | null;
    dress_code: string[] | null;
    accessibility: string[] | null;
    event_themes: string[] | null;
    created_at: string | null;
    updated_at: string | null;
}
export interface CommunityCurator {
    community_id: string;
    curator_id: string;
}
export interface CommunityMembership {
    id: string;
    auth_user_id: string | null;
    community_id: string | null;
    role: string | null;
    status: string | null;
    join_type: string | null;
    approved_by: string | null;
    created_at: string | null;
    updated_at: string | null;
}
export interface EventCommunity {
    event_id: number;
    community_id: string;
}
export interface EventWishlist {
    id: string;
    user_id: string | null;
    event_id: number | null;
    created_at: string | null;
}
export interface Kink {
    id: number;
    idea_title: string;
    level: string | null;
    materials_required: string | null;
    idea_description: string | null;
    categories: any | null;
    recommended: boolean | null;
    status: string | null;
    to_do_priority: string | null;
    created_at: string | null;
    updated_at: string | null;
}
export interface LocationArea {
    id: string;
    name: string;
    code: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
    entity_type: string | null;
    aliases: string[] | null;
}
export interface Organizer {
    id: number;
    name: string;
    url: string;
    original_id?: string | null;
    aliases?: string[] | null;
    hidden?: boolean | null;
    promo_codes?: PromoCode[];
}
export type CreateOrganizerInput = Omit<Organizer, "id"> | {
    id: string;
};
export interface PromoCodeEvent {
    created_at: string;
    event_id: number | null;
    promo_code_id: string | null;
    id: string;
}
export interface PromoCode {
    id: string;
    organizer_id: number | null;
    promo_code: string;
    discount: number;
    discount_type: string;
    scope: string;
    created_at: string | null;
    updated_at: string | null;
    product_type: string | null;
}
export interface SwipeModeChoice {
    event_id: number;
    user_id: string;
    choice: 'wishlist' | 'skip';
    list: string | null;
    created_at: string | null;
    id: string;
}
export type UserEvent = UserEventInput & {
    id: number;
    created_at: string;
    auth_user_id: string | null;
};
export interface Users {
    id: string;
    user_id: string | null;
    share_code: string | null;
    created_at: string | null;
    name: string | null;
    avatar_url: string | null;
    selected_location_area_id: string | null;
    selected_community_id: string | null;
    initial_deep_link_id: string | null;
}
export interface DeepLinkEvent {
    event: Event;
    description: string;
    featured_promo_code: PromoCode;
}
export interface DeepLink {
    id: string;
    name: string;
    created_at: string;
    organizer: Organizer;
    community: Community;
    campaign?: string;
    slug?: string;
    type?: string;
    promo_codes: PromoCode[];
    featured_event: Event;
    featured_promo_code: PromoCode;
    deep_link_events: DeepLinkEvent[];
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
    verified: string;
}
export interface Tag {
    id: string;
    name: string;
    entity: string;
    type?: string;
}
export interface FacilitatorMedia {
    id: string;
    facilitator_id: string;
    type: 'image' | 'video';
    url: string;
    sort_order: number;
    created_at: string;
}
export interface Facilitator {
    id: string;
    name: string;
    bio: string | null;
    profile_image_url: string | null;
    intro_video_url?: string | null;
    instagram_handle: string | null;
    fetlife_handle: string | null;
    location: string | null;
    verified: boolean;
    tags: Tag[];
    media: FacilitatorMedia[];
    event_ids: number[];
    follower_ids: string[];
    created_at: string;
    updated_at: string;
    is_following?: boolean;
}
export type CreateFacilitatorInput = Omit<Facilitator, 'id' | 'media' | 'events' | 'follower_count' | 'created_at' | 'updated_at' | 'tags' | 'event_ids' | 'follower_ids'>;
export type UpdateFacilitatorInput = CreateFacilitatorInput & {
    id: string;
};
export { UE };
//# sourceMappingURL=commonTypes.d.ts.map