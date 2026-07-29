/* ============ HOMEPAGE LOGIC: featured products, top pick 3D load, category grid ============ */

function productCardHTML(p) {
  return `
    <a class="product-card" href="/product.html?slug=${p.slug}">
      <div class="img-wrap"><img src="${p.images?.[0]?.url || 'assets/placeholder.jpg'}" alt="${p.title}" loading="lazy"></div>
      <div class="card-body">
        <span class="cat-tag">${p.category}</span>
        <h3>${p.title}</h3>
        <div class="price">₹${p.price}</div>
        <div class="card-actions">
          <button class="btn btn-outline" onclick="event.preventDefault(); window.location.href='/product.html?slug=${p.slug}'">View</button>
          <button class="btn btn-primary" onclick="event.preventDefault(); quickAdd('${p._id}')">Add</button>
        </div>
      </div>
    </a>`;
}

async function quickAdd(productId) {
  try {
    const res = await fetch(`${API_BASE}/products`);
    const data = await res.json();
    const product = data.products.find((p) => p._id === productId);
    if (product) Cart.add(product, 1);
  } catch (err) {
    console.error(err);
  }
}

async function loadFeaturedProducts() {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;
  try {
    const res = await fetch(`${API_BASE}/products?featured=true&limit=8`);
    const data = await res.json();
    grid.innerHTML = data.products.length
      ? data.products.map(productCardHTML).join('')
      : `<div class="empty-state">New treasures are being wire-wrapped as we speak — check back soon.</div>`;
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">Couldn't load collections right now.</div>`;
  }
}

async function loadTopPickViewer() {
  const nameEl = document.getElementById('topPickName');
  const priceEl = document.getElementById('topPickPrice');
  try {
    const res = await fetch(`${API_BASE}/products?topPick=true&limit=1`);
    const data = await res.json();
    const product = data.products[0] || null;
    if (product) {
      nameEl.textContent = product.title;
      priceEl.textContent = `₹${product.price}`;
      document.getElementById('topPickViewBtn')?.setAttribute('href', `/product.html?slug=${product.slug}`);
    } else {
      nameEl.textContent = 'Rose Quartz Whisper Ring';
      priceEl.textContent = '';
    }
    initThreeViewer(product);
  } catch (err) {
    console.error(err);
    initThreeViewer(null);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadFeaturedProducts();
  loadTopPickViewer();
});
