import { StackNavigationProp } from '@react-navigation/stack';
import { Event } from './commonTypes';

export type EventWithMetadata = Event & {
    organizerColor?: string;
    organizerPriority?: number;
}

export type NavStackProps = {
    'Main Calendar': undefined;

    // Standalone
    'Event Details': { selectedEvent: Event };
    'Community Events': { communityId: string };
    'Buddy Events': { buddyAuthUserId: string };
    'Filters': undefined;

    // Tab Screens
    'Calendar': undefined;
    // Also in drawer
    'My Calendar': { share_code?: string }
    'Swipe Mode': undefined;



    // Drawer Screens
    // aka calendar
    'Home': undefined;
    'Buddies': undefined;
    'Communities': undefined;
    'Retreats': undefined;
    'Login': undefined;
    'User Profile': undefined;
    'Moar': undefined;

    // Communities Nav
    'My Communities': undefined;
    'My Events': undefined;
    'Join Community': undefined;
}

export type NavStack = StackNavigationProp<NavStackProps>