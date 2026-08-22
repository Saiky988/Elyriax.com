const Splash = {
  minDuration: 900,
  maxTimeout: 5000,

  hide() {
    const splash = document.getElementById('splash-screen');
    if (!splash || splash.classList.contains('hide')) return;
    
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 300);
  },

  async wait(tasks = []) {
    const minTimer = new Promise(res => setTimeout(res, this.minDuration));

    const domReady = new Promise(res => {
      if (document.readyState === 'interactive' || document.readyState === 'complete') {
        res();
      } else {
        document.addEventListener('DOMContentLoaded', res, { once: true });
      }
    });

    const safetyTimer = setTimeout(() => this.hide(), this.maxTimeout);

    try {
      await Promise.allSettled([minTimer, domReady, ...tasks]);
    } finally {
      clearTimeout(safetyTimer);
      this.hide();
    }
  }
};

/* ============ STATE (in-memory & synced with localStorage) ============ */
const Sayraa = {
  user: null, // {name, email, avatar, providers:[], token}
  devMode: false,
  accent: '#7c6ff0',
  currentRoute: 'dashboard',
  marketCategory: 'All',
  marketSearch: '',
};

const ACCENTS = ['#7c6ff0','#34d6b4','#f5a623','#f4586b','#5aa7ef'];
const OAUTH_BASE = 'https://api.elyriax.com/v1/auth';
const SETTINGS_BASE = 'https://api.elyriax.com/v1/settings';

const MODULES = [
  { id:'auth', route:'settings', name:'Authentication', icon:'fa-fingerprint', color:'#7c6ff0', live:true, desc:'OAuth login & account linking across providers.', activity:'Ready — synced' },
  { id:'genshin', route:'genshin', name:'Genshin Impact', icon:'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://genshin.hoyoverse.com&size=256', color:'#f5a623', live:true, desc:'Banners, codes, check-in & role stats.', activity:'Banner data synced 2m ago' },

  { id:'mail', route:'mail', name:'Mail', icon:'fa-plug', color:'#34d6b4', live:false, desc:'Test and explore Sayraa endpoints.', activity:'In development' },

  { id:'downloader', route:'downloader', name:'Downloader', icon:'fa-download', color:'#5aa7ef', live:false, desc:'Save video & audio from any link.', activity:'In development' },
  { id:'apis', route:'apis', name:'Developer API', icon:'fa-plug', color:'#34d6b4', live:false, desc:'Test and explore Sayraa endpoints.', activity:'In development' },
  { id:'translation', route:'translation', name:'Translation', icon:'fa-language', color:'#f4586b', live:false, desc:'Translate text across 40+ languages.', activity:'In development' },
  { id:'ai', route:'ai', name:'AI Tools', icon:'fa-sparkles', color:'#c99a5b', live:false, desc:'Chat, summarize and generate with AI.', activity:'In development' },
  { id:'image', route:'image', name:'Image Tools', icon:'fa-image', color:'#8b9a68', live:false, desc:'Compress, convert and edit images.', activity:'In development' },
];

const GAME_LIST = [
  { id:'genshin', route:'genshin', name:'Genshin Impact', desc:'Open-world action RPG across Teyvat.', icon:'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://genshin.hoyoverse.com&size=256', color:'#f5a623', banner:'linear-gradient(135deg, rgba(245,166,35,.55), rgba(124,111,240,.35))', live:true },
  { id:'hsr', route:'hsr', name:'Honkai: Star Rail', desc:'Turn-based RPG aboard the Astral Express.', icon:'fa-train', color:'#5aa7ef', banner:'linear-gradient(135deg, rgba(90,167,239,.55), rgba(52,214,180,.35))', live:false },
  { id:'zzz', route:'zzz', name:'Zenless Zone Zero', desc:'Urban action RPG in New Eridu.', icon:'fa-bolt-lightning', color:'#f4586b', banner:'linear-gradient(135deg, rgba(244,88,107,.55), rgba(124,111,240,.35))', live:false },
  { id:'wuwa', route:'wuwa', name:'Wuthering Waves', desc:'Open-world action RPG on the Solaris-3.', icon:'fa-wind', color:'#34d6b4', banner:'linear-gradient(135deg, rgba(52,214,180,.55), rgba(90,167,239,.35))', live:false },
];
const TAB_GROUP = { genshin:'games', hsr:'games', zzz:'games', wuwa:'games' };

/* ============ ROUTER & UI ============ */
function openDrawer(){ document.getElementById('drawer').classList.add('open'); document.getElementById('drawer-overlay').classList.add('open'); }
function closeDrawer(){ document.getElementById('drawer').classList.remove('open'); document.getElementById('drawer-overlay').classList.remove('open'); }
function toggleGroup(el){ el.parentElement.classList.toggle('open'); }

const ROUTE_META = {
  dashboard:{title:'Dashboard', sub:'All systems operational'},
  games:{title:'Game Dashboard', sub:'4 titles integrated'},
  genshin:{title:'Genshin Impact', sub:'2 endpoints synced'},
  hsr:{title:'Honkai Star Rail', sub:'Coming soon'},
  zzz:{title:'Zenless Zone Zero', sub:'Coming soon'},
  wuwa:{title:'Wuthering Waves', sub:'Coming soon'},
  markets:{title:'Markets', sub:'8 products listed'},
  mail:{title:'Mail', sub:'Coming soon'},
  downloader:{title:'Downloader', sub:'Coming soon'},
  apis:{title:'Developer APIs', sub:'Coming soon'},
  translation:{title:'Translation', sub:'Coming soon'},
  ai:{title:'AI Tools', sub:'Coming soon'},
  image:{title:'Image Tools', sub:'Coming soon'},
  settings:{title:'Settings', sub:'Manage your account'},
};

function navigate(route){
  closeSheet();
  if(window.location.hash !== `#${route}`) { window.location.hash = route; return; }
  renderView(route);
}

function renderView(route) {
  Sayraa.currentRoute = route;
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active', v.dataset.view===route));
  document.querySelectorAll('.nav-link,.nav-sub').forEach(l=>l.classList.toggle('active', l.dataset.route===route));
  const tabRoute = TAB_GROUP[route] || route;
  document.querySelectorAll('.tab-btn').forEach(l=>l.classList.toggle('active', l.dataset.route===tabRoute));
  const meta = ROUTE_META[route] || {title:route, sub:''};
  document.getElementById('topbar-title').textContent = meta.title;
  document.getElementById('topbar-sub').textContent = meta.sub;
  closeDrawer();
  window.scrollTo({top:0, behavior:'smooth'});
  const soonSection = document.querySelector(`section[data-view="${route}"][data-icon]`);
  if(soonSection && !soonSection.dataset.rendered) renderComingSoon(soonSection);
}

window.addEventListener('hashchange', () => {
  const route = window.location.hash.replace('#', '') || 'dashboard';
  if(ROUTE_META[route]) renderView(route); else window.location.hash = 'dashboard';
});

function renderComingSoon(section){
  section.dataset.rendered = '1';
  section.innerHTML = `
    <div class="flex items-center gap-3 mb-6">
      <div class="icon-tile" style="background:rgba(124,111,240,.12); color:var(--accent)"><i class="fa-solid ${section.dataset.icon}"></i></div>
      <div>
        <h1 class="display text-[21px] font-extrabold">${section.dataset.title}</h1>
        <p class="text-[12.5px]" style="color:var(--text-dim)">This module is being built</p>
      </div>
    </div>
    <div class="glass card p-8 text-center">
      <div class="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4" style="background:rgba(255,255,255,.05)">
        <i class="fa-solid fa-hammer text-[20px]" style="color:var(--text-dim)"></i>
      </div>
      <h3 class="display font-bold text-[16px] mb-1.5">${section.dataset.title} is on the way</h3>
      <p class="text-[13px] max-w-sm mx-auto mb-5" style="color:var(--text-dim)">We're building this module, stay tuned.</p>
      <button class="btn btn-primary" onclick="notifyMe('${section.dataset.title}')"><i class="fa-regular fa-bell"></i> Notify me at launch</button>
    </div>`;
}

function notifyMe(name){ showToast('success', `You'll be notified when ${name} launches`); }

