import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { CampaignBanner } from './CampaignBanner';

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <CampaignBanner />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
