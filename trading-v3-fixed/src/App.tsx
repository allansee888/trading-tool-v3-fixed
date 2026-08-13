/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AccountDashboard } from './components/AccountDashboard';
import { TickerStrip } from './components/TickerStrip';
import { MarketClock } from './components/MarketClock';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <div className="h-screen bg-slate-950 text-slate-200 font-sans flex flex-col overflow-hidden">
      <Toaster theme="dark" position="bottom-right" />
      <MarketClock />
      <TickerStrip />
      <AccountDashboard />
    </div>
  );
}
