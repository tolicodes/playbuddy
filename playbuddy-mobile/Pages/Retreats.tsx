import React from "react"
import EventCalendarView from "../Calendar/EventCalendarView"

import { View, Text, StyleSheet } from 'react-native';

const Banner = () => {
    return (

        <View style={styles.banner}>
            <Text style={styles.text}>
                Please select "ALL" for Communities and Locations to view ALL retreats.
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    banner: {
        backgroundColor: '#FF4D4D', // Red color
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        fontWeight: 'bold',
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