#!/usr/bin/env bash
# apply-split-image.sh — v0.2.3 Step①: title layout: split-image
#
# 使い方: cd <リポジトリルート> && bash apply-split-image.sh
# 冪等: 2回目以降は [SKIP] を出力して何もしない
#
# 変更ファイル:
#   src/parser/types.ts            — LayoutVariant に 'split-image' 追加、TitleSlide に image? 追加
#   src/parser/slideMarkdown.ts    — LAYOUTS に 'split-image' 追加、parseTitle() で image: 行を認識
#   src/components/slides/SlideRenderer.tsx — TitleView に split-image 分岐追加
#   src/theme/content.css          — .layout-split-image のスタイルを追記
#   src/parser/slideMarkdown.test.ts — split-image / image: のテスト追加
set -euo pipefail

MARKER="layout-split-image"
CHECK_FILE="src/parser/types.ts"

# --- 冪等チェック ---
if [ -f "$CHECK_FILE" ] && grep -q "split-image" "$CHECK_FILE" 2>/dev/null; then
  echo "[SKIP] split-image は既に適用済みです"
  exit 0
fi

echo "=== apply-split-image.sh ==="

# ─────────────────────────────────────────────
# 1. types.ts — LayoutVariant に 'split-image' 追加、TitleSlide に image? 追加
# ─────────────────────────────────────────────
echo "[1/5] types.ts"

# LayoutVariant に 'split-image' を追加
python3 -c "
import re, sys
path = 'src/parser/types.ts'
with open(path, 'r') as f:
    content = f.read()

# LayoutVariant: add split-image
old = \"export type LayoutVariant = 'two-col' | 'title-xl' | 'compact' | 'side-list';\"
new = \"export type LayoutVariant = 'two-col' | 'title-xl' | 'compact' | 'side-list' | 'split-image';\"
if old not in content:
    print('[ERROR] LayoutVariant anchor not found', file=sys.stderr)
    sys.exit(1)
content = content.replace(old, new)

# TitleSlide: add image? field
old_title = '''export interface TitleSlide extends SlideBase {
  type: 'title';
  heading: InlineText;
  subtitle?: InlineText;
  badges: string[];
}'''
new_title = '''export interface TitleSlide extends SlideBase {
  type: 'title';
  heading: InlineText;
  subtitle?: InlineText;
  badges: string[];
  /** split-image レイアウト時の画像URL（v0.2.3） */
  image?: string;
}'''
if old_title not in content:
    print('[ERROR] TitleSlide anchor not found', file=sys.stderr)
    sys.exit(1)
content = content.replace(old_title, new_title)

# Update version comment
content = content.replace(
    'スライドMD（markdown-format.md v0.7.0 + Studio拡張 v0.2.1）のAST型定義。',
    'スライドMD（markdown-format.md v0.7.0 + Studio拡張 v0.2.3）のAST型定義。'
)
content = content.replace(
    'v0.2.1: diagram-timeline・ChartSlide.sidePanel・layout: side-list',
    'v0.2.1: diagram-timeline・ChartSlide.sidePanel・layout: side-list\n * v0.2.3: TitleSlide.image（layout: split-image）'
)

with open(path, 'w') as f:
    f.write(content)
print('[OK] types.ts')
"

# ─────────────────────────────────────────────
# 2. slideMarkdown.ts — LAYOUTS に 'split-image' 追加、parseTitle() で image: を認識
# ─────────────────────────────────────────────
echo "[2/5] slideMarkdown.ts"

python3 -c "
import sys
path = 'src/parser/slideMarkdown.ts'
with open(path, 'r') as f:
    content = f.read()

# LAYOUTS 配列に 'split-image' を追加
old_layouts = \"const LAYOUTS: LayoutVariant[] = ['two-col', 'title-xl', 'compact', 'side-list'];\"
new_layouts = \"const LAYOUTS: LayoutVariant[] = ['two-col', 'title-xl', 'compact', 'side-list', 'split-image'];\"
if old_layouts not in content:
    print('[ERROR] LAYOUTS anchor not found', file=sys.stderr)
    sys.exit(1)
