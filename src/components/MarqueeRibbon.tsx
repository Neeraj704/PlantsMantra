import React from 'react';

const marqueeItems = [
  '✦ Healthy & Handpicked Live Plants',
  '✦ 📦 Free Shipping on Orders Above ₹599',
  '✦ ❤️ Trusted by 10,000+ Happy Plant Parents',
  '✦ 🛡️ 7-Day Healthy Plant Guarantee',
  '✦ 🚚 72-Hour Express Delivery Across India',
  '✦ 🌿 Farm Fresh Direct From Local Nurseries',
];

export const MarqueeRibbon = () => {
  return (
    <div className="w-full bg-[#f4f8f4] border-y border-emerald-900/10 py-3 overflow-hidden select-none">
      <div className="flex w-max animate-marquee space-x-8 text-xs sm:text-sm font-medium text-emerald-900 tracking-wider">
        {[...marqueeItems, ...marqueeItems, ...marqueeItems].map((item, idx) => (
          <span key={idx} className="flex items-center space-x-2 whitespace-nowrap">
            <span>{item}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
