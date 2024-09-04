import { SafeAreaView } from "react-native-safe-area-context"
import EventSectionList from "./EventsList/EventSectionList"

export default () => {
    return (
        <SafeAreaView>
            <EventSectionList />
        </SafeAreaView>
    )
}