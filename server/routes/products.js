const express = require('express');
const Product = require('../models/Product');

const router = express.Router();

// GET /api/products?category=Earrings&sort=price_asc&search=rose&featured=true&topPick=true
router.get('/', async (req, res, next) => {
  try {
    const { category, sort, search, featured, topPick, page = 1, limit = 24 } = req.query;
    const query = {};

    if (category && category !== 'All') query.category = category;
    if (featured === 'true') query.isFeatured = true;
    if (topPick === 'true') query.isTopPick3D = true;
    if (search) query.$text = { $search: search };

    let sortOption = { createdAt: -1 }; // Featured/default
    if (sort === 'price_asc') sortOption = { price: 1 };
    if (sort === 'price_desc') sortOption = { price: -1 };
    if (sort === 'rating') sortOption = { rating: -1 };

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(query).sort(sortOption).skip(skip).limit(Number(limit)),
      Product.countDocuments(query),
    ]);

    res.json({ products, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/id/:id — single product by MongoDB _id
router.get('/id/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:slug — single product detail
router.get('/:slug', async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
