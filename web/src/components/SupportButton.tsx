import { MessageCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const RAW = (import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined)?.replace(/\D/g, '');

export function SupportButton() {
  const location = useLocation();
  if (!RAW) return null;
  if (location.pathname.startsWith('/canli/') || location.pathname.startsWith('/live/')) return null;
  return (
    <a
      href={`https://wa.me/${RAW}?text=${encodeURIComponent('Meydan hakkında destek almak istiyorum.')}`}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-4 right-4 z-[60] inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-[11px] font-bold text-white shadow-[0_12px_30px_-10px_rgba(37,211,102,0.7)] transition hover:bg-[#1fb959]"
      aria-label="WhatsApp canlı destek"
    >
      <MessageCircle size={15} /> Canlı destek
    </a>
  );
}
