#!/bin/bash
# Deploy script for Bus Widget to iCloud Scriptable directory

SCRIPTABLE_DIR="$HOME/Library/Mobile Documents/iCloud~dk~simonbs~Scriptable/Documents"
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Deploying Bus Widget to iCloud Scriptable..."

cp "$SOURCE_DIR/bus-widget.js" "$SCRIPTABLE_DIR/bus-widget.js"
echo "✓ Deployed bus-widget.js"

cp "$SOURCE_DIR/config.json" "$SCRIPTABLE_DIR/config.json"
echo "✓ Deployed config.json"

echo "Done."