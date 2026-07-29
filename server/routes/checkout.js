const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Tries to read a logged-in user from the token if present, but doesn't block guests
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();
  try {
    await protect(req, res, next);
  } catch {
    next();
  }
};

// Builds the exact text that gets sent to the admin's WhatsApp
function buildWhatsAppMessage({ items, totalAmount, customer, shippingAddress, orderId }) {
  const lines = [];
  lines.push(`✨ New Order Enquiry — Enchanted Daydreams by Yuki ✨`);
  lines.push(`Order Ref: ${orderId}`);
  lines.push('');
  lines.push('*Items:*');
  items.forEach((item, i) => {
    lines.push(`${i + 1}. ${item.title} (x${item.quantity}) — ₹${item.price} each = ₹${item.price * item.quantity}`);
  });
  lines.push('');
  lines.push(`*Total: ₹${totalAmount}*`);
  lines.push('');
  lines.push('*Customer Details:*');
  lines.push(`Name: ${customer.name || 'N/A'}`);
  if (customer.email) lines.push(`Email: ${customer.email}`);
  if (customer.phone) lines.push(`Phone: ${customer.phone}`);
  if (shippingAddress && shippingAddress.line1) {
    lines.push('');
    lines.push('*Shipping Address:*');
    lines.push(
      [shippingAddress.line1, shippingAddress.line2, shippingAddress.city, shippingAddress.state, shippingAddress.postalCode, shippingAddress.country]
        .filter(Boolean)
        .join(', ')
    );
  }
  lines.push('');
  lines.push('I would like to confirm this order and arrange payment. Please let me know the next steps 💫');
  return lines.join('\n');
}

// POST /api/checkout/create-order
// Body: { items: [{ productId, quantity }], customer: {name, email, phone}, shippingAddress }
// Instead of a payment gateway, this logs the order as "Pending Confirmation" and
// returns a ready-to-open wa.me link with the full order pre-typed for the admin.
router.post('/create-order', optionalAuth, async (req, res, next) => {
  try {
    const { items, customer = {}, shippingAddress = {} } = req.body;
    if (!items || !items.length) return res.status(400).json({ message: 'Cart is empty' });

    // Rehydrate item details from the DB so prices/titles can't be tampered with client-side
    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    const orderItems = items.map((i) => {
      const product = products.find((p) => p._id.toString() === i.productId);
      if (!product) throw new Error(`Product ${i.productId} not found`);
      return {
        product: product._id,
        title: product.title,
        price: product.price,
        quantity: i.quantity,
        image: product.images?.[0]?.url,
      };
    });

    const totalAmount = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const order = await Order.create({
      user: req.user ? req.user._id : undefined,
      guestContact: req.user
        ? undefined
        : { name: customer.name, phone: customer.phone, email: customer.email },
      items: orderItems,
      totalAmount,
      shippingAddress,
      orderStatus: 'Pending Confirmation',
      contactMethod: 'WhatsApp',
    });

    const message = buildWhatsAppMessage({
      items: orderItems,
      totalAmount,
      customer: req.user ? { name: req.user.name, email: req.user.email, phone: req.user.phone } : customer,
      shippingAddress,
      orderId: order._id.toString().slice(-8).toUpperCase(),
    });

    order.whatsappMessageSnapshot = message;
    await order.save();

    const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
    const whatsappUrl = `https://wa.me/${adminNumber}?text=${encodeURIComponent(message)}`;

    res.status(201).json({ orderId: order._id, whatsappUrl, totalAmount });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
