// userEvents.ts

/**
 * Consolidated User-Event definitions
 *
 * 1) UE enum lists every event name once.
 * 2) EventPayloadMap maps names to their payload types (or null).
 * 3) UERecord<E> builds { user_event_name, user_event_props }.
 * 4) UserEventName is the union of event-name literals.
 */

/**
 * 1) Single source of truth for all event names
 */

export type FilterState = {
    tags: string[];
    event_types: string[];
    experience_levels: string[];
    interactivity_levels: string[];
};


export const UE = {
    // Login Form
    AuthEmailLoginPressSignupWithEmail: 'auth_email_login_press_signup_with_email',
    AuthEmailLoginPressLoginWithEmail: 'auth_email_login_press_login_with_email',

    LoginFormPressLoginWithGoogle: 'login_form_press_login_with_google',
    LoginFormPressLoginWithApple: 'login_form_press_login_with_apple',

    LoginFormPressLoginWithPhone: 'login_form_press_login_with_phone',
    LoginFormPressLoginWithPhoneSendOTP: 'login_form_press_login_with_phone_send_otp',


    // Account Profile Details Form
    // This is where they fill in their details on signup
    AccountProfileDetailsFormPressSave: 'account_profile_details_form_press_save',
    AccountProfileDetailsFormPressSignOut: 'account_profile_details_form_press_sign_out',

    // Auth Profile
    // This is viewing the profile after signup
    AuthProfilePressSignOut: 'auth_profile_press_sign_out',
    AuthProfilePressDeleteAccount: 'auth_profile_press_delete_account',
    AuthProfilePressHome: 'auth_profile_press_home',
    AuthProfilePressSupport: 'auth_profile_press_support',

    // Login Banner
    LoginBannerClicked: 'login_banner_clicked',

    // Login To Access Button
    // On Wishlist or My Calendar
    LoginToAccessButtonClicked: 'login_to_access_button_clicked',

    // Header Login Button
    HeaderLoginButtonClicked: 'header_login_button_clicked',

    // Onboarding & Misc
    ProfileInitialDeepLinkAssigned: 'profile_initial_deep_link_assigned',

    // Avatar
    AvatarPressPickImage: 'avatar_press_pick_image',
    AvatarUploadCompleted: 'avatar_upload_completed',
    AvatarUploadFailed: 'avatar_upload_failed',
    AvatarUploadStarted: 'avatar_upload_started',

    EventCalendarViewFiltersEnabled: 'event_calendar_view_filters_enabled',
    EventCalendarViewFiltersDisabled: 'event_calendar_view_filters_disabled',
    EventCalendarViewFiltersSet: 'event_calendar_view_filters_set',

    EventCalendarViewExpand: 'event_calendar_view_expand',
    EventCalendarViewToday: 'event_calendar_view_today',
    EventCalendarViewGoogleCalendar: 'event_calendar_view_google_calendar',
    EventCalendarViewGoToPrev: 'event_calendar_view_go_to_prev',
    EventCalendarViewGoToNext: 'event_calendar_view_go_to_next',
    EventCalendarViewSelectDay: 'event_calendar_view_select_day',
    EventCalendarViewGoToToday: 'event_calendar_view_go_to_today',

    // Filters
    FilterTagSelected: 'filter_tag_selected',
    FilterSearchChanged: 'filter_search_changed',

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
    EventCalendarViewSearchChanged: 'event_calendar_view_search_changed',

    // Event-List
    EventListItemClicked: 'event_list_item_clicked',
    EventListItemDiscountModalOpened: 'event_list_item_discount_modal_opened',
    EventListItemTicketPressed: 'event_list_item_ticket_pressed',
    EventListItemWishlistToggled: 'event_list_item_wishlist_toggled',
    EventListItemSharePressed: 'event_list_item_share_pressed',
    EventListItemPromoModalTicketPressed: 'event_list_item_promo_modal_ticket_pressed',
    EventListItemPromoModalPromoCopied: 'event_list_item_promo_modal_promo_code_copied',


    AttendeeAvatarCarouselPress: 'attendee_avatar_carousel_press',

    // Community Events / Lists
    CommunityTabNavigatorTabClicked: 'community_tab_navigator_tab_clicked',
    MyCommunitiesNavigateToAllOrganizers: 'my_communities_navigate_to_all_organizers',
    CommunityEventsCommunityJoined: 'community_events_community_joined',
    CommunityListCommunityJoined: 'community_list_community_joined',
    CommunityListCommunityLeft: 'community_list_community_left',
    CommunityListNavigateToCommunityEvents: 'community_list_navigate_to_community_events',
    CommunityListNavigateToJoinCommunityButtonPressed: 'community_list_navigate_to_join_community_button_pressed',

    // Deep-Link Lifecycle
    DeepLinkAttributed: 'deep_link_attributed',
    DeepLinkDetected: 'deep_link_detected',

    // Header
    HeaderBackButtonClicked: 'header_back_button_clicked',
    HeaderDrawerButtonClicked: 'header_drawer_button_clicked',

    TabNavigatorTabClicked: 'tab_navigator_tab_clicked',

    // Moar
    MoarGetAddYourEventsLink: 'moar_get_add_your_events_link',
    MoarGetGoogleCalLink: 'moar_get_google_cal_link',
    MoarGetInTouchClickEmail: 'moar_get_in_touch_click_email',
    MoarLinkClicked: 'moar_link_clicked',

    // My Calendar
    MyCalendarShareWishlistClick: 'my_calendar_share_wishlist_click',
    PersonalizationModalConfirmed: 'personalization_modal_confirmed',

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
    SwipeModeBottomPressLeft: 'swipe_mode_bottom_press_left',
    SwipeModeBottomPressRight: 'swipe_mode_bottom_press_right',
    SwipeModeUndo: 'swipe_mode_undo',

    // Media Carousel
    MediaCarouselOpenMedia: 'media_carousel_open_media',
    MediaCarouselToggleMute: 'media_carousel_toggle_mute',
    MediaCarouselClose: 'media_carousel_close',


    // Facilitators List
    FacilitatorsTabChange: 'facilitators_tab_change',
    FacilitatorListFollowFacilitator: 'facilitator_list_follow_facilitator',
    FacilitatorListUnfollowFacilitator: 'facilitator_list_unfollow_facilitator',

    // Facilitators Profile
    FacilitatorsProfileTabChange: 'facilitators_profile_tab_change',
    FacilitatorsProfileIntroVideoPressed: 'facilitators_profile_intro_video_pressed',
    FacilitatorsProfileIntroVideoClosed: 'facilitators_profile_intro_video_closed',
    FacilitatorsProfileFetlifePressed: 'facilitators_profile_fetlife_pressed',
    FacilitatorsProfileWebsitePressed: 'facilitators_profile_website_pressed',
    FacilitatorsProfileEmailPressed: 'facilitators_profile_email_pressed',
    FacilitatorsProfileBookSessionPressed: 'facilitators_profile_book_session_pressed',

    FacilitatorListOpenFacilitatorProfile: 'facilitator_list_open_facilitator_profile',

    FacilitatorsProfileUnfollowPressed: 'facilitators_profile_unfollow_pressed',
    FacilitatorsProfileFollowPressed: 'facilitators_profile_follow_pressed',

    // Weekly Picks
    WeeklyPicksEventDetailsClicked: 'weekly_picks_event_details_clicked',
    WeeklyPicksPrevWeekClicked: 'weekly_picks_prev_week_clicked',
    WeeklyPicksNextWeekClicked: 'weekly_picks_next_week_clicked',

    // EdgePlay Group Modal
    EdgePlayGroupModalDismissed: 'edgeplay_group_modal_dismissed',
    EdgePlayGroupModalOpenWhatsapp: 'edgeplay_group_modal_open_whatsapp',

    // Rate App Modal
    RateAppModalOpenStore: 'rate_app_modal_open_store',

    // Newsletter Signup Modal
    NewsletterSignupModalDismissed: 'newsletter_signup_modal_dismissed',
    NewsletterSignupModalOpenSignup: 'newsletter_signup_modal_open_signup',

    // Notifications
    NotificationsApprovalGranted: 'notifications_approval_granted',

    // Munches
    MunchesListNavigateToMunchDetail: 'munches_list_navigate_to_munch_detail',

    MunchDetailsTabSelected: 'munch_details_tab_selected',

    // Top Drawer
    DrawerItemPressed: 'drawer_item_pressed',

    // Discover Page
    DiscoverPageMenuItemPressed: 'discover_page_menu_item_pressed',

    // Discover Game
    DiscoverGameHideTourPressed: 'discover_game_hide_tour_pressed',
    DiscoverGameCreateAccountPressed: 'discover_game_create_account_pressed',
    DiscoverEventsMoreInfoClicked: 'discover_events_more_info_clicked',


    // Right now for facilitators
    TagPress: 'tag_press',
} as const;

