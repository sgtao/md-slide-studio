/**
 * ControlCluster.tsx — 右上コントロール（base-template.html の .control-cluster 移植）。
 * テーマ切替 / ビュー切替 / 一覧グリッド・サムネ帯 / パレット5色ドロップダウン / エクスポートメニュー。
 *
 * ボタンの数と位置はビューによって変えない（v0.6.1）。🗒️ ノート・🎞️ サムネ帯は hero 専用なので、
 * list・グリッドでは隠さず disabled（薄く表示）にする。🗒️ はノートのあるデッキだけ出す（デッキ単位の条件）。
 *
 * 配置を .preview-pane の内側から .workspace 直下へ移した。
 *   'editor' レイアウトでは .preview-pane 自体がアンマウントされるため、
 *   内側に置いたままだとテーマ・パレットまで操作できなくなるため。
 *   .control-cluster は position:fixed なので、移しても見た目の位置は変わらない。
 *
 * disabled — 'editor' レイアウト時に true。DOM実体を必要とする書き出し
 *   （PNG/ZIP/HTML/PDF）と、プレビューの見せ方を変える view 切替を無効化する。
 *   テーマ・パレットはエディタの配色にも効くため有効のままにする。
 */
import { useEffect, useRef, useState } from 'react';
import type { Palette } from '@mdss/core';
import { NotesPopup, type NotesPopupProps } from './NotesPopup';

/** 'editor' レイアウトで無効化したボタンに出す説明。 */
const DISABLED_TITLE = '「編集のみ」表示中は使用できません';

const PALETTE_META: { id: Palette; icon: string; label: string }[] = [
  { id: 'ocean', icon: '🌊', label: 'Ocean（既定）' },
  { id: 'ruby', icon: '🔶', label: 'Ruby' },
  { id: 'forest', icon: '🌲', label: 'Forest' },
  { id: 'sunset', icon: '🌅', label: 'Sunset' },
  { id: 'plum', icon: '🍇', label: 'Plum' },
  { id: 'gold', icon: '✨', label: 'Gold' },
  { id: 'graphite', icon: '⬛', label: 'Graphite' },
];

interface Props {
  theme: 'light' | 'dark';
  view: 'hero' | 'list';
  palette: Palette;
  /** 'editor' レイアウト時に true。view切替とエクスポートを無効化する（既定 false）。 */
  disabled?: boolean;
  onToggleTheme: () => void;
  onToggleView: () => void;
  /** 一覧グリッド（G）を開いているか。開いている間は 🗒️ とサムネ帯ボタンを無効（薄く表示）にする */
  grid?: boolean;
  onToggleGrid?: () => void;
  /** サムネ帯（T）を開いているか。ボタンは hero ビュー（グリッド以外）のときだけ押せる */
  strip?: boolean;
  onToggleStrip?: () => void;
  onSetPalette: (p: Palette) => void;
  onExportHtml: () => void;
  onExportPdf: () => void;
  onExportPng: () => void;
  onExportZip: () => void;
  onExportMd: () => void;
  /**
   * スピーカーノートのポップアップ。デッキにノートが1つも無いときは渡さない（🗒️ を出さない）。
   * 🗒️ は hero ビューのときだけ押せる（それ以外は薄く表示）。
   */
  notes?: {
    open: boolean;
    onToggle: () => void;
    popup: NotesPopupProps;
  };
}

