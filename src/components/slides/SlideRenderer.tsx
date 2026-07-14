/**
 * SlideRenderer.tsx — slide-layouts.md の各レイアウトをtype別コンポーネントとして実装。
 * DOM構造・クラス名は元スキルの生成HTMLと互換（CSSをそのまま流用するため）。
 *
 * v0.2.0:
 * - SlideHeading / Note を common.tsx へ移し、badge / lead（共通ヘッダ拡張）に対応
 * - steps type（StepsView.tsx）を接続
 * - point:（下部強調帯）を全typeで PointBand として描画
 * - ディレクティブ tone: dark で section.slide に slide--dark クラスを付与
 */
import type {
  ChartSlide,
  ComparisonChartSlide,
  DiagramSlide,
  FeatureShowcaseSlide,
  FigureSlide,
  PointsSlide,
  Slide,
  SourcesSlide,
  SummarySlide,
  TableSlide,
  TimelineSlide,
  TitleSlide,
} from '../../parser/types';
import { renderInline, safeUrl } from '../../parser/inline';
import { BarChartSvg, ComparisonDonutSvg, DonutChartSvg, LineChartSvg } from '../charts/Charts';
import { CycleDiagramSvg, FlowDiagramSvg, LayerDiagramSvg, TimelineDiagramSvg } from '../diagrams/Diagrams';
import { Note, PointBand, SlideHeading } from './common';
import { StepsView } from './StepsView';

// --- title ---

