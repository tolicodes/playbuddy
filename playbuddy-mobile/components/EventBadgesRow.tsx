import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { Classification } from '../commonTypes';
import { colors, fontFamilies, fontSizes, radius, spacing } from './styles';

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
        {classification?.tags && classification?.tags?.length > 0 && (
            <View style={styles.tagPill} >
                <FAIcon
                    name={'tag'}
                    size={10}
                    color={colors.white}
                    style={{ marginRight: spacing.xsPlus }}
                    solid
                />
                <Text style={styles.tagText} numberOfLines={1}>{classification.tags[0]}</Text>
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
    borderRadius: radius.xxs,
    paddingHorizontal: spacing.xsPlus,
    paddingVertical: spacing.xxs,
    marginRight: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
};

const baseText: TextStyle = {
    fontSize: fontSizes.sm,
    color: colors.white,
    fontWeight: 'bold',
    fontFamily: fontFamilies.body,
};

const styles = StyleSheet.create({
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    vettedBadge: {
        ...baseBadge,
        backgroundColor: colors.badgeVetted,
    },
    vettedText: {
        ...baseText,
    },
    playPartyBadge: {
        ...baseBadge,
        backgroundColor: colors.badgePlayParty,
    },
    playPartyText: {
        ...baseText,
    },
    munchBadge: {
        ...baseBadge,
        backgroundColor: colors.badgeMunch,
    },
    munchText: {
        ...baseText,
    },
    tagPill: {
        ...baseBadge,
        backgroundColor: colors.badgeTag,
        maxWidth: 100,
    },
    tagText: {
        ...baseText,
    },
});
