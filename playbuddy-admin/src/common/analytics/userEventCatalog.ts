import { UE } from "../types/userEventTypes";

export type UserEventStateConfig = {
  key: string;
  type: "string" | "boolean" | "number";
  labelMap?: Record<string, string>;
  trueLabel?: string;
  falseLabel?: string;
};

export type UserEventMeta = {
  event: UE;
  category: string;
  name: string;
  state?: UserEventStateConfig;
};

const C = {
  auth: "Auth",
  profile: "Profile",
  onboarding: "Onboarding",
  calendar: "Calendar",
  dateBar: "Date Bar",
  filters: "Filters",
  eventDetail: "Event Detail",
  eventList: "Event List",
  communities: "Communities",
  deepLinks: "Deep Links",
  navigation: "Navigation",
  promo: "Promo & Marketing",
  notifications: "Notifications",
  swipe: "Swipe Mode",
  media: "Media",
  facilitators: "Facilitators",
  weeklyPicks: "Weekly Picks",
  munches: "Munches",
  discover: "Discover",
  tags: "Tags",
  attendees: "Attendees",
} as const;

const S = {
  entityToAccess: { key: "entity_to_access", type: "string" } as const,
  tabName: { key: "tab_name", type: "string" } as const,
  tab: { key: "tab", type: "string" } as const,
  communityId: { key: "community_id", type: "string" } as const,
  deepLinkSource: {
    key: "source",
    type: "string",
    labelMap: {
      branch: "Branch",
      clipboard: "Clipboard",
      cold_start: "Cold start",
    },
  } as const,
  calendarEntity: { key: "entity", type: "string" } as const,
  calendarDay: { key: "day", type: "string" } as const,
  calendarExpanded: { key: "expanded", type: "boolean", trueLabel: "Expanded", falseLabel: "Collapsed" } as const,
  filterTag: { key: "tag_name", type: "string" } as const,
  filterSearch: { key: "search_text", type: "string" } as const,
  followSource: { key: "source", type: "string" } as const,
  wishlistToggle: { key: "is_on_wishlist", type: "boolean", trueLabel: "Added", falseLabel: "Removed" } as const,
  moarLink: { key: "link_name", type: "string" } as const,
  weeklyIndex: { key: "index", type: "number" } as const,
  screenName: { key: "screen_name", type: "string" } as const,
  menuItem: { key: "menu_item", type: "string" } as const,
  mediaEntity: { key: "entity_type", type: "string" } as const,
  tagEntity: { key: "entity_type", type: "string" } as const,
  munchTab: { key: "tab", type: "string" } as const,
} as const;

