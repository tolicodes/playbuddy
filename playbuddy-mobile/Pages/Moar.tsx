import React, { useCallback } from 'react';
import { Text, FlatList, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FAIcon from 'react-native-vector-icons/FontAwesome';

import { MISC_URLS } from '../config'
import { logEvent } from '../Common/hooks/logger';

type LinkItem = {
    id: string;
    title: string;
    url: string;
    icon: string; // Add icon field for each item
};

const links: LinkItem[] = [
    {
        id: '1',
        title: 'List of Organizers',
        url: 'https://www.notion.so/bcc0be4e78bf47b0a593988fa5a4ec6f?v=ed152f9629a2457bbabb58bbaae42155&pvs=4',
        icon: 'list-ul',
    },
    {
        id: '2',
        title: 'Kinky Ideas (List of Kinks)',
        url: 'https://playbuddy.me/kinks',
        icon: 'lightbulb-o',
    },
    {
        id: '3',
        title: 'Kinky Game',
        url: 'https://playbuddy.me/game',
        icon: 'gamepad',
    },
    {
        id: '4',
        title: 'The Exhibitionist Bible',
        url: 'https://tolicodes.notion.site/The-Exhibitionist-Bible-c0f5669da8794914ae62ed091f792139',
        icon: 'book',
    }
];

const getGoogleCalLink = () => {
    // logEvent('moar_get_google_cal_link');
    return MISC_URLS.addGoogleCalendar();
};

const getAddYourEventsLink = () => {
    const subject = encodeURIComponent('[PlayBuddy] Add my event');
    const body = encodeURIComponent(
        `Hi! I would like to add my event to the event scraper.\n\n` +
        `My Organization Name: \n` +
        `My Website: \n` +
        `My Eventbrite/Ticketing Platform: \n` +
        `Example Event:\n` +
        `Anything Else?`
    );

    // logEvent('moar_get_add_your_events_link');

    const mailtoLink = `mailto:support@playbuddy.me?subject=${subject}&body=${body}`;
    return mailtoLink;
};

const tools: LinkItem[] = [
    {
        id: '1',
        title: 'Import to Google Calendar',
        url: getGoogleCalLink(),
        icon: 'calendar',
    },
    {
        id: '2',
        title: 'Add Your Events',
        url: getAddYourEventsLink(),
        icon: 'plus-circle',
    },
];

const Moar: React.FC = () => {
    const handlePress = useCallback((url: string, title: string) => {
        logEvent('moar_link_clicked', { title });
        Linking.openURL(url);
    }, []);

    const renderItem = ({ item }: { item: LinkItem }) => (
        <TouchableOpacity style={styles.itemContainer} onPress={() => handlePress(item.url, item.title)}>
            <FAIcon name={item.icon} size={24} color="black" style={styles.icon} />
            <Text style={styles.link}>{item.title}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.heading}>Tools</Text>
            <FlatList
                data={tools}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
            />

            <Text style={styles.heading}>Resources</Text>
            <FlatList
                data={links}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
            />

            <Text style={styles.heading}>Get In Touch</Text>

            <Text style={styles.getInTouch}>Got feedback? Want to add your event?</Text>
            <Text style={styles.getInTouch}>Contact me at</Text>

            <TouchableOpacity onPress={() => {
                logEvent('moar_get_in_touch_click_email');
                Linking.openURL('mailto:support@playbuddy.me');
            }}>
                <Text style={{ color: 'blue', ...styles.getInTouch }}>support@playbuddy.me</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    itemContainer: {
        flexDirection: 'row', // Ensure icon and text are side by side
        alignItems: 'center',
        marginBottom: 15,
    },
    icon: {
        marginRight: 10,
        width: 24,
    },
    link: {
        fontSize: 18,
        color: 'blue',
    },
    heading: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    getInTouch: {
        fontSize: 18,
    }
});

export default Moar;
