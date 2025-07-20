import { useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { AvatarCircle } from '../../Auth/Buttons/AvatarCircle';
import { logEvent } from '../../../Common/hooks/logger';
import { Attendee } from '../../../commonTypes';
import { UE } from '../../../Common/types/userEventTypes';
import { useAnalyticsProps } from '../../../Common/hooks/useAnalytics';

interface AttendeeCarouselProps {
    attendees: Attendee[];
}

export const AttendeeCarousel: React.FC<AttendeeCarouselProps> = ({ attendees }) => {
    const analyticsProps = useAnalyticsProps();

    const attendeesDeduped = useMemo(() => {
        const seen = new Set<string>();
        return attendees?.filter((attendee) => {
            const key = attendee.id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [attendees]);

    const handlePress = (attendee: Attendee) => {
        logEvent(UE.AttendeeAvatarCarouselPress, {
            ...analyticsProps,
            attendee_user_id: attendee.id,
        });
        // navigation.navigate('Buddy Events', { buddyAuthUserId: attendee.user_id });
    };

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
        >
            {attendeesDeduped.map((attendee) => (
                <TouchableOpacity
                    key={attendee.id}
                    onPress={() => handlePress(attendee)}
                >
                    <View style={styles.avatarContainer}>
                        <AvatarCircle userProfile={attendee} size={25} />
                    </View>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'visible',
    },
    avatarContainer: {
        position: 'relative',
        overflow: 'visible',
        marginLeft: 3,
    },
});
