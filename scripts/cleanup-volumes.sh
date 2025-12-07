#!/bin/bash

# Clean up any existing Porter DMG volumes
# This prevents "unable to execute hdiutil detach" errors

echo "Cleaning up any existing Porter volumes..."

# Find and detach any Porter volumes
shopt -s nullglob
for volume in /Volumes/Porter-*; do
  if [ -d "$volume" ]; then
    echo "Detaching volume: $volume"
    hdiutil detach "$volume" -force 2>/dev/null || hdiutil detach "$volume" 2>/dev/null || true
  fi
done
shopt -u nullglob

# Also check for volumes using hdiutil info (if hdiutil is available)
if command -v hdiutil >/dev/null 2>&1; then
  hdiutil info 2>/dev/null | grep -i "porter" | grep -i "image-path" | while read -r line; do
    volume_id=$(echo "$line" | awk '{print $NF}')
    if [ -n "$volume_id" ]; then
      echo "Detaching volume ID: $volume_id"
      hdiutil detach "$volume_id" -force 2>/dev/null || true
    fi
  done
fi

echo "Volume cleanup complete."
