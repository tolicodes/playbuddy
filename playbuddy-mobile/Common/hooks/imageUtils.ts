import { Platform } from 'react-native';

const GIF_EXTENSION_RE = /\.gif(?:$|[?#])/i;
const GIF_QUERY_RE = /(?:^|[?&])(format|fm|mime|type)=gif(?:$|[&#])/i;

export const isGifUrl = (url?: string) => {
    if (!url) return false;
    return GIF_EXTENSION_RE.test(url) || GIF_QUERY_RE.test(url);
};

export const getSafeImageUrl = (url?: string) => {
    if (!url) return null;
    if (Platform.OS === 'android' && isGifUrl(url)) {
        if (__DEV__) {
            console.warn(`[image] skipping gif on android: ${url}`);
        }
        return null;
    }
    return url;
};

export const getSmallAvatarUrl = (avatarUrl: string, size: number = 50) => {
    // Regular expression to capture the base URL and file extension
    const regex = /(https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/)object\/public\/(avatars\/public\/([0-9]+))(\.[a-z]+)$/;

    // Replace 'object/public' with 'render/image' and add the width/height parameters
    const newUrl = avatarUrl.replace(regex, `$1render/image/public/$2$4?width=${size}&height=${size}`);

    return newUrl;
}

