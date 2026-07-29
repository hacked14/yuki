const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const isPlaceholder = (val) => !val || val.trim().length === 0 || val.includes('your_');

const configured =
  !isPlaceholder(process.env.CLOUDINARY_CLOUD_NAME) &&
  !isPlaceholder(process.env.CLOUDINARY_API_KEY) &&
  !isPlaceholder(process.env.CLOUDINARY_API_SECRET);

if (configured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Local disk storage fallback when Cloudinary is not configured or uses placeholder credentials
const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^\w-]/g, '');
    const filename = `${name}-${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const imageStorage = configured
  ? new CloudinaryStorage({
      cloudinary,
      params: {
        folder: 'enchanted-daydreams/products',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 1600, crop: 'limit' }],
      },
    })
  : localStorage;

const modelStorage = configured
  ? new CloudinaryStorage({
      cloudinary,
      params: {
        folder: 'enchanted-daydreams/models',
        resource_type: 'raw',
        allowed_formats: ['glb', 'gltf'],
      },
    })
  : localStorage;

module.exports = { cloudinary, imageStorage, modelStorage, configured };

