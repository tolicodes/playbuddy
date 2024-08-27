import express from "express";
import process from "node:process";
import { scrapeEvents } from "./scraper.js";
export const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.head("/", (req, res) => {
    res.send();
});
app.get("/scrape", async (req, res) => {
    await scrapeEvents();
    res.send({
        status: "ok",
    });
});
let server;
export async function start(port) {
    return new Promise((resolve) => {
        server = app
            .listen(port, () => {
            const address = server.address();
            console.log(`Listening on http://localhost:${address.port}`);
            ["SIGTERM", "SIGINT"].forEach((signal) => {
                process.on(signal, stop);
            });
            resolve(server);
        })
            .on("close", () => {
            console.log("Server connection closed");
        })
            .on("error", async (error) => {
            await stop(error);
        });
    });
}
export async function stop(signal) {
    if (signal instanceof Error) {
        process.exitCode = 1;
        console.error(`error: ${signal.message}`);
        console.log("stop (error)");
    }
    else {
        if (signal) {
            console.log(`stop (${signal})`);
        }
        else {
            console.log("stop");
        }
    }
    if (server) {
        try {
            await new Promise((resolve, reject) => {
                server.close((err) => {
                    err ? reject(err) : resolve();
                });
            });
        }
        catch (error) {
            process.exitCode = 1;
            console.error(error.message);
        }
    }
    console.log("Server stopped");
}
if (import.meta.url.endsWith(process.argv[1])) {
    const port = process.env["PORT"] || "8080";
    await start(port);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2FwcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLE9BQTRDLE1BQU0sU0FBUyxDQUFDO0FBR25FLE9BQU8sT0FBTyxNQUFNLGNBQWMsQ0FBQztBQUNuQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBRTVDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsR0FBRyxPQUFPLEVBQUUsQ0FBQztBQUc3QixHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2hELEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7QUFFeEIsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFZLEVBQUUsR0FBYSxFQUFRLEVBQUU7SUFDbEQsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ2IsQ0FBQyxDQUFDLENBQUM7QUFFSCxHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsR0FBWSxFQUFFLEdBQWEsRUFBaUIsRUFBRTtJQUN0RSxNQUFNLFlBQVksRUFBRSxDQUFDO0lBQ3JCLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFDUCxNQUFNLEVBQUUsSUFBSTtLQUNiLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxNQUFjLENBQUM7QUFDbkIsTUFBTSxDQUFDLEtBQUssVUFBVSxLQUFLLENBQUMsSUFBcUI7SUFDL0MsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1FBQzdCLE1BQU0sR0FBRyxHQUFHO2FBQ1QsTUFBTSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7WUFDakIsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sRUFBaUIsQ0FBQztZQUNoRCxP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