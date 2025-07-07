#!/bin/bash

# Make sure the script stops on error
set -e

# Load env vars from .env and format them for gcloud
ENV_VARS=$(cat .env | grep -v '^#' | xargs | sed 's/ /,/g')

# Deploy to Cloud Run
gcloud run deploy "$SERVICE" \
  --region="$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "$ENV_VARS" \
  --source .
