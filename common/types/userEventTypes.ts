/* ────────────────────────────────────────────────────────────────
   User‑Event model (value + type in one declaration)
   --------------------------------------------------
   • One **const enum** holds every event name string.
   • A generic helper builds each event interface in one line.
   • A final union (`UserEventInput`) covers all event variants.
   • No string literal is ever duplicated.
   --------------------------------------------------
   Save this in e.g.  userEvents.ts
────────────────────────────────────────────────────────────────── */

/*─────────────────────────────────────────────────────────────────
  1)  All event names – ONE place, ONE time
─────────────────────────────────────────────────────────────────*/
export const enum UE {
    /* account‑details */
    AccountDetailsPressAddBuddy = 'account_details_press_add_buddy',
    AccountDetailsPressDeleteAccount = 'account_details_press_delete_account',
    AccountDetailsPressHome = 'account_details_press_home',
    AccountDetailsPressShareCode = 'account_details_press_share_code',
    AccountDetailsPressSignOut = 'account_details_press_sign_out',

    /* avatar */
    AvatarPressPickImage = 'avatar_press_pick_image',
    AvatarUploadCompleted = 'avatar_upload_completed',
    AvatarUploadFailed = 'avatar_upload_failed',
    AvatarUploadStarted = 'avatar_upload_started',

    /* buddy / calendar */
    BuddyAvatarCarouselPress = 'buddy_avatar_carousel_press',
    CalendarDayClicked = 'calendar_day_clicked',

    /* community events / lists */
    CommunityEventsCommunityJoined = 'community_events_community_joined',
    CommunityListCommunityJoined = 'community_list_community_joined',
    CommunityListCommunityLeft = 'community_list_community_left',
    CommunityListNavigateToCommunityEvents =
    'community_list_navigate_to_community_events',
    CommunityListNavigateToJoinCommunityButtonPressed =
    'community_list_navigate_to_join_community_button_pressed',

    /* deep‑link */
    DeepLinkParamsSet = 'deep_link_params_set',
    DefaultCommunitySelectedAcro = 'default_community_selected_acro',

    /* defaults‑menu */
    DefaultsMenuCommunityItemSelected = 'defaults_menu_community_item_selected',
    DefaultsMenuLocationItemSelected = 'defaults_menu_location_item_selected',

    /* event‑calendar view */
    EventCalendarViewOnPressCalendar = 'event_calendar_view_on_press_calendar',
    EventCalendarViewOnPressDay = 'event_calendar_view_on_press_day',
    EventCalendarViewOnPressPrivateEvents =
    'event_calendar_view_on_press_private_events',

    /* event‑detail */
    EventDetailGetTicketsClicked = 'event_detail_get_tickets_clicked',
    EventDetailGoogleCalendarClicked = 'event_detail_google_calendar_clicked',
    EventDetailLinkClicked = 'event_detail_link_clicked',
    EventDetailOrganizerClicked = 'event_detail_organizer_clicked',

    /* event‑list */
    EventListItemClicked = 'event_list_item_clicked',
    EventListItemWishlistToggled = 'event_list_item_wishlist_toggled',

    /* filters & header */
    FilterDoneButtonClicked = 'filter_done_button_clicked',
    FilterOrganizers = 'filter_organizers',
    FilterOrganizersReset = 'filter_organizers_reset',
    FilterResetButtonClicked = 'filter_reset_button_clicked',
    HeaderBackButtonClicked = 'header_back_button_clicked',
    HeaderDrawerButtonClicked = 'header_drawer_button_clicked',
    HeaderFilterButtonClicked = 'header_filter_button_clicked',

    /* misc / onboarding */
    InitialDeepLink = 'initial_deep_link',
    LoginBannerClicked = 'login_banner_clicked',
    LoginButtonClicked = 'login_button_clicked',
    MoarGetAddYourEventsLink = 'moar_get_add_your_events_link',
    MoarGetGoogleCalLink = 'moar_get_google_cal_link',
    MoarGetInTouchClickEmail = 'moar_get_in_touch_click_email',
    MoarLinkClicked = 'moar_link_clicked',
    MyCalendarShareWishlistClick = 'my_calendar_share_wishlist_click',
    PersonalizationModalConfirmed = 'personalization_modal_confirmed',
    ProfileDetailsPressSave = 'profile_details_press_save',

    /* swipe‑mode */
    SwipeModeMoreInfoClick = 'swipe_mode_more_info_click',
    SwipeModeSwipeLeft = 'swipe_mode_swipe_left',
    SwipeModeSwipeRight = 'swipe_mode_swipe_right',

    /* welcome */
    WelcomeScreenRegisterClicked = 'welcome_screen_register_clicked',
    WelcomeScreenSkipped = 'welcome_screen_skipped'
}

