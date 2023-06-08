#!/bin/bash

set -e

if command -v gh &> /dev/null; then
  gh release list \
    | cut -f 1 \
    | xargs -I {} gh release view v{} --json body,name --jq '"## " + .name + "\n" + .body + "\n"' \
    | grep -v -e "## What" | sed -e 's/##\( New Contributors\)/###\1/' > CHANGELOG.md
else
  echo "gh is not installed"
  exit
fi