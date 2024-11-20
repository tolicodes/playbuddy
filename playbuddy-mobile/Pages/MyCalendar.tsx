import React from 'react'
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome'; // Import FontAwesome icon
import { useCalendarContext } from "./Calendar/hooks/CalendarContext";
import EventCalendarView from "./Calendar/EventCalendarView";
import { useEffect } from "react";
import { useUserContext } from "./Auth/hooks/UserContext";
import { useNavigation } from '@react-navigation/native';
import { NavStack } from '../types';
import { LoginToAccess } from '../Common/LoginToAccess';
import { logEvent } from '../Common/hooks/logger';

const ShareWishlistButton = () => {
    const navigator = useNavigation<NavStack>();
    const handleShare = () => {
        logEvent('my_calendar_share_wishlist_click');
        navigator.navigate('Buddies');
    };

    return (
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <FAIcon name="share" size={24} color="white" />
            <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
    );
};

const MyCalendar = () => {
    const { setFilters } = useCalendarContext();
    const { authUserId } = useUserContext();

    // reset filters on mount
    useEffect(() => {
        setFilters({ search: '', organizers: [] });
    }, [])

    const { wishlistEvents } = useCalendarContext();

    return (
        (authUserId)
            ? (
                <>
                    <ShareWishlistButton />
                    <EventCalendarView events={wishlistEvents} />
                </>
            )
            : (
                <LoginToAccess entityToAccess='wishlist' />
            )
    )
}

// Styles for the FAB button with "Share" text below the icon
const styles = StyleSheet.create({
    shareButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        zIndex: 1000,
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