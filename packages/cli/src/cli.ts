/**
 * cli.ts — `mdss-convert` のエントリ。
 *
 *   mdss-convert <input.md> [-o out.html] [options]
 *   cat in.md | mdss-convert - -o out.html
 *
 * options:
 *   -o, --out <path>     出力HTMLパス（省略時は stdout）
 *       --palette <id>   ocean|forest|sunset|plum|graphite（frontmatterより優先）
 *       --theme <id>     light|dark（既定 light）
 *       --json           HTMLを書き出しつつ、メタ情報(JSON)を stdout に出す
 *       --json-only      HTMLを生成せずメタ情報(JSON)のみ stdout（title/警告/lint確認用）
 *       --quiet          警告を stderr に出さない
 *   -h, --help / -v, --version
 *
 * 終了コード: 0=正常 / 1=入出力エラー / 2=引数エラー
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { convertMarkdown } from './render';

// ビルド時に esbuild の define で埋め込む（package.json version と一致）
declare const __MDSS_CLI_VERSION__: string;
const VERSION = typeof __MDSS_CLI_VERSION__ === 'string' ? __MDSS_CLI_VERSION__ : '0.0.0';

interface Args {
  input?: string;
  out?: string;
  palette?: string;
  theme?: string;
  json: boolean;
  jsonOnly: boolean;
  quiet: boolean;
  help: boolean;
  version: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { json: false, jsonOnly: false, quiet: false, help: false, version: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    switch (t) {
      case '-o':
      case '--out':
        a.out = argv[++i];
        break;
      case '--palette':
        a.palette = argv[++i];
        break;
      case '--theme':
        a.theme = argv[++i];
        break;
      case '--json':
        a.json = true;
        break;
      case '--json-only':
        a.jsonOnly = true;
        break;
      case '--quiet':
        a.quiet = true;
        break;
      case '-h':
      case '--help':
        a.help = true;
        break;
      case '-v':
      case '--version':
        a.version = true;
        break;
      default:
        if (t.startsWith('-') && t !== '-') {
          process.stderr.write(`不明なオプション: ${t}\n`);
          process.exit(2);
        }
        if (a.input === undefined) a.input = t;
        break;
    }
  }
  return a;
}

const HELP = `mdss-convert v${VERSION} — スライドMD → スタンドアロンHTML

使い方:
  mdss-convert <input.md> [-o out.html] [--palette <id>] [--theme <id>] [--json]
  cat in.md | mdss-convert - -o out.html

options:
  -o, --out <path>   出力HTMLパス（省略時は stdout へ）
      --palette <id> ocean|forest|sunset|plum|graphite（frontmatterより優先）
      --theme <id>   light|dark（既定 light）
      --json         HTMLを書き出しつつメタ情報(JSON)を stdout に出す
      --json-only    HTMLを生成せずメタ情報(JSON)のみ出力
      --quiet        警告を stderr に出さない
  -h, --help / -v, --version
`;

function readInput(input: string | undefined): string {
  if (input === undefined) {
    process.stderr.write('入力MDが指定されていません（-h でヘルプ）\n');
    process.exit(2);
  }
  if (input === '-') return readFileSync(0, 'utf-8'); // stdin
  return readFileSync(input, 'utf-8');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP);
    return;
  }
  if (args.version) {
    process.stdout.write(VERSION + '\n');
    return;
  }

  let md: string;
  try {
    md = readInput(args.input);
  } catch (e) {
    process.stderr.write(`入力の読み込みに失敗: ${(e as Error).message}\n`);
    process.exit(1);
  }

  const result = convertMarkdown(md, { palette: args.palette, theme: args.theme });

  // 警告・lintを stderr（機械可読が要る場合は --json）
  if (!args.quiet) {
    for (const w of result.warnings) process.stderr.write(`warning: ${w}\n`);
    for (const l of result.lint) {
      const where = l.slide !== undefined ? ` [slide ${l.slide}]` : '';
      process.stderr.write(`${l.level}:${where} ${l.message}\n`);
    }
  }

  const meta = {
    title: result.title,
    palette: result.palette,
    theme: result.theme,
    slideCount: result.slideCount,
    warnings: result.warnings,
    lint: result.lint,
  };

  if (args.jsonOnly) {
    process.stdout.write(JSON.stringify(meta, null, 2) + '\n');
    return;
  }

  try {
    if (args.out) {
      writeFileSync(args.out, result.html, 'utf-8');
      process.stderr.write(`wrote ${args.out} (${result.slideCount} slides)\n`);
    } else {
      process.stdout.write(result.html);
    }
  } catch (e) {
    process.stderr.write(`出力の書き込みに失敗: ${(e as Error).message}\n`);
    process.exit(1);
  }

  if (args.json) {
    process.stdout.write(JSON.stringify(meta, null, 2) + '\n');
  }
}

main();
