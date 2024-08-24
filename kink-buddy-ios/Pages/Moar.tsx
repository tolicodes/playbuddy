import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Linking, StyleSheet, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type LinkItem = {
    id: string;
    title: string;
    url: string;
};

const links: LinkItem[] = [
    {
        id: '1', title: 'List of Organizers', url:
            'https://www.notion.so/bcc0be4e78bf47b0a593988fa5a4ec6f?v=ed152f9629a2457bbabb58bbaae42155&pvs=4'
    },
    // Add more links as needed
];

const getGoogleCalLink = () => {
    const icsUrl = 'http://kinkbuddy.org/.netlify/functions/events?format=ical';
    const encodedUrl = encodeURIComponent(icsUrl);
    const googleCalendarLink = `https://www.google.com/calendar/render?cid=${encodedUrl}`;

    return googleCalendarLink;
}

const getAddYourEventsLink = () => {

    const email = 'toli@toli.me';
    const subject = '[KinkBuddy] Add my event';
    const body = `Hi! I would like to add my event to the event scraper.%0A%0AMy Organization Name: %0AMy Website: %0AMy Eventbrite/Ticketing Platform: %0AExample Event: %0AAnything Else?%0A`;
    const mailtoURL = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${body}`;

    return mailtoURL;
}

const tools: LinkItem[] = [
    {
        id: '1', title: 'Import to Google Calendar', url:
            getGoogleCalLink()
    },
    {
        id: '2', title: 'Add Your Events', url:
            getAddYourEventsLink()
    },
];


const Moar: React.FC = () => {
    const handlePress = (url: string) => {
        Linking.openURL(url).catch((err) => console.error('An error occurred', err));
    };

    const renderItem = ({ item }: { item: LinkItem }) => (
        <TouchableOpacity onPress={() => handlePress(item.url)}>
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
            <Text>Got feedback?</Text>
            <Text>Want to add your event? </Text>

            <Text>Contact me at</Text>

            <TouchableOpacity onPress={() => Linking.openURL("mailto:toli@toli.me")}>
                <Text style={{ color: 'blue' }}>toli@toli.me</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    link: {
        fontSize: 18,
        color: 'blue',
        marginBottom: 15,
    },
    heading: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    }
});

export default Moar;

