import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface BannerModalProps {
  open: boolean;
  onClose: () => void;
  banner?: any;
}

const BannerModal = ({ open, onClose, banner }: BannerModalProps) => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(banner?.title || '');
  const [linkUrl, setLinkUrl] = useState(banner?.link_url || '');
  const [displayOrder, setDisplayOrder] = useState(banner?.display_order || 0);
  const [isActive, setIsActive] = useState(banner?.is_active ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = banner?.image_url;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('banners')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('banners')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      if (!imageUrl) {
        throw new Error('Please upload an image');
      }

      const bannerData = {
        title,
        image_url: imageUrl,
        link_url: linkUrl || null,
        display_order: displayOrder,
        is_active: isActive,
      };

      if (banner) {
        const { error } = await supabase
          .from('banners')
          .update(bannerData)
          .eq('id', banner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('banners')
          .insert(bannerData);
        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Banner ${banner ? 'updated' : 'created'} successfully`,
      });

      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{banner ? 'Edit' : 'Add'} Banner</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="image">Banner Image (300x179 recommended)</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              required={!banner}
            />
            {banner?.image_url && (
              <img
                src={banner.image_url}
                alt="Current banner"
                className="mt-2 max-h-[100px] object-contain"
              />
            )}
          </div>

          <div>
            <Label htmlFor="linkUrl">Link URL (optional)</Label>
            <Input
              id="linkUrl"
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="/shop"
            />
          </div>

          <div>
            <Label htmlFor="displayOrder">Display Order</Label>
            <Input
              id="displayOrder"
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value))}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BannerModal;
