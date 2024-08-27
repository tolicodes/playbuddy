import { fromZonedTime } from "date-fns-tz";
import moment from "moment";
export const localDateTimeToISOString = (date, time) => {
    const dateTime = `${date} ${time}`;
    return fromZonedTime(dateTime, "America/New_York").toISOString();
};
export const convertPartifulDateTime = ({ dateString, timeString, }) => {
    const timeRegex = /(\d{1,2}:\d{2}(?:am|pm))(?:\s*–\s*(\d{1,2}:\d{2}(?:am|pm)))?/;
    const timeMatch = timeString.match(timeRegex);
    if (!timeMatch) {
        throw new Error("Invalid time string format");
    }
    const startTimeMatch = timeMatch[1];
    let endTimeMatch = timeMatch[2];
    const initialDate = moment(dateString);
    const startDateTime = initialDate.clone().set({
        hour: moment(startTimeMatch, ["h:mma"]).hour(),
        minute: moment(startTimeMatch, ["h:mma"]).minute(),
        second: 0,
        millisecond: 0,
    });
    let endDateTime = startDateTime.clone().add(2, "hours");
    if (endTimeMatch) {
        endDateTime = initialDate.clone().set({
            hour: moment(endTimeMatch, ["h:mma"]).hour(),
            minute: moment(endTimeMatch, ["h:mma"]).minute(),
            second: 0,
            millisecond: 0,
        });
    }
    if (endDateTime.isBefore(startDateTime)) {
        endDateTime.add(1, "days");
    }
    return {
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
    };
};
export const fillInEndTime = (startDateTime, endDateTime) => {
    if (endDateTime) {
        return endDateTime;
    }
    const start_date = moment(startDateTime);
    let end_date = start_date.clone().add(2, "hours");
    return end_date.toISOString();
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0ZVV0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2hlbHBlcnMvZGF0ZVV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDNUMsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLENBQ3RDLElBQVksRUFDWixJQUFZLEVBQ0osRUFBRTtJQUNWLE1BQU0sUUFBUSxHQUFHLEdBQUcsSUFBSSxJQUFJLElBQUksRUFBRSxDQUFDO0lBQ25DLE9BQU8sYUFBYSxDQUFDLFFBQVEsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQ25FLENBQUMsQ0FBQztBQVNGLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLENBQUMsRUFDdEMsVUFBVSxFQUNWLFVBQVUsR0FJWCxFQUFFLEVBQUU7SUFFSCxNQUFNLFNBQVMsR0FDYiw4REFBOEQsQ0FBQztJQUNqRSxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBRTlDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsNEJBQTRCLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRUQsTUFBTSxjQUFjLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BDLElBQUksWUFBWSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUdoQyxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7SUFHdkMsTUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQztRQUM1QyxJQUFJLEVBQUUsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFO1FBQzlDLE1BQU0sRUFBRSxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUU7UUFDbEQsTUFBTSxFQUFFLENBQUM7UUFDVCxXQUFXLEVBQUUsQ0FBQztLQUNmLENBQUMsQ0FBQztJQUdILElBQUksV0FBVyxHQUFrQixhQUFhLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUd2RSxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQ2pCLFdBQVcsR0FBRyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDO1lBQ3BDLElBQUksRUFBRSxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUU7WUFDNUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRTtZQUNoRCxNQUFNLEVBQUUsQ0FBQztZQUNULFdBQVcsRUFBRSxDQUFDO1NBQ2YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUdELElBQUksV0FBVyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO1FBQ3hDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFHRCxPQUFPO1FBQ0wsVUFBVSxFQUFFLGFBQWEsQ0FBQyxXQUFXLEVBQUU7UUFDdkMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxXQUFXLEVBQUU7S0FDcEMsQ0FBQztBQUNKLENBQUMsQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxDQUMzQixhQUFxQixFQUNyQixXQUFtQixFQUNYLEVBQUU7SUFDVixJQUFJLFdBQVcsRUFBRSxDQUFDO1FBQ2hCLE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUM7SUFFRCxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUM7SUFHekMsSUFBSSxRQUFRLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFFbEQsT0FBTyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDaEMsQ0FBQyxDQUFDIn0=