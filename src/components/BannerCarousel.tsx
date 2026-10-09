import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase, getProxiedUrl } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';

const BannerCarousel = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { data: banners } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Auto-scroll every 3.5 seconds
  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 3500);
    return () => clearInterval(interval);
  }, [emblaApi]);

  if (!banners || banners.length === 0) return null;

  return (
    <section className="py-6 mt-8 mb-12 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="relative rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {banners.map((banner) => (
                <div key={banner.id} className="flex-[0_0_100%] min-w-0">
                  <div className="w-full flex items-center justify-center">
                    {banner.link_url ? (
                      banner.link_url.startsWith('http') ? (
                        <a href={banner.link_url} className="block w-full">
                          <img
                            src={getProxiedUrl(banner.image_url)}
                            alt={banner.title}
                            className="w-full h-auto max-h-[580px] object-contain rounded-xl hover:opacity-95 transition-opacity duration-300"
                          />
                        </a>
                      ) : (
                        <Link to={banner.link_url} className="block w-full">
                          <img
                            src={getProxiedUrl(banner.image_url)}
                            alt={banner.title}
                            className="w-full h-auto max-h-[580px] object-contain rounded-xl hover:opacity-95 transition-opacity duration-300"
                          />
                        </Link>
                      )
                    ) : (
                      <img
                        src={getProxiedUrl(banner.image_url)}
                        alt={banner.title}
                        className="w-full h-auto max-h-[580px] object-contain rounded-xl"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {banners.length > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-md hover:bg-white text-gray-800"
                onClick={scrollPrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-md hover:bg-white text-gray-800"
                onClick={scrollNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <div className="flex justify-center gap-2 mt-4">
                {banners.map((_, index) => (
                  <button
                    key={index}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === selectedIndex
                        ? 'bg-emerald-700 w-8'
                        : 'bg-emerald-300/50 w-2'
                    }`}
                    onClick={() => emblaApi?.scrollTo(index)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default BannerCarousel;
