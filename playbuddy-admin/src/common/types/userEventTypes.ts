// userEvents.ts

/**
 * Consolidated User-Event definitions
 *
 * 1) UE enum lists every event name once.
 * 2) EventPayloadMap maps names to their payload types (or null).
 * 3) UERecord<E> builds { user_event_name, user_event_props }.
 * 4) AllUserEventInput is the union of all events.
 * 5) UserEventName is the union of event-name literals.
 */

/**
 * 1) Single source of truth for all event names
 */
export const UE = {
    // Account Details
    AccountDetailsPressAddBuddy: 'account_details_press_add_buddy',
    AccountDetailsPressDeleteAccount: 'account_details_press_delete_account',
    AccountDetailsPressHome: 'account_details_press_home',
    AccountDetailsPressShareCode: 'account_details_press_share_code',
    AccountDetailsPressSignOut: 'account_details_press_sign_out',

    // Auth Flow
    LoginBannerClicked: 'login_banner_clicked',
    LoginButtonClicked: 'login_button_clicked',

    // Avatar
    AvatarPressPickImage: 'avatar_press_pick_image',
    AvatarUploadCompleted: 'avatar_upload_completed',
    AvatarUploadFailed: 'avatar_upload_failed',
    AvatarUploadStarted: 'avatar_upload_started',

    // Buddy / Calendar
    BuddyAvatarCarouselPress: 'buddy_avatar_carousel_press',
    CalendarDayClicked: 'calendar_day_clicked',

    // Community Events / Lists
    CommunityEventsCommunityJoined: 'community_events_community_joined',
    CommunityListCommunityJoined: 'community_list_community_joined',
    CommunityListCommunityLeft: 'community_list_community_left',
    CommunityListNavigateToCommunityEvents: 'community_list_navigate_to_community_events',
    CommunityListNavigateToJoinCommunityButtonPressed: 'community_list_navigate_to_join_community_button_pressed',

    // Deep-Link Lifecycle
    DeepLinkAttributed: 'deep_link_attributed',
    DeepLinkDetected: 'deep_link_detected',

    // Defaults-Menu
    DefaultsMenuCommunityItemSelected: 'defaults_menu_community_item_selected',
    DefaultsMenuLocationItemSelected: 'defaults_menu_location_item_selected',

    // Event-Detail & Tickets Flow
    EventDetailDeepLinkPromoCodeSeen: 'event_detail_deep_link_promo_code_seen',
    EventDetailDiscountModalOpened: 'event_detail_discount_modal_opened',
    EventDetailGetTicketsClicked: 'event_detail_get_tickets_clicked',
    EventDetailGoogleCalendarClicked: 'event_detail_google_calendar_clicked',
    EventDetailLinkClicked: 'event_detail_link_clicked',
    EventDetailModalTicketPressed: 'event_detail_modal_ticket_pressed',
    EventDetailOrganizerClicked: 'event_detail_organizer_clicked',
    EventDetailPromoCodeCopied: 'event_detail_promo_code_copied',
    EventDetailPromoCodeSeen: 'event_detail_promo_code_seen',
    EventDetailTicketPressed: 'event_detail_ticket_pressed',
    EventDetailWishlistToggled: 'event_detail_wishlist_toggled',
    EventDetailTicketPromoModalPromoCopied: 'event_detail_ticket_promo_modal_promo_code_copied',
    EventDetailHeaderTitleClicked: 'event_detail_header_title_clicked',

    // Event-List
    EventListItemClicked: 'event_list_item_clicked',
    EventListItemDiscountModalOpened: 'event_list_item_discount_modal_opened',
    EventListItemTicketPressed: 'event_list_item_ticket_pressed',
    EventListItemWishlistToggled: 'event_list_item_wishlist_toggled',
    EventListItemSharePressed: 'event_list_item_share_pressed',
    EventListItemPromoModalTicketPressed: 'event_list_item_promo_modal_ticket_pressed',
    EventListItemPromoModalPromoCopied: 'event_list_item_promo_modal_promo_code_copied',
    // Filters & Header
    FilterDoneButtonClicked: 'filter_done_button_clicked',
    FilterOrganizers: 'filter_organizers',
    FilterResetButtonClicked: 'filter_reset_button_clicked',
    HeaderBackButtonClicked: 'header_back_button_clicked',
    HeaderDrawerButtonClicked: 'header_drawer_button_clicked',
    HeaderFilterButtonClicked: 'header_filter_button_clicked',

    // Moar
    MoarGetAddYourEventsLink: 'moar_get_add_your_events_link',
    MoarGetGoogleCalLink: 'moar_get_google_cal_link',
    MoarGetInTouchClickEmail: 'moar_get_in_touch_click_email',
    MoarLinkClicked: 'moar_link_clicked',

    // My Calendar
    MyCalendarShareWishlistClick: 'my_calendar_share_wishlist_click',
    PersonalizationModalConfirmed: 'personalization_modal_confirmed',

    // Onboarding & Misc
    ProfileInitialDeepLinkAssigned: 'profile_initial_deep_link_assigned',

    ProfileDetailsPressSave: 'profile_details_press_save',
    WelcomeScreenRegisterClicked: 'welcome_screen_register_clicked',
    WelcomeScreenSkipped: 'welcome_screen_skipped',

    // Promo Screen
    PromoScreenViewed: 'promo_screen_viewed',
    PromoScreenPromoCodeCopied: 'promo_screen_promo_code_copied',
    PromoScreenExploreClicked: 'promo_screen_explore_clicked',
    PromoScreenEventDetailsClicked: 'promo_screen_event_details_clicked',

    // Swipe Mode
    SwipeModeMoreInfoClick: 'swipe_mode_more_info_click',
    SwipeModeSwipeLeft: 'swipe_mode_swipe_left',
    SwipeModeSwipeRight: 'swipe_mode_swipe_right',

    AttendeeAvatarCarouselPress: 'attendee_avatar_carousel_press',
}

