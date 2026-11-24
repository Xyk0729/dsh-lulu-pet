#!/usr/bin/env bash
# 一次性发布脚本：建 GitHub 仓库 → push → 提示 PR 步骤。
# 先用 gh 登录：brew install gh && gh auth login
set -euo pipefail
OWNER="Xyk0729"
REPO="dsh-lulu-pet"
cd "$(dirname "$0")"

if ! command -v gh >/dev/null 2>&1; then
  echo "缺少 gh CLI：先执行 brew install gh && gh auth login" >&2
  exit 1
fi
gh auth status >/dev/null 2>&1 || { echo "还没登录：请先 gh auth login" >&2; exit 1; }

git add -A
git commit -m "chore: release 0.1.0" || true

if gh repo view "$OWNER/$REPO" >/dev/null 2>&1; then
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "git@github.com:$OWNER/$REPO.git"
  git push -u origin main
else
  gh repo create "$OWNER/$REPO" --public --source . --remote origin --push \
    --description "水豚噜噜：住在 DeepSeek Harness 窗口里的透明桌面宠物（DSH bundle）"
fi

echo
echo "✅ 仓库已就绪：https://github.com/$OWNER/$REPO"
echo "下一步（上架市场）："
echo "  1) fork https://github.com/awesome-dsh-plugin/awesome-dsh-plugin"
echo "  2) 在 data/plugins/ 新增 ${OWNER}__${REPO}.yml（内容见 PUBLISH.md）"
echo "  3) 提 PR，等合并（通常一天内自动收录）"
