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
        screen: 'Welcome' | 'Login Form' | 'Profile Details' | 'Profile';
    };
    // TODO: Move?
    'Profile': undefined;
    'Login': undefined;

    // Promotional & Events
    'PromoScreen': undefined;
    'Weekly Picks': undefined;
    'Popular Events': undefined;
    'Event Details': {
        selectedEvent: EventWithMetadata;
        title: string;
    };
    'Buddy Events': {
        buddyId: string;
    };

    'Munches': undefined;

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

}

export type NavStack = StackNavigationProp<NavStackProps>
