import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase, getProxiedUrl } from '@/integrations/supabase/client';
import { Flame, Sparkles } from 'lucide-react';

interface CategoryItem {
  id: string;
  title: string;
  image?: string | null;
  link: string;
  badge?: string;
  isCustomShortcut?: boolean;
}

// Built-in promotional shortcuts at the start of the row
const PROMO_SHORTCUTS: CategoryItem[] = [
  {
    id: 'deals',
    title: 'Daily Deals',
    image: 'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=200&auto=format&fit=crop&q=80',
    link: '/sale',
    badge: 'HOT',
    isCustomShortcut: true,
  },
  {
    id: 'bestsellers',
    title: 'Best Sellers',
    image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=200&auto=format&fit=crop&q=80',
    link: '/shop',
    isCustomShortcut: true,
  },
];

// Fallback high-reliability images for common categories if DB has no image uploaded yet
const CATEGORY_IMAGE_DEFAULTS: Record<string, string> = {
  succulents: 'https://images.unsplash.com/photo-1520302630591-fd1c66edc19d?w=200&auto=format&fit=crop&q=80',
  cactus: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=200&auto=format&fit=crop&q=80',
  snake: 'https://images.unsplash.com/photo-1593482892290-f54927ae1bd6?w=200&auto=format&fit=crop&q=80',
  indoor: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=200&auto=format&fit=crop&q=80',
  combos: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=200&auto=format&fit=crop&q=80',
  combo: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=200&auto=format&fit=crop&q=80',
  pots: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=200&auto=format&fit=crop&q=80',
};

export const CategoryIconRow = () => {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Fetch real categories from Supabase categories table
  const { data: dbCategories = [] } = useQuery({
    queryKey: ['store-categories-icons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, image_url')
        .order('name');
      if (error) return [];
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 min cache
  });

  // Combine promotional shortcuts with actual DB categories
  const categoriesList: CategoryItem[] = [
    ...PROMO_SHORTCUTS,
    ...dbCategories.map(cat => {
      const slugKey = Object.keys(CATEGORY_IMAGE_DEFAULTS).find(k => cat.slug.toLowerCase().includes(k)) || '';
      const fallbackImage = slugKey ? CATEGORY_IMAGE_DEFAULTS[slugKey] : null;

      return {
        id: cat.id,
        title: cat.name,
        image: cat.image_url || fallbackImage,
        link: `/shop?category=${cat.slug}`,
      };
    }),
  ];

  const handleImageError = (id: string) => {
    setFailedImages(prev => ({ ...prev, [id]: true }));
  };

  return (
    <section className="w-full bg-white py-3 sm:py-5 border-b border-gray-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-start md:justify-center gap-3 sm:gap-6 overflow-x-auto no-scrollbar py-1 px-1">
          {categoriesList.map((cat) => {
            const hasFailed = failedImages[cat.id];
            const imgSrc = cat.image ? getProxiedUrl(cat.image) : null;

            return (
              <Link
                key={cat.id}
                to={cat.link}
                className="flex flex-col items-center flex-shrink-0 group cursor-pointer transition-transform duration-200 hover:-translate-y-1"
              >
                {/* Circular Icon Container */}
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2px] bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 shadow-xs group-hover:shadow-md transition-shadow">
                  <div className="w-full h-full rounded-full overflow-hidden bg-emerald-50 flex items-center justify-center">
                    {imgSrc && !hasFailed ? (
                      <img
                        src={imgSrc}
                        alt={cat.title}
                        onError={() => handleImageError(cat.id)}
                        className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      /* Elegant botanical fallback if image is missing or fails to load */
                      <div className="w-full h-full bg-gradient-to-br from-emerald-700 to-teal-800 flex items-center justify-center text-white text-xs font-bold uppercase select-none">
                        {cat.title.slice(0, 2)}
                      </div>
                    )}
                  </div>

                  {/* Hot/New Badge */}
                  {cat.badge && (
                    <span className="absolute -top-1 -right-1 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider bg-red-500 text-white px-1.5 py-0.2 rounded-full shadow-xs">
                      {cat.badge}
                    </span>
                  )}
                </div>

                {/* Category Label */}
                <span className="mt-1.5 text-[11px] sm:text-xs font-medium text-gray-800 text-center max-w-[68px] sm:max-w-[76px] leading-tight line-clamp-2 group-hover:text-emerald-700 transition-colors">
                  {cat.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
