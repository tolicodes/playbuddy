#!/bin/bash

# Define the source files
SOURCE_FILES=("common/types/commonTypes.ts" "common/types/userEventTypes.ts" "common/config.ts")

# Define the target directories
TARGET_DIRECTORIES=(
  "playbuddy-mobile"
  "playbuddy-scraper/src"
  "playbuddy-api/src"
  "playbuddy-web/src/common"
)

# Loop through each target directory and copy each source file
for TARGET_DIR in "${TARGET_DIRECTORIES[@]}"; do
  if [ -d "$TARGET_DIR" ]; then
    for SOURCE_FILE in "${SOURCE_FILES[@]}"; do
      cp "$SOURCE_FILE" "$TARGET_DIR/"
      echo "Copied $SOURCE_FILE to $TARGET_DIR/"
    done
  else
    echo "Target directory $TARGET_DIR does not exist. Skipping..."
  fi
done

echo "Done!"
