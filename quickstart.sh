#!/bin/bash
# Quickstart script for Bus Widget
# Run this to configure your widget with your local bus stop

SCRIPTABLE_DIR="/Users/seanpaine/Library/Mobile Documents/iCloud~dk~simonbs~Scriptable/Documents"
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Bus Widget Quickstart ==="
echo ""

# Get stop ID
echo "Enter your bus stop ID (from ovzoeker.nl):"
read -r STOP_ID

if [ -z "$STOP_ID" ]; then
    echo "Error: Stop ID is required"
    exit 1
fi

# Get stop name
echo "Enter a name for this stop (e.g., 'Utrecht Centraal'):"
read -r STOP_NAME

if [ -z "$STOP_NAME" ]; then
    STOP_NAME="My Bus Stop"
fi

# Get lines to filter (optional)
echo "Enter bus lines to show (comma separated, or press Enter for all):"
read -r LINES

if [ -z "$LINES" ]; then
    LINES_JSON="[]"
else
    # Convert comma-separated to JSON array
    LINES_JSON=$(echo "$LINES" | sed 's/ *, */", "/g; s/^/["/; s/$/"]/')
fi

# Create config.json
cat > "$SOURCE_DIR/config.json" << EOF
{
    "stopId": "$STOP_ID",
    "stopName": "$STOP_NAME",
    "linesToShow": $LINES_JSON,
    "maxDepartures": 5,
    "refreshIntervalMinutes": 2,
    "apiEndpoint": "http://v0.ovapi.nl/tpc/",
    "styling": {
        "backgroundColor": "#FFFFFF",
        "primaryColor": "#FFE600",
        "textColor": "#000000",
        "errorColor": "#FF0000"
    },
    "cache": {
        "enabled": true,
        "maxAgeMinutes": 10
    }
}
EOF

echo ""
echo "Configuration created!"
echo ""
echo "To deploy to iCloud Scriptable, run:"
echo "  ./deploy.sh"
echo ""
echo "Then open Scriptable app and add the widget to your home screen."