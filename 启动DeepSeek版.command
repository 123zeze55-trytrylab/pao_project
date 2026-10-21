#!/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
 echo "请先安装 Node.js LTS：https://nodejs.org/"
 read -r -p "按回车退出。" DPAO_FINISH
 exit 1
fi
if [ -z "${DEEPSEEK_API_KEY:-}" ] && [ ! -f .env.local ]; then
 echo "请输入 DeepSeek 开放平台 API Key（输入不显示，仅用于本次运行，不会写入文件）："
 read -r -s DEEPSEEK_API_KEY
 echo
 export DEEPSEEK_API_KEY
fi
if [ ! -d node_modules ]; then npm ci; fi
npm run studio
