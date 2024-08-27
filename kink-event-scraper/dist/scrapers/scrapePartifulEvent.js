import puppeteer from "puppeteer";
import cheerio from "cheerio";
import { convertPartifulDateTime } from "../helpers/dateUtils.js";
import { extractHtmlToMarkdown } from "../helpers/extractHtmlToMarkdown.js";
async function scrapePartifulEvent({ url: eventId, sourceMetadata, urlCache, }) {
    const url = `https://partiful.com/e/${eventId}`;
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
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
        const summary = await extractHtmlToMarkdown(page, "div.description");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyYXBlUGFydGlmdWxFdmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zY3JhcGVycy9zY3JhcGVQYXJ0aWZ1bEV2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sU0FBUyxNQUFNLFdBQVcsQ0FBQztBQUNsQyxPQUFPLE9BQU8sTUFBTSxTQUFTLENBQUM7QUFHOUIsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDbEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFHNUUsS0FBSyxVQUFVLG1CQUFtQixDQUFDLEVBQy9CLEdBQUcsRUFBRSxPQUFPLEVBQ1osY0FBYyxFQUNkLFFBQVEsR0FDSTtJQUNaLE1BQU0sR0FBRyxHQUFHLDBCQUEwQixPQUFPLEVBQUUsQ0FBQztJQUNoRCxNQUFNLE9BQU8sR0FBRyxNQUFNLFNBQVMsQ0FBQyxNQUFNLENBQUM7UUFDbkMsUUFBUSxFQUFFLElBQUk7UUFDZCxJQUFJLEVBQUUsQ0FBQyxjQUFjLEVBQUUsMEJBQTBCLENBQUM7S0FFckQsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxJQUFJLEdBQUcsTUFBTSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFFckMsSUFBSSxDQUFDO1FBQ0QsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFHN0IsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDakQsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDcEQsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDO1FBQ25FLE1BQU0sRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLEdBQUcsdUJBQXVCLENBQUM7WUFDckQsVUFBVTtZQUNWLFVBQVU7U0FDYixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDZCxPQUFPLElBQUksQ0FBQztRQUNoQixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFDLGlDQUFpQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDcEUsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3pELE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDcEQsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUM5QyxNQUFNLGdCQUFnQixHQUFHLEVBQUUsQ0FBQztRQUM1QixNQUFNLGdCQUFnQixHQUFHLEVBQUUsQ0FBQztRQUM1QixNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3hELE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3JFLE1BQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQztRQUN4QixNQUFNLE9BQU8sR0FBRyxNQUFNLHFCQUFxQixDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sSUFBSSxHQUFhLEVBQUUsQ0FBQztRQUkxQixNQUFNLFlBQVksR0FBVTtZQUN4QixFQUFFLEVBQUUsT0FBTztZQUNYLElBQUk7WUFDSixVQUFVO1lBQ1YsUUFBUTtZQUNSLFFBQVE7WUFDUixLQUFLO1lBQ0wsUUFBUTtZQUNSLFNBQVM7WUFDVCxZQUFZO1lBQ1osUUFBUSxFQUFFLEdBQUc7WUFDYixPQUFPO1lBQ1AsSUFBSTtZQUNKLGdCQUFnQjtZQUNoQixnQkFBZ0I7WUFDaEIseUJBQXlCLEVBQUUsVUFBVTtZQUNyQyxHQUFHLGNBQWM7U0FDcEIsQ0FBQztRQUVGLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNiLE9BQU8sQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdkQsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztZQUFTLENBQUM7UUFDUCxNQUFNLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUMxQixDQUFDO0FBQ0wsQ0FBQztBQUVELGVBQWUsbUJBQW1CLENBQUMifQ==