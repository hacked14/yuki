const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    title: String, // snapshot at time of order, in case product changes later
    price: Number,
    quantity: { type: Number, required: true, min: 1 },
    image: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // guests can also order via WhatsApp
    guestContact: {
      name: String,
      phone: String,
      email: String,
    },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    shippingAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    // No payment gateway — checkout happens over WhatsApp, so we track a simpler flow
    orderStatus: {
      type: String,
      enum: ['Pending Confirmation', 'Confirmed', 'Shipped', 'Completed', 'Cancelled'],
      default: 'Pending Confirmation',
    },
    contactMethod: { type: String, default: 'WhatsApp' },
    whatsappMessageSnapshot: { type: String }, // the exact text sent to WhatsApp, for admin reference
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
