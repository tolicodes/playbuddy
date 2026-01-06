import React, { useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';
import type { NavStack } from '../Common/Nav/NavStackType';
import { useBadgeNotifications } from '../Common/Nav/useBadgeNotifications';
import { useCalendarContext } from './Calendar/hooks/CalendarContext';
import { Badge } from 'react-native-paper';
import { useAnalyticsProps } from '../Common/hooks/useAnalytics';
import { UE } from '../userEventTypes';
import { logEvent } from '../Common/hooks/logger';
import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from '../components/styles';
import { useUserContext } from './Auth/hooks/UserContext';
import { ADMIN_EMAILS } from '../config';

type MenuItem = { title: string; icon: string; route: string; badge?: boolean };
type MenuGroup = { title: string; items: MenuItem[]; variant?: 'default' | 'evenMore' };

const baseMenuGroups: MenuGroup[] = [
    {
        title: 'Highlights',
        items: [
            { title: "PB's Weekly Picks", icon: 'calendar-week', route: 'Weekly Picks' },
            { title: 'Popular Events', icon: 'fire', route: 'Popular Events' },
            { title: 'Deals', icon: 'ticket-alt', route: 'Promos' },
        ],
    },
    {
        title: 'Explore',
        items: [
            { title: 'Play Parties', icon: 'mask', route: 'Play Parties' },
            { title: 'Munches', icon: 'utensils', route: 'Munches' },
            { title: 'Retreats', icon: 'campground', route: 'Retreats' },
        ],
    },
    {
        title: 'Even Moar',
        variant: 'evenMore',
        items: [
            { title: '...Moar', icon: 'ellipsis-h', route: 'Moar' },
        ],
    },
];

type DiscoverPageProps = {
    variant?: 'screen' | 'modal';
    onRequestClose?: () => void;
};

export const DiscoverPage = ({ variant = 'screen', onRequestClose }: DiscoverPageProps) => {
    const analyticsProps = useAnalyticsProps();
    const { userProfile } = useUserContext();
    const isAdmin = !!userProfile?.email && ADMIN_EMAILS.includes(userProfile.email);

    const navigation = useNavigation<NavStack>();
    const { availableCardsToSwipe } = useCalendarContext();

    useBadgeNotifications({ availableCardsToSwipe });

    const menuGroups = useMemo(() => {
        if (!isAdmin) return baseMenuGroups;

        return [
            ...baseMenuGroups,
            {
                title: 'Admin',
                items: [{ title: 'Admin', icon: 'user-shield', route: 'Admin' }],
            },
        ];
    }, [isAdmin]);

    const content = (
        <>
            {menuGroups.map((group, groupIndex) => (
                <View key={`group-${groupIndex}`} style={styles.group}>
                    <Text
                        style={[
                            styles.groupTitle,
                            group.variant === 'evenMore' && styles.groupTitleEvenMore,
                        ]}
                    >
                        {group.title}
                    </Text>
                    <View
                        style={[
                            styles.groupCard,
                            group.variant === 'evenMore' && styles.groupCardEvenMore,
                        ]}
                    >
                        {group.items.map((item, itemIndex) => {
                            const isLast = itemIndex === group.items.length - 1;
                            const isDeals = item.route === 'Promos';
                            const isEvenMore = group.variant === 'evenMore';

                            return (
                                <TouchableOpacity
                                    key={item.route}
                                    style={[
                                        styles.menuItem,
                                        isLast && styles.lastMenuItem,
                                        isDeals && styles.dealsItem,
                                        isEvenMore && styles.menuItemEvenMore,
                                    ]}
                                    onPress={() => {
                                        logEvent(UE.DiscoverPageMenuItemPressed, {
                                            ...analyticsProps,
                                            menu_item: item.route,
                                        });
                                        navigation.navigate(item.route as keyof NavStack);
                                        onRequestClose?.();
                                    }}
                                >
                                    <View style={[
                                        styles.iconWrap,
                                        isDeals && styles.dealsIconWrap,
                                        isEvenMore && styles.iconWrapEvenMore,
                                    ]}>
                                        <FAIcon
                                            name={item.icon}
                                            size={20}
                                            color={isDeals ? colors.textPrimary : colors.textMuted}
                                        />
                                    </View>
                                    <Text style={[styles.menuText, isDeals && styles.dealsText]}>{item.title}</Text>
                                    <View style={styles.menuRight}>
                                        {item.badge && (
                                            <Badge style={styles.badge}>
                                                {availableCardsToSwipe.length}
                                            </Badge>
                                        )}
                                        <FAIcon
                                            name="chevron-right"
                                            size={12}
                                            color={isDeals ? colors.textGold : colors.textSubtle}
                                        />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            ))}
        </>
    );

    if (variant === 'modal') {
        return (
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
                {content}
            </ScrollView>
        );
    }

    return <View style={styles.container}>{content}</View>;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surfaceMuted,
        paddingTop: spacing.jumbo,
        paddingHorizontal: spacing.lg,
    },
    title: {
        fontSize: 18,
        color: colors.textPrimary,
        marginBottom: 20,
        alignSelf: 'center',
        fontWeight: '600',
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
    groupTitleEvenMore: {
        color: colors.textGoldMuted,
        letterSpacing: 1.2,
    },
    groupCard: {
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.card,
    },
    groupCardEvenMore: {
        backgroundColor: colors.surfaceGoldLight,
        borderColor: colors.borderGoldSoft,
        shadowOpacity: 0.12,
        shadowRadius: 10,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.mdPlus,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
    },
    menuItemEvenMore: {
        borderBottomColor: colors.borderGoldLight,
        backgroundColor: colors.surfaceWhiteSoft,
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
    iconWrapEvenMore: {
        backgroundColor: colors.surfaceGoldMuted,
    },
    menuText: {
        fontSize: fontSizes.xl,
        color: colors.textPrimary,
        fontWeight: '500',
        flex: 1,
        fontFamily: fontFamilies.body,
    },
    dealsItem: {
        backgroundColor: colors.surfaceGoldWarm,
    },
    dealsIconWrap: {
        backgroundColor: colors.gold,
    },
    dealsText: {
        fontWeight: '600',
    },
    menuRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    badge: {
        alignSelf: 'flex-end',
        marginRight: spacing.sm,
    },
    modalScroll: {
        flex: 1,
        backgroundColor: colors.surfaceMuted,
    },
    modalContent: {
        paddingTop: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxl,
    },

});
