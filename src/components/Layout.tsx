import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { TopAnnouncementBar } from './TopAnnouncementBar';
import { CampaignBanner } from './CampaignBanner';
import { CartDrawer } from './CartDrawer';
import { StickySpendBar } from './StickySpendBar';

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col relative pb-16">
      <TopAnnouncementBar />
      <CampaignBanner />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <StickySpendBar />
    </div>
  );
};

export default Layout;
