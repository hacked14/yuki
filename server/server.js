require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const seedAdmin = require('./seed');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const adminRoutes = require('./routes/admin');
const checkoutRoutes = require('./routes/checkout');
const ordersRoutes = require('./routes/orders');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Serve the static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/orders', ordersRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Fallback to index.html for any non-API route (simple multi-page app, no client router needed)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'), (err) => {
    if (err) next();
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  await seedAdmin(); // ensures the permanent default admin exists
  const server = app.listen(PORT, () => console.log(`Enchanted Daydreams server running on port ${PORT}`));
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Error] Port ${PORT} is already in use. Please stop any process using port ${PORT} or set process.env.PORT to a different port.`);
      process.exit(1);
    } else {
      console.error('[Error] Server error:', err);
    }
  });
};

start();
