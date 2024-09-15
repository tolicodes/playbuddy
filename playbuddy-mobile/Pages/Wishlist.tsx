import React from 'react'
import { Text, View, StyleSheet, Share, TouchableOpacity } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome'; // Import FontAwesome icon
import { useCalendarContext } from "../Calendar/CalendarContext";
import EventCalendarView from "../Calendar/EventCalendarView";
import { useEffect } from "react";
import { useUserContext } from "../Auth/UserContext";
import HeaderLoginButton from '../Auth/HeaderLoginButton';
import { Button } from '@rneui/themed';
import { RouteProp } from '@react-navigation/native';
import { NavStackProps } from '../types';
import * as amplitude from '@amplitude/analytics-react-native';

const getInstructions = (shareUrl: string) => `I made a list of kinky events I'd like to go to!

You'll need to install PlayBuddy. It's still in beta, so you need follow these steps. But once
you have it, you'll see all sorts of fun events we can go to events together!

WISHLIST URL: ${shareUrl}

Apple:
1. Install via TestFlight. https://playbuddy.me/ios
2. Click the wishlist link above.

Android:
1. Email toli@toli.me to join the beta.
2. Download from Google Play. https://playbuddy.me/android
2. Click the wishlist link above.

Web:
Wishlist isn’t available yet, but you can still browse events at http://playbuddy.me.
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

const Wishlist = ({ route }: { route: RouteProp<NavStackProps, 'Wishlist'> }) => {
    const { setFilters, setFriendWishlistShareCode, friendWishlistShareCode } = useCalendarContext();
    const { userId } = useUserContext();

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
        (friendWishlistShareCode || userId)
            ? <>
                <EventCalendarView isOnWishlist={true} isFriendWishlist={!!friendWishlistShareCode} />
                <ShareWishlistButton />
            </>
            : (
                <View style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',  // Centers vertically
                    alignItems: 'center',      // Centers horizontally
                    height: '100%',            // Ensure the height takes full screen
                }}>
                    <Text style={{ textAlign: 'center', marginTop: 10, fontSize: 20 }}>
                        Login to access wishlist
                    </Text>
                    <View style={{ marginTop: 10, }}>
                        <HeaderLoginButton showLoginText={true} />
                    </View>
                </View>

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

export default Wishlist;