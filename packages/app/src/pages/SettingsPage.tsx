/**
 * SettingsPage.tsx — `/settings`（プレースホルダー）。
 *
 * 0817-01 Q3: 今後（BYOK APIキー等）の機能追加用に器だけ先に作る。
 * SideMenuの外（独立ページ）として扱うため、このページ自体にはSideMenuを描画しない。
 */
import { Link } from 'wouter';

export function SettingsPage() {
  return (
    <div className="settings-page">
      <h1>⚙️ 設定</h1>
      <p>準備中です。今後、AI連携のAPIキー設定などをここに追加予定です。</p>
      <Link href="/" className="settings-page__back">
        ← エディタに戻る
      </Link>
    </div>
  );
}
