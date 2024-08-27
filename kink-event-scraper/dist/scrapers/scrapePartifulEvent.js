import puppeteer from "puppeteer";
import cheerio from "cheerio";
import { convertPartifulDateTime } from "../helpers/dateUtils.js";
async function scrapePartifulEvent({ url: eventId, sourceMetadata, urlCache, }) {
    const url = `https://partiful.com/e/${eventId}`;
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]

    });
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: "networkidle2" });
        const html = await page.content();
        const $ = cheerio.load(html);
        const name = $("h1 span.summary").first().text();
        const dateString = $("time").attr("datetime") || "";
        const timeString = $("time div div div:nth-child(2)").text() || "";
        const { start_date, end_date } = convertPartifulDateTime({
            dateString,
            timeString,
        });
        if (!start_date) {
            return null;
        }
        const location = $(".icon-location-with-lock + span").text().trim();
        const priceText = $(".icon-ticket").next().text().trim();
        const priceMatch = priceText.match(/\$\d+(\.\d+)?/);
        const price = priceMatch ? priceMatch[0] : "";
        const min_ticket_price = "";
        const max_ticket_price = "";
        const imageUrl = $("section div img").attr("src") || "";
        const organizer = $(".icon-crown-fancy").next().next().text().trim();
        const organizerUrl = "";
        const summary = $("div.description").text().trim();
        const tags = [];
        const eventDetails = {
            id: eventId,
            name,
            start_date,
            end_date,
            location,
            price,
            imageUrl,
            organizer,
            organizerUrl,
            eventUrl: url,
            summary,
            tags,
            min_ticket_price,
            max_ticket_price,
            source_ticketing_platform: "Partiful",
            ...sourceMetadata,
        };
        return [eventDetails];
    }
    catch (error) {
        console.error("Error scraping Partiful event:", error);
        return null;
    }
    finally {
        await browser.close();
    }
}
export default scrapePartifulEvent;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyYXBlUGFydGlmdWxFdmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zY3JhcGVycy9zY3JhcGVQYXJ0aWZ1bEV2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sU0FBUyxNQUFNLFdBQVcsQ0FBQztBQUNsQyxPQUFPLE9BQU8sTUFBTSxTQUFTLENBQUM7QUFHOUIsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFbEUsS0FBSyxVQUFVLG1CQUFtQixDQUFDLEVBQy9CLEdBQUcsRUFBRSxPQUFPLEVBQ1osY0FBYyxFQUNkLFFBQVEsR0FDSTtJQUNaLE1BQU0sR0FBRyxHQUFHLDBCQUEwQixPQUFPLEVBQUUsQ0FBQztJQUNoRCxNQUFNLE9BQU8sR0FBRyxNQUFNLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUMzRCxNQUFNLElBQUksR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUVyQyxJQUFJLENBQUM7UUFDRCxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDcEQsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEMsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUc3QixNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNqRCxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNwRCxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFDbkUsTUFBTSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsR0FBRyx1QkFBdUIsQ0FBQztZQUNyRCxVQUFVO1lBQ1YsVUFBVTtTQUNiLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNkLE9BQU8sSUFBSSxDQUFDO1FBQ2hCLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNwRSxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDekQsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNwRCxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQzlDLE1BQU0sZ0JBQWdCLEdBQUcsRUFBRSxDQUFDO1FBQzVCLE1BQU0sZ0JBQWdCLEdBQUcsRUFBRSxDQUFDO1FBQzVCLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDeEQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDckUsTUFBTSxZQUFZLEdBQUcsRUFBRSxDQUFDO1FBQ3hCLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ25ELE1BQU0sSUFBSSxHQUFhLEVBQUUsQ0FBQztRQUUxQixNQUFNLFlBQVksR0FBVTtZQUN4QixFQUFFLEVBQUUsT0FBTztZQUNYLElBQUk7WUFDSixVQUFVO1lBQ1YsUUFBUTtZQUNSLFFBQVE7WUFDUixLQUFLO1lBQ0wsUUFBUTtZQUNSLFNBQVM7WUFDVCxZQUFZO1lBQ1osUUFBUSxFQUFFLEdBQUc7WUFDYixPQUFPO1lBQ1AsSUFBSTtZQUNKLGdCQUFnQjtZQUNoQixnQkFBZ0I7WUFDaEIseUJBQXlCLEVBQUUsVUFBVTtZQUNyQyxHQUFHLGNBQWM7U0FDcEIsQ0FBQztRQUVGLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNiLE9BQU8sQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdkQsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztZQUFTLENBQUM7UUFDUCxNQUFNLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUMxQixDQUFDO0FBQ0wsQ0FBQztBQUVELGVBQWUsbUJBQW1CLENBQUMifQ==