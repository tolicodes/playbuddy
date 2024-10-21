import React, { useState } from "react"
import EventCalendarView from "../Calendar/EventCalendarView"

import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { Community, LocationArea, useCommonContext } from "../Common/CommonContext";

const Banner = () => {
    const [isBannerPressed, setIsBannerPressed] = useState(false);
    const [oldLocation, setOldLocation] = useState<LocationArea | null>(null);
    const [oldCommunity, setOldCommunity] = useState<Community | null>(null);
    const { selectedLocationArea, selectedCommunity, setSelectedLocationArea, setSelectedCommunity } = useCommonContext();

    const handleBannerPress = () => {
        if (isBannerPressed) {
            setIsBannerPressed(false);
            setSelectedLocationArea(oldLocation);
            setSelectedCommunity(oldCommunity);
            return;
        }

        setIsBannerPressed(true);
        setOldLocation(selectedLocationArea || null);
        setOldCommunity(selectedCommunity || null);
        setSelectedLocationArea(null);
        setSelectedCommunity(null);
    }

    return (
        <>
            <TouchableOpacity
                style={isBannerPressed ? styles.bannerPressed : styles.banner}
                onPress={handleBannerPress}
            >
                {isBannerPressed ? (
                    <Text style={styles.bannerTextBold}>
                        Now showing retreats from all communities worldwide. Filter on the top right.
                    </Text>
                ) : (
                    <Text style={styles.bannerText}>🌎 See Retreats Worldwide 🌎</Text>
                )}
            </TouchableOpacity>
            {isBannerPressed && (
                <TouchableOpacity style={styles.banner} onPress={handleBannerPress}>
                    <Text style={styles.bannerText}>
                        Click to reset to &quot;{oldLocation?.name}&quot; and &quot;{oldCommunity?.name}&quot;.
                    </Text>
                </TouchableOpacity>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    banner: {
        backgroundColor: '#FF4D4D', // Red color
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bannerPressed: {
        // ios blue color
        backgroundColor: '#007AFF',
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

export default Banner;


export const Retreats = () => {
    return (
        <>
            <Banner />
            <EventCalendarView isRetreats={true} />
        </>
    )
}
