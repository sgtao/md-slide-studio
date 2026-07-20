#!/usr/bin/env bash
# apply-v0.2.5b-flower-image.sh — sample.md の参考セクション画像（猫→花）を差し替え。
# apply-v0.2.5.sh を適用済みのリポジトリに対して実行する。
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

SAMPLE=src/samples/sample.md
if [ ! -f "$SAMPLE" ]; then
  err "$SAMPLE が見つかりません"
  exit 1
fi

python3 << 'PYEOF'
import sys

path = "src/samples/sample.md"
with open(path, encoding="utf-8") as f:
    src = f.read()

FLOWER_URL = "https://upload.wikimedia.org/wikipedia/commons/c/c3/Chrysanthemum01s3872.jpg"
CAT_URL = "https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg"

if FLOWER_URL in src and CAT_URL not in src:
    print("[SKIP]  sample.md は既に花の画像に差し替え済みです")
    sys.exit(0)

if CAT_URL not in src:
    print("[ERROR] sample.md: 猫の画像URLが見つかりませんでした（手動確認要）")
    sys.exit(1)

changed = 0

# 1) title split-image の image:
old1 = f"image: {CAT_URL}"
new1 = f"image: {FLOWER_URL}"
if old1 in src:
    src = src.replace(old1, new1, 1)
    changed += 1

# 2) figure の画像行（alt text も "image" に簡素化）
old2 = f"![猫の写真（例示画像）]({CAT_URL})"
new2 = f"![image]({FLOWER_URL})"
if old2 in src:
    src = src.replace(old2, new2, 1)
    changed += 1

# 3) figure の source リンク先（File:Cat03.jpg → File:Chrysanthemum01s3872.jpg）
old3 = "source: [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Cat03.jpg)"
new3 = "source: [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Chrysanthemum01s3872.jpg)"
if old3 in src:
    src = src.replace(old3, new3, 1)
    changed += 1

if changed == 0:
    print("[ERROR] sample.md: 差し替え対象の行が1つも見つかりませんでした（手動確認要）")
    sys.exit(1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)
print(f"[OK]    sample.md の画像を猫→花（Chrysanthemum）に差し替えました（{changed}箇所）")
PYEOF
RC=$?
if [ $RC -ne 0 ]; then STATUS=1; fi

echo ""
echo "===== 検証 ====="
grep -q "Chrysanthemum01s3872.jpg" "$SAMPLE" 2>/dev/null && ok "sample.md: 花の画像URLを確認" || err "sample.md: 花の画像URLが見つかりません"
grep -q "Cat03.jpg" "$SAMPLE" 2>/dev/null && err "sample.md: 猫の画像URLが残っています" || ok "sample.md: 猫の画像URLの撤去を確認"
grep -c "Chrysanthemum01s3872.jpg" "$SAMPLE" | grep -q "^3$" && ok "sample.md: 花の画像URLが3箇所（title image / figure画像 / source）で揃っている" || err "sample.md: 花の画像URLの出現数が想定（3箇所）と異なります"

echo ""
if [ $STATUS -eq 0 ]; then
  echo "===== すべて成功 ====="
else
  echo "===== エラーあり（上記 [ERROR] を確認してください） ====="
fi
exit $STATUS
