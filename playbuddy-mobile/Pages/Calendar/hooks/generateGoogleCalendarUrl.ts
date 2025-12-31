import moment from "moment-timezone";

type EventDetails = {
    title: string;
    startDate: string; // Accepts ISO or YYYYMMDDTHHMMSSZ
    endDate: string;   // Accepts ISO or YYYYMMDDTHHMMSSZ
    description: string;
    location: string;
};

// Function to generate the Google Calendar URL
export const generateGoogleCalendarUrl = ({ title, startDate, endDate, description, location }: EventDetails): string => {
    const baseUrl = "https://www.google.com/calendar/render";
    const formatDate = (value: string) => {
        if (!value) return "";
        const trimmed = value.trim();
        if (/^\d{8}T\d{6}Z$/.test(trimmed)) {
            return trimmed;
        }
        const parsed = moment(trimmed);
        if (!parsed.isValid()) {
            return trimmed;
        }
        return parsed.utc().format("YYYYMMDDTHHmmss[Z]");
    };

    const start = formatDate(startDate);
    const end = formatDate(endDate || startDate);
    const dates = start && end ? `${start}/${end}` : "";
    const params = new URLSearchParams({
        action: "TEMPLATE",
        text: title,
        dates,
        details: description,
        location: location,
    });
    return `${baseUrl}?${params.toString()}`;
};
