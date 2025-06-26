import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';
import type { NavStack } from '../../Common/Nav/NavStackType';
import { LAVENDER_BACKGROUND } from '../../components/styles';

const menuGroups = [
    [
        { title: 'Facilitators', icon: 'user-tie', route: 'Facilitators' },
        { title: 'Promos', icon: 'ticket-alt', route: 'Promos' },
        { title: "PB's Weekly Picks", icon: 'calendar-week', route: 'Weekly Picks' },
    ],
    [
        { title: 'Munches', icon: 'utensils', route: 'Munches' },
        { title: 'Retreats', icon: 'campground', route: 'Retreats' },
        { title: 'Play Parties', icon: 'mask', route: 'Play Parties' },
    ],
    [
        { title: 'Discover Game', icon: 'gamepad', route: 'DiscoverGame' },
    ],
    [
        { title: 'Moar', icon: 'ellipsis-h', route: 'Moar' },
    ],
];

export const DiscoverPage = () => {
    const navigation = useNavigation<NavStack>();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Explore PlayBuddy</Text>

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
                                    onPress={() =>
                                        navigation.navigate(item.route as keyof NavStack)
                                    }
                                >
                                    <View style={styles.iconWrap}>
                                        <FAIcon name={item.icon} size={20} color="#555" />
                                    </View>
                                    <Text style={styles.menuText}>{item.title}</Text>
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
        backgroundColor: LAVENDER_BACKGROUND,
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
});
