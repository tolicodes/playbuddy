import axios from "axios";
import { fillInEndTime } from "../helpers/dateUtils.js";
import TurndownService from 'turndown';
const apiUrl = "https://api.joinbloom.community/events?perPage=10000";
export const scrapePluraEvents = async ({ sourceMetadata, }) => {
    const response = await axios.get(apiUrl);
    const data = response.data;
    const turndownService = new TurndownService();
    const events = data.hangouts
        .filter((event) => event.location?.city === "New York")
        .map((event) => {
        const detailsMarkdown = turndownService.turndown(event.details);
        console.log('detailsMarkdown', detailsMarkdown);
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
            summary: detailsMarkdown,
            tags: [],
            min_ticket_price: "",
            max_ticket_price: "",
            source_ticketing_platform: "Plura",
            ...sourceMetadata,
        };
    });
    return events;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyYXBlUGx1cmFFdmVudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvc2NyYXBlcnMvc2NyYXBlUGx1cmFFdmVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxLQUFLLE1BQU0sT0FBTyxDQUFDO0FBRTFCLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN4RCxPQUFPLGVBQWUsTUFBTSxVQUFVLENBQUM7QUFFdkMsTUFBTSxNQUFNLEdBQUcsc0RBQXNELENBQUM7QUFHdEUsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxFQUFFLEVBQ3RDLGNBQWMsR0FHZixFQUFvQixFQUFFO0lBQ3JCLE1BQU0sUUFBUSxHQUFHLE1BQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN6QyxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDO0lBRzNCLE1BQU0sZUFBZSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFJOUMsTUFBTSxNQUFNLEdBQVksSUFBSSxDQUFDLFFBQVE7U0FDbEMsTUFBTSxDQUFDLENBQUMsS0FBVSxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLElBQUksS0FBSyxVQUFVLENBQUM7U0FDM0QsR0FBRyxDQUFDLENBQUMsS0FBVSxFQUFFLEVBQUU7UUFDbEIsTUFBTSxlQUFlLEdBQUcsZUFBZSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFaEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUUvQyxPQUFPO1lBQ0wsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFO1lBQ1osSUFBSSxFQUFFLEtBQUssQ0FBQyxTQUFTO1lBQ3JCLFVBQVUsRUFBRSxLQUFLLENBQUMsYUFBYTtZQUMvQixRQUFRLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQztZQUMvRCxRQUFRLEVBQUUsa0JBQWtCO1lBQzVCLFFBQVEsRUFDTixHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxJQUFJLEVBQUUsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsSUFBSSxFQUFFLEtBQUssS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFO1lBQ2pLLEtBQUssRUFBRSxFQUFFO1lBQ1QsUUFBUSxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNyQyxTQUFTLEVBQUUsS0FBSyxDQUFDLFlBQVksRUFBRSxJQUFJO1lBQ25DLFlBQVksRUFBRSxLQUFLLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxHQUFHO1lBQy9DLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUTtZQUN4QixPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsRUFBRTtZQUNSLGdCQUFnQixFQUFFLEVBQUU7WUFDcEIsZ0JBQWdCLEVBQUUsRUFBRTtZQUNwQix5QkFBeUIsRUFBRSxPQUFPO1lBQ2xDLEdBQUcsY0FBYztTQUNsQixDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFDTCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDLENBQUMifQ==