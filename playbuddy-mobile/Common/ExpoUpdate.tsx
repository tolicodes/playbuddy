import * as Updates from 'expo-updates';

export async function onFetchUpdateAsync() {
    try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
        }
    } catch (error) {
        alert('Error Updating App, please go to App Store and update manually');
        throw new Error(`Error fetching latest Expo update ${error}`);
    }
}