import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FAIcon from 'react-native-vector-icons/FontAwesome';

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
        icon: 'list-ul', // FontAwesome icon
    },
    {
        id: '2',
        title: 'Kinky Ideas (List of Kinks)',
        url: 'https://kinkbuddy.org/kinks',
        icon: 'lightbulb-o',
    },
    {
        id: '3',
        title: 'Kinky Game',
        url: 'https://kinkbuddy.org/game',
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
    const icsUrl = 'http://api.kinkbuddy.org/events?format=ical';
    const encodedUrl = encodeURIComponent(icsUrl);
    const googleCalendarLink = `https://www.google.com/calendar/render?cid=${encodedUrl}`;

    return googleCalendarLink;
};

const getAddYourEventsLink = () => {
    const subject = encodeURIComponent('[KinkBuddy] Add my event');
    const body = encodeURIComponent(
        `Hi! I would like to add my event to the event scraper.\n\n` +
        `My Organization Name: \n` +
        `My Website: \n` +
        `My Eventbrite/Ticketing Platform: \n` +
        `Example Event:\n` +
        `Anything Else?`
    );

    const mailtoLink = `mailto:toli@toli.me?subject=${subject}&body=${body}`;
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
    const handlePress = (url: string) => {
        Linking.openURL(url).catch((err) => console.error('An error occurred', err));
    };

    const renderItem = ({ item }: { item: LinkItem }) => (
        <TouchableOpacity style={styles.itemContainer} onPress={() => handlePress(item.url)}>
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

            <TouchableOpacity onPress={() => Linking.openURL('mailto:toli@toli.me')}>
                <Text style={{ color: 'blue', ...styles.getInTouch }}>toli@toli.me</Text>
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
