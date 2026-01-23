import React, { createContext, useContext, type ReactNode } from 'react';
import { useCalendarData, type CalendarData } from './useCalendarData';

const CalendarContext = createContext<CalendarData | undefined>(undefined);

// Deprecated: prefer useCalendarData and avoid context wiring.
export const useCalendarContext = () => {
    const context = useContext(CalendarContext);
    if (!context) {
        throw new Error('useCalendarContext must be used within CalendarProvider');
    }
    return context;
};

// // Helper function to remove explicit events
// const removeExplicitEvents = (eventsWithMetadata: EventWithMetadata[]) => {
//     return eventsWithMetadata.filter(event =>
//         EXPLICIT_WORDS.every(word => !event.name.toLowerCase().includes(word.toLowerCase()))
//     );
// };

// Deprecated: prefer useCalendarData and remove CalendarProvider.
export const CalendarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const contextValue = useCalendarData();

    return (
        <CalendarContext.Provider value={contextValue}>
            {children}
        </CalendarContext.Provider>
    );
};
