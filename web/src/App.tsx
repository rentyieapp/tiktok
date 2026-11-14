import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { ToastProvider } from './lib/toast';
import { RequireAuth } from './components/RequireAuth';
import { PanelLayout } from './components/PanelLayout';
import { PlatformHomePage } from './pages/marketing/PlatformHomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { TestPaymentPage } from './pages/billing/TestPaymentPage';
import { PaymentSuccessPage } from './pages/billing/PaymentSuccessPage';
import { OverviewPage } from './pages/panel/OverviewPage';
import { PortfolioPage } from './pages/panel/PortfolioPage';
import { ArcadeGamePanelPage } from './pages/panel/ArcadeGamePanelPage';
import { GameWizardPage } from './pages/panel/GameWizardPage';
import { TeamsPage } from './pages/panel/TeamsPage';
import { SettingsPage } from './pages/panel/SettingsPage';
import { CommandsPage } from './pages/panel/CommandsPage';
import { LivePanelPage } from './pages/panel/LivePanelPage';
import { PreviewPage } from './pages/panel/PreviewPage';
import { StatsPage } from './pages/panel/StatsPage';
import { HistoryPage } from './pages/panel/HistoryPage';
import { BillingPage } from './pages/panel/BillingPage';
import { AccountPage } from './pages/panel/AccountPage';
import { ArcadeRoomsPage } from './pages/panel/ArcadeRoomsPage';
import { PlatformConnectionsPage } from './pages/panel/PlatformConnectionsPage';
import { LivePage } from './pages/live/LivePage';
import { GamesPage } from './pages/marketing/GamesPage';
import { BuyPage } from './pages/marketing/BuyPage';
import { WarningsPage } from './pages/marketing/WarningsPage';
import { SetupGuidePage } from './pages/marketing/SetupGuidePage';
import { LeaderboardPage } from './pages/marketing/LeaderboardPage';
import { InstallAppPage } from './pages/marketing/InstallAppPage';
import { ArcadeGamePage } from './pages/arcade/ArcadeGamePage';
import { ArcadeRoomPage } from './pages/arcade/ArcadeRoomPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminGamesPage } from './pages/admin/AdminGamesPage';
import { AdminPackagesPage } from './pages/admin/AdminPackagesPage';
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage';
import { AdminPublishersPage } from './pages/admin/AdminPublishersPage';
import { AdminShopierPage } from './pages/admin/AdminShopierPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SupportButton } from './components/SupportButton';

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (pathname.startsWith('/live/')) return;
    if (hash) {
      window.setTimeout(() => {
        const target = document.querySelector(hash);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return;
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ScrollToTop />
          <SupportButton />
          <Routes>
            <Route path="/" element={<PlatformHomePage />} />
            <Route path="/giris" element={<LoginPage />} />
            <Route path="/kayit" element={<RegisterPage />} />
            <Route path="/oyunlar" element={<GamesPage />} />
            <Route path="/oyun/:slug" element={<ArcadeGamePage />} />
            <Route path="/canli/:slug" element={<ArcadeRoomPage />} />
            <Route path="/satin-al" element={<BuyPage />} />
            <Route path="/uyarilar" element={<WarningsPage />} />
            <Route path="/kurulum" element={<SetupGuidePage />} />
            <Route path="/liderlik" element={<LeaderboardPage />} />
            <Route path="/uygulama" element={<InstallAppPage />} />
            <Route
              path="/odeme/test/:paymentId"
              element={
                <RequireAuth>
                  <TestPaymentPage />
                </RequireAuth>
              }
            />
            <Route
              path="/odeme/basarili"
              element={
                <RequireAuth>
                  <PaymentSuccessPage />
                </RequireAuth>
              }
            />
            <Route
              path="/panel"
              element={
                <RequireAuth>
                  <PanelLayout />
                </RequireAuth>
              }
            >
              <Route index element={<PortfolioPage />} />
              <Route path="3d" element={<OverviewPage />} />
              <Route path="oyun/:gameKey" element={<ArcadeGamePanelPage />} />
              <Route path="oyun" element={<GameWizardPage />} />
              <Route path="takimlar" element={<TeamsPage />} />
              <Route path="ayarlar" element={<SettingsPage />} />
              <Route path="komutlar" element={<CommandsPage />} />
              <Route path="yayin" element={<LivePanelPage />} />
              <Route path="onizleme" element={<PreviewPage />} />
              <Route path="istatistikler" element={<StatsPage />} />
              <Route path="gecmis" element={<HistoryPage />} />
              <Route path="odeme" element={<BillingPage />} />
              <Route path="arcade" element={<ArcadeRoomsPage />} />
              <Route path="baglantilar" element={<PlatformConnectionsPage />} />
              <Route path="hesap" element={<AccountPage />} />
            </Route>
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="oyunlar" element={<AdminGamesPage />} />
              <Route path="paketler" element={<AdminPackagesPage />} />
              <Route path="odemeler" element={<AdminPaymentsPage />} />
              <Route path="yayincilar" element={<AdminPublishersPage />} />
              <Route path="shopier" element={<AdminShopierPage />} />
            </Route>
            <Route path="/live/:slug" element={<LivePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
