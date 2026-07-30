import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// CSS統合順は元スキルのSSoT（SKILL.md 参照ファイルガイド）を踏襲:
// theme-vars → slide-core → nav-controls → figure → chart → diagram →
// list-view → print（必ず最後）→ content（旧デッキ側CSS）→ app（シェル）
// → steps（v0.2.0）→ timeline-sidelist（v0.2.1）→ contrast（v0.2.3）→ svg-figure（v0.4.6）
import './theme/theme-vars.css';
import './theme/slide-core.css';
import './theme/nav-controls.css';
import './theme/figure.css';
import './theme/chart.css';
import './theme/diagram.css';
import './theme/list-view.css';
import './theme/print.css';
import './theme/content.css';
import './theme/app.css';
import './theme/steps.css';
import './theme/timeline-sidelist.css';
import './theme/contrast.css';
import './theme/svg-figure.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
