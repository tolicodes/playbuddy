import React from 'react';
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

type MenuItem = { title: string; icon: string; route: string; badge?: boolean };
type MenuGroup = { title: string; items: MenuItem[]; variant?: 'default' | 'evenMore' };

const menuGroups: MenuGroup[] = [
    {
        title: 'Highlights',
        items: [
            { title: "PB's Weekly Picks", icon: 'calendar-week', route: 'Weekly Picks' },
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

    const navigation = useNavigation<NavStack>();
    const { availableCardsToSwipe } = useCalendarContext();

    useBadgeNotifications({ availableCardsToSwipe });

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
                                            color={isDeals ? '#333' : '#555'}
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
                                            color={isDeals ? '#b08a00' : '#b0b0b0'}
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
        backgroundColor: '#f6f7f9',
        paddingTop: 40,
        paddingHorizontal: 16,
    },
    title: {
        fontSize: 18,
        color: '#333',
        marginBottom: 20,
        alignSelf: 'center',
        fontWeight: '600',
    },
    group: {
        marginBottom: 18,
    },
    groupTitle: {
        fontSize: 12,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: '#7c7c7c',
        marginBottom: 8,
        marginLeft: 4,
        fontWeight: '600',
    },
    groupTitleEvenMore: {
        color: '#8a6d2f',
        letterSpacing: 1.2,
    },
    groupCard: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ececec',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
    },
    groupCardEvenMore: {
        backgroundColor: '#fffaf0',
        borderColor: '#f1e2c6',
        shadowOpacity: 0.12,
        shadowRadius: 10,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    menuItemEvenMore: {
        borderBottomColor: '#f3e6cf',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
    },
    lastMenuItem: {
        borderBottomWidth: 0,
    },
    iconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#f2f4f7',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    iconWrapEvenMore: {
        backgroundColor: '#f7efe1',
    },
    menuText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
        flex: 1,
    },
    dealsItem: {
        backgroundColor: '#fff8d6',
    },
    dealsIconWrap: {
        backgroundColor: '#FFD700',
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
        marginRight: 8,
    },
    modalScroll: {
        flex: 1,
        backgroundColor: '#f6f7f9',
    },
    modalContent: {
        paddingTop: 12,
        paddingHorizontal: 16,
        paddingBottom: 24,
    },

});