function showToast(type, msg){
  const icons = {success:'fa-circle-check', error:'fa-circle-exclamation', info:'fa-circle-info'};
  const colors = {success:'var(--teal)', error:'var(--rose)', info:'var(--accent)'};
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<i class="fa-solid ${icons[type]||icons.info}" style="color:${colors[type]||colors.info}"></i><span>${msg}</span>`;
  document.getElementById('toast-wrap').appendChild(el);
  setTimeout(()=>{ el.style.transition='opacity .3s ease, transform .3s ease'; el.style.opacity='0'; el.style.transform='translateY(-8px)'; setTimeout(()=>el.remove(), 300); }, 2600);
}

function openSheet(html){
  document.getElementById('sheet-content').innerHTML = html;
  document.getElementById('sheet').classList.add('open');
  document.getElementById('sheet-overlay').classList.add('open');
}
function closeSheet(){
  document.getElementById('sheet').classList.remove('open');
  document.getElementById('sheet-overlay').classList.remove('open');
}

function renderDashboard(){
  const grid = document.getElementById('dashboard-grid');
  grid.innerHTML = MODULES.map(m => {
    const isUrl = m.icon.startsWith('http');
    const iconContent = isUrl ? `<img src="${m.icon}" alt="${m.name}" class="w-6 h-6 object-contain" />` : `<i class="fa-solid ${m.icon}"></i>`;
    return `
    <div class="glass module-card card p-4 cursor-pointer" onclick="navigate('${m.route}')">
      <div class="flex items-start gap-3.5">
        <div class="icon-tile" style="background:${m.color}22; color:${m.color}">${iconContent}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2"><h3 class="font-semibold text-[14.5px]">${m.name}</h3><span class="status-dot ${m.live?'on':'soon'}"></span></div>
          <p class="text-[12px] mt-0.5" style="color:var(--text-dim)">${m.desc}</p>
          <div class="flex items-center justify-between mt-3">
            <span class="text-[11px] mono" style="color:var(--text-faint)">${m.activity}</span>
            <span class="text-[12px] font-semibold" style="color:${m.live?m.color:'var(--text-faint)'}">${m.live?'Open':'Soon'} <i class="fa-solid fa-chevron-right text-[9px] ml-0.5"></i></span>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderGamesDashboard(){
  const grid = document.getElementById('games-grid');
  grid.innerHTML = GAME_LIST.map(g => {
    const iconContent = g.icon.startsWith('http') ? `<img src="${g.icon}" alt="${g.name}" class="w-6 h-6 object-contain" />` : `<i class="fa-solid ${g.icon}"></i>`;
    return `
    <div class="glass module-card game-card card cursor-pointer" onclick="navigate('${g.route}')">
      <div class="game-banner" style="background:${g.banner}"></div>
      <div class="p-4">
        <div class="flex items-start gap-3.5">
          <div class="icon-tile" style="background:${g.color}22; color:${g.color}">${iconContent}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2"><h3 class="font-semibold text-[14.5px]">${g.name}</h3><span class="status-dot ${g.live?'on':'soon'}"></span></div>
            <p class="text-[12px] mt-0.5" style="color:var(--text-dim)">${g.desc}</p>
            <div class="flex items-center justify-between mt-3">
              <span class="pill" style="background:${g.live?'rgba(52,214,180,.14)':'rgba(255,255,255,.06)'}; color:${g.live?'var(--teal)':'var(--text-faint)'}">${g.live?'Available':'Coming soon'}</span>
              <span class="text-[12px] font-semibold arrow-indicator" style="color:${g.color}">Enter <i class="fa-solid fa-chevron-right text-[9px] ml-0.5"></i></span>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ============ MARKETS (mock) ============ */
const MARKET_PRODUCTS = [
  { id:'gdl12h', name:'Google Domain Account 12h', shortDescription:'Live Google account with domain access, 12h warranty.', description:'High-quality Google account registered on custom domain. Perfect for development and testing. 12-hour replacement warranty included.', category:'Accounts', icon:'fa-brands fa-google', color:'#ea4335', price:'$0.01', numericPrice:0.01, stock:'Infinite', rating:4.8, reviews:124, featured:true, badge:'Best Seller', tags:['google','domain','dev'], delivery:'Instant', variants:[{id:'12h',name:'12 Hours',price:0.01},{id:'24h',name:'24 Hours',price:0.02}] },
  { id:'gdl10m', name:'Google Domain Account 10m', shortDescription:'Short-term Google account for quick tasks.', description:'Disposable Google account with domain access. Ideal for one-time use or short-lived automation. 10-minute active window.', category:'Accounts', icon:'fa-solid fa-graduation-cap', color:'#5aa7ef', price:'$0.005', numericPrice:0.005, stock:42, rating:4.6, reviews:89, featured:true, badge:null, tags:['google','temp','dev'], delivery:'Instant', variants:[{id:'10m',name:'10 Minutes',price:0.005}] },
  { id:'outlook', name:'Outlook Account', shortDescription:'Fresh Outlook / Hotmail account.', description:'Verified Outlook account ready to use. Clean IP history, fully unlocked. Suitable for personal or business registration.', category:'Accounts', icon:'fa-brands fa-microsoft', color:'#00a4ef', price:'$1.29', numericPrice:1.29, stock:310, rating:4.5, reviews:256, featured:false, badge:null, tags:['microsoft','email','fresh'], delivery:'Instant', variants:[] },
  { id:'proton', name:'Proton Mail Plus', shortDescription:'Secure encrypted email account.', description:'Proton Mail Plus account with premium features. End-to-end encryption, custom domains, and priority support.', category:'Email', icon:'fa-solid fa-shield-halved', color:'#6d4aff', price:'$3.99', numericPrice:3.99, stock:76, rating:4.9, reviews:412, featured:true, badge:'Top Rated', tags:['privacy','encrypted','secure'], delivery:'Instant', variants:[{id:'1m',name:'1 Month',price:3.99},{id:'1y',name:'1 Year',price:29.99}] },
  { id:'tempmail', name:'Temporary Email', shortDescription:'Instant disposable inbox.', description:'One-click temporary email address. No registration required. Auto-expires after 24 hours. Perfect for sign-up verification.', category:'Email', icon:'fa-solid fa-inbox', color:'#34d6b4', price:'Free', numericPrice:0, stock:999, rating:4.2, reviews:1034, featured:false, badge:null, tags:['temp','disposable','free'], delivery:'Instant', variants:[] },
  { id:'openai', name:'OpenAI API Key', shortDescription:'Ready-to-use OpenAI API credit.', description:'Pre-loaded OpenAI API key with active billing. Use for ChatGPT, GPT-4, DALL·E, and Whisper integrations.', category:'API Keys', icon:'fa-solid fa-brain', color:'#10a37f', price:'$9.99', numericPrice:9.99, stock:54, rating:4.7, reviews:178, featured:false, badge:null, tags:['openai','gpt','ai'], delivery:'Instant', variants:[{id:'5',name:'$5 Credit',price:5.99},{id:'10',name:'$10 Credit',price:9.99},{id:'25',name:'$25 Credit',price:19.99}] },
  { id:'gemini', name:'Gemini API Key', shortDescription:'Google Gemini API access.', description:'Google Gemini API key with quota available. Supports Gemini 1.5 Pro and Flash models. Great for AI-powered apps.', category:'API Keys', icon:'fa-solid fa-star', color:'#8b7ff5', price:'$8.49', numericPrice:8.49, stock:61, rating:4.6, reviews:134, featured:false, badge:null, tags:['google','gemini','ai'], delivery:'Instant', variants:[{id:'std',name:'Standard',price:8.49},{id:'pro',name:'Pro',price:14.99}] },
  { id:'claude', name:'Claude API Key', shortDescription:'Anthropic Claude API access.', description:'Anthropic Claude API key with usage quota. Claude 3.5 Sonnet and Opus ready. High-quality reasoning model.', category:'API Keys', icon:'fa-solid fa-comment-dots', color:'#c99a5b', price:'$11.99', numericPrice:11.99, stock:38, rating:4.9, reviews:95, featured:true, badge:'Hot', tags:['anthropic','claude','ai'], delivery:'Instant', variants:[{id:'std',name:'Standard',price:11.99}] },
  { id:'netflix', name:'Netflix Premium 1m', shortDescription:'1-month Netflix Premium shared.', description:'Netflix Premium (UHD) shared profile. 1-month warranty. Works on TV, mobile, and browser. Global catalog.', category:'Services', icon:'fa-solid fa-film', color:'#e50914', price:'$4.99', numericPrice:4.99, stock:120, rating:4.4, reviews:567, featured:false, badge:null, tags:['streaming','video','entertainment'], delivery:'5 min', variants:[{id:'1m',name:'1 Month',price:4.99},{id:'3m',name:'3 Months',price:12.99}] },
  { id:'spotify', name:'Spotify Premium 1m', shortDescription:'1-month Spotify Premium.', description:'Spotify Premium individual plan. No ads, offline downloads, and high-quality audio. 1-month guaranteed.', category:'Services', icon:'fa-brands fa-spotify', color:'#1db954', price:'$2.99', numericPrice:2.99, stock:200, rating:4.5, reviews:423, featured:false, badge:null, tags:['music','streaming','audio'], delivery:'5 min', variants:[{id:'1m',name:'1 Month',price:2.99},{id:'3m',name:'3 Months',price:7.99}] },
  { id:'canva', name:'Canva Pro 1y', shortDescription:'1-year Canva Pro subscription.', description:'Canva Pro team invite. Full access to premium templates, Brand Kit, Background Remover, and Magic Resize.', category:'Services', icon:'fa-solid fa-palette', color:'#00c4cc', price:'$9.99', numericPrice:9.99, stock:45, rating:4.7, reviews:312, featured:false, badge:null, tags:['design','graphics','tool'], delivery:'10 min', variants:[{id:'1y',name:'1 Year',price:9.99}] },
  { id:'chatgpt', name:'ChatGPT Plus 1m', shortDescription:'1-month ChatGPT Plus.', description:'ChatGPT Plus subscription. GPT-4 access, faster response, plugins, and browsing. Delivered via account upgrade or gift.', category:'Services', icon:'fa-solid fa-robot', color:'#10a37f', price:'$5.99', numericPrice:5.99, stock:88, rating:4.6, reviews:289, featured:true, badge:'Popular', tags:['ai','chatgpt','gpt4'], delivery:'10 min', variants:[{id:'1m',name:'1 Month',price:5.99}] },
  { id:'tempmailapi', name:'Temp Mail API', shortDescription:'API for disposable email.', description:'Developer API for temporary email generation. RESTful endpoints, webhooks, and high delivery rate. Perfect for QA.', category:'API Keys', icon:'fa-solid fa-envelope-open-text', color:'#34d6b4', price:'$1.49', numericPrice:1.49, stock:999, rating:4.3, reviews:76, featured:false, badge:null, tags:['api','email','dev'], delivery:'Instant', variants:[{id:'1k',name:'1K requests',price:1.49},{id:'10k',name:'10K requests',price:9.99}] },
  { id:'edumail', name:'Edu Mail Account', shortDescription:'Student email with benefits.', description:'Valid .edu email address. Unlocks student discounts (GitHub Student, AWS Educate, JetBrains, etc.).', category:'Email', icon:'fa-solid fa-school', color:'#f5a623', price:'$2.49', numericPrice:2.49, stock:34, rating:4.5, reviews:198, featured:false, badge:null, tags:['student','edu','discount'], delivery:'30 min', variants:[] },
  { id:'workspace', name:'Google Workspace', shortDescription:'Business Google account.', description:'Google Workspace Business Starter account. Custom domain, 30 GB cloud storage, and admin panel access.', category:'Accounts', icon:'fa-brands fa-google', color:'#ea4335', price:'$3.99', numericPrice:3.99, stock:12, rating:4.6, reviews:45, featured:false, badge:null, tags:['google','business','cloud'], delivery:'15 min', variants:[{id:'starter',name:'Starter',price:3.99},{id:'std',name:'Standard',price:7.99}] }
];

const MARKET_STATE = { category: 'All', search: '', loading: false };
let MARKET_CART = [];
let MARKET_WISHLIST = [];
let MARKET_ORDERS = [];

function loadMarketState(){
  try{
    MARKET_CART = JSON.parse(localStorage.getItem('sayraa_market_cart')) || [];
    MARKET_WISHLIST = JSON.parse(localStorage.getItem('sayraa_market_wishlist')) || [];
    MARKET_ORDERS = JSON.parse(localStorage.getItem('sayraa_market_orders')) || [];
  }catch(e){}
}
function saveMarketState(){
  try{
    localStorage.setItem('sayraa_market_cart', JSON.stringify(MARKET_CART));
    localStorage.setItem('sayraa_market_wishlist', JSON.stringify(MARKET_WISHLIST));
    localStorage.setItem('sayraa_market_orders', JSON.stringify(MARKET_ORDERS));
  }catch(e){}
}
function formatMarketPrice(n){
  if(n===0||n===undefined||n===null) return 'Free';
  return '$' + n.toFixed(n < 0.01 ? 3 : 2);
}

function marketEmptyHTML(type){
  const map = {
    search:{i:'fa-magnifying-glass',t:'No products found',m:'Try another search or category.',a:'<button class="btn btn-ghost btn-sm mt-4" onclick="clearMarketFilters()">Clear filters</button>'},
    cart:{i:'fa-cart-shopping',t:'Your cart is empty',m:'Browse the market and add some items.',a:'<button class="btn btn-primary btn-sm mt-4" onclick="closeSheet()">Start Shopping</button>'},
    wishlist:{i:'fa-heart',t:'Your wishlist is empty',m:'Save items you like for later.',a:'<button class="btn btn-primary btn-sm mt-4" onclick="closeSheet()">Browse Products</button>'},
    orders:{i:'fa-receipt',t:'No orders yet',m:'Your completed orders will appear here.',a:'<button class="btn btn-primary btn-sm mt-4" onclick="closeSheet()">Start Shopping</button>'}
  };
  const x = map[type] || map.search;
  return `<div class="col-span-full market-empty"><div class="market-empty-icon"><i class="fa-solid ${x.i} text-[22px]" style="color:var(--text-faint)"></i></div><h3 class="font-semibold text-[15px] mb-1">${x.t}</h3><p class="text-[13px]" style="color:var(--text-dim)">${x.m}</p>${x.a}</div>`;
}

function showMarketSkeleton(){
  const sk = `<div class="glass module-card card p-4"><div class="flex items-start gap-3.5 mb-4"><div class="skel w-11 h-11 rounded-xl"></div><div class="flex-1 space-y-2"><div class="skel h-4 w-3/4"></div><div class="skel h-3 w-1/2"></div><div class="skel h-3 w-full"></div></div></div><div class="skel h-8 w-20 ml-auto"></div></div>`;
  const grid = `<div class="grid sm:grid-cols-2 gap-3 col-span-full w-full">${sk}${sk}${sk}${sk}</div>`;
  document.getElementById('market-grid').innerHTML = grid;
  document.getElementById('market-featured').innerHTML = grid;
}

function clearMarketFilters(){
  MARKET_STATE.category = 'All';
  MARKET_STATE.search = '';
  const el = document.getElementById('market-search');
  if(el) el.value = '';
  renderMarketCategories();
  renderMarketFeatured();
  renderMarketGrid();
}

let marketSearchTimer = null;
function searchMarkets(q){
  clearTimeout(marketSearchTimer);
  marketSearchTimer = setTimeout(()=>{
    MARKET_STATE.search = q.toLowerCase().trim();
    renderMarketGrid();
  }, 250);
}

function getFilteredProducts(){
  return MARKET_PRODUCTS.filter(p=>{
    const mc = MARKET_STATE.category === 'All' || p.category === MARKET_STATE.category;
    const q = MARKET_STATE.search;
    if(!q) return mc;
    const hay = (p.name+' '+p.shortDescription+' '+p.description+' '+p.category+' '+p.tags.join(' ')).toLowerCase();
    return mc && hay.includes(q);
  });
}

function initMarkets(){
  loadMarketState();
  showMarketSkeleton();
  setTimeout(()=>{
    renderMarketCategories();
    renderMarketFeatured();
    renderMarketGrid();
    updateCartBadge();
  }, 400);
}

function renderMarketCategories(){
  const cats = ['All', ...new Set(MARKET_PRODUCTS.map(p=>p.category))];
  document.getElementById('market-chips').innerHTML = cats.map(c=>
    `<button class="tab-pill ${c===MARKET_STATE.category?'active':''}" onclick="filterMarkets('${c}', this)">${c}</button>`
  ).join('');
}
function filterMarkets(cat, el){
  MARKET_STATE.category = cat;
  document.querySelectorAll('#market-chips .tab-pill').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  renderMarketFeatured();
  renderMarketGrid();
}

function renderMarketFeatured(){
  const f = MARKET_PRODUCTS.filter(p=>p.featured);
  document.getElementById('market-featured').innerHTML = f.length ? f.map(productCard).join('') : marketEmptyHTML('search');
}

function renderMarketGrid(){
  const filtered = getFilteredProducts();
  document.getElementById('market-grid').innerHTML = filtered.length ? filtered.map(productCard).join('') : marketEmptyHTML('search');
  document.getElementById('market-count').textContent = `${filtered.length} items`;
}

function productCard(p){
  const isW = MARKET_WISHLIST.includes(p.id);
  const oos = p.stock === 0 || p.stock === '0';
  return `
  <div class="glass module-card card p-4 cursor-pointer relative" onclick="openProductDetail('${p.id}')">
    <button class="wishlist-btn ${isW?'on':''}" onclick="event.stopPropagation(); toggleWishlist('${p.id}')" title="Wishlist"><i class="${isW?'fa-solid':'fa-regular'} fa-heart"></i></button>
    <div class="flex items-start gap-3.5">
      <div class="icon-tile" style="background:${p.color}22; color:${p.color}"><i class="${p.icon}"></i></div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <h3 class="font-semibold text-[13.5px] truncate">${p.name}</h3>
          ${p.badge?`<span class="pill" style="background:rgba(245,166,35,.14); color:var(--amber)">${p.badge}</span>`:''}
          ${p.featured&&!p.badge?`<span class="pill" style="background:rgba(52,214,180,.14); color:var(--teal)">Featured</span>`:''}
        </div>
        <div class="text-[11px] mt-0.5" style="color:var(--text-faint)">${p.category} · <i class="fa-solid fa-star" style="color:var(--amber)"></i> ${p.rating} <span style="color:var(--text-faint)">(${p.reviews})</span></div>
        <p class="text-[12px] mt-1 line-clamp-2" style="color:var(--text-dim)">${p.shortDescription}</p>
        <div class="flex items-center gap-1.5 mt-2 text-[11px]" style="color:var(--text-faint)"><i class="fa-solid fa-bolt" style="color:var(--teal); font-size:10px"></i> ${p.delivery}</div>
      </div>
    </div>
    <div class="flex items-center justify-between mt-4">
      <div>
        <div class="font-bold text-[15px] mono">${p.price}</div>
        <div class="text-[10.5px] ${oos?'text-[var(--rose)]':''}" style="color:var(--text-faint)">${oos?'Out of stock':p.stock+' in stock'}</div>
      </div>
      <button class="btn btn-primary btn-sm ${oos?'opacity-50 cursor-not-allowed':''}" onclick="event.stopPropagation(); ${oos?'':`quickAddToCart('${p.id}')`}" ${oos?'disabled':''}>${oos?'Unavailable':'Add'}</button>
    </div>
  </div>`;
}

function openProductDetail(id){
  const p = MARKET_PRODUCTS.find(x=>x.id===id);
  if(!p) return;
  const isW = MARKET_WISHLIST.includes(id);
  const oos = p.stock === 0 || p.stock === '0';
  const hasV = p.variants && p.variants.length > 0;
  let vHTML = '';
  if(hasV){
    vHTML = `<div class="mb-4"><div class="text-[12px] mb-2" style="color:var(--text-dim)">Select variant</div><div class="flex flex-wrap gap-2">`+
      p.variants.map((v,idx)=>`<button class="variant-chip ${idx===0?'active':''}" data-vid="${v.id}" onclick="selectVariant(this,'${v.id}',${v.price})">${v.name} — ${formatMarketPrice(v.price)}</button>`).join('')+
    `</div></div>`;
  }
  openSheet(`
    <div class="flex items-start gap-3.5 mb-4">
      <div class="icon-tile" style="background:${p.color}22; color:${p.color}"><i class="${p.icon} text-[20px]"></i></div>
      <div class="flex-1 min-w-0">
        <h3 class="display font-bold text-[17px]">${p.name}</h3>
        <div class="text-[12px] mt-0.5" style="color:var(--text-faint)">${p.category} · <i class="fa-solid fa-star" style="color:var(--amber)"></i> ${p.rating} · ${p.reviews} reviews</div>
      </div>
      <button class="wishlist-btn wishlist-btn-lg ${isW?'on':''}" onclick="toggleWishlist('${p.id}'); this.classList.toggle('on'); const ic=this.querySelector('i'); ic.className='${isW?'fa-regular':'fa-solid'} fa-heart'" title="Wishlist"><i class="${isW?'fa-solid':'fa-regular'} fa-heart"></i></button>
    </div>
    <p class="text-[13px] mb-4" style="color:var(--text-dim)">${p.description}</p>
    <div class="flex flex-wrap gap-1.5 mb-4">${p.tags.map(t=>`<span class="pill" style="background:rgba(255,255,255,.06); color:var(--text-dim)">${t}</span>`).join('')}</div>
    <div class="flex items-center gap-4 mb-4 text-[12px]" style="color:var(--text-faint)">
      <span><i class="fa-solid fa-box" style="color:var(--accent)"></i> ${oos?'<span style="color:var(--rose)">Out of stock</span>':p.stock+' in stock'}</span>
      <span><i class="fa-solid fa-bolt" style="color:var(--teal)"></i> ${p.delivery}</span>
    </div>
    ${vHTML}
    <div class="flex items-center justify-between mb-5">
      <div>
        <div class="text-[12px]" style="color:var(--text-dim)">Quantity</div>
        <div class="quantity-control mt-1.5">
          <button onclick="adjustDetailQty(-1)" ${oos?'disabled':''}>-</button>
          <span id="detail-qty">1</span>
          <button onclick="adjustDetailQty(1)" ${oos?'disabled':''}>+</button>
        </div>
      </div>
      <div class="text-right">
        <div class="text-[12px]" style="color:var(--text-dim)">Total</div>
        <div class="font-bold text-[18px] mono" id="detail-total">${p.price}</div>
      </div>
    </div>
    <div class="flex gap-2.5">
      <button class="btn btn-ghost flex-1" onclick="closeSheet()">Close</button>
      <button class="btn btn-primary flex-1 ${oos?'opacity-50 cursor-not-allowed':''}" onclick="${oos?'':`confirmAddToCart('${p.id}')`}" ${oos?'disabled':''}>${oos?'Out of Stock':'Add to Cart'}</button>
    </div>
    ${!oos?`<button class="btn btn-primary w-full mt-2.5" style="background:linear-gradient(180deg,var(--teal),#2bb89a)" onclick="buyNow('${p.id}')"><i class="fa-solid fa-bolt"></i> Buy Now</button>`:''}
  `);
  window._detailProduct = p;
  window._detailVariant = hasV ? p.variants[0] : null;
  window._detailQty = 1;
}
function selectVariant(btn,vid,price){
  document.querySelectorAll('.variant-chip').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  window._detailVariant = window._detailProduct.variants.find(v=>v.id===vid);
  updateDetailTotal();
}
function adjustDetailQty(delta){
  if(!window._detailProduct) return;
  const max = typeof window._detailProduct.stock === 'number' ? window._detailProduct.stock : 999;
  window._detailQty = Math.max(1, Math.min(max, window._detailQty + delta));
  const el = document.getElementById('detail-qty');
  if(el) el.textContent = window._detailQty;
  updateDetailTotal();
}
function updateDetailTotal(){
  const p = window._detailProduct;
  const v = window._detailVariant;
  const price = v ? v.price : p.numericPrice;
  const el = document.getElementById('detail-total');
  if(el) el.textContent = formatMarketPrice(price * window._detailQty);
}
function confirmAddToCart(id){
  addToCart(id, window._detailVariant ? window._detailVariant.id : null, window._detailQty);
  closeSheet();
}
function buyNow(id){
  confirmAddToCart(id);
  openCheckout();
}
function quickAddToCart(id){
  addToCart(id, null, 1);
}

function addToCart(id, variantId, qty){
  const p = MARKET_PRODUCTS.find(x=>x.id===id);
  if(!p) return;
  const ex = MARKET_CART.find(i=>i.productId===id && i.variantId===variantId);
  if(ex) ex.quantity += qty;
  else MARKET_CART.push({productId:id, variantId:variantId, quantity:qty, addedAt:Date.now()});
  saveMarketState();
  updateCartBadge();
  showToast('success', `${p.name} added to cart`);
}
function removeFromCart(id, variantId){
  MARKET_CART = MARKET_CART.filter(i=>!(i.productId===id && i.variantId===variantId));
  saveMarketState();
  updateCartBadge();
  renderCart();
}
function updateCartQuantity(id, variantId, delta){
  const item = MARKET_CART.find(i=>i.productId===id && i.variantId===variantId);
  if(!item) return;
  item.quantity = Math.max(1, item.quantity + delta);
  saveMarketState();
  renderCart();
}
function getCartTotal(){
  return MARKET_CART.reduce((sum,item)=>{
    const p = MARKET_PRODUCTS.find(x=>x.id===item.productId);
    if(!p) return sum;
    const price = item.variantId ? (p.variants.find(v=>v.id===item.variantId)?.price || p.numericPrice) : p.numericPrice;
    return sum + (price * item.quantity);
  },0);
}
function updateCartBadge(){
  const badge = document.getElementById('cart-badge');
  const count = MARKET_CART.reduce((a,b)=>a+b.quantity,0);
  if(badge){
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}
function openCart(){ renderCart(); }
function renderCart(){
  if(MARKET_CART.length===0){
    openSheet(`<h3 class="display font-bold text-[17px] mb-1">Your Cart</h3>${marketEmptyHTML('cart')}`);
    return;
  }
  const items = MARKET_CART.map(item=>{
    const p = MARKET_PRODUCTS.find(x=>x.id===item.productId);
    if(!p) return '';
    const v = item.variantId ? p.variants.find(x=>x.id===item.variantId) : null;
    const price = v ? v.price : p.numericPrice;
    const tot = price * item.quantity;
    return `
      <div class="flex items-center gap-3 py-3 border-b" style="border-color:var(--line)">
        <div class="icon-tile" style="background:${p.color}22; color:${p.color}"><i class="${p.icon}"></i></div>
        <div class="flex-1 min-w-0">
          <div class="text-[13px] font-medium truncate">${p.name}</div>
          <div class="text-[11px]" style="color:var(--text-faint)">${v?v.name:'Standard'} · ${formatMarketPrice(price)}</div>
        </div>
        <div class="quantity-control">
          <button onclick="updateCartQuantity('${item.productId}','${item.variantId||''}',-1)">-</button>
          <span>${item.quantity}</span>
          <button onclick="updateCartQuantity('${item.productId}','${item.variantId||''}',1)">+</button>
        </div>
        <div class="text-[13px] font-semibold mono w-16 text-right">${formatMarketPrice(tot)}</div>
        <button onclick="removeFromCart('${item.productId}','${item.variantId||''}')" class="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 text-[var(--rose)]"><i class="fa-solid fa-trash text-[11px]"></i></button>
      </div>`;
  }).join('');
  const sub = getCartTotal();
  openSheet(`
    <h3 class="display font-bold text-[17px] mb-4">Your Cart (${MARKET_CART.reduce((a,b)=>a+b.quantity,0)})</h3>
    <div class="max-h-[50vh] overflow-y-auto mb-4">${items}</div>
    <div class="border-t pt-4 mb-4" style="border-color:var(--line)">
      <div class="flex items-center justify-between text-[13px] mb-1"><span style="color:var(--text-dim)">Subtotal</span><span class="mono">${formatMarketPrice(sub)}</span></div>
      <div class="flex items-center justify-between text-[13px] mb-1"><span style="color:var(--text-dim)">Tax</span><span class="mono">$0.00</span></div>
      <div class="flex items-center justify-between text-[15px] font-bold mt-2 pt-2 border-t" style="border-color:var(--line)"><span>Total</span><span class="mono">${formatMarketPrice(sub)}</span></div>
    </div>
    <button class="btn btn-primary w-full mb-2.5" onclick="openCheckout()"><i class="fa-solid fa-credit-card"></i> Checkout</button>
    <button class="btn btn-ghost w-full" onclick="closeSheet()">Continue Shopping</button>
  `);
}

function openCheckout(){
  if(MARKET_CART.length===0) return showToast('error','Your cart is empty');
  const total = getCartTotal();
  openSheet(`
    <h3 class="display font-bold text-[17px] mb-1">Checkout</h3>
    <p class="text-[13px] mb-5" style="color:var(--text-dim)">Guest checkout — no account required.</p>
    <div class="glass card p-3 mb-4 space-y-2">
      ${MARKET_CART.map(item=>{
        const p = MARKET_PRODUCTS.find(x=>x.id===item.productId);
        const v = item.variantId ? p.variants.find(x=>x.id===item.variantId) : null;
        const price = v ? v.price : p.numericPrice;
        return `<div class="flex items-center justify-between text-[12.5px]"><span class="truncate flex-1">${p.name} ${v?'('+v.name+')':''} ×${item.quantity}</span><span class="mono">${formatMarketPrice(price*item.quantity)}</span></div>`;
      }).join('')}
      <div class="border-t pt-2 mt-2 flex items-center justify-between font-bold text-[14px]" style="border-color:var(--line)"><span>Total</span><span class="mono">${formatMarketPrice(total)}</span></div>
    </div>
    <div class="text-[12px] font-semibold mb-2" style="color:var(--text-dim)">Payment Method</div>
    <div class="space-y-2 mb-5">
      <label class="flex items-center gap-3 p-3 rounded-xl cursor-pointer" style="background:rgba(255,255,255,.04); border:1px solid var(--line)"><input type="radio" name="pay" value="wallet" checked class="accent-radio"><i class="fa-solid fa-wallet" style="color:var(--accent)"></i><span class="text-[13px]">Wallet Balance</span></label>
      <label class="flex items-center gap-3 p-3 rounded-xl cursor-pointer" style="background:rgba(255,255,255,.04); border:1px solid var(--line)"><input type="radio" name="pay" value="card" class="accent-radio"><i class="fa-solid fa-credit-card" style="color:var(--teal)"></i><span class="text-[13px]">Credit Card</span></label>
      <label class="flex items-center gap-3 p-3 rounded-xl cursor-pointer" style="background:rgba(255,255,255,.04); border:1px solid var(--line)"><input type="radio" name="pay" value="crypto" class="accent-radio"><i class="fa-brands fa-bitcoin" style="color:var(--amber)"></i><span class="text-[13px]">Crypto</span></label>
    </div>
    <button class="btn btn-primary w-full" onclick="placeMockOrder()"><i class="fa-solid fa-lock"></i> Place Order</button>
  `);
}
function placeMockOrder(){
  const method = document.querySelector('input[name="pay"]:checked')?.value || 'wallet';
  const total = getCartTotal();
  const orderId = 'ELX-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+String(MARKET_ORDERS.length+1).padStart(3,'0');
  MARKET_ORDERS.unshift({id:orderId, createdAt:new Date().toISOString(), status:'Pending', items:[...MARKET_CART], total:total, paymentMethod:method});
  MARKET_CART = [];
  saveMarketState();
  updateCartBadge();
  closeSheet();
  setTimeout(()=>{
    openSheet(`
      <div class="text-center py-4">
        <div class="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3" style="background:rgba(52,214,180,.14)"><i class="fa-solid fa-check text-[24px]" style="color:var(--teal)"></i></div>
        <h3 class="display font-bold text-[18px] mb-1">Order Placed!</h3>
        <p class="text-[13px] mb-4" style="color:var(--text-dim)">Your order <span class="mono" style="color:var(--accent)">${orderId}</span> is pending.</p>
        <div class="glass card p-3 mb-5 text-left">
          <div class="flex items-center justify-between text-[12.5px] mb-1"><span style="color:var(--text-dim)">Status</span><span class="pill" style="background:rgba(245,166,35,.14); color:var(--amber)">Pending</span></div>
          <div class="flex items-center justify-between text-[12.5px]"><span style="color:var(--text-dim)">Total</span><span class="mono font-bold">${formatMarketPrice(total)}</span></div>
        </div>
        <button class="btn btn-primary w-full" onclick="closeSheet(); openOrders();">View Orders</button>
      </div>
    `);
  }, 300);
  showToast('success', `Order ${orderId} placed successfully`);
}

function openOrders(){ renderOrders(); }
function renderOrders(){
  if(MARKET_ORDERS.length===0){
    openSheet(`<h3 class="display font-bold text-[17px] mb-1">Order History</h3>${marketEmptyHTML('orders')}`);
    return;
  }
  const sc = {Pending:{bg:'rgba(245,166,35,.14)',color:'var(--amber)'},Processing:{bg:'rgba(90,167,239,.14)',color:'var(--accent)'},Completed:{bg:'rgba(52,214,180,.14)',color:'var(--teal)'},Cancelled:{bg:'rgba(244,88,107,.14)',color:'var(--rose)'}};
  const list = MARKET_ORDERS.map(o=>{
    const s = sc[o.status] || sc.Pending;
    const d = new Date(o.createdAt).toLocaleDateString();
    return `
      <div class="glass card p-3.5 mb-2.5">
        <div class="flex items-center justify-between mb-2"><span class="mono text-[12px]" style="color:var(--accent)">${o.id}</span><span class="pill" style="background:${s.bg}; color:${s.color}">${o.status}</span></div>
        <div class="text-[11.5px] mb-2" style="color:var(--text-faint)">${o.items.length} item${o.items.length>1?'s':''} · ${d}</div>
        <div class="flex items-center justify-between text-[13px] font-bold"><span>Total</span><span class="mono">${formatMarketPrice(o.total)}</span></div>
      </div>`;
  }).join('');
  openSheet(`<h3 class="display font-bold text-[17px] mb-4">Order History</h3><div class="max-h-[60vh] overflow-y-auto">${list}</div><button class="btn btn-ghost w-full mt-4" onclick="closeSheet()">Close</button>`);
}

function toggleWishlist(id){
  const idx = MARKET_WISHLIST.indexOf(id);
  if(idx>-1){ MARKET_WISHLIST.splice(idx,1); showToast('info','Removed from wishlist'); }
  else { MARKET_WISHLIST.push(id); showToast('success','Added to wishlist'); }
  saveMarketState();
  renderMarketGrid();
  renderMarketFeatured();
}
function openWishlist(){ renderWishlist(); }
function renderWishlist(){
  if(MARKET_WISHLIST.length===0){
    openSheet(`<h3 class="display font-bold text-[17px] mb-1">Wishlist</h3>${marketEmptyHTML('wishlist')}`);
    return;
  }
  const list = MARKET_WISHLIST.map(id=>{
    const p = MARKET_PRODUCTS.find(x=>x.id===id);
    if(!p) return '';
    return `
      <div class="flex items-center gap-3 py-3 border-b cursor-pointer" style="border-color:var(--line)" onclick="closeSheet(); openProductDetail('${p.id}')">
        <div class="icon-tile" style="background:${p.color}22; color:${p.color}"><i class="${p.icon}"></i></div>
        <div class="flex-1 min-w-0"><div class="text-[13px] font-medium truncate">${p.name}</div><div class="text-[11px]" style="color:var(--text-faint)">${p.price}</div></div>
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); addToCart('${p.id}',null,1); showToast('success','Added to cart')">Add</button>
        <button onclick="event.stopPropagation(); toggleWishlist('${p.id}'); openWishlist();" class="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 text-[var(--rose)]"><i class="fa-solid fa-trash text-[11px]"></i></button>
      </div>`;
  }).join('');
  openSheet(`<h3 class="display font-bold text-[17px] mb-4">Wishlist (${MARKET_WISHLIST.length})</h3><div class="max-h-[50vh] overflow-y-auto mb-4">${list}</div><button class="btn btn-ghost w-full" onclick="closeSheet()">Close</button>`);
}

function openSupport(){
  openSheet(`
    <h3 class="display font-bold text-[17px] mb-1">Support</h3>
    <p class="text-[13px] mb-5" style="color:var(--text-dim)">How can we help you today?</p>
    <div class="grid grid-cols-2 gap-2 mb-4">
      <button class="btn btn-ghost btn-sm" onclick="setSupportTopic('Order issue')"><i class="fa-solid fa-box-open"></i> Order Issue</button>
      <button class="btn btn-ghost btn-sm" onclick="setSupportTopic('Product question')"><i class="fa-solid fa-tag"></i> Product Q</button>
      <button class="btn btn-ghost btn-sm" onclick="setSupportTopic('Payment issue')"><i class="fa-solid fa-credit-card"></i> Payment</button>
      <button class="btn btn-ghost btn-sm" onclick="setSupportTopic('Account issue')"><i class="fa-solid fa-user-shield"></i> Account</button>
    </div>
    <div class="mb-4">
      <div class="text-[12px] mb-1.5" style="color:var(--text-dim)">Topic</div>
      <input id="support-topic" class="input mb-3" placeholder="Select a topic above" readonly>
      <div class="text-[12px] mb-1.5" style="color:var(--text-dim)">Message</div>
      <textarea id="support-msg" class="input" rows="3" placeholder="Describe your issue..."></textarea>
    </div>
    <button class="btn btn-primary w-full" onclick="submitSupport()"><i class="fa-solid fa-paper-plane"></i> Submit Request</button>
  `);
}
function setSupportTopic(t){ const el=document.getElementById('support-topic'); if(el) el.value=t; }
function submitSupport(){
  const topic=document.getElementById('support-topic')?.value;
  const msg=document.getElementById('support-msg')?.value;
  if(!topic||!msg) return showToast('error','Please fill in all fields');
  closeSheet();
  showToast('success','Support request submitted. We will reply shortly.');
}

function renderMarkets(){ initMarkets(); }



/* ============ AUTHENTICATION ============ */
const PROVIDERS = [
  {id:'google', name:'Google', icon:'fa-brands fa-google', color:'#ea4335'},
  {id:'discord', name:'Discord', icon:'fa-brands fa-discord', color:'#5865f2'},
  {id:'github', name:'GitHub', icon:'fa-brands fa-github', color:'#e8e9ec'},
];

function openLoginSheet(){
  openSheet(`
    <h3 class="display font-bold text-[17px] mb-1">Sign in to Sayraa</h3>
    <p class="text-[13px] mb-5" style="color:var(--text-dim)">Choose a provider to continue. You'll be redirected to authorize.</p>
    <div class="space-y-2.5 mb-2">
      ${PROVIDERS.map(p=>`<button class="btn btn-ghost w-full !justify-start" onclick="startOAuth('${p.id}')"><i class="${p.icon} text-[16px]" style="color:${p.color}"></i><span>Continue with ${p.name}</span></button>`).join('')}
    </div>
  `);
}

function startOAuth(providerId, linkToken){
  const url = new URL(`${OAUTH_BASE}/login/${providerId}`);
  if(linkToken) url.searchParams.set('token', linkToken);
  closeSheet();
  showToast('info', `Redirecting...`);
  setTimeout(() => window.location.href = url.toString(), 800);
}

function parseJwt(token) {
  try { return JSON.parse(decodeURIComponent(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''))); } catch(e) { return null; }
}

async function checkOAuthCallback(){
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const linkStatus = params.get('link');
  const error = params.get('error');

  if(token){
    const payload = parseJwt(token);
    if (payload) {
      Sayraa.user = { name: payload.username || 'User', email: payload.email || 'No email', avatar: payload.avatar, providers: payload.providers || [], token: token };
      localStorage.setItem('sayraa_token', token);
      localStorage.setItem('sayraa_user', JSON.stringify(Sayraa.user));
      showToast('success', 'Signed in successfully');
      loadGenshinAccounts();
    }
    history.replaceState({}, '', window.location.pathname + window.location.hash);
  } else if(linkStatus === 'success'){
    const targetProvider = params.get('provider');
    showToast('success', `Linked ${targetProvider.toUpperCase()} successfully`);
    if(Sayraa.user && !Sayraa.user.providers.includes(targetProvider)){
      Sayraa.user.providers.push(targetProvider);
      localStorage.setItem('sayraa_user', JSON.stringify(Sayraa.user));
    }
    history.replaceState({}, '', window.location.pathname + window.location.hash);
  } else if(error){
    showToast('error', decodeURIComponent(error));
    history.replaceState({}, '', window.location.pathname + window.location.hash);
  }
}

async function confirmUnlink(providerId){
  closeSheet();
  try {
    const response = await fetch(`${OAUTH_BASE}/unlink/${providerId}`, { method: 'POST', headers: { 'Authorization': `Bearer ${Sayraa.user.token}`, 'Content-Type': 'application/json' }});
    const resData = await response.json();
    if (!response.ok) return showToast('error', resData.error || 'Failed to unlink');
    Sayraa.user.providers = Sayraa.user.providers.filter(id=>id!==providerId);
    localStorage.setItem('sayraa_user', JSON.stringify(Sayraa.user));
    showToast('success', `Unlinked successfully.`);
    renderAuthUI();
  } catch (err) { showToast('error', 'Network error.'); }
}

function unlinkProvider(providerId){
  openSheet(`
    <h3 class="display font-bold text-[16px] mb-2">Unlink Provider?</h3>
    <p class="text-[13px] mb-5" style="color:var(--text-dim)">You'll no longer be able to sign in with this provider.</p>
    <div class="flex gap-2.5">
      <button class="btn btn-ghost flex-1" onclick="closeSheet()">Cancel</button>
      <button class="btn btn-danger flex-1" onclick="confirmUnlink('${providerId}')">Unlink</button>
    </div>
  `);
}

function logout(){
  openSheet(`
    <h3 class="display font-bold text-[16px] mb-2">Log out of Sayraa?</h3>
    <div class="flex gap-2.5 mt-5">
      <button class="btn btn-ghost flex-1" onclick="closeSheet()">Cancel</button>
      <button class="btn btn-danger flex-1" onclick="performLogout()">Log out</button>
    </div>
  `);
}

async function performLogout() {
  if (Sayraa.user) {
    try { await fetch(`${OAUTH_BASE}/logout`, { method: 'POST', headers: { 'Authorization': `Bearer ${Sayraa.user.token}` }}); } catch (e) {}
  }
  Sayraa.user = null;
  localStorage.removeItem('sayraa_token');
  localStorage.removeItem('sayraa_user');
  genshinAccounts = [];
  genshinActiveId = null;
  renderAccountBar();
  closeSheet();
  renderAuthUI();
  showToast('info', 'Logged out');
  navigate('dashboard');
}

function getAvatarHTML(avatarData, fallbackName) {
    if (!avatarData) return (fallbackName || 'U')[0].toUpperCase();
    if (avatarData.startsWith('http')) return `<img src="${avatarData}" class="w-full h-full object-cover">`;
    return avatarData[0].toUpperCase();
}

function renderAuthUI(){
  const u = Sayraa.user;
  const avatarHTML = u ? getAvatarHTML(u.avatar, u.name) : '?';

  document.getElementById('avatar-btn').innerHTML = avatarHTML;
  document.getElementById('dash-greeting').textContent = u ? `Welcome back, ${u.name.split(' ')[0]}` : 'Good to see you';
  document.getElementById('dash-account-status').textContent = u ? 'Signed in' : 'Guest';

  document.getElementById('drawer-account').innerHTML = u ? `
    <div class="flex items-center gap-2.5">
      <div class="w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-[13px] glass overflow-hidden">${avatarHTML}</div>
      <div class="min-w-0 flex-1">
        <div class="text-[13px] font-semibold truncate">${u.name}</div>
        <div class="text-[11px] truncate" style="color:var(--text-faint)">${u.email}</div>
      </div>
      <button onclick="logout()" class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 text-[var(--rose)]"><i class="fa-solid fa-power-off text-[13px]"></i></button>
    </div>
  ` : `<button class="btn btn-primary w-full" onclick="openLoginSheet()"><i class="fa-solid fa-right-to-bracket"></i> Sign in</button>`;

  document.getElementById('settings-avatar').innerHTML = avatarHTML;
  document.getElementById('settings-avatar').classList.add('overflow-hidden');
  document.getElementById('settings-name').textContent = u ? u.name : 'Not signed in';
  document.getElementById('settings-email').textContent = u ? u.email : 'Sign in to sync your account';
  document.getElementById('settings-auth-actions').innerHTML = u
    ? `<button class="btn btn-danger btn-sm" onclick="logout()"><i class="fa-solid fa-arrow-right-from-bracket"></i> Log out</button>`
    : `<button class="btn btn-primary btn-sm" onclick="openLoginSheet()"><i class="fa-solid fa-right-to-bracket"></i> Sign in</button>`;

  document.getElementById('providers-list').innerHTML = PROVIDERS.map(p=>{
    const linked = u && u.providers.includes(p.id);
    return `
    <div class="flex items-center gap-3 px-3 py-3">
      <i class="${p.icon} text-[18px] w-6 text-center" style="color:${p.color}"></i>
      <div class="flex-1">
        <div class="text-[13.5px] font-medium">${p.name}</div>
        <div class="text-[11px]" style="color:var(--text-faint)">${linked ? 'Connected' : 'Not connected'}</div>
      </div>
      ${!u ? `<button class="btn btn-ghost btn-sm" onclick="openLoginSheet()">Connect</button>`
        : linked ? `<button class="btn btn-ghost btn-sm" onclick="unlinkProvider('${p.id}')">Disconnect</button>`
        : `<button class="btn btn-ghost btn-sm" onclick="startOAuth('${p.id}', Sayraa.user.token)">Connect</button>`}
    </div>`;
  }).join('<div class="border-t" style="border-color:var(--line)"></div>');

  if (u) {
    fetchSettings();
    loadApiKeyInfo();
  } else {
    document.querySelectorAll('.switch').forEach(el => el.classList.remove('on'));
    document.getElementById('api-key-display').textContent = '— sign in to generate —';
    document.getElementById('api-key-btn').innerHTML = '<i class="fa-solid fa-lock" style="color:var(--text-faint)"></i>';
    document.getElementById('api-key-btn').onclick = () => showToast('error', 'Please sign in first');
  }
}

/* ============ SETTINGS API (PATCH JSON) ============ */
async function fetchSettings() {
  try {
    const res = await fetch(SETTINGS_BASE, { headers: { 'Authorization': `Bearer ${Sayraa.user.token}` }});
    const data = await res.json();
    if (data.success) {
      const s = data.data;
      
      // Hàm gạt công tắc cho đúng trạng thái DB
      const setToggle = (id, val) => { const el = document.getElementById(id); if(el) el.classList.toggle('on', !!val); };
      
      setToggle('email-switch', s.notifications?.email);
      setToggle('push-switch', s.notifications?.push);
      setToggle('discord-switch', s.notifications?.discord);
      setToggle('security-switch', s.notifications?.security_alert);
      setToggle('system-update-switch', s.notifications?.system_update);

      setToggle('public-profile-switch', s.privacy?.profile_public);
      setToggle('show-email-switch', s.privacy?.show_email);
      setToggle('analytics-switch', s.privacy?.analytics);
      setToggle('crash-report-switch', s.privacy?.crash_report);

      setToggle('dev-mode-switch', s.developer_mode);
      setToggle('api-logs-switch', s.show_api_logs);
      setToggle('debug-logs-switch', s.show_debug_info);
    }
  } catch (e) { console.error('Fetch settings err', e); }
}

async function toggleSwitch(el, category, key) {
  if (!Sayraa.user) return showToast('error', 'Sign in to update settings');
  
  const isCurrentlyOn = el.classList.contains('on');
  const newValue = !isCurrentlyOn;
  
  // Optimistic Update UI
  el.classList.toggle('on');

  let payload = {};
  if (key) {
    payload[category] = {};
    payload[category][key] = newValue;
  } else {
    payload[category] = newValue;
  }

  try {
    const res = await fetch(SETTINGS_BASE, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${Sayraa.user.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(!data.success) throw new Error(data.error);
  } catch (err) {
    el.classList.toggle('on'); // Revert UI
    showToast('error', 'Failed to save setting');
  }
}

/* ============ API KEY SYSTEM ============ */
async function loadApiKeyInfo() {
  try {
    const res = await fetch(`${OAUTH_BASE}/apikey`, { headers: { 'Authorization': `Bearer ${Sayraa.user.token}` }});
    const data = await res.json();
    const display = document.getElementById('api-key-display');
    const btn = document.getElementById('api-key-btn');

    if (data.success && data.data) {
      display.textContent = `Active Key (Created: ${new Date(data.data.created_at).toLocaleDateString()})`;
      display.classList.remove('bg-white/5', 'select-all');
      btn.innerHTML = '<i class="fa-solid fa-trash text-[var(--rose)]"></i>';
      btn.onclick = deleteApiKey;
    } else {
      display.textContent = '— No active key —';
      btn.innerHTML = '<i class="fa-solid fa-plus"></i>';
      btn.onclick = generateApiKey;
    }
  } catch(e) {}
}

async function generateApiKey() {
  try {
    const res = await fetch(`${OAUTH_BASE}/apikey`, { method: 'POST', headers: { 'Authorization': `Bearer ${Sayraa.user.token}` }});
    const data = await res.json();
    if (data.success) {
      if (data.api_key) {
        openSheet(`
            <h3 class="display font-bold text-[16px] mb-2">API Key Generated!</h3>
            <p class="text-[13px] mb-4 text-[var(--rose)]">Copy this key now. You won't be able to see it again!</p>
            <div class="input mono text-[12px] p-3 mb-4 select-all bg-white/5 break-all border-[var(--accent)] text-[var(--accent)]">${data.api_key}</div>
            <button class="btn btn-primary w-full" onclick="closeSheet(); showToast('success', 'Remember to keep it safe!'); loadApiKeyInfo();">I have copied it</button>
        `);
      } else { showToast('info', data.message); }
      loadApiKeyInfo();
    }
  } catch(e) { showToast('error', 'Failed to generate key'); }
}

async function deleteApiKey() {
  if(!confirm('Are you sure you want to revoke this API Key? Any apps using it will break.')) return;
  try {
    const res = await fetch(`${OAUTH_BASE}/apikey`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${Sayraa.user.token}` }});
    const data = await res.json();
    if (data.success) { showToast('success', 'API Key deleted'); loadApiKeyInfo(); }
  } catch(e) { showToast('error', 'Failed to delete key'); }
}

