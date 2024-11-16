import React, { useEffect, useMemo, useState } from "react";
import EventCalendarView from "../Calendar/EventCalendarView";
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AllSelection, Community, LocationArea, useCommonContext } from "../Common/CommonContext";
import { ALL_ITEM } from "../Header/const";
import { useCalendarContext } from "../Calendar/CalendarContext";
import { EventWithMetadata } from "../types";

const Banner = () => {
    const [isBannerShown, setIsBannerShown] = useState(false);
    const [oldLocation, setOldLocation] = useState<LocationArea | AllSelection | null>(null);
    const [oldCommunity, setOldCommunity] = useState<Community | AllSelection | null>(null);
    const { selectedLocationArea, selectedCommunity, setSelectedLocationArea, setSelectedCommunity } = useCommonContext();

    // on mount, set to all communities
    useEffect(() => {
        setOldLocation(selectedLocationArea || null);
        setOldCommunity(selectedCommunity || null);
        setSelectedLocationArea(ALL_ITEM);
        setSelectedCommunity(ALL_ITEM);
        setIsBannerShown(true);
    }, []);

    const handleBannerPress = () => {
        setIsBannerShown(false);
        setSelectedLocationArea(oldLocation);
        setSelectedCommunity(oldCommunity);
    };

    if (!isBannerShown) {
        return null;
    }

    return (
        <>
            <TouchableOpacity
                style={styles.bannerBlue}
                onPress={handleBannerPress}
            >
                <Text style={styles.bannerTextBold}>
                    Showing all retreats worldwide 🌎
                </Text>
                <Text style={styles.resetLink} onPress={handleBannerPress}>
                    Reset To Your Old Filters
                </Text>
            </TouchableOpacity>
        </>
    );
};

const styles = StyleSheet.create({
    bannerRed: {
        backgroundColor: '#FF4D4D',
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bannerBlue: {
        backgroundColor: '#007AFF', // ios blue color
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bannerText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    bannerTextBold: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
    },
    resetLink: {
        color: '#fff',
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    }
});

export const Retreats = () => {
    const { allEvents } = useCalendarContext();
    const [retreatEvents, setRetreatEvents] = useState<EventWithMetadata[]>();
    useEffect(() => {
        setTimeout(() => {
            const retreats = allEvents.filter(event => event.type === 'retreat')
            setRetreatEvents(retreats);
        }, 100);
    }, [allEvents])

    return (
        <View style={{ flex: 1 }}>
            <Banner />
            <EventCalendarView events={retreatEvents} />
        </View>
    );
};
