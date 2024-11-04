import React, { useEffect, useState } from "react";
import EventCalendarView from "../Calendar/EventCalendarView";
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Community, LocationArea, useCommonContext } from "../Common/CommonContext";

const Banner = () => {
    const [isBannerShown, setIsBannerShown] = useState(false);
    const [oldLocation, setOldLocation] = useState<LocationArea | null>(null);
    const [oldCommunity, setOldCommunity] = useState<Community | null>(null);
    const { selectedLocationArea, selectedCommunity, setSelectedLocationArea, setSelectedCommunity } = useCommonContext();

    // on mount, set to all communities
    useEffect(() => {
        setOldLocation(selectedLocationArea || null);
        setOldCommunity(selectedCommunity || null);
        setSelectedLocationArea(null);
        setSelectedCommunity(null);
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
    return (
        <View style={{ flex: 1 }}>
            <Banner />
            <EventCalendarView isRetreats={true} />
        </View>
    );
};
