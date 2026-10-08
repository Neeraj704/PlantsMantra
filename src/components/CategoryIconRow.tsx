import { Link } from 'react-router-dom';

interface CategoryIcon {
  title: string;
  image: string;
  link: string;
  badge?: string;
}

const categoryIcons: CategoryIcon[] = [
  {
    title: 'Daily Deals',
    image: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=150&auto=format&fit=crop&q=80',
    link: '/sale',
    badge: 'HOT',
  },
  {
    title: 'New Arrivals',
    image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=150&auto=format&fit=crop&q=80',
    link: '/shop',
    badge: 'NEW',
  },
  {
    title: 'Best Sellers',
    image: 'https://images.unsplash.com/photo-1545241047-6083a3684587?w=150&auto=format&fit=crop&q=80',
    link: '/shop',
  },
  {
    title: 'Indoor Plants',
    image: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=150&auto=format&fit=crop&q=80',
    link: '/shop?category=indoor-plants',
  },
  {
    title: 'Succulents',
    image: 'https://images.unsplash.com/photo-1520302630591-fd1c66edc19d?w=150&auto=format&fit=crop&q=80',
    link: '/shop?category=succulents',
  },
  {
    title: 'Flowering Plants',
    image: 'https://images.unsplash.com/photo-1512428813834-c702c7702b78?w=150&auto=format&fit=crop&q=80',
    link: '/shop?category=flowering',
  },
  {
    title: 'Plant Combos',
    image: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=150&auto=format&fit=crop&q=80',
    link: '/shop?category=combo',
    badge: 'SAVE',
  },
  {
    title: 'Pots & Planters',
    image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=150&auto=format&fit=crop&q=80',
    link: '/shop?category=pots',
  },
];

export const CategoryIconRow = () => {
  return (
    <section className="w-full bg-white py-6 border-b border-gray-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-start md:justify-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar py-2 px-1">
          {categoryIcons.map((cat, idx) => (
            <Link
              key={idx}
              to={cat.link}
              className="flex flex-col items-center flex-shrink-0 group cursor-pointer transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-[2px] bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-sm group-hover:shadow-md transition-shadow">
                <div className="w-full h-full rounded-full overflow-hidden bg-white p-[1px]">
                  <img
                    src={cat.image}
                    alt={cat.title}
                    className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                {cat.badge && (
                  <span className="absolute -top-1 -right-1 text-[9px] font-bold uppercase tracking-wider bg-red-500 text-white px-1.5 py-0.5 rounded-full shadow-sm">
                    {cat.badge}
                  </span>
                )}
              </div>
              <span className="mt-2 text-xs sm:text-[13px] font-medium text-gray-800 text-center max-w-[76px] sm:max-w-[88px] leading-tight line-clamp-2 group-hover:text-emerald-700 transition-colors">
                {cat.title}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
