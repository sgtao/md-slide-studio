/**
 * ControlCluster.tsx — 右上コントロール（base-template.html の .control-cluster 移植）。
 * テーマ切替 / ビュー切替 / パレット5色ドロップダウン / エクスポートメニュー。
 *
 * v0.4.7: 配置を .preview-pane の内側から .workspace 直下へ移した。
 *   'editor' レイアウトでは .preview-pane 自体がアンマウントされるため、
 *   内側に置いたままだとテーマ・パレットまで操作できなくなるため。
 *   .control-cluster は position:fixed なので、移しても見た目の位置は変わらない。
 *
 * v0.4.7: disabled — 'editor' レイアウト時に true。DOM実体を必要とする書き出し
 *   （PNG/ZIP/HTML/PDF）と、プレビューの見せ方を変える view 切替を無効化する。
 *   テーマ・パレットはエディタの配色にも効くため有効のままにする。
 */
import { useEffect, useRef, useState } from 'react';
import type { Palette } from '@mdss/core';

/** 'editor' レイアウトで無効化したボタンに出す説明。 */
const DISABLED_TITLE = '「編集のみ」表示中は使用できません';

const PALETTE_META: { id: Palette; icon: string; label: string }[] = [
  { id: 'ocean', icon: '🌊', label: 'Ocean（既定）' },
  { id: 'forest', icon: '🌲', label: 'Forest' },
  { id: 'sunset', icon: '🌅', label: 'Sunset' },
  { id: 'plum', icon: '🍇', label: 'Plum' },
  { id: 'graphite', icon: '⬛', label: 'Graphite' },
  { id: 'ruby', icon: '💎', label: 'Ruby' },
  { id: 'gold', icon: '✨', label: 'Gold' },
];

interface Props {
  theme: 'light' | 'dark';
  view: 'hero' | 'list';
  palette: Palette;
  /** 'editor' レイアウト時に true。view切替とエクスポートを無効化する（既定 false）。 */
  disabled?: boolean;
  onToggleTheme: () => void;
  onToggleView: () => void;
  onSetPalette: (p: Palette) => void;
  onExportHtml: () => void;
  onExportPdf: () => void;
  onExportPng: () => void;
  onExportZip: () => void;
  onExportMd: () => void;
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

  const toggle = (m: 'palette' | 'export') => {
    if (props.disabled) return;
    setOpenMenu((cur) => (cur === m ? null : m));
  };

  return (
    <div className="control-cluster" ref={rootRef}>
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
