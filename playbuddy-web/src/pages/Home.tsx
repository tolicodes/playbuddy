import React, { useState } from 'react';
import { EventList } from '../components/EventList/EventList';
import type { SectionType } from '../components/EventList/EventList';
import { useFetchEvents } from '@common/db-axios/useEvents';
import WebEntryModal from '../components/WebEntryModal/WebEntryModal';

export const Home = () => {
    const { data: events = [], isLoading, error } = useFetchEvents();

    return (
        <div>
            <EventList
                events={events}
                isLoadingEvents={isLoading}
            />
        </div>
    );
}