export type UE = (typeof UE)[keyof typeof UE];

type AnalyticsProps = {
    auth_user_id?: string | null;
    deep_link_id?: string | null;
    promo_code_id?: string | null;
}

type EventDetailsProps = AnalyticsProps & {
    event_id?: number | null;
}

/**
 * 2) Map event names to their payload shapes (or null for no props)
 */
export interface EventPayloadMap {
    // Email Login
    [UE.AuthEmailLoginPressSignupWithEmail]: AnalyticsProps;
    [UE.AuthEmailLoginPressLoginWithEmail]: AnalyticsProps;

    [UE.LoginFormPressLoginWithGoogle]: AnalyticsProps;
    [UE.LoginFormPressLoginWithApple]: AnalyticsProps;

    [UE.LoginFormPressLoginWithPhone]: AnalyticsProps;
    [UE.LoginFormPressLoginWithPhoneSendOTP]: AnalyticsProps;

    // Account Profile Details Form
    [UE.AccountProfileDetailsFormPressSave]: AnalyticsProps;
    [UE.AccountProfileDetailsFormPressSignOut]: AnalyticsProps;


    // AuthProfile
    [UE.AuthProfilePressSignOut]: AnalyticsProps;
    [UE.AuthProfilePressDeleteAccount]: AnalyticsProps;
    [UE.AuthProfilePressHome]: AnalyticsProps;
    [UE.AuthProfilePressSupport]: AnalyticsProps;

