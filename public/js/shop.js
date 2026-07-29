/* ============ SHOP PAGE: category chips, sort, search, pagination ============ */

const shopState = { category: 'All', sort: 'featured', search: '', page: 1 };

function shopProductCardHTML(p) {
  return `
    <a class="product-card" href="/product.html?slug=${p.slug}">
      <div class="img-wrap"><img src="${p.images?.[0]?.url || 'assets/placeholder.jpg'}" alt="${p.title}" loading="lazy"></div>
      <div class="card-body">
        <span class="cat-tag">${p.category}</span>
        <h3>${p.title}</h3>
        <div class="price">₹${p.price}</div>
        <div class="card-actions">
          <button class="btn btn-outline" onclick="event.preventDefault(); window.location.href='/product.html?slug=${p.slug}'">View</button>
          <button class="btn btn-primary" onclick="event.preventDefault(); quickAddShop('${p._id}')">Add</button>
        </div>
      </div>
    </a>`;
}

let lastLoadedProducts = [];
async function quickAddShop(productId) {
  const product = lastLoadedProducts.find((p) => p._id === productId);
  if (product) Cart.add(product, 1);
}

async function loadShopProducts() {
  const grid = document.getElementById('shopGrid');
  const countEl = document.getElementById('resultsCount');
  const params = new URLSearchParams();
  if (shopState.category !== 'All') params.set('category', shopState.category);
  if (shopState.search) params.set('search', shopState.search);
  params.set('page', shopState.page);
  params.set('limit', 12);

  if (shopState.sort === 'price_asc') params.set('sort', 'price_asc');
  if (shopState.sort === 'price_desc') params.set('sort', 'price_desc');
  if (shopState.sort === 'rating') params.set('sort', 'rating');

  grid.innerHTML = `<div class="empty-state">Loading pieces...</div>`;

  try {
    const res = await fetch(`${API_BASE}/products?${params.toString()}`);
    const data = await res.json();
    lastLoadedProducts = data.products;

    countEl.textContent = `${data.total} piece${data.total === 1 ? '' : 's'} found`;
    grid.innerHTML = data.products.length
      ? data.products.map(shopProductCardHTML).join('')
      : `<div class="empty-state">No pieces match your filters yet. Try a different category or search.</div>`;

    renderPagination(data.pages, data.page);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">Something went wrong loading the shop.</div>`;
  }
}

function renderPagination(pages, current) {
  const el = document.getElementById('pagination');
  if (!el) return;
  if (pages <= 1) { el.innerHTML = ''; return; }
  let html = '';
  for (let i = 1; i <= pages; i++) {
    html += `<button class="${i === current ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }
  el.innerHTML = html;
}

function goToPage(page) {
  shopState.page = page;
  loadShopProducts();
  window.scrollTo({ top: document.getElementById('shopGrid').offsetTop - 120, behavior: 'smooth' });
}

function initShopControls() {
  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      shopState.category = chip.dataset.category;
      shopState.page = 1;
      loadShopProducts();
    });
  });

  document.getElementById('sortSelect')?.addEventListener('change', (e) => {
    shopState.sort = e.target.value;
    shopState.page = 1;
    loadShopProducts();
  });

  let searchTimeout;
  document.getElementById('searchInput')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      shopState.search = e.target.value.trim();
      shopState.page = 1;
      loadShopProducts();
    }, 350);
  });

  // Support deep-linking, e.g. shop.html?category=Earrings
  const urlParams = new URLSearchParams(window.location.search);
  const initialCategory = urlParams.get('category');
  if (initialCategory) {
    shopState.category = initialCategory;
    document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.dataset.category === initialCategory));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initShopControls();
  loadShopProducts();
});
