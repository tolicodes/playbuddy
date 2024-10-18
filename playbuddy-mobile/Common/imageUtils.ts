export const getSmallAvatarUrl = (avatarUrl: string, size: number = 50) => {
    // Regular expression to capture the base URL and file extension
    const regex = /(https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/)object\/public\/(avatars\/public\/([0-9]+))(\.[a-z]+)$/;

    // Replace 'object/public' with 'render/image' and add the width/height parameters
    const newUrl = avatarUrl.replace(regex, `$1render/image/public/$2$4?width=${size}&height=${size}`);

    return newUrl;
}