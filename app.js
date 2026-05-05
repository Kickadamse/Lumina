// ── CONFIG ──
const ADMIN_EMAIL = 'kickadam00@gmail.com';

// ── EMAILJS CONFIG — fill these in ──
const EJS_PUBLIC_KEY  = 'YOUR_PUBLIC_KEY';   // EmailJS → Account → Public Key
const EJS_SERVICE_ID  = 'YOUR_SERVICE_ID';   // EmailJS → Email Services → Service ID
const EJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';  // EmailJS → Email Templates → Template ID

// ── COUNTRIES ──
const COUNTRIES = [
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'OTHER', name: 'Other', flag: '🌍' },
];

function getCountry(code) {
  return COUNTRIES.find(c => c.code === code) || { code, name: code, flag: '🌍' };
}

// ── STORAGE ──
let users   = JSON.parse(localStorage.getItem('lm_users')   || '[]');
let posts   = JSON.parse(localStorage.getItem('lm_posts')   || 'null');
let servers = JSON.parse(localStorage.getItem('lm_servers') || '[]');
let session = JSON.parse(localStorage.getItem('lm_session') || 'null');

function saveUsers()   { localStorage.setItem('lm_users',   JSON.stringify(users)); }
function savePosts()   { localStorage.setItem('lm_posts',   JSON.stringify(posts)); }
function saveServers() { localStorage.setItem('lm_servers', JSON.stringify(servers)); }

// Seed default posts
if (!posts) {
  posts = [
    {
      id: 1,
      title: 'Welcome to Lumina',
      category: 'general',
      excerpt: 'Lumina is your hub for FiveM news, server listings, and community updates.',
      body: 'Lumina is your hub for FiveM news, server listings, and community updates.\n\nBrowse the latest news from our editorial team, or head over to the FiveM Servers section to discover and list servers from around the world.\n\nWelcome to the community.',
      author: 'Admin',
      date: new Date().toISOString(),
      pinned: true
    }
  ];
  savePosts();
}

const isAdmin = () => session && session.email === ADMIN_EMAIL;

// ── TOAST ──
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

// ── AUTH ──
function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((b, i) =>
    b.classList.toggle('active', (i === 0) === (tab === 'login'))
  );
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
}

function login(e) {
  e.preventDefault();
  const email = document.getElementById('l-email').value.trim().toLowerCase();
  const pass  = document.getElementById('l-pass').value;
  const err   = document.getElementById('login-err');

  // Auto-create admin on first login
  if (email === ADMIN_EMAIL) {
    let admin = users.find(u => u.email === ADMIN_EMAIL);
    if (!admin) {
      admin = { name: 'Adam', email: ADMIN_EMAIL, password: pass };
      users.push(admin);
      saveUsers();
    } else if (admin.password !== pass) {
      showErr(err, 'Incorrect password.');
      return;
    }
    startSession(admin);
    return;
  }

  const user = users.find(u => u.email === email && u.password === pass);
  if (!user) { showErr(err, 'Invalid email or password.'); return; }
  err.classList.add('hidden');
  startSession(user);
}

function register(e) {
  e.preventDefault();
  const name  = document.getElementById('r-name').value.trim();
  const email = document.getElementById('r-email').value.trim().toLowerCase();
  const pass  = document.getElementById('r-pass').value;
  const err   = document.getElementById('register-err');

  if (users.find(u => u.email === email)) {
    showErr(err, 'An account with this email already exists.');
    return;
  }
  err.classList.add('hidden');
  const user = { name, email, password: pass };
  users.push(user);
  saveUsers();
  sendWelcomeMail(name, email, pass);
  startSession(user);
}

