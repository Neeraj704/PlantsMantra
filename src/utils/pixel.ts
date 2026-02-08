
// Type definitions for Facebook Pixel
type PixelEvent = 'PageView' | 'ViewContent' | 'AddToCart' | 'Purchase' | 'InitiateCheckout' | 'Search' | 'Contact';

interface PixelEventData {
    content_name?: string;
    content_category?: string;
    content_ids?: string[];
    content_type?: string;
    value?: number;
    currency?: string;
    num_items?: number;
    order_id?: string;
    search_string?: string;
    [key: string]: any;
}

declare global {
    interface Window {
        fbq: (event: string, eventName: PixelEvent, data?: PixelEventData) => void;
    }
}

/**
 * Safely tracks a Facebook Pixel event.
 * Checks if the pixel is initialized before attempting to track.
 */
export const trackPixelEvent = (eventName: PixelEvent, data?: PixelEventData) => {
    if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', eventName, data);
    } else {
        // Optional: Log to console in development if pixel is missing
        if (import.meta.env.DEV) {
            console.warn(`[Meta Pixel] fbq not defined. Event dropped: ${eventName}`, data);
        }
    }
};
