# Deep Link Flow

Should all be tested with logged in and out

## DeepLinkHandler.tsx

This fires when the app launches.

- `DeepLinkDetected` - fires on launch if a deep link is detected
- `DeepLinkAttributed` - if we have a `authUserId` it will be attributed. Otherwise will be attributed on profile save in `AuthProfileDetailsFormScreen.tsx`

## PromoScreen.tsx

This is the promo screen listing the discount when the app first launches with a deep link

- `PromoScreenViewed` - promo screen is viewed
- `PromoScreenPromoCodeCopied` - user copies the promo code
- `PromoScreenExploreClicked` - user clicks "Explore" (view organizer)
- `PromoScreenEventDetailsClicked` - user click "Event Details" (see single event)

## EventListItem.tsx

Appears in main cal view

- `EventListItemClicked`: They clicked the item, going to details

- `EventListItemTicketPressed`: ticket button or the whole element
- `EventListItemWishlistToggled`: Clicked the wishlist item
- `EventListItemSharePressed`: share is clicked

- `EventListItemDiscountModalOpened`
- `EventListItemPromoModalTicketPressed`: pressed in modal

## EventDetail.tsx

The event details page contains the promo code logic

- `EventDetailHeaderTitleClicked`: the header title is clicked (going to ticket)
- `EventDetailOrganizerClicked`: organizer is clicked
- `EventDetailGoogleCalendarClicked`: google cal is clicked
- `EventDetailGetTicketsClicked`: get tickets button or header is clicked
- `EventDetailTicketPressed`: specifically tickets button is clicked
- `EventDetailPromoCodeCopied`: promo code is copied in main view

Only Logged In

- `EventDetailWishlistToggled`: if wishlist button is clicked

## WelcomeScreen.tsx

When the user clicks on explore and eventually gets back to the welcome screen

- `WelcomeScreenRegisterClicked` - user click register
- `WelcomeScreenSkipped` - user skips the welcome screen

## AuthProfileDetailsFormScreen.tsx

This page is responsible for saving the profile details after the account is created

- `ProfileDetailsPressSave` - fires to indicate the profile is saved
- `ProfileInitialDeepLinkAssigned` - if there is a currentDeepLink (from the launch of the app), it will be saves as the `initial_deep_link`
