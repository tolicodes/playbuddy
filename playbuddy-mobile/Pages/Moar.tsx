import React, { useCallback } from 'react';
import { Text, TouchableOpacity, Linking, StyleSheet, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';
import { Badge } from 'react-native-paper';

import { MISC_URLS } from '../config';
import { logEvent } from '../Common/hooks/logger';
import { UE } from '../userEventTypes';
import { useAnalyticsProps } from '../Common/hooks/useAnalytics';
import { useCalendarContext } from './Calendar/hooks/CalendarContext';
import type { NavStack } from '../Common/Nav/NavStackType';
import { navigateToTab } from '../Common/Nav/navigationHelpers';
import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../components/styles';

type LinkItem = {
    id: string;
    title: string;
    icon: string;
    url?: string;
    route?: string;
    badge?: boolean;
};

type Section = {
    title: string;
    items: LinkItem[];
};

const evenMoarItems: LinkItem[] = [
    {
        id: 'facilitators',
        title: 'Facilitators',
        route: 'Facilitators',
        icon: 'user-tie',
    },
    {
        id: 'discover-game',
        title: 'Discover Game',
        route: 'Discover Game',
        icon: 'gamepad',
        badge: true,
    },
];

const getGoogleCalLink = () => {
    return MISC_URLS.addGoogleCalendar();
};

const getAddYourEventsLink = () => {
    const subject = encodeURIComponent('[PlayBuddy] Add my event');
    const body = encodeURIComponent(
        `Hi! I would like to add my event to the event scraper.\n\n` +
        `My Organization Name: \n` +
        `My Website: \n` +
        `My Eventbrite/Ticketing Platform: \n` +
        `Example Event:\n` +
        `Anything Else?`
    );

    const mailtoLink = `mailto:support@playbuddy.me?subject=${subject}&body=${body}`;
    return mailtoLink;
};

const tools: LinkItem[] = [
    {
        id: 'google-calendar',
        title: 'Import to Google Calendar',
        url: getGoogleCalLink(),
        icon: 'calendar',
    },
    {
        id: 'add-events',
        title: 'Add Your Events',
        url: getAddYourEventsLink(),
        icon: 'plus-circle',
    },
];

const resources: LinkItem[] = [
    {
        id: 'organizers',
        title: 'List of Communities',
        url: 'https://www.notion.so/bcc0be4e78bf47b0a593988fa5a4ec6f?v=ed152f9629a2457bbabb58bbaae42155&pvs=4',
        icon: 'list-ul',
    },
    // {
    //     id: 'kinks',
    //     title: 'Kinky Ideas (List of Kinks)',
    //     url: 'https://playbuddy.me/kinks',
    //     icon: 'lightbulb',
    // },
    // {
    //     id: 'kinky-game',
    //     title: 'Kinky Game',
    //     url: 'https://playbuddy.me/game',
    //     icon: 'gamepad',
    // },
    {
        id: 'exhibitionist',
        title: 'The Exhibitionist Bible',
        url: 'https://tolicodes.notion.site/The-Exhibitionist-Bible-c0f5669da8794914ae62ed091f792139',
        icon: 'book',
    },
];

const sections: Section[] = [
    { title: 'Even Moar', items: evenMoarItems },
    { title: 'Tools', items: tools },
    { title: 'Resources', items: resources },
];

const Moar: React.FC = () => {
    const analyticsProps = useAnalyticsProps();
    const navigation = useNavigation<NavStack>();
    const { availableCardsToSwipe } = useCalendarContext();
    const badgeCount = availableCardsToSwipe.length;

    const handlePress = useCallback((item: LinkItem) => {
        logEvent(UE.MoarLinkClicked, { ...analyticsProps, link_name: item.title });
        if (item.route) {
            if (item.route === 'Discover Game') {
                navigateToTab(navigation, 'More', { screen: 'Discover Game' });
                return;
            }
            navigation.navigate(item.route as keyof NavStack);
            return;
        }
        if (item.url) {
            Linking.openURL(item.url);
        }
    }, [analyticsProps, navigation]);

    const handleEmailPress = useCallback(() => {
        logEvent(UE.MoarGetInTouchClickEmail, analyticsProps);
        Linking.openURL('mailto:support@playbuddy.me');
    }, [analyticsProps]);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                {sections.map((section) => (
                    <View key={section.title} style={styles.group}>
                        <Text style={styles.groupTitle}>{section.title}</Text>
                        <View style={styles.groupCard}>
                            {section.items.map((item, index) => {
                                const isLast = index === section.items.length - 1;
                                const showBadge = item.badge && badgeCount > 0;

                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[styles.menuItem, isLast && styles.lastMenuItem]}
                                        onPress={() => handlePress(item)}
                                    >
                                        <View style={styles.iconWrap}>
                                            <FAIcon name={item.icon} size={18} color={colors.textMuted} />
                                        </View>
                                        <Text style={styles.menuText}>{item.title}</Text>
                                        <View style={styles.menuRight}>
                                            {showBadge && (
                                                <Badge style={styles.badge}>{badgeCount}</Badge>
                                            )}
                                            <FAIcon name="chevron-right" size={12} color={colors.textSubtle} />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                ))}

                <View style={styles.group}>
                    <Text style={styles.groupTitle}>Get In Touch</Text>
                    <View style={styles.groupCard}>
                        <View style={styles.touchBody}>
                            <Text style={styles.touchText}>Got feedback? Want to add your event?</Text>
                            <Text style={styles.touchText}>Contact me at</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.menuItem, styles.touchRow, styles.lastMenuItem]}
                            onPress={handleEmailPress}
                        >
                            <View style={styles.iconWrap}>
                                <FAIcon name="envelope" size={18} color={colors.textMuted} />
                            </View>
                            <Text style={[styles.menuText, styles.emailText]}>support@playbuddy.me</Text>
                            <View style={styles.menuRight}>
                                <FAIcon name="chevron-right" size={12} color={colors.textSubtle} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
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
    group: {
        marginBottom: spacing.lgPlus,
    },
    groupTitle: {
        fontSize: fontSizes.sm,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: colors.textSecondary,
        marginBottom: spacing.sm,
        marginLeft: 4,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    groupCard: {
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.card,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.mdPlus,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
    },
    lastMenuItem: {
        borderBottomWidth: 0,
    },
    iconWrap: {
        width: 34,
        height: 34,
        borderRadius: radius.smPlus,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    menuText: {
        fontSize: fontSizes.xl,
        color: colors.textPrimary,
        fontWeight: '500',
        flex: 1,
        fontFamily: fontFamilies.body,
    },
    menuRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    badge: {
        marginRight: spacing.sm,
    },
    touchBody: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.mdPlus,
        paddingBottom: spacing.smPlus,
    },
    touchText: {
        fontSize: fontSizes.base,
        color: colors.textMuted,
        lineHeight: 20,
        fontFamily: fontFamilies.body,
    },
    touchRow: {
        borderTopWidth: 1,
        borderTopColor: colors.borderSubtle,
    },
    emailText: {
        color: colors.linkBlue,
        fontWeight: '600',
    },
});

export default Moar;
