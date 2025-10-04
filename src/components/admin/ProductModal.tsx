import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Product, Category } from '@/types/database';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';

interface ProductModalProps {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  onSuccess: () => void;
}

export const ProductModal = ({ open, onClose, product, onSuccess }: ProductModalProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string>('');
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    botanical_name: '',
    description: '',
    care_guide: '',
    base_price: '',
    sale_price: '',
    category_id: '',
    stock_status: 'in_stock',
    status: 'active',
    is_featured: false,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        slug: product.slug,
        botanical_name: product.botanical_name || '',
        description: product.description || '',
        care_guide: product.care_guide || '',
        base_price: product.base_price.toString(),
        sale_price: product.sale_price?.toString() || '',
        category_id: product.category_id || '',
        stock_status: product.stock_status,
        status: product.status,
        is_featured: product.is_featured,
      });
      setMainImage(null);
      setMainImagePreview(product.main_image_url || '');
      setGalleryImages([]);
      setGalleryPreviews(product.gallery_images || []);
    } else {
      setFormData({ name: '', slug: '', botanical_name: '', description: '', care_guide: '', base_price: '', sale_price: '', category_id: '', stock_status: 'in_stock', status: 'active', is_featured: false });
      setMainImage(null);
      setMainImagePreview('');
      setGalleryImages([]);
      setGalleryPreviews([]);
    }
  }, [product]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*');
    if (data) setCategories(data);
  };

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      setMainImage(file);
      setMainImagePreview(URL.createObjectURL(file));
    }
  };

  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validImages = files.filter(file => file.type.startsWith('image/'));
    
    if (validImages.length !== files.length) {
      toast.error('Some files were skipped (only images allowed)');
    }

    if (galleryImages.length + validImages.length > 5) {
      toast.error('Maximum 5 gallery images allowed');
      return;
    }

    const newPreviews = validImages.map(file => URL.createObjectURL(file));
    setGalleryImages([...galleryImages, ...validImages]);
    setGalleryPreviews([...galleryPreviews, ...newPreviews]);
  };

  const removeGalleryImage = (index: number) => {
    const newGalleryImages = galleryImages.filter((_, i) => i !== index);
    const newGalleryPreviews = galleryPreviews.filter((_, i) => i !== index);
    setGalleryImages(newGalleryImages);
    setGalleryPreviews(newGalleryPreviews);
  };

  const uploadImage = async (file: File, path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let mainImageUrl = product?.main_image_url || null;
      let galleryImageUrls = product?.gallery_images || [];

      // Upload main image if new one selected
      if (mainImage) {
        const timestamp = Date.now();
        const path = `${timestamp}-${mainImage.name}`;
        mainImageUrl = await uploadImage(mainImage, path);
      }

      // Upload gallery images and filter out existing URLs that were removed
      const existingUrls = galleryPreviews.filter(preview => !preview.startsWith('blob:'));
      
      if (galleryImages.length > 0) {
        const uploadedUrls = await Promise.all(
          galleryImages.map(async (file, index) => {
            const timestamp = Date.now();
            const path = `gallery-${timestamp}-${index}-${file.name}`;
            return await uploadImage(file, path);
          })
        );
        galleryImageUrls = [...existingUrls, ...uploadedUrls];
      } else {
        galleryImageUrls = existingUrls;
      }

      const productData = {
        ...formData,
        base_price: parseFloat(formData.base_price),
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        category_id: formData.category_id || null,
        status: formData.status as 'active' | 'draft' | 'archived',
        stock_status: formData.stock_status as 'in_stock' | 'out_of_stock' | 'low_stock',
        main_image_url: mainImageUrl,
        gallery_images: galleryImageUrls,
      };

      if (product) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);
        if (error) throw error;
        toast.success('Product updated successfully');
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);
        if (error) throw error;
        toast.success('Product created successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="botanical_name">Botanical Name</Label>
            <Input
              id="botanical_name"
              value={formData.botanical_name}
              onChange={(e) => setFormData({ ...formData, botanical_name: e.target.value })}
            />
          </div>

          {/* Main Image Upload */}
          <div>
            <Label>Main Product Image (Thumbnail)</Label>
            <div className="mt-2">
              {mainImagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={mainImagePreview}
                    alt="Main preview"
                    className="w-32 h-32 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => {
                      setMainImage(null);
                      setMainImagePreview('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-smooth">
                  <div className="text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Upload</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMainImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Gallery Images Upload */}
          <div>
            <Label>Gallery Images (Up to 5)</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {galleryPreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <img
                    src={preview}
                    alt={`Gallery ${index + 1}`}
                    className="w-24 h-24 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => removeGalleryImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {galleryPreviews.length < 5 && (
                <label className="flex items-center justify-center w-24 h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-smooth">
                  <div className="text-center">
                    <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Add</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryImagesChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {galleryPreviews.length}/5 images uploaded
            </p>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="care_guide">Care Guide</Label>
            <Textarea
              id="care_guide"
              value={formData.care_guide}
              onChange={(e) => setFormData({ ...formData, care_guide: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="base_price">Base Price *</Label>
              <Input
                id="base_price"
                type="number"
                step="0.01"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="sale_price">Sale Price</Label>
              <Input
                id="sale_price"
                type="number"
                step="0.01"
                value={formData.sale_price}
                onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="stock_status">Stock Status</Label>
              <Select value={formData.stock_status} onValueChange={(value) => setFormData({ ...formData, stock_status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-8">
              <Switch
                id="is_featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
              />
              <Label htmlFor="is_featured">Featured Product</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : product ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
