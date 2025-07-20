export function getImageUrl(imagePath, fallback = 'uploads/pfps/default-pfp.jpeg') {
    const baseUrl = import.meta.env.VITE_BACKEND_URL;
  
    if (typeof imagePath === 'string' && /^https?:\/\//i.test(imagePath)) {
      return imagePath;
    }
  
    const final_image = imagePath || fallback;
  
    return `${baseUrl.replace(/\/+$/, '')}/${final_image.replace(/^\/+/, '')}`;
  }
  