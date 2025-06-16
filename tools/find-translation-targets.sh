#!/usr/bin/env bash

SCRIPT_DIR="$(dirname "$0")"

# First pass - find translation targets
#   This part of the script finds lines in Vue files
#   that display text content to the user and writes
#   the result into a temporary file. 
grep -e '{{.*}}' -e 'v-tooltip'  -e '>[^<]*[a-zA-Z][^<]*<' \
    -e 'title=".*"' -e 'label=".*"' -e "^[a-zA-Z',\. ]+$" \
    --exclude-dir=node_modules --include="*.vue" -r -n -T . | \
    grep -v '{{[[:space:]]*t(' | \
    grep -v "\/\/" | \
    grep -v "<!--" | \
    grep -v "if (" > "$SCRIPT_DIR/temp_results.txt"

# Second pass - format and align the output
#   Here an AWK script is used to format the results 
#   from the previous step and the result is written
#   into the final results file.
cat "$SCRIPT_DIR/temp_results.txt" | \
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
    }' > "$SCRIPT_DIR/translation-targets.txt"

# Remove temporary results file
rm "$SCRIPT_DIR/temp_results.txt"

# Show the location the results file is written to
echo "Translation targets written to $SCRIPT_DIR/translation-targets.txt"
