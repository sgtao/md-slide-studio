#!/usr/bin/env bash
# apply-split-image-fix.sh — テストの文字列リテラル修正
# slideMarkdown.test.ts の split-image テストブロックが
# 実改行で書かれてしまった問題を修正する
set -euo pipefail

FILE="src/parser/slideMarkdown.test.ts"

if ! grep -q "split-image" "$FILE" 2>/dev/null; then
  echo "[SKIP] split-image テストが見つかりません（先に apply-split-image.sh を適用してください）"
  exit 0
fi

# 既に修正済みかチェック（正しい形式: \\n が1行に収まっている）
if grep -q "split-image.*tone.*dark.*CASE" "$FILE" 2>/dev/null; then
  echo "[SKIP] テストは既に修正済みです"
  exit 0
fi

echo "=== apply-split-image-fix.sh ==="

python3 << 'PYEOF'
import sys

path = 'src/parser/slideMarkdown.test.ts'
with open(path, 'r') as f:
    content = f.read()

# 壊れたテストブロックを丸ごと差し替え
# まず split-image の describe ブロックを探して削除し、正しいものを追記

# describe('title layout: split-image' 以降を切り出して差し替え
marker = "// --- split-image (v0.2.3) ---"
if marker not in content:
    # marker なしの場合は describe 行を探す
    marker = "describe('title layout: split-image'"
    if marker not in content:
        print('[ERROR] split-image テストブロックが見つかりません', file=sys.stderr)
        sys.exit(1)

idx = content.index(marker)
# marker 以降を全て削除（テストファイル末尾に追記されたため）
content = content[:idx].rstrip() + '\n'

# 正しいテストブロックを追記（\n をエスケープ文字列として保持）
content += r"""
// --- split-image (v0.2.3) ---

describe('title layout: split-image', () => {
  it('layout: split-image を認識し image: を格納する', () => {
    const md = fm('<!-- slide: title, layout: split-image, tone: dark -->\n# CASE ==STUDIES==\nsubtitle: luxury residences\nimage: https://example.com/hero.jpg');
    const s = parseSlideMarkdown(md).slides[0] as TitleSlide;
    expect(s.type).toBe('title');
    expect(s.layout).toBe('split-image');
    expect(s.tone).toBe('dark');
    expect(s.heading).toBe('CASE ==STUDIES==');
    expect(s.subtitle).toBe('luxury residences');
    expect(s.image).toBe('https://example.com/hero.jpg');
  });

  it('image: が無い split-image は image が undefined', () => {
    const md = fm('<!-- slide: title, layout: split-image -->\n# No Image');
    const s = parseSlideMarkdown(md).slides[0] as TitleSlide;
    expect(s.layout).toBe('split-image');
    expect(s.image).toBeUndefined();
  });

  it('通常 title では image: は無視されない（格納される）', () => {
    const md = fm('<!-- slide: title -->\n# Normal\nimage: https://example.com/bg.jpg');
    const s = parseSlideMarkdown(md).slides[0] as TitleSlide;
    expect(s.layout).toBeUndefined();
    expect(s.image).toBe('https://example.com/bg.jpg');
  });

  it('image: に危険なスキームが含まれていても parseTitle はそのまま格納する（safeUrl はレンダラ側）', () => {
    const md = fm('<!-- slide: title, layout: split-image -->\n# Test\nimage: javascript:alert(1)');
    const s = parseSlideMarkdown(md).slides[0] as TitleSlide;
    expect(s.image).toBe('javascript:alert(1)');
  });
});
"""

with open(path, 'w') as f:
    f.write(content)
print('[OK] slideMarkdown.test.ts')
PYEOF

echo ""
echo "=== 検証 ==="
echo -n "[CHECK] 文字列リテラルが1行に収まっている: "
if grep -q "split-image.*tone.*dark.*#" "$FILE"; then
  echo "OK"
else
  echo "ERROR"
fi

echo -n "[CHECK] Unterminated string が無い: "
node --check "$FILE" 2>/dev/null && echo "OK" || echo "ERROR (node --check)"

echo ""
echo "次のステップ:"
echo "  npx vitest run    # 30件グリーン確認"
echo "  npm run lint      # 0 errors"
