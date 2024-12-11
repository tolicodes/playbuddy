import { StackNavigationProp } from '@react-navigation/stack';
import { Event } from '../../commonTypes';

export type EventWithMetadata = Event & {
    organizerColor?: string;
    organizerPriority?: number;
}

export type NavStackProps = {
    // Starts with Drawer as root

    'Home': undefined;
    // Switch between Promo, Auth, and TabNav
    'HomeScreen': undefined;
    'Main Calendar': undefined;

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

    // Details Stack
    'Details': {
        screen: 'Event Details',
        params: { selectedEvent: Event }
    } | {
        screen: 'Community Events',
        params: { communityId: string }
    } | {
        screen: 'Buddy Events',
        params: { buddyAuthUserId: string }
    } | {
        screen: 'Filters',
    };

}

export type NavStack = StackNavigationProp<NavStackProps>