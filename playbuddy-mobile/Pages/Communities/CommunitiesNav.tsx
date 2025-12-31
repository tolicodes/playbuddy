import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';

import { MyCommunitiesSection } from './MyCommunitiesSection';
import { JoinCommunitySection } from './JoinCommunitySection';
import { logEvent } from '../../Common/hooks/logger';
import { UE } from '../../userEventTypes';
import { useAnalyticsProps } from '../../Common/hooks/useAnalytics';

type TabKey = 'favorite' | 'all';

const CommunitiesNav = ({ type = 'private' }: { type?: 'organizer' | 'private' }) => {
    const [activeTab, setActiveTab] = useState<TabKey>('favorite');
    const analyticsProps = useAnalyticsProps();

    const tabs = [
        { name: 'My Communities', value: 'favorite' },
        { name: 'All Communities', value: 'all' },
    ];

    return (
        <View style={[styles.container]}>
            <View style={styles.segmentedWrap}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.value;
                    return (
                        <TouchableOpacity
                            key={tab.value}
                            onPress={() => {
                                setActiveTab(tab.value as TabKey);
                                logEvent(UE.CommunityTabNavigatorTabClicked, {
                                    ...analyticsProps,
                                    tab_name: tab.value,
                                });
                            }}
                            style={[
                                styles.segmentedButton,
                                isActive && styles.segmentedButtonActive,
                            ]}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isActive }}
                        >
                            <Text style={isActive ? styles.segmentedTextActive : styles.segmentedText}>
                                {tab.name}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {
                activeTab === 'favorite' ? (
                    <MyCommunitiesSection type={type} onPressAllCommunities={() => {
                        setActiveTab('all');
                    }} />
                ) : (
                    <JoinCommunitySection type={type} />
                )
            }

        </View>
    )
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
        paddingTop: 12,
    },
    segmentedWrap: {
        flexDirection: 'row',
        alignSelf: 'center',
        padding: 4,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.35)',
        marginBottom: 10,
    },
    segmentedButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 999,
    },
    segmentedButtonActive: {
        backgroundColor: '#7F5AF0',
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
    },
    segmentedText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#EAE6F8',
    },
    segmentedTextActive: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});

export default CommunitiesNav;