export const USER_EVENT_CATALOG: UserEventMeta[] = [
  // Auth
  { event: UE.AuthEmailLoginPressSignupWithEmail, category: C.auth, name: "Signup with email" },
  { event: UE.AuthEmailLoginPressLoginWithEmail, category: C.auth, name: "Login with email" },
  { event: UE.LoginFormPressLoginWithGoogle, category: C.auth, name: "Login with Google" },
  { event: UE.LoginFormPressLoginWithApple, category: C.auth, name: "Login with Apple" },
  { event: UE.LoginFormPressLoginWithPhone, category: C.auth, name: "Login with phone" },
  { event: UE.LoginFormPressLoginWithPhoneSendOTP, category: C.auth, name: "Send phone OTP" },
  { event: UE.LoginBannerClicked, category: C.auth, name: "Login banner clicked" },
  { event: UE.LoginToAccessButtonClicked, category: C.auth, name: "Login to access button", state: S.entityToAccess },
  { event: UE.HeaderLoginButtonClicked, category: C.auth, name: "Header login button", state: S.entityToAccess },

  // Profile + Onboarding
  { event: UE.AccountProfileDetailsFormPressSave, category: C.profile, name: "Save profile details" },
  { event: UE.AccountProfileDetailsFormPressSignOut, category: C.profile, name: "Sign out from profile details" },
  { event: UE.AuthProfilePressSignOut, category: C.profile, name: "Sign out" },
  { event: UE.AuthProfilePressDeleteAccount, category: C.profile, name: "Delete account" },
  { event: UE.AuthProfilePressHome, category: C.profile, name: "Go home from profile" },
  { event: UE.AuthProfilePressSupport, category: C.profile, name: "Open support from profile" },
  { event: UE.ProfileDetailsPressSave, category: C.profile, name: "Profile details saved" },
  { event: UE.AvatarPressPickImage, category: C.profile, name: "Pick avatar image" },
  { event: UE.AvatarUploadCompleted, category: C.profile, name: "Avatar upload completed" },
  { event: UE.AvatarUploadFailed, category: C.profile, name: "Avatar upload failed" },
  { event: UE.AvatarUploadStarted, category: C.profile, name: "Avatar upload started" },
  { event: UE.WelcomeScreenRegisterClicked, category: C.onboarding, name: "Welcome register clicked" },
  { event: UE.WelcomeScreenSkipped, category: C.onboarding, name: "Welcome skipped" },
  { event: UE.PersonalizationModalConfirmed, category: C.onboarding, name: "Personalization confirmed" },
  { event: UE.OrganizerFirstFollowed, category: C.onboarding, name: "First organizer followed", state: S.followSource },
  { event: UE.WishlistFirstAdded, category: C.onboarding, name: "First wishlist added" },

  // Calendar
  { event: UE.EventCalendarViewFiltersEnabled, category: C.calendar, name: "Calendar filters enabled", state: S.calendarEntity },
  { event: UE.EventCalendarViewFiltersDisabled, category: C.calendar, name: "Calendar filters disabled", state: S.calendarEntity },
  { event: UE.EventCalendarViewFiltersSet, category: C.calendar, name: "Calendar filters set", state: S.calendarEntity },
  { event: UE.EventCalendarViewExpand, category: C.calendar, name: "Calendar view expanded", state: S.calendarEntity },
  { event: UE.EventCalendarViewToday, category: C.calendar, name: "Calendar view today", state: S.calendarEntity },
  { event: UE.EventCalendarViewGoogleCalendar, category: C.calendar, name: "Calendar add to Google", state: S.calendarEntity },
  { event: UE.EventCalendarViewGoToPrev, category: C.calendar, name: "Calendar previous", state: S.calendarEntity },
  { event: UE.EventCalendarViewGoToNext, category: C.calendar, name: "Calendar next", state: S.calendarEntity },
  { event: UE.EventCalendarViewSelectDay, category: C.calendar, name: "Calendar day selected", state: S.calendarDay },
  { event: UE.EventCalendarViewGoToToday, category: C.calendar, name: "Calendar go to today", state: S.calendarEntity },
  { event: UE.EventCalendarViewSearchChanged, category: C.calendar, name: "Calendar search changed", state: S.calendarEntity },
  { event: UE.MyCalendarShareWishlistClick, category: C.calendar, name: "Share wishlist clicked" },

  // Date Bar
  { event: UE.DateBarSwipePrev, category: C.dateBar, name: "Date bar swipe previous", state: S.calendarEntity },
  { event: UE.DateBarSwipeNext, category: C.dateBar, name: "Date bar swipe next", state: S.calendarEntity },
  { event: UE.DateBarLongPress, category: C.dateBar, name: "Date bar long press", state: S.calendarDay },
  { event: UE.DateBarCalendarPressed, category: C.dateBar, name: "Date bar calendar pressed", state: S.calendarExpanded },
  { event: UE.DateBarTodayPressed, category: C.dateBar, name: "Date bar today pressed", state: S.calendarEntity },

  // Filters
  { event: UE.FilterTagSelected, category: C.filters, name: "Filter tag selected", state: S.filterTag },
  { event: UE.FilterSearchChanged, category: C.filters, name: "Filter search changed", state: S.filterSearch },
  { event: UE.FilterSearchFocused, category: C.filters, name: "Filter search focused", state: S.calendarEntity },
  { event: UE.FilterSearchTyped, category: C.filters, name: "Filter search typed", state: S.filterSearch },
  { event: UE.FilterMorePressed, category: C.filters, name: "Filter more pressed", state: S.calendarEntity },
  { event: UE.FilterTagAdded, category: C.filters, name: "Filter tag added", state: S.filterTag },

  // Event Detail
  { event: UE.EventDetailGetTicketsClicked, category: C.eventDetail, name: "Get tickets clicked" },
  { event: UE.EventDetailGoogleCalendarClicked, category: C.eventDetail, name: "Add to Google Calendar" },
  { event: UE.EventDetailLinkClicked, category: C.eventDetail, name: "Event link clicked" },
  { event: UE.EventDetailOrganizerClicked, category: C.eventDetail, name: "Organizer clicked" },
  { event: UE.EventDetailPromoCodeCopied, category: C.eventDetail, name: "Promo code copied" },
  { event: UE.EventDetailTicketPressed, category: C.eventDetail, name: "Ticket pressed" },
  { event: UE.EventDetailWishlistToggled, category: C.eventDetail, name: "Wishlist toggled", state: S.wishlistToggle },
  { event: UE.EventDetailHeaderTitleClicked, category: C.eventDetail, name: "Header title clicked" },

  // Event List
  { event: UE.EventListItemClicked, category: C.eventList, name: "Event card clicked" },
  { event: UE.EventListItemDiscountModalOpened, category: C.eventList, name: "Discount modal opened (list)" },
  { event: UE.EventListItemTicketPressed, category: C.eventList, name: "Ticket pressed (list)" },
  { event: UE.EventListItemWishlistToggled, category: C.eventList, name: "Wishlist toggled (list)", state: S.wishlistToggle },
  { event: UE.EventListItemSharePressed, category: C.eventList, name: "Share pressed (list)" },
  { event: UE.EventListItemPromoModalTicketPressed, category: C.eventList, name: "Ticket pressed (promo modal)" },
  { event: UE.EventListItemPromoModalPromoCopied, category: C.eventList, name: "Promo code copied (list modal)" },

  // Attendees
  { event: UE.AttendeeAvatarCarouselPress, category: C.attendees, name: "Attendee avatar pressed" },

  // Communities
  { event: UE.CommunityTabNavigatorTabClicked, category: C.communities, name: "Community tab clicked", state: S.tabName },
  { event: UE.MyCommunitiesNavigateToAllOrganizers, category: C.communities, name: "Navigate to all organizers" },
  { event: UE.CommunityEventsCommunityJoined, category: C.communities, name: "Community joined (events)", state: S.communityId },
  { event: UE.CommunityListCommunityJoined, category: C.communities, name: "Community joined (list)", state: S.communityId },
  { event: UE.CommunityListCommunityLeft, category: C.communities, name: "Community left", state: S.communityId },
  { event: UE.CommunityListNavigateToCommunityEvents, category: C.communities, name: "Open community events", state: S.communityId },
  { event: UE.CommunityListNavigateToJoinCommunityButtonPressed, category: C.communities, name: "Join community button" },
  { event: UE.OrganizerFollowPressed, category: C.communities, name: "Organizer followed", state: S.followSource },

  // Deep Links
  { event: UE.DeepLinkAttributed, category: C.deepLinks, name: "Deep link attributed" },
  { event: UE.DeepLinkDetected, category: C.deepLinks, name: "Deep link detected", state: S.deepLinkSource },
  { event: UE.ProfileInitialDeepLinkAssigned, category: C.deepLinks, name: "Initial deep link assigned" },

  // Navigation
  { event: UE.HeaderBackButtonClicked, category: C.navigation, name: "Header back button" },
  { event: UE.HeaderDrawerButtonClicked, category: C.navigation, name: "Header drawer button" },
  { event: UE.TabNavigatorTabClicked, category: C.navigation, name: "Tab navigator tab clicked", state: S.tabName },
  { event: UE.DrawerItemPressed, category: C.navigation, name: "Drawer item pressed", state: S.screenName },

  // Promo & Marketing
  { event: UE.MoarGetAddYourEventsLink, category: C.promo, name: "Get add your events link" },
  { event: UE.MoarGetGoogleCalLink, category: C.promo, name: "Get Google Calendar link" },
  { event: UE.MoarGetInTouchClickEmail, category: C.promo, name: "Get in touch email clicked" },
  { event: UE.MoarLinkClicked, category: C.promo, name: "Moar link clicked", state: S.moarLink },
  { event: UE.PromoScreenViewed, category: C.promo, name: "Promo screen viewed" },
  { event: UE.PromoScreenPromoCodeCopied, category: C.promo, name: "Promo screen promo copied" },
  { event: UE.PromoScreenExploreClicked, category: C.promo, name: "Promo screen explore clicked" },
  { event: UE.PromoScreenEventDetailsClicked, category: C.promo, name: "Promo event details clicked" },
  { event: UE.EdgePlayGroupModalDismissed, category: C.promo, name: "EdgePlay modal dismissed" },
  { event: UE.EdgePlayGroupModalOpenWhatsapp, category: C.promo, name: "EdgePlay open WhatsApp" },
  { event: UE.RateAppModalOpenStore, category: C.promo, name: "Rate app open store" },
  { event: UE.NewsletterSignupModalDismissed, category: C.promo, name: "Newsletter modal dismissed" },
  { event: UE.NewsletterSignupModalOpenSignup, category: C.promo, name: "Newsletter signup opened" },

  // Notifications
  { event: UE.NotificationsApprovalGranted, category: C.notifications, name: "Notifications approved" },

  // Swipe Mode
  { event: UE.SwipeModeMoreInfoClick, category: C.swipe, name: "Swipe mode more info" },
  { event: UE.SwipeModeSwipeLeft, category: C.swipe, name: "Swipe left" },
  { event: UE.SwipeModeSwipeRight, category: C.swipe, name: "Swipe right" },
  { event: UE.SwipeModeBottomPressLeft, category: C.swipe, name: "Bottom press left" },
  { event: UE.SwipeModeBottomPressRight, category: C.swipe, name: "Bottom press right" },
  { event: UE.SwipeModeUndo, category: C.swipe, name: "Swipe undo" },

  // Media
  { event: UE.MediaCarouselOpenMedia, category: C.media, name: "Media opened", state: S.mediaEntity },
  { event: UE.MediaCarouselToggleMute, category: C.media, name: "Media toggle mute", state: S.mediaEntity },
  { event: UE.MediaCarouselClose, category: C.media, name: "Media closed", state: S.mediaEntity },

  // Facilitators
  { event: UE.FacilitatorsTabChange, category: C.facilitators, name: "Facilitators tab changed", state: S.tab },
  { event: UE.FacilitatorListFollowFacilitator, category: C.facilitators, name: "Follow facilitator (list)" },
  { event: UE.FacilitatorListUnfollowFacilitator, category: C.facilitators, name: "Unfollow facilitator (list)" },
  { event: UE.FacilitatorsProfileTabChange, category: C.facilitators, name: "Facilitators profile tab", state: S.tab },
  { event: UE.FacilitatorsProfileIntroVideoPressed, category: C.facilitators, name: "Intro video pressed" },
  { event: UE.FacilitatorsProfileIntroVideoClosed, category: C.facilitators, name: "Intro video closed" },
  { event: UE.FacilitatorsProfileFetlifePressed, category: C.facilitators, name: "Fetlife pressed" },
  { event: UE.FacilitatorsProfileWebsitePressed, category: C.facilitators, name: "Website pressed" },
  { event: UE.FacilitatorsProfileEmailPressed, category: C.facilitators, name: "Email pressed" },
  { event: UE.FacilitatorsProfileBookSessionPressed, category: C.facilitators, name: "Book session pressed" },
  { event: UE.FacilitatorListOpenFacilitatorProfile, category: C.facilitators, name: "Open facilitator profile" },
  { event: UE.FacilitatorsProfileUnfollowPressed, category: C.facilitators, name: "Unfollow facilitator (profile)" },
  { event: UE.FacilitatorsProfileFollowPressed, category: C.facilitators, name: "Follow facilitator (profile)" },

  // Weekly Picks
  { event: UE.WeeklyPicksEventDetailsClicked, category: C.weeklyPicks, name: "Weekly picks event clicked" },
  { event: UE.WeeklyPicksPrevWeekClicked, category: C.weeklyPicks, name: "Weekly picks previous week", state: S.weeklyIndex },
  { event: UE.WeeklyPicksNextWeekClicked, category: C.weeklyPicks, name: "Weekly picks next week", state: S.weeklyIndex },

  // Munches
  { event: UE.MunchesListNavigateToMunchDetail, category: C.munches, name: "Munch detail opened" },
  { event: UE.MunchDetailsTabSelected, category: C.munches, name: "Munch tab selected", state: S.munchTab },

  // Discover
  { event: UE.DiscoverPageMenuItemPressed, category: C.discover, name: "Discover menu item pressed", state: S.menuItem },
  { event: UE.DiscoverGameHideTourPressed, category: C.discover, name: "Discover game hide tour" },
  { event: UE.DiscoverGameCreateAccountPressed, category: C.discover, name: "Discover game create account" },
  { event: UE.DiscoverEventsMoreInfoClicked, category: C.discover, name: "Discover events more info" },

  // Tags
  { event: UE.TagPress, category: C.tags, name: "Tag pressed", state: S.tagEntity },
];

