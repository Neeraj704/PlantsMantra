import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase, getProxiedUrl } from '@/integrations/supabase/client';
import { Category } from '@/types/database';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon } from 'lucide-react';

interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  category?: Category | null;
  onSuccess: () => void;
}

export const CategoryModal = ({ open, onClose, category, onSuccess }: CategoryModalProps) => {
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        image_url: category.image_url || '',
      });
      setPreviewUrl(category.image_url || '');
    } else {
      setFormData({ name: '', slug: '', description: '', image_url: '' });
      setPreviewUrl('');
    }
    setImageFile(null);
  }, [category, open]);

  const handleNameChange = (name: string) => {
    // Auto-generate slug if creating new category
    if (!category) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setFormData(prev => ({ ...prev, name, slug }));
    } else {
      setFormData(prev => ({ ...prev, name }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalImageUrl = formData.image_url;

      // If user uploaded a new image file
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop() || 'jpg';
        const fileName = `category-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `categories/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, imageFile, { upsert: true });

        if (uploadError) {
          // Fallback to banners bucket if product-images fails
          const { error: bannerUploadError } = await supabase.storage
            .from('banners')
            .upload(fileName, imageFile, { upsert: true });
          
          if (bannerUploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(fileName);
          finalImageUrl = publicUrl;
        } else {
          const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filePath);
          finalImageUrl = publicUrl;
        }
      }

      const payload = {
        ...formData,
        image_url: finalImageUrl || null,
      };

      if (category) {
        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', category.id);
        if (error) throw error;
        toast.success('Category updated successfully');
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([payload]);
        if (error) throw error;
        toast.success('Category created successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg text-emerald-950">
            {category ? 'Edit Category' : 'Add Category'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="name" className="text-xs font-semibold">Category Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Succulents, Snake Plants, Indoor"
              className="text-xs h-9 mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="slug" className="text-xs font-semibold">URL Slug *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="e.g. succulents"
              className="text-xs h-9 mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-xs font-semibold">Description (optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Short summary of this collection..."
              rows={2}
              className="text-xs mt-1"
            />
          </div>

          {/* Category Icon / Image Upload */}
          <div className="space-y-2 p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
            <div className="flex justify-between items-baseline">
              <Label className="text-xs font-semibold text-emerald-950 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-700" /> Category Icon / Photo
              </Label>
              <span className="text-[10px] text-emerald-700 font-medium">Shows in homepage circles</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Circular preview */}
              <div className="w-14 h-14 rounded-full overflow-hidden bg-white border-2 border-emerald-300 flex-shrink-0 flex items-center justify-center shadow-xs">
                {previewUrl ? (
                  <img
                    src={getProxiedUrl(previewUrl)}
                    alt="Category icon preview"
                    className="w-full h-full object-cover"
                    onError={() => setPreviewUrl('')}
                  />
                ) : (
                  <span className="text-xs font-bold text-emerald-800 uppercase">
                    {formData.name.slice(0, 2) || '🌱'}
                  </span>
                )}
              </div>

              {/* Upload Input */}
              <div className="flex-1 space-y-1">
                <Input
                  id="cat-image-file"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="text-xs h-8 cursor-pointer bg-white"
                />
                <p className="text-[10px] text-muted-foreground">
                  Square photo recommended (e.g. 300 × 300 px)
                </p>
              </div>
            </div>

            {/* Direct Image URL input as alternative */}
            <div className="pt-1">
              <Input
                placeholder="Or paste external image URL..."
                value={formData.image_url}
                onChange={(e) => {
                  setFormData({ ...formData, image_url: e.target.value });
                  setPreviewUrl(e.target.value);
                }}
                className="text-xs h-7 bg-white text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs h-8">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="gradient-hero text-xs h-8 font-semibold">
              {loading ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
