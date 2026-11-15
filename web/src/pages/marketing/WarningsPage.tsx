import { Link } from 'react-router-dom';
import { ArrowRight, FileText, ShieldAlert, ShieldCheck } from 'lucide-react';
import { MarketingFooter, MarketingHeader } from '../../components/MarketingHeader';
import { Button } from '../../components/ui';

const SECTIONS = [
  {
    title: 'Yayın kuralları ve sorumluluk',
    items: [
      'TikTok, YouTube veya Twitch kurallarına uyum ve yayın içeriğinin sorumluluğu tamamen yayıncıya aittir.',
      'Oyunlar birer eğlence aracıdır; platformlar tarafından onaylanmış, sponsorlu veya garanti edilmiş değildir.',
      'Yayın kısıtlaması, ihlal veya hesap cezası riski yayıncıya aittir; bu gerekçeyle ücret iadesi yapılmaz.',
      'Moderasyon, sohbet ayarları ve uygunsuz kullanıcı müdahalesi yayıncının sorumluluğundadır.',
    ],
  },
  {
    title: 'Hediye ve etkileşim',
    items: [
      'Oyun ekranında izleyiciden hediye isteyen veya hediye karşılığı vaat eden bir yazı gösterilmez.',
      'Hediye ve beğeni etkileri yalnızca oyun içi görsel/davranışsal sonuç üretir; nakde çevrilemez.',
      'Profil görseli, kullanıcı adı veya yorum gösteren oyunlarda kişisel veri ve ihlal riski daha yüksektir.',
      'Yüksek etkileşimli oyunlar oyun sayfasında “Dikkat” etiketiyle işaretlenir.',
    ],
  },
  {
    title: 'Dijital ürün ve ödeme',
    items: [
      'Oyun lisansları dijitaldir; fiziksel teslimat yoktur ve otomatik yenileme yapılmaz.',
      'Lisans, sunucu tarafından doğrulanan başarılı ödeme sonrası aktifleşir.',
      'İade ve cayma koşulları satın alma öncesinde gösterilir; kullanılmış dijital lisanslarda yasal istisnalar uygulanabilir.',
      'Test ödeme modunda gerçek kart bilgisi istenmez; canlıya geçişte sağlayıcı koşulları geçerlidir.',
    ],
  },
  {
    title: 'Bağımsızlık ve marka',
    items: [
      'Rook Works bağımsız bir hizmettir; TikTok, YouTube, Twitch veya Google ile bağlantılı değildir.',
      'Tüm oyun adları, görselleri ve metinleri bu proje için özgün olarak üretilmiştir.',
      'Üçüncü taraf platformların markaları yalnızca uyumluluk açıklaması amacıyla anılır.',
      'Hizmet kullanımı, yürürlükteki mevzuat ve platform koşullarına uygun olmalıdır.',
    ],
  },
];

export function WarningsPage() {
  return (
    <div className="min-h-screen bg-[#fbf7f0] text-ink-900">
      <MarketingHeader />
      <section className="border-b border-[#eee7dc] bg-[#fffaf4]">
        <div className="container-page py-14 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-[11px] font-semibold text-amber-800">
            <ShieldAlert size={12} /> Yayın öncesi bilgilendirme
          </span>
          <h1 className="mt-5 max-w-3xl text-balance font-display text-4xl font-bold leading-[1.06] tracking-tight text-ink-950 sm:text-5xl">
            Uyarılar ve kullanım koşulları.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-500 sm:text-base">
            Oyunları yayınına eklemeden önce bu notları oku. Amaç eğlence; sorumluluk ve platform
            kuralları ise yayıncıda.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/oyunlar">
              <Button variant="brand" icon={<ArrowRight size={15} />}>
                Oyunlara dön
              </Button>
            </Link>
            <Link to="/satin-al">
              <Button variant="secondary" icon={<FileText size={15} />}>
                Paket ve iade bilgisi
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <main className="container-page py-12">
        <div className="grid gap-5 lg:grid-cols-2">
          {SECTIONS.map((section) => (
            <section
              key={section.title}
              className="rounded-3xl border border-[#e9e1d5] bg-white p-6 shadow-card sm:p-7"
            >
              <h2 className="flex items-center gap-2 text-lg font-bold text-ink-950">
                <ShieldCheck size={17} className="text-brand-600" /> {section.title}
              </h2>
              <ul className="mt-4 space-y-3">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-500">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50/70 p-6 text-[11px] leading-relaxed text-amber-900/80 sm:p-7">
          <p className="flex items-center gap-2 font-bold text-amber-950">
            <ShieldAlert size={16} className="text-amber-600" /> Yüksek etkileşimli oyunlar
          </p>
          <p className="mt-2">
            Profil görseli, kullanıcı adı veya yorum içeriğini sahneye taşıyan oyunlarda platform
            ihlali riski daha yüksektir. Bu oyunları kullanmadan önce yayıncı hesabının kurallarını
            kontrol et; gerekirse oyunu gizle veya yalnızca güvenli özelliklerle yayınla.
          </p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
