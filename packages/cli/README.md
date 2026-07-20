# @mdss/cli — `mdss-convert`

スライドMD原稿を、ブラウザで自己完結して動くスタンドアロンHTML（1ファイル）へ**決定論的に**変換するCLI。MD Slide Studio の Web版とまったく同じパーサー（`@mdss/core`）とレンダラ（`SlideRenderer`）を **Node の `react-dom/server` 経由で再利用**するため、Web版とCLI版でスライドがドリフトしません。

`websearch-slide-ja` スキルの MD→HTML 変換ステップを、LLM生成から本CLI呼び出しに置き換える用途を想定しています。

## 使い方

```bash
# ファイル → HTML
npx @mdss/cli path/to/slide.md -o slide.html

# パイプ（stdin）
cat slide.md | npx @mdss/cli - -o slide.html

# frontmatterのpaletteを上書き＋ダークテーマ
npx @mdss/cli slide.md -o slide.html --palette forest --theme dark

# HTMLは出さず、メタ情報（タイトル・警告・lint）だけJSONで受け取る（スキル連携用）
npx @mdss/cli slide.md --json-only
```

インストールして使う場合:

```bash
npm i -g @mdss/cli   # または devDependency に追加
mdss-convert slide.md -o slide.html
```

## オプション

| オプション | 説明 |
|---|---|
| `-o, --out <path>` | 出力HTMLパス（省略時は stdout） |
| `--palette <id>` | `ocean` / `forest` / `sunset` / `plum` / `graphite`（frontmatterより優先） |
| `--theme <id>` | `light` / `dark`（既定 `light`） |
| `--json` | HTMLを書き出しつつメタ情報(JSON)を stdout に出す |
| `--json-only` | HTMLを生成せずメタ情報(JSON)のみ出力 |
| `--quiet` | 警告・lintを stderr に出さない |
| `-h, --help` / `-v, --version` | ヘルプ／バージョン |

終了コード: `0`=正常 / `1`=入出力エラー / `2`=引数エラー。パーサーの非クラッシュ規約に従い、
未知の値・不正なブロックはエラーで落とさず、警告（`--json`/`--json-only`の`warnings`・`lint`）として返します。

## 出力

`--json` / `--json-only` が返すメタ情報:

```json
{
  "title": "デッキタイトル",
  "palette": "ocean",
  "theme": "light",
  "slideCount": 12,
  "warnings": ["..."],
  "lint": [{ "level": "info", "message": "...", "slide": 5 }]
}
```

生成HTMLは、Web版の「HTMLとして保存」出力と同じ構造（コントロールクラスタ／テーマ・パレット切替／
`←`/`→`ナビ／PDF印刷／PNG・ZIP出力の埋め込みJS）を持つ自己完結ファイルです。PNG/ZIPだけは
実行時に `html2canvas` / `JSZip` をCDNから動的ロードします（オフラインでは `P` キーのPDF出力を利用）。

## 仕組み

```
MD ─ parseSlideMarkdown(@mdss/core) ─▶ SlideDeck(AST)
                                          │
       各 slide を SlideRenderer(@mdss/app) で renderToStaticMarkup
                                          │
        .slide セクション列 ＋ 連結CSS(13枚) ＋ 埋め込みJS
                                          ▼
                          assembleStandaloneHtml → 1ファイルHTML
```

- **描画の正は1実装**。Web版の `SlideRenderer.tsx` をそのまま呼ぶため、同じMDからは同じスライド。
- **公開バンドルは自己完結**。`build.mjs` が `react` / `react-dom` / `zod` / `yaml` と 13枚のCSSを
  すべて `dist/cli.mjs` にインライン化するので、`npx` 時に追加インストールは不要。

## ビルド（開発）

monorepoルートで依存を入れてから:

```bash
npm install            # ルートでworkspace依存を解決
npm run build -w @mdss/cli   # theme CSS連結 → esbuildで dist/cli.mjs 生成
npm test  -w @mdss/cli       # ビルド＋スモークテスト
```

## ライセンス

MIT
