import { EventList } from '../components/EventList/EventList';
import { useFetchEvents } from '../../../common/src/db-axios/useEvents';
import { useState } from 'react';
import WebEntryModal from '../components/WebEntryModal/WebEntryModal';

export const Home = () => {
    const { data: events = [], isLoading } = useFetchEvents();

    const [showModal, setShowModal] = useState(true);

    return (
        <div>
            {showModal && <WebEntryModal onClose={() => setShowModal(false)} />}
            <EventList
                events={events}
                isLoadingEvents={isLoading}
            />
        </div>
    );
}
