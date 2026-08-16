/**
 * AppRouter.tsx — hashベースルーティング（wouter）。
 *
 * `/` と `/present` は同じ App を再利用し、mode propの違いだけで出し分ける
 * （0817-01 §2-1）。`/settings` のみ独立コンポーネント（SideMenuの外）。
 * GitHub Pages配信を前提にhashベースを採用しており、リライト設定は不要。
 */
import { Route, Router, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import App from '../App';
import { SettingsPage } from '../pages/SettingsPage';

export function AppRouter() {
  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/settings" component={SettingsPage} />
        <Route path="/present">
          <App mode="present" />
        </Route>
        <Route path="/">
          <App mode="edit" />
        </Route>
      </Switch>
    </Router>
  );
}
