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
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);

    reader.readAsDataURL(file);
  });
}

export function base64ToFile(base64String, filename = 'captured-image.jpg') {
  const arr = base64String.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}