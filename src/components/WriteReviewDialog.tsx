import { useState, useRef } from 'react';
import { Star, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

interface WriteReviewDialogProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  initialRating?: number;
  onSuccess: () => void;
}

export const WriteReviewDialog = ({
  open,
  onClose,
  productId,
  initialRating = 0,
  onSuccess,
}: WriteReviewDialogProps) => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rating, setRating] = useState(initialRating);
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
      const isSmallEnough = file.size <= 5 * 1024 * 1024; // 5MB
      if (!isValid) toast.error(`${file.name} is not an image`);
      if (!isSmallEnough) toast.error(`${file.name} is larger than 5MB`);
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
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (body.length < 10) {
      toast.error('Review must be at least 10 characters');
      return;
    }
    if (body.length > 2000) {
      toast.error('Review must be less than 2000 characters');
      return;
    }

    setSubmitting(true);
    try {
      if (!user) throw new Error('You must be logged in');

      // 1. Insert review
      const { data: review, error: reviewError } = await (supabase
        .from('reviews' as any)
        .insert({
          product_id: productId,
          user_id: user.id,
          reviewer_name: profile?.full_name || user.email?.split('@')[0] || 'Anonymous',
          rating,
          title: title || null,
          body,
          verified_purchase: true, // This will be verified by RLS
          is_admin_created: false,
        })
        .select()
        .single() as any);


      if (reviewError) throw reviewError;

      // 2. Upload images if any
      if (images.length > 0) {
        let uploadCount = 0;
        for (let i = 0; i < images.length; i++) {
          const file = images[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${productId}/${review.id}/${Date.now()}-${i}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('review-images')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Image upload error:', uploadError);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('review-images')
            .getPublicUrl(fileName);

          await supabase.from('review_images' as any).insert({
            review_id: review.id,
            image_url: publicUrl,
            display_order: i,
          });
          uploadCount++;
        }

        if (uploadCount < images.length) {
          toast.warning(`Review saved, but ${images.length - uploadCount} images failed to upload.`);
        }
      }

      toast.success('Review submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
      queryClient.invalidateQueries({ queryKey: ['review-summary', productId] });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Write a Review</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-2 text-center">
            <Label className="text-sm font-medium">Your Rating</Label>
            <div className="flex justify-center gap-1">
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
                    size={32}
                    fill={(hoverRating || rating) >= s ? "currentColor" : "none"}
                    className={cn(
                      "transition-colors",
                      (hoverRating || rating) >= s ? "text-yellow-400" : "text-gray-300"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="title">Review Title (optional)</Label>
              <span className="text-[10px] text-gray-400">{title.length}/100</span>
            </div>
            <Input
              id="title"
              placeholder="Good experience, easy to grow, etc."
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="body">Your Review</Label>
              <span className="text-[10px] text-gray-400">{body.length}/2000</span>
            </div>
            <Textarea
              id="body"
              placeholder="Tell us about your experience with this plant..."
              className="min-h-[120px] resize-none"
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 2000))}
            />
            {body.length > 0 && body.length < 10 && (
              <p className="text-[10px] text-red-500">Min 10 characters required</p>
            )}
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Photos (optional, up to 5)</Label>
            <div className="flex flex-wrap gap-2">
              {imagePreviews.map((preview, i) => (
                <div key={i} className="relative h-20 w-20 group">
                  <img
                    src={preview}
                    alt="Preview"
                    className="h-full w-full object-cover rounded-lg border"
                  />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              
              {images.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-20 w-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg hover:border-primary hover:bg-gray-50 transition-colors"
                >
                  <Upload size={20} className="text-gray-400" />
                  <span className="text-[10px] text-gray-500 mt-1">Add Photo</span>
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
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || rating === 0 || body.length < 10}
            className="min-w-[120px]"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Review'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
