#!/usr/bin/env bash
# Create rnk-* folders that only serve files from matching ld-* modules.
# No module.json, so Foundry does not load them as modules.
set -euo pipefail

MODULES_DIR="${1:-/home/foundry/foundry/live/data/Data/modules}"
SKIP='^(module\.json|package\.json|package-lock\.json|\.git|node_modules|tests)$'

if [[ ! -d "$MODULES_DIR" ]]; then
  echo "modules dir not found: $MODULES_DIR" >&2
  exit 1
fi

shopt -s nullglob
for ld_dir in "$MODULES_DIR"/ld-*; do
  [[ -d "$ld_dir" ]] || continue
  name="$(basename "$ld_dir")"
  rnk_name="rnk-${name#ld-}"
  rnk_dir="$MODULES_DIR/$rnk_name"
  if [[ -e "$rnk_dir" && ! -d "$rnk_dir" ]]; then
    echo "skip $rnk_name (exists and is not a directory)"
    continue
  fi
  mkdir -p "$rnk_dir"
  # Drop a leftover module.json so Foundry does not try to load the alias.
  rm -f "$rnk_dir/module.json"
  for entry in "$ld_dir"/*; do
    base="$(basename "$entry")"
    if [[ "$base" =~ $SKIP ]]; then
      continue
    fi
    target="$rnk_dir/$base"
    if [[ -L "$target" || -e "$target" ]]; then
      continue
    fi
    ln -s "../$name/$base" "$target"
  done
  echo "aliased $rnk_name -> $name"
done
