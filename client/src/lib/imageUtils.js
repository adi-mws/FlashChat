export function getImageUrl(imagePath, fallback = '/imgs/pfp-img.jpeg') {
  const baseUrl = import.meta.env.VITE_BACKEND_URL;

  // If it's already an absolute URL, return it
  if (typeof imagePath === 'string' && /^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }

  // If imagePath is falsy, use fallback as-is (local asset)
  if (!imagePath) {
    return fallback;
  }

  // If imagePath is relative, combine with backend base URL
  return `${baseUrl.replace(/\/+$/, '')}/${imagePath.replace(/^\/+/, '')}`;
}
