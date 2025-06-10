export declare const enum UE {
    AccountDetailsPressAddBuddy = "account_details_press_add_buddy",
    AccountDetailsPressDeleteAccount = "account_details_press_delete_account",
    AccountDetailsPressHome = "account_details_press_home",
    AccountDetailsPressShareCode = "account_details_press_share_code",
    AccountDetailsPressSignOut = "account_details_press_sign_out",
    LoginBannerClicked = "login_banner_clicked",
    LoginButtonClicked = "login_button_clicked",
    AvatarPressPickImage = "avatar_press_pick_image",
    AvatarUploadCompleted = "avatar_upload_completed",
    AvatarUploadFailed = "avatar_upload_failed",
    AvatarUploadStarted = "avatar_upload_started",
    BuddyAvatarCarouselPress = "buddy_avatar_carousel_press",
    CalendarDayClicked = "calendar_day_clicked",
    CommunityEventsCommunityJoined = "community_events_community_joined",
    CommunityListCommunityJoined = "community_list_community_joined",
    CommunityListCommunityLeft = "community_list_community_left",
    CommunityListNavigateToCommunityEvents = "community_list_navigate_to_community_events",
    CommunityListNavigateToJoinCommunityButtonPressed = "community_list_navigate_to_join_community_button_pressed",
    DeepLinkAttributed = "deep_link_attributed",
    DeepLinkDetected = "deep_link_detected",
    DefaultsMenuCommunityItemSelected = "defaults_menu_community_item_selected",
    DefaultsMenuLocationItemSelected = "defaults_menu_location_item_selected",
    EventDetailDeepLinkPromoCodeSeen = "event_detail_deep_link_promo_code_seen",
    EventDetailDiscountModalOpened = "event_detail_discount_modal_opened",
    EventDetailGetTicketsClicked = "event_detail_get_tickets_clicked",
    EventDetailGoogleCalendarClicked = "event_detail_google_calendar_clicked",
    EventDetailLinkClicked = "event_detail_link_clicked",
    EventDetailModalTicketPressed = "event_detail_modal_ticket_pressed",
    EventDetailOrganizerClicked = "event_detail_organizer_clicked",
    EventDetailPromoCodeCopied = "event_detail_promo_code_copied",
    EventDetailPromoCodeSeen = "event_detail_promo_code_seen",
    EventDetailTicketPressed = "event_detail_ticket_pressed",
    EventDetailWishlistToggled = "event_detail_wishlist_toggled",
    EventDetailTicketPromoModalPromoCopied = "event_detail_ticket_promo_modal_promo_code_copied",
    EventDetailHeaderTitleClicked = "event_detail_header_title_clicked",
    EventListItemClicked = "event_list_item_clicked",
    EventListItemDiscountModalOpened = "event_list_item_discount_modal_opened",
    EventListItemTicketPressed = "event_list_item_ticket_pressed",
    EventListItemWishlistToggled = "event_list_item_wishlist_toggled",
    EventListItemSharePressed = "event_list_item_share_pressed",
    EventListItemPromoModalTicketPressed = "event_list_item_promo_modal_ticket_pressed",
    EventListItemPromoModalPromoCopied = "event_list_item_promo_modal_promo_code_copied",
    FilterDoneButtonClicked = "filter_done_button_clicked",
    FilterOrganizers = "filter_organizers",
    FilterResetButtonClicked = "filter_reset_button_clicked",
    HeaderBackButtonClicked = "header_back_button_clicked",
    HeaderDrawerButtonClicked = "header_drawer_button_clicked",
    HeaderFilterButtonClicked = "header_filter_button_clicked",
    MoarGetAddYourEventsLink = "moar_get_add_your_events_link",
    MoarGetGoogleCalLink = "moar_get_google_cal_link",
    MoarGetInTouchClickEmail = "moar_get_in_touch_click_email",
    MoarLinkClicked = "moar_link_clicked",
    MyCalendarShareWishlistClick = "my_calendar_share_wishlist_click",
    PersonalizationModalConfirmed = "personalization_modal_confirmed",
    ProfileInitialDeepLinkAssigned = "profile_initial_deep_link_assigned",
    ProfileDetailsPressSave = "profile_details_press_save",
    WelcomeScreenRegisterClicked = "welcome_screen_register_clicked",
    WelcomeScreenSkipped = "welcome_screen_skipped",
    PromoScreenViewed = "promo_screen_viewed",
    PromoScreenPromoCodeCopied = "promo_screen_promo_code_copied",
    PromoScreenExploreClicked = "promo_screen_explore_clicked",
    PromoScreenEventDetailsClicked = "promo_screen_event_details_clicked",
    SwipeModeMoreInfoClick = "swipe_mode_more_info_click",
    SwipeModeSwipeLeft = "swipe_mode_swipe_left",
    SwipeModeSwipeRight = "swipe_mode_swipe_right"
}
export interface EventPayloadMap {
    [UE.AccountDetailsPressAddBuddy]: null;
    [UE.AccountDetailsPressDeleteAccount]: null;
    [UE.AccountDetailsPressHome]: null;
    [UE.AccountDetailsPressShareCode]: null;
    [UE.AccountDetailsPressSignOut]: {
        auth_user_id: string;
    };
    [UE.LoginBannerClicked]: null;
    [UE.LoginButtonClicked]: null;
    [UE.ProfileDetailsPressSave]: {
        auth_user_id: string;
    };
    [UE.AvatarPressPickImage]: null;
    [UE.AvatarUploadCompleted]: null;
    [UE.AvatarUploadFailed]: null;
    [UE.AvatarUploadStarted]: null;
    [UE.BuddyAvatarCarouselPress]: {
        buddyUserId: string;
    };
    [UE.CalendarDayClicked]: null;
    [UE.CommunityEventsCommunityJoined]: {
        communityId: string;
    };
    [UE.CommunityListCommunityJoined]: {
        communityId: string;
    };
    [UE.CommunityListCommunityLeft]: {
        communityId: string;
    };
    [UE.CommunityListNavigateToCommunityEvents]: {
        communityId: string;
    };
    [UE.CommunityListNavigateToJoinCommunityButtonPressed]: null;
    [UE.DeepLinkAttributed]: {
        auth_user_id: string | null;
        deep_link_id: string;
        deep_link_slug: string;
        deep_link_type: string;
        organizer_id?: string;
        community_id?: string;
    };
    [UE.DeepLinkDetected]: {
        auth_user_id: string | null;
        deep_link_id: string;
        deep_link_slug: string;
        deep_link_type: string;
        organizer_id?: string;
        community_id?: string;
        url: string;
        source: 'branch' | 'clipboard' | 'cold_start';
    };
    [UE.ProfileInitialDeepLinkAssigned]: {
        auth_user_id: string | null;
        initial_deep_link_id: string;
        initial_deep_link_slug: string;
        organizer_id?: string;
        community_id?: string;
    };
    [UE.DefaultsMenuCommunityItemSelected]: {
        itemId: string;
        itemName: string;
    };
    [UE.DefaultsMenuLocationItemSelected]: {
        itemId: string;
        itemName: string;
    };
    [UE.EventDetailDeepLinkPromoCodeSeen]: {
        auth_user_id: string | null;
        event_id: string;
        event_name: string;
        deep_link_id: string;
        deep_link_slug: string;
        featured_promo_code_code?: string;
        featured_promo_code_id?: string;
    };
    [UE.EventDetailDiscountModalOpened]: {
        auth_user_id: string | null;
        event_id: string;
        event_name: string;
        deep_link_id?: string;
        deep_link_slug?: string;
    };
    [UE.EventDetailHeaderTitleClicked]: {
        auth_user_id: string | null;
        event_id: string;
        event_name: string;
        organizer_name?: string;
        promo_code_id?: string;
        promo_code_code?: string;
        deep_link_id?: string;
        deep_link_slug?: string;
    };
    [UE.EventDetailGetTicketsClicked]: {
        auth_user_id: string | null;
        event_id: string;
        event_name: string;
        organizer_name?: string;
        promo_code_id?: string;
        promo_code_code?: string;
        deep_link_id?: string;
        deep_link_slug?: string;
    };
    [UE.EventDetailGoogleCalendarClicked]: {
        auth_user_id: string | null;
        event_id: string;
        event_name: string;
    };
    [UE.EventDetailLinkClicked]: {
        auth_user_id: string | null;
        event_id: string;
        event_name: string;
        event_url: string;
    };
    [UE.EventDetailModalTicketPressed]: {
        auth_user_id: string | null;
        event_id: string;
        event_name: string;
    };
    [UE.EventDetailOrganizerClicked]: {
        auth_user_id: string | null;
        organizer_id: string;
        organizer_name: string;
        event_id: string;
        event_name: string;
    };
    [UE.EventDetailPromoCodeCopied]: {
        auth_user_id: string | null;
        event_id: string;
        event_name: string;
        promo_code_id: string;
        promo_code_code: string;
    };
    [UE.EventDetailPromoCodeSeen]: {
        auth_user_id: string | null;
        event_id: string;
        event_name: string;
        promo_code_id: string;
        promo_code_code: string;
    };
    [UE.EventDetailTicketPressed]: {
        auth_user_id: string | null;
        event_id: string;
        event_name: string;
    };
    [UE.EventDetailWishlistToggled]: {
        auth_user_id: string | null;
        event_id: string;
        event_name: string;
        is_on_wishlist: boolean;
    };
    [UE.EventDetailTicketPromoModalPromoCopied]: {
        auth_user_id: string | null;
        event_id: string;
        event_name: string;
        promo_code_id: string;
        promo_code_code: string;
        deep_link_id?: string;
        deep_link_slug?: string;
    };
    [UE.EventListItemClicked]: {
        auth_user_id: string | null;
        event_id: string;
        event_name: string;
        promo_code_id?: string;
        promo_code_code?: string;
        deep_link_id?: string;
        deep_link_slug?: string;
    };
    [UE.EventListItemDiscountModalOpened]: {
        auth_user_id: string | null;
        event_id: string;
        event_name: string;
        deep_link_id?: string;
        deep_link_slug?: string;
    };
    [UE.EventListItemTicketPressed]: {
        auth_user_id: string | null;
        event_id: string;
        event_name: string;
        promo_code_id?: string;
        promo_code_code?: string;
        deep_link_id?: string;
        deep_link_slug?: string;
    };
    [UE.EventListItemPromoModalTicketPressed]: {
        auth_user_id: string | null;
        event_id: string;
        event_name: string;
        promo_code_id?: string;
        promo_code_code?: string;
        deep_link_id?: string;
        deep_link_slug?: string;
    };
    [UE.EventListItemPromoModalPromoCopied]: {
        auth_user_id: string | null;
        event_id: string;
        event_name: string;
        promo_code_id?: string;
        promo_code_code?: string;
        deep_link_id?: string;
        deep_link_slug?: string;
    };
    [UE.EventListItemWishlistToggled]: {
        auth_user_id: string | null;
        event_id: string;
        event_name: string;
        is_on_wishlist: boolean;
    };
    [UE.EventListItemSharePressed]: {
        auth_user_id: string | null;
        event_id: string;
        event_name: string;
        deep_link_id?: string;
        deep_link_slug?: string;
        promo_code_id?: string;
        promo_code_code?: string;
    };
    [UE.FilterDoneButtonClicked]: null;
    [UE.FilterOrganizers]: {
        selectedOrganizerIds: string[];
    };
    [UE.FilterResetButtonClicked]: null;
    [UE.HeaderBackButtonClicked]: null;
    [UE.HeaderDrawerButtonClicked]: null;
    [UE.HeaderFilterButtonClicked]: null;
    [UE.MoarGetAddYourEventsLink]: null;
    [UE.MoarGetGoogleCalLink]: null;
    [UE.MoarGetInTouchClickEmail]: null;
    [UE.MoarLinkClicked]: null;
    [UE.MyCalendarShareWishlistClick]: null;
    [UE.PersonalizationModalConfirmed]: null;
    [UE.WelcomeScreenRegisterClicked]: {
        promo_code_code?: string;
        organizer_name?: string;
        organizer_id?: string;
        deep_link_id?: string;
        deep_link_slug?: string;
        deep_link_type?: string;
    };
    [UE.WelcomeScreenSkipped]: {
        promo_code_code?: string;
        organizer_name?: string;
        organizer_id?: string;
        deep_link_id?: string;
        deep_link_slug?: string;
        deep_link_type?: string;
    };
    [UE.PromoScreenViewed]: {
        auth_user_id: string | null;
        deep_link_id: string;
        deep_link_slug: string;
        promo_code_id: string;
        promo_code_code: string;
        has_promo: boolean;
    };
    [UE.PromoScreenPromoCodeCopied]: {
        auth_user_id: string | null;
        deep_link_id: string;
        deep_link_slug: string;
        promo_code_id: string;
        promo_code_code: string;
    };
    [UE.PromoScreenExploreClicked]: {
        auth_user_id: string | null;
        deep_link_id: string;
        deep_link_slug: string;
        promo_code_id: string;
        promo_code_code: string;
    };
    [UE.PromoScreenEventDetailsClicked]: {
        auth_user_id: string | null;
        deep_link_id: string;
        deep_link_slug: string;
        promo_code_id: string;
        promo_code_code: string;
    };
    [UE.SwipeModeMoreInfoClick]: null;
    [UE.SwipeModeSwipeLeft]: null;
    [UE.SwipeModeSwipeRight]: null;
    [UE.EventDetailTicketPromoModalPromoCopied]: {
        auth_user_id: string | null;
        event_id: string;
        event_name: string;
        promo_code_id: string;
        promo_code_code: string;
        deep_link_id?: string;
        deep_link_slug?: string;
    };
}
export type UERecord<K extends UE> = {
    user_event_name: K;
    user_event_props: EventPayloadMap[K];
};
export type UserEventInput = {
    [K in keyof EventPayloadMap]: UERecord<K>;
}[keyof EventPayloadMap];
export type UserEventInputNulls = UERecord<Exclude<UE, keyof EventPayloadMap>>;
export type AllUserEventInput = UserEventInput | UserEventInputNulls;
export type UserEventName = `${UE}`;
//# sourceMappingURL=userEventTypes.d.ts.map