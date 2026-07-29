const express = require('express');
const multer = require('multer');
const slugify = (str) =>
  str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const { imageStorage, modelStorage, configured } = require('../config/cloudinary');

const router = express.Router();

router.use(protect, adminOnly);

const uploadImages = multer({ storage: imageStorage });
const uploadModel = multer({ storage: modelStorage });

// POST /api/admin/products — create a product with images + optional .glb model
// multipart/form-data fields: title, price, category, description, materialDetails,
//   stock, isFeatured, isTopPick3D, images (multiple files), model3D (single .glb file)
router.post(
  '/products',
  uploadImages.fields([
    { name: 'images', maxCount: 8 },
    { name: 'model3D', maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const { title, price, category, description, materialDetails, stock, isFeatured, isTopPick3D } = req.body;

      const images = (req.files?.images || []).map((f) => ({
        url: f.path && f.path.startsWith('http') ? f.path : `/uploads/${f.filename}`,
        publicId: f.filename,
      }));

      let model3D = null;
      if (req.files?.model3D?.[0]) {
        const mFile = req.files.model3D[0];
        model3D = {
          url: mFile.path && mFile.path.startsWith('http') ? mFile.path : `/uploads/${mFile.filename}`,
          publicId: mFile.filename,
        };
      }

      let slug = slugify(title || 'product');
      const existing = await Product.findOne({ slug });
      if (existing) slug = `${slug}-${Date.now()}`;

      // If marking this product as the new 3D Top Pick, unset any previous one first
      if (isTopPick3D === 'true' || isTopPick3D === true) {
        await Product.updateMany({ isTopPick3D: true }, { $set: { isTopPick3D: false } });
      }

      const productData = {
        title,
        slug,
        price: Number(price),
        category,
        description,
        materialDetails,
        stock: Number(stock || 0),
        images,
        isFeatured: isFeatured === 'true' || isFeatured === true,
        isTopPick3D: isTopPick3D === 'true' || isTopPick3D === true,
      };

      if (model3D) productData.model3D = model3D;

      const product = await Product.create(productData);

      res.status(201).json(product);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/products/:id/model3D — upload/replace the .glb 3D file for a product
router.post('/products/:id/model3D', uploadModel.single('model3D'), async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (!req.file) return res.status(400).json({ message: 'No .glb file uploaded' });

    const url = req.file.path && req.file.path.startsWith('http') ? req.file.path : `/uploads/${req.file.filename}`;
    product.model3D = { url, publicId: req.file.filename };
    await product.save();
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/products/:id — edit product fields, toggle featured / top-pick status
router.put('/products/:id', async (req, res, next) => {
  try {
    const updates = { ...req.body };

    // Enforce a single Top Pick 3D model at a time
    if (updates.isTopPick3D === true || updates.isTopPick3D === 'true') {
      await Product.updateMany({ _id: { $ne: req.params.id } }, { $set: { isTopPick3D: false } });
      updates.isTopPick3D = true;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/products/:id
router.delete('/products/:id', async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders — list all orders for the Order Management table
router.get('/orders', async (req, res, next) => {
  try {
    const orders = await Order.find().populate('user', 'name email').sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/orders/:id — update order status (Shipped / Completed / etc.)
router.put('/orders/:id', async (req, res, next) => {
  try {
    const { orderStatus } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { orderStatus }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/create-admin — existing admins can register new admin accounts
router.post('/create-admin', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'A user with this email already exists' });

    const newAdmin = await User.create({ name, email, password, role: 'admin' });
    res.status(201).json({ id: newAdmin._id, name: newAdmin.name, email: newAdmin.email, role: newAdmin.role });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
