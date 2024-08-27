import axios from "axios";
import cheerio from "cheerio";
import scrapeEventbriteEventsFromOrganizerPage from "./scrapeEventbriteEventsFromOrganizerPage.js";
const scrapeEventbriteAllOrganizerEventsFromEventPage = async ({ url, sourceMetadata, urlCache, }) => {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const organizerUrl = $('[data-testid="organizer-name"] a').attr("href") || "";
        if (!organizerUrl) {
            console.error("No organizer URL found");
            return null;
        }
        const events = await scrapeEventbriteEventsFromOrganizerPage({
            url: organizerUrl,
            sourceMetadata,
        });
        const eventsWithMetadata = events.map((event) => ({
            ...event,
            ...sourceMetadata,
        }));
        return eventsWithMetadata;
    }
    catch (error) {
        console.error(`Error scraping Eventbrite organizer from event page ${sourceMetadata.url}:`, error);
        throw new Error("Error scraping Eventbrite organizer from event page");
    }
};
export default scrapeEventbriteAllOrganizerEventsFromEventPage;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyYXBlRXZlbnRicml0ZUFsbE9yZ2FuaXplckV2ZW50c0Zyb21FdmVudFBhZ2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvc2NyYXBlcnMvZXZlbnRicml0ZS9zY3JhcGVFdmVudGJyaXRlQWxsT3JnYW5pemVyRXZlbnRzRnJvbUV2ZW50UGFnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssTUFBTSxPQUFPLENBQUM7QUFFMUIsT0FBTyxPQUFPLE1BQU0sU0FBUyxDQUFDO0FBQzlCLE9BQU8sdUNBQXVDLE1BQU0sOENBQThDLENBQUM7QUFHbkcsTUFBTSwrQ0FBK0MsR0FBRyxLQUFLLEVBQUUsRUFDN0QsR0FBRyxFQUNILGNBQWMsRUFDZCxRQUFRLEdBQ00sRUFBMkIsRUFBRTtJQUMzQyxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsTUFBTSxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFN0IsTUFBTSxZQUFZLEdBQ2hCLENBQUMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFM0QsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ2xCLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztZQUN4QyxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLHVDQUF1QyxDQUFDO1lBQzNELEdBQUcsRUFBRSxZQUFZO1lBQ2pCLGNBQWM7U0FDZixDQUFDLENBQUM7UUFFSCxNQUFNLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDaEQsR0FBRyxLQUFLO1lBQ1IsR0FBRyxjQUFjO1NBQ2xCLENBQUMsQ0FBQyxDQUFDO1FBRUosT0FBTyxrQkFBa0IsQ0FBQztJQUM1QixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQ1gsdURBQXVELGNBQWMsQ0FBQyxHQUFHLEdBQUcsRUFDNUUsS0FBSyxDQUNOLENBQUM7UUFDRixNQUFNLElBQUksS0FBSyxDQUFDLHFEQUFxRCxDQUFDLENBQUM7SUFDekUsQ0FBQztBQUNILENBQUMsQ0FBQztBQUVGLGVBQWUsK0NBQStDLENBQUMifQ==