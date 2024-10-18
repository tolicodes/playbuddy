import { StackNavigationProp } from '@react-navigation/stack';
import { Event } from './commonTypes';

export type EventWithMetadata = Event & {
    organizerColor?: string;
    organizerPriority?: number;
}

export type NavStackProps = {
    'Calendar': undefined;
    'Wishlist': { share_code?: string };
    'Login': undefined;
    'Event Details': { selectedEvent: Event };
    'Filters': undefined;
    'Communities': undefined;
    'Moar': undefined;

    // Standalone Screens
    'User Profile': undefined;
    'Buddy Events': { buddyAuthUserId: string };
}

export type NavStack = StackNavigationProp<NavStackProps>