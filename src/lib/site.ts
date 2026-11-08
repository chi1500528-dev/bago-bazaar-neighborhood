// Public address shoppers should always land on (canonical, sitemap, shared links).
export const SITE_URL = "https://bagomarket.shop";
export const siteUrl = (path = "/") => `${SITE_URL}${path === "/" ? "/" : path}`;
