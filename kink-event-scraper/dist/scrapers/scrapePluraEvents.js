import axios from "axios";
import { fillInEndTime } from "../helpers/dateUtils.js";
const apiUrl = "https://api.joinbloom.community/events?perPage=10000";
export const scrapePluraEvents = async ({ sourceMetadata, }) => {
    const response = await axios.get(apiUrl);
    const data = response.data;
    const events = data.hangouts
        .filter((event) => event.location?.city === "New York")
        .map((event) => {
        return {
            id: event.id,
            name: event.eventName,
            start_date: event.eventStartsAt,
            end_date: fillInEndTime(event.eventStartsAt, event.eventEndsAt),
            timezone: "America/New_York",
            location: `${event.location.address1 || ""} ${event.location.address2 || ""}, ${event.location.city}, ${event.location.region} ${event.location.postalCode || ""}`.trim(),
            price: "",
            imageUrl: event.image.urls["600x300"],
            organizer: event.organization?.name,
            organizerUrl: event.organization?.referral?.url,
            eventUrl: event.shareUrl,
            summary: event.details.replace(/<[^>]*>?/gm, ""),
            tags: [],
            min_ticket_price: "",
            max_ticket_price: "",
            source_ticketing_platform: "Plura",
            ...sourceMetadata,
        };
    });
    return events;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyYXBlUGx1cmFFdmVudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvc2NyYXBlcnMvc2NyYXBlUGx1cmFFdmVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxLQUFLLE1BQU0sT0FBTyxDQUFDO0FBRTFCLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUV4RCxNQUFNLE1BQU0sR0FBRyxzREFBc0QsQ0FBQztBQUd0RSxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLEVBQUUsRUFDdEMsY0FBYyxHQUdmLEVBQW9CLEVBQUU7SUFDckIsTUFBTSxRQUFRLEdBQUcsTUFBTSxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3pDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUM7SUFFM0IsTUFBTSxNQUFNLEdBQVksSUFBSSxDQUFDLFFBQVE7U0FDbEMsTUFBTSxDQUFDLENBQUMsS0FBVSxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLElBQUksS0FBSyxVQUFVLENBQUM7U0FDM0QsR0FBRyxDQUFDLENBQUMsS0FBVSxFQUFFLEVBQUU7UUFDbEIsT0FBTztZQUNMLEVBQUUsRUFBRSxLQUFLLENBQUMsRUFBRTtZQUNaLElBQUksRUFBRSxLQUFLLENBQUMsU0FBUztZQUNyQixVQUFVLEVBQUUsS0FBSyxDQUFDLGFBQWE7WUFDL0IsUUFBUSxFQUFFLGFBQWEsQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUM7WUFDL0QsUUFBUSxFQUFFLGtCQUFrQjtZQUM1QixRQUFRLEVBQ04sR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsSUFBSSxFQUFFLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLElBQUksRUFBRSxLQUFLLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRTtZQUNqSyxLQUFLLEVBQUUsRUFBRTtZQUNULFFBQVEsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDckMsU0FBUyxFQUFFLEtBQUssQ0FBQyxZQUFZLEVBQUUsSUFBSTtZQUNuQyxZQUFZLEVBQUUsS0FBSyxDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsR0FBRztZQUMvQyxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7WUFDeEIsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7WUFDaEQsSUFBSSxFQUFFLEVBQUU7WUFDUixnQkFBZ0IsRUFBRSxFQUFFO1lBQ3BCLGdCQUFnQixFQUFFLEVBQUU7WUFDcEIseUJBQXlCLEVBQUUsT0FBTztZQUNsQyxHQUFHLGNBQWM7U0FDbEIsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0wsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQyxDQUFDIn0=