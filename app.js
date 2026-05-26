// ===== THEME INITIALIZATION =====
(function() {
  const savedTheme = localStorage.getItem('shop_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark-theme');
  }
  if (document.body) {
    document.body.classList.toggle('dark-theme', savedTheme === 'dark');
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.classList.toggle('dark-theme', savedTheme === 'dark');
    });
  }
})();

const API = 'http://localhost:3000';

// ===== AUTH =====
function getCurrentUser() {
  const data = localStorage.getItem('shop_user');
  return data ? JSON.parse(data) : null;
}

function isLoggedIn() {
  return !!getCurrentUser();
}

function isAdmin() {
  const user = getCurrentUser();
  return user && user.isAdmin;
}

function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
  }
}

function requireAdmin() {
  requireAuth();
  if (!isAdmin()) {
    showMessage('Access denied. Admin only.', 'error');
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
  }
}

async function loginUser(email, password) {
  const res = await fetch(`${API}/users?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
  const users = await res.json();
  if (users.length === 0) throw new Error('Invalid email or password');
  const user = users[0];
  localStorage.setItem('shop_user', JSON.stringify({ id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin }));
  return user;
}

async function registerUser(name, email, password) {
  const check = await fetch(`${API}/users?email=${encodeURIComponent(email)}`);
  const existing = await check.json();
  if (existing.length > 0) throw new Error('Email already registered');
  const res = await fetch(`${API}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, isAdmin: false })
  });
  const user = await res.json();
  localStorage.setItem('shop_user', JSON.stringify({ id: user.id, name: user.name, email: user.email, isAdmin: false }));
  return user;
}

function logoutUser() {
  localStorage.removeItem('shop_user');
  window.location.href = 'index.html';
}

// ===== API HELPERS =====
async function apiGet(endpoint) {
  const res = await fetch(`${API}${endpoint}`);
  if (!res.ok) throw new Error(`GET ${endpoint} failed`);
  return res.json();
}

async function apiPost(endpoint, data) {
  const res = await fetch(`${API}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`POST ${endpoint} failed`);
  return res.json();
}

async function apiPut(endpoint, data) {
  const res = await fetch(`${API}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`PUT ${endpoint} failed`);
  return res.json();
}

async function apiDelete(endpoint) {
  const res = await fetch(`${API}${endpoint}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${endpoint} failed`);
  return res.json();
}

// ===== PRODUCTS =====
async function getProducts(category, search) {
  let query = '?_sort=id&_order=asc';
  if (category && category !== 'All') query += `&category=${encodeURIComponent(category)}`;
  if (search) query += `&q=${encodeURIComponent(search)}`;
  return apiGet(`/products${query}`);
}

async function getProduct(id) {
  return apiGet(`/products/${id}`);
}

async function createProduct(data) {
  return apiPost('/products', data);
}

async function updateProduct(id, data) {
  return apiPut(`/products/${id}`, data);
}

async function deleteProduct(id) {
  return apiDelete(`/products/${id}`);
}

async function getCategories() {
  const products = await apiGet('/products');
  return [...new Set(products.map(p => p.category))];
}

// ===== CART =====
async function getCart(userId) {
  return apiGet(`/cart?userId=${userId}&_expand=product`);
}

async function addToCart(userId, productId, quantity) {
  const existing = await apiGet(`/cart?userId=${userId}&productId=${productId}`);
  if (existing.length > 0) {
    const item = existing[0];
    return apiPut(`/cart/${item.id}`, { ...item, quantity: item.quantity + quantity });
  }
  return apiPost('/cart', { userId, productId, quantity });
}

async function updateCartItem(id, quantity) {
  const item = await apiGet(`/cart/${id}`);
  return apiPut(`/cart/${id}`, { ...item, quantity });
}

async function removeCartItem(id) {
  return apiDelete(`/cart/${id}`);
}

async function clearCart(userId) {
  const items = await apiGet(`/cart?userId=${userId}`);
  await Promise.all(items.map(item => apiDelete(`/cart/${item.id}`)));
}

// ===== ORDERS =====
async function createOrder(orderData) {
  return apiPost('/orders', orderData);
}

async function getOrders(userId) {
  return apiGet(`/orders?userId=${userId}&_sort=id&_order=desc`);
}

async function cancelOrder(orderId) {
  const order = await apiGet(`/orders/${orderId}`);
  return apiPut(`/orders/${orderId}`, { ...order, status: 'cancelled' });
}

// ===== UI HELPERS =====
function showMessage(msg, type = 'success') {
  const el = document.getElementById('message');
  if (!el) return;
  el.textContent = msg;
  el.className = `show ${type}`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.classList.add('hiding');
    setTimeout(() => { el.className = ''; }, 300);
  }, 3000);
}