    // Login Banner
    [UE.LoginBannerClicked]: AnalyticsProps;

    // Login To Access Button
    // On Wishlist or My Calendar
    [UE.LoginToAccessButtonClicked]: AnalyticsProps & {
        entity_to_access: string;
    };
    // Header Login Button
    [UE.HeaderLoginButtonClicked]: AnalyticsProps & {
        entity_to_access: string;
    };


    // Avatar
    [UE.AvatarPressPickImage]: AnalyticsProps;
    [UE.AvatarUploadCompleted]: AnalyticsProps;
    [UE.AvatarUploadFailed]: AnalyticsProps;
    [UE.AvatarUploadStarted]: AnalyticsProps;


    // Community Events / Lists
    [UE.CommunityTabNavigatorTabClicked]: AnalyticsProps & { tab_name: string };
    [UE.MyCommunitiesNavigateToAllOrganizers]: AnalyticsProps;
    [UE.CommunityEventsCommunityJoined]: AnalyticsProps & { community_id: string };
    [UE.CommunityListCommunityJoined]: AnalyticsProps & { community_id: string };
    [UE.CommunityListCommunityLeft]: AnalyticsProps & { community_id: string };
    [UE.CommunityListNavigateToCommunityEvents]: AnalyticsProps & { community_id: string };
    [UE.CommunityListNavigateToJoinCommunityButtonPressed]: AnalyticsProps;

    // Deep-Link Lifecycle
    [UE.DeepLinkAttributed]: AnalyticsProps & {
        organizer_id?: string;
        community_id?: string;
    };
    [UE.DeepLinkDetected]: AnalyticsProps & {
        url: string;
        source: 'branch' | 'clipboard' | 'cold_start';
    };
    [UE.ProfileInitialDeepLinkAssigned]: AnalyticsProps & {
        initial_deep_link_id: string;
        organizer_id?: string;
        community_id?: string;
    };


    [UE.TabNavigatorTabClicked]: AnalyticsProps & {
        tab_name: string;
    }

