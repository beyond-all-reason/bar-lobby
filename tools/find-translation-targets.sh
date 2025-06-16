#!/usr/bin/env bash

SCRIPT_DIR="$(dirname "$0")"

# Find translation targets
#   This script finds lines in Vue files that display text content 
#   to the user and formats the output to be more readable. 
grep -e '{{.*}}' -e 'v-tooltip'  -e '>[^<]*[a-zA-Z][^<]*<' \
    -e 'title=".*"' -e 'label=".*"' -e "^[a-zA-Z',\. ]+$" \
    --exclude-dir=node_modules --include="*.vue" -r -n -T . | \
    grep -v '{{[[:space:]]*t(' | \
    grep -v "\/\/" | \
    grep -v "<!--" | \
    grep -v "if (" | \
    expand | \
    awk -F: '{
        file_uri = $1;
        line_num = $2;

        gsub(" ", "", file_uri);
        gsub(" ", "", line_num);

        file_line = file_uri"("line_num"):"; 
        content = $3;
        for(i=4; i<=NF; i++) {
            content = content ":" $i;
        }

        # Remove leading and trailing whitespace from content
        gsub(/^[ \t]+/, "", content);
        gsub(/[ \t]+$/, "", content);

        # Create padding with consistent width
        printf "%-70s %s\n", file_line, content;
    }'