export function ControlCluster(props: Props) {
  const [openMenu, setOpenMenu] = useState<'palette' | 'export' | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // メニュー外クリックで閉じる
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openMenu]);

  // 無効化中はメニューを畳んで見せる。effect内でsetStateすると余分な再レンダリングを
  // 挟む（react-hooks/set-state-in-effect）ため、openMenu自体は書き換えず、
  // 表示に使う値をレンダリング時に導出する（クリック操作の記録用stateとは分離する）。
  const visibleMenu = props.disabled ? null : openMenu;

  // 🗒️・🎞️ とノートのポップアップは hero ビュー（1枚表示）のときだけ使える。
  // list・一覧グリッドでは、ボタンは隠さず disabled にする（数と位置を固定する）。
  const heroActive = props.view === 'hero' && !props.grid;

  const toggle = (m: 'palette' | 'export') => {
    if (props.disabled) return;
    setOpenMenu((cur) => (cur === m ? null : m));
  };

  return (
    <div className="control-cluster" ref={rootRef}>
      {heroActive && props.notes?.open && <NotesPopup {...props.notes.popup} />}
      {props.notes && (
        <button
          id="notes-toggle"
          type="button"
          onClick={props.notes.onToggle}
          disabled={!heroActive}
          className={props.notes.popup.notes.length === 0 ? 'is-empty' : undefined}
          aria-expanded={heroActive && props.notes.open}
          aria-label="スピーカーノート"
          title="ノート（N・1枚表示で使用）"
        >
          🗒️
        </button>
      )}
      <button id="theme-toggle" onClick={props.onToggleTheme} title="テーマ切替">
        <span id="theme-icon">{props.theme === 'dark' ? '☀️' : '🌙'}</span>
      </button>
      <button
        id="view-toggle"
        onClick={props.onToggleView}
        disabled={props.disabled}
        title={props.disabled ? DISABLED_TITLE : '表示切替（V）'}
      >
        {props.view === 'hero' ? '☰' : '▭'}
      </button>
      {props.onToggleGrid && (
        <button
          id="grid-toggle"
          type="button"
          onClick={props.onToggleGrid}
          disabled={props.disabled}
          aria-expanded={!!props.grid}
          aria-label="一覧グリッド"
          title={props.disabled ? DISABLED_TITLE : '一覧グリッド（G）'}
        >
          ▦
        </button>
      )}
      {props.onToggleStrip && (
        <button
          id="strip-toggle"
          type="button"
          onClick={props.onToggleStrip}
          disabled={props.disabled || !heroActive}
          aria-expanded={heroActive && !!props.strip}
          aria-label="サムネ帯"
          title={props.disabled ? DISABLED_TITLE : 'サムネ帯（T・1枚表示で使用）'}
        >
          🎞️
        </button>
      )}
      <div className="palette-menu">
        <button id="palette-toggle" onClick={() => toggle('palette')} title="カラーパレット">
          🎨
        </button>
        <div
          id="palette-dropdown"
          className="palette-dropdown"
          hidden={visibleMenu !== 'palette'}
          role="menu"
        >
          {PALETTE_META.map((p) => (
            <button
              key={p.id}
              type="button"
              role="menuitem"
              className={`pal-${p.id}${props.palette === p.id ? ' is-active' : ''}`}
              onClick={() => {
                props.onSetPalette(p.id);
                setOpenMenu(null);
              }}
            >
              <span className="palette-ico">{p.icon}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="export-menu">
        <button
          id="export-toggle"
          onClick={() => toggle('export')}
          disabled={props.disabled}
          title={props.disabled ? DISABLED_TITLE : 'エクスポート'}
        >
          📥
        </button>
        <div
          id="export-dropdown"
          className="export-dropdown"
          hidden={visibleMenu !== 'export'}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              props.onExportHtml();
              setOpenMenu(null);
            }}
          >
            🌐 HTMLとして保存
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              props.onExportPdf();
              setOpenMenu(null);
            }}
          >
            📄 PDFとして印刷 <span className="kbd">P</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              props.onExportPng();
              setOpenMenu(null);
            }}
          >
            🖼️ このスライドをPNG <span className="kbd">Shift+S</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              props.onExportZip();
              setOpenMenu(null);
            }}
          >
            📦 全スライドをZIP <span className="kbd">Shift+P</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              props.onExportMd();
              setOpenMenu(null);
            }}
          >
            📝 スライドMDを保存
          </button>
        </div>
      </div>
    </div>
  );
}
