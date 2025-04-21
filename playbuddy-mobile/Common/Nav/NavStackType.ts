import { StackNavigationProp } from '@react-navigation/stack';
import { Event } from '../../commonTypes';

export type EventWithMetadata = Event & {
    organizerColor?: string;
    organizerPriority?: number;
}

export type NavStackProps = {
    // Starts with Drawer as root

    'Home': undefined;
    'Calendar': undefined;

    'Swipe Mode': undefined;
    'My Calendar': { share_code?: string }
    'Organizers': {
        screen: 'My Communities' | 'My Events' | 'Join Community';
    }
    'Buddies': {
        screen: 'Add Buddy' | 'Shared Events' | 'My Buddies' | 'Buddy Lists';
    };
    'Communities': {
        screen: 'My Communities' | 'My Events' | 'Join Community';
    }
    'Profile': undefined;
    'Auth': undefined;
    'Retreats': undefined;
    'Moar': undefined;

    'Event Details': {
        selectedEvent: Event
    };
    'Community Events': {
        communityId: string
    };
    'Buddy Events': {
        buddyAuthUserId: string
    };
    'Filters': undefined;
    'PromoScreen': undefined;

}

export type NavStack = StackNavigationProp<NavStackProps>