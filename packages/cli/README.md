# mdss-convert

A CLI that **deterministically** converts slide Markdown source into a standalone HTML file (self-contained, runs in the browser alone).

It reuses the exact same parser (`@mdss/core`) and renderer (`SlideRenderer`) as the MD Slide Studio web app **via Node's `react-dom/server`**, so slides never drift between the web version and the CLI version.

It's intended for replacing the LLM-based MD→HTML conversion step in the `websearch-slide-ja` skill with a call to this CLI instead.

## Usage

```bash
# File → HTML
npx mdss-convert path/to/slide.md -o slide.html

# Pipe (stdin)
cat slide.md | npx mdss-convert - -o slide.html

# Override frontmatter palette + use dark theme
npx mdss-convert slide.md -o slide.html --palette forest --theme dark

# Skip HTML output, get metadata only (title, warnings, lint) as JSON — for skill integration
npx mdss-convert slide.md --json-only
```

To install and use directly:

```bash
npm i -g mdss-convert   # or add it to your project's devDependencies and use it via npm scripts
mdss-convert slide.md -o slide.html
```

## Options

| Option | Description |
|---|---|
| `-o, --out <path>` | Output HTML path (defaults to stdout) |
| `--palette <id>` | `ocean` / `forest` / `sunset` / `plum` / `graphite` (overrides frontmatter) |
| `--theme <id>` | `light` / `dark` (default `light`) |
| `--json` | Write the HTML and also print metadata (JSON) to stdout |
| `--json-only` | Skip HTML generation, print metadata (JSON) only |
| `--quiet` | Suppress warnings/lint output to stderr |
| `-h, --help` / `-v, --version` | Help / version |

Exit codes: `0` = success / `1` = I/O error / `2` = argument error. Following the parser's non-crashing convention, unknown values or malformed blocks never cause a hard error — they're surfaced instead as warnings (`warnings` / `lint` in `--json`/`--json-only`).

## Output

Metadata returned by `--json` / `--json-only`:

```json
{
  "title": "Deck title",
  "palette": "ocean",
  "theme": "light",
  "slideCount": 12,
  "warnings": ["..."],
  "lint": [{ "level": "info", "message": "...", "slide": 5 }]
}
```

The generated HTML is a self-contained file with the same structure as the web app's "Save as HTML" output (control cluster / theme & palette switcher / `←`/`→` navigation / PDF printing / embedded JS for PNG & ZIP export). Only PNG/ZIP export dynamically loads `html2canvas` / `JSZip` from a CDN at runtime (use the `P` key for PDF export when offline).

## How it works

```
MD ─ parseSlideMarkdown(@mdss/core) ─▶ SlideDeck (AST)
                                          │
    Each slide rendered via SlideRenderer(@mdss/app) with renderToStaticMarkup
                                          │
        Sequence of .slide sections + concatenated CSS (13 files) + embedded JS
                                          ▼
                          assembleStandaloneHtml → single HTML file
```

- **A single source of truth for rendering.** It calls the web app's `SlideRenderer.tsx` directly, so the same MD always produces the same slides.
- **The published bundle is fully self-contained.** `build.mjs` inlines `react` / `react-dom` / `zod` / `yaml` and all 13 CSS files into `dist/cli.mjs`, so no extra install is needed when run via `npx`.

## Building (development)

After installing dependencies at the monorepo root:

```bash
npm install                      # resolve workspace dependencies at the root
npm run build -w mdss-convert    # concatenate theme CSS → generate dist/cli.mjs via esbuild
npm test  -w mdss-convert        # build + smoke tests
npm run pack:dist                # generate a distributable tarball
```

## License

MIT