/* ============ GENSHIN MODULE ============ */
const GENSHIN_BASE = 'https://api.elyriax.com/v1/genshin';
const ELEMENT_COLOR = {Pyro:'#f4586b', Hydro:'#5aa7ef', Dendro:'#8b9a68', Electro:'#b48ef0', Anemo:'#34d6b4', Cryo:'#8fd8ef', Geo:'#f5a623'};

let genshinAccounts = [];
let genshinActiveId = null;
let currentGenshinTab = 'banners';

function genshinAuthHeaders(json){
  const h = {};
  const token = (Sayraa.user && Sayraa.user.token) || localStorage.getItem('sayraa_token');
  if(token) h['Authorization'] = `Bearer ${token}`;
  if(json) h['Content-Type'] = 'application/json';
  return h;
}

function activeGenshinAccount(){
  return genshinAccounts.find(a=>a.id===genshinActiveId) || null;
}

async function loadGenshinAccounts(){
  if(!Sayraa.user){ genshinAccounts = []; genshinActiveId = null; renderAccountBar(); return; }
  try{
    const res = await fetch(`${GENSHIN_BASE}/accounts`, { headers: genshinAuthHeaders() });
    const data = await res.json();
    genshinAccounts = (data.success && data.data) ? data.data : [];
    const def = genshinAccounts.find(a=>a.is_default);
    genshinActiveId = def ? def.id : (genshinAccounts[0] ? genshinAccounts[0].id : null);
  } catch(e){
    genshinAccounts = [];
    genshinActiveId = null;
  }
  renderAccountBar();
}

