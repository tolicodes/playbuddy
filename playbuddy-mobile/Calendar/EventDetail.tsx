import React from 'react';
import moment from 'moment';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, ScrollView, Button } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Markdown from 'react-native-markdown-display';
import * as amplitude from '@amplitude/analytics-react-native';
import { WebView } from 'react-native-webview';

const VideoPlayer = ({ uri }: { uri: string }) => {
    return (<WebView
        style={styles.video}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        source={{ uri }}
    />)
};

const formatPrice = (price: string) => {
    // blank
    if (!price) return '';

    // Free event
    if (price === '0') return 'Free';

    // Attempt to convert to number
    const numericPrice = parseFloat(price);

    // If conversion fails, return the original string
    if (isNaN(numericPrice)) {
        return price;
    }

    // Format as USD currency
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numericPrice);
};


export const EventDetail = ({ route }: any) => {
    const selectedEvent = route?.params?.selectedEvent;

    if (!selectedEvent) return

    const formattedPrice = formatPrice(selectedEvent.price);

    return (
        <ScrollView>

            {
                selectedEvent.video_url
                    ? <VideoPlayer uri={selectedEvent.video_url} />
                    : <Image source={{ uri: selectedEvent.image_url }} style={styles.fullViewImage} />
            }

            <View style={{ padding: 20 }}>
                <TouchableOpacity onPress={() => {
                    amplitude.logEvent('event_detail_link_clicked', { event_url: selectedEvent.event_url })
                    Linking.openURL(selectedEvent.event_url)
                }}>
                    <Text style={styles.fullViewTitle}>
                        {selectedEvent.name}
                        <MaterialIcons name="open-in-new" size={24} color="blue" />
                    </Text>
                </TouchableOpacity>

                <Text style={styles.eventOrganizer}>{selectedEvent.organizer.name}</Text>

                <Text style={styles.eventTime}>
                    {`${moment(selectedEvent.start_date).format('MMM D, YYYY')} ${moment(selectedEvent.start_date).format('hA')} - ${moment(selectedEvent.end_date).format('hA')}`}
                </Text>

                {formattedPrice && <Text style={styles.fullViewPrice}>
                    Price: {formattedPrice}
                </Text>}
                <Markdown>
                    {selectedEvent.description}
                </Markdown>
            </View>
        </ScrollView>)
}

const styles = StyleSheet.create({
    fullViewContainer: {
        position: 'relative',
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#fff',
        padding: 20,
    },
    fullViewImage: {
        width: '100%',
        height: 200,
        marginBottom: 20,
    },
    fullViewTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'blue',
    },
    fullViewTime: {
        fontSize: 18,
        color: 'black',
    },
    fullViewLocation: {
        fontSize: 18,
        color: '#666',
        marginTop: 10,
    },
    fullViewPrice: {
        fontSize: 14,
        color: '#666',
    },
    eventOrganizer: {
        fontSize: 16,
        color: 'black',
        marginBottom: 5
    },
    eventTime: {
        fontSize: 14,
        color: '#666',
    },
    videoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    video: {
        width: '100%',
        height: 300,  // Adjust height as per your requirement
    },
    contentContainer: {
        flex: 1,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 50,
    },
    controlsContainer: {
        padding: 10,
    },
})