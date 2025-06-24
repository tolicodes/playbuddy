import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BadgeRowProps {
    vetted?: boolean;
    playParty?: boolean;
    center?: boolean;
    munch?: boolean;
}

export const BadgeRow: React.FC<BadgeRowProps> = ({ vetted, playParty, center, munch }) => (
    <View style={[
        styles.badgesRow,
        { justifyContent: center ? 'center' : 'flex-start' }
    ]}>
        {vetted && (
            <View style={styles.vettedBadge}>
                <Text style={styles.vettedText}>Vetted</Text>
            </View>
        )}
        {playParty && (
            <View style={styles.playPartyBadge}>
                <Text style={styles.playPartyText}>Play Party</Text>
            </View>
        )}
        {munch && (
            <View style={styles.munchBadge}>
                <Text style={styles.munchText}>Munch</Text>
            </View>
        )}
    </View>
);

const styles = StyleSheet.create({
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    vettedBadge: {
        backgroundColor: '#4CAF50',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginRight: 8,
    },
    vettedText: {
        fontSize: 12,
        color: 'white',
        fontWeight: 'bold',
    },
    playPartyBadge: {
        backgroundColor: '#8F00FF',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginRight: 8,
    },
    playPartyText: {
        fontSize: 12,
        color: 'white',
        fontWeight: 'bold',
    },
    munchBadge: {
        backgroundColor: '#FFC107',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginRight: 8,
    },
    munchText: {
        fontSize: 12,
        color: 'white',
        fontWeight: 'bold',
    },
});