function showErr(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ── WELCOME EMAIL ──
function sendWelcomeMail(name, email, password) {
  if (EJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') return; // not configured yet
  emailjs.init(EJS_PUBLIC_KEY);
  emailjs.send(EJS_SERVICE_ID, EJS_TEMPLATE_ID, {
    to_email: email,
    to_name:  name,
    username: email,
    password: password,
  }).catch(err => console.warn('EmailJS error:', err));
}

function startSession(user) {
  session = user;
  localStorage.setItem('lm_session', JSON.stringify(user));
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('h-username').textContent = user.name || user.email;
  navigate('news');
}

function logout() {
  localStorage.removeItem('lm_session');
  location.reload();
}

// ── NAVIGATION ──
let currentPage = 'news';

function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.getAttribute('onclick').includes(`'${page}'`))
  );
  const main = document.getElementById('main');
  main.innerHTML = page === 'news' ? renderNews() : renderServers();
}

// ── HELPERS ──
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── NEWS ──
function renderNews() {
  const sorted = [...posts].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.date) - new Date(a.date);
  });

  const adminBar = isAdmin() ? `
    <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
      <button class="btn btn-neon" onclick="showPublish()">✏️ Publish Article</button>
    </div>` : '';

  const cards = sorted.length
    ? sorted.map(newsCard).join('')
    : '<div class="empty"><div class="empty-icon">📭</div><p>No articles yet.</p></div>';

  return `
    <div class="page-hdr">
      <div><h1>NEWS</h1><p>Latest updates and announcements</p></div>
      ${adminBar}
    </div>
    <div id="news-list">${cards}</div>
  `;
}

function newsCard(p) {
  const adminBtns = isAdmin()
    ? `<button class="btn btn-sm btn-purple" onclick="showEdit(${p.id})">✏️ Edit</button>
       <button class="btn btn-sm btn-danger" onclick="deletePost(${p.id})">🗑️ Delete</button>`
    : '';
  return `
    <div class="news-card">
      <div class="nc-top">
        <span class="nc-cat">${p.category}</span>
        ${p.pinned ? '<span class="nc-cat nc-pin">📌 Pinned</span>' : ''}
      </div>
      <div class="nc-title">${p.title}</div>
      <div class="nc-excerpt">${p.excerpt}</div>
      <div class="nc-meta"><span>By <strong>${p.author}</strong></span><span>${fmtDate(p.date)}</span></div>
      <div class="nc-actions">
        <button class="btn btn-neon btn-sm" onclick="readArticle(${p.id})">Read More</button>
        ${adminBtns}
      </div>
    </div>
  `;
}

function readArticle(id) {
  const p = posts.find(x => x.id === id);
  if (!p) return;
  const adminBtns = isAdmin()
    ? `<div style="display:flex;gap:0.5rem;margin-top:1.5rem">
        <button class="btn btn-purple btn-sm" onclick="showEdit(${p.id})">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deletePost(${p.id})">🗑️ Delete</button>
       </div>` : '';
  document.getElementById('main').innerHTML = `
    <button class="btn btn-sm" style="border:1px solid var(--border);color:var(--muted);margin-bottom:1.5rem" onclick="navigate('news')">← Back</button>
    <div class="article-full">
      <span class="nc-cat">${p.category}</span>
      <h1>${p.title}</h1>
      <div class="article-meta">
        <span>By <strong>${p.author}</strong></span>
        <span>${fmtDate(p.date)}</span>
      </div>
      <div class="article-body">${p.body.replace(/\n/g, '<br/>')}</div>
      ${adminBtns}
    </div>
  `;
}

