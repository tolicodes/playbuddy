import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';

import { useUserContext } from '../Auth/hooks/UserContext';
import { ADMIN_EMAILS } from '../../config';
import {
    colors,
    fontFamilies,
    fontSizes,
    lineHeights,
    radius,
    shadows,
    spacing,
} from '../../components/styles';

type QuickAction = {
    title: string;
    subtitle: string;
    icon: string;
    route: string;
    tone: string;
    iconColor: string;
};

const QUICK_ACTIONS: QuickAction[] = [
    {
        title: 'Import URLs',
        subtitle: 'Bulk import event links',
        icon: 'link',
        route: 'Import URLs',
        tone: colors.surfaceLavenderLight,
        iconColor: colors.brandIndigo,
    },
    {
        title: 'Analytics',
        subtitle: 'Dashboards and funnels',
        icon: 'chart-line',
        route: 'Analytics Admin',
        tone: colors.surfaceInfo,
        iconColor: colors.brandBlue,
    },
    {
        title: 'Events',
        subtitle: 'Edit and hide events',
        icon: 'calendar-alt',
        route: 'Event Admin',
        tone: colors.surfaceInfo,
        iconColor: colors.brandBlue,
    },
    {
        title: 'Organizers',
        subtitle: 'Manage organizer profiles',
        icon: 'users',
        route: 'Organizer Admin',
        tone: colors.surfaceInfo,
        iconColor: colors.brandBlue,
    },
    {
        title: 'Weekly Picks',
        subtitle: 'Toggle picks and copy message',
        icon: 'calendar-week',
        route: 'Weekly Picks Admin',
        tone: colors.surfaceGoldWarm,
        iconColor: colors.textGold,
    },
    {
        title: 'Promo Codes',
        subtitle: 'Create and attach codes',
        icon: 'ticket-alt',
        route: 'Promo Codes Admin',
        tone: colors.surfaceGoldWarm,
        iconColor: colors.textGold,
    },
    {
        title: 'Message Popups',
        subtitle: 'Launch special messages',
        icon: 'bullhorn',
        route: 'Event Popups Admin',
        tone: colors.surfaceLavenderLight,
        iconColor: colors.brandIndigo,
    },
    {
        title: 'Push Notifications',
        subtitle: 'Send remote app alerts',
        icon: 'paper-plane',
        route: 'Push Notifications Admin',
        tone: colors.surfaceInfo,
        iconColor: colors.brandBlue,
    },
];

export const AdminScreen = () => {
    const navigation = useNavigation<NavigationProp<ParamListBase>>();
    const { userProfile } = useUserContext();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);

    if (!isAdmin) {
        return (
            <View style={styles.container}>
                <View style={styles.lockedCard}>
                    <View style={styles.lockedIcon}>
                        <FAIcon name="user-lock" size={22} color={colors.textMuted} />
                    </View>
                    <Text style={styles.lockedTitle}>Admins only</Text>
                    <Text style={styles.lockedText}>
                        This space is reserved for PlayBuddy staff.
                    </Text>
                    <TouchableOpacity
                        style={styles.lockedButton}
                        onPress={() => Linking.openURL('mailto:support@playbuddy.me')}
                    >
                        <Text style={styles.lockedButtonText}>Request access</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <LinearGradient
                colors={['#34135D', '#6B2BD4', '#FF6FA0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
            >
                <Text style={styles.heroKicker}>Admin control</Text>
                <Text style={styles.heroTitle}>Command Center</Text>
                <Text style={styles.heroSubtitle}>
                    Admin tools for analytics, events, imports, organizers, weekly picks, promo codes, and push.
                </Text>
            </LinearGradient>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick actions</Text>
                <View style={styles.card}>
                    {QUICK_ACTIONS.map((action, index) => {
                        const isLast = index === QUICK_ACTIONS.length - 1;
                        return (
                            <TouchableOpacity
                                key={action.title}
                                style={[styles.row, isLast && styles.lastRow]}
                                onPress={() => navigation.navigate(action.route as never)}
                            >
                                <View style={[styles.rowIconWrap, { backgroundColor: action.tone }]}>
                                    <FAIcon name={action.icon} size={16} color={action.iconColor} />
                                </View>
                                <View style={styles.rowBody}>
                                    <Text style={styles.rowTitle}>{action.title}</Text>
                                    <Text style={styles.rowSubtitle}>{action.subtitle}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
                            </TouchableOpacity>
                            );
                    })}
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surfaceMuted,
    },
    content: {
        padding: spacing.lg,
        paddingBottom: spacing.xxxl,
    },
    heroCard: {
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.lgPlus,
        ...shadows.brandCard,
    },
    heroKicker: {
        fontSize: fontSizes.sm,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: colors.textOnDarkSubtle,
        fontFamily: fontFamilies.body,
    },
    heroTitle: {
        fontSize: fontSizes.display,
        fontWeight: '700',
        color: colors.white,
        marginTop: spacing.xs,
        fontFamily: fontFamilies.display,
    },
    heroSubtitle: {
        fontSize: fontSizes.base,
        color: colors.textOnDarkMuted,
        marginTop: spacing.sm,
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
        maxWidth: 260,
    },
    section: {
        marginBottom: spacing.lgPlus,
    },
    sectionTitle: {
        fontSize: fontSizes.sm,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: colors.textSecondary,
        marginBottom: spacing.sm,
        marginLeft: 4,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    card: {
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.card,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.mdPlus,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
    },
    lastRow: {
        borderBottomWidth: 0,
    },
    rowIconWrap: {
        width: 34,
        height: 34,
        borderRadius: radius.smPlus,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    rowBody: {
        flex: 1,
    },
    rowTitle: {
        fontSize: fontSizes.xl,
        color: colors.textPrimary,
        fontWeight: '500',
        fontFamily: fontFamilies.body,
    },
    rowSubtitle: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        marginTop: spacing.xxs,
        fontFamily: fontFamilies.body,
    },
    lockedCard: {
        margin: spacing.lg,
        padding: spacing.lg,
        borderRadius: radius.xl,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLight,
        alignItems: 'center',
        ...shadows.card,
    },
    lockedIcon: {
        width: 46,
        height: 46,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    lockedTitle: {
        fontSize: fontSizes.title,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: fontFamilies.display,
        marginBottom: spacing.xs,
    },
    lockedText: {
        fontSize: fontSizes.base,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
        marginBottom: spacing.md,
    },
    lockedButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.smPlus,
        borderRadius: radius.pill,
        backgroundColor: colors.accentPurple,
    },
    lockedButtonText: {
        color: colors.white,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
});

export default AdminScreen;
