import { Text, View } from 'react-native'
import { useCalendarContext } from "../Calendar/CalendarContext";
import EventCalendarView from "../Calendar/EventCalendarView";
import { useEffect } from "react";
import { useUserContext } from "../Auth/UserContext";
import HeaderLoginButton from '../Auth/HeaderLoginButton';

export default () => {
    const { setFilters } = useCalendarContext();
    const { userId } = useUserContext();

    useEffect(() => {
        setFilters({ search: '', organizers: [] });
    }, [])

    return (
        userId
            ? < EventCalendarView isOnWishlist={true} />
            : (
                <>
                    <Text style={{ display: 'flex', textAlign: 'center', marginTop: 10 }}> Login to access wishlist</Text>
                    <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
                        <HeaderLoginButton showLoginText={true} />
                    </View>
                </>
            )

    )
}