/*─────────────────────────────────────────────────────────────────
  2)  Helper to build each event interface in one line
─────────────────────────────────────────────────────────────────*/
type UERecord<Name extends UE, Props> = {
    user_event_name: Name;
    user_event_props: Props;
};

/*─────────────────────────────────────────────────────────────────
  3)  Concrete event interfaces
     (null‑prop events first, then events with payload)
─────────────────────────────────────────────────────────────────*/
/* --- events whose props are null --- */
export type AccountDetailsPressAddBuddy = UERecord<UE.AccountDetailsPressAddBuddy, null>;
export type AccountDetailsPressDeleteAccount = UERecord<UE.AccountDetailsPressDeleteAccount, null>;
export type AccountDetailsPressHome = UERecord<UE.AccountDetailsPressHome, null>;
export type AccountDetailsPressShareCode = UERecord<UE.AccountDetailsPressShareCode, null>;
export type AccountDetailsPressSignOut = UERecord<UE.AccountDetailsPressSignOut, null>;
export type AvatarPressPickImage = UERecord<UE.AvatarPressPickImage, null>;
export type AvatarUploadCompleted = UERecord<UE.AvatarUploadCompleted, null>;
export type AvatarUploadFailed = UERecord<UE.AvatarUploadFailed, null>;
export type AvatarUploadStarted = UERecord<UE.AvatarUploadStarted, null>;
export type CalendarDayClicked = UERecord<UE.CalendarDayClicked, null>;
export type CommunityListNavigateToJoinCommunityButtonPressed =
    UERecord<UE.CommunityListNavigateToJoinCommunityButtonPressed, null>;
export type EventCalendarViewOnPressCalendar =
    UERecord<UE.EventCalendarViewOnPressCalendar, null>;
export type EventCalendarViewOnPressDay = UERecord<UE.EventCalendarViewOnPressDay, null>;
export type EventCalendarViewOnPressPrivateEvents =
    UERecord<UE.EventCalendarViewOnPressPrivateEvents, null>;
export type FilterDoneButtonClicked = UERecord<UE.FilterDoneButtonClicked, null>;
export type FilterOrganizersReset = UERecord<UE.FilterOrganizersReset, null>;
export type FilterResetButtonClicked = UERecord<UE.FilterResetButtonClicked, null>;
export type HeaderBackButtonClicked = UERecord<UE.HeaderBackButtonClicked, null>;
export type HeaderDrawerButtonClicked = UERecord<UE.HeaderDrawerButtonClicked, null>;
export type HeaderFilterButtonClicked = UERecord<UE.HeaderFilterButtonClicked, null>;
export type LoginBannerClicked = UERecord<UE.LoginBannerClicked, null>;
export type LoginButtonClicked = UERecord<UE.LoginButtonClicked, null>;
export type MoarGetAddYourEventsLink = UERecord<UE.MoarGetAddYourEventsLink, null>;
export type MoarGetGoogleCalLink = UERecord<UE.MoarGetGoogleCalLink, null>;
export type MoarGetInTouchClickEmail = UERecord<UE.MoarGetInTouchClickEmail, null>;
export type MyCalendarShareWishlistClick = UERecord<UE.MyCalendarShareWishlistClick, null>;
export type PersonalizationModalConfirmed = UERecord<UE.PersonalizationModalConfirmed, null>;
export type ProfileDetailsPressSave = UERecord<UE.ProfileDetailsPressSave, null>;
export type WelcomeScreenRegisterClicked = UERecord<UE.WelcomeScreenRegisterClicked, null>;
export type WelcomeScreenSkipped = UERecord<UE.WelcomeScreenSkipped, null>;

/* --- events WITH payload --- */
export type BuddyAvatarCarouselPress = UERecord<
    UE.BuddyAvatarCarouselPress,
    { buddyUserId: string }
>;

export type CommunityEventsCommunityJoined = UERecord<
    UE.CommunityEventsCommunityJoined,
    { communityId: string }
>;

export type CommunityListCommunityJoined = UERecord<
    UE.CommunityListCommunityJoined,
    { communityId: string }
>;

export type CommunityListCommunityLeft = UERecord<
    UE.CommunityListCommunityLeft,
    { communityId: string }
>;

export type CommunityListNavigateToCommunityEvents = UERecord<
    UE.CommunityListNavigateToCommunityEvents,
    { communityId: string }
>;

