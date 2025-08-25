import React, { useState } from 'react';
import { StyleSheet } from 'react-native';

import { MyCommunitiesSection } from './MyCommunitiesSection';
import { JoinCommunitySection } from './JoinCommunitySection';
import { logEvent } from '../../Common/hooks/logger';
import { UE } from '../../userEventTypes';
import { useAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { View } from 'react-native';
import TabBar from '../../components/TabBar';

type TabKey = 'favorite' | 'all';

const CommunitiesNav = ({ type = 'private' }: { type?: 'organizer' | 'private' }) => {
    const [activeTab, setActiveTab] = useState<TabKey>('all');
    const analyticsProps = useAnalyticsProps();

    const tabs = [
        { name: 'My Organizers', value: 'favorite' },
        { name: 'All Organizers', value: 'all' },
    ];

    return (
        <View style={[styles.container]}>
            <TabBar tabs={tabs} active={activeTab} onPress={(value) => {
                setActiveTab(value as TabKey);
                logEvent(UE.CommunityTabNavigatorTabClicked, {
                    ...analyticsProps,
                    tab_name: value
                });
            }} />

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
});

export default CommunitiesNav;