import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { me, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="screen-dark flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-white/60">
          <Loader2 size={18} className="animate-spin text-brand-400" />
          Oturum kontrol ediliyor...
        </div>
      </div>
    );
  }
  if (!me) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/giris?next=${next}`} replace />;
  }
  return <>{children}</>;
}