function renderAccountBar(){
  const bar = document.getElementById('genshin-account-bar');
  if(!bar) return;

  if(!Sayraa.user){
    bar.innerHTML = `
      <div class="glass card p-4 flex items-center justify-between gap-3">
        <div class="text-[13px]" style="color:var(--text-dim)">Sign in to link a Genshin account and unlock check-in, daily note &amp; stats.</div>
        <button class="btn btn-primary btn-sm shrink-0" onclick="openLoginSheet()">Sign in</button>
      </div>`;
    return;
  }

  if(!genshinAccounts.length){
    bar.innerHTML = `
      <div class="glass card p-4 flex items-center justify-between gap-3">
        <div class="text-[13px]" style="color:var(--text-dim)">No Genshin account linked yet.</div>
        <button class="btn btn-primary btn-sm shrink-0" onclick="openAddAccountSheet()"><i class="fa-solid fa-plus"></i> Add account</button>
      </div>`;
    return;
  }

  const acc = activeGenshinAccount();
  bar.innerHTML = `
    <div class="glass card p-4 flex items-center gap-3">
      <div class="icon-tile" style="background:rgba(245,166,35,.14); color:var(--amber)"><i class="fa-solid fa-user"></i></div>
      <div class="flex-1 min-w-0">
        ${genshinAccounts.length > 1 ? `
          <select class="input text-[13px] py-1.5 px-2" style="width:auto" onchange="switchGenshinAccount(this.value)">
            ${genshinAccounts.map(a=>`<option value="${a.id}" ${a.id===genshinActiveId?'selected':''}>${a.nickname || ('UID '+a.uid)}${a.is_default?' ★':''}</option>`).join('')}
          </select>
        ` : `<div class="font-semibold text-[13.5px]">${acc.nickname || ('UID '+acc.uid)}</div>`}
        <div class="text-[11.5px] mono mt-1" style="color:var(--text-faint)">UID ${acc.uid} · ${acc.server}${acc.is_default ? ' · Default' : ''}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="openAccountSettingsSheet(${acc.id})"><i class="fa-solid fa-sliders"></i></button>
      <button class="btn btn-ghost btn-sm" onclick="openAddAccountSheet()"><i class="fa-solid fa-plus"></i></button>
    </div>`;
}

