const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      required: true,
      enum: ['Earrings', 'Necklaces', 'Bracelets', 'Custom'],
    },
    description: { type: String, required: true },
    materialDetails: { type: String },
    stock: { type: Number, required: true, default: 0, min: 0 },
    images: [{ url: String, publicId: String }],
    model3D: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    hotspots: [
      {
        label: String,
        x: Number, // normalized 0-1 position on the 3D model surface
        y: Number,
        z: Number,
        note: String,
      },
    ],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false }, // "Featured on Landing Page"
    isTopPick3D: { type: Boolean, default: false }, // "Replace Top Pick 3D Model" — only one should be true at a time
  },
  { timestamps: true }
);

productSchema.index({ title: 'text', description: 'text', materialDetails: 'text' });

module.exports = mongoose.model('Product', productSchema);
