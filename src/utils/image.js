/**
 * Downscales/compresses an image file client-side before it gets stored as a
 * base64 data URL directly in a Postgres JSONB row (this app has no blob/
 * cloud file storage — see AdminBarbers.jsx's handleImageChange). Needed
 * once a form allows multiple photos (up to 10 for a barbershop) instead of
 * one, so rows don't balloon with untouched full-resolution uploads.
 */
export function resizeImageFile(file, { maxDim = 1280, quality = 0.8 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('image load failed'))
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
