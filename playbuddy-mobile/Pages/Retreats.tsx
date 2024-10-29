import React, { useEffect, useState } from "react";
import EventCalendarView from "../Calendar/EventCalendarView";
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
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
                    Now showing retreats from all communities worldwide. Filter on the top right.
                </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bannerRed} onPress={handleBannerPress}>
                <Text style={styles.bannerText}>
                    Click to reset to &quot;{oldLocation?.name}&quot; and &quot;{oldCommunity?.name}&quot;.
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
});

export const Retreats = () => {
    return (
        <>
            <Banner />
            <EventCalendarView isRetreats={true} />
        </>
    );
};
