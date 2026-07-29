/* ============ ADMIN DASHBOARD LOGIC ============ */

function guardAdminRoute() {
  const user = Auth.getUser();
  if (!Auth.isLoggedIn() || !user || user.role !== 'admin') {
    window.location.href = '/index.html';
    return false;
  }
  return true;
}

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${isError ? 'error' : ''} show`;
  setTimeout(() => toast.classList.remove('show'), 3200);
}

/* ---------- Tab switching ---------- */
function initAdminTabs() {
  document.querySelectorAll('.admin-nav button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.admin-tab').forEach((t) => t.classList.add('tab-hidden'));
      document.getElementById(btn.dataset.tab).classList.remove('tab-hidden');
      if (btn.dataset.tab === 'tabProducts') loadAdminProducts();
      if (btn.dataset.tab === 'tabOrders') loadAdminOrders();
    });
  });
}

/* ---------- Stats ---------- */
async function loadStats() {
  try {
    const [productsRes, ordersRes] = await Promise.all([
      fetch(`${API_BASE}/products?limit=1`),
      fetch(`${API_BASE}/admin/orders`, { headers: Auth.authHeader() }),
    ]);
    const products = await productsRes.json();
    const orders = await ordersRes.json();

    document.getElementById('statProducts').textContent = products.total ?? '—';
    document.getElementById('statOrders').textContent = orders.length ?? '—';
    document.getElementById('statPending').textContent = orders.filter((o) => o.orderStatus === 'Pending Confirmation').length;
    const revenue = orders
      .filter((o) => o.orderStatus === 'Completed')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    document.getElementById('statRevenue').textContent = `₹${revenue}`;
  } catch (err) {
    console.error(err);
  }
}

/* ---------- Product Upload ---------- */
function initProductForm() {
  const form = document.getElementById('productForm');
  const imageInput = document.getElementById('productImages');
  const preview = document.getElementById('thumbPreview');

  imageInput?.addEventListener('change', () => {
    preview.innerHTML = '';
    Array.from(imageInput.files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';

    try {
      const formData = new FormData(form);
      formData.set('isFeatured', document.getElementById('isFeatured').checked);
      formData.set('isTopPick3D', document.getElementById('isTopPick3D').checked);

      const res = await fetch(`${API_BASE}/admin/products`, {
        method: 'POST',
        headers: { ...Auth.authHeader() }, // don't set Content-Type — browser sets multipart boundary
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');

      showToast('Product added successfully');
      form.reset();
      preview.innerHTML = '';
      loadAdminProducts();
      loadStats();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Product';
    }
  });
}

/* ---------- Product List / Inventory Table ---------- */
let allAdminProducts = [];

async function loadAdminProducts() {
  const tbody = document.getElementById('productsTableBody');
  try {
    const res = await fetch(`${API_BASE}/products?limit=100`);
    const data = await res.json();
    allAdminProducts = data.products;

    tbody.innerHTML = data.products
      .map(
        (p) => `
      <tr>
        <td><img src="${p.images?.[0]?.url || 'assets/placeholder.jpg'}" alt=""></td>
        <td>${p.title}</td>
        <td>${p.category}</td>
        <td>₹${p.price}</td>
        <td>${p.stock}</td>
        <td><input type="checkbox" ${p.isFeatured ? 'checked' : ''} onchange="toggleProductField('${p._id}', 'isFeatured', this.checked)"></td>
        <td><input type="checkbox" ${p.isTopPick3D ? 'checked' : ''} onchange="toggleProductField('${p._id}', 'isTopPick3D', this.checked)"></td>
        <td><button class="btn btn-outline" style="padding:6px 12px;font-size:0.65rem" onclick="deleteProduct('${p._id}')">Delete</button></td>
      </tr>`
      )
      .join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7">Could not load products.</td></tr>`;
  }
}

async function toggleProductField(id, field, value) {
  try {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...Auth.authHeader() },
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) throw new Error('Update failed');
    showToast('Updated');
    if (field === 'isTopPick3D' && value) loadAdminProducts(); // refresh so other checkboxes uncheck visually
  } catch (err) {
    showToast(err.message, true);
  }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product permanently?')) return;
  try {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'DELETE',
      headers: Auth.authHeader(),
    });
    if (!res.ok) throw new Error('Delete failed');
    showToast('Product deleted');
    loadAdminProducts();
    loadStats();
  } catch (err) {
    showToast(err.message, true);
  }
}

/* ---------- Order Management ---------- */
async function loadAdminOrders() {
  const tbody = document.getElementById('ordersTableBody');
  try {
    const res = await fetch(`${API_BASE}/admin/orders`, { headers: Auth.authHeader() });
    const orders = await res.json();

    tbody.innerHTML = orders
      .map(
        (o) => `
      <tr>
        <td>#${o._id.slice(-8).toUpperCase()}</td>
        <td>${o.user?.name || o.guestContact?.name || 'Guest'}</td>
        <td>${o.items.map((i) => `${i.title} ×${i.quantity}`).join(', ')}</td>
        <td>₹${o.totalAmount}</td>
        <td><span class="status-pill ${o.orderStatus.split(' ')[0]}">${o.orderStatus}</span></td>
        <td>
          <select class="status-select" onchange="updateOrderStatus('${o._id}', this.value)">
            ${['Pending Confirmation', 'Confirmed', 'Shipped', 'Completed', 'Cancelled']
              .map((s) => `<option value="${s}" ${s === o.orderStatus ? 'selected' : ''}>${s}</option>`)
              .join('')}
          </select>
        </td>
      </tr>`
      )
      .join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6">Could not load orders.</td></tr>`;
  }
}

async function updateOrderStatus(id, status) {
  try {
    const res = await fetch(`${API_BASE}/admin/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...Auth.authHeader() },
      body: JSON.stringify({ orderStatus: status }),
    });
    if (!res.ok) throw new Error('Could not update order');
    showToast('Order status updated');
    loadAdminOrders();
    loadStats();
  } catch (err) {
    showToast(err.message, true);
  }
}

/* ---------- Create New Admin ---------- */
function initCreateAdminForm() {
  const form = document.getElementById('createAdminForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const name = document.getElementById('newAdminName').value;
      const email = document.getElementById('newAdminEmail').value;
      const password = document.getElementById('newAdminPassword').value;

      const res = await fetch(`${API_BASE}/admin/create-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...Auth.authHeader() },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not create admin');
      showToast(`Admin account created for ${data.email}`);
      form.reset();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (!guardAdminRoute()) return;
  document.getElementById('adminNameLabel').textContent = Auth.getUser()?.name || 'Admin';
  initAdminTabs();
  initProductForm();
  initCreateAdminForm();
  loadStats();
  loadAdminProducts();

  document.getElementById('logoutBtn')?.addEventListener('click', Auth.logout);
});
