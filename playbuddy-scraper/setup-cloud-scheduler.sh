#!/bin/bash

# Google Cloud Scheduler setup for PlayBuddy Scraper
# This script creates a Cloud Scheduler job to trigger scraping every 12 hours

# Configuration
PROJECT_ID=${PROJECT_ID:-"your-project-id"}
SERVICE_URL=${SERVICE_URL:-"https://your-service-url"}
JOB_NAME=${JOB_NAME:-"playbuddy-scraper-job"}
SCHEDULE=${SCHEDULE:-"0 */12 * * *"}  # Every 12 hours
TIMEZONE=${TIMEZONE:-"UTC"}

echo "Creating Cloud Scheduler job: $JOB_NAME"
echo "Schedule: $SCHEDULE"
echo "Target URL: $SERVICE_URL/scrape"
echo "Timezone: $TIMEZONE"

# Create the scheduler job
gcloud scheduler jobs create http "$JOB_NAME" \
  --project="$PROJECT_ID" \
  --schedule="$SCHEDULE" \
  --uri="$SERVICE_URL/scrape" \
  --http-method=GET \
  --time-zone="$TIMEZONE" \
  --description="Automated scraping job for PlayBuddy events" \
  --attempt-deadline=600s \
  --max-retry-attempts=3 \
  --max-retry-duration=3600s

if [ $? -eq 0 ]; then
    echo "✅ Cloud Scheduler job created successfully!"
    echo ""
    echo "To view the job:"
    echo "gcloud scheduler jobs describe $JOB_NAME --project=$PROJECT_ID"
    echo ""
    echo "To manually trigger the job:"
    echo "gcloud scheduler jobs run $JOB_NAME --project=$PROJECT_ID"
    echo ""
    echo "To view job logs:"
    echo "gcloud scheduler jobs describe $JOB_NAME --project=$PROJECT_ID"
else
    echo "❌ Failed to create Cloud Scheduler job"
    exit 1
fi