/* ============ PRODUCT DETAIL PAGE ============ */

let currentProduct = null;
let selectedQty = 1;

function getSlugFromURL() {
  return new URLSearchParams(window.location.search).get('slug');
}

async function loadProductDetail() {
  const slug = getSlugFromURL();
  const wrap = document.getElementById('pdWrap');
  if (!slug) { wrap.innerHTML = '<div class="empty-state">No product specified.</div>'; return; }

  try {
    const res = await fetch(`${API_BASE}/products/${slug}`);
    if (!res.ok) throw new Error('Product not found');
    currentProduct = await res.json();
    renderProduct(currentProduct);
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state">This piece could not be found. <a href="/shop.html">Back to shop →</a></div>`;
  }
}

function renderProduct(p) {
  document.title = `${p.title} — Enchanted Daydreams by Yuki`;

  const images = p.images?.length ? p.images : [{ url: 'assets/placeholder.jpg' }];

  document.getElementById('pdWrap').innerHTML = `
    <div class="pd-grid">
      <div class="pd-gallery">
        <div class="pd-gallery-main"><img id="pdMainImg" src="${images[0].url}" alt="${p.title}"></div>
        <div class="pd-thumbs">
          ${images.map((img, i) => `<img src="${img.url}" class="${i === 0 ? 'active' : ''}" onclick="switchImage('${img.url}', this)">`).join('')}
        </div>
      </div>
      <div class="pd-info">
        <span class="cat-tag">${p.category}</span>
        <h1>${p.title}</h1>
        <div class="pd-price">₹${p.price}</div>
        <p class="pd-desc">${p.description}</p>
        ${p.materialDetails ? `<div class="pd-material"><strong>Materials & Care</strong><br>${p.materialDetails}</div>` : ''}
        <div class="pd-stock ${p.stock <= 3 && p.stock > 0 ? 'low' : ''}">
          ${p.stock > 0 ? (p.stock <= 3 ? `Only ${p.stock} left — handcrafted in small batches` : 'In stock') : 'Currently out of stock'}
        </div>
        <div class="pd-actions">
          <div class="pd-qty">
            <button onclick="changeQty(-1)" aria-label="Decrease">−</button>
            <span id="qtyDisplay">1</span>
            <button onclick="changeQty(1)" aria-label="Increase">+</button>
          </div>
          <button class="btn btn-primary" style="flex:1" onclick="addToCartFromDetail()" ${p.stock <= 0 ? 'disabled' : ''}>Add to Bag</button>
        </div>
        <button class="btn btn-whatsapp btn-block" onclick="buyNowViaWhatsApp()" ${p.stock <= 0 ? 'disabled' : ''}>
          Buy Now via WhatsApp
        </button>
        <p class="whatsapp-note">Tapping this opens WhatsApp with this piece, quantity, and price already typed out to send to Yuki directly — no card details needed.</p>
      </div>
    </div>
  `;
}

function switchImage(url, el) {
  document.getElementById('pdMainImg').src = url;
  document.querySelectorAll('.pd-thumbs img').forEach((i) => i.classList.remove('active'));
  el.classList.add('active');
}

function changeQty(delta) {
  selectedQty = Math.max(1, selectedQty + delta);
  document.getElementById('qtyDisplay').textContent = selectedQty;
}

function addToCartFromDetail() {
  if (!currentProduct) return;
  Cart.add(currentProduct, selectedQty);
}

// "Buy Now via WhatsApp" — adds the item to the bag, then opens WhatsApp
async function buyNowViaWhatsApp() {
  if (!currentProduct) return;
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = 'Preparing your order...';

  try {
    Cart.addSilent(currentProduct, selectedQty);

    const user = Auth.getUser();
    let customer = { name: '', email: '', phone: '' };
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
        items: [{ productId: currentProduct._id, quantity: selectedQty }],
        customer,
        shippingAddress: {},
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Could not start checkout');
    window.open(data.whatsappUrl, '_blank');
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Buy Now via WhatsApp';
  }
}

document.addEventListener('DOMContentLoaded', loadProductDetail);
