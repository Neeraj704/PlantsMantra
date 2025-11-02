import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { ShoppingCart, Heart, Share2, ChevronLeft } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import { Product, ProductVariant } from '@/types/database';
import monsteraImg from '@/assets/monstera.jpg';
import snakePlantImg from '@/assets/snake-plant.jpg';
import pothosImg from '@/assets/pothos.jpg';
import fiddleLeafImg from '@/assets/fiddle-leaf.jpg';
import SEOTags from '@/components/SEOTags';
import { toast, Toaster } from 'react-hot-toast';

const ProductDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [mainImage, setMainImage] = useState<string>('');
  const [mainImageAltText, setMainImageAltText] = useState<string>('');
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  const productImages: Record<string, string> = {
    'monstera-deliciosa': monsteraImg,
    'snake-plant': snakePlantImg,
    'pothos': pothosImg,
    'fiddle-leaf-fig': fiddleLeafImg,
  };

  useEffect(() => {
    const fetchProduct = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        console.error("Error fetching product:", error);
        navigate('/shop');
        return;
      }
      
      if (!data) {
        console.warn(`Product with slug "${slug}" not found.`);
        navigate('/404');
        return;
      }

      setProduct(data);
      const imgSrc = data.main_image_url || productImages[data.slug] || monsteraImg;
      setMainImage(imgSrc);
      setMainImageAltText(data.main_image_alt || data.name);
      fetchRelated(data);
    };

    const fetchVariants = async () => {
      const { data: productData } = await supabase
        .from('products')
        .select('id')
        .eq('slug', slug)
        .single();

      if (productData) {
        const { data } = await supabase
          .from('product_variants')
          .select('*')
          .eq('product_id', productData.id);
        
        if (data && data.length > 0) {
          setVariants(data);
          setSelectedVariant(data[0]);
        }
      }
    };

    const fetchRelated = async (currentProduct: Product) => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .neq('id', currentProduct.id)
        .eq('status', 'active')
        .limit(8);
      
      if (data) setRelatedProducts(data);
    };

    fetchProduct();
    fetchVariants();
  }, [slug, navigate]);

  if (!product) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const defaultSeoTitle = `${product.name} - ${product.botanical_name || 'Plant'} | Plants Mantra`;
  const defaultMetaDescription = product.description
    ? `Buy the ${product.name} (${product.botanical_name}). ${product.description.substring(0, 100).trim()}... View care guide, price, and customer reviews at PlantsMantra.`
    : `Buy the ${product.name} online at PlantsMantra. Premium quality, easy-care plant delivered to your door.`;
    
  const seoTitle = product.seo_title || defaultSeoTitle;
  const metaDescription = product.meta_description || defaultMetaDescription;

  const imgSrc = productImages[product.slug] || monsteraImg;
  const isOutOfStock = product.stock_status === 'out_of_stock';

  const getCurrentPrice = () => {
    const basePrice = product.sale_price || product.base_price;
    const variantAdjustment = selectedVariant?.price_adjustment || 0;
    return basePrice + variantAdjustment;
  };

  const displayPrice = getCurrentPrice();
  const hasDiscount = product.sale_price !== null;

  const handleImageClick = (clickedImage: string, altIndex: number) => { 
    if (product) {
      setMainImage(clickedImage);
      const altText = altIndex === 0
        ? product.main_image_alt || product.name
        : product.gallery_alt_texts?.[altIndex - 1] || `${product.name} gallery image ${altIndex}`;
      setMainImageAltText(altText);
    }
  };

  const handleAddToCart = () => {
    addItem(product!, selectedVariant || undefined, quantity);
  };

  const handleWishlistToggle = () => {
    if (product) {
      toggleWishlist(product.id);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: product?.name || 'Check this out!',
      text: product?.description?.substring(0, 100) || 'Check this product!',
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        console.log('Content shared successfully');
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
        alert('Could not copy link. Please copy manually.');
      }
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <SEOTags title={seoTitle} description={metaDescription} />
      <Toaster position="top-right" />
      <div className="container mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-smooth pl-0 hover:bg-transparent"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Shop
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Image Gallery */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="aspect-square rounded-2xl overflow-hidden shadow-card">
              <img src={mainImage} alt={mainImageAltText} className="w-full h-full object-cover" />
            </div>
            {product.gallery_images && product.gallery_images.length > 0 && (
              <div className="grid grid-cols-4 gap-4">
                <div
                  className="aspect-square rounded-lg overflow-hidden border-2 border-primary cursor-pointer hover:opacity-80 transition-smooth"
                  onClick={() => handleImageClick(product.main_image_url || imgSrc, 0)}
                >
                  <img src={product.main_image_url || imgSrc} alt={product.main_image_alt || product.name} className="w-full h-full object-cover" />
                </div>
                {product.gallery_images.map((image, index) => {
                  const altText = product.gallery_alt_texts?.[index] || `${product.name} close-up view ${index + 1}`;
                  return (
                    <div
                      key={index}
                      className="aspect-square rounded-lg overflow-hidden border border-border cursor-pointer hover:border-primary transition-smooth"
                      onClick={() => handleImageClick(image, index + 1)}
                    >
                      <img src={image} alt={altText} className="w-full h-full object-cover" />
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Product Info */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="mb-4">
              {hasDiscount && <Badge variant="destructive" className="mb-2">On Sale</Badge>}
              {product.stock_status === 'low_stock' && <Badge variant="secondary" className="mb-2 ml-2">Low Stock</Badge>}
            </div>

            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">{product.name}</h1>
            {product.botanical_name && <p className="text-muted-foreground italic mb-4">{product.botanical_name}</p>}

            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-3xl font-bold">₹{displayPrice.toFixed(2)}</span>
              {hasDiscount && !selectedVariant && <span className="text-xl text-muted-foreground line-through">₹{product.base_price.toFixed(2)}</span>}
            </div>

            {variants.length > 0 && (
              <div className="mb-6">
                <Label className="text-base mb-3 block">Select Size</Label>
                <div className="flex flex-wrap gap-2">
                  {variants.map((variant) => (
                    <Button
                      key={variant.id}
                      variant={selectedVariant?.id === variant.id ? 'default' : 'outline'}
                      onClick={() => setSelectedVariant(variant)}
                      className={selectedVariant?.id === variant.id ? 'gradient-hero' : ''}
                    >
                      {variant.name}
                      {variant.price_adjustment !== 0 && (
                        <span className="ml-1 text-xs">({variant.price_adjustment > 0 ? '+' : ''}₹{variant.price_adjustment.toFixed(2)})</span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <Separator className="my-6" />

            <div className="mb-6">
              <h3 className="font-semibold mb-2">Stock Status</h3>
              <Badge variant={product.stock_status === 'in_stock' ? 'default' : product.stock_status === 'low_stock' ? 'secondary' : 'destructive'}>
                {product.stock_status === 'in_stock' ? 'In Stock' : product.stock_status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
              </Badge>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border border-border rounded-lg">
                <Button variant="ghost" size="sm" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={isOutOfStock}>-</Button>
                <span className="px-4 py-2 min-w-[3rem] text-center">{quantity}</span>
                <Button variant="ghost" size="sm" onClick={() => setQuantity(quantity + 1)} disabled={isOutOfStock}>+</Button>
              </div>
            </div>

            <div className="flex gap-3 mb-6">
              <Button size="lg" className="flex-1 gradient-hero" onClick={handleAddToCart} disabled={isOutOfStock}>
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart
              </Button>
              <Button size="lg" variant={isInWishlist(product.id) ? 'default' : 'outline'} onClick={handleWishlistToggle}>
                <Heart className={`w-5 h-5 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
              </Button>
              <Button size="lg" variant="outline" onClick={handleShare}>
                <Share2 className="w-5 h-5" />
              </Button>
            </div>

            <Separator className="my-6" />

            <Tabs defaultValue="description" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="care">Care Guide</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>
              
              <TabsContent value="description" className="mt-4">
                <p className="text-muted-foreground leading-relaxed">{product.description || 'No description available.'}</p>
              </TabsContent>
              
              <TabsContent value="care" className="mt-4">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{product.care_guide || 'Care guide coming soon.'}</p>
              </TabsContent>
              
              <TabsContent value="details" className="mt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium">Indoor Plant</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tags</span>
                    <span className="font-medium">{product.tags?.join(', ') || 'N/A'}</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>

        {relatedProducts && relatedProducts.length > 0 && (
          <section>
            <h2 className="text-2xl md:text-3xl font-serif font-bold mb-8">You May Also Like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => {
                const relatedImgSrc = relatedProduct.main_image_url || productImages[relatedProduct.slug] || monsteraImg;
                const relatedDisplayPrice = relatedProduct.sale_price || relatedProduct.base_price;
                const relatedHasDiscount = relatedProduct.sale_price !== null;

                return (
                  <Link key={relatedProduct.id} to={`/product/${relatedProduct.slug}`}>
                    <Card className="overflow-hidden group cursor-pointer hover:shadow-hover transition-smooth">
                      <div className="aspect-square overflow-hidden bg-muted/50">
                        <img src={relatedImgSrc} alt={relatedProduct.main_image_alt || relatedProduct.name} className="w-full h-full object-cover group-hover:scale-105 transition-smooth" />
                      </div>
                      <CardContent className="p-4">
                        {relatedHasDiscount && <Badge variant="destructive" className="mb-2">Sale</Badge>}
                        <h3 className="font-serif font-semibold text-lg mb-1">{relatedProduct.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">₹{relatedDisplayPrice.toFixed(2)}</span>
                          {relatedHasDiscount && <span className="text-sm text-muted-foreground line-through">₹{relatedProduct.base_price.toFixed(2)}</span>}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;