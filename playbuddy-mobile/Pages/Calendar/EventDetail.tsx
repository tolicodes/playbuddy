import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { Image } from 'expo-image'
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Markdown from 'react-native-markdown-display';
import * as amplitude from '@amplitude/analytics-react-native';
import { WebView } from 'react-native-webview';
import { formatDate } from './hooks/calendarUtils';
import { getSmallAvatarUrl } from '../../Common/hooks/imageUtils';
import { logEvent } from '../../Common/hooks/logger';

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

    // Free event (BUG NOW) so ''
    if (price === '0') return '';

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

    const imageUrl = selectedEvent.image_url && getSmallAvatarUrl(selectedEvent.image_url);


    const eventPromoCode = selectedEvent.promo_codes?.find(code => code.scope === 'event');
    const organizerPromoCode = selectedEvent.organizer?.promo_codes?.find(code => code.scope === 'organizer');

    const promoCode = eventPromoCode || organizerPromoCode;

    const PromoCode = promoCode && (
        <View style={styles.promoCodeContainer}>

            <View style={styles.promoCodeBubble}>
                <Text style={styles.promoCodeText}>
                    Code: {promoCode.promo_code}
                </Text>
            </View>
            <Text style={styles.promoCodeDiscount}>
                - {promoCode.discount_type === 'percent' ? '' : '$'}
                {promoCode.discount}{promoCode.discount_type === 'percent' ? '%' : ''} off
            </Text>
        </View>
    )

    return (
        <ScrollView>

            {
                selectedEvent.video_url
                    ? <VideoPlayer uri={selectedEvent.video_url} />
                    : <Image source={{ uri: imageUrl }} style={styles.fullViewImage} />
            }

            <View style={{ padding: 20 }}>
                <TouchableOpacity onPress={() => {
                    logEvent('event_detail_link_clicked', { event_url: selectedEvent.event_url })
                    Linking.openURL(selectedEvent.event_url)
                }}>
                    <Text style={styles.fullViewTitle}>
                        {selectedEvent.name}
                        <MaterialIcons name="open-in-new" size={24} color="blue" />
                    </Text>
                </TouchableOpacity>


                <Text style={styles.eventOrganizer}>{selectedEvent.organizer.name}</Text>

                <Text style={styles.eventTime}>
                    {formatDate(selectedEvent, true)}
                </Text>

                {formattedPrice && <Text style={styles.fullViewPrice}>
                    Price: {formattedPrice}
                </Text>}

                {PromoCode}

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
    promoCodeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
    },
    promoCodeBadge: {
        backgroundColor: '#FFD700',
        padding: 8,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginVertical: 10,
    },
    promoCodeText: {
        fontSize: 14,
        color: 'black',
        fontWeight: 'bold',
    },
    promoCodeLabel: {
        fontSize: 14,
        color: 'black',
        fontWeight: 'bold',
    },
    promoCodeBubble: {
        backgroundColor: '#FFD700',
        padding: 8,
        borderRadius: 12,
    },
    promoCodeDiscount: {
        fontSize: 14,
        color: 'black',
        fontWeight: 'bold',
    },
})