function TitleView({ slide }: { slide: TitleSlide }) {
  return (
    <div className={`slide-inner${slide.layout === 'title-xl' ? ' layout-title-xl' : ''}`}>
      {slide.badge && (
        <div className="slide-title-row">
          <span className="slide-badge">{slide.badge}</span>
        </div>
      )}
      <h1>{renderInline(slide.heading)}</h1>
      {slide.subtitle && <p className="subtitle">{renderInline(slide.subtitle)}</p>}
      {slide.lead && <p className="slide-lead">{renderInline(slide.lead)}</p>}
      {slide.badges.length > 0 && (
        <div className="badges">
          {slide.badges.map((b, i) => (
            <span key={i} className="badge">
              {b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// --- points / summary ---

function listClass(base: string, layout?: string): string {
  const cls = [base];
  if (layout === 'two-col') cls.push('layout-two-col');
  if (layout === 'compact') cls.push('layout-compact');
  return cls.join(' ');
}

function PointsView({ slide }: { slide: PointsSlide }) {
  return (
    <div className="slide-inner">
      <SlideHeading text={slide.heading} badge={slide.badge} lead={slide.lead} />
      <ul className={listClass('points', slide.layout)}>
        {slide.items.map((item, i) => (
          <li key={i}>
            {item.lead && (
              <>
                <strong>{item.lead}</strong>：
              </>
            )}
            {renderInline(item.text)}
            {item.children.map((c, j) => (
              <span key={j} className="sub">
                {c.lead && (
                  <>
                    <strong>{c.lead}</strong>：
                  </>
                )}
                {renderInline(c.text)}
              </span>
            ))}
          </li>
        ))}
      </ul>
      <Note text={slide.note} />
    </div>
  );
}

function SummaryView({ slide }: { slide: SummarySlide }) {
  return (
    <div className="slide-inner">
      <SlideHeading text={slide.heading ?? 'まとめ'} badge={slide.badge} lead={slide.lead} />
      <ol className={listClass('summary-list', slide.layout)}>
        {slide.items.map((item, i) => (
          <li key={i}>
            {item.lead && (
              <>
                <strong>{item.lead}</strong>：
              </>
            )}
            {renderInline(item.text)}
            {item.children.map((c, j) => (
              <span key={j} className="sub">
                {renderInline(c.text)}
              </span>
            ))}
          </li>
        ))}
      </ol>
      <Note text={slide.note} />
    </div>
  );
}

// --- table ---

function TableView({ slide }: { slide: TableSlide }) {
  return (
    <div className="slide-inner top">
      <SlideHeading text={slide.heading} badge={slide.badge} lead={slide.lead} />
      <table className={`cmp-table${slide.layout === 'compact' ? ' layout-compact' : ''}`}>
        {slide.header.length > 0 && (
          <thead>
            <tr>
              {slide.header.map((h, i) => (
                <th key={i}>{renderInline(h)}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {slide.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) =>
                j === 0 ? (
                  <th key={j}>{renderInline(cell)}</th>
                ) : (
                  <td key={j}>{renderInline(cell)}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <Note text={slide.note} />
    </div>
  );
}

// --- chart ---

function ChartView({ slide }: { slide: ChartSlide }) {
  const chart = slide.chart;
  const isSideList = slide.layout === 'side-list' && slide.sidePanel;
  return (
    <div className="slide-inner">
      <SlideHeading text={slide.heading} badge={slide.badge} lead={slide.lead} />
      <div className={isSideList ? 'chart-side-list' : ''}>
      {chart ? (
        <div className="slide-chart">
          {chart.type === 'bar' && <BarChartSvg chart={chart} />}
          {chart.type === 'line' && <LineChartSvg chart={chart} />}
          {chart.type === 'donut' && <DonutChartSvg chart={chart} />}
        </div>
      ) : (
        <p className="note">（chart ブロックが未定義のため表示できません）</p>
      )}
      {isSideList && slide.sidePanel && (
          <div className="chart-side-panel">
            <h3>{slide.sidePanel.heading}</h3>
            <ul className="points">
              {slide.sidePanel.items.map((item, i) => (
                <li key={i}>
                  {item.lead && (
                    <>
                      <strong>{item.lead}</strong>：
                    </>
                  )}
                  {renderInline(item.text)}
                  {item.children.map((c, j) => (
                    <span key={j} className="sub">
                      {renderInline(c.text)}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <Note text={slide.note} />
    </div>
  );
}

// --- comparison-chart ---

function ComparisonChartView({ slide }: { slide: ComparisonChartSlide }) {
  const { left, chart } = slide;
  return (
    <div className="slide-inner">
      <div className="slide-with-description">
        <div className="cmp-left">
          {left.big && (
            <div className="cmp-big">
              {left.big}
              {left.bigUnit && <small>{left.bigUnit}</small>}
            </div>
          )}
          {left.heading && <h2>{renderInline(left.heading)}</h2>}
          <div className="cmp-divider" />
          {left.lead && <p className="cmp-lead">{renderInline(left.lead)}</p>}
          {left.stats.length > 0 && (
            <div className="cmp-stats">
              {left.stats.map((s, i) => (
                <div key={i} className="cmp-stat">
                  <span className="cmp-stat-num">{s.num}</span>
                  <span className="cmp-stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="cmp-right">
          {chart ? (
            <div className="slide-chart comparison">
              <ComparisonDonutSvg chart={chart} />
            </div>
          ) : (
            <p className="note">（comparison-donut ブロックが未定義のため表示できません）</p>
          )}
        </div>
      </div>
    </div>
  );
}

// --- diagram ---

function DiagramView({ slide, index }: { slide: DiagramSlide; index: number }) {
  const d = slide.diagram;
  return (
    <div className="slide-inner">
      <SlideHeading text={slide.heading} badge={slide.badge} lead={slide.lead} />
      {d ? (
        <div className="slide-diagram">
          {d.type === 'flow' && (
            <FlowDiagramSvg diagram={d} slideIndex={index} source={slide.sourceText} />
          )}
          {d.type === 'layer' && (
            <LayerDiagramSvg diagram={d} slideIndex={index} source={slide.sourceText} />
          )}
          {d.type === 'cycle' && (
            <CycleDiagramSvg diagram={d} slideIndex={index} source={slide.sourceText} />
          )}
        </div>
      ) : (
        <p className="note">
          （diagram / mermaid
          ブロックを解析できませんでした。表・テキストでの代替を検討してください）
        </p>
      )}
      <Note text={slide.note} />
    </div>
  );
}

// --- figure ---

function FigureView({ slide }: { slide: FigureSlide }) {
  return (
    <div className="slide-inner">
      <SlideHeading text={slide.heading} badge={slide.badge} lead={slide.lead} />
      <figure className="slide-figure">
        {slide.url ? (
          <img
            src={safeUrl(slide.url)}
            alt={slide.alt}
            onError={(e) => {
              // createFallback() 相当: 読み込み失敗時にプレースホルダへ差し替え
              const el = e.currentTarget;
              el.style.display = 'none';
              const fb = el.parentElement?.querySelector('.slide-figure-fallback');
              if (fb) (fb as HTMLElement).style.display = 'flex';
            }}
          />
        ) : null}
        <div className="slide-figure-fallback" style={{ display: 'none' }}>
          <span>🖼️ 画像を読み込めませんでした</span>
          <span className="fallback-alt">{slide.alt}</span>
        </div>
        {slide.source && (
          <figcaption>
            出典:{' '}
            <a href={safeUrl(slide.source.url)} target="_blank" rel="noreferrer">
              {slide.source.label}
            </a>
          </figcaption>
        )}
      </figure>
    </div>
  );
}

// --- feature-showcase ---

function FeatureShowcaseView({ slide }: { slide: FeatureShowcaseSlide }) {
  const { left, right } = slide;
  return (
    <div className="slide-inner">
      <div className="feature-left">
        {left.eyebrow && <div className="eyebrow">{left.eyebrow}</div>}
        <h2>{renderInline(left.heading)}</h2>
        {left.lead && <p className="feat-lead">{renderInline(left.lead)}</p>}
      </div>
      <div className="feature-right">
        {right.num && <div className="feature-num">{right.num}</div>}
        {right.eyebrow && <div className="feat-eyebrow">{right.eyebrow}</div>}
        <div className="feat-heading">{right.heading}</div>
        {right.sub && <div className="feat-sub">{right.sub}</div>}
        {right.items.length > 0 && (
          <ul className="feat-list">
            {right.items.map((it, i) => (
              <li key={i}>
                <span className="feat-ico">▶</span>
                <span>
                  <span className="feat-label">{it.label}</span>
                  <span className="feat-desc">{it.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// --- sources ---

function SourcesView({ slide }: { slide: SourcesSlide }) {
  return (
    <div className="slide-inner top">
      <SlideHeading text={slide.heading} badge={slide.badge} lead={slide.lead} />
      <ul className="links">
        {slide.links.map((l, i) => (
          <li key={i}>
            <a href={safeUrl(l.url)} target="_blank" rel="noreferrer">
              {l.label}
            </a>
            {l.note && <span className="src-note"> — {l.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------

// --- timeline (v0.2.1) ---

function TimelineView({ slide, index }: { slide: TimelineSlide; index: number }) {
  const tl = slide.timeline;
  return (
    <div className="slide-inner">
      <SlideHeading text={slide.heading} badge={slide.badge} lead={slide.lead} />
      {tl ? (
        <div className="slide-diagram">
          <TimelineDiagramSvg timeline={tl} slideIndex={index} source={slide.sourceText} />
        </div>
      ) : (
        <p className="note">
          （timeline の milestones を解析できませんでした）
        </p>
      )}
      <Note text={slide.note} />
    </div>
  );
}

function renderSlideBody(slide: Slide, index: number) {
  switch (slide.type) {
    case 'title':
      return <TitleView slide={slide} />;
    case 'points':
      return <PointsView slide={slide} />;
    case 'summary':
      return <SummaryView slide={slide} />;
    case 'table':
      return <TableView slide={slide} />;
    case 'chart-bar':
    case 'chart-line':
    case 'chart-donut':
      return <ChartView slide={slide} />;
    case 'comparison-chart':
      return <ComparisonChartView slide={slide} />;
    case 'diagram-flow':
    case 'diagram-layer':
    case 'diagram-cycle':
      return <DiagramView slide={slide} index={index} />;
    case 'diagram-timeline':
      return <TimelineView slide={slide} index={index} />;
    case 'figure':
      return <FigureView slide={slide} />;
    case 'feature-showcase':
      return <FeatureShowcaseView slide={slide} />;
    case 'steps':
      return <StepsView slide={slide} />;
    case 'sources':
      return <SourcesView slide={slide} />;
  }
}

export function SlideRenderer({ slide, index }: { slide: Slide; index: number }) {
  return (
    <>
      {renderSlideBody(slide, index)}
      <PointBand text={slide.point} />
    </>
  );
}

/** section.slide のクラス名（slide-fit / feature-showcase / tone: dark 対応） */
export function slideSectionClass(slide: Slide, active: boolean): string {
  const cls = ['slide'];
  if (active) cls.push('active');
  if (slide.fit) cls.push('slide-fit');
  if (slide.type === 'feature-showcase') cls.push('feature-showcase');
  if (slide.tone === 'dark') cls.push('slide--dark');
  return cls.join(' ');
}
