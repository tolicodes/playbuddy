import type { StackNavigationProp } from '@react-navigation/stack';
import type { Event } from '../../commonTypes';

export type EventWithMetadata = Event & {
    organizerColor?: string;
    organizerPriority?: number;
}

export type NavStackProps = {
    // Root Navigation
    'Home': undefined;

    // Tab Navigation
    'Calendar': undefined;
    'My Calendar': undefined;
    'Swipe Mode': undefined;

    // Organization & Community
    'Organizers': {
        screen: 'My Organizers' | 'My Events' | 'Follow Organizers';
    };
    'Community Events': {
        communityId: string;
        communityIds?: string[];
        displayName?: string;
        title?: string;
        organizerId?: string;
    };

    // Authentication & Profile
    'AuthNav': {
        screen: 'Welcome' | 'Login Form';
    };
    // TODO: Move?
    'Profile Details': undefined;
    'Profile': undefined;
    'Consent': {
        source?: 'signup' | 'settings';
    };
    'Login': undefined;
    'Notifications': undefined;
    'Debug': undefined;

    // Promotional & Events
    'Promos': undefined;
    'PromoScreen': undefined;
    'Weekly Picks': undefined;
    'Weekly Picks Admin': undefined;
    'Analytics Admin': undefined;
    'Promo Codes Admin': undefined;
    'Popular Events': undefined;
    'Admin': undefined;
    'Import URLs': undefined;
    'Organizer Admin': undefined;
    'Event Admin': undefined;
    'Event Popups Admin': undefined;
    'Push Notifications Admin': undefined;
    'Event Details': {
        selectedEvent: EventWithMetadata;
        title: string;
    };
    'Buddy List': {
        promptBuddyName?: string;
        promptBuddyId?: string;
    } | undefined;
    'Buddy Events': {
        buddyId: string;
        buddyName?: string;
    };

    'Munches': undefined;
    'Play Parties': undefined;

    'Munch Details': {
        munchId: string;
    };

    'Facilitators': undefined;
    'Facilitator Profile': {
        facilitatorId: string;
        title?: string;
    };

    // Other Sections
    'Retreats': undefined;
    'Moar': undefined;
    'Discover Game': undefined;
    'Submit Event': undefined;

}

export type NavStack = StackNavigationProp<NavStackProps>