function switchGenshinAccount(id){
  genshinActiveId = Number(id);
  renderAccountBar();
  renderGenshinPanel(currentGenshinTab);
}

function openAddAccountSheet(){
  openSheet(`
    <h3 class="display font-bold text-[16px] mb-1">Add Genshin Account</h3>
    <p class="text-[13px] mb-4" style="color:var(--text-dim)">Your cookie is encrypted at rest and used only to sync your account.</p>
    <div class="space-y-2.5 mb-2">
      <div class="relative">
        <textarea id="ga-cookie" class="input mono text-[12px] pr-11" rows="3" style="-webkit-text-security:disc;" placeholder="ltuid_v2=...; ltoken_v2=..."></textarea>
        <button type="button" class="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg flex items-center justify-center" style="color:var(--text-faint); background:rgba(255,255,255,.05)" onclick="toggleCookieMask(this)" title="Show/hide cookie"><i class="fa-solid fa-eye"></i></button>
      </div>
      <input id="ga-uid" class="input" placeholder="In-game UID, e.g. 890096220">
      <select id="ga-server" class="input">
        <option value="os_asia">Asia</option>
        <option value="os_usa">America</option>
        <option value="os_euro">Europe</option>
        <option value="os_cht">TW, HK, MO</option>
      </select>
    </div>
    <button class="btn btn-primary w-full mt-2" id="ga-submit" onclick="submitAddAccount()"><i class="fa-solid fa-link"></i> Link account</button>
  `);
}

