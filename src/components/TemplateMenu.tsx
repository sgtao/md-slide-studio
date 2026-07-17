import { useState } from 'react';
import { SLIDE_TEMPLATES, type SlideTemplate } from '../templates/slideTemplates';

const CATEGORY_LABEL: Record<SlideTemplate['category'], string> = {
  basic: '基本',
  chart: 'グラフ',
  diagram: '図解・ステップ',
  showcase: '特殊レイアウト',
};

const CATEGORY_ORDER: SlideTemplate['category'][] = ['basic', 'chart', 'diagram', 'showcase'];

export function TemplateMenu({ onInsert }: { onInsert: (snippet: string) => void }) {
  const [open, setOpen] = useState(false);

  const grouped = SLIDE_TEMPLATES.reduce<Record<string, SlideTemplate[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  const handlePick = (snippet: string) => {
    onInsert(`\n\n---\n\n${snippet}`);
    setOpen(false);
  };

  return (
    <div className="template-menu">
      <button
        type="button"
        className="template-menu__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        ➕ テンプレート挿入
      </button>
      {open && (
        <div className="template-menu__panel">
          {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => (
            <div key={cat} className="template-menu__group">
              <div className="template-menu__group-label">{CATEGORY_LABEL[cat]}</div>
              {grouped[cat].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="template-menu__item"
                  onClick={() => handlePick(t.snippet)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
