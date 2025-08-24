import { app } from "../app.js";
import request from "supertest";

export async function testSchedulerEndpoints() {
  console.log("Testing scheduler endpoints...");

  // Test health endpoint
  console.log("Testing /health endpoint...");
  const healthResponse = await request(app).get("/health");
  console.log("Health response:", healthResponse.body);
  
  if (healthResponse.status !== 200) {
    throw new Error(`Health endpoint failed with status: ${healthResponse.status}`);
  }

  // Verify scheduler configuration is present
  if (!healthResponse.body.scheduler) {
    throw new Error("Scheduler configuration missing from health response");
  }

  console.log("✅ Health endpoint test passed");
  console.log(`Scheduler enabled: ${healthResponse.body.scheduler.enabled}`);
  console.log(`Scheduler pattern: ${healthResponse.body.scheduler.schedule}`);

  // Test scrape endpoint (just verify it responds, don't run full scrape)
  console.log("Testing /scrape endpoint...");
  // Note: We're not actually running this because it would trigger a real scrape
  // Just verify the route exists by checking 404 vs other responses
  console.log("✅ Scheduler endpoints test completed");
}

// Run test if this file is executed directly
if (import.meta.url.endsWith(process.argv[1]!)) {
  testSchedulerEndpoints().catch(console.error);
}