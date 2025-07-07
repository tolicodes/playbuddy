import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome5';

interface BadgeRowProps {
    vetted?: boolean;
    playParty?: boolean;
    center?: boolean;
    munch?: boolean;
    classification?: Classification;
}

export const BadgeRow: React.FC<BadgeRowProps> = ({ vetted, playParty, center, munch, classification }) => (
    <View
        style={[
            styles.badgesRow,
            { justifyContent: center ? 'center' : 'flex-start' },
        ]}
    >
        {classification?.event_themes?.length > 0 && (
            <View style={styles.tagPill} >
                <FAIcon
                    name={'tag'}
                    size={10}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                    solid
                />
                <Text style={styles.tagText} numberOfLines={1}>{classification.event_themes[0]}</Text>
            </View>
        )}
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

const baseBadge: ViewStyle = {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
};

const baseText: TextStyle = {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
};

const styles = StyleSheet.create({
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    vettedBadge: {
        ...baseBadge,
        backgroundColor: '#4CAF50',
    },
    vettedText: {
        ...baseText,
    },
    playPartyBadge: {
        ...baseBadge,
        backgroundColor: '#8F00FF',
    },
    playPartyText: {
        ...baseText,
    },
    munchBadge: {
        ...baseBadge,
        backgroundColor: '#FFC107',
    },
    munchText: {
        ...baseText,
    },
    tagPill: {
        ...baseBadge,
        backgroundColor: '#66BB6A',
        maxWidth: 100,
    },
    tagText: {
        ...baseText,
    },
});