export type DeepLinkParamsSet = UERecord<
    UE.DeepLinkParamsSet,
    { slug: string; type: string; communityId: string }
>;

export type DefaultCommunitySelectedAcro = UERecord<
    UE.DefaultCommunitySelectedAcro,
    { community: string }
>;

export type DefaultsMenuCommunityItemSelected = UERecord<
    UE.DefaultsMenuCommunityItemSelected,
    { itemId: string; itemName: string }
>;

export type DefaultsMenuLocationItemSelected = UERecord<
    UE.DefaultsMenuLocationItemSelected,
    { itemId: string; itemName: string }
>;

export type EventDetailGetTicketsClicked = UERecord<
    UE.EventDetailGetTicketsClicked,
    { event_id: number; event_name: string }
>;

export type EventDetailGoogleCalendarClicked = UERecord<
    UE.EventDetailGoogleCalendarClicked,
    { event_id: number }
>;

export type EventDetailLinkClicked = UERecord<
    UE.EventDetailLinkClicked,
    { event_url: string }
>;

export type EventDetailOrganizerClicked = UERecord<
    UE.EventDetailOrganizerClicked,
    { organizer_id: number }
>;

export type EventListItemClicked = UERecord<
    UE.EventListItemClicked,
    { event_id: number; event_name: string }
>;

export type EventListItemWishlistToggled = UERecord<
    UE.EventListItemWishlistToggled,
    { event_id: number; event_name: string; is_on_wishlist: boolean }
>;

export type FilterOrganizers = UERecord<
    UE.FilterOrganizers,
    { selectedOrganizerIds: string[] }
>;

export type InitialDeepLink = UERecord<
    UE.InitialDeepLink,
    { url: string | null }
>;

export type MoarLinkClicked = UERecord<
    UE.MoarLinkClicked,
    { title: string }
>;

export type SwipeModeMoreInfoClick = UERecord<
    UE.SwipeModeMoreInfoClick,
    { eventId: number }
>;

export type SwipeModeSwipeLeft = UERecord<
    UE.SwipeModeSwipeLeft,
    { event_id: number; event_name: string }
>;

export type SwipeModeSwipeRight = UERecord<
    UE.SwipeModeSwipeRight,
    { event_id: number; event_name: string }
>;

/*─────────────────────────────────────────────────────────────────
  4)  Union of every event interface
─────────────────────────────────────────────────────────────────*/
export type UserEventInput =
    | AccountDetailsPressAddBuddy
    | AccountDetailsPressDeleteAccount
    | AccountDetailsPressHome
    | AccountDetailsPressShareCode
    | AccountDetailsPressSignOut
    | AvatarPressPickImage
    | AvatarUploadCompleted
    | AvatarUploadFailed
    | AvatarUploadStarted
    | BuddyAvatarCarouselPress
    | CalendarDayClicked
    | CommunityEventsCommunityJoined
    | CommunityListCommunityJoined
    | CommunityListCommunityLeft
    | CommunityListNavigateToCommunityEvents
    | CommunityListNavigateToJoinCommunityButtonPressed
    | DeepLinkParamsSet
    | DefaultCommunitySelectedAcro
    | DefaultsMenuCommunityItemSelected
    | DefaultsMenuLocationItemSelected
    | EventCalendarViewOnPressCalendar
    | EventCalendarViewOnPressDay
    | EventCalendarViewOnPressPrivateEvents
    | EventDetailGetTicketsClicked
    | EventDetailGoogleCalendarClicked
    | EventDetailLinkClicked
    | EventDetailOrganizerClicked
    | EventListItemClicked
    | EventListItemWishlistToggled
    | FilterDoneButtonClicked
    | FilterOrganizers
    | FilterOrganizersReset
    | FilterResetButtonClicked
    | HeaderBackButtonClicked
    | HeaderDrawerButtonClicked
    | HeaderFilterButtonClicked
    | InitialDeepLink
    | LoginBannerClicked
    | LoginButtonClicked
    | MoarGetAddYourEventsLink
    | MoarGetGoogleCalLink
    | MoarGetInTouchClickEmail
    | MoarLinkClicked
    | MyCalendarShareWishlistClick
    | PersonalizationModalConfirmed
    | ProfileDetailsPressSave
    | SwipeModeMoreInfoClick
    | SwipeModeSwipeLeft
    | SwipeModeSwipeRight
    | WelcomeScreenRegisterClicked
    | WelcomeScreenSkipped;

/** union of all literal strings, e.g. "swipe_mode_swipe_right" | … */
export type UserEventName = `${UE}`;