function toggleCookieMask(btn){
  const ta = document.getElementById('ga-cookie');
  const currentlyMasked = ta.style.webkitTextSecurity !== 'none';
  ta.style.webkitTextSecurity = currentlyMasked ? 'none' : 'disc';
  btn.innerHTML = currentlyMasked ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
}

async function submitAddAccount(){
  if(!Sayraa.user) return showToast('error', 'Sign in first');
  const cookie = document.getElementById('ga-cookie').value.trim();
  const uid = document.getElementById('ga-uid').value.trim();
  const server = document.getElementById('ga-server').value;
  if(!cookie || !uid) return showToast('error', 'Cookie and UID are required');

  const btn = document.getElementById('ga-submit');
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Linking...';

  try{
    const res = await fetch(`${GENSHIN_BASE}/accounts`, {
      method: 'POST',
      headers: genshinAuthHeaders(true),
      body: JSON.stringify({ cookie, uid, server })
    });
    const data = await res.json();
    if(!res.ok || !data.success) throw new Error(data.message || 'Failed to add account');

    closeSheet();
    showToast('success', data.message || `Linked ${data.data?.nickname || 'account'} successfully`);
    await loadGenshinAccounts();
    if(data.data?.id){ genshinActiveId = data.data.id; renderAccountBar(); }
    renderGenshinPanel(currentGenshinTab);
  } catch(err){
    showToast('error', err.message || 'Failed to add account');
    btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-link"></i> Link account';
  }
}

function genshinToggleRow(id, label, val, accId, key){
  return `
    <div class="flex items-center justify-between">
      <span class="text-[13.5px]">${label}</span>
      <div id="${id}" class="switch ${val ? 'on' : ''}" onclick="toggleGenshinSetting(this, ${accId}, '${key}')"></div>
    </div>`;
}

function openAccountSettingsSheet(id){
  const acc = genshinAccounts.find(a=>a.id===id);
  if(!acc) return;
  openSheet(`
    <h3 class="display font-bold text-[16px] mb-1">${acc.nickname || ('UID '+acc.uid)}</h3>
    <p class="text-[12.5px] mb-4 mono" style="color:var(--text-faint)">UID ${acc.uid} · ${acc.server}</p>
    <div class="space-y-3 mb-5">
      ${genshinToggleRow('ga-tg-checkin', 'Auto check-in', acc.auto_checkin, id, 'auto_checkin')}
      ${genshinToggleRow('ga-tg-redeem', 'Auto redeem codes', acc.auto_redeem, id, 'auto_redeem')}
      ${genshinToggleRow('ga-tg-notes', 'Auto sync resin / daily note', acc.auto_daily_note, id, 'auto_daily_note')}
      ${genshinToggleRow('ga-tg-default', 'Set as default account', acc.is_default, id, 'is_default')}
    </div>
    <button class="btn btn-danger w-full" onclick="deleteGenshinAccount(${id})"><i class="fa-solid fa-trash"></i> Remove account</button>
  `);
}

async function toggleGenshinSetting(el, accId, key){
  if(key === 'is_default' && el.classList.contains('on')) return;
  const isOn = el.classList.contains('on');
  const newVal = !isOn;
  el.classList.toggle('on');

  try{
    const res = await fetch(`${GENSHIN_BASE}/accounts/${accId}`, {
      method: 'PATCH',
      headers: genshinAuthHeaders(true),
      body: JSON.stringify({ [key]: newVal })
    });
    const data = await res.json();
    if(!res.ok || !data.success) throw new Error(data.message);

    const acc = genshinAccounts.find(a=>a.id===accId);
    if(acc){
      if(key === 'is_default' && newVal){
        genshinAccounts.forEach(a=> a.is_default = (a.id===accId));
        genshinActiveId = accId;
      } else {
        acc[key] = newVal;
      }
    }
    renderAccountBar();
    showToast('success', 'Setting updated');
  } catch(err){
    el.classList.toggle('on');
    showToast('error', err.message || 'Failed to update setting');
  }
}

async function deleteGenshinAccount(id){
  if(!confirm('Remove this Genshin account? This cannot be undone.')) return;
  try{
    const res = await fetch(`${GENSHIN_BASE}/accounts/${id}`, { method: 'DELETE', headers: genshinAuthHeaders() });
    const data = await res.json();
    if(!res.ok || !data.success) throw new Error(data.message);

    closeSheet();
    showToast('success', 'Account removed');
    await loadGenshinAccounts();
    renderGenshinPanel(currentGenshinTab);
  } catch(err){
    showToast('error', err.message || 'Failed to remove account');
  }
}

