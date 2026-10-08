import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ShieldCheck, Truck, Sparkles, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';

const announcements = [
  { text: '🛡️ Secure & Damage-Proof Plant Packaging', link: '/about' },
  { text: '🚚 Free Express Delivery on Orders Above ₹599', link: '/shop' },
  { text: '🌿 100% Live Healthy Plant Guarantee (7-Day Replacement)', link: '/guarantee' },
  { text: '🎁 Special Festive Offers LIVE — Shop Selected Plants Now!', link: '/sale' },
];

export const TopAnnouncementBar = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  const current = announcements[currentIndex];

  return (
    <div className="w-full bg-[#1b3b22] text-[#e8f5e9] py-2 px-3 text-xs font-medium select-none border-b border-emerald-950/40 relative z-50">
      <div className="container mx-auto flex items-center justify-between max-w-4xl">
        <button
          onClick={handlePrev}
          aria-label="Previous announcement"
          className="p-1 hover:bg-emerald-800/60 rounded text-emerald-200 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <Link
          to={current.link}
          className="text-center truncate px-2 hover:underline hover:text-white transition-all flex items-center justify-center gap-1.5 font-sans tracking-wide text-[11px] sm:text-xs"
        >
          <span>{current.text}</span>
        </Link>

        <button
          onClick={handleNext}
          aria-label="Next announcement"
          className="p-1 hover:bg-emerald-800/60 rounded text-emerald-200 transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
