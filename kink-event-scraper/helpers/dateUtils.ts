import { fromZonedTime } from 'date-fns-tz';
import moment from 'moment';

export const localDateTimeToISOString = (date: string, time: string): string => {
    const dateTime = `${date} ${time}`;
    console.log('dateTime', dateTime);
    return fromZonedTime(dateTime, 'America/New_York').toISOString();
}

/**
 * Converts a date and time string into ISO 8601 format with an optional end time.
 * @param {Object} params - The input parameters.
 * @param {string} params.startDate - The starting date in ISO format.
 * @param {string} params.timeString - The human-readable time string.
 * @returns {Object} - An object containing start_date and end_date in ISO format.
 */
export const convertPartifulDateTime = ({
    dateString,
    timeString,
}: {
    dateString: string;
    timeString: string;
}) => {
    // Regex to capture start and optional end times
    const timeRegex =
        /(\d{1,2}:\d{2}(?:am|pm))(?:\s*–\s*(\d{1,2}:\d{2}(?:am|pm)))?/;
    const timeMatch = timeString.match(timeRegex);

    if (!timeMatch) {
        throw new Error('Invalid time string format');
    }

    const startTimeMatch = timeMatch[1];
    let endTimeMatch = timeMatch[2];

    // Parse the initial date
    const initialDate = moment(dateString);

    // Parse the start time and set it on the initial date
    const startDateTime = initialDate.clone().set({
        hour: moment(startTimeMatch, ['h:mma']).hour(),
        minute: moment(startTimeMatch, ['h:mma']).minute(),
        second: 0,
        millisecond: 0,
    });

    // By default, add 2 hours to the start time to get the end time
    let endDateTime: moment.Moment = startDateTime.clone().add(2, 'hours');

    // If an end time is provided, use it to set the endDateTime
    if (endTimeMatch) {
        endDateTime = initialDate.clone().set({
            hour: moment(endTimeMatch, ['h:mma']).hour(),
            minute: moment(endTimeMatch, ['h:mma']).minute(),
            second: 0,
            millisecond: 0,
        });
    }

    // Check if the end time is earlier than the start time and move to the next day if necessary
    if (endDateTime.isBefore(startDateTime)) {
        endDateTime.add(1, 'days');
    }

    // Return the formatted start and end dates in ISO format
    return {
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
    };
};

export const fillInEndTime = (startDateTime: string, endDateTime: string): string => {
    if (endDateTime) {
        return endDateTime
    }

    const start_date = moment(startDateTime);

    // By default, add 2 hours to the start time to get the end time
    let end_date = start_date.clone().add(2, 'hours');

    return end_date.toISOString()
}