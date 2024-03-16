import yaml

with open('public/kinks.yaml', 'r') as file:
    kinks_data = yaml.load(file, Loader=yaml.FullLoader)

# This script will find duplicates based on 'idea_title' and print their positions in the list

# Store seen titles and their first occurrence index
seen_titles = {}
# Store duplicates and their line numbers
duplicates = []

for index, kink in enumerate(kinks_data, start=1):  # Starting index from 1 for human-readable line numbers
    title = kink.get('idea_title')
    if title in seen_titles:
        # If title seen before, add current index as duplicate
        duplicates.append((title, seen_titles[title], index))
    else:
        # Otherwise, mark it as seen
        seen_titles[title] = index

# Print duplicates and their line numbers
for title, first_line, dup_line in duplicates:
    print(f'Duplicate title "{title}" found at lines: {first_line} and {dup_line}.')