import moment from 'moment';
import type { Event } from "../Common/types/commonTypes";

export const formatDate = (item: Event, listDate = false, listDoW = false) => {
    const startFormat = moment(item.start_date).minutes() === 0 ? 'hA' : 'h:mmA';
    const endFormat = moment(item.end_date).minutes() === 0 ? 'hA' : 'h:mmA';
    const timeRange = `${moment(item.start_date).format(startFormat)} - ${moment(item.end_date).format(endFormat)}`;

    const withDow = `${moment(item.start_date).format('dddd, MMM D, YYYY')} ${timeRange}`;

    // Lists date if we are using it in details view
    const formattedDateEvent = listDate ?
        (listDoW
            ? withDow
            : `${moment(item.start_date).format('MMM D YYYY')} ${timeRange}`)
        : timeRange;

    const formattedDateMultiDay = `${moment(item.start_date).format('MMM D')} - ${moment(item.end_date).format('MMM D YYYY')}`;

    const formattedDate = item.type === 'retreat' ? formattedDateMultiDay : formattedDateEvent;

    return formattedDate
}