content = content.replace(old_layouts, new_layouts)

# parseTitle() に image: 行の認識を追加（アンカー方式）
# 1) 変数宣言 badges の次に image 変数を挿入
anchor1 = '  let badges: string[] = [];'
insert1 = '  let badges: string[] = [];\n  let image: string | undefined;'
if anchor1 not in content:
    print('[ERROR] parseTitle badges anchor not found', file=sys.stderr)
    sys.exit(1)
# 重複防止: image 変数が未追加の場合のみ
if 'let image: string | undefined;' not in content:
    content = content.replace(anchor1, insert1, 1)

# 2) return 文を image 込みに差し替え
anchor2 = '  return { heading, subtitle, badges };'
replace2 = '  return { heading, subtitle, badges, image };'
if anchor2 not in content:
    print('[ERROR] parseTitle return anchor not found', file=sys.stderr)
    sys.exit(1)
content = content.replace(anchor2, replace2, 1)

# 3) badges の continue; の後に image: マッチブロックを挿入
# 挿入位置: 「continue;\n    }\n  }\n  return」の最初の出現（parseTitle 内の末尾）
image_block = r'''    // v0.2.3: split-image レイアウト用の画像URL
    const im = line.match(/^image:\s*(.+)$/);
    if (im) {
      image = im[1].trim();
      continue;
    }'''
# badges の閉じ括弧の後、for ループの閉じ括弧の前に挿入
# アンカー: 「continue;\n    }\n  }\n  return」— badges 処理の最終行群
badges_end = '      continue;\n    }\n  }\n  return'
if 'const im = line.match' not in content:  # 未適用チェック
    if badges_end not in content:
        print('[ERROR] badges end anchor not found', file=sys.stderr)
        sys.exit(1)
    content = content.replace(
        badges_end,
        '      continue;\n    }\n' + image_block + '\n  }\n  return',
        1
    )

# Update version comment
content = content.replace(
    'Studio拡張 v0.2.1）のパーサー。',
    'Studio拡張 v0.2.3）のパーサー。'
)

with open(path, 'w') as f:
    f.write(content)
print('[OK] slideMarkdown.ts')
"

# ─────────────────────────────────────────────
# 3. SlideRenderer.tsx — TitleView に split-image 分岐追加
# ─────────────────────────────────────────────
echo "[3/5] SlideRenderer.tsx"

python3 -c "
import sys
path = 'src/components/slides/SlideRenderer.tsx'
with open(path, 'r') as f:
    content = f.read()

# TitleView を split-image 対応版に差し替え
old_title_view = '''function TitleView({ slide }: { slide: TitleSlide }) {
  return (
    <div className={\`slide-inner\${slide.layout === 'title-xl' ? ' layout-title-xl' : ''}\`}>
      {slide.badge && (
        <div className=\"slide-title-row\">
          <span className=\"slide-badge\">{slide.badge}</span>
        </div>
      )}
      <h1>{renderInline(slide.heading)}</h1>
      {slide.subtitle && <p className=\"subtitle\">{renderInline(slide.subtitle)}</p>}
      {slide.lead && <p className=\"slide-lead\">{renderInline(slide.lead)}</p>}
      {slide.badges.length > 0 && (
        <div className=\"badges\">
          {slide.badges.map((b, i) => (
            <span key={i} className=\"badge\">
              {b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}'''

new_title_view = '''function TitleView({ slide }: { slide: TitleSlide }) {
  // v0.2.3: split-image レイアウト — 左テキスト＋右画像
  if (slide.layout === 'split-image' && slide.image) {
    return (
      <div className=\"slide-inner layout-split-image\">
        <div className=\"split-text\">
          {slide.badge && (
            <div className=\"slide-title-row\">
              <span className=\"slide-badge\">{slide.badge}</span>
            </div>
          )}
          <h1>{renderInline(slide.heading)}</h1>
          {slide.subtitle && <p className=\"subtitle\">{renderInline(slide.subtitle)}</p>}
          {slide.lead && <p className=\"slide-lead\">{renderInline(slide.lead)}</p>}
          {slide.badges.length > 0 && (
            <div className=\"badges\">
              {slide.badges.map((b, i) => (
                <span key={i} className=\"badge\">
                  {b}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className=\"split-image\">
          <img
            src={safeUrl(slide.image)}
            alt={slide.heading}
            onError={(e) => {
              // 画像読み込み失敗時: 画像枠を非表示にし通常titleへ退行
              const imgContainer = e.currentTarget.parentElement;
              if (imgContainer) imgContainer.style.display = 'none';
              const textPane = imgContainer?.previousElementSibling as HTMLElement | null;
              if (textPane) {
                textPane.style.flex = '1';
                textPane.style.maxWidth = '100%';
              }
            }}
          />
        </div>
      </div>
    );
  }
  // 通常の title レイアウト
  return (
    <div className={\`slide-inner\${slide.layout === 'title-xl' ? ' layout-title-xl' : ''}\`}>
      {slide.badge && (
        <div className=\"slide-title-row\">
          <span className=\"slide-badge\">{slide.badge}</span>
        </div>
      )}
      <h1>{renderInline(slide.heading)}</h1>
      {slide.subtitle && <p className=\"subtitle\">{renderInline(slide.subtitle)}</p>}
      {slide.lead && <p className=\"slide-lead\">{renderInline(slide.lead)}</p>}
      {slide.badges.length > 0 && (
        <div className=\"badges\">
          {slide.badges.map((b, i) => (
            <span key={i} className=\"badge\">
              {b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}'''

if old_title_view not in content:
    print('[ERROR] TitleView anchor not found', file=sys.stderr)
    sys.exit(1)
content = content.replace(old_title_view, new_title_view)

with open(path, 'w') as f:
    f.write(content)
print('[OK] SlideRenderer.tsx')
"

# ─────────────────────────────────────────────
# 4. content.css — .layout-split-image のスタイルを追記
# ─────────────────────────────────────────────
echo "[4/5] content.css"

python3 -c "
import sys
path = 'src/theme/content.css'
with open(path, 'r') as f:
    content = f.read()

# layout-title-xl の後に split-image スタイルを追記
split_image_css = '''
/* ─── split-image（v0.2.3: title 左テキスト＋右画像） ─── */
.layout-split-image {
  display: flex;
  align-items: stretch;
  gap: 0;
  padding: 0;
  height: 100%;
}
.layout-split-image .split-text {
  flex: 0 0 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 48px 40px;
  box-sizing: border-box;
}
.layout-split-image .split-image {
  flex: 0 0 50%;
  overflow: hidden;
  position: relative;
}
.layout-split-image .split-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
/* split-image のテキスト側は余白調整 */
.layout-split-image h1 {
  font-size: 2.4rem;
  margin: 0 0 0.3em;
}
.layout-split-image .subtitle {
  font-size: 1rem;
  margin: 0;
}
'''

# layout-title-xl の定義ブロック末尾を探して直後に挿入
anchor = '.layout-title-xl h1 { font-size: 3.2rem; }'
if anchor not in content:
    # 別の場所にあるかもしれない — 末尾に追記
    content += split_image_css
else:
    # anchor の行を含む行の次の空行の後に挿入
    # ただしシンプルに: anchor の後にある次の空行の後に挿入
    idx = content.index(anchor) + len(anchor)
    # 次のルール定義の前に挿入
    content = content[:idx] + split_image_css + content[idx:]

with open(path, 'w') as f:
    f.write(content)
print('[OK] content.css')
"

# ─────────────────────────────────────────────
# 5. slideMarkdown.test.ts — split-image / image: のテスト追加
# ─────────────────────────────────────────────
echo "[5/5] slideMarkdown.test.ts"

python3 -c "
import sys
path = 'src/parser/slideMarkdown.test.ts'
with open(path, 'r') as f:
    content = f.read()

# TitleSlide の import に追加は不要（既に import されている）

# テスト追加: ファイル末尾に split-image テストブロックを追記
test_block = '''

// --- split-image (v0.2.3) ---

describe('title layout: split-image', () => {
  it('layout: split-image を認識し image: を格納する', () => {
    const md = fm('<!-- slide: title, layout: split-image, tone: dark -->\\n# CASE ==STUDIES==\\nsubtitle: luxury residences\\nimage: https://example.com/hero.jpg');
    const s = parseSlideMarkdown(md).slides[0] as TitleSlide;
    expect(s.type).toBe('title');
    expect(s.layout).toBe('split-image');
    expect(s.tone).toBe('dark');
    expect(s.heading).toBe('CASE ==STUDIES==');
    expect(s.subtitle).toBe('luxury residences');
    expect(s.image).toBe('https://example.com/hero.jpg');
  });

  it('image: が無い split-image は image が undefined', () => {
    const md = fm('<!-- slide: title, layout: split-image -->\\n# No Image');
    const s = parseSlideMarkdown(md).slides[0] as TitleSlide;
    expect(s.layout).toBe('split-image');
    expect(s.image).toBeUndefined();
  });

  it('通常 title では image: は無視されない（格納される）', () => {
    const md = fm('<!-- slide: title -->\\n# Normal\\nimage: https://example.com/bg.jpg');
    const s = parseSlideMarkdown(md).slides[0] as TitleSlide;
    expect(s.layout).toBeUndefined();
    expect(s.image).toBe('https://example.com/bg.jpg');
  });

  it('image: に危険なスキームが含まれていても parseTitle はそのまま格納する（safeUrl はレンダラ側）', () => {
    const md = fm('<!-- slide: title, layout: split-image -->\\n# Test\\nimage: javascript:alert(1)');
    const s = parseSlideMarkdown(md).slides[0] as TitleSlide;
    expect(s.image).toBe('javascript:alert(1)');
  });
});
'''

content += test_block

with open(path, 'w') as f:
    f.write(content)
print('[OK] slideMarkdown.test.ts')
"

# ─────────────────────────────────────────────
# 検証
# ─────────────────────────────────────────────
echo ""
echo "=== 検証 ==="

echo -n "[CHECK] types.ts に split-image: "
grep -q "split-image" src/parser/types.ts && echo "OK" || echo "ERROR"

echo -n "[CHECK] types.ts に image?: "
grep -q "image?: string" src/parser/types.ts && echo "OK" || echo "ERROR"

echo -n "[CHECK] slideMarkdown.ts LAYOUTS に split-image: "
grep -q "'split-image'" src/parser/slideMarkdown.ts && echo "OK" || echo "ERROR"

echo -n "[CHECK] slideMarkdown.ts parseTitle に image: "
grep -q "image:" src/parser/slideMarkdown.ts && echo "OK" || echo "ERROR"

echo -n "[CHECK] SlideRenderer.tsx に layout-split-image: "
grep -q "layout-split-image" src/components/slides/SlideRenderer.tsx && echo "OK" || echo "ERROR"

echo -n "[CHECK] SlideRenderer.tsx に safeUrl(slide.image): "
grep -q "safeUrl(slide.image)" src/components/slides/SlideRenderer.tsx && echo "OK" || echo "ERROR"

echo -n "[CHECK] SlideRenderer.tsx に onError フォールバック: "
grep -q "onError" src/components/slides/SlideRenderer.tsx && echo "OK" || echo "ERROR"

echo -n "[CHECK] content.css に .layout-split-image: "
grep -q ".layout-split-image" src/theme/content.css && echo "OK" || echo "ERROR"

echo -n "[CHECK] テストに split-image describe: "
grep -q "split-image" src/parser/slideMarkdown.test.ts && echo "OK" || echo "ERROR"

echo ""
echo "=== 完了 ==="
echo "次のステップ:"
echo "  npx tsc --noEmit           # 型チェック"
echo "  npx vitest run             # 単体テスト"
echo "  npm run lint               # ESLint"
echo "  npm run dev                # 目視確認"