export type UE = (typeof UE)[keyof typeof UE];


type EventDetailsProps = {
    auth_user_id: string | null;
    event_id: number;
    promo_code_id?: string;
    deep_link_id?: string;
}

/**
 * 2) Map event names to their payload shapes (or null for no props)
 */
export interface EventPayloadMap {
    // Account Details
    [UE.AccountDetailsPressAddBuddy]: null;
    [UE.AccountDetailsPressDeleteAccount]: null;
    [UE.AccountDetailsPressHome]: null;
    [UE.AccountDetailsPressShareCode]: null;
    [UE.AccountDetailsPressSignOut]: { auth_user_id: string };

    // Auth Flow
    [UE.LoginBannerClicked]: null;
    [UE.LoginButtonClicked]: null;
    [UE.ProfileDetailsPressSave]: { auth_user_id: string };

    // Avatar
    [UE.AvatarPressPickImage]: null;
    [UE.AvatarUploadCompleted]: null;
    [UE.AvatarUploadFailed]: null;
    [UE.AvatarUploadStarted]: null;

    // Buddy / Calendar
    [UE.BuddyAvatarCarouselPress]: { buddyUserId: string };
    [UE.CalendarDayClicked]: null;

    // Community Events / Lists
    [UE.CommunityEventsCommunityJoined]: { communityId: string };
    [UE.CommunityListCommunityJoined]: { communityId: string };
    [UE.CommunityListCommunityLeft]: { communityId: string };
    [UE.CommunityListNavigateToCommunityEvents]: { communityId: string };
    [UE.CommunityListNavigateToJoinCommunityButtonPressed]: null;

    // Deep-Link Lifecycle
    [UE.DeepLinkAttributed]: {
        auth_user_id: string | null;
        deep_link_id: string;
        organizer_id?: string;
        community_id?: string;
    };
    [UE.DeepLinkDetected]: {
        auth_user_id: string | null;
        deep_link_id: string;
        url: string;
        source: 'branch' | 'clipboard' | 'cold_start';
    };
    [UE.ProfileInitialDeepLinkAssigned]: {
        auth_user_id: string | null;
        initial_deep_link_id: string;
        organizer_id?: string;
        community_id?: string;
    };

    // Defaults-Menu
    [UE.DefaultsMenuCommunityItemSelected]: { itemId: string; itemName: string };
    [UE.DefaultsMenuLocationItemSelected]: { itemId: string; itemName: string };

    // Event-Detail & Tickets Flow
    [UE.EventDetailDeepLinkPromoCodeSeen]: EventDetailsProps;
    [UE.EventDetailDiscountModalOpened]: EventDetailsProps;
    [UE.EventDetailHeaderTitleClicked]: EventDetailsProps;
    [UE.EventDetailGetTicketsClicked]: EventDetailsProps;
    [UE.EventDetailGoogleCalendarClicked]: EventDetailsProps;
    [UE.EventDetailLinkClicked]: EventDetailsProps;
    [UE.EventDetailModalTicketPressed]: EventDetailsProps;
    [UE.EventDetailOrganizerClicked]: EventDetailsProps;
    [UE.EventDetailPromoCodeCopied]: EventDetailsProps;
    [UE.EventDetailPromoCodeSeen]: EventDetailsProps;
    [UE.EventDetailTicketPressed]: EventDetailsProps;
    [UE.EventDetailWishlistToggled]: EventDetailsProps & {
        is_on_wishlist: boolean;
    };

