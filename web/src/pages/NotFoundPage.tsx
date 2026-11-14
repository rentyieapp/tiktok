import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Button } from '../components/ui';
export function NotFoundPage() {
  return (
    <div className="screen-dark flex min-h-screen flex-col items-center justify-center gap-5">
      <Logo theme="dark" />
      <p className="text-5xl font-bold text-white/20">404</p>
      <p className="text-sm text-white/50">Aradığın sayfa bulunamadı.</p>
      <Link to="/"><Button variant="brand">Ana sayfaya dön</Button></Link>
    </div>
  );
}
