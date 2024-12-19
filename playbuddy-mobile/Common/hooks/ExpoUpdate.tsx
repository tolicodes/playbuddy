import * as Updates from 'expo-updates';
import { AppState, AppStateStatus } from 'react-native';
import { useEffect } from 'react';

export async function useFetchExpoUpdateAsync() {
    return useEffect(() => {
        const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active' && !__DEV__) {
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
        });

        return () => {
            subscription.remove();
        };
    }, []);
}