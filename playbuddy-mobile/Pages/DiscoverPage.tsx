import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
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

const menuGroups = [
    [
        { title: 'Facilitators', icon: 'user-tie', route: 'Facilitators' },
    ],
    [
        { title: 'Promos', icon: 'ticket-alt', route: 'Promos' },
        { title: "PB's Weekly Picks", icon: 'calendar-week', route: 'Weekly Picks' },
    ],
    [
        { title: 'Munches', icon: 'utensils', route: 'Munches' },
        { title: 'Retreats', icon: 'campground', route: 'Retreats' },
        { title: 'Play Parties', icon: 'mask', route: 'Play Parties' },
    ],
    [
        { title: 'Discover Game', icon: 'gamepad', route: 'Discover Game', badge: true },
    ],
    [
        { title: 'Moar', icon: 'ellipsis-h', route: 'Moar' },
    ],
] as { title: string; icon: string; route: string; badge?: boolean }[][];

export const DiscoverPage = () => {
    const analyticsProps = useAnalyticsProps();

    const navigation = useNavigation<NavStack>();
    const { availableCardsToSwipe } = useCalendarContext();

    useBadgeNotifications({ availableCardsToSwipe });

    return (
        <View style={styles.container}>
            {menuGroups.map((group, groupIndex) => (
                <View key={`group-${groupIndex}`} style={styles.group}>
                    <View style={styles.groupCard}>
                        {group.map((item, itemIndex) => {
                            const isLast = itemIndex === group.length - 1;

                            return (
                                <TouchableOpacity
                                    key={item.route}
                                    style={[
                                        styles.menuItem,
                                        isLast && styles.lastMenuItem,
                                    ]}
                                    onPress={() => {
                                        logEvent(UE.DiscoverPageMenuItemPressed, {
                                            ...analyticsProps,
                                            menu_item: item.route,
                                        });
                                        navigation.navigate(item.route as keyof NavStack)
                                    }}
                                >
                                    <View style={styles.iconWrap}>
                                        <FAIcon name={item.icon} size={20} color="#555" />
                                    </View>
                                    <View style={styles.textBadgeRow}>
                                        <Text style={styles.menuText}>{item.title}</Text>
                                        {item.badge && (
                                            <Badge style={styles.badge}>
                                                {availableCardsToSwipe.length}
                                            </Badge>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
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
        marginBottom: 20,
    },
    groupCard: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#fff',
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 3,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    lastMenuItem: {
        borderBottomWidth: 0,
    },
    iconWrap: {
        width: 28,
        alignItems: 'center',
        marginRight: 12,
    },
    menuText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    textBadgeRow: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    badge: {
        alignSelf: 'flex-end',
    },

});
