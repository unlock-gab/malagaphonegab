#!/bin/bash
set -e

if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ GITHUB_TOKEN غير موجود"
  exit 1
fi

REPO_URL="https://${GITHUB_TOKEN}@github.com/unlock-gab/ecom.git"

git add -A
git diff --cached --quiet && echo "✅ لا يوجد تغييرات للرفع" && exit 0

git commit -m "auto: sync $(date '+%Y-%m-%d %H:%M')"
git push "$REPO_URL" HEAD:main

echo "✅ تم الرفع على GitHub بنجاح"
