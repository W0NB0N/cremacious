import type { NextConfig } from 'next';

// cacheComponents is off on purpose: it keeps the previous route's DOM hidden in the document,
// and the shot driver reads page state (the 404's pinned level) from the DOM on every page.
const nextConfig: NextConfig = {};

export default nextConfig;
