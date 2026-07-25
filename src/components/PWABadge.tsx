import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { WifiOff, RefreshCw } from 'lucide-react';

export function PWABadge() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!needRefresh && !offlineReady && !isOffline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm" id="pwa-badge-container">
      {isOffline && (
        <div className="bg-amber-100 text-amber-900 px-4 py-3 rounded-xl shadow-lg border border-amber-200 flex items-center gap-3 animate-in slide-in-from-bottom-2">
          <WifiOff className="w-5 h-5 text-amber-600" />
          <div className="text-xs">
            <p className="font-bold">Jesteś offline</p>
            <p className="opacity-80">Aplikacja działa w trybie offline. Dane zapisywane są lokalnie i zostaną zsynchronizowane po powrocie do sieci.</p>
          </div>
        </div>
      )}
      
      {needRefresh && (
        <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center justify-between gap-4 animate-in slide-in-from-bottom-2" id="pwa-update-prompt">
          <div className="text-xs">
            <p className="font-bold text-emerald-400">Dostępna nowa wersja — Odśwież</p>
            <p className="text-slate-300 mt-0.5">Zaktualizuj aplikację, aby załadować nową wersję.</p>
          </div>
          <button
            onClick={() => updateServiceWorker(true)}
            className="bg-[#137566] hover:bg-[#0f5d51] text-white px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
            title="Odśwież aplikację"
            id="btn-pwa-reload"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Odśwież
          </button>
        </div>
      )}
      
      {offlineReady && !needRefresh && !isOffline && (
        <div className="bg-emerald-50 text-emerald-800 px-4 py-2.5 rounded-xl shadow-lg border border-emerald-100 flex items-center justify-between gap-2 animate-in slide-in-from-bottom-2 duration-300">
          <span className="text-xs font-bold">Aplikacja gotowa do pracy offline</span>
          <button onClick={() => setOfflineReady(false)} className="text-emerald-600 hover:text-emerald-800 font-bold text-xs p-1">✕</button>
        </div>
      )}
    </div>
  );
}

