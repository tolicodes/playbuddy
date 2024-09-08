import { Text, View, StyleSheet, Share, TouchableOpacity } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome'; // Import FontAwesome icon
import { useCalendarContext } from "../Calendar/CalendarContext";
import EventCalendarView from "../Calendar/EventCalendarView";
import { useEffect } from "react";
import { useUserContext } from "../Auth/UserContext";
import HeaderLoginButton from '../Auth/HeaderLoginButton';
import { Button } from '@rneui/themed';

const getInstructions = (shareUrl: string) => `I made a list of kinky events I'd like to go to!

You'll need to install KinkBuddy. It's still in beta, so you need follow these steps. But once
you have it, you'll see all sorts of fun events we can go to events together!

WISHLIST URL: ${shareUrl}

Apple:
1. Install via TestFlight. https://testflight.apple.com/join/EhT6eStJ
2. Click the wishlist link above.

Android:
1. Email toli@toli.me to join the beta.
2. Download from Google Play. https://play.google.com/store/apps/details?id=com.tolicodes1.kinkbuddyios
2. Click the wishlist link above.

Web:
Wishlist isn’t available yet, but you can still browse events at http://kinkbuddy.org.
`;

const WISHLIST_URL_BASE = 'kinkbuddy://wishlist/';

const ShareWishlistButton = () => {
    const { user } = useUserContext();
    // Function to handle sharing the wishlist
    const handleShare = async () => {
        try {
            const shareURL = `${WISHLIST_URL_BASE}?share_code=${user?.share_code}`;
            console.log('shareURL', shareURL)
            const shareMessage = getInstructions(shareURL);

            await Share.share({
                message: shareMessage,
            });
        } catch (error) {
            console.error('Error sharing wishlist', error);
        }
    };

    return (
        <TouchableOpacity style={styles.fab} onPress={handleShare}>
            <FAIcon name="share" size={24} color="white" />
            <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
    );
};

export default ({ route }) => {
    const { setFilters, setFriendWishlistCode, friendWishlistEvents } = useCalendarContext();
    const { userId } = useUserContext();

    const shareCode = route.params?.share_code;

    useEffect(() => {
        if (shareCode) {
            setFriendWishlistCode(shareCode);
        }
    }, [shareCode]);

    useEffect(() => {
        setFilters({ search: '', organizers: [] });
    }, [])

    if (friendWishlistEvents.length) {
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
                <Button onPress={() => setFriendWishlistCode('')}>Back to your wishlist</Button>
                <EventCalendarView isOnWishlist={true} isFriendWishlist={true} />
                <ShareWishlistButton />
            </>
        )
    }

    return (
        userId
            ? <>
                < EventCalendarView isOnWishlist={true} />
                <ShareWishlistButton />
            </>
            : (
                <>
                    <Text style={{ display: 'flex', textAlign: 'center', marginTop: 10 }}> Login to access wishlist</Text>
                    <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
                        <HeaderLoginButton showLoginText={true} />
                    </View>
                </>
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