function toggleTheme() {
  const currentTheme = localStorage.getItem('shop_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('shop_theme', newTheme);
  
  if (document.body) {
    document.body.classList.toggle('dark-theme', newTheme === 'dark');
  }
  document.documentElement.classList.toggle('dark-theme', newTheme === 'dark');
  
  updateNavbar();
}

function updateNavbar() {
  const user = getCurrentUser();
  const nav = document.getElementById('nav-links');
  if (!nav) return;
  
  const savedTheme = localStorage.getItem('shop_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const toggleIcon = savedTheme === 'dark' ? '☀️' : '🌙';
  const toggleTitle = savedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  
  const themeBtnHtml = `
    <button class="theme-toggle-btn" onclick="toggleTheme()" title="${toggleTitle}" aria-label="Toggle Theme">
      ${toggleIcon}
    </button>
  `;

  if (user) {
    nav.innerHTML = `
      <a href="home.html">Home</a>
      <a href="index.html">Products</a>
      <span class="user-name">Hi, ${user.name.split(' ')[0]}</span>
      ${user.isAdmin ? '<a href="admin.html">Admin</a>' : ''}
      <a href="orders.html">Orders</a>
      <a href="cart.html" class="cart-link">Cart (<span id="cart-count-nav">0</span>)</a>
      <a href="#" onclick="logoutUser()">Logout</a>
      ${themeBtnHtml}
    `;
  } else {
    nav.innerHTML = `
      <a href="home.html">Home</a>
      <a href="index.html">Products</a>
      <a href="login.html">Login</a>
      <a href="register.html">Register</a>
      <a href="cart.html" class="cart-link">Cart (<span id="cart-count-nav">0</span>)</a>
      ${themeBtnHtml}
    `;
  }
  updateCartCount();
}

async function updateCartCount() {
  const span = document.getElementById('cart-count-nav');
  if (!span) return;
  const user = getCurrentUser();
  if (!user) { span.textContent = '0'; return; }
  try {
    const items = await apiGet(`/cart?userId=${user.id}`);
    const count = items.reduce((s, i) => s + i.quantity, 0);
    span.textContent = count;
  } catch {
    span.textContent = '0';
  }
}

function getStarHTML(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let stars = '';
  for (let i = 0; i < full; i++) stars += '★';
  if (half) stars += '★';
  const empty = 5 - full - (half ? 1 : 0);
  for (let i = 0; i < empty; i++) stars += '☆';
  return stars;
}

function formatPrice(p) {
  return '₹' + p.toLocaleString('en-IN');
}

// ===== RIPPLE EFFECT =====
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-primary, .btn-secondary, .btn-danger, .add-btn');
  if (!btn) return;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
});

// ===== INTERSECTION OBSERVER (SCROLL REVEAL) =====
function observeReveal(selector, options = {}) {
  const els = document.querySelectorAll(selector);
  if (!els.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        const priceEl = entry.target.querySelector('.price');
        if (priceEl && priceEl.dataset.value) {
          animateValue(priceEl, 0, parseInt(priceEl.dataset.value), 800);
        }
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, ...options });
  els.forEach((el, i) => {
    el.style.transitionDelay = `${i * 0.08}s`;
    observer.observe(el);
  });
}

// ===== SCROLL PROGRESS BAR =====
function initScrollProgress() {
  const bar = document.createElement('div');
  bar.id = 'scroll-progress';
  document.body.prepend(bar);
  window.addEventListener('scroll', () => {
    const winScroll = document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    bar.style.width = `${(winScroll / height) * 100}%`;
  }, { passive: true });
}

// ===== BACK TO TOP =====
function initBackToTop() {
  const btn = document.createElement('button');
  btn.id = 'back-to-top';
  btn.innerHTML = '↑';
  btn.setAttribute('aria-label', 'Back to top');
  btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  document.body.appendChild(btn);

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        btn.classList.toggle('show', window.scrollY > 300);
        ticking = false;
      });
      ticking = true;
    }
  });
}

// ===== NAVBAR SCROLL SHADOW =====
function initNavbarShadow() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });
}

// ===== CART BOUNCE =====
function bounceCartCount() {
  const span = document.getElementById('cart-count-nav');
  if (span) {
    span.classList.remove('cart-bounce');
    void span.offsetWidth;
    span.classList.add('cart-bounce');
  }
}

// ===== CONFETTI CELEBRATION =====
function fireConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const pieces = Array.from({length: 120}, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    w: Math.random() * 8 + 4,
    h: Math.random() * 6 + 3,
    color: `hsl(${Math.random() * 360}, 80%, 60%)`,
    vy: Math.random() * 3 + 2,
    vx: (Math.random() - 0.5) * 2,
    rot: Math.random() * 360,
    rv: (Math.random() - 0.5) * 6,
    opacity: 1,
  }));
  let frame = 0;
  function draw() {
    if (frame > 180) { canvas.remove(); return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rv;
      if (frame > 120) p.opacity -= 0.015;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    frame++;
    requestAnimationFrame(draw);
  }
  draw();
}

// ===== COUNT-UP ANIMATION =====
function animateValue(el, start, end, duration = 600) {
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (end - start) * eased);
    el.textContent = formatPrice(current);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ===== IMAGE LOAD FADE-IN =====
document.addEventListener('load', (e) => {
  if (e.target.tagName === 'IMG' && e.target.closest('.product-card, .cart-item, .detail-image')) {
    e.target.classList.add('loaded');
  }
}, true);

// ===== FLOATING PARTICLES =====
function initParticles() {
  const container = document.createElement('div');
  container.className = 'particles';
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    container.appendChild(p);
  }
  document.body.prepend(container);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  updateNavbar();
  initBackToTop();
  initNavbarShadow();
  initScrollProgress();
  observeReveal('.auth-form, .checkout-form, .order-summary');
});
