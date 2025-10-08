// FILE: src/components/SEOTags.tsx

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOTagsProps {
  title?: string;
  description?: string;
}

/**
 * Dynamically sets the page's HTML <title> and <meta name="description"> tags.
 * This is crucial for per-product SEO on a Single Page Application (SPA).
 */
const SEOTags = ({ title, description }: SEOTagsProps) => {
  const location = useLocation();

  useEffect(() => {
    // Save original title for fallback
    const originalTitle = document.title;
    // Save original description content for fallback/reset
    const metaDescriptionTag = document.querySelector('meta[name="description"]');
    const originalDescription = metaDescriptionTag?.getAttribute('content') || "Verdant - Your Urban Jungle, Delivered. Premium indoor and outdoor plants delivered to your door.";
    
    // Set Dynamic Title (if provided)
    if (title) {
      document.title = title;
    } else {
      // Fallback to a default structure for non-product pages
      document.title = originalTitle;
    }

    // Set Dynamic Meta Description (if provided)
    if (metaDescriptionTag) {
      if (description) {
        metaDescriptionTag.setAttribute('content', description);
      } else {
        // Fallback to the default description from index.html
        metaDescriptionTag.setAttribute('content', originalDescription);
      }
    }

    // Cleanup function to reset tags when the component unmounts
    // This is especially useful in an SPA when navigating between pages.
    return () => {
      document.title = originalTitle;
      if (metaDescriptionTag) {
        metaDescriptionTag.setAttribute('content', originalDescription);
      }
    };
  }, [title, description, location.pathname]); // Re-run on prop or route change

  return null;
};

export default SEOTags;