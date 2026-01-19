// userEvents.ts
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
    OrganizerFollowPressed: 'organizer_follow_pressed',
    OrganizerFirstFollowed: 'organizer_first_followed',
    WishlistFirstAdded: 'wishlist_first_added',
    // Avatar
    AvatarPressPickImage: 'avatar_press_pick_image',
    AvatarUploadCompleted: 'avatar_upload_completed',
    AvatarUploadFailed: 'avatar_upload_failed',
    AvatarUploadStarted: 'avatar_upload_started',
    EventCalendarViewFiltersEnabled: 'event_calendar_view_filters_enabled',
    EventCalendarViewFiltersDisabled: 'event_calendar_view_filters_disabled',
    EventCalendarViewFiltersSet: 'event_calendar_view_filters_set',
    // Date Bar
    DateBarSwipePrev: 'date_bar_swipe_prev',
    DateBarSwipeNext: 'date_bar_swipe_next',
    DateBarLongPress: 'date_bar_long_press',
    DateBarCalendarPressed: 'date_bar_calendar_pressed',
    DateBarTodayPressed: 'date_bar_today_pressed',
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
    FilterSearchFocused: 'filter_search_focused',
    FilterSearchTyped: 'filter_search_typed',
    FilterMorePressed: 'filter_more_pressed',
    FilterTagAdded: 'filter_tag_added',
    // Event-Detail & Tickets Flow
    EventDetailGetTicketsClicked: 'event_detail_get_tickets_clicked',
    EventDetailGoogleCalendarClicked: 'event_detail_google_calendar_clicked',
    EventDetailLinkClicked: 'event_detail_link_clicked',
    EventDetailOrganizerClicked: 'event_detail_organizer_clicked',
    EventDetailPromoCodeCopied: 'event_detail_promo_code_copied',
    EventDetailTicketPressed: 'event_detail_ticket_pressed',
    EventDetailWishlistToggled: 'event_detail_wishlist_toggled',
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
};
