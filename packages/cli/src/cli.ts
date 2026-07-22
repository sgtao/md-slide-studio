/**
 * cli.ts — `mdss-convert` のエントリ。
 *
 *   mdss-convert <input.md> [-o out.html] [options]
 *   cat in.md | mdss-convert - -o out.html
 *   mdss-convert --print-spec [-o spec.md]
 *   mdss-convert --sample-md  [-o sample.md]
 *   mdss-convert --extract-md <deck.html|-> [-o deck.md]
 *
 * options:
 *   -o, --out <path>     出力パス（省略時は stdout）
 *       --palette <id>   ocean|forest|sunset|plum|graphite（frontmatterより優先）
 *       --theme <id>     light|dark（既定 light）
 *       --json           HTMLを書き出しつつ、メタ情報(JSON)を stdout に出す
 *       --json-only      HTMLを生成せずメタ情報(JSON)のみ stdout（title/警告/lint確認用）
 *       --strict         lint に error があればHTMLを出力せず exit 3
 *       --quiet          警告を stderr に出さない
 *       --print-spec     スライドMD記法の仕様書(Markdown)を出力（変換しない）
 *       --sample-md      全type網羅のサンプル原稿を出力（変換しない）
 *       --extract-md <f> スタンドアロンHTMLから原稿MDを取り出す（変換しない）
 *   -h, --help / -v, --version
 *
 * 終了コード:
 *   0=正常 / 1=入出力エラー / 2=引数エラー / 3=strict違反(lint error) / 4=原稿MDを抽出できない
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { buildMarkdownSpec } from '@mdss/core';
import { convertMarkdown } from './render';
import { extractDeckMd } from './extract';
import { SAMPLE_MD } from './generated/sampleMd';

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
  strict: boolean;
  printSpec: boolean;
  sampleMd: boolean;
  extractMd?: string;
  help: boolean;
  version: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Args = {
    json: false,
    jsonOnly: false,
    quiet: false,
    strict: false,
    printSpec: false,
    sampleMd: false,
    help: false,
    version: false,
  };
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
      case '--strict':
        a.strict = true;
        break;
      case '--quiet':
        a.quiet = true;
        break;
      case '--print-spec':
        a.printSpec = true;
        break;
      case '--sample-md':
        a.sampleMd = true;
        break;
      case '--extract-md': {
        const v = argv[++i];
        if (v === undefined) {
          process.stderr.write('--extract-md にはHTMLファイルのパスが必要です（stdin は -）\n');
          process.exit(2);
        }
        a.extractMd = v;
        break;
      }
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
  mdss-convert --print-spec [-o markdown-format.md]
  mdss-convert --sample-md  [-o sample.md]
  mdss-convert --extract-md <deck.html> [-o deck.md]

options:
  -o, --out <path>   出力パス（省略時は stdout へ）
      --palette <id> ocean|forest|sunset|plum|graphite（frontmatterより優先）
      --theme <id>   light|dark（既定 light）
      --json         HTMLを書き出しつつメタ情報(JSON)を stdout に出す
      --json-only    HTMLを生成せずメタ情報(JSON)のみ出力
      --strict       lint に error があればHTMLを出力せず exit 3
      --quiet        警告・書き出しメッセージを stderr に出さない
      --print-spec   スライドMD記法の仕様書(Markdown)を出力（変換しない）
      --sample-md    全type網羅のサンプル原稿を出力（変換しない）
      --extract-md <f> スタンドアロンHTMLから原稿MDを取り出す（変換しない・stdinは -）
  -h, --help / -v, --version

終了コード: 0=正常 / 1=入出力エラー / 2=引数エラー / 3=strict違反 / 4=原稿MDを抽出できない
`;

function readInput(input: string | undefined): string {
  if (input === undefined) {
    process.stderr.write('入力MDが指定されていません（-h でヘルプ）\n');
    process.exit(2);
  }
  if (input === '-') return readFileSync(0, 'utf-8'); // stdin
  return readFileSync(input, 'utf-8');
}

/** テキスト（仕様書・サンプル・抽出MD）を -o またはstdoutへ。バイト等価を守るため加工しない。 */
function writeTextOutput(text: string, args: Args, label: string): void {
  if (args.out === undefined) {
    process.stdout.write(text);
    return;
  }
  try {
    writeFileSync(args.out, text, 'utf-8');
    if (!args.quiet) process.stderr.write(`wrote ${args.out} (${label})\n`);
  } catch (e) {
    process.stderr.write(`出力の書き込みに失敗: ${(e as Error).message}\n`);
    process.exit(1);
  }
}

/**
 * 変換を伴わないテキスト出力モード（--print-spec / --sample-md / --extract-md）。
 * 3つは相互排他。処理したら true を返す。
 */
function runTextMode(args: Args): boolean {
  const modes = [args.printSpec, args.sampleMd, args.extractMd !== undefined].filter(
    Boolean,
  ).length;
  if (modes === 0) return false;
  if (modes > 1) {
    process.stderr.write('--print-spec / --sample-md / --extract-md は同時に指定できません\n');
    process.exit(2);
  }
  if (args.input !== undefined) {
    process.stderr.write(`このモードでは入力MDを指定できません: ${args.input}\n`);
    process.exit(2);
  }

  if (args.printSpec) {
    writeTextOutput(buildMarkdownSpec({ generator: `mdss-convert v${VERSION}` }), args, 'spec');
    return true;
  }
  if (args.sampleMd) {
    writeTextOutput(SAMPLE_MD, args, 'sample');
    return true;
  }

  const src = args.extractMd;
  if (src === undefined) return false; // 到達しない（modes===1 の保証）
  let html: string;
  try {
    html = src === '-' ? readFileSync(0, 'utf-8') : readFileSync(src, 'utf-8');
  } catch (e) {
    process.stderr.write(`入力の読み込みに失敗: ${(e as Error).message}\n`);
    process.exit(1);
  }
  const md = extractDeckMd(html);
  if (md === null) {
    process.stderr.write(
      '原稿MD（DECK_MD）が見つかりません。mdss-convert / MD Slide Studio 生成のHTMLではない可能性があります\n',
    );
    process.exit(4);
  }
  writeTextOutput(md, args, 'markdown');
  return true;
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
  if (runTextMode(args)) return;

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
  const hasLintError = result.lint.some((l) => l.level === 'error');

  if (args.jsonOnly) {
    process.stdout.write(JSON.stringify(meta, null, 2) + '\n');
    if (args.strict && hasLintError) process.exit(3);
    return;
  }

  // strict: lint error があるときは HTML を書き出さない（誤って不完全な成果物を配らないため）
  if (args.strict && hasLintError) {
    process.stderr.write(
      'strict: lint に error があるためHTMLを出力しませんでした（--json-only で詳細を確認）\n',
    );
    if (args.json) process.stdout.write(JSON.stringify(meta, null, 2) + '\n');
    process.exit(3);
  }

  try {
    if (args.out) {
      writeFileSync(args.out, result.html, 'utf-8');
      if (!args.quiet) process.stderr.write(`wrote ${args.out} (${result.slideCount} slides)\n`);
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
