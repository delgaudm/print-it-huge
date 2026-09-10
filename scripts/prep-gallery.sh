#!/usr/bin/env bash
# Asset prep for the gallery: crop watermarked edges, (re)build thumbnails.
# Safe to re-run — each crop only applies while un-cropped dimensions remain.
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)/public/gallery-candidates"

# crop_if_larger FILE TARGET_H TARGET_W THRESHOLD_W
# Crops anchored to the top-left, dropping the bottom/right edges (watermark corner).
crop_if_larger() {
  local file="$1" th="$2" tw="$3" thresh="$4"
  local w
  w=$(sips -g pixelWidth "$file" | awk '/pixelWidth/{print $2}')
  if [ "$w" -le "$thresh" ]; then
    echo "already cropped: $(basename "$file")"
    return
  fi
  sips --cropOffset 0 0 -c "$th" "$tw" "$file" >/dev/null
  echo "cropped $(basename "$file") -> ${tw}x${th}"
}

# The two Rawpixel scans carry a watermark in the bottom-right corner.
crop_if_larger "$DIR/16-mondrian-composition.jpg" 1877 1884 1900
crop_if_larger "$DIR/17-beach-scene.jpg"          861  1688 1700

mkdir -p "$DIR/thumbs"
for f in "$DIR"/*.jpg; do
  base=$(basename "$f")
  cp "$f" "$DIR/thumbs/$base"
  sips -Z 440 "$DIR/thumbs/$base" >/dev/null
done
echo "thumbs rebuilt: $(ls "$DIR/thumbs" | wc -l | tr -d ' ') files"
