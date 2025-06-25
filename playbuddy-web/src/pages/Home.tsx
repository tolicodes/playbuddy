import { EventList } from '../components/EventList/EventList';
import { useFetchEvents } from '../../../common/src/db-axios/useEvents';

export const Home = () => {
    const { data: events = [], isLoading } = useFetchEvents();

    return (
        <div>
            <EventList
                events={events}
                isLoadingEvents={isLoading}
            />
        </div>
    );
}
