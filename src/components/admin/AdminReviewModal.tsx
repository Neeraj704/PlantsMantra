import { useState, useRef } from 'react';
import { Star, Upload, X, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AdminReviewModalProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  onSuccess: () => void;
}

export const AdminReviewModal = ({
  open,
  onClose,
  productId,
  onSuccess,
}: AdminReviewModalProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reviewerName, setReviewerName] = useState('');
  const [reviewDate, setReviewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    const validFiles = files.filter(file => {
      const isValid = file.type.startsWith('image/');
      const isSmallEnough = file.size <= 5 * 1024 * 1024;
      return isValid && isSmallEnough;
    });

    setImages(prev => [...prev, ...validFiles]);
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(imagePreviews[index]);
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!reviewerName.trim()) {
      toast.error('Reviewer name is required');
      return;
    }
    if (body.length < 10) {
      toast.error('Review must be at least 10 characters');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Insert review
      const { data: review, error: reviewError } = await (supabase
        .from('reviews' as any)
        .insert({
          product_id: productId,
          user_id: null, // Admin created
          reviewer_name: reviewerName,
          rating,
          title: title || null,
          body,
          is_hidden: false,
          is_admin_created: true,
          verified_purchase: true,
          created_at: new Date(reviewDate).toISOString(),
        })
        .select()
        .single() as any);

      if (reviewError) throw reviewError;


      // 2. Upload images if any
      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const file = images[i];
          const fileName = `${productId}/${review.id}/admin-${Date.now()}-${i}.${file.name.split('.').pop()}`;
          
          await supabase.storage.from('review-images').upload(fileName, file);
          const { data: { publicUrl } } = supabase.storage.from('review-images').getPublicUrl(fileName);

          await supabase.from('review_images' as any).insert({
            review_id: review.id,
            image_url: publicUrl,
            display_order: i,
          });
        }
      }

      toast.success('Admin review added successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-reviews', productId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
      onSuccess();
      onClose();
      
      // Reset form
      setReviewerName('');
      setReviewDate(format(new Date(), 'yyyy-MM-dd'));
      setRating(5);
      setTitle('');
      setBody('');
      setImages([]);
      setImagePreviews([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Manual Review</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reviewer">Reviewer Name</Label>
              <Input
                id="reviewer"
                placeholder="e.g. John Doe"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Review Date</Label>
              <Input
                id="date"
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 text-center py-2">
            <Label>Rating</Label>
            <div className="flex justify-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(s)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    size={28}
                    fill={(hoverRating || rating) >= s ? "currentColor" : "none"}
                    className={(hoverRating || rating) >= s ? "text-yellow-400" : "text-gray-300"}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-title">Title (optional)</Label>
            <Input
              id="admin-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-body">Review Body</Label>
            <Textarea
              id="admin-body"
              className="min-h-[100px]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Photos (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {imagePreviews.map((preview, i) => (
                <div key={i} className="relative h-16 w-16 group">
                  <img src={preview} alt="Preview" className="h-full w-full object-cover rounded-md border" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-16 w-16 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-md hover:border-primary hover:bg-gray-50"
                >
                  <Upload size={16} className="text-gray-400" />
                </button>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept="image/*"
              onChange={handleImageChange}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Add Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
