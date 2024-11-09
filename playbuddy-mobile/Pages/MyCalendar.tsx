import React from 'react'
import { Text, View, StyleSheet, Share, TouchableOpacity } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome'; // Import FontAwesome icon
import { useCalendarContext } from "../Calendar/CalendarContext";
import EventCalendarView from "../Calendar/EventCalendarView";
import { useEffect } from "react";
import { useUserContext } from "../contexts/UserContext";
import { Button } from '@rneui/themed';
import { RouteProp } from '@react-navigation/native';
import { NavStackProps } from '../types';
import * as amplitude from '@amplitude/analytics-react-native';
import { LoginToAccess } from '../Common/LoginToAccess';

const getInstructions = (shareUrl: string) => `I'd like to share my calendar of playful events 🤗 via PlayBuddy

**Links:**
- Apple download: https://playbuddy.me/ios
- Android download: https://playbuddy.me/android

And once downloaded, copy and paste this URL into your browser (it's a little awkward but worth it) 😉

${shareUrl}
`;

const WISHLIST_URL_BASE = 'playbuddy://wishlist';

const ShareWishlistButton = () => {
    const { userProfile } = useUserContext();
    // Function to handle sharing the wishlist
    const handleShare = async () => {
        amplitude.logEvent('wishlist_shared');
        try {
            const shareURL = `${WISHLIST_URL_BASE}?share_code=${userProfile?.share_code}`;
            const shareMessage = getInstructions(shareURL);

            await Share.share({
                message: shareMessage,
            });
        } catch (error) {
            throw new Error(`Error sharing wishlist: ${error.message}`);
        }
    };

    return (
        <TouchableOpacity style={styles.fab} onPress={handleShare}>
            <FAIcon name="share" size={24} color="white" />
            <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
    );
};

const MyCalendar = ({ route }: { route: RouteProp<NavStackProps, 'My Calendar'> }) => {
    const { setFilters, setFriendWishlistShareCode, friendWishlistShareCode } = useCalendarContext();
    const { authUserId } = useUserContext();

    const shareCodeFromRoute = route.params?.share_code;

    useEffect(() => {
        setFriendWishlistShareCode(shareCodeFromRoute || null);
    }, [shareCodeFromRoute])

    useEffect(() => {
        setFilters({ search: '', organizers: [] });
    }, [])

    const resetWishlist = () => {
        amplitude.logEvent('wishlist_reset');
        setFriendWishlistShareCode(null)
    }

    if (friendWishlistShareCode) {
        return (
            <>
                <Text style={{
                    display: 'flex',
                    textAlign: 'center',
                    marginTop: 10,
                    marginBottom: 10,
                }}>
                    You are viewing your friend's wishlist
                </Text>
                <Button onPress={resetWishlist}>Back to your wishlist</Button>
                <EventCalendarView isOnWishlist={true} isFriendWishlist={true} />
                <ShareWishlistButton />
            </>
        )
    }

    return (
        (friendWishlistShareCode || authUserId)
            ? <>
                <EventCalendarView isOnWishlist={true} isFriendWishlist={!!friendWishlistShareCode} />
                <ShareWishlistButton />
            </>
            : (
                <LoginToAccess entityToAccess='wishlist' />
            )
    )
}

// Styles for the FAB button with "Share" text below the icon
const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#007AFF',
        borderRadius: 50,
        width: 60,
        height: 80, // Adjust height to make space for text
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 5, // For Android shadow
    },
    shareButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12, // Smaller font size for "Share"
        marginTop: 5, // Add some space between the icon and text
    },
});

export default MyCalendar;