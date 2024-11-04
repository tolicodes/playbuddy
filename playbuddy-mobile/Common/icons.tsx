import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image'
import Ionicons from 'react-native-vector-icons/Ionicons';

const COMMUNITIES_ICON_MAP: { [key: string]: React.ReactNode } = {
    'All': <Ionicons name="ellipsis-horizontal" size={20} color="black" />,
    'CT': <Ionicons name="hand-right-outline" size={20} color="black" />,
    'ACR': <Image source={{
        uri: 'https://bsslnznasebtdktzxjqu.supabase.co/storage/v1/object/public/misc/acro_icon.png'
    }} style={{ width: 30, height: 30 }} />
}

export const getCommunityIcon = (code: string) => {
    return COMMUNITIES_ICON_MAP[code as keyof typeof COMMUNITIES_ICON_MAP] || <Text>{code} </Text>;
}


const LOCATIONS_ICON_MAP: { [key: string]: React.ReactNode } = {
    'ALL': <Text>🌍</Text>,
    'NYC': <Text>🗽</Text>,
    // las vegas
    'LVG': <Text>🌴</Text>,
    // san diego
    'SDG': <Text>🌞</Text>,
    // san francisco
    'SFR': <Text>🌉</Text>,
    // los angeles
    'LA': <Text>🌆</Text>,
    // san jose
    'SJ': <Text>🌲</Text>,
    // Mexico
    'MX': <Text>🇲🇽</Text>,
    // Croatia
    'HR': <Text>🇭🇷</Text>,
    // Costa Rica
    'CR': <Text>🇨🇷</Text>,

}

export const getLocationIcon = (code: string) => {
    return LOCATIONS_ICON_MAP[code as keyof typeof LOCATIONS_ICON_MAP] ?
        <Text style={styles.codeTextEmoji}>
            {LOCATIONS_ICON_MAP[code as keyof typeof LOCATIONS_ICON_MAP]}
        </Text>
        : <Text style={styles.codeText}>{code}</Text>;
}

const styles = StyleSheet.create({
    codeTextEmoji: {
        fontWeight: 'bold',
        fontSize: 20,
    },
    codeText: {
        fontWeight: 'bold',
        fontSize: 11,
    },
});