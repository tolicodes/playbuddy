import React, { useEffect, useMemo, useState } from "react";
import EventCalendarView from "./Calendar/EventCalendarView";
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useCalendarContext } from "./Calendar/hooks/CalendarContext";
import { EventWithMetadata } from "../Common/Nav/NavStackType";
import { logEvent } from "../Common/hooks/logger";
import { useUserContext } from "./Auth/hooks/UserContext";
import { useUpdateUserProfile } from './Auth/hooks/useUserProfile';
import { ALL_COMMUNITIES_ID, ALL_LOCATION_AREAS_ID } from "../Common/hooks/CommonContext";

// const Banner = () => {
//     const [isBannerShown, setIsBannerShown] = useState(false);
//     const [oldLocationAreaId, setOldLocationAreaId] = useState<string | null>(null);
//     const [oldCommunityId, setOldCommunityId] = useState<string | null>(null);

//     const { authUserId } = useUserContext();
//     const { selectedLocationAreaId, selectedCommunityId } = useUserContext();
//     const { mutate: updateUserProfile } = useUpdateUserProfile(authUserId || '');

//     // on mount, set to all communities
//     useEffect(() => {
//         setOldLocationAreaId(selectedLocationAreaId || ALL_LOCATION_AREAS_ID);
//         setOldCommunityId(selectedCommunityId || ALL_COMMUNITIES_ID);
//         updateUserProfile({
//             selected_location_area_id: ALL_LOCATION_AREAS_ID,
//             selected_community_id: ALL_COMMUNITIES_ID
//         });
//         setIsBannerShown(true);
//         logEvent('retreats_banner_shown');
//     }, []);

//     const handleBannerPress = () => {
//         setIsBannerShown(false);
//         updateUserProfile({
//             selected_location_area_id: oldLocationAreaId,
//             selected_community_id: oldCommunityId
//         });
//         logEvent('retreats_banner_reset_to_old_filters');
//     };

//     if (!isBannerShown) {
//         return null;
//     }

//     return (
//         <>
//             <TouchableOpacity
//                 style={styles.bannerBlue}
//                 onPress={handleBannerPress}
//             >
//                 <Text style={styles.bannerTextBold}>
//                     Showing all retreats worldwide 🌎
//                 </Text>
//                 <Text style={styles.resetLink} onPress={handleBannerPress}>
//                     Reset To Your Old Filters
//                 </Text>
//             </TouchableOpacity>
//         </>
//     );
// };

// const styles = StyleSheet.create({
//     bannerRed: {
//         backgroundColor: '#FF4D4D',
//         padding: 10,
//         alignItems: 'center',
//         justifyContent: 'center',
//     },
//     bannerBlue: {
//         backgroundColor: '#007AFF', // ios blue color
//         padding: 10,
//         alignItems: 'center',
//         justifyContent: 'center',
//     },
//     bannerText: {
//         color: '#fff',
//         fontSize: 16,
//         textAlign: 'center',
//         fontWeight: 'bold',
//     },
//     bannerTextBold: {
//         color: '#fff',
//         fontSize: 16,
//         textAlign: 'center',
//     },
//     resetLink: {
//         color: '#fff',
//         fontWeight: 'bold',
//         textDecorationLine: 'underline',
//     }
// });

export const Retreats = () => {
    const { allEvents } = useCalendarContext();
    const retreatEvents = useMemo(() => allEvents.filter(event => event.type === 'retreat'), [allEvents]);

    return (
        <View style={{ flex: 1 }}>
            {/* <Banner /> */}
            <EventCalendarView events={retreatEvents} />
        </View>
    );
};