const META_MAP = new Map<UE, UserEventMeta>(USER_EVENT_CATALOG.map((entry) => [entry.event, entry]));

export const USER_EVENT_NAMES = USER_EVENT_CATALOG.map((entry) => entry.event);
export const USER_EVENT_STATE_EVENTS = USER_EVENT_CATALOG.filter((entry) => entry.state).map((entry) => entry.event);

const normalizeString = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
};

export const getUserEventMeta = (eventName: string) => {
  return META_MAP.get(eventName as UE) ?? null;
};

export const getUserEventDisplayName = (eventName: string) => {
  return getUserEventMeta(eventName)?.name ?? eventName;
};

export const getUserEventCategory = (eventName: string) => {
  return getUserEventMeta(eventName)?.category ?? "Other";
};

export const getUserEventStateLabel = (eventName: string, props?: Record<string, unknown>) => {
  const meta = getUserEventMeta(eventName);
  const state = meta?.state;
  if (!state) return null;

  const value = props?.[state.key];
  if (value === null || value === undefined || value === "") return "Unknown";
  if (state.type === "boolean") {
    const normalized = value === true || value === "true" || value === 1 || value === "1";
    return normalized ? (state.trueLabel || "True") : (state.falseLabel || "False");
  }

  const str = normalizeString(value);
  if (!str) return "Unknown";
  if (state.labelMap && state.labelMap[str]) return state.labelMap[str];
  return str;
};
