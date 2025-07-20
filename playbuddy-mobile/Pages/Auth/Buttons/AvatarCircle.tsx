import React, { useMemo } from "react"
import { View, StyleSheet, Text } from "react-native"
import { Image } from "expo-image"
import { getSmallAvatarUrl } from "../../../Common/hooks/imageUtils";
import { Attendee } from "../../../Common/types/commonTypes";

export const AvatarCircle = ({ userProfile, size = 50, name = '' }: { userProfile: Attendee, size?: number, name?: string }) => {
    const styles = useMemo(() => StyleSheet.create({
        avatarContainer: {
            width: size,
            height: size,
            borderRadius: size / 2, // Ensure it's fully rounded (half of width/height)
            backgroundColor: 'white',
            borderColor: '#007AFF',
            borderWidth: 1,
            justifyContent: 'center', // Centers vertically
            alignItems: 'center',     // Centers horizontally
        },
        avatarText: {
            fontSize: size / 2,
            fontWeight: 'bold',
            color: '#007AFF',
        },
        avatarImage: {
            width: size,
            height: size,
            borderRadius: size / 2,
        }
    }), [size]);

    const avatarUrl = userProfile?.avatar_url && getSmallAvatarUrl(userProfile?.avatar_url, size * 2);

    // name if provided
    const initials = (name || userProfile?.name)?.split(' ').map(name => name[0]).join('').slice(0, 2)

    return (
        <View style={styles.avatarContainer}>
            {
                avatarUrl
                    ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                    : <Text style={styles.avatarText}>{initials || '?'}</Text>
            }
        </View>
    )


}