function showPublish() {
  if (!isAdmin()) return;
  document.getElementById('main').innerHTML = `
    <button class="btn btn-sm" style="border:1px solid var(--border);color:var(--muted);margin-bottom:1.5rem" onclick="navigate('news')">← Back</button>
    <div class="page-hdr"><div><h1>PUBLISH ARTICLE</h1></div></div>
    <div class="form-card">
      <div class="fg"><label>Title</label><input id="p-title" placeholder="Article headline"/></div>
      <div class="fg"><label>Category</label>
        <select id="p-cat">
          <option value="general">General</option>
          <option value="update">Update</option>
          <option value="event">Event</option>
          <option value="announcement">Announcement</option>
        </select>
      </div>
      <div class="fg"><label>Excerpt</label><textarea id="p-excerpt" style="min-height:80px" placeholder="Short summary shown on the feed..."></textarea></div>
      <div class="fg"><label>Full Article</label><textarea id="p-body" placeholder="Write the full article here..."></textarea></div>
      <div class="fg"><div class="fg-check"><input type="checkbox" id="p-pin"/><label for="p-pin">📌 Pin to top</label></div></div>
      <button class="btn btn-neon" onclick="publishPost()">Publish</button>
    </div>
  `;
}

function publishPost() {
  const title   = document.getElementById('p-title').value.trim();
  const cat     = document.getElementById('p-cat').value;
  const excerpt = document.getElementById('p-excerpt').value.trim();
  const body    = document.getElementById('p-body').value.trim();
  const pinned  = document.getElementById('p-pin').checked;
  if (!title || !excerpt || !body) { toast('Please fill in all fields.'); return; }
  posts.unshift({ id: Date.now(), title, category: cat, excerpt, body, author: session.name || 'Admin', date: new Date().toISOString(), pinned });
  savePosts();
  toast('Article published!');
  navigate('news');
}

