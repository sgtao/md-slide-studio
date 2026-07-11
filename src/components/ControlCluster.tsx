/**
 * ControlCluster.tsx — 右上コントロール（base-template.html の .control-cluster 移植）。
 * テーマ切替 / ビュー切替 / パレット5色ドロップダウン / エクスポートメニュー。
 */
import { useEffect, useRef, useState } from 'react';
import type { Palette } from '../parser/types';

const PALETTE_META: { id: Palette; icon: string; label: string }[] = [
  { id: 'ocean', icon: '🌊', label: 'Ocean（既定）' },
  { id: 'forest', icon: '🌲', label: 'Forest' },
  { id: 'sunset', icon: '🌅', label: 'Sunset' },
  { id: 'plum', icon: '🍇', label: 'Plum' },
  { id: 'graphite', icon: '⬛', label: 'Graphite' },
];

interface Props {
  theme: 'light' | 'dark';
  view: 'hero' | 'list';
  palette: Palette;
  onToggleTheme: () => void;
  onToggleView: () => void;
  onSetPalette: (p: Palette) => void;
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

  const toggle = (m: 'palette' | 'export') => setOpenMenu((cur) => (cur === m ? null : m));

  return (
    <div className="control-cluster" ref={rootRef}>
      <button id="theme-toggle" onClick={props.onToggleTheme} title="テーマ切替">
        <span id="theme-icon">{props.theme === 'dark' ? '☀️' : '🌙'}</span>
      </button>
      <button id="view-toggle" onClick={props.onToggleView} title="表示切替（V）">
        {props.view === 'hero' ? '☰' : '▭'}
      </button>
      <div className="palette-menu">
        <button id="palette-toggle" onClick={() => toggle('palette')} title="カラーパレット">🎨</button>
        <div id="palette-dropdown" className="palette-dropdown" hidden={openMenu !== 'palette'} role="menu">
          {PALETTE_META.map((p) => (
            <button
              key={p.id} type="button" role="menuitem"
              className={`pal-${p.id}${props.palette === p.id ? ' is-active' : ''}`}
              onClick={() => { props.onSetPalette(p.id); setOpenMenu(null); }}
            >
              <span className="palette-ico">{p.icon}</span>{p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="export-menu">
        <button id="export-toggle" onClick={() => toggle('export')} title="エクスポート">📥</button>
        <div id="export-dropdown" className="export-dropdown" hidden={openMenu !== 'export'} role="menu">
          <button type="button" role="menuitem" onClick={() => { props.onExportPdf(); setOpenMenu(null); }}>
            📄 PDFとして印刷 <span className="kbd">P</span>
          </button>
          <button type="button" role="menuitem" onClick={() => { props.onExportPng(); setOpenMenu(null); }}>
            🖼️ このスライドをPNG <span className="kbd">Shift+S</span>
          </button>
          <button type="button" role="menuitem" onClick={() => { props.onExportZip(); setOpenMenu(null); }}>
            📦 全スライドをZIP <span className="kbd">Shift+P</span>
          </button>
          <button type="button" role="menuitem" onClick={() => { props.onExportMd(); setOpenMenu(null); }}>
            📝 スライドMDを保存
          </button>
        </div>
      </div>
    </div>
  );
}