function genshinSignInPrompt(){
  return `<div class="glass card p-6 text-center">
    <i class="fa-solid fa-lock mb-3 text-[22px]" style="color:var(--text-faint)"></i>
    <p class="text-[13px] mb-3" style="color:var(--text-dim)">Sign in to access account features.</p>
    <button class="btn btn-primary btn-sm" onclick="openLoginSheet()">Sign in</button>
  </div>`;
}
function genshinNoAccountPrompt(){
  return `<div class="glass card p-6 text-center">
    <i class="fa-solid fa-user-plus mb-3 text-[22px]" style="color:var(--text-faint)"></i>
    <p class="text-[13px] mb-3" style="color:var(--text-dim)">Link a Genshin account to see this.</p>
    <button class="btn btn-primary btn-sm" onclick="openAddAccountSheet()">Add account</button>
  </div>`;
}
function genshinErrorCard(msg){
  return `<div class="glass card p-5 text-center text-[13px]" style="color:#f4586b">
    <i class="fa-solid fa-circle-exclamation mb-2 text-[20px] block"></i>${msg}
  </div>`;
}
function formatCountdown(seconds){
  if(!seconds || seconds <= 0) return 'now';
  const h = Math.floor(seconds/3600);
  const days = Math.floor(h/24);
  if(days >= 1) return `${days}d ${h%24}h`;
  return `${h}h ${Math.floor((seconds%3600)/60)}m`;
}

function genshinTab(tab, el){
  currentGenshinTab = tab;
  document.querySelectorAll('#genshin-tabs .tab-pill').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  renderGenshinPanel(tab);
}

function skeletonBlock(h){ return `<div class="skel" style="height:${h}px"></div>`; }

function renderGenshinPanel(tab){
  const panel = document.getElementById('genshin-panel');
  if(!panel) return;
  panel.innerHTML = `<div class="space-y-3">${skeletonBlock(90)}${skeletonBlock(90)}</div>`;
  setTimeout(()=>{
    if(tab==='banners') renderBanners(panel);
    else if(tab==='codes') renderCodes(panel);
    else if(tab==='notes') renderDailyNote(panel);
    else if(tab==='stats') renderRoleStats(panel);
    else if(tab==='calendar') renderCalendar(panel);
  }, 350);
}

async function renderBanners(panel){
  try{
    const res = await fetch(`${GENSHIN_BASE}?type=banner`);
    const d = await res.json();
    if(!res.ok || d.status !== 'success' || !d.data) throw new Error('Failed to load banners');

    panel.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-[14px]">Upcoming Banners</h3>
        <span class="text-[11px] mono" style="color:var(--text-faint)">synced ${timeAgo(d.timestamp)}</span>
      </div>
      <div class="space-y-3">
        ${d.data.map(b=>`
          <div class="glass card p-4">
            <div class="flex items-center justify-between mb-2.5">
              <span class="pill" style="background:rgba(124,111,240,.14); color:var(--accent)">${b.version} · ${b.name}</span>
              <span class="text-[11.5px]" style="color:var(--text-faint)">${b.phase}</span>
            </div>
            <div class="flex flex-wrap gap-2">
              ${(b['5_star_featured']?.new||[]).map(n=>`<span class="pill" style="background:rgba(52,214,180,.14); color:var(--teal)"><i class="fa-solid fa-star mr-1 text-[9px]"></i>${n}</span>`).join('')}
              ${(b['5_star_featured']?.rerun||[]).map(n=>`<span class="pill" style="background:rgba(255,255,255,.06); color:var(--text-dim)">${n} · rerun</span>`).join('')}
              ${(b['4_star_featured']||[]).map(n=>`<span class="pill" style="background:rgba(255,255,255,.04); color:var(--text-faint)">${n}</span>`).join('')}
            </div>
          </div>`).join('')}
      </div>
    `;
  } catch(err){
    panel.innerHTML = genshinErrorCard('Could not load banner data. Please try again later.');
  }
}

async function renderCodes(panel){
  try {
    const response = await fetch(`${GENSHIN_BASE}?type=codes`);
    if (!response.ok) throw new Error('Could not reach the API server');

    const d = await response.json();
    if (d.status !== 'success' || !d.cards) throw new Error('Invalid response payload');

    panel.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-[14px]">Active Gift Codes</h3>
        <span class="text-[11px] mono" style="color:var(--text-faint)">${d.count} available</span>
      </div>
      <div class="space-y-2.5">
        ${d.cards.map(c=>`
          <div class="glass card p-4 flex items-center gap-3.5">
            <div class="icon-tile" style="background:rgba(245,166,35,.14); color:var(--amber)"><i class="fa-solid fa-gift"></i></div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="mono font-semibold text-[13.5px]">${c.codes[0]}</span>
                <span class="text-[10.5px]" style="color:var(--text-faint)">${c.server}</span>
              </div>
              <div class="text-[11.5px] mt-0.5" style="color:var(--text-dim)">${c.rewards.join(' · ')}</div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="copyCode('${c.codes[0]}')"><i class="fa-regular fa-copy"></i></button>
          </div>`).join('')}
      </div>
      <p class="text-[11.5px] mt-3.5 text-center" style="color:var(--text-faint)">Turn on <b>Auto redeem codes</b> in account settings to have new codes applied automatically.</p>
    `;
  } catch (error) {
    console.error('Error fetching Genshin codes:', error);
    panel.innerHTML = genshinErrorCard('Could not load the gift code list. Please try again later.');
  }
}

function copyCode(code){ navigator.clipboard?.writeText(code).catch(()=>{}); showToast('success', `Copied "${code}"`); }

async function renderDailyNote(panel){
  if(!Sayraa.user) return panel.innerHTML = genshinSignInPrompt();
  const acc = activeGenshinAccount();
  if(!acc) return panel.innerHTML = genshinNoAccountPrompt();

  try{
    const res = await fetch(`${GENSHIN_BASE}/accounts/${acc.id}/daily-note`, { headers: genshinAuthHeaders() });
    const payload = await res.json();
    if(!res.ok || !payload.ok) throw new Error(payload.message || 'Failed to load daily note');
    const d = payload.data;
    const resinPct = Math.min(100, Math.round((d.resin.current / d.resin.max) * 100));

    panel.innerHTML = `
      <div class="glass card p-5 mb-3.5">
        <div class="flex items-center justify-between mb-2.5">
          <h3 class="font-semibold text-[14px]"><i class="fa-solid fa-droplet mr-1.5" style="color:var(--accent)"></i>Resin</h3>
          <span class="mono font-bold text-[15px]">${d.resin.current}<span style="color:var(--text-faint)">/${d.resin.max}</span></span>
        </div>
        <div class="w-full h-2 rounded-full overflow-hidden mb-2.5" style="background:rgba(255,255,255,.06)">
          <div class="h-full rounded-full" style="width:${resinPct}%; background:linear-gradient(90deg,var(--accent),#8b7ff5)"></div>
        </div>
        <div class="flex items-center justify-between text-[11.5px]" style="color:var(--text-dim)">
          <span>${d.resin.is_full ? 'Full' : 'Full at ' + d.resin.estimated_full_time}</span>
          <span>Boss discounts: ${d.resin.resin_discount.remain_num}/${d.resin.resin_discount.limit_num}</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-3.5">
        <div class="glass card p-4">
          <div class="text-[11px] mb-1" style="color:var(--text-faint)">Daily tasks</div>
          <div class="font-semibold text-[15px]">${d.daily_tasks.finished_num}/${d.daily_tasks.total_num}</div>
          <div class="text-[11px] mt-1" style="color:var(--text-dim)">${d.daily_tasks.is_all_finished ? 'All finished' : 'In progress'}</div>
        </div>
        <div class="glass card p-4">
          <div class="text-[11px] mb-1" style="color:var(--text-faint)">Stored attendance</div>
          <div class="font-semibold text-[15px] mono">${d.daily_tasks.stored_attendance}</div>
          <div class="text-[11px] mt-1" style="color:var(--text-dim)">resets in ${formatCountdown(d.daily_tasks.stored_attendance_refresh_countdown_seconds)}</div>
        </div>
      </div>

      <h3 class="font-semibold text-[14px] mb-2">Expeditions (${d.expeditions.current_num}/${d.expeditions.max_num})</h3>
      <div class="space-y-2 mb-3.5">
        ${d.expeditions.list.length ? d.expeditions.list.map(e=>`
          <div class="glass card p-3.5 flex items-center gap-3">
            <img src="${e.avatar_icon}" class="w-9 h-9 rounded-lg object-cover" onerror="this.style.display='none'">
            <div class="flex-1">
              <div class="text-[13px] font-medium">${e.status}</div>
              <div class="text-[11.5px]" style="color:var(--text-dim)">${e.estimated_finished_time}</div>
            </div>
          </div>`).join('') : `<div class="text-[12.5px]" style="color:var(--text-faint)">No active expeditions</div>`}
      </div>

      <div class="grid grid-cols-2 gap-3 mb-3.5">
        <div class="glass card p-4">
          <div class="text-[11px] mb-1" style="color:var(--text-faint)">Serenitea Pot</div>
          <div class="font-semibold text-[14px]">${d.home_coin.current}/${d.home_coin.max}</div>
          <div class="text-[11px] mt-1" style="color:var(--text-dim)">${d.home_coin.is_full ? 'Full' : d.home_coin.estimated_full_time}</div>
        </div>
        <div class="glass card p-4">
          <div class="text-[11px] mb-1" style="color:var(--text-faint)">Parametric Transformer</div>
          <div class="font-semibold text-[14px]">${d.transformer.obtained ? (d.transformer.ready ? 'Ready' : 'On cooldown') : 'Not obtained'}</div>
        </div>
      </div>

      <div class="glass card p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[13px] font-medium">Archon Quest</span>
          <span class="pill" style="background:${d.archon_quest_progress.is_finish_all_mainline?'rgba(52,214,180,.14)':'rgba(245,166,35,.14)'}; color:${d.archon_quest_progress.is_finish_all_mainline?'var(--teal)':'var(--amber)'}">${d.archon_quest_progress.is_finish_all_mainline ? 'Mainline complete' : 'In progress'}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-[13px] font-medium">Weekly activity</span>
          <span class="mono text-[13px]">${d.week_active_progress.progress_current}/${d.week_active_progress.progress_total}</span>
        </div>
      </div>
    `;
  } catch(err){
    panel.innerHTML = genshinErrorCard(err.message || 'Failed to load daily note');
  }
}

