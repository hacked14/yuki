/* ============ CART: localStorage-backed cart + drawer UI + WhatsApp checkout ============ */

const Cart = {
  KEY: 'ed_cart',

  getItems() {
    return JSON.parse(localStorage.getItem(Cart.KEY) || '[]');
  },

  saveItems(items) {
    localStorage.setItem(Cart.KEY, JSON.stringify(items));
    Cart.updateBadge();
  },

  add(product, quantity = 1) {
    const items = Cart.getItems();
    const existing = items.find((i) => i.productId === product._id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({
        productId: product._id,
        quantity,
      });
    }
    Cart.saveItems(items);
    Cart.render();
    Cart.open();
  },

  addSilent(product, quantity = 1) {
    const items = Cart.getItems();
    const existing = items.find((i) => i.productId === product._id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({
        productId: product._id,
        quantity,
      });
    }
    Cart.saveItems(items);
  },

  updateQty(productId, delta) {
    const items = Cart.getItems();
    const item = items.find((i) => i.productId === productId);
    if (!item) return;
    item.quantity += delta;
    const filtered = item.quantity <= 0 ? items.filter((i) => i.productId !== productId) : items;
    Cart.saveItems(filtered);
    Cart.render();
  },

  remove(productId) {
    Cart.saveItems(Cart.getItems().filter((i) => i.productId !== productId));
    Cart.render();
  },

  total() {
    return Cart.getItems().reduce((sum, i) => sum + i.price * i.quantity, 0);
  },

  count() {
    return Cart.getItems().reduce((sum, i) => sum + i.quantity, 0);
  },

  updateBadge() {
    document.querySelectorAll('.cart-badge').forEach((el) => (el.textContent = Cart.count()));
  },

  open() {
    document.getElementById('cartOverlay')?.classList.add('open');
    document.getElementById('cartDrawer')?.classList.add('open');
  },
  close() {
    document.getElementById('cartOverlay')?.classList.remove('open');
    document.getElementById('cartDrawer')?.classList.remove('open');
  },

  async render() {
    const container = document.getElementById('cartItems');
    const footer = document.getElementById('cartFooter');
    if (!container) return;
    const items = Cart.getItems();

    if (!items.length) {
      container.innerHTML = `<div class="cart-empty">Your bag is feeling light ✨<br>Add something delicate to it.</div>`;
      if (footer) footer.style.display = 'none';
      return;
    }
    if (footer) footer.style.display = 'block';

    const productPromises = items.map((item) =>
      fetch(`${API_BASE}/products/id/${item.productId}`)
        .then((r) => r.json())
        .catch(() => null)
    );
    const products = await Promise.all(productPromises);

    container.innerHTML = items
      .map((item, idx) => {
        const product = products[idx];
        if (!product) return '';
        const image = product.images?.[0]?.url || 'assets/placeholder.jpg';
        return `
      <div class="cart-item">
        <img src="${image}" alt="${product.title}">
        <div class="info">
          <h4>${product.title}</h4>
          <div class="price">₹${product.price}</div>
          <div class="qty-control">
            <button onclick="Cart.updateQty('${item.productId}', -1)" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button onclick="Cart.updateQty('${item.productId}', 1)" aria-label="Increase quantity">+</button>
          </div>
          <button class="remove-item" onclick="Cart.remove('${item.productId}')">Remove</button>
        </div>
      </div>`;
      })
      .join('');

    const total = items.reduce((sum, item, idx) => {
      const product = products[idx];
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
    document.getElementById('cartTotal').textContent = `₹${total}`;
  },

  async checkoutViaWhatsApp() {
    const items = Cart.getItems();
    if (!items.length) return;

    const btn = document.getElementById('whatsappCheckoutBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Preparing your order...'; }

    try {
      const user = Auth.getUser();
      let customer = { name: '', email: '', phone: '' };
      let shippingAddress = {};

      if (!user) {
        const name = prompt('Your name (so Yuki knows who to reply to):');
        if (!name) throw new Error('Name is required to continue');
        const phone = prompt('Your phone number:');
        customer = { name, phone, email: '' };
      }

      const res = await fetch(`${API_BASE}/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...Auth.authHeader() },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          customer,
          shippingAddress,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not start checkout');

      window.open(data.whatsappUrl, '_blank');
    } catch (err) {
      alert(err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Checkout via WhatsApp'; }
    }
  },
};

function initCartDrawer() {
  Cart.updateBadge();
  Cart.render();
  document.getElementById('cartIconBtn')?.addEventListener('click', () => {
    Cart.open();
    Cart.render();
  });
  document.getElementById('cartDrawerClose')?.addEventListener('click', Cart.close);
  document.getElementById('cartOverlay')?.addEventListener('click', Cart.close);
  document.getElementById('whatsappCheckoutBtn')?.addEventListener('click', Cart.checkoutViaWhatsApp);
}

document.addEventListener('DOMContentLoaded', initCartDrawer);