    [UE.EventCalendarViewExpand]: AnalyticsProps & {
        entity: string;
        entityId?: string;
    };
    [UE.EventCalendarViewToday]: AnalyticsProps & {
        entity: string;
        entityId?: string;
    };
    [UE.EventCalendarViewGoogleCalendar]: AnalyticsProps & {
        entity: string;
        entityId?: string;
    };
    [UE.EventCalendarViewFiltersEnabled]: AnalyticsProps & {
        entity: string;
        entityId?: string;
    };
    [UE.EventCalendarViewFiltersDisabled]: AnalyticsProps & {
        entity: string;
        entityId?: string;
    };

    [UE.EventCalendarViewFiltersSet]: AnalyticsProps & { filters: FilterState } & {
        entity: string;
        entityId?: string;
    };

    [UE.EventCalendarViewGoToPrev]: AnalyticsProps & {
        entity: string;
        entityId?: string;
    };
    [UE.EventCalendarViewGoToNext]: AnalyticsProps & {
        entity: string;
        entityId?: string;
    };
    [UE.EventCalendarViewSelectDay]: AnalyticsProps & { day: string } & {
        entity: string;
        entityId?: string;
    };
    [UE.EventCalendarViewGoToToday]: AnalyticsProps & {
        entity: string;
        entityId?: string;
    };

    [UE.EventCalendarViewSearchChanged]: AnalyticsProps & { search_text: string } & {
        entity: string;
        entityId?: string;
    };


    // Filters
    [UE.FilterTagSelected]: AnalyticsProps & {
        tag_name: string;
        tag_count: number;
    };
    [UE.FilterSearchChanged]: AnalyticsProps & {
        search_text: string;
    };

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
    [UE.EventListItemWishlistToggled]: EventDetailsProps & {
        is_on_wishlist: boolean;
    };
    [UE.EventListItemPromoModalTicketPressed]: EventDetailsProps
    [UE.EventListItemPromoModalPromoCopied]: EventDetailsProps
    [UE.EventListItemSharePressed]: EventDetailsProps


    // Header
    [UE.HeaderBackButtonClicked]: AnalyticsProps;
    [UE.HeaderDrawerButtonClicked]: AnalyticsProps;
    // Moar
    [UE.MoarGetAddYourEventsLink]: AnalyticsProps;
    [UE.MoarGetGoogleCalLink]: AnalyticsProps;
    [UE.MoarGetInTouchClickEmail]: AnalyticsProps;
    [UE.MoarLinkClicked]: AnalyticsProps & {
        link_name: string;
    };

    // My Calendar
    [UE.MyCalendarShareWishlistClick]: AnalyticsProps;
    [UE.PersonalizationModalConfirmed]: AnalyticsProps;

    // Onboarding & Misc
    [UE.WelcomeScreenRegisterClicked]: AnalyticsProps;
    [UE.WelcomeScreenSkipped]: AnalyticsProps;

    // Promo Screen
    [UE.PromoScreenViewed]: EventDetailsProps;

    [UE.PromoScreenPromoCodeCopied]: EventDetailsProps;

    [UE.PromoScreenExploreClicked]: EventDetailsProps;

    [UE.PromoScreenEventDetailsClicked]: EventDetailsProps;

    [UE.WeeklyPicksEventDetailsClicked]: EventDetailsProps;

    [UE.WeeklyPicksPrevWeekClicked]: AnalyticsProps & {
        index: number;
    };

    [UE.WeeklyPicksNextWeekClicked]: AnalyticsProps & {
        index: number;
    };

    // Swipe Mode
    [UE.SwipeModeMoreInfoClick]: AnalyticsProps;
    [UE.SwipeModeSwipeLeft]: AnalyticsProps & {
        event_id: number;
    };
    [UE.SwipeModeSwipeRight]: AnalyticsProps & {
        event_id: number;
    };
    [UE.SwipeModeBottomPressLeft]: AnalyticsProps;
    [UE.SwipeModeBottomPressRight]: AnalyticsProps;
    [UE.SwipeModeUndo]: AnalyticsProps & {
        event_id: number;
    };

    // Ticket-Promo Modal
    [UE.EventDetailTicketPromoModalPromoCopied]: EventDetailsProps

    [UE.AttendeeAvatarCarouselPress]: AnalyticsProps & {
        attendee_user_id: string;
    }

    // Facilitators

