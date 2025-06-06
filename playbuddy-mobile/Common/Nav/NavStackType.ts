import { StackNavigationProp } from '@react-navigation/stack';
import { Event } from '../../commonTypes';

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
        screen: 'My Communities' | 'My Events' | 'Join Community';
    };
    'Community Events': {
        communityId: string;
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
    'Event Details': {
        selectedEvent: EventWithMetadata;
    };
    'Buddy Events': {
        buddyId: string;
    };

    'Munches': undefined;

    'Munch Details': {
        munchId: string;
    };

    // Other Sections
    'Retreats': undefined;
    'Moar': undefined;

}

export type NavStack = StackNavigationProp<NavStackProps>