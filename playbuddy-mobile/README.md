Based

# App Documentation

This document provides an overview of the React Native application, explaining its structure, components, and functionalities.

## Table of Contents

- [App Documentation](#app-documentation)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [App Structure](#app-structure)
  - [Navigation](#navigation)
  - [Authentication](#authentication)
  - [Calendar and Events](#calendar-and-events)
  - [Wishlist and Swipe Mode](#wishlist-and-swipe-mode)
  - [Communities](#communities)
  - [Buddies](#buddies)
  - [Filters](#filters)
  - [Common Components](#common-components)
  - [Third-Party Integrations](#third-party-integrations)
  - [Conclusion](#conclusion)
  - [**Supabase Database Tables**](#supabase-database-tables)
  - [**API Endpoints**](#api-endpoints)
    - [**Events API**](#events-api)
    - [**Wishlist API**](#wishlist-api)
    - [**Communities API**](#communities-api)
    - [**Buddies API**](#buddies-api)
  - [**Supabase Storage**](#supabase-storage)
  - [**Analytics and Tracking**](#analytics-and-tracking)
  - [Navigation Architecture](#navigation-architecture)

## Introduction

The application is a React Native app designed to help users discover and manage events, connect with communities, and interact with buddies. It features calendar views, authentication, event details, wishlists, swipe mode planning, and community management.

## App Structure

The app follows a modular structure, separating concerns into different directories:

- **Auth**: Authentication components and context.
- **Calendar**: Calendar views, event listings, and related hooks.
- **Common**: Common components, contexts, and utilities.
- **Buddies**: Components and context related to buddy management.
- **Pages**: High-level screens like Wishlist, Communities, Organizers, etc.
- **Navigation**: Navigation setup using React Navigation.

## Navigation

The app uses React Navigation to handle navigation between screens. It includes:

- **Stack Navigator**: For screen transitions within a stack.
- **Tab Navigator**: For bottom tab navigation between major sections like Calendar, Wishlist, and Moar.
- **Drawer Navigator**: For side drawer navigation to access different sections and settings.

**Key Files:**

- `Nav.tsx`: Sets up the navigation structure.
- `DeepLinkHandler.tsx`: Handles deep linking into the app.

## Authentication

Authentication is managed using Supabase, with contexts and hooks to manage user state.

**Key Components:**

- `UserContext`: Provides authentication state throughout the app.
- `AuthMain.tsx`: Main authentication screen handling sign-in and sign-up.
- `AccountDetails.tsx`: Displays user account details and allows sign-out.

**Features:**

- Email and password authentication.
- User profile management.
- Avatar upload using Supabase Storage.

## Calendar and Events

The Calendar section allows users to view events in a calendar format.

**Key Components:**

- `EventCalendarView.tsx`: Calendar view displaying events.
- `CustomCalendarDay.tsx`: Custom day component for the calendar.
- `EventList.tsx`: Lists events for a selected day.
- `EventDetail.tsx`: Displays detailed information about a selected event.

**Features:**

- Interactive calendar with event dots.
- Event searching and filtering.
- Event details with images and descriptions.

## Wishlist and Swipe Mode

Users can manage their event wishlist and plan events using a swipe interface.

**Key Components:**

- `Wishlist.tsx`: Displays events added to the user's wishlist.
- `Planner.tsx`: Swipe mode interface for event planning.

**Features:**

- Add or remove events from the wishlist.
- Swipe left or right to plan events.
- Synchronization of wishlist with the backend.

## Communities

The app allows users to join and manage communities.

**Key Components:**

- `CommunitiesScreen.tsx`: Main screen for community interactions.
- `CommunityDropdown.tsx`: Dropdown to select or switch communities.

**Features:**

- Join communities using a code.
- View and manage joined communities.
- Handle pending requests for community membership.

## Buddies

Users can connect with buddies to share events and interact.

**Key Components:**

- `BuddiesMain.tsx`: Main screen for buddy interactions.
- `AddBuddy.tsx`: Allows users to add buddies via QR code.
- `SharedEvents.tsx`: Displays events shared with buddies.

**Features:**

- Add buddies by scanning QR codes.
- View and manage buddy lists.
- Share events with buddies.

## Filters

The app provides filtering options to customize event views.

**Key Components:**

- `Filters.tsx`: Main filters screen.
- `OrganizerMultiSelect.tsx`: Multi-select dropdown for organizers.
- `SubmitButtons.tsx`: Reset and apply filter buttons.

**Features:**

- Filter events by organizers.
- Search functionality within filters.
- Reset filters to default state.

## Common Components

Several common components are used across the app for consistency.

**Key Components:**

- `HeaderLoginButton.tsx`: Login button in the header.
- `WebsiteBanner.tsx`: Banner prompting users to log in.
- `Avatar.tsx`: User avatar component.

**Features:**

- Reusable UI components.
- Consistent styling and behavior.
- Shared contexts for data management.

## Third-Party Integrations

The app integrates with several third-party services:

- **Supabase**: For authentication, database, and storage.
- **Amplitude**: For analytics and event tracking.
- **Sentry**: For error tracking and monitoring.
- **React Native Elements and Paper**: For UI components.

## Conclusion

This app provides a comprehensive platform for users to discover events, manage their schedules, connect with communities, and interact with buddies. The modular structure and use of contexts and hooks make the app scalable and maintainable.

---

**Note:** For detailed information on each component and function, please refer to the corresponding files in the codebase.

Here’s a structured mapping of your API and Supabase setup based on the existing code and inferred schema:

## **Supabase Database Tables**

1. **Users Table**

   - `id` (UUID): Unique identifier for each user.
   - `email`: User email used for authentication.
   - `display_name`: User’s chosen display name.
   - `avatar_url`: URL for the user's profile picture (stored in Supabase Storage).

2. **Events Table**

   - `id` (UUID): Unique identifier for each event.
   - `name`: Name of the event.
   - `description`: Detailed description of the event.
   - `start_date`: Event start date and time.
   - `end_date`: Event end date and time.
   - `location`: Location of the event.
   - `lat`: Latitude for event location (for map functionality).
   - `lon`: Longitude for event location.
   - `price`: Price of the event (could be free or paid).
   - `event_url`: External URL for more event details or tickets.
   - `recurring`: Recurrence information (`none`, `weekly`, `monthly`).
   - `tags`: Array of event tags or categories.
   - `image_url`: URL for the event image (stored in Supabase Storage).
   - `type`: Defines if it’s an `event` or `retreat`.
   - `organizer_id`: Foreign key linking to the `Organizers` table.
   - `source_ticketing_platform`: Platform where tickets are sold (e.g., Eventbrite, Plura).
   - `source_origination_platform`: Platform where the event originated (e.g., WhatsApp, Organizer API).
   - `communities[]`: Array of associated communities (linked to `Communities` table).

3. **Organizers Table**

   - `id` (UUID): Unique identifier for each organizer.
   - `name`: Organizer name.
   - `description`: Description of the organizer.
   - `visibility`: Visibility status (`public`, `private`).
   - `type`: Type of the community managed by the organizer (`organizer_public_community`, `organizer_private_community`).

4. **Communities Table**

   - `id` (UUID): Unique identifier for the community.
   - `name`: Community name.
   - `code`: Unique join code for the community.
   - `type`: Defines community type (`interest_group`, `organizer_public_community`, `organizer_private_community`, `private_community`).
   - `organizer_id`: Foreign key linking to `Organizers`.
   - `description`: Description of the community.

5. **Location Areas Table**

   - `id` (UUID): Unique identifier for the location area.
   - `name`: Name of the area (e.g., city, region).
   - `code`: Unique code for the location area.

6. **Wishlist Events Table**

   - `id` (UUID): Unique identifier for each wishlist entry.
   - `user_id`: Foreign key linking to `Users`.
   - `event_id`: Foreign key linking to `Events`.
   - `is_friend_wishlist`: Boolean indicating if it’s a friend’s wishlist.

7. **Buddies Table**

   - `id` (UUID): Unique identifier for each buddy relationship.
   - `user_id`: The ID of the user who adds the buddy.
   - `buddy_user_id`: The ID of the buddy being added (foreign key linking to `Users`).

8. **Buddy Lists Table**

   - `id` (UUID): Unique identifier for each buddy list.
   - `user_id`: The ID of the user who owns the buddy list.
   - `name`: Name of the buddy list.
   - `buddy_list_buddies`: Array of buddies within the list.

9. **Pending Requests Table**

   - `id` (UUID): Unique identifier for each pending request.
   - `community_id`: Foreign key linking to the `Communities` table.
   - `email`: Email of the user requesting to join.
   - `status`: Current status of the request (`pending`, `approved`, `rejected`).

10. **Buddies to Buddy Lists Table**

- `id` (UUID): Unique identifier for each buddy in a buddy list.
- `buddy_list_id`: Foreign key linking to `Buddy Lists`.
- `buddy_id`: Foreign key linking to `Buddies`.

---

## **API Endpoints**

### **Events API**

- `GET /events`: Fetches all events.
- `GET /events/:id`: Fetches details of a specific event.
- `POST /events`: Creates a new event (requires authentication).
- `PUT /events/:id`: Updates an event (organizer permissions required).
- `DELETE /events/:id`: Deletes an event.

### **Wishlist API**

- `GET /wishlist`: Fetches events on the user’s wishlist.
- `POST /wishlist`: Adds an event to the wishlist.
- `DELETE /wishlist/:id`: Removes an event from the wishlist.

### **Communities API**

- `GET /communities/public`: Fetches public communities.
- `GET /communities/my`: Fetches communities the user has joined.
- `POST /communities/join`: Joins a community (via join code).
- `POST /communities/leave`: Leaves a community.

### **Buddies API**

- `GET /buddies`: Fetches the user’s buddies.
- `POST /buddies`: Adds a buddy (by user ID or QR code).
- `GET /buddy-lists`: Fetches the user’s buddy lists.
- `POST /buddy-lists`: Creates a new buddy list.
- `POST /buddy-lists/add`: Adds a buddy to a buddy list.

---

## **Supabase Storage**

- **Event Images**: Events upload images to the `event-images` storage bucket.
- **User Avatars**: Users upload avatars to the `avatars` storage bucket.

---

## **Analytics and Tracking**

- **Amplitude**: Used for event and user activity tracking.
- **Sentry**: Error monitoring for app crashes and issues.

---

This structure covers the core data entities and API interactions for managing users, events, communities, buddies, and related functionalities.

## Navigation Architecture

NavigationContainer
• wraps the whole tree and lives in Common/Nav/Nav.tsx.
Drawer Navigator – Common/Nav/DrawerNav.tsx
Routes shown in the side-drawer:
‑ HomeDrawer → HomeStackNavigator (main app)
‑ Profile / Login (decided by isDefaultsComplete)
‑ Festivals/Conferences/Retreats
‑ Moar
Home Stack – Common/Nav/HomeNavigator.tsx
‑ Home → TabNavigator (bottom tabs)
‑ AuthNav (authentication flow)
‑ PromoScreen
‑ Weekly Picks
‑ Event Details (details page)
‑ Community Events
Auth Stack – Pages/Auth/screens/AuthNav.tsx
‑ Welcome
‑ Login Form
‑ Profile Details
‑ Profile
Bottom-Tab Navigator – Common/Nav/TabNavigator.tsx
Tabs (each is a screen in the Home Stack):
‑ Calendar (event calendar view)
‑ My Calendar
‑ Organizers → its own nested stack (Pages/Organizers/OrganizersNav.tsx)
‑ Swipe Mode
Key points • Drawer is the true app “root” after the NavigationContainer.
• The Home stack handles initial deep-link / auth gating, then lands on the tab bar.
• Every header is configured via headerOptions in Common/Header/Header.tsx, which automatically decides whether to show a back button or a drawer button depending on whether the screen is a root-level one.
