import { useState } from 'react';
import { Star, MoreVertical, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Review } from '@/types/database';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface ReviewCardProps {
  review: Review;
  showAdminControls?: boolean;
  onToggleHidden?: (id: string, currentState: boolean) => void;
  onDelete?: (id: string) => void;
}

const AVATAR_COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-orange-500',
];

export const ReviewCard = ({
  review,
  showAdminControls,
  onToggleHidden,
  onDelete,
}: ReviewCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const avatarColor = AVATAR_COLORS[review.reviewer_name.charCodeAt(0) % AVATAR_COLORS.length];

  return (
    <div className={cn(
      "p-6 bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 last:mb-0",
      review.is_hidden && showAdminControls && "opacity-50"
    )}>

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar className={cn("h-10 w-10 text-white font-semibold", avatarColor)}>
            <AvatarFallback>{review.reviewer_name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{review.reviewer_name}</span>
              {review.verified_purchase && (
                <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  Verified Purchase
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    fill={i < review.rating ? "currentColor" : "none"}
                    className={i < review.rating ? "text-yellow-400" : "text-gray-300"}
                  />
                ))}
              </div>
              <span>•</span>
              <span>{format(new Date(review.created_at), 'MMMM dd, yyyy')}</span>
            </div>
          </div>
        </div>

        {showAdminControls && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">
                {review.is_hidden ? 'Hidden' : 'Visible'}
              </span>
              <Switch
                checked={!review.is_hidden}
                onCheckedChange={() => onToggleHidden?.(review.id, review.is_hidden)}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => onDelete?.(review.id)}
            >
              <Trash2 size={18} />
            </Button>
          </div>
        )}
      </div>

      <div className="ml-13 pl-13 border-l-2 border-gray-50">
        {review.title && (
          <h4 className="font-bold text-gray-900 mb-1">{review.title}</h4>
        )}
        <div className="relative">
          <p className={cn(
            "text-gray-600 leading-relaxed",
            !isExpanded && "line-clamp-3"
          )}>
            {review.body}
          </p>
          {review.body.length > 200 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-primary font-medium text-sm mt-2 hover:underline focus:outline-none"
            >
              {isExpanded ? 'See less' : 'See more'}
            </button>
          )}
        </div>

        {review.review_images && review.review_images.length > 0 && (
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
            {review.review_images.map((img) => (
              <img
                key={img.id}
                src={img.image_url}
                alt="Review"
                className="h-20 w-20 object-cover rounded-lg border border-gray-100 flex-shrink-0"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