function showEdit(id) {
  if (!isAdmin()) return;
  const p = posts.find(x => x.id === id);
  if (!p) return;
  document.getElementById('main').innerHTML = `
    <button class="btn btn-sm" style="border:1px solid var(--border);color:var(--muted);margin-bottom:1.5rem" onclick="navigate('news')">← Back</button>
    <div class="page-hdr"><div><h1>EDIT ARTICLE</h1></div></div>
    <div class="form-card">
      <div class="fg"><label>Title</label><input id="e-title" value="${p.title.replace(/"/g,'&quot;')}"/></div>
      <div class="fg"><label>Category</label>
        <select id="e-cat">
          ${['general','update','event','announcement'].map(c=>`<option value="${c}"${c===p.category?' selected':''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('')}
        </select>
      </div>
      <div class="fg"><label>Excerpt</label><textarea id="e-excerpt" style="min-height:80px">${p.excerpt}</textarea></div>
      <div class="fg"><label>Full Article</label><textarea id="e-body">${p.body}</textarea></div>
      <div class="fg"><div class="fg-check"><input type="checkbox" id="e-pin" ${p.pinned?'checked':''}/><label for="e-pin">📌 Pin to top</label></div></div>
      <button class="btn btn-neon" onclick="saveEdit(${id})">Save Changes</button>
    </div>
  `;
}

function saveEdit(id) {
  const idx = posts.findIndex(x => x.id === id);
  if (idx === -1) return;
  posts[idx].title    = document.getElementById('e-title').value.trim();
  posts[idx].category = document.getElementById('e-cat').value;
  posts[idx].excerpt  = document.getElementById('e-excerpt').value.trim();
  posts[idx].body     = document.getElementById('e-body').value.trim();
  posts[idx].pinned   = document.getElementById('e-pin').checked;
  savePosts();
  toast('Article updated!');
  navigate('news');
}

function deletePost(id) {
  if (!confirm('Delete this article?')) return;
  posts = posts.filter(x => x.id !== id);
  savePosts();
  toast('Article deleted.');
  navigate('news');
}

// ── SERVERS ──
let serverFilter = 'ALL';

function renderServers() {
  const filtered = serverFilter === 'ALL'
    ? servers
    : servers.filter(s => s.country === serverFilter);

  const countryOptions = COUNTRIES.map(c =>
    `<option value="${c.code}" ${serverFilter === c.code ? 'selected' : ''}>${c.flag} ${c.name}</option>`
  ).join('');

  const cards = filtered.length
    ? `<div class="servers-grid">${filtered.map(serverCard).join('')}</div>`
    : '<div class="empty"><div class="empty-icon">🖥️</div><p>No servers found for this filter.</p></div>';

  return `
    <div class="page-hdr">
      <div><h1>FIVEM SERVERS</h1><p>${servers.length} server${servers.length !== 1 ? 's' : ''} listed</p></div>
      <button class="btn btn-purple" onclick="showAddServer()">+ Add Your Server</button>
    </div>
    <div class="filter-bar">
      <label>🌍 Filter by country:</label>
      <select class="filter-select" onchange="setFilter(this.value)">
        <option value="ALL" ${serverFilter === 'ALL' ? 'selected' : ''}>All Countries</option>
        ${countryOptions}
      </select>
      ${serverFilter !== 'ALL' ? `<button class="btn btn-sm" style="border:1px solid var(--border);color:var(--muted)" onclick="setFilter('ALL')">✕ Clear</button>` : ''}
    </div>
    ${cards}
  `;
}

function serverCard(s) {
  const c = getCountry(s.country);
  const adminBtn = isAdmin()
    ? `<button class="btn btn-sm btn-danger" onclick="deleteServer(${s.id})" style="margin-top:0.25rem">🗑️ Remove</button>`
    : '';
  return `
    <div class="server-card">
      <div class="sc-top">
        <div class="sc-name">${s.name}</div>
        <div class="sc-flag" title="${c.name}">${c.flag}</div>
      </div>
      <div>
        <span class="sc-country">${c.name}</span>
      </div>
      <div class="sc-owner">Added by ${s.owner}</div>
      <a class="sc-link" href="${s.link}" target="_blank" rel="noopener">🔗 Join Server</a>
      ${adminBtn}
    </div>
  `;
}

function setFilter(val) {
  serverFilter = val;
  document.getElementById('main').innerHTML = renderServers();
}

function showAddServer() {
  const countryOptions = COUNTRIES.map(c =>
    `<option value="${c.code}">${c.flag} ${c.name}</option>`
  ).join('');

  document.getElementById('main').innerHTML = `
    <button class="btn btn-sm" style="border:1px solid var(--border);color:var(--muted);margin-bottom:1.5rem" onclick="navigate('servers')">← Back</button>
    <div class="page-hdr"><div><h1>ADD YOUR SERVER</h1><p>List your FiveM server for the community</p></div></div>
    <div class="form-card" style="max-width:500px">
      <div class="fg"><label>Server Name</label><input id="sv-name" placeholder="My Awesome RP Server"/></div>
      <div class="fg"><label>Server Link / Connect URL</label><input id="sv-link" placeholder="https://cfx.re/join/xxxxxx or fivem://connect/..."/></div>
      <div class="fg"><label>Country</label>
        <select id="sv-country">${countryOptions}</select>
      </div>
      <button class="btn btn-purple" onclick="addServer()">Add Server</button>
    </div>
  `;
}

function addServer() {
  const name    = document.getElementById('sv-name').value.trim();
  const link    = document.getElementById('sv-link').value.trim();
  const country = document.getElementById('sv-country').value;

  if (!name || !link) { toast('Please fill in all fields.'); return; }

  // Basic URL check
  if (!link.startsWith('http') && !link.startsWith('fivem://')) {
    toast('Please enter a valid link.');
    return;
  }

  servers.push({
    id: Date.now(),
    name,
    link,
    country,
    owner: session.name || session.email,
    date: new Date().toISOString()
  });
  saveServers();
  toast('Server added!');
  navigate('servers');
}

function deleteServer(id) {
  if (!confirm('Remove this server?')) return;
  servers = servers.filter(s => s.id !== id);
  saveServers();
  toast('Server removed.');
  navigate('servers');
}

// ── BOOT ──
window.addEventListener('DOMContentLoaded', () => {
  if (session) {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('h-username').textContent = session.name || session.email;
    navigate('news');
  }
});
