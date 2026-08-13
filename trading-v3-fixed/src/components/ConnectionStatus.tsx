import { Activity, XCircle, AlertCircle } from 'lucide-react';

interface Props {
  status: 'connected' | 'disconnected' | 'error';
  message?: string;
  lastSync?: Date | null;
}

export function ConnectionStatus({ status, message, lastSync }: Props) {
  return (
    <div className="flex flex-col items-end">
      {status === 'connected' && (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Connected</span>
        </div>
      )}
      
      {status === 'disconnected' && (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Disconnected</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center space-x-2" title={message}>
          <div className="w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Error</span>
        </div>
      )}

      <span className="text-[10px] text-slate-500 mt-1 font-mono">
        {status === 'error' && message ? message : 'PAPER-TRADING-MODE'}
      </span>
    </div>
  );
}
