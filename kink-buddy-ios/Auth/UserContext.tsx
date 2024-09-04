import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the shape of the UserContext state
interface UserContextType {
    userId: string | null;
    setUserId: (id: string | null) => Promise<void>;
}

// Create the context with a default value
const UserContext = createContext<UserContextType | undefined>(undefined);

// Custom hook to use the UserContext
export const useUserContext = (): UserContextType => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUserContext must be used within a UserProvider');
    }
    return context;
};

// AsyncStorage key
const USER_ID_STORAGE_KEY = '@userId';

// Provider component
export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [userId, setUserIdState] = useState<string | null>(null);

    // Load userId from AsyncStorage on initial render
    useEffect(() => {
        const loadUserId = async () => {
            try {
                const storedUserId = await AsyncStorage.getItem(USER_ID_STORAGE_KEY);
                if (storedUserId) {
                    setUserIdState(storedUserId);
                }
            } catch (error) {
                console.error('Failed to load userId from AsyncStorage:', error);
            }
        };
        loadUserId();
    }, []);

    // Function to set the userId in both state and AsyncStorage
    const setUserId = async (id: string | null) => {
        try {
            if (id) {
                await AsyncStorage.setItem(USER_ID_STORAGE_KEY, id);
            } else {
                await AsyncStorage.removeItem(USER_ID_STORAGE_KEY);
            }
            setUserIdState(id);
        } catch (error) {
            console.error('Failed to save userId to AsyncStorage:', error);
        }
    };

    return (
        <UserContext.Provider value={{ userId, setUserId }}>
            {children}
        </UserContext.Provider>
    );
};