async function renderRoleStats(panel){
  if(!Sayraa.user) return panel.innerHTML = genshinSignInPrompt();
  const acc = activeGenshinAccount();
  if(!acc) return panel.innerHTML = genshinNoAccountPrompt();

  try{
    const res = await fetch(`${GENSHIN_BASE}/accounts/${acc.id}/stats`, { headers: genshinAuthHeaders() });
    const d = await res.json();
    if(!res.ok || !d.ok) throw new Error(d.message || 'Failed to load stats');

    const chests = d.stats.chests || {};
    const oculus = d.stats.oculus || {};
    const avatars = d.avatars || [];

    panel.innerHTML = `
      <div class="glass card p-5 mb-3.5">
        <div class="flex items-center gap-3.5 mb-4">
          <div class="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-bold glass border-1 border-white" style="background-color: #8b5a2b; color: white;">
            ${d.role.avatar_url ? `<img src="${d.role.avatar_url}" class="w-full h-full object-cover" onerror="this.remove()">` : d.role.nickname[0]}
          </div>
          <div>
            <div class="font-semibold text-[14.5px]">${d.role.nickname} <span class="text-[12px] font-normal" style="color:var(--text-faint)">[cấp ${d.role.level}]</span></div>
            <div class="text-[11.5px] mono" style="color:var(--text-faint)">
              ${acc.server || 'Asia Server'} | UID ${acc.uid || d.role.game_head_id || '890096220'}
            </div>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2.5 text-center">
          ${statChip(d.stats.active_days,'Active days')}
          ${statChip(d.stats.achievements,'Achievements')}
          ${statChip(d.stats.avatars_count,'Characters')}
          ${statChip(d.stats.domains,'Domains')}
          ${statChip(d.stats.spiral_abyss,'Abyss')}
          ${statChip(d.stats.way_points,'Waypoints')}
        </div>
      </div>

      <div class="glass card p-5 mb-3.5">
        <h3 class="font-semibold text-[14px] mb-3">Chest Breakdown</h3>
        <div class="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
          ${statChip(chests.common ?? 0,'Common')}
          ${statChip(chests.exquisite ?? 0,'Exquisite')}
          ${statChip(chests.precious ?? 0,'Precious')}
          ${statChip(chests.luxurious ?? 0,'Luxurious')}
          ${statChip(chests.magic ?? 0,'Magic')}
        </div>
      </div>

      <div class="glass card p-5 mb-3.5">
        <h3 class="font-semibold text-[14px] mb-3">Oculus Progress</h3>
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
          ${oculusChip(oculus.anemo ?? 0,'Anemo')}
          ${oculusChip(oculus.geo ?? 0,'Geo')}
          ${oculusChip(oculus.electro ?? 0,'Electro')}
          ${oculusChip(oculus.dendro ?? 0,'Dendro')}
          ${oculusChip(oculus.hydro ?? 0,'Hydro')}
          ${oculusChip(oculus.pyro ?? 0,'Pyro')}
        </div>
      </div>

      <h3 class="font-semibold text-[14px] mb-2.5">Characters (${avatars.length})</h3>
      <div class="space-y-2.5">
        ${avatars.map(a=>avatarCardHTML(a)).join('')}
      </div>
    `;
  } catch(err){
    panel.innerHTML = genshinErrorCard(err.message || 'Failed to load role stats');
  }
}
function statChip(val,label){ return `<div class="rounded-xl py-3" style="background:rgba(255,255,255,.03); border:1px solid var(--line)"><div class="font-bold text-[15px] mono">${val}</div><div class="text-[10px] mt-0.5" style="color:var(--text-faint)">${label}</div></div>`; }
function oculusChip(val,label){
  const color = ELEMENT_COLOR[label] || 'var(--text-dim)';
  return `<div class="rounded-xl py-3" style="background:${color}14; border:1px solid ${color}33"><div class="font-bold text-[15px] mono" style="color:${color}">${val}</div><div class="text-[10px] mt-0.5" style="color:var(--text-faint)">${label}</div></div>`;
}
function rarityStars(n){
  if(!n) return '';
  const color = n>=5 ? '#f5a623' : (n>=4 ? '#b48ef0' : 'var(--text-faint)');
  return `<span class="mono" style="color:${color}; letter-spacing:-1px">${'★'.repeat(n)}</span>`;
}
function avatarCardHTML(a){
  const color = ELEMENT_COLOR[a.element] || 'var(--text-dim)';
  const relics = a.relics || [];
  const weapon = a.weapon || {};
  return `
    <div class="glass card overflow-hidden">
      <button type="button" class="w-full flex items-center gap-3 p-3.5 text-left" onclick="toggleAvatarCard(this)">
        <div class="icon-tile overflow-hidden" style="background:${color}22; color:${color}">
          ${a.image ? `<img src="${a.image}" class="w-full h-full object-cover" onerror="this.remove()">` : `<i class="fa-solid fa-user"></i>`}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="font-medium text-[13.5px]">${a.name}</span>
            <span class="text-[10.5px]" style="color:var(--text-faint)">C${a.constellation ?? 0}</span>
            ${a.fetter != null ? `<span class="text-[10.5px]" style="color:var(--text-faint)"><i class="fa-solid fa-heart" style="color:var(--rose); font-size:9px"></i> ${a.fetter}</span>` : ''}
          </div>
          <div class="text-[11.5px]" style="color:var(--text-dim)">Lv.${a.level} · ${weapon.name || '—'}</div>
        </div>
        <span class="pill" style="background:${color}18; color:${color}">${a.element}</span>
        <i class="fa-solid fa-chevron-right chev-ic text-[11px]" style="color:var(--text-faint); transition:transform .2s ease; flex-shrink:0"></i>
      </button>
      <div class="avatar-detail" style="display:none; border-top:1px solid var(--line)">
        <div class="p-3.5">
          <div class="flex items-center gap-3 mb-3">
            <div class="icon-tile" style="background:rgba(255,255,255,.04)"><i class="fa-solid fa-khanda" style="color:var(--text-dim)"></i></div>
            <div class="flex-1 min-w-0">
              <div class="text-[12.5px] font-medium">${weapon.name || 'No weapon data'}</div>
              <div class="text-[10.5px] flex items-center gap-1.5" style="color:var(--text-faint)">
                <span>Lv.${weapon.level ?? '—'} · R${weapon.affix_level ?? 1}</span>
                ${rarityStars(weapon.rarity)}
              </div>
            </div>
          </div>
          ${relics.length ? `
            <div class="text-[11px] mb-2" style="color:var(--text-faint)">Artifacts</div>
            <div class="space-y-1.5">
              ${relics.map(r=>`
                <div class="flex items-center justify-between gap-2 text-[11.5px] rounded-lg px-2.5 py-2" style="background:rgba(255,255,255,.03)">
                  <div class="min-w-0">
                    <div class="font-medium truncate">${r.name}</div>
                    <div class="truncate" style="color:var(--text-faint)">${r.pos_name} · ${r.set_name}</div>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    ${rarityStars(r.rarity)}
                    <span class="mono" style="color:var(--text-dim)">+${r.level}</span>
                  </div>
                </div>`).join('')}
            </div>
          ` : `<div class="text-[11.5px]" style="color:var(--text-faint)">No artifacts equipped</div>`}
        </div>
      </div>
    </div>`;
}
function toggleAvatarCard(btn){
  const detail = btn.nextElementSibling;
  const icon = btn.querySelector('.chev-ic');
  const isOpen = detail.style.display !== 'none';
  detail.style.display = isOpen ? 'none' : 'block';
  if(icon) icon.style.transform = isOpen ? '' : 'rotate(90deg)';
}

async function renderCalendar(panel){
  if(!Sayraa.user) return panel.innerHTML = genshinSignInPrompt();
  const acc = activeGenshinAccount();
  if(!acc) return panel.innerHTML = genshinNoAccountPrompt();

  try{
    let res = await fetch(`${GENSHIN_BASE}/accounts/${acc.id}/checkin-list`, { headers: genshinAuthHeaders() });
    if(res.status === 404 || res.status === 405){
      res = await fetch(`${GENSHIN_BASE}/accounts/${acc.id}/checkin-list`, { method: 'POST', headers: genshinAuthHeaders() });
    }
    const d = await res.json();
    if(!res.ok || d.ok === false) throw new Error(d.message || 'Failed to load rewards calendar');

    const monthlyAwards = d.monthly_awards || [];
    const extraAwards = d.extra_awards || [];

    panel.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-[14px]">Check-in Rewards${d.month ? ` — Month ${d.month}` : ''}</h3>
        ${d.resign_available ? `<span class="pill" style="background:rgba(245,166,35,.14); color:var(--amber)">Re-sign available</span>` : ''}
      </div>
      <div class="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-4">
        ${monthlyAwards.map(a=>`
          <div class="glass card p-2.5 text-center ${a.claimed ? 'opacity-50' : ''}">
            <div class="text-[10px]" style="color:var(--text-faint)">Day ${a.day}</div>
            ${a.icon ? `<img src="${a.icon}" class="w-7 h-7 mx-auto my-1 object-contain" onerror="this.style.display='none'">` : ''}
            <div class="text-[10.5px] font-medium mt-1 truncate">${a.name}</div>
            <div class="text-[11px] mono" style="color:var(--teal)">×${a.count}</div>
          </div>`).join('')}
      </div>
      ${extraAwards.length ? `
        <h3 class="font-semibold text-[14px] mb-2.5">Bonus Rewards</h3>
        <div class="space-y-2">
          ${extraAwards.map(e=>`
            <div class="glass card p-3.5 flex items-center gap-3">
              <div class="icon-tile" style="background:rgba(124,111,240,.14); color:var(--accent)"><i class="fa-solid fa-star"></i></div>
              <div class="flex-1">
                <div class="text-[13px] font-medium">Sign for ${e.sign_day_required} day${e.sign_day_required>1?'s':''}</div>
                <div class="text-[11.5px]" style="color:var(--text-dim)">×${e.count} bonus reward</div>
              </div>
              ${e.is_highlight ? `<span class="pill" style="background:rgba(52,214,180,.14); color:var(--teal)">Featured</span>` : ''}
            </div>`).join('')}
        </div>
      ` : ''}
    `;
  } catch(err){
    panel.innerHTML = genshinErrorCard(err.message || 'Failed to load rewards calendar');
  }
}
function timeAgo(iso){
  const diff = Math.max(1, Math.round((Date.now()-new Date(iso).getTime())/60000));
  if(diff < 60) return `${diff}m ago`;
  return `${Math.round(diff/60)}h ago`;
}


/* ============ OTHER SETTINGS ============ */
function renderAccentSwatches(){
  const wrap = document.getElementById('accent-swatches');
  wrap.innerHTML = ACCENTS.map(c=>`<button class="accent-swatch ${c===Sayraa.accent?'active':''}" style="background:${c}" onclick="setAccent('${c}', this)"></button>`).join('');
}
function setAccent(c, el){
  Sayraa.accent = c;
  document.documentElement.style.setProperty('--accent', c);
  document.documentElement.style.setProperty('--accent-soft', c+'24');
  document.querySelectorAll('.accent-swatch').forEach(s=>s.classList.remove('active'));
  el.classList.add('active');
  
  if (Sayraa.user) {
    let key = 'cyan';
    if(c === '#7c6ff0') key = 'purple';
    if(c === '#34d6b4') key = 'cyan';
    if(c === '#f5a623') key = 'amber';
    if(c === '#f4586b') key = 'red';
    if(c === '#5aa7ef') key = 'blue';

    fetch(SETTINGS_BASE, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${Sayraa.user.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ accent: key })
    }).catch(e=>{});
  }
}

function getDeviceInfo() {
    const ua = navigator.userAgent;
    let device = "Unknown";
    let os = "Unknown";

    if (/iPhone/i.test(ua)) device = "iPhone";
    else if (/iPad/i.test(ua)) device = "iPad";
    else if (/Android/i.test(ua)) device = "Android";
    else if (/Macintosh|Mac OS X/i.test(ua)) device = "Mac";
    else if (/Windows/i.test(ua)) device = "Windows";
    else if (/Linux/i.test(ua)) device = "Linux";

    const ios = ua.match(/OS (\d+)[._](\d+)(?:[._](\d+))?/);
    if (ios) os = `iOS ${ios[1]}.${ios[2]}${ios[3] ? "." + ios[3] : ""}`;

    const android = ua.match(/Android (\d+(?:\.\d+)?)/);
    if (android) os = `Android ${android[1]}`;

    const win = ua.match(/Windows NT ([\d.]+)/);
    if (win) os = `Windows ${win[1]}`;

    const mac = ua.match(/Mac OS X (\d+)[._](\d+)(?:[._](\d+))?/);
    if (mac && device === "Mac") os = `macOS ${mac[1]}.${mac[2]}${mac[3] ? "." + mac[3] : ""}`;

    return `${device} (${os})`;
}
