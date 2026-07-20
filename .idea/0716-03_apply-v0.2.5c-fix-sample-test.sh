#!/usr/bin/env bash
# apply-v0.2.5c-fix-sample-test.sh — sample.test.ts のESLintエラー（7件）を修正。
# 原因: node:fs の readFileSync / node:url の fileURLToPath がこのプロジェクトの
#       型解決設定と噛み合わず、@typescript-eslint/no-unsafe-* に抵触していた。
# 対処: App.tsx が既に使っている Vite の `?raw` インポート（vite-env.d.ts で
#       型定義済み: declare module '*.md?raw'）に統一し、Node API呼び出し自体を排除する。
# 冪等: 複数回実行しても安全。
set -uo pipefail

if [ ! -f "package.json" ] || [ ! -d "src/parser" ]; then
  echo "[ERROR] リポジトリルートで実行してください（package.json / src/parser が見つかりません）"
  echo "        現在のディレクトリ: $(pwd)"
  exit 1
fi

STATUS=0
ok()   { echo "[OK]    $1"; }
skip() { echo "[SKIP]  $1"; }
err()  { echo "[ERROR] $1"; STATUS=1; }

TEST_FILE=src/samples/sample.test.ts
if [ ! -f "$TEST_FILE" ]; then
  err "$TEST_FILE が見つかりません"
  exit 1
fi

python3 << 'PYEOF'
import sys

path = "src/samples/sample.test.ts"
with open(path, encoding="utf-8") as f:
    src = f.read()

if "sample.md?raw" in src:
    print("[SKIP]  sample.test.ts は既に ?raw インポートに修正済みです")
    sys.exit(0)

old_header = """import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseSlideMarkdown } from '../parser/slideMarkdown';
import { lintDeck } from '../parser/deckLint';

const samplePath = fileURLToPath(new URL('./sample.md', import.meta.url));
const sampleMd = readFileSync(samplePath, 'utf-8');"""

new_header = """import { describe, it, expect } from 'vitest';
import { parseSlideMarkdown } from '../parser/slideMarkdown';
import { lintDeck } from '../parser/deckLint';
import sampleMd from './sample.md?raw';"""

if old_header not in src:
    print("[ERROR] sample.test.ts: 想定していたヘッダー部分が見つかりませんでした（手動確認要）")
    sys.exit(1)

src = src.replace(old_header, new_header, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)
print("[OK]    sample.test.ts: node:fs / node:url を撤去し、Vite の ?raw インポートに統一しました")
PYEOF
RC=$?
if [ $RC -ne 0 ]; then STATUS=1; fi

echo ""
echo "===== 検証 ====="
grep -q "node:fs\|node:url" "$TEST_FILE" 2>/dev/null && err "sample.test.ts: node:fs / node:url がまだ残っています" || ok "sample.test.ts: node:fs / node:url の撤去を確認"
grep -q "sample.md?raw" "$TEST_FILE" 2>/dev/null && ok "sample.test.ts: ?raw インポートを確認" || err "sample.test.ts: ?raw インポートが見つかりません"

echo ""
if [ $STATUS -eq 0 ]; then
  echo "===== すべて成功 ====="
else
  echo "===== エラーあり（上記 [ERROR] を確認してください） ====="
fi
exit $STATUS
