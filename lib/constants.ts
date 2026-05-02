export const LOCATIONS = [
  "Delhi",
  "Mumbai",
  "Bengaluru",
  "Chennai",
  "Kolkata",
  "Hyderabad",
] as const;

export const LOCATION_FILTER_OPTIONS = ["All Locations", ...LOCATIONS] as const;

export const PRODUCT_CATEGORIES = [
  "Fashion",
  "Electronics",
  "Home & Living",
  "Beauty",
  "Accessories",
  "Essentials",
] as const;

export const COMPANY_NAME = "Nowaam Marketplace";
export const COMPANY_TAGLINE =
  "A multi-category marketplace where manufacturers sell retail and wholesale from one modern storefront.";
export const CART_STORAGE_KEY = "nowaam-cart";
export const WISHLIST_STORAGE_KEY = "nowaam-wishlist";
export const PROFILE_STORAGE_KEY = "nowaam-buyer-profile";
export const ORDER_HISTORY_STORAGE_KEY = "nowaam-order-history";
export const ADDRESSES_STORAGE_KEY = "nowaam-saved-addresses";
export const RECENTLY_VIEWED_STORAGE_KEY = "nowaam-recently-viewed";
export const NOTIFICATION_PREFS_STORAGE_KEY = "nowaam-notification-prefs";
