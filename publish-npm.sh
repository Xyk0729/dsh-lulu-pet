#!/usr/bin/env bash
# 在「终端」里运行本脚本：先登录 npm，再把 dsh-lulu-pet 发布到 npm。
set -euo pipefail
NODE="/Users/xyk0729/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node"
PNPM="/Users/xyk0729/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/pnpm/bin/pnpm.cjs"
cd "$(dirname "$0")"

echo "== 1/2 登录 npm（输入用户名 / 密码；开了 2FA 会再要一次验证码）"
"$NODE" "$PNPM" login --registry https://registry.npmjs.org/

echo "== 2/2 发布 dsh-lulu-pet@$(node -p "require('./package.json').version")"
"$NODE" "$PNPM" publish --access public --no-git-checks --registry https://registry.npmjs.org/

echo
echo "✅ 发布完成。验证："
echo "   curl -s https://registry.npmjs.org/dsh-lulu-pet | head -c 200"