    [UE.EventDetailTicketPromoModalPromoCopied]: EventDetailsProps

    // Event-List
    [UE.EventListItemClicked]: EventDetailsProps
    [UE.EventListItemDiscountModalOpened]: EventDetailsProps
    [UE.EventListItemTicketPressed]: EventDetailsProps
    [UE.EventListItemWishlistToggled]: EventDetailsProps
    [UE.EventListItemPromoModalTicketPressed]: EventDetailsProps
    [UE.EventListItemPromoModalPromoCopied]: EventDetailsProps
    [UE.EventListItemSharePressed]: EventDetailsProps

    [UE.EventListItemPromoModalTicketPressed]: EventDetailsProps
    [UE.EventListItemPromoModalPromoCopied]: EventDetailsProps
    [UE.EventListItemWishlistToggled]: EventDetailsProps
    [UE.EventListItemSharePressed]: EventDetailsProps

    [UE.EventListItemWishlistToggled]: EventDetailsProps
    [UE.EventListItemSharePressed]: EventDetailsProps

    // Filters & Header
    [UE.FilterDoneButtonClicked]: null;
    [UE.FilterOrganizers]: { selectedOrganizerIds: string[] };
    [UE.FilterResetButtonClicked]: null;
    [UE.HeaderBackButtonClicked]: null;
    [UE.HeaderDrawerButtonClicked]: null;
    [UE.HeaderFilterButtonClicked]: null;

    // Moar
    [UE.MoarGetAddYourEventsLink]: null;
    [UE.MoarGetGoogleCalLink]: null;
    [UE.MoarGetInTouchClickEmail]: null;
    [UE.MoarLinkClicked]: null;

    // My Calendar
    [UE.MyCalendarShareWishlistClick]: null;
    [UE.PersonalizationModalConfirmed]: null;

    // Onboarding & Misc
    [UE.WelcomeScreenRegisterClicked]: {
        promo_code_id: string;
        organizer_id?: string;
        deep_link_id?: string;
    };
    [UE.WelcomeScreenSkipped]: {
        promo_code_id?: string;
        organizer_id?: string;
        deep_link_id?: string;
    };

    // Promo Screen
    [UE.PromoScreenViewed]: {
        auth_user_id: string | null;
        deep_link_id: string;
        promo_code_id: string;
        has_promo: boolean;
    };

    [UE.PromoScreenPromoCodeCopied]: {
        auth_user_id: string | null;
        deep_link_id: string;
        promo_code_id: string;
    };

    [UE.PromoScreenExploreClicked]: {
        auth_user_id: string | null;
        deep_link_id: string;
        promo_code_id: string;
    };

    [UE.PromoScreenEventDetailsClicked]: {
        auth_user_id: string | null;
        deep_link_id: string;
        promo_code_id: string;
    };

    // Swipe Mode
    [UE.SwipeModeMoreInfoClick]: null;
    [UE.SwipeModeSwipeLeft]: null;
    [UE.SwipeModeSwipeRight]: null;

    // Ticket-Promo Modal
    [UE.EventDetailTicketPromoModalPromoCopied]: EventDetailsProps

    [UE.AttendeeAvatarCarouselPress]: {
        auth_user_id: string | null;
        attendee_user_id: string;
    }
}

/**
 * 3) Helper: builds { name; props } based on EventPayloadMap
 */
export type UERecord<K extends UE> = {
    user_event_name: K;
    user_event_props: EventPayloadMap[K];
};

/**
 * 4) Union of all events with correct name & props
 */
export type UserEventInput = {
    [K in Extract<keyof EventPayloadMap, string>]: UERecord<K>;
}[Extract<keyof EventPayloadMap, string>];

// Also include events not in the map (null props)
export type UserEventInputNulls = UERecord<Exclude<UE, keyof EventPayloadMap>>;

export type AllUserEventInput = UserEventInput | UserEventInputNulls;

/**
 * 5) Union of all literal event-name strings
 */
export type UserEventName = `${UE}`;