    // Facilitators List
    [UE.FacilitatorListOpenFacilitatorProfile]: AnalyticsProps & {
        facilitator_id: string;
    }

    [UE.FacilitatorListFollowFacilitator]: AnalyticsProps & {
        facilitator_id: string;
    }

    [UE.FacilitatorListUnfollowFacilitator]: AnalyticsProps & {
        facilitator_id: string;
    }

    [UE.FacilitatorsTabChange]: AnalyticsProps & {
        tab: string;
    }

    [UE.FacilitatorsProfileFollowPressed]: AnalyticsProps & {
        facilitator_id: string;
    }

    [UE.FacilitatorsProfileUnfollowPressed]: AnalyticsProps & {
        facilitator_id: string;
    }


    // Profile
    [UE.FacilitatorsProfileTabChange]: AnalyticsProps & {
        tab: string;
    }
    [UE.FacilitatorsProfileIntroVideoPressed]: AnalyticsProps & {
        url: string;
        facilitator_id: string;
    }

    [UE.FacilitatorsProfileIntroVideoClosed]: AnalyticsProps & {
        url: string;
        facilitator_id: string;
    }

    [UE.FacilitatorsProfileFetlifePressed]: AnalyticsProps & {
        url: string;
        facilitator_id: string;
    }

    [UE.FacilitatorsProfileWebsitePressed]: AnalyticsProps & {
        url: string;
        facilitator_id: string;
    }

    [UE.FacilitatorsProfileEmailPressed]: AnalyticsProps & {
        email: string;
        facilitator_id: string;
    }

    [UE.FacilitatorsProfileBookSessionPressed]: AnalyticsProps & {
        email: string;
        facilitator_id: string;
    }


    [UE.MediaCarouselOpenMedia]: AnalyticsProps & {
        media_id: string;
        entity_type: string;
        entity_id?: string;
    };
    [UE.MediaCarouselToggleMute]: AnalyticsProps & {
        media_id: string;
        entity_type: string;
        entity_id?: string;
    };

    [UE.MediaCarouselClose]: AnalyticsProps & {
        media_id: string;
        entity_type: string;
        entity_id?: string;
    };

    // Munches
    [UE.MunchesListNavigateToMunchDetail]: AnalyticsProps & {
        munch_id: number;
    };

    [UE.MunchDetailsTabSelected]: AnalyticsProps & {
        tab: string;
    };

    // Drawer
    [UE.DrawerItemPressed]: AnalyticsProps & {
        screen_name: string;
    };

    // Discover Page
    [UE.DiscoverPageMenuItemPressed]: AnalyticsProps & {
        menu_item: string;
    };

    // Discover Game
    [UE.DiscoverGameHideTourPressed]: AnalyticsProps;

    [UE.DiscoverGameCreateAccountPressed]: AnalyticsProps;

    [UE.DiscoverEventsMoreInfoClicked]: EventDetailsProps;


    // Right now for facilitators
    [UE.TagPress]: AnalyticsProps & {
        entity_type: string;
        entity_id?: string;
        name?: string;
        url?: string;
    };


    // EdgePlay Group Modal
    [UE.EdgePlayGroupModalDismissed]: AnalyticsProps;
    [UE.EdgePlayGroupModalOpenWhatsapp]: AnalyticsProps;

    // Rate App Modal
    [UE.RateAppModalOpenStore]: AnalyticsProps;

    // Newsletter Signup Modal
    [UE.NewsletterSignupModalDismissed]: AnalyticsProps;
    [UE.NewsletterSignupModalOpenSignup]: AnalyticsProps;

    // Notifications
    [UE.NotificationsApprovalGranted]: AnalyticsProps;
}


/**
 * 3) Helper: builds { name; props } based on EventPayloadMap
 */
export type UERecord<K extends keyof EventPayloadMap> = {
    user_event_name: K;
    user_event_props: EventPayloadMap[K];
};

/**
 * 4) Union of all events with correct name & props
 */
export type UserEventInput = {
    [K in Extract<keyof EventPayloadMap, string>]: UERecord<K>;
}[Extract<keyof EventPayloadMap, string>];

/**
 * 5) Union of all literal event-name strings
 */
export type UserEventName = `${UE}`;
