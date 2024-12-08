type EventDetails = {
    title: string;
    startDate: string; // Format: YYYYMMDDTHHMMSSZ
    endDate: string;   // Format: YYYYMMDDTHHMMSSZ
    description: string;
    location: string;
};

// Function to generate the Google Calendar URL
export const generateGoogleCalendarUrl = ({ title, startDate, endDate, description, location }: EventDetails): string => {
    const baseUrl = "https://www.google.com/calendar/render";
    const params = new URLSearchParams({
        action: "TEMPLATE",
        text: title,
        dates: `${startDate}/${endDate}`,
        details: description,
        location: location,
    });
    return `${baseUrl}?${params.toString()}`;
};

