import axios from "axios";
const API_URL = "https://tantrany.com/api/events-listings.json.php?user=toli";
const ORGANIZER_PAGE = "https://tantrany.com";
export const scrapeOrganizerTantraNY = async ({ url = API_URL, sourceMetadata, }) => {
    try {
        const data = await axios.get(API_URL);
        const events = data.data.map((event) => {
            const startDate = new Date(`${event.Date} ${event.StartTime}`);
            const endDate = new Date(startDate);
            endDate.setHours(endDate.getHours() + parseFloat(event.HoursDuration));
            const location = `${event.LocationName} - ${event.Address1} ${event.City}, ${event.State} ${event.Zip}`;
            return {
                id: `organizer-tantra_ny-${event.EventId}`,
                name: event.ProductName,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                location,
                price: "0",
                imageUrl: `${ORGANIZER_PAGE}/${event.ImgFileURL}`,
                organizer: "Tantra NY",
                organizerUrl: ORGANIZER_PAGE,
                eventUrl: event.URL,
                summary: event.EventTitle,
                tags: ["tantra"],
                source_ticketing_platform: "Eventbrite",
                ...sourceMetadata,
            };
        });
        return events;
    }
    catch (error) {
        console.error(error);
        return [];
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFudHJhX255LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3NjcmFwZXJzL29yZ2FuaXplcnMvdGFudHJhX255LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUkxQixNQUFNLE9BQU8sR0FBRyw2REFBNkQsQ0FBQztBQUM5RSxNQUFNLGNBQWMsR0FBRyxzQkFBc0IsQ0FBQztBQUc5QyxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxLQUFLLEVBQUUsRUFDNUMsR0FBRyxHQUFHLE9BQU8sRUFDYixjQUFjLEdBQ0EsRUFBb0IsRUFBRTtJQUNwQyxJQUFJLENBQUM7UUFFSCxNQUFNLElBQUksR0FBRyxNQUFNLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFHdEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFVLEVBQVMsRUFBRTtZQUNqRCxNQUFNLFNBQVMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7WUFDL0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDcEMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1lBRXZFLE1BQU0sUUFBUSxHQUFHLEdBQUcsS0FBSyxDQUFDLFlBQVksTUFBTSxLQUFLLENBQUMsUUFBUSxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUM7WUFFeEcsT0FBTztnQkFDTCxFQUFFLEVBQUUsdUJBQXVCLEtBQUssQ0FBQyxPQUFPLEVBQUU7Z0JBQzFDLElBQUksRUFBRSxLQUFLLENBQUMsV0FBVztnQkFDdkIsVUFBVSxFQUFFLFNBQVMsQ0FBQyxXQUFXLEVBQUU7Z0JBQ25DLFFBQVEsRUFBRSxPQUFPLENBQUMsV0FBVyxFQUFFO2dCQUMvQixRQUFRO2dCQUNSLEtBQUssRUFBRSxHQUFHO2dCQUNWLFFBQVEsRUFBRSxHQUFHLGNBQWMsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFO2dCQUNqRCxTQUFTLEVBQUUsV0FBVztnQkFDdEIsWUFBWSxFQUFFLGNBQWM7Z0JBQzVCLFFBQVEsRUFBRSxLQUFLLENBQUMsR0FBRztnQkFDbkIsT0FBTyxFQUFFLEtBQUssQ0FBQyxVQUFVO2dCQUN6QixJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUM7Z0JBQ2hCLHlCQUF5QixFQUFFLFlBQVk7Z0JBQ3ZDLEdBQUcsY0FBYzthQUNsQixDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFckIsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDO0FBQ0gsQ0FBQyxDQUFDIn0=