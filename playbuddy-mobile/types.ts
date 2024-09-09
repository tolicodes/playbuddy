import { StackNavigationProp } from '@react-navigation/stack';
import { Event } from './commonTypes';

export type EventWithMetadata = Event & {
    organizerColor?: string;
    organizerPriority?: number;
}

export type NavStackProps = {
    'Calendar': undefined;
    'Wishlist': { shareCode?: string };
    'Login': undefined;
    'Event Details': { selectedEvent: Event };
    'Filters': undefined;
    'Communities': undefined;
    'Moar': undefined;
}

export type NavStack = StackNavigationProp<NavStackProps>