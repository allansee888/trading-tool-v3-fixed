import { useEffect, useState } from 'react';
import { MarketClock as MarketClockType } from '../types';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';

export function MarketClock() {
  const [clock, setClock] = useState<MarketClockType | null>(null);

  useEffect(() => {
    let lastStatus: boolean | null = null;
    
    const fetchClock = async () => {
      try {
        const baseUrl = import.meta.env.VITE_APP_URL || '';
        const res = await fetch(`${baseUrl}/api/clock`);
        if (!res.ok) return;
        const data = await res.json();
        setClock(data);
        
        if (lastStatus === false && data.is_open === true) {
          toast.success('Market Open — Resuming signal processing', { icon: '🟢' });
        } else if (lastStatus === true && data.is_open === false) {
          toast.warning('Market Closed — Pausing signal processing', { icon: '🟡' });
        }
        lastStatus = data.is_open;
      } catch (e) {
        // Suppress
      }
    };

    fetchClock();
    const interval = setInterval(fetchClock, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatCountdown = (targetIso: string) => {
    const target = new Date(targetIso).getTime();
    const now = new Date().getTime();
    const diff = target - now;
    if (diff <= 0) return '0m';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  if (!clock) return null;

  if (clock.is_open) {
    return (
      <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2 flex items-center justify-center space-x-2 text-emerald-400">
        <Clock className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-wider">
          Market Open · Closes in {formatCountdown(clock.next_close)}
        </span>
      </div>
    );
  } else {
    // Determine if pre-market or closed. Simplified: just check if next_open is today.
    // We'll just show Market Closed for simplicity, or Pre-Market if < 2 hours
    const target = new Date(clock.next_open).getTime();
    const now = new Date().getTime();
    const diffHours = (target - now) / (1000 * 60 * 60);
    
    if (diffHours < 2 && diffHours > 0) {
      return (
        <div className="bg-blue-500/10 border-b border-blue-500/20 px-6 py-2 flex items-center justify-center space-x-2 text-blue-400">
          <Clock className="w-4 h-4 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Pre-Market · Market opens in {formatCountdown(clock.next_open)}
          </span>
        </div>
      );
    }

    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center justify-center space-x-2 text-amber-500">
        <Clock className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-wider">
          Market Closed · Opens in {formatCountdown(clock.next_open)}
        </span>
      </div>
    );
  }
}
