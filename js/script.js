/* ============ THEME / APPEARANCE SYSTEM ============ */
const VALID_APPEARANCES = ['system', 'dark', 'light', 'classic_dark'];

function getStoredAppearance() {
  try {
    const saved = localStorage.getItem('appearance') || localStorage.getItem('sayraa_theme');
    if (saved && VALID_APPEARANCES.includes(saved.toLowerCase())) {
      return saved.toLowerCase();
    }
  } catch (e) {}
  return 'system';
}

function getEffectiveTheme(appearance) {
  if (appearance === 'system') {
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDark ? 'dark' : 'light';
  }
  return appearance;
}

function applyThemeDOM(appearance) {
  const effective = getEffectiveTheme(appearance);
  document.documentElement.setAttribute('data-theme', appearance);
  document.documentElement.setAttribute('data-theme-effective', effective);
}

let systemMediaListenerAttached = false;
function initSystemThemeListener() {
  if (systemMediaListenerAttached || !window.matchMedia) return;
  systemMediaListenerAttached = true;

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemChange = () => {
    if (Sayraa.theme === 'system') {
      applyThemeDOM('system');
    }
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleSystemChange);
  } else if (mediaQuery.addListener) {
    mediaQuery.addListener(handleSystemChange);
  }
}

/* ============ STATE (in-memory & synced with localStorage) ============ */
const Sayraa = {
  user: null, // {name, email, avatar, providers:[], token}
  devMode: false,
  accent: '#7c6ff0',
  theme: getStoredAppearance(),
  currentRoute: 'dashboard',
  marketCategory: 'All',
  marketSearch: '',
};

const ACCENTS = ['#7c6ff0','#34d6b4','#f5a623','#f4586b','#5aa7ef'];
const OAUTH_BASE = 'https://apis.elyriax.com/v1/auth';
const SETTINGS_BASE = 'https://apis.elyriax.com/v1/settings';

const MODULES = [
  { id:'markets', route:'markets', name:'Markets & Store', icon:'fa-basket-shopping', color:'#7c6ff0', live:true, desc:'Digital accounts, mailboxes, API keys & game goods.', activity:'Instant delivery 24/7' },
  { id:'genshin', route:'genshin', name:'Genshin Impact', icon:'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://genshin.hoyoverse.com&size=256', color:'#f5a623', live:true, desc:'Banners, gift codes, check-in & account stats.', activity:'Banners synced' },
  { id:'wallet', route:'wallet', name:'Wallet & VietQR', icon:'fa-wallet', color:'#34d6b4', live:true, desc:'Top up balance via VietQR 24/7 & review history.', activity:'VietQR 24/7' },
  { id:'orders', route:'orders', name:'Orders & Library', icon:'fa-box-open', color:'#f4586b', live:true, desc:'Access purchased digital goods & credentials.', activity:'Instant access' },
  { id:'vietsub', route:'vietsub', name:'AI Vietsub Studio', icon:'fa-video', color:'#10b981', live:true, desc:'Trình dựng video & Vietsub Douyin AI tự động chuẩn CapCut.', activity:'Studio Ready' },
  { id:'apis', route:'apis', name:'Developer APIs', icon:'fa-plug', color:'#5aa7ef', live:false, desc:'High performance APIs with developer keys & docs.', activity:'In development' },
  { id:'downloader', route:'downloader', name:'Downloader', icon:'fa-download', color:'#34d6b4', live:false, desc:'Download high-res video & audio from any link.', activity:'In development' },
  { id:'ai', route:'ai', name:'AI Tools', icon:'fa-sparkles', color:'#c99a5b', live:false, desc:'Chat, summarize, translate & generate with AI.', activity:'In development' },
  { id:'translation', route:'translation', name:'Translation', icon:'fa-language', color:'#f4586b', live:false, desc:'Accurate neural translation across 40+ languages.', activity:'In development' },
  { id:'image', route:'image', name:'Image Tools', icon:'fa-image', color:'#8b9a68', live:false, desc:'Compress, convert and manipulate image assets.', activity:'In development' },
  { id:'auth', route:'settings', name:'Account & Settings', icon:'fa-fingerprint', color:'#7c6ff0', live:true, desc:'OAuth 2.0 multi-provider login & preferences.', activity:'Ready — synced' }
];

const GAME_LIST = [
  {
    id: 'genshin',
    route: 'genshin',
    name: 'Genshin Impact',
    studio: 'HoYoverse',
    genre: 'Open-world Action RPG',
    desc: 'Banners gacha, gift codes quà tặng, điểm danh tự động và thống kê nhân vật Teyvat.',
    icon: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://genshin.hoyoverse.com&size=256',
    fallbackIcon: 'fa-solid fa-gamepad',
    color: '#f5a623',
    banner: 'radial-gradient(120% 100% at 80% 20%, rgba(245,166,35,.35), transparent 70%), linear-gradient(135deg, rgba(245,166,35,.2), rgba(124,111,240,.15))',
    tags: ['Banners', 'Gift Codes', 'Daily Check-in', 'Role Stats'],
    activity: '2 endpoints synced',
    live: true
  },
  {
    id: 'hsr',
    route: 'hsr',
    name: 'Honkai: Star Rail',
    studio: 'HoYoverse',
    genre: 'Space Fantasy RPG',
    desc: 'Khám phá dải ngân hà cùng Đội Tàu Astral, theo dõi Bước Nhảy và tài nguyên hàng ngày.',
    icon: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://hsr.hoyoverse.com&size=256',
    fallbackIcon: 'fa-solid fa-train',
    color: '#5aa7ef',
    banner: 'radial-gradient(120% 100% at 80% 20%, rgba(90,167,239,.35), transparent 70%), linear-gradient(135deg, rgba(90,167,239,.2), rgba(52,214,180,.15))',
    tags: ['Warps', 'Daily Rewards', 'Trailblaze Hub'],
    activity: 'In development',
    live: false
  },
  {
    id: 'zzz',
    route: 'zzz',
    name: 'Zenless Zone Zero',
    studio: 'HoYoverse',
    genre: 'Urban Fantasy Action RPG',
    desc: 'Hành trình cùng các Proxy khám phá Lỗ Hổng tại New Eridu với hệ thống tiện ích tối ưu.',
    icon: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://zenless.hoyoverse.com&size=256',
    fallbackIcon: 'fa-solid fa-bolt-lightning',
    color: '#f4586b',
    banner: 'radial-gradient(120% 100% at 80% 20%, rgba(244,88,107,.35), transparent 70%), linear-gradient(135deg, rgba(244,88,107,.2), rgba(245,166,35,.15))',
    tags: ['Signals', 'Proxy Tools', 'Hollow Zero'],
    activity: 'In development',
    live: false
  },
  {
    id: 'wuwa',
    route: 'wuwa',
    name: 'Wuthering Waves',
    studio: 'Kuro Games',
    genre: 'Open-world Action RPG',
    desc: 'Thám hiểm hành tinh Solaris-3, theo dõi Triệu Hồi Convene, thu thập Echoes và sự kiện.',
    icon: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://wutheringwaves.kurogames.com&size=256',
    fallbackIcon: 'fa-solid fa-wind',
    color: '#34d6b4',
    banner: 'radial-gradient(120% 100% at 80% 20%, rgba(52,214,180,.35), transparent 70%), linear-gradient(135deg, rgba(52,214,180,.2), rgba(90,167,239,.15))',
    tags: ['Convenes', 'Echo Database', 'Event Tracker'],
    activity: 'In development',
    live: false
  }
];
const TAB_GROUP = { genshin:'games', hsr:'games', zzz:'games', wuwa:'games', wallet:'markets', wishlist:'markets', orders:'markets', order:'markets', vietsub:'apis', studio:'apis' };

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
	
  markets:{title:'Markets', sub:'Digital accounts, mailboxes & API keys'},
  wallet:{title:'Wallet', sub:'Manage balance, deposit & transactions'},
  wishlist:{title:'Wishlist', sub:'Your saved products'},
  orders:{title:'Orders', sub:'Your purchase history & resources'},
  order:{title:'Orders', sub:'Your purchase history & resources'},
	
  downloader:{title:'Downloader', sub:'Coming soon'},
  apis:{title:'Developer APIs', sub:'Coming soon'},
  translation:{title:'Translation', sub:'Coming soon'},
  ai:{title:'AI Tools', sub:'Coming soon'},
  image:{title:'Image Tools', sub:'Coming soon'},
  settings:{title:'Settings', sub:'Manage your account'},
  terms:{title:'Terms of Service', sub:'Legal agreements'},
  privacy:{title:'Privacy Policy', sub:'Data handling practices'},
  vietsub:{title:'AI Vietsub Studio', sub:'CapCut AI Video & Subtitle Editor'},
  studio:{title:'AI Vietsub Studio', sub:'CapCut AI Video & Subtitle Editor'},
  portfolio:{title:'Developer Profile', sub:'Shiori Saiky // Full-Stack & Backend Systems'},
  profile:{title:'Developer Profile', sub:'Shiori Saiky // Full-Stack & Backend Systems'}

};

function getRouteFromUrl() {
  // 0. Query parameter hoặc stored redirect
  const params = new URLSearchParams(window.location.search);
  const queryRoute = params.get('route');
  if (queryRoute && ROUTE_META[queryRoute]) {
    return queryRoute;
  }

  const storedRedirect = sessionStorage.getItem('elyriax_redirect_route');
  if (storedRedirect) {
    sessionStorage.removeItem('elyriax_redirect_route');
    if (ROUTE_META[storedRedirect]) return storedRedirect;
  }

  // 1. Phân tích đường dẫn pathname (bỏ #)
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  const firstSegment = path.split('/')[0].replace(/\.html$/, '');

  if (firstSegment && ROUTE_META[firstSegment]) {
    return firstSegment;
  }

  // 2. Phân tích hash nếu có (tự động chuyển đổi sạch)
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if (hash && ROUTE_META[hash]) {
    return hash;
  }

  return 'dashboard';
}

function navigate(route, updateHistory = true){
  closeSheet();
  if (route === 'order') route = 'orders';

  if (updateHistory) {
    const currentRoute = getRouteFromUrl();
    const newPath = route === 'dashboard' ? '/' : `/${route}`;
    
    if (currentRoute !== route || window.location.hash || window.location.pathname !== newPath) {
      try {
        history.pushState({ route }, '', newPath);
      } catch (e) {}
    }
  }

  renderView(route);
}

async function loadAsyncView(section, callback) {
  if (section.dataset.loaded) {
    if (typeof callback === 'function') callback();
    return;
  }
  const src = section.dataset.src;
  if (!src) return;
  
  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error('Failed to load content');
    const text = await res.text();
    if (text.includes('<main')) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const mainContent = doc.querySelector('main');
      section.innerHTML = mainContent ? mainContent.innerHTML : text;
    } else {
      section.innerHTML = text;
    }
    section.dataset.loaded = 'true';
    if (typeof callback === 'function') callback();
  } catch (e) {
    section.innerHTML = `<div class="p-6 text-center text-[var(--rose)]">Không thể tải nội dung. Vui lòng thử lại sau.</div>`;
  }
}


function renderView(route) {
  if (route === 'order') route = 'orders';

  Sayraa.currentRoute = route;
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active', v.dataset.view===route));
  document.querySelectorAll('.nav-link,.nav-sub').forEach(l=>l.classList.toggle('active', l.dataset.route===route || (route==='orders' && l.dataset.route==='order')));
  const tabRoute = TAB_GROUP[route] || route;
  document.querySelectorAll('.tab-btn').forEach(l=>l.classList.toggle('active', l.dataset.route===tabRoute));
  const meta = ROUTE_META[route] || {title:route, sub:''};
  document.getElementById('topbar-title').textContent = meta.title;
  document.getElementById('topbar-sub').textContent = meta.sub;
  closeDrawer();
  document.title = (meta.title || 'Elyriax') + ' — Elyriax';
  window.scrollTo({top:0, behavior:'smooth'});

  const mainEl = document.querySelector('main');
  if (mainEl) {
    if (route === 'vietsub' || route === 'studio') {
      mainEl.classList.remove('max-w-5xl');
      mainEl.classList.add('max-w-[1550px]');
    } else {
      mainEl.classList.remove('max-w-[1550px]');
      mainEl.classList.add('max-w-5xl');
    }
  }

  if (route === 'dashboard') {
    renderDashboard();
  } else if (route === 'games') {
    renderGamesDashboard();
  } else if (route === 'wallet') {
    renderWalletPage();
  } else if (route === 'orders') {
    renderOrdersPage();
  } else if (route === 'wishlist') {
    renderWishlistPage();
  } else if (route === 'markets') {
    renderMarkets();
  } else if (route === 'settings') {
    if (Sayraa.user) fetchSettings();
  }
  
  const soonSection = document.querySelector(`section[data-view="${route}"][data-icon]`);
  if(soonSection && !soonSection.dataset.rendered) renderComingSoon(soonSection);

  // Load Async View và bind App Init nếu là Vietsub
  const asyncSection = document.querySelector(`section[data-view="${route}"][data-src]`);
  if(asyncSection) {
    loadAsyncView(asyncSection, () => {
      if ((route === 'vietsub' || route === 'studio') && typeof VietsubApp !== 'undefined' && typeof VietsubApp.init === 'function') {
        VietsubApp.init();
      }
    });
  }
}

window.addEventListener('popstate', (e) => {
  const route = (e.state && e.state.route) || getRouteFromUrl();
  if (ROUTE_META[route]) {
    renderView(route);
  } else {
    renderView('dashboard');
  }
});

window.addEventListener('hashchange', () => {
  const route = getRouteFromUrl();
  const cleanPath = route === 'dashboard' ? '/' : `/${route}`;
  try {
    history.replaceState({ route }, '', cleanPath);
  } catch (e) {}
  if (ROUTE_META[route]) renderView(route); else renderView('dashboard');
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
  const wrap = document.getElementById('toast-wrap');
  if (!wrap) return;

  // Prevent spamming identical toast if already visible
  const isDuplicate = Array.from(wrap.querySelectorAll('.toast span')).some(s => s.textContent === msg);
  if (isDuplicate) return;

  const icons = {success:'fa-circle-check', error:'fa-circle-exclamation', info:'fa-circle-info'};
  const colors = {success:'var(--teal)', error:'var(--rose)', info:'var(--accent)'};
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<i class="fa-solid ${icons[type]||icons.info}" style="color:${colors[type]||colors.info}"></i><span>${msg}</span>`;
  wrap.appendChild(el);
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

function renderDashboard() {
  const u = Sayraa.user;
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Chào buổi sáng' : (hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối');
  const greetingText = u ? `${timeGreeting}, ${u.name.split(' ')[0]}!` : `${timeGreeting}, chào mừng bạn đến với Elyriax!`;

  // 1. Render Hero Banner
  const heroEl = document.getElementById('dash-hero');
  if (heroEl) {
    const avatarHTML = u ? getAvatarHTML(u.avatar, u.name) : '<i class="fa-solid fa-user text-[20px]"></i>';
    
    heroEl.innerHTML = `
      <div class="glass card p-5 sm:p-6 relative overflow-hidden bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent border border-white/10">
        <div class="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-[var(--accent)]/10 blur-3xl pointer-events-none"></div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div class="flex items-start sm:items-center gap-3.5 min-w-0">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-[16px] glass overflow-hidden shrink-0 shadow-lg border border-white/10" style="background:linear-gradient(135deg, rgba(124,111,240,.2), rgba(52,214,180,.1))">
              ${avatarHTML}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h1 class="display text-[20px] sm:text-[23px] font-extrabold tracking-tight truncate" id="dash-greeting">${greetingText}</h1>
                <span class="pill px-2 py-0.5 text-[10.5px]" style="background:${u ? 'rgba(52,214,180,.12)' : 'rgba(255,255,255,.06)'}; color:${u ? 'var(--teal)' : 'var(--text-faint)'}">
                  <i class="fa-solid ${u ? 'fa-circle-check' : 'fa-user'} mr-1"></i>${u ? 'Member' : 'Guest'}
                </span>
              </div>
              <p class="text-[12.5px] sm:text-[13px] mt-1 truncate" style="color:var(--text-dim)">
                ${u ? `Tài khoản đã đồng bộ · ${u.email}` : 'Nền tảng giao dịch tài khoản, công cụ game & tiện ích số 24/7.'}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 sm:self-center shrink-0">
            ${u ? `
              <button class="btn btn-ghost btn-sm" onclick="navigate('orders')">
                <i class="fa-solid fa-box-open"></i> Đơn hàng
              </button>
              <button class="btn btn-primary btn-sm" onclick="openDepositSheet()">
                <i class="fa-solid fa-plus"></i> Nạp tiền
              </button>
            ` : `
              <button class="btn btn-ghost btn-sm" onclick="navigate('markets')">
                <i class="fa-solid fa-basket-shopping"></i> Xem Market
              </button>
              <button class="btn btn-primary btn-sm" onclick="openLoginSheet()">
                <i class="fa-solid fa-right-to-bracket"></i> Đăng nhập
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }

  // 2. Render Live Metrics Ribbon
  const statsEl = document.getElementById('dash-stats');
  if (statsEl) {
    const liveModulesCount = MODULES.filter(m => m.live).length;
    const balanceNum = (MARKET_WALLET && MARKET_WALLET.balance) ? MARKET_WALLET.balance : 0;
    const productsCount = (typeof MARKET_PRODUCTS !== 'undefined' && MARKET_PRODUCTS.length) ? (MARKET_PAGINATION?.total || MARKET_PRODUCTS.length) : '40+';

    statsEl.innerHTML = `
      <div class="glass module-card card p-3.5 sm:p-4 cursor-pointer" onclick="navigate('wallet')">
        <div class="flex items-center justify-between text-[11.5px]" style="color:var(--text-faint)">
          <span>Số dư khả dụng</span>
          <i class="fa-solid fa-wallet text-[var(--teal)]"></i>
        </div>
        <div class="display font-extrabold text-[18px] sm:text-[20px] mono mt-1 text-[var(--teal)] truncate">
          ${u ? formatMarketPrice(balanceNum) : '—'}
        </div>
        <div class="text-[10.5px] mt-1 truncate" style="color:var(--text-dim)">
          ${u ? 'VietQR tự động 24/7' : 'Đăng nhập để xem'}
        </div>
      </div>

      <div class="glass module-card card p-3.5 sm:p-4 cursor-pointer" onclick="navigate('markets')">
        <div class="flex items-center justify-between text-[11.5px]" style="color:var(--text-faint)">
          <span>Marketplace</span>
          <i class="fa-solid fa-basket-shopping text-[var(--accent)]"></i>
        </div>
        <div class="display font-extrabold text-[18px] sm:text-[20px] mono mt-1 text-[var(--text)]">
          ${productsCount}
        </div>
        <div class="text-[10.5px] mt-1 text-[var(--accent)] font-medium">
          Tài khoản &amp; API keys
        </div>
      </div>

      <div class="glass module-card card p-3.5 sm:p-4 cursor-pointer" onclick="navigate('genshin')">
        <div class="flex items-center justify-between text-[11.5px]" style="color:var(--text-faint)">
          <span>Game Tools</span>
          <i class="fa-solid fa-gamepad text-[var(--amber)]"></i>
        </div>
        <div class="display font-extrabold text-[18px] sm:text-[20px] mt-1 text-[var(--text)]">
          4 Games
        </div>
        <div class="text-[10.5px] mt-1 text-[var(--amber)] font-medium">
          Banners &amp; Check-in
        </div>
      </div>

      <div class="glass module-card card p-3.5 sm:p-4">
        <div class="flex items-center justify-between text-[11.5px]" style="color:var(--text-faint)">
          <span>Hệ thống</span>
          <span class="status-dot on"></span>
        </div>
        <div class="display font-extrabold text-[16px] sm:text-[18px] mt-1 text-[var(--teal)] flex items-center gap-1.5">
          Online
        </div>
        <div class="text-[10.5px] mt-1 mono" style="color:var(--text-faint)">
          ${liveModulesCount} dịch vụ sẵn sàng
        </div>
      </div>
    `;
  }

  // 3. Render Spotlight Launchpad
  const launchpadEl = document.getElementById('dash-launchpad');
  if (launchpadEl) {
    launchpadEl.innerHTML = `
      <!-- Spotlight 1: AI Vietsub Studio -->
      <div class="glass module-card card p-4 cursor-pointer relative overflow-hidden flex flex-col justify-between group" onclick="navigate('vietsub')">
        <div>
          <div class="flex items-center justify-between mb-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-[18px]" style="background:rgba(52,214,180,.15); color:var(--teal)">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
            </div>
            <span class="pill" style="background:rgba(52,214,180,.12); color:var(--teal)">CapCut AI</span>
          </div>
          <h3 class="font-bold text-[15px] mb-1 group-hover:text-[var(--teal)] transition-colors">AI Vietsub Studio</h3>
          <p class="text-[12px] mb-3 leading-relaxed" style="color:var(--text-dim)">Dựng video &amp; phụ đề Douyin tự động. Xóa sub cũ kính mờ, Whisper &amp; Gemini AI.</p>
        </div>
        <div class="flex items-center justify-between pt-3 border-t border-white/5 text-[12px] font-semibold" style="color:var(--teal)">
          <span>Mở Studio Dựng Phim</span>
          <i class="fa-solid fa-arrow-right text-[11px] group-hover:translate-x-1 transition-transform"></i>
        </div>
      </div>

      <!-- Spotlight 2: Markets -->
      <div class="glass module-card card p-4 cursor-pointer relative overflow-hidden flex flex-col justify-between group" onclick="navigate('markets')">
        <div>
          <div class="flex items-center justify-between mb-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-[18px]" style="background:rgba(124,111,240,.15); color:var(--accent)">
              <i class="fa-solid fa-store"></i>
            </div>
            <span class="pill" style="background:rgba(124,111,240,.12); color:var(--accent)">Live 24/7</span>
          </div>
          <h3 class="font-bold text-[15px] mb-1 group-hover:text-[var(--accent)] transition-colors">Elyriax Markets</h3>
          <p class="text-[12px] mb-3 leading-relaxed" style="color:var(--text-dim)">Kho tài khoản game, email domain, API keys và bản quyền phần mềm chất lượng cao.</p>
        </div>
        <div class="flex items-center justify-between pt-3 border-t border-white/5 text-[12px] font-semibold" style="color:var(--accent)">
          <span>Khám phá ngay</span>
          <i class="fa-solid fa-arrow-right text-[11px] group-hover:translate-x-1 transition-transform"></i>
        </div>
      </div>

      <!-- Spotlight 3: Game Hub -->
      <div class="glass module-card card p-4 cursor-pointer relative overflow-hidden flex flex-col justify-between group" onclick="navigate('genshin')">
        <div>
          <div class="flex items-center justify-between mb-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-[18px]" style="background:rgba(245,166,35,.15); color:var(--amber)">
              <i class="fa-solid fa-gamepad"></i>
            </div>
            <span class="pill" style="background:rgba(245,166,35,.12); color:var(--amber)">Genshin &amp; Hoyo</span>
          </div>
          <h3 class="font-bold text-[15px] mb-1 group-hover:text-[var(--amber)] transition-colors">Game Dashboard</h3>
          <p class="text-[12px] mb-3 leading-relaxed" style="color:var(--text-dim)">Theo dõi Banners, Gift Codes, Điểm danh tự động và thống kê nhân vật Genshin Impact.</p>
        </div>
        <div class="flex items-center justify-between pt-3 border-t border-white/5 text-[12px] font-semibold" style="color:var(--amber)">
          <span>Mở Game Tools</span>
          <i class="fa-solid fa-arrow-right text-[11px] group-hover:translate-x-1 transition-transform"></i>
        </div>
      </div>
    `;
  }

  // 4. Render All Services Grid
  const countEl = document.getElementById('dash-modules-count');
  if (countEl) countEl.textContent = `${MODULES.length} services`;

  const grid = document.getElementById('dashboard-grid');
  if (grid) {
    grid.innerHTML = MODULES.map(m => {
      const isUrl = m.icon.startsWith('http');
      const iconContent = isUrl
        ? `<img src="${m.icon}" alt="${m.name}" class="w-6 h-6 object-contain" />`
        : `<i class="fa-solid ${m.icon} text-[18px]"></i>`;

      return `
      <div class="glass module-card card p-4 cursor-pointer group" onclick="navigate('${m.route}')">
        <div class="flex items-start gap-3.5">
          <div class="icon-tile shrink-0 overflow-hidden" style="background:${m.color}22; color:${m.color}">
            ${iconContent}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-[14px] truncate group-hover:text-[var(--accent)] transition-colors">${m.name}</h3>
              <span class="status-dot ${m.live ? 'on' : 'soon'}"></span>
            </div>
            <p class="text-[12px] mt-1 line-clamp-1" style="color:var(--text-dim)">${m.desc}</p>
            <div class="flex items-center justify-between mt-3 pt-2.5 border-t border-white/5 text-[11.5px]">
              <span class="mono truncate mr-2" style="color:var(--text-faint)">${m.activity}</span>
              <span class="font-semibold shrink-0 flex items-center gap-1" style="color:${m.live ? m.color : 'var(--text-faint)'}">
                ${m.live ? 'Truy cập' : 'Sắp có'}
                <i class="fa-solid fa-chevron-right text-[9px] group-hover:translate-x-0.5 transition-transform"></i>
              </span>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
  }
}

function renderGamesDashboard() {
  const grid = document.getElementById('games-grid');
  if (!grid) return;

  grid.innerHTML = GAME_LIST.map(g => {
    const isUrl = g.icon && g.icon.startsWith('http');
    const fallback = g.fallbackIcon || 'fa-solid fa-gamepad';
    const iconContent = isUrl
      ? `<img src="${g.icon}" alt="${g.name}" class="w-full h-full object-contain p-1 rounded-xl" onerror="this.outerHTML='<i class=\\'${fallback}\\'></i>'">`
      : `<i class="${fallback} text-[20px]"></i>`;

    const tagPills = (g.tags || []).map(t =>
      `<span class="text-[10.5px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 font-medium" style="color:var(--text-dim)">${t}</span>`
    ).join('');

    return `
    <div class="glass module-card game-card card cursor-pointer flex flex-col justify-between group" onclick="navigate('${g.route}')">
      <div>
        <!-- Game Banner Header -->
        <div class="game-banner flex items-center justify-between px-4" style="background:${g.banner}">
          <span class="mono text-[10.5px] uppercase tracking-wider font-semibold" style="color:rgba(255,255,255,.65)">${g.studio || 'Game'}</span>
          <span class="pill text-[10.5px] flex items-center gap-1.5" style="background:${g.live ? 'rgba(52,214,180,.16)' : 'rgba(255,255,255,.08)'}; color:${g.live ? 'var(--teal)' : 'var(--text-faint)'}">
            <span class="status-dot ${g.live ? 'on' : 'soon'}"></span>
            ${g.live ? 'Live Hub' : 'Coming soon'}
          </span>
        </div>

        <!-- Game Content -->
        <div class="p-4 sm:p-4.5 pt-0 relative">
          <!-- Floating Game Icon -->
          <div class="-mt-6 mb-3 flex items-end justify-between">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center glass shadow-lg overflow-hidden border border-white/10" style="background:${g.color}22; color:${g.color}">
              ${iconContent}
            </div>
            <span class="text-[11px] mono truncate max-w-[150px]" style="color:var(--text-faint)">${g.genre || ''}</span>
          </div>

          <h3 class="display font-bold text-[16px] mb-1 group-hover:text-[var(--accent)] transition-colors">${g.name}</h3>
          <p class="text-[12.5px] leading-relaxed mb-3" style="color:var(--text-dim)">${g.desc}</p>

          <!-- Tags -->
          <div class="flex flex-wrap gap-1.5 mb-2">
            ${tagPills}
          </div>
        </div>
      </div>

      <!-- Card Footer -->
      <div class="px-4 pb-4 sm:px-4.5 sm:pb-4.5 pt-3 border-t border-white/5 flex items-center justify-between text-[12px]">
        <span class="mono text-[11px]" style="color:var(--text-faint)">${g.activity}</span>
        <span class="font-semibold flex items-center gap-1 arrow-indicator" style="color:${g.live ? g.color : 'var(--text-faint)'}">
          ${g.live ? 'Mở công cụ' : 'Sắp ra mắt'}
          <i class="fa-solid fa-chevron-right text-[9px] group-hover:translate-x-1 transition-transform"></i>
        </span>
      </div>
    </div>`;
  }).join('');
}

/* ============ MARKETS (Real Backend APIs) ============ */
const MARKET_BASE = 'https://apis.elyriax.com/v1';

let MARKET_PRODUCTS = [];
let MARKET_PAGINATION = { total: 0, page: 1, limit: 12, total_pages: 1 };
let MARKET_CATEGORIES = ['All', 'mail', 'api', 'account', 'license', 'giftcard', 'game'];
const MARKET_STATE = { category: 'All', search: '', page: 1, limit: 12, sort: 'DESC', loading: false };

let MARKET_CART = [];
let MARKET_CART_SUMMARY = { total_items: 0, total_amount: 0, currency: 'VND' };
let MARKET_WISHLIST = [];
let MARKET_WALLET = null;
let DEPOSIT_POLL_INTERVAL = null;

function getMarketAuthHeaders(isJson = false) {
  const h = {};
  const token = (Sayraa.user && Sayraa.user.token) || localStorage.getItem('sayraa_token');
  if (token) h['Authorization'] = `Bearer ${token}`;
  if (isJson) h['Content-Type'] = 'application/json';
  return h;
}

function formatMarketPrice(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

function getCategoryMeta(cat) {
  const c = (cat || '').toLowerCase();
  if (c === 'mail') return { icon: 'fa-solid fa-envelope', color: '#5aa7ef', label: 'Email / Mail' };
  if (c === 'api') return { icon: 'fa-solid fa-code', color: '#34d6b4', label: 'API Keys' };
  if (c === 'account') return { icon: 'fa-solid fa-user-shield', color: '#ea4335', label: 'Accounts' };
  if (c === 'license') return { icon: 'fa-solid fa-key', color: '#7c6ff0', label: 'License / Keys' };
  if (c === 'giftcard') return { icon: 'fa-solid fa-gift', color: '#f5a623', label: 'Giftcard' };
  if (c === 'game') return { icon: 'fa-solid fa-gamepad', color: '#f4586b', label: 'Games' };
  return { icon: 'fa-solid fa-box', color: '#7c6ff0', label: cat || 'General' };
}

function getDeliveryBadge(type) {
  if (type === 'automatic') {
    return `<span class="pill" style="background:rgba(52,214,180,.14); color:var(--teal)"><i class="fa-solid fa-bolt mr-1 text-[9px]"></i>Tự động</span>`;
  }
  return `<span class="pill" style="background:rgba(245,166,35,.14); color:var(--amber)"><i class="fa-solid fa-clock mr-1 text-[9px]"></i>Thủ công</span>`;
}

async function marketApiRequest(endpoint, options = {}) {
  const url = `${MARKET_BASE}${endpoint}`;
  const isJson = options.body && typeof options.body === 'object' && !(options.body instanceof FormData);
  const config = {
    method: options.method || 'GET',
    headers: { ...getMarketAuthHeaders(isJson), ...(options.headers || {}) }
  };
  if (isJson) config.body = JSON.stringify(options.body);
  else if (options.body) config.body = options.body;

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, status: res.status, message: data?.message || `Lỗi máy chủ (${res.status})` };
    }
    return data || { success: true };
  } catch (err) {
    console.error('Market API network error:', err);
    return { success: false, message: 'Không thể kết nối đến máy chủ backend. Vui lòng thử lại.' };
  }
}

function marketEmptyHTML(type) {
  const map = {
    search: { i: 'fa-magnifying-glass', t: 'Không tìm thấy sản phẩm', m: 'Hãy thử tìm kiếm với từ khóa hoặc danh mục khác.', a: '<button class="btn btn-ghost btn-sm mt-4" onclick="clearMarketFilters()">Xóa bộ lọc</button>' },
    cart: { i: 'fa-cart-shopping', t: 'Giỏ hàng đang trống', m: 'Khám phá danh mục sản phẩm và thêm vào giỏ hàng.', a: '<button class="btn btn-primary btn-sm mt-4" onclick="closeSheet()">Bắt đầu mua sắm</button>' },
    wishlist: { i: 'fa-heart', t: 'Chưa có sản phẩm yêu thích', m: 'Lưu lại các sản phẩm bạn quan tâm để mua sau.', a: '<button class="btn btn-primary btn-sm mt-4" onclick="closeSheet()">Xem sản phẩm</button>' },
    orders: { i: 'fa-receipt', t: 'Chưa có đơn hàng nào', m: 'Các đơn hàng đã hoàn tất sẽ hiển thị tại đây.', a: '<button class="btn btn-primary btn-sm mt-4" onclick="closeSheet()">Bắt đầu mua sắm</button>' }
  };
  const x = map[type] || map.search;
  return `<div class="col-span-full market-empty"><div class="market-empty-icon"><i class="fa-solid ${x.i} text-[22px]" style="color:var(--text-faint)"></i></div><h3 class="font-semibold text-[15px] mb-1">${x.t}</h3><p class="text-[13px]" style="color:var(--text-dim)">${x.m}</p>${x.a}</div>`;
}

function showMarketSkeleton() {
  const sk = `<div class="glass module-card card p-3.5 sm:p-4"><div class="flex items-start gap-3 mb-3"><div class="skel w-10 h-10 rounded-xl"></div><div class="flex-1 space-y-2"><div class="flex justify-between"><div class="skel h-4 w-2/3"></div><div class="skel h-4 w-20"></div></div><div class="skel h-3 w-1/3"></div><div class="skel h-3 w-full"></div></div></div><div class="flex justify-between items-center pt-3 border-t border-white/5"><div class="skel h-5 w-16 rounded-full"></div><div class="skel h-8 w-16 rounded-lg"></div></div></div>`;
  const grid = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 col-span-full w-full">${sk}${sk}${sk}${sk}</div>`;
  const gEl = document.getElementById('market-grid');
  const fEl = document.getElementById('market-featured');
  if (gEl) gEl.innerHTML = grid;
  if (fEl) fEl.innerHTML = '';
}

function clearMarketFilters() {
  MARKET_STATE.category = 'All';
  MARKET_STATE.search = '';
  MARKET_STATE.page = 1;
  const el = document.getElementById('market-search');
  if (el) el.value = '';
  showMarketSkeleton();
  fetchProducts();
}

let marketSearchTimer = null;
function searchMarkets(q) {
  clearTimeout(marketSearchTimer);
  marketSearchTimer = setTimeout(() => {
    MARKET_STATE.search = q.trim();
    MARKET_STATE.page = 1;
    showMarketSkeleton();
    fetchProducts();
  }, 350);
}

async function initMarkets() {
  showMarketSkeleton();
  await Promise.all([
    fetchProducts(),
    loadCart(),
    loadWishlist()
  ]);
}

async function fetchProducts(params = {}) {
  MARKET_STATE.loading = true;
  const q = new URLSearchParams();
  if (params.page || MARKET_STATE.page) q.set('page', params.page || MARKET_STATE.page);
  if (params.limit || MARKET_STATE.limit) q.set('limit', params.limit || MARKET_STATE.limit);
  if (MARKET_STATE.category && MARKET_STATE.category !== 'All') q.set('category', MARKET_STATE.category);
  if (MARKET_STATE.search) q.set('search', MARKET_STATE.search);
  if (MARKET_STATE.sort) q.set('sort', MARKET_STATE.sort);

  const res = await marketApiRequest(`/products?${q.toString()}`);
  MARKET_STATE.loading = false;

  if (res && res.success && res.data) {
    MARKET_PRODUCTS = res.data.items || [];
    MARKET_PAGINATION = res.data.pagination || { total: MARKET_PRODUCTS.length, page: 1, limit: 12, total_pages: 1 };
    
    const setOfCats = new Set(['All', 'mail', 'api', 'account', 'license', 'giftcard', 'game']);
    MARKET_PRODUCTS.forEach(p => { if (p.category) setOfCats.add(p.category); });
    MARKET_CATEGORIES = Array.from(setOfCats);
  } else {
    MARKET_PRODUCTS = [];
    if (res && !res.success) {
      showToast('error', res.message || 'Không thể tải danh sách sản phẩm');
    }
  }
  renderMarketCategories();
  renderMarketFeatured();
  renderMarketGrid();
}

function renderMarketCategories() {
  const container = document.getElementById('market-chips');
  if (!container) return;
  container.innerHTML = MARKET_CATEGORIES.map(c => {
    const meta = getCategoryMeta(c);
    const label = c === 'All' ? 'Tất cả' : meta.label;
    return `<button class="tab-pill ${c === MARKET_STATE.category ? 'active' : ''}" onclick="filterMarkets('${c}', this)">${label}</button>`;
  }).join('');
}

function filterMarkets(cat, el) {
  MARKET_STATE.category = cat;
  MARKET_STATE.page = 1;
  document.querySelectorAll('#market-chips .tab-pill').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  showMarketSkeleton();
  fetchProducts();
}

function renderMarketFeatured() {
  const feat = document.getElementById('market-featured');
  if (feat) feat.innerHTML = '';
}

function renderMarketGrid() {
  const grid = document.getElementById('market-grid');
  const countEl = document.getElementById('market-count');
  if (!grid) return;
  if (!MARKET_PRODUCTS.length) {
    grid.innerHTML = marketEmptyHTML('search');
    if (countEl) countEl.textContent = '0 sản phẩm';
    return;
  }
  grid.innerHTML = MARKET_PRODUCTS.map(productCard).join('');
  if (countEl) countEl.textContent = `${MARKET_PAGINATION.total || MARKET_PRODUCTS.length} sản phẩm`;
}

function productCard(p) {
  const isW = MARKET_WISHLIST.includes(p.product_code);
  const stockNum = Number(p.stock) || 0;
  const oos = stockNum <= 0;
  const lowStock = stockNum > 0 && stockNum <= 5;
  const meta = getCategoryMeta(p.category);
  const thumbHTML = p.thumbnail && p.thumbnail.startsWith('http')
    ? `<img src="${p.thumbnail}" class="w-full h-full object-cover rounded-xl" onerror="this.outerHTML='<i class=\\'${meta.icon}\\'></i>'">`
    : `<i class="${meta.icon}"></i>`;

  const stockLabel = oos
    ? '<span class="stock-oos">Out of stock</span>'
    : lowStock
      ? `<span class="stock-low">${stockNum} left</span>`
      : `<span style="color:var(--text-faint)">In stock</span>`;

  return `
  <div class="glass module-card card p-3.5 sm:p-4 cursor-pointer relative" onclick="openProductDetail('${p.product_code}')">
    <button class="wishlist-btn ${isW ? 'on' : ''}" onclick="event.stopPropagation(); toggleWishlist('${p.product_code}')" aria-label="Toggle wishlist">
      <i class="${isW ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
    </button>
    <div class="flex items-start gap-3">
      <div class="icon-tile overflow-hidden" style="background:${meta.color}22; color:${meta.color}">
        ${thumbHTML}
      </div>
      <div class="flex-1 min-w-0 pr-8">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-semibold text-[13.5px] truncate">${p.name}</h3>
          <div class="mono font-bold text-[14px] shrink-0" style="color:var(--text)">${formatMarketPrice(p.price)}</div>
        </div>
        <div class="text-[11px] mt-0.5" style="color:var(--text-faint)">${meta.label}</div>
        <p class="text-[12px] mt-1 line-clamp-1" style="color:var(--text-dim)">${p.description || ''}</p>
      </div>
    </div>
    <div class="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
      <div class="flex items-center gap-2 text-[11px]">
        ${getDeliveryBadge(p.delivery_type)}
        <span class="text-[10.5px]">${stockLabel}</span>
      </div>
      <button class="btn btn-primary btn-sm ${oos ? 'opacity-50 cursor-not-allowed' : ''}" onclick="event.stopPropagation(); ${oos ? '' : `quickAddToCart('${p.product_code}')`}" ${oos ? 'disabled' : ''} aria-label="${oos ? 'Out of stock' : 'Add to cart'}">
        ${oos ? 'Sold out' : '<i class="fa-solid fa-cart-plus"></i> Add'}
      </button>
    </div>
  </div>`;
}

async function openProductDetail(productCode) {
  let p = MARKET_PRODUCTS.find(x => x.product_code === productCode);
  
  openSheet(`
    <div class="p-6 text-center">
      <i class="fa-solid fa-spinner fa-spin text-[20px] text-[var(--accent)] mb-2"></i>
      <div class="text-[13px]" style="color:var(--text-dim)">Đang tải chi tiết sản phẩm...</div>
    </div>
  `);

  const res = await marketApiRequest(`/products/${encodeURIComponent(productCode)}`);
  if (res.success && res.data) {
    p = res.data;
  }

  if (!p) {
    openSheet(`
      <div class="p-6 text-center">
        <i class="fa-solid fa-circle-exclamation text-[28px] text-[var(--rose)] mb-2"></i>
        <h3 class="font-bold text-[16px] mb-1">Không tìm thấy sản phẩm</h3>
        <p class="text-[13px] mb-4" style="color:var(--text-dim)">Sản phẩm này có thể đã ngừng bán hoặc không tồn tại.</p>
        <button class="btn btn-ghost" onclick="closeSheet()">Đóng</button>
      </div>
    `);
    return;
  }

  const isW = MARKET_WISHLIST.includes(p.product_code);
  const stockNum = Number(p.stock) || 0;
  const oos = stockNum <= 0;
  const lowStock = stockNum > 0 && stockNum <= 5;
  const meta = getCategoryMeta(p.category);
  const thumbHTML = p.thumbnail && p.thumbnail.startsWith('http')
    ? `<img src="${p.thumbnail}" class="w-full h-full object-cover rounded-xl" onerror="this.outerHTML='<i class=\\'${meta.icon}\\'>\</i>'">`
    : `<i class="${meta.icon} text-[20px]"></i>`;

  const stockLabel = oos
    ? '<span class="stock-oos">Hết hàng</span>'
    : lowStock
      ? `<span class="stock-low">Chỉ còn ${stockNum} sản phẩm</span>`
      : `${stockNum} có sẵn`;

  window._detailProduct = p;
  window._detailQty = 1;

  openSheet(`
    <div class="flex items-start gap-3 mb-4">
      <div class="icon-tile overflow-hidden" style="background:${meta.color}22; color:${meta.color}">
        ${thumbHTML}
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="display font-bold text-[17px]">${p.name}</h3>
        <div class="text-[12px] mt-0.5" style="color:var(--text-faint)">
          ${meta.label} · <span class="mono">${p.product_code}</span>
        </div>
      </div>
      <button class="wishlist-btn wishlist-btn-lg ${isW ? 'on' : ''}" onclick="toggleWishlist('${p.product_code}'); this.classList.toggle('on'); const ic=this.querySelector('i'); ic.className=this.classList.contains('on')?'fa-solid fa-heart':'fa-regular fa-heart';" aria-label="Toggle wishlist">
        <i class="${isW ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
      </button>
    </div>

    <div class="mono font-extrabold text-[22px] mb-3" id="detail-total">${formatMarketPrice(p.price)}</div>

    <p class="text-[13px] mb-4 whitespace-pre-line" style="color:var(--text-dim)">${p.description || 'Sản phẩm kỹ thuật số chính hãng từ Elyriax.'}</p>

    <div class="flex items-center gap-4 mb-4 text-[12px]" style="color:var(--text-faint)">
      <span><i class="fa-solid fa-box" style="color:var(--accent)"></i> ${stockLabel}</span>
      <span>${getDeliveryBadge(p.delivery_type)}</span>
    </div>

    <div class="flex items-center justify-between mb-5 p-3 rounded-xl" style="background:rgba(255,255,255,.02); border:1px solid var(--line)">
      <div>
        <div class="text-[11px] font-medium" style="color:var(--text-faint)">Số lượng</div>
        <div class="quantity-control mt-1">
          <button onclick="adjustDetailQty(-1)" ${oos ? 'disabled' : ''} aria-label="Decrease quantity">-</button>
          <span id="detail-qty">1</span>
          <button onclick="adjustDetailQty(1)" ${oos ? 'disabled' : ''} aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div class="text-right">
        <div class="text-[11px] font-medium" style="color:var(--text-faint)">Tổng tạm tính</div>
        <div class="font-bold text-[16px] mono mt-0.5" id="detail-subtotal">${formatMarketPrice(p.price)}</div>
      </div>
    </div>

    <button class="btn btn-primary w-full mb-2 ${oos ? 'opacity-50 cursor-not-allowed' : ''}" onclick="${oos ? '' : `confirmAddToCart('${p.product_code}')`}" ${oos ? 'disabled' : ''}>
      ${oos ? 'Hết hàng' : '<i class="fa-solid fa-cart-plus"></i> Thêm vào giỏ'}
    </button>
    ${!oos ? `
      <button class="btn btn-ghost w-full" style="color:var(--teal); border-color:rgba(52,214,180,.25)" onclick="buyNow('${p.product_code}')">
        <i class="fa-solid fa-bolt"></i> Mua ngay
      </button>
    ` : ''}
  `);
}

function adjustDetailQty(delta) {
  if (!window._detailProduct) return;
  const max = typeof window._detailProduct.stock === 'number' ? window._detailProduct.stock : 999;
  window._detailQty = Math.max(1, Math.min(max, (window._detailQty || 1) + delta));
  const el = document.getElementById('detail-qty');
  if (el) el.textContent = window._detailQty;
  const totEl = document.getElementById('detail-total');
  if (totEl) totEl.textContent = formatMarketPrice(Number(window._detailProduct.price) * window._detailQty);
  const subEl = document.getElementById('detail-subtotal');
  if (subEl) subEl.textContent = formatMarketPrice(Number(window._detailProduct.price) * window._detailQty);
}

async function quickAddToCart(productCode) {
  if (!Sayraa.user) {
    showToast('info', 'Vui lòng đăng nhập để thêm vào giỏ hàng');
    openLoginSheet();
    return;
  }
  await apiAddToCart(productCode, 1);
}

async function confirmAddToCart(productCode) {
  if (!Sayraa.user) {
    showToast('info', 'Vui lòng đăng nhập để thêm vào giỏ hàng');
    openLoginSheet();
    return;
  }
  const qty = window._detailQty || 1;
  closeSheet();
  await apiAddToCart(productCode, qty);
}

async function buyNow(productCode) {
  if (!Sayraa.user) {
    showToast('info', 'Vui lòng đăng nhập để thanh toán');
    openLoginSheet();
    return;
  }
  const qty = window._detailQty || 1;
  closeSheet();
  const ok = await apiAddToCart(productCode, qty, false);
  if (ok) openCheckout();
}

/* ============ CART APIS ============ */
async function loadCart() {
  if (!Sayraa.user) {
    MARKET_CART = [];
    MARKET_CART_SUMMARY = { total_items: 0, total_amount: 0, currency: 'VND' };
    updateCartBadge();
    return;
  }
  const res = await marketApiRequest('/cart');
  if (res.success && res.data) {
    MARKET_CART = res.data.items || [];
    MARKET_CART_SUMMARY = res.data.summary || { total_items: MARKET_CART.length, total_amount: 0, currency: 'VND' };
  } else {
    MARKET_CART = [];
    MARKET_CART_SUMMARY = { total_items: 0, total_amount: 0, currency: 'VND' };
  }
  updateCartBadge();
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  const count = MARKET_CART_SUMMARY.total_items || MARKET_CART.reduce((a, b) => a + (b.quantity || 1), 0);
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

async function apiAddToCart(productCode, quantity = 1, showFeedback = true) {
  const res = await marketApiRequest('/cart/items', {
    method: 'POST',
    body: { product_code: productCode, quantity: quantity }
  });
  if (res.success && res.data) {
    MARKET_CART = res.data.items || [];
    MARKET_CART_SUMMARY = res.data.summary || { total_items: MARKET_CART.length, total_amount: 0, currency: 'VND' };
    updateCartBadge();
    if (showFeedback) showToast('success', res.message || 'Đã thêm vào giỏ hàng');
    return true;
  } else {
    showToast('error', res.message || 'Không thể thêm vào giỏ hàng');
    return false;
  }
}

async function apiUpdateCartQty(itemId, newQty) {
  if (newQty <= 0) {
    return apiRemoveFromCart(itemId);
  }
  const res = await marketApiRequest(`/cart/items/${itemId}`, {
    method: 'PATCH',
    body: { quantity: newQty }
  });
  if (res.success) {
    await loadCart();
    renderCart();
  } else {
    showToast('error', res.message || 'Không thể cập nhật số lượng');
  }
}

async function apiRemoveFromCart(itemId) {
  const res = await marketApiRequest(`/cart/items/${itemId}`, {
    method: 'DELETE'
  });
  if (res.success) {
    showToast('info', 'Đã xóa sản phẩm khỏi giỏ hàng');
    await loadCart();
    renderCart();
  } else {
    showToast('error', res.message || 'Không thể xóa sản phẩm');
  }
}

async function apiClearCart() {
  const res = await marketApiRequest('/cart', {
    method: 'DELETE'
  });
  if (res.success) {
    showToast('info', 'Đã dọn dẹp giỏ hàng');
    await loadCart();
    renderCart();
  } else {
    showToast('error', res.message || 'Không thể làm sạch giỏ hàng');
  }
}

async function openCart() {
  if (!Sayraa.user) {
    showToast('info', 'Vui lòng đăng nhập để xem giỏ hàng');
    openLoginSheet();
    return;
  }
  await loadCart();
  renderCart();
}

function renderCart() {
  if (!MARKET_CART || MARKET_CART.length === 0) {
    openSheet(`<h3 class="display font-bold text-[17px] mb-1">Giỏ hàng của bạn</h3>${marketEmptyHTML('cart')}`);
    return;
  }

  const itemsHTML = MARKET_CART.map(item => {
    const meta = getCategoryMeta(item.category);
    const thumbHTML = item.thumbnail && item.thumbnail.startsWith('http')
      ? `<img src="${item.thumbnail}" class="w-full h-full object-cover rounded-lg" onerror="this.outerHTML='<i class=\\'${meta.icon}\\'></i>'">`
      : `<i class="${meta.icon}"></i>`;

    return `
      <div class="flex items-center gap-2.5 sm:gap-3 py-3 border-b" style="border-color:var(--line)">
        <div class="icon-tile overflow-hidden shrink-0" style="background:${meta.color}22; color:${meta.color}">
          ${thumbHTML}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-[13px] font-medium truncate">${item.product_name}</div>
          <div class="text-[11px] truncate mt-0.5" style="color:var(--text-faint)">
            ${formatMarketPrice(item.unit_price)} · ${getDeliveryBadge(item.delivery_type)}
          </div>
        </div>
        <div class="quantity-control shrink-0">
          <button onclick="apiUpdateCartQty(${item.id}, ${item.quantity - 1})" aria-label="Decrease">-</button>
          <span>${item.quantity}</span>
          <button onclick="apiUpdateCartQty(${item.id}, ${item.quantity + 1})" aria-label="Increase">+</button>
        </div>
        <div class="text-[12.5px] sm:text-[13px] font-semibold mono text-right shrink-0 min-w-[64px]">
          ${formatMarketPrice(item.subtotal)}
        </div>
        <button onclick="apiRemoveFromCart(${item.id})" class="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 text-[var(--rose)] shrink-0" aria-label="Remove item">
          <i class="fa-solid fa-trash text-[11px]"></i>
        </button>
      </div>`;
  }).join('');

  const totalAmount = MARKET_CART_SUMMARY.total_amount || MARKET_CART.reduce((s, i) => s + Number(i.subtotal || 0), 0);
  const totalCount = MARKET_CART_SUMMARY.total_items || MARKET_CART.reduce((s, i) => s + i.quantity, 0);

  openSheet(`
    <div class="flex items-center justify-between mb-4">
      <h3 class="display font-bold text-[17px]">Giỏ hàng (${totalCount})</h3>
      <button class="text-[12px] text-[var(--rose)] hover:underline" onclick="apiClearCart()"><i class="fa-solid fa-trash-can mr-1"></i>Xóa tất cả</button>
    </div>
    <div class="max-h-[50vh] overflow-y-auto mb-4">${itemsHTML}</div>
    <div class="border-t pt-4 mb-4" style="border-color:var(--line)">
      <div class="flex items-center justify-between text-[13px] mb-1">
        <span style="color:var(--text-dim)">Tạm tính</span>
        <span class="mono">${formatMarketPrice(totalAmount)}</span>
      </div>
      <div class="flex items-center justify-between text-[15px] font-bold mt-2 pt-2 border-t" style="border-color:var(--line)">
        <span>Tổng thanh toán</span>
        <span class="mono text-[var(--teal)]">${formatMarketPrice(totalAmount)}</span>
      </div>
    </div>
    <button class="btn btn-primary w-full mb-2.5" onclick="openCheckout()">
      <i class="fa-solid fa-credit-card"></i> Tiến hành Thanh toán
    </button>
    <button class="btn btn-ghost w-full" onclick="closeSheet()">Tiếp tục mua hàng</button>
  `);
}

/* ============ ORDERS & ATOMIC CHECKOUT APIS ============ */
async function openCheckout() {
  if (!Sayraa.user) {
    showToast('info', 'Vui lòng đăng nhập để thanh toán');
    openLoginSheet();
    return;
  }
  if (!MARKET_CART || MARKET_CART.length === 0) {
    showToast('error', 'Giỏ hàng của bạn đang trống');
    return;
  }

  const walletRes = await marketApiRequest('/wallet');
  let balance = 0;
  if (walletRes.success && walletRes.data) {
    MARKET_WALLET = walletRes.data;
    balance = Number(walletRes.data.balance) || 0;
  }

  const totalAmount = Number(MARKET_CART_SUMMARY.total_amount || 0);
  const isBalanceEnough = balance >= totalAmount;

  openSheet(`
    <h3 class="display font-bold text-[17px] mb-1">Xác nhận Thanh toán</h3>
    <p class="text-[13px] mb-4" style="color:var(--text-dim)">Thanh toán an toàn nguyên tử bằng số dư Ví Elyriax.</p>
    
    <div class="glass card p-3.5 mb-4 space-y-2">
      <div class="text-[12px] font-semibold mb-1" style="color:var(--text-faint)">TÓM TẮT ĐƠN HÀNG</div>
      <div class="max-h-[30vh] overflow-y-auto space-y-2 divide-y divide-white/5">
        ${MARKET_CART.map(item => `
          <div class="flex items-center justify-between text-[12.5px] pt-1.5">
            <span class="truncate flex-1 mr-2">${item.product_name} ×${item.quantity}</span>
            <span class="mono font-medium">${formatMarketPrice(item.subtotal)}</span>
          </div>
        `).join('')}
      </div>
      <div class="border-t pt-2 mt-2 flex items-center justify-between font-bold text-[14px]" style="border-color:var(--line)">
        <span>Tổng cộng</span>
        <span class="mono text-[var(--accent)] text-[16px]">${formatMarketPrice(totalAmount)}</span>
      </div>
    </div>

    <div class="glass card p-3.5 mb-5 ${isBalanceEnough ? 'border-[var(--line)]' : 'border-[var(--rose)]/30'}">
      <div class="flex items-center justify-between mb-1">
        <span class="text-[12px] font-semibold" style="color:var(--text-dim)">Phương thức thanh toán</span>
        <span class="pill" style="background:rgba(124,111,240,.14); color:var(--accent)"><i class="fa-solid fa-wallet mr-1"></i>Ví Elyriax</span>
      </div>
      <div class="flex items-center justify-between text-[13px] mt-2">
        <span style="color:var(--text-faint)">Số dư khả dụng:</span>
        <span class="mono font-bold ${isBalanceEnough ? 'text-[var(--teal)]' : 'text-[var(--rose)]'}">${formatMarketPrice(balance)}</span>
      </div>
      ${!isBalanceEnough ? `
        <div class="text-[11.5px] text-[var(--rose)] mt-2 flex items-center gap-1.5">
          <i class="fa-solid fa-circle-exclamation"></i> Số dư không đủ để thanh toán (Thiếu ${formatMarketPrice(totalAmount - balance)})
        </div>
        <button class="btn btn-ghost btn-sm w-full mt-3 text-[var(--teal)] border-[var(--teal)]/30" onclick="closeSheet(); openDepositSheet(${totalAmount - balance});">
          <i class="fa-solid fa-plus"></i> Nạp thêm tiền vào ví ngay
        </button>
      ` : ''}
    </div>

    <div class="flex gap-2.5">
      <button class="btn btn-ghost flex-1" onclick="closeSheet(); openCart();">Quay lại</button>
      <button class="btn btn-primary flex-1 ${!isBalanceEnough ? 'opacity-50 cursor-not-allowed' : ''}" id="btn-submit-order" onclick="${isBalanceEnough ? 'submitAtomicCheckout()' : ''}" ${!isBalanceEnough ? 'disabled' : ''}>
        <i class="fa-solid fa-lock"></i> Xác nhận mua
      </button>
    </div>
  `);
}

async function submitAtomicCheckout() {
  const btn = document.getElementById('btn-submit-order');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý giao dịch...';
  }

  const res = await marketApiRequest('/orders', { method: 'POST', body: {} });

  if (res.success && res.data) {
    await Promise.all([loadCart(), loadWalletInfo()]);
    const order = res.data;
    showToast('success', res.message || 'Thanh toán đơn hàng thành công!');
    renderOrderSuccess(order);
  } else {
    showToast('error', res.message || 'Thanh toán thất bại');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-lock"></i> Xác nhận mua';
    }
  }
}

function renderOrderSuccess(order) {
  const deliveryItems = [];
  (order.items || []).forEach(p => {
    if (p.items && p.items.length) {
      p.items.forEach(it => {
        deliveryItems.push({
          product_name: p.product_name,
          product_code: p.product_code,
          identifier: it.identifier,
          content: it.content
        });
      });
    }
  });

  const deliveryHTML = deliveryItems.length ? `
    <div class="mb-4 text-left">
      <div class="text-[12px] font-semibold mb-2" style="color:var(--teal)"><i class="fa-solid fa-box-open mr-1"></i>TÀI NGUYÊN ĐÃ BÀN GIAO TỰ ĐỘNG</div>
      <div class="space-y-2.5 max-h-[35vh] overflow-y-auto">
        ${deliveryItems.map(d => `
          <div class="glass card p-3 rounded-xl border-white/10 bg-white/[0.02]">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[12px] font-semibold text-[var(--accent)]">${d.product_name}</span>
              <button class="btn btn-ghost btn-sm py-1 px-2 text-[11px]" onclick="copyCode('${(d.content || '').replace(/'/g, "\\'")}')">
                <i class="fa-regular fa-copy mr-1"></i>Copy
              </button>
            </div>
            <div class="mono text-[11.5px] p-2 rounded-lg bg-black/40 border border-white/5 break-all select-all text-white/90">
              ${d.content}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : `
    <div class="glass card p-3.5 mb-4 text-left text-[12.5px]" style="color:var(--text-dim)">
      <i class="fa-solid fa-clock text-[var(--amber)] mr-1"></i> Đơn hàng chứa sản phẩm giao thủ công. Chúng tôi sẽ xử lý và liên hệ sớm nhất.
    </div>
  `;

  openSheet(`
    <div class="text-center py-2">
      <div class="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3" style="background:rgba(52,214,180,.14)">
        <i class="fa-solid fa-check text-[24px]" style="color:var(--teal)"></i>
      </div>
      <h3 class="display font-bold text-[18px] mb-1">Thanh toán Thành công!</h3>
      <p class="text-[12.5px] mb-4" style="color:var(--text-dim)">
        Mã đơn hàng: <span class="mono font-bold" style="color:var(--accent)">${order.order_code}</span>
      </p>

      <div class="glass card p-3 mb-4 text-left">
        <div class="flex items-center justify-between text-[12.5px] mb-1">
          <span style="color:var(--text-dim)">Trạng thái</span>
          <span class="pill" style="background:rgba(52,214,180,.14); color:var(--teal)">Hoàn thành</span>
        </div>
        <div class="flex items-center justify-between text-[12.5px]">
          <span style="color:var(--text-dim)">Tổng tiền</span>
          <span class="mono font-bold text-[var(--accent)]">${formatMarketPrice(order.total)}</span>
        </div>
      </div>

      ${deliveryHTML}

      <div class="flex gap-2 mt-4">
        <button class="btn btn-ghost flex-1" onclick="closeSheet()">Đóng</button>
        <button class="btn btn-primary flex-1" onclick="closeSheet(); openOrders();">Lịch sử đơn hàng</button>
      </div>
    </div>
  `);
}

/* =========================================================
   STANDALONE VIEW HELPERS (SKELETONS, GUEST & ERROR STATES)
   ========================================================= */

function renderGuestState(title, desc, icon = 'fa-lock') {
  return `
    <div class="glass card p-8 text-center max-w-md mx-auto my-6">
      <div class="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4" style="background:rgba(124,111,240,.12); color:var(--accent)">
        <i class="fa-solid ${icon} text-[22px]"></i>
      </div>
      <h3 class="display font-bold text-[16.5px] mb-1.5">${title}</h3>
      <p class="text-[13px] mb-5 leading-relaxed" style="color:var(--text-dim)">${desc}</p>
      <button class="btn btn-primary w-full" onclick="openLoginSheet()">
        <i class="fa-solid fa-right-to-bracket"></i> Đăng nhập ngay
      </button>
    </div>
  `;
}

function renderErrorState(title, msg, onRetryStr) {
  return `
    <div class="glass card p-8 text-center max-w-md mx-auto my-6">
      <div class="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4" style="background:rgba(244,88,107,.12); color:var(--rose)">
        <i class="fa-solid fa-circle-exclamation text-[22px]"></i>
      </div>
      <h3 class="display font-bold text-[16px] mb-1.5">${title}</h3>
      <p class="text-[13px] mb-5" style="color:var(--text-dim)">${msg || 'Đã có lỗi xảy ra khi tải dữ liệu từ máy chủ.'}</p>
      <button class="btn btn-ghost" onclick="${onRetryStr}">
        <i class="fa-solid fa-rotate-right mr-1"></i> Thử lại (Retry)
      </button>
    </div>
  `;
}

/* =========================================================
   STANDALONE VIEW: ORDERS PAGE (#orders)
   ========================================================= */

function renderOrdersSkeleton() {
  return `
    <div class="space-y-3">
      <div class="glass card p-4 space-y-2.5">
        <div class="flex justify-between items-center"><div class="skel h-4 w-32"></div><div class="skel h-5 w-20 rounded-md"></div></div>
        <div class="skel h-3 w-48"></div>
        <div class="flex justify-between items-center pt-2 border-t border-white/5"><div class="skel h-3 w-20"></div><div class="skel h-4 w-28"></div></div>
      </div>
      <div class="glass card p-4 space-y-2.5">
        <div class="flex justify-between items-center"><div class="skel h-4 w-36"></div><div class="skel h-5 w-20 rounded-md"></div></div>
        <div class="skel h-3 w-40"></div>
        <div class="flex justify-between items-center pt-2 border-t border-white/5"><div class="skel h-3 w-20"></div><div class="skel h-4 w-28"></div></div>
      </div>
      <div class="glass card p-4 space-y-2.5">
        <div class="flex justify-between items-center"><div class="skel h-4 w-28"></div><div class="skel h-5 w-20 rounded-md"></div></div>
        <div class="skel h-3 w-52"></div>
        <div class="flex justify-between items-center pt-2 border-t border-white/5"><div class="skel h-3 w-20"></div><div class="skel h-4 w-28"></div></div>
      </div>
    </div>
  `;
}

async function renderOrdersPage() {
  const container = document.getElementById('orders-view');
  if (!container) return;

  const headerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="display text-[21px] font-extrabold tracking-tight">Orders</h1>
        <p class="text-[12.5px] mt-0.5" style="color:var(--text-dim)">Your purchase history and delivered digital resources.</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn btn-primary btn-sm" onclick="navigate('markets')"><i class="fa-solid fa-basket-shopping"></i> Mua sắm</button>
      </div>
    </div>
  `;

  if (!Sayraa.user) {
    container.innerHTML = headerHTML + renderGuestState('Đăng nhập để xem Đơn hàng', 'Quản lý lịch sử mua tài nguyên và sao chép nội dung bàn giao tự động bất cứ lúc nào.', 'fa-receipt');
    return;
  }

  container.innerHTML = headerHTML + `<div id="orders-page-content">${renderOrdersSkeleton()}</div>`;

  const res = await marketApiRequest('/orders');
  const contentEl = document.getElementById('orders-page-content');
  if (!contentEl) return;

  if (!res.success) {
    contentEl.innerHTML = renderErrorState('Không thể tải lịch sử đơn hàng', res.message, 'renderOrdersPage()');
    return;
  }

  const orders = (res.data && res.data.items) ? res.data.items : [];

  if (!orders.length) {
    contentEl.innerHTML = `
      <div class="glass card p-8 text-center max-w-md mx-auto my-4">
        <div class="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4" style="background:rgba(255,255,255,.05); color:var(--text-faint)">
          <i class="fa-solid fa-receipt text-[22px]"></i>
        </div>
        <h3 class="display font-bold text-[16px] mb-1.5">Chưa có đơn hàng nào</h3>
        <p class="text-[13px] mb-5 leading-relaxed" style="color:var(--text-dim)">Bạn chưa thực hiện đơn đặt hàng nào. Hãy khám phá Elyriax Market để chọn tài khoản hoặc key API phù hợp.</p>
        <button class="btn btn-primary" onclick="navigate('markets')"><i class="fa-solid fa-basket-shopping mr-1"></i> Khám phá sản phẩm</button>
      </div>
    `;
    return;
  }

  const statusMap = {
    completed: { bg: 'rgba(52,214,180,.14)', color: 'var(--teal)', label: 'Hoàn thành' },
    pending: { bg: 'rgba(245,166,35,.14)', color: 'var(--amber)', label: 'Chờ xử lý' },
    processing: { bg: 'rgba(90,167,239,.14)', color: 'var(--accent)', label: 'Đang xử lý' },
    cancelled: { bg: 'rgba(244,88,107,.14)', color: 'var(--rose)', label: 'Đã hủy' },
    refunded: { bg: 'rgba(124,111,240,.14)', color: 'var(--accent)', label: 'Đã hoàn tiền' },
    failed: { bg: 'rgba(244,88,107,.14)', color: 'var(--rose)', label: 'Thất bại' }
  };

  const listHTML = orders.map(o => {
    const s = statusMap[o.status] || { bg: 'rgba(255,255,255,.05)', color: 'var(--text-dim)', label: o.status };
    const dateStr = new Date(o.created_at).toLocaleString('vi-VN');
    const itemCount = (o.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);

    return `
      <div class="glass card p-4 cursor-pointer hover:border-white/20 transition-all" onclick="openOrderDetail(${o.id})">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="mono text-[14px] font-bold text-[var(--accent)]">${o.order_code}</span>
            <span class="text-[11px] pill" style="background:${s.bg}; color:${s.color}">${s.label}</span>
          </div>
          <span class="w-6 h-6 rounded-md flex items-center justify-center" style="background:rgba(255,255,255,.04); color:var(--text-faint)">
            <i class="fa-solid fa-chevron-right text-[10px]"></i>
          </span>
        </div>
        <div class="text-[11.5px] mb-3" style="color:var(--text-faint)">
          <i class="fa-regular fa-clock mr-1"></i>${dateStr} · <span style="color:var(--text-dim)">${itemCount} sản phẩm</span>
        </div>
        <div class="flex items-center justify-between text-[13px] pt-2.5 border-t border-white/5">
          <span style="color:var(--text-dim)">Tổng thanh toán</span>
          <span class="mono font-bold text-[15px] text-[var(--text)]">${formatMarketPrice(o.total)}</span>
        </div>
      </div>
    `;
  }).join('');

  contentEl.innerHTML = `<div class="space-y-3">${listHTML}</div>`;
}

function openOrders() { navigate('orders'); }

async function openOrderDetail(orderId) {
  openSheet(`
    <div class="p-6 text-center">
      <i class="fa-solid fa-spinner fa-spin text-[20px] text-[var(--accent)] mb-2"></i>
      <div class="text-[13px]" style="color:var(--text-dim)">Đang tải chi tiết đơn hàng...</div>
    </div>
  `);

  const res = await marketApiRequest(`/orders/${orderId}`);
  if (!res.success || !res.data) {
    showToast('error', res.message || 'Không thể tải chi tiết đơn hàng');
    closeSheet();
    return;
  }

  const o = res.data;
  const statusMap = {
    completed: { bg: 'rgba(52,214,180,.14)', color: 'var(--teal)', label: 'Hoàn thành' },
    pending: { bg: 'rgba(245,166,35,.14)', color: 'var(--amber)', label: 'Chờ xử lý' },
    processing: { bg: 'rgba(90,167,239,.14)', color: 'var(--accent)', label: 'Đang xử lý' },
    cancelled: { bg: 'rgba(244,88,107,.14)', color: 'var(--rose)', label: 'Đã hủy' },
    refunded: { bg: 'rgba(124,111,240,.14)', color: 'var(--accent)', label: 'Đã hoàn tiền' }
  };
  const s = statusMap[o.status] || { bg: 'rgba(255,255,255,.05)', color: 'var(--text-dim)', label: o.status };
  const canCancel = o.status === 'pending' || o.status === 'processing';

  const deliveredItems = [];
  (o.items || []).forEach(p => {
    if (p.items && p.items.length) {
      p.items.forEach(it => {
        deliveredItems.push({
          product_name: p.product_name,
          identifier: it.identifier,
          content: it.content
        });
      });
    }
  });

  openSheet(`
    <div class="flex items-center justify-between mb-3">
      <h3 class="display font-bold text-[17px]">Chi tiết Đơn hàng</h3>
      <span class="pill" style="background:${s.bg}; color:${s.color}">${s.label}</span>
    </div>
    <div class="text-[12px] mono mb-4" style="color:var(--text-faint)">
      Mã đơn: <span class="text-[var(--accent)] font-bold">${o.order_code}</span> · ${new Date(o.created_at).toLocaleString('vi-VN')}
    </div>

    <div class="glass card p-3 mb-4 space-y-2">
      <div class="text-[11.5px] font-semibold text-[var(--text-faint)]">DANH SÁCH SẢN PHẨM</div>
      ${(o.items || []).map(it => `
        <div class="flex items-center justify-between text-[12.5px] py-1 border-b border-white/5 last:border-none">
          <div>
            <div class="font-medium">${it.product_name}</div>
            <div class="text-[11px]" style="color:var(--text-faint)">${formatMarketPrice(it.unit_price)} × ${it.quantity}</div>
          </div>
          <span class="mono font-semibold">${formatMarketPrice(it.subtotal)}</span>
        </div>
      `).join('')}
      <div class="border-t pt-2 mt-2 flex items-center justify-between font-bold text-[14px]" style="border-color:var(--line)">
        <span>Tổng thanh toán</span>
        <span class="mono text-[var(--teal)]">${formatMarketPrice(o.total)}</span>
      </div>
    </div>

    ${deliveredItems.length ? `
      <div class="mb-4">
        <div class="text-[12px] font-semibold mb-2" style="color:var(--teal)"><i class="fa-solid fa-box-open mr-1"></i>TÀI NGUYÊN ĐÃ NHẬN</div>
        <div class="space-y-2 max-h-[30vh] overflow-y-auto">
          ${deliveredItems.map(d => `
            <div class="glass card p-3 rounded-xl">
              <div class="flex items-center justify-between mb-1">
                <span class="text-[12px] font-medium text-[var(--accent)]">${d.product_name}</span>
                <button class="btn btn-ghost btn-sm py-0.5 px-2 text-[11px]" onclick="copyCode('${(d.content || '').replace(/'/g, "\\'")}')">
                  <i class="fa-regular fa-copy mr-1"></i>Copy
                </button>
              </div>
              <div class="mono text-[11px] p-2 rounded-lg bg-black/40 border border-white/5 break-all select-all text-white/90">
                ${d.content}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <div class="flex gap-2 mt-4">
      <button class="btn btn-ghost flex-1" onclick="closeSheet()">Đóng</button>
      ${canCancel ? `
        <button class="btn btn-danger flex-1" onclick="cancelOrder(${o.id})">Hủy đơn hàng</button>
      ` : ''}
    </div>
  `);
}

async function cancelOrder(orderId) {
  if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;
  const res = await marketApiRequest(`/orders/${orderId}/cancel`, { method: 'POST' });
  if (res.success) {
    showToast('success', 'Đã hủy đơn hàng thành công');
    openOrderDetail(orderId);
    if (Sayraa.currentRoute === 'orders') renderOrdersPage();
  } else {
    showToast('error', res.message || 'Không thể hủy đơn hàng');
  }
}

/* =========================================================
   STANDALONE VIEW: WALLET PAGE (#wallet)
   ========================================================= */

async function loadWalletInfo() {
  if (!Sayraa.user) {
    MARKET_WALLET = null;
    return null;
  }
  const res = await marketApiRequest('/wallet');
  if (res.success && res.data) {
    MARKET_WALLET = res.data;
    return res.data;
  }
  return null;
}

function renderWalletSkeleton() {
  return `
    <div class="space-y-6">
      <!-- Balance Card Skeleton -->
      <div class="glass card p-5 md:p-6 space-y-4">
        <div class="flex justify-between items-center">
          <div class="skel h-3.5 w-28"></div>
          <div class="skel h-8 w-28 rounded-lg"></div>
        </div>
        <div class="skel h-10 w-56"></div>
        <div class="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div class="space-y-1.5">
            <div class="skel h-3 w-24"></div>
            <div class="skel h-4 w-32"></div>
          </div>
          <div class="space-y-1.5 text-right">
            <div class="skel h-3 w-24 ml-auto"></div>
            <div class="skel h-4 w-32 ml-auto"></div>
          </div>
        </div>
      </div>

      <!-- Quick Deposit Skeleton -->
      <div>
        <div class="skel h-4 w-36 mb-3"></div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div class="skel h-14 rounded-xl"></div>
          <div class="skel h-14 rounded-xl"></div>
          <div class="skel h-14 rounded-xl"></div>
          <div class="skel h-14 rounded-xl"></div>
        </div>
      </div>

      <!-- Transactions Skeleton -->
      <div>
        <div class="skel h-4 w-40 mb-3"></div>
        <div class="glass card p-4 space-y-3">
          <div class="flex items-center justify-between">
            <div class="space-y-1.5"><div class="skel h-4 w-36"></div><div class="skel h-3 w-24"></div></div>
            <div class="skel h-4 w-20"></div>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-white/5">
            <div class="space-y-1.5"><div class="skel h-4 w-40"></div><div class="skel h-3 w-28"></div></div>
            <div class="skel h-4 w-24"></div>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-white/5">
            <div class="space-y-1.5"><div class="skel h-4 w-32"></div><div class="skel h-3 w-20"></div></div>
            <div class="skel h-4 w-16"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function renderWalletPage() {
  const container = document.getElementById('wallet-view');
  if (!container) return;

  const headerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="display text-[21px] font-extrabold tracking-tight">Wallet</h1>
        <p class="text-[12.5px] mt-0.5" style="color:var(--text-dim)">Manage your balance, deposit funds and review transactions.</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn btn-ghost btn-sm" onclick="navigate('markets')"><i class="fa-solid fa-basket-shopping"></i> Market</button>
        <button class="btn btn-primary btn-sm" onclick="openDepositSheet()"><i class="fa-solid fa-plus"></i> Nạp tiền</button>
      </div>
    </div>
  `;

  if (!Sayraa.user) {
    container.innerHTML = headerHTML + renderGuestState('Đăng nhập để xem Ví tiền', 'Theo dõi số dư, nạp tiền tự động qua VietQR 24/7 và thanh toán đơn hàng an toàn.', 'fa-wallet');
    return;
  }

  container.innerHTML = headerHTML + `<div id="wallet-page-content">${renderWalletSkeleton()}</div>`;

  const [walletRes, txRes] = await Promise.all([
    marketApiRequest('/wallet'),
    marketApiRequest('/wallet/transactions')
  ]);

  const contentEl = document.getElementById('wallet-page-content');
  if (!contentEl) return;

  if (!walletRes.success || !walletRes.data) {
    contentEl.innerHTML = renderErrorState('Không thể tải thông tin Ví', walletRes.message, 'renderWalletPage()');
    return;
  }

  const walletData = walletRes.data;
  MARKET_WALLET = walletData;
  const transactions = (txRes.success && txRes.data?.items) ? txRes.data.items : [];

  const txListHTML = transactions.length ? transactions.map(t => {
    const isDeposit = t.type === 'deposit';
    const isPurchase = t.type === 'purchase';
    const isRefund = t.type === 'refund';
    const color = isDeposit ? 'var(--teal)' : (isRefund ? 'var(--accent)' : 'var(--text)');
    const sign = isDeposit ? '+' : (isPurchase ? '-' : '');
    const dateStr = new Date(t.created_at).toLocaleString('vi-VN');

    return `
      <div class="flex items-center justify-between py-3 border-b border-white/5 last:border-none text-[12.5px] hover:bg-white/[0.01] transition-colors rounded-lg px-1 sm:px-2 gap-2.5">
        <div class="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] shrink-0 mt-0.5" style="background:${isDeposit ? 'rgba(52,214,180,.12)' : (isPurchase ? 'rgba(244,88,107,.12)' : 'rgba(124,111,240,.12)')}; color:${isDeposit ? 'var(--teal)' : (isPurchase ? 'var(--rose)' : 'var(--accent)')}">
            <i class="fa-solid ${isDeposit ? 'fa-arrow-down-left' : (isPurchase ? 'fa-bag-shopping' : 'fa-rotate-left')}"></i>
          </div>
          <div class="min-w-0 flex-1">
            <div class="font-medium text-[13px] text-[var(--text)] truncate">${t.description || t.type}</div>
            <div class="text-[11px] mono mt-0.5 truncate" style="color:var(--text-faint)">${t.transaction_code} · ${dateStr}</div>
          </div>
        </div>
        <div class="text-right shrink-0">
          <div class="mono font-bold text-[13.5px] sm:text-[14px]" style="color:${color}">${sign}${formatMarketPrice(t.amount)}</div>
          <span class="text-[10px] pill px-1.5 py-0.5 mt-1 inline-block" style="background:${t.status==='completed'?'rgba(52,214,180,.12)':'rgba(245,166,35,.12)'}; color:${t.status==='completed'?'var(--teal)':'var(--amber)'}">
            ${t.status}
          </span>
        </div>
      </div>
    `;
  }).join('') : `
    <div class="p-8 text-center">
      <div class="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2" style="background:rgba(255,255,255,.04); color:var(--text-faint)">
        <i class="fa-solid fa-receipt text-[18px]"></i>
      </div>
      <div class="font-medium text-[13.5px] mb-1">Chưa có lịch sử giao dịch</div>
      <p class="text-[12px] mb-4" style="color:var(--text-dim)">Nạp tiền vào ví để bắt đầu mua sắm tài khoản và dịch vụ.</p>
      <button class="btn btn-primary btn-sm" onclick="openDepositSheet()"><i class="fa-solid fa-plus"></i> Nạp tiền ngay</button>
    </div>
  `;

  contentEl.innerHTML = `
    <div class="space-y-6">
      <!-- Balance Card -->
      <div class="glass card p-5 md:p-6">
        <div class="mb-2">
          <span class="text-[12px] font-semibold uppercase tracking-wider" style="color:var(--text-dim)">Số dư khả dụng</span>
        </div>
        <div class="display font-extrabold text-[30px] md:text-[34px] mono" style="color:var(--text)">${formatMarketPrice(walletData.balance)}</div>
        
        <div class="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-white/10 text-[12px]">
          <div>
            <div style="color:var(--text-faint)">Tổng nạp thành công</div>
            <div class="mono font-bold text-[14px] text-[var(--teal)] mt-0.5">${formatMarketPrice(walletData.total_deposit)}</div>
          </div>
          <div class="text-right">
            <div style="color:var(--text-faint)">Tổng tiền đã chi tiêu</div>
            <div class="mono font-bold text-[14px] text-[var(--rose)] mt-0.5">${formatMarketPrice(walletData.total_spent)}</div>
          </div>
        </div>
      </div>

      <!-- Quick Deposit Section -->
      <div>
        <div class="text-[12px] font-semibold uppercase tracking-wide mb-3" style="color:var(--text-faint)">Nạp nhanh VietQR 24/7</div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button class="glass card p-3 hover:border-[var(--accent)] text-left transition-all group" onclick="openDepositSheet(20000)">
            <div class="text-[11px]" style="color:var(--text-dim)">Nạp</div>
            <div class="mono font-bold text-[14px] group-hover:text-[var(--accent)] mt-0.5">20.000 ₫</div>
          </button>
          <button class="glass card p-3 hover:border-[var(--accent)] text-left transition-all group" onclick="openDepositSheet(50000)">
            <div class="text-[11px]" style="color:var(--text-dim)">Nạp</div>
            <div class="mono font-bold text-[14px] group-hover:text-[var(--accent)] mt-0.5">50.000 ₫</div>
          </button>
          <button class="glass card p-3 hover:border-[var(--accent)] text-left transition-all group" onclick="openDepositSheet(100000)">
            <div class="text-[11px]" style="color:var(--text-dim)">Nạp</div>
            <div class="mono font-bold text-[14px] group-hover:text-[var(--accent)] mt-0.5">100.000 ₫</div>
          </button>
          <button class="glass card p-3 hover:border-[var(--accent)] text-left transition-all group" onclick="openDepositSheet(200000)">
            <div class="text-[11px]" style="color:var(--text-dim)">Nạp</div>
            <div class="mono font-bold text-[14px] group-hover:text-[var(--accent)] mt-0.5">200.000 ₫</div>
          </button>
        </div>
      </div>

      <!-- Transaction History Section -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="text-[12px] font-semibold uppercase tracking-wide" style="color:var(--text-faint)">Lịch sử giao dịch</span>
          <span class="text-[11.5px] mono" style="color:var(--text-faint)">${transactions.length} giao dịch</span>
        </div>
        <div class="glass card p-3 md:p-4">${txListHTML}</div>
      </div>
    </div>
  `;
}

function openWallet() { navigate('wallet'); }

function openDepositSheet(suggestedAmount) {
  if (!Sayraa.user) {
    showToast('info', 'Vui lòng đăng nhập để nạp tiền');
    openLoginSheet();
    return;
  }

  if (DEPOSIT_POLL_INTERVAL) clearInterval(DEPOSIT_POLL_INTERVAL);
  const initVal = suggestedAmount ? Math.max(10000, Math.ceil(suggestedAmount / 1000) * 1000) : 50000;

  openSheet(`
    <h3 class="display font-bold text-[17px] mb-1">Nạp tiền vào Ví</h3>
    <p class="text-[12.5px] mb-4" style="color:var(--text-dim)">Nạp tiền tự động qua cổng VietQR &amp; SePay 24/7.</p>
    
    <div class="mb-4">
      <label class="text-[12px] font-medium block mb-1.5" style="color:var(--text-dim)">Nhập số tiền muốn nạp (Tối thiểu 10.000 ₫)</label>
      <input type="number" id="deposit-amount-input" class="input font-bold text-[16px] mono" min="10000" step="5000" value="${initVal}">
      
      <div class="flex flex-wrap gap-2 mt-2.5">
        <button class="variant-chip" onclick="document.getElementById('deposit-amount-input').value=20000">20.000 ₫</button>
        <button class="variant-chip" onclick="document.getElementById('deposit-amount-input').value=50000">50.000 ₫</button>
        <button class="variant-chip" onclick="document.getElementById('deposit-amount-input').value=100000">100.000 ₫</button>
        <button class="variant-chip" onclick="document.getElementById('deposit-amount-input').value=200000">200.000 ₫</button>
        <button class="variant-chip" onclick="document.getElementById('deposit-amount-input').value=500000">500.000 ₫</button>
      </div>
    </div>

    <div class="flex gap-2.5">
      <button class="btn btn-ghost flex-1" onclick="closeSheet()">Hủy</button>
      <button class="btn btn-primary flex-1" id="btn-create-deposit" onclick="submitCreateDeposit()">
        <i class="fa-solid fa-qrcode"></i> Tạo mã QR
      </button>
    </div>
  `);
}

async function submitCreateDeposit() {
  const amountInput = document.getElementById('deposit-amount-input');
  const amount = Number(amountInput?.value) || 0;

  if (amount < 10000) {
    showToast('error', 'Số tiền nạp tối thiểu là 10.000 ₫');
    return;
  }

  const btn = document.getElementById('btn-create-deposit');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tạo mã VietQR...';
  }

  const res = await marketApiRequest('/wallet/deposit', {
    method: 'POST',
    body: { amount: amount }
  });

  if (res.success && res.data) {
    renderDepositQR(res.data);
  } else {
    showToast('error', res.message || 'Không thể tạo yêu cầu nạp tiền');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-qrcode"></i> Tạo mã QR';
    }
  }
}

function renderDepositQR(depositData) {
  const { transaction, payment } = depositData;
  const transactionCode = transaction.transaction_code;

  openSheet(`
    <div class="text-center">
      <h3 class="display font-bold text-[17px] mb-1">Quét mã VietQR để Thanh toán</h3>
      <p class="text-[12px] mb-4" style="color:var(--text-dim)">Hệ thống tự động cộng tiền sau 2 - 10 giây</p>

      <div class="bg-white p-3 rounded-2xl inline-block mb-4 shadow-xl">
        <img src="${payment.qr_image}" alt="VietQR" class="w-56 h-56 object-contain rounded-lg">
      </div>

      <div class="flex items-center justify-center gap-2 mb-4 text-[12px]" style="color:var(--amber)" id="deposit-status-badge">
        <i class="fa-solid fa-spinner fa-spin"></i> Đang chờ chuyển khoản ngân hàng...
      </div>

      <div class="glass card p-3.5 text-left text-[12.5px] space-y-2 mb-4">
        <div class="flex items-center justify-between">
          <span style="color:var(--text-faint)">Ngân hàng:</span>
          <span class="font-bold">${payment.bank}</span>
        </div>
        <div class="flex items-center justify-between">
          <span style="color:var(--text-faint)">Số tài khoản:</span>
          <div class="flex items-center gap-1.5">
            <span class="mono font-bold select-all">${payment.account_number}</span>
            <button class="btn btn-ghost btn-sm py-0.5 px-1.5 text-[11px]" onclick="copyCode('${payment.account_number}')"><i class="fa-regular fa-copy"></i></button>
          </div>
        </div>
        <div class="flex items-center justify-between">
          <span style="color:var(--text-faint)">Chủ tài khoản:</span>
          <span class="font-semibold uppercase">${payment.account_name}</span>
        </div>
        <div class="flex items-center justify-between">
          <span style="color:var(--text-faint)">Số tiền:</span>
          <div class="flex items-center gap-1.5">
            <span class="mono font-bold text-[var(--teal)]">${formatMarketPrice(payment.amount)}</span>
            <button class="btn btn-ghost btn-sm py-0.5 px-1.5 text-[11px]" onclick="copyCode('${payment.amount}')"><i class="fa-regular fa-copy"></i></button>
          </div>
        </div>
        <div class="flex items-center justify-between pt-1 border-t border-white/5">
          <span style="color:var(--text-faint)">Nội dung CK:</span>
          <div class="flex items-center gap-1.5">
            <span class="mono font-bold text-[var(--accent)] select-all">${payment.content}</span>
            <button class="btn btn-ghost btn-sm py-0.5 px-1.5 text-[11px]" onclick="copyCode('${payment.content}')"><i class="fa-regular fa-copy"></i></button>
          </div>
        </div>
      </div>

      <div class="text-[11px] mb-4 text-[var(--rose)]">
        * Vui lòng chuyển chính xác nội dung chuyển khoản để được cộng tiền tự động.
      </div>

      <button class="btn btn-ghost w-full" onclick="stopDepositPolling(); closeSheet();">Đóng</button>
    </div>
  `);

  startDepositPolling(transactionCode);
}

function startDepositPolling(transactionCode) {
  if (DEPOSIT_POLL_INTERVAL) clearInterval(DEPOSIT_POLL_INTERVAL);
  
  DEPOSIT_POLL_INTERVAL = setInterval(async () => {
    const res = await marketApiRequest(`/wallet/deposit/${encodeURIComponent(transactionCode)}`);
    if (res.success && res.data) {
      const status = res.data.status;
      if (status === 'completed') {
        stopDepositPolling();
        showToast('success', 'Nạp tiền thành công! Số dư đã được cộng.');
        await loadWalletInfo();
        
        const badge = document.getElementById('deposit-status-badge');
        if (badge) {
          badge.innerHTML = '<i class="fa-solid fa-circle-check text-[var(--teal)]"></i> <span style="color:var(--teal); font-weight:bold">Giao dịch đã hoàn tất!</span>';
        }
        setTimeout(() => {
          closeSheet();
          if (Sayraa.currentRoute === 'wallet') renderWalletPage();
        }, 1500);
      } else if (status === 'failed' || status === 'cancelled' || status === 'expired') {
        stopDepositPolling();
        showToast('error', `Giao dịch đã kết thúc (${status})`);
      }
    }
  }, 2500);
}

function stopDepositPolling() {
  if (DEPOSIT_POLL_INTERVAL) {
    clearInterval(DEPOSIT_POLL_INTERVAL);
    DEPOSIT_POLL_INTERVAL = null;
  }
}

/* =========================================================
   STANDALONE VIEW: WISHLIST PAGE (#wishlist)
   ========================================================= */

async function loadWishlist() {
  if (!Sayraa.user) {
    MARKET_WISHLIST = [];
    return;
  }
  const res = await marketApiRequest('/wishlist');
  if (res.success && Array.isArray(res.data)) {
    MARKET_WISHLIST = res.data.map(item => item.product_code);
  } else {
    MARKET_WISHLIST = [];
  }
}

async function toggleWishlist(productCode) {
  if (!Sayraa.user) {
    showToast('info', 'Vui lòng đăng nhập để lưu sản phẩm yêu thích');
    openLoginSheet();
    return;
  }

  const isLiked = MARKET_WISHLIST.includes(productCode);
  if (isLiked) {
    MARKET_WISHLIST = MARKET_WISHLIST.filter(c => c !== productCode);
    renderMarketGrid();
    renderMarketFeatured();
    if (Sayraa.currentRoute === 'wishlist') {
      renderWishlistPage();
    }
    const res = await marketApiRequest(`/wishlist/items/${encodeURIComponent(productCode)}`, { method: 'DELETE' });
    if (res.success) {
      showToast('info', 'Đã xóa khỏi danh sách yêu thích');
    } else {
      MARKET_WISHLIST.push(productCode);
      renderMarketGrid();
      if (Sayraa.currentRoute === 'wishlist') {
        renderWishlistPage();
      }
      showToast('error', res.message || 'Lỗi khi xóa khỏi yêu thích');
    }
  } else {
    MARKET_WISHLIST.push(productCode);
    renderMarketGrid();
    renderMarketFeatured();
    if (Sayraa.currentRoute === 'wishlist') {
      renderWishlistPage();
    }
    const res = await marketApiRequest('/wishlist/items', {
      method: 'POST',
      body: { product_code: productCode }
    });
    if (res.success) {
      showToast('success', 'Đã thêm vào danh sách yêu thích');
    } else {
      MARKET_WISHLIST = MARKET_WISHLIST.filter(c => c !== productCode);
      renderMarketGrid();
      if (Sayraa.currentRoute === 'wishlist') {
        renderWishlistPage();
      }
      showToast('error', res.message || 'Lỗi khi thêm vào yêu thích');
    }
  }
}

function renderWishlistSkeleton() {
  const sk = `
    <div class="glass module-card card p-3.5 sm:p-4">
      <div class="flex items-start gap-3 mb-3">
        <div class="skel w-10 h-10 rounded-xl"></div>
        <div class="flex-1 space-y-2">
          <div class="flex justify-between"><div class="skel h-4 w-2/3"></div><div class="skel h-4 w-20"></div></div>
          <div class="skel h-3 w-1/3"></div>
          <div class="skel h-3 w-full"></div>
        </div>
      </div>
      <div class="flex justify-between items-center pt-3 border-t border-white/5">
        <div class="skel h-5 w-16 rounded-full"></div>
        <div class="skel h-8 w-16 rounded-lg"></div>
      </div>
    </div>
  `;
  return `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${sk}${sk}</div>`;
}

async function renderWishlistPage() {
  const container = document.getElementById('wishlist-view');
  if (!container) return;

  const headerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="display text-[21px] font-extrabold tracking-tight">Wishlist</h1>
        <p class="text-[12.5px] mt-0.5" style="color:var(--text-dim)">Products you have saved for later purchase.</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn btn-ghost btn-sm" onclick="navigate('markets')"><i class="fa-solid fa-basket-shopping"></i> Market</button>
      </div>
    </div>
  `;

  if (!Sayraa.user) {
    container.innerHTML = headerHTML + renderGuestState('Đăng nhập để xem Danh sách yêu thích', 'Lưu lại các sản phẩm bạn quan tâm để dễ dàng theo dõi giá và đặt hàng bất kỳ lúc nào.', 'fa-heart');
    return;
  }

  container.innerHTML = headerHTML + `<div id="wishlist-page-content">${renderWishlistSkeleton()}</div>`;

  const res = await marketApiRequest('/wishlist');
  const contentEl = document.getElementById('wishlist-page-content');
  if (!contentEl) return;

  if (!res.success) {
    contentEl.innerHTML = renderErrorState('Không thể tải danh sách yêu thích', res.message, 'renderWishlistPage()');
    return;
  }

  const items = Array.isArray(res.data) ? res.data : [];
  MARKET_WISHLIST = items.map(x => x.product_code);

  if (!items.length) {
    contentEl.innerHTML = `
      <div class="glass card p-8 text-center max-w-md mx-auto my-4">
        <div class="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4" style="background:rgba(244,88,107,.1); color:var(--rose)">
          <i class="fa-solid fa-heart text-[22px]"></i>
        </div>
        <h3 class="display font-bold text-[16px] mb-1.5">Danh sách yêu thích đang trống</h3>
        <p class="text-[13px] mb-5 leading-relaxed" style="color:var(--text-dim)">Nhấn vào biểu tượng trái tim trên bất kỳ sản phẩm nào trong Market để lưu lại tại đây.</p>
        <button class="btn btn-primary" onclick="navigate('markets')"><i class="fa-solid fa-basket-shopping mr-1"></i> Xem sản phẩm</button>
      </div>
    `;
    return;
  }

  const gridHTML = items.map(productCard).join('');
  contentEl.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${gridHTML}</div>`;
}

async function removeWishlistAndRefresh(productCode) {
  await toggleWishlist(productCode);
}

function openWishlist() { navigate('wishlist'); }

function openSupport() {
  openSheet(`
    <h3 class="display font-bold text-[17px] mb-1">Hỗ trợ khách hàng</h3>
    <p class="text-[13px] mb-5" style="color:var(--text-dim)">Bạn cần trợ giúp về vấn đề gì?</p>
    <div class="grid grid-cols-2 gap-2 mb-4">
      <button class="btn btn-ghost btn-sm" onclick="setSupportTopic('Vấn đề đơn hàng')"><i class="fa-solid fa-box-open"></i> Đơn hàng</button>
      <button class="btn btn-ghost btn-sm" onclick="setSupportTopic('Hỏi về sản phẩm')"><i class="fa-solid fa-tag"></i> Sản phẩm</button>
      <button class="btn btn-ghost btn-sm" onclick="setSupportTopic('Vấn đề nạp tiền')"><i class="fa-solid fa-credit-card"></i> Nạp tiền</button>
      <button class="btn btn-ghost btn-sm" onclick="setSupportTopic('Vấn đề tài khoản')"><i class="fa-solid fa-user-shield"></i> Tài khoản</button>
    </div>
    <div class="mb-4">
      <div class="text-[12px] mb-1.5" style="color:var(--text-dim)">Chủ đề</div>
      <input id="support-topic" class="input mb-3" placeholder="Chọn chủ đề phía trên" readonly>
      <div class="text-[12px] mb-1.5" style="color:var(--text-dim)">Nội dung yêu cầu</div>
      <textarea id="support-msg" class="input" rows="3" placeholder="Mô tả chi tiết vấn đề của bạn..."></textarea>
    </div>
    <button class="btn btn-primary w-full" onclick="submitSupport()"><i class="fa-solid fa-paper-plane"></i> Gửi yêu cầu</button>
  `);
}
function setSupportTopic(t) { const el = document.getElementById('support-topic'); if (el) el.value = t; }
function submitSupport() {
  const topic = document.getElementById('support-topic')?.value;
  const msg = document.getElementById('support-msg')?.value;
  if (!topic || !msg) return showToast('error', 'Vui lòng điền đầy đủ thông tin');
  closeSheet();
  showToast('success', 'Yêu cầu hỗ trợ đã được gửi. Chúng tôi sẽ phản hồi sớm.');
}

function renderMarkets() {
  if (!MARKET_PRODUCTS || MARKET_PRODUCTS.length === 0) {
    initMarkets();
  } else {
    renderMarketCategories();
    renderMarketGrid();
  }
}



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
      renderAuthUI();
      showToast('success', 'Signed in successfully');
      loadGenshinAccounts();
      loadCart();
      loadWishlist();
      loadWalletInfo();
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
  MARKET_CART = [];
  MARKET_CART_SUMMARY = { total_items: 0, total_amount: 0, currency: 'VND' };
  MARKET_WISHLIST = [];
  MARKET_WALLET = null;
  updateCartBadge();
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

  const avatarBtn = document.getElementById('avatar-btn');
  if (avatarBtn) avatarBtn.innerHTML = avatarHTML;

  if (typeof renderDashboard === 'function') {
    renderDashboard();
  }

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
function safeJsonParse(val, fallback = {}) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch (e) { return fallback; }
  }
  return fallback;
}

async function fetchSettings() {
  if (!Sayraa.user) return;
  try {
    const res = await fetch(SETTINGS_BASE, { headers: { 'Authorization': `Bearer ${Sayraa.user.token}` }});
    const data = await res.json();
    if (data.success && data.data) {
      const s = data.data;
      
      const notifications = safeJsonParse(s.notifications);
      const privacy = safeJsonParse(s.privacy);
      const preferences = safeJsonParse(s.preferences);
      
      // Hàm gạt công tắc cho đúng trạng thái DB
      const setToggle = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('on', val === true || val === 1 || val === '1' || val === 'true');
      };
      
      setToggle('email-switch', notifications.email);
      setToggle('push-switch', notifications.push);
      setToggle('discord-switch', notifications.discord);
      setToggle('security-switch', notifications.security_alert);
      setToggle('system-update-switch', notifications.system_update);

      setToggle('public-profile-switch', privacy.profile_public);
      setToggle('show-email-switch', privacy.show_email);
      setToggle('analytics-switch', privacy.analytics);
      setToggle('crash-report-switch', privacy.crash_report);

      setToggle('dev-mode-switch', s.developer_mode);
      setToggle('api-logs-switch', s.show_api_logs);
      setToggle('debug-logs-switch', s.show_debug_info);

      if (s.developer_mode !== undefined) {
        Sayraa.devMode = (s.developer_mode === 1 || s.developer_mode === true);
      }

      // Sync Accent Color
      if (s.accent) {
        const accentMap = {
          purple: '#7c6ff0',
          cyan: '#34d6b4',
          amber: '#f5a623',
          red: '#f4586b',
          blue: '#5aa7ef'
        };
        const hex = accentMap[s.accent] || (s.accent.startsWith('#') ? s.accent : null);
        if (hex) {
          Sayraa.accent = hex;
          document.documentElement.style.setProperty('--accent', hex);
          document.documentElement.style.setProperty('--accent-soft', hex + '24');
          if (typeof renderAccentSwatches === 'function') renderAccentSwatches();
        }
      }

      // Sync Theme / Appearance
      if (s.theme) {
        setTheme(s.theme, false);
      }
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
    payload[category] = newValue ? 1 : 0;
    if (category === 'developer_mode') {
      Sayraa.devMode = newValue;
    }
  }

  try {
    const res = await fetch(SETTINGS_BASE, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${Sayraa.user.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(!data.success) throw new Error(data.error || data.message || 'Failed to save setting');
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
const GENSHIN_BASE = 'https://apis.elyriax.com/v1/genshin';
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

    // Hydrate cached details from localStorage
    genshinAccounts.forEach(a => {
      try {
        const cached = JSON.parse(localStorage.getItem(`genshin_cache_${a.id}`) || '{}');
        if (cached.avatar_url && !a.avatar_url) a.avatar_url = cached.avatar_url;
        if (cached.level && !a.role_level) a.role_level = cached.level;
        if (cached.nickname && !a.nickname) a.nickname = cached.nickname;
      } catch(_) {}
    });

    const def = genshinAccounts.find(a=>a.is_default);
    genshinActiveId = def ? def.id : (genshinAccounts[0] ? genshinAccounts[0].id : null);
  } catch(e){
    genshinAccounts = [];
    genshinActiveId = null;
  }
  renderAccountBar();

  if (genshinActiveId) {
    hydrateGenshinAccountAvatar(genshinActiveId);
  }
}

async function hydrateGenshinAccountAvatar(accId) {
  const acc = genshinAccounts.find(a => a.id === accId);
  if (!acc || acc.avatar_url) return;
  try {
    const res = await fetch(`${GENSHIN_BASE}/accounts/${accId}/stats`, { headers: genshinAuthHeaders() });
    const d = await res.json();
    if (d.ok && d.role) {
      if (d.role.avatar_url) acc.avatar_url = d.role.avatar_url;
      if (d.role.level) acc.role_level = d.role.level;
      if (d.role.nickname) acc.nickname = d.role.nickname;
      try {
        localStorage.setItem(`genshin_cache_${accId}`, JSON.stringify({
          avatar_url: d.role.avatar_url,
          level: d.role.level,
          nickname: d.role.nickname
        }));
      } catch(_) {}
      renderAccountBar();
    }
  } catch(_) {}
}

function renderAccountBar(){
  const bar = document.getElementById('genshin-account-bar');
  if(!bar) return;

  if(!Sayraa.user){
    bar.innerHTML = `
      <div class="glass card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-white/10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] glass border border-white/10 shrink-0" style="background:rgba(245,166,35,.15); color:var(--amber)">
            <i class="fa-solid fa-gamepad"></i>
          </div>
          <div>
            <div class="font-semibold text-[13.5px]">Liên kết tài khoản Genshin Impact</div>
            <div class="text-[12px]" style="color:var(--text-dim)">Đăng nhập để xem Sổ tay hàng ngày, Banners, Gift Codes và Thống kê vai trò.</div>
          </div>
        </div>
        <button class="btn btn-primary btn-sm shrink-0 w-full sm:w-auto" onclick="openLoginSheet()">
          <i class="fa-solid fa-right-to-bracket mr-1"></i> Đăng nhập
        </button>
      </div>`;
    return;
  }

  if(!genshinAccounts.length){
    bar.innerHTML = `
      <div class="glass card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-white/10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] glass border border-white/10 shrink-0" style="background:rgba(245,166,35,.15); color:var(--amber)">
            <i class="fa-solid fa-user-plus"></i>
          </div>
          <div>
            <div class="font-semibold text-[13.5px]">Chưa có tài khoản Genshin nào</div>
            <div class="text-[12px]" style="color:var(--text-dim)">Liên kết cookie HoyoLAB để tự động điểm danh và đồng bộ Sổ tay.</div>
          </div>
        </div>
        <button class="btn btn-primary btn-sm shrink-0 w-full sm:w-auto" onclick="openAddAccountSheet()">
          <i class="fa-solid fa-plus mr-1"></i> Thêm tài khoản
        </button>
      </div>`;
    return;
  }

  const acc = activeGenshinAccount();
  if (!acc) return;

  const fallbackInitial = (acc.nickname || 'G')[0].toUpperCase();
  const avatarHTML = acc.avatar_url
    ? `<img src="${acc.avatar_url}" alt="${acc.nickname || 'Genshin Avatar'}" class="w-full h-full object-contain rounded-full" onerror="this.outerHTML='<span class=\\'font-bold text-[18px]\\'>${fallbackInitial}</span>'">`
    : `<span class="font-bold text-[18px]">${fallbackInitial}</span>`;

  bar.innerHTML = `
    <div class="glass card p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border border-white/10 shadow-lg">
      <div class="flex items-center gap-3.5 min-w-0">
        <!-- Avatar Circle -->
        <div class="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center glass border border-white/20 shrink-0 shadow-md" style="background: linear-gradient(135deg, rgba(245,166,35,.35), rgba(124,111,240,.2)); color: white;">
          ${avatarHTML}
        </div>

        <!-- Account Details -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            ${genshinAccounts.length > 1 ? `
              <div class="relative inline-block">
                <select class="input text-[13.5px] font-bold py-1 px-2.5 pr-7 h-8 cursor-pointer rounded-lg bg-white/5 border border-white/15 hover:border-white/30" onchange="switchGenshinAccount(this.value)">
                  ${genshinAccounts.map(a => `<option value="${a.id}" ${a.id === genshinActiveId ? 'selected' : ''}>${a.nickname || ('UID ' + a.uid)}${a.is_default ? ' ★' : ''}</option>`).join('')}
                </select>
                <i class="fa-solid fa-chevron-down absolute right-2.5 top-2.5 text-[9px] pointer-events-none text-white/50"></i>
              </div>
            ` : `
              <h3 class="display font-bold text-[14.5px] sm:text-[15.5px] truncate text-white">${acc.nickname || ('UID ' + acc.uid)}</h3>
            `}

            ${acc.is_default ? `<span class="pill px-2 py-0.5 text-[10px]" style="background:rgba(245,166,35,.15); color:var(--amber)"><i class="fa-solid fa-star mr-1 text-[8px]"></i>Mặc định</span>` : ''}
            <span class="pill px-2 py-0.5 text-[10px]" style="background:rgba(255,255,255,.06); color:var(--text-dim)">${acc.server || 'Asia'}</span>
          </div>

          <div class="flex items-center gap-2 mt-1 text-[11.5px] mono" style="color:var(--text-faint)">
            <span>UID: <b class="text-white">${acc.uid}</b></span>
            <button class="hover:text-white transition-colors cursor-pointer" onclick="copyCode('${acc.uid}')" title="Sao chép UID">
              <i class="fa-regular fa-copy text-[10px]"></i>
            </button>
            <span class="text-white/20">·</span>
            <span class="text-[var(--teal)] flex items-center gap-1">
              <span class="status-dot on" style="width:5px; height:5px;"></span> Đã đồng bộ
            </span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
        <button class="btn btn-ghost btn-sm text-[12px] h-8 px-2.5" onclick="openAccountSettingsSheet(${acc.id})" title="Cài đặt tài khoản">
          <i class="fa-solid fa-sliders mr-1"></i> Cài đặt
        </button>
        <button class="btn btn-primary btn-sm text-[12px] h-8 px-2.5" onclick="openAddAccountSheet()" title="Thêm tài khoản">
          <i class="fa-solid fa-plus mr-1"></i> Thêm
        </button>
      </div>
    </div>`;
}

function switchGenshinAccount(id){
  genshinActiveId = Number(id);
  renderAccountBar();
  hydrateGenshinAccountAvatar(genshinActiveId);
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

  panel.innerHTML = `
    <div class="space-y-3">
      ${skeletonBlock(120)}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${skeletonBlock(80)}${skeletonBlock(80)}</div>
      ${skeletonBlock(100)}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${skeletonBlock(80)}${skeletonBlock(80)}</div>
    </div>
  `;

  try{
    const res = await fetch(`${GENSHIN_BASE}/accounts/${acc.id}/daily-note`, { headers: genshinAuthHeaders() });
    const payload = await res.json();
    if(!res.ok || !payload.ok) throw new Error(payload.message || 'Failed to load daily note');
    
    const d = payload.data || {};
    
    // 1. Resin Data
    const resinCurrent = Number(d.resin?.current ?? 0);
    const resinMax = Number(d.resin?.max ?? 200);
    const resinPct = Math.min(100, Math.max(0, Math.round((resinCurrent / (resinMax || 200)) * 100)));
    const isResinFull = d.resin?.is_full || resinCurrent >= resinMax;
    const resinFullTime = d.resin?.estimated_full_time || '—';
    const bossRemain = d.resin?.resin_discount?.remain_num ?? 0;
    const bossLimit = d.resin?.resin_discount?.limit_num ?? 3;

    // 2. Daily Tasks / Commissions
    const tasksDone = Number(d.daily_tasks?.finished_num ?? 0);
    const tasksTotal = Number(d.daily_tasks?.total_num ?? 4);
    const isAllTasksDone = d.daily_tasks?.is_all_finished || tasksDone >= tasksTotal;
    const storedAttendance = d.daily_tasks?.stored_attendance ?? '0';
    const attendanceCountdown = d.daily_tasks?.stored_attendance_refresh_countdown_seconds;
    const extraRewardClaimed = d.daily_tasks?.extra_award_has_got;

    // 3. Expeditions
    const expeditionsList = Array.isArray(d.expeditions?.list) ? d.expeditions.list : [];
    const expCurrent = Number(d.expeditions?.current_num ?? expeditionsList.length);
    const expMax = Number(d.expeditions?.max_num ?? 5);

    // 4. Serenitea Pot Home Coin
    const coinCurrent = Number(d.home_coin?.current ?? 0);
    const coinMax = Number(d.home_coin?.max ?? 2400);
    const coinPct = Math.min(100, Math.max(0, Math.round((coinCurrent / (coinMax || 2400)) * 100)));
    const isCoinFull = d.home_coin?.is_full || coinCurrent >= coinMax;
    const coinFullTime = d.home_coin?.estimated_full_time || '—';

    // 5. Transformer
    const transformerObtained = d.transformer?.obtained !== false;
    const transformerReady = d.transformer?.ready === true;
    const transformerCD = d.transformer?.recovery_time 
      ? (typeof d.transformer.recovery_time === 'object' 
          ? (d.transformer.recovery_time.Day ? `${d.transformer.recovery_time.Day}d ${d.transformer.recovery_time.Hour}h` : 'On cooldown') 
          : d.transformer.recovery_time)
      : 'On cooldown';

    // 6. Archon Quest & Weekly Progress
    const archonFinished = d.archon_quest_progress?.is_finish_all_mainline === true;
    const weekProgressCurrent = Number(d.week_active_progress?.progress_current ?? 0);
    const weekProgressTotal = Number(d.week_active_progress?.progress_total ?? 100);
    const weekPct = Math.min(100, Math.max(0, Math.round((weekProgressCurrent / (weekProgressTotal || 100)) * 100)));

    // Task dots generator (4 steps)
    const taskDotsHTML = [1, 2, 3, 4].map(idx => {
      const done = idx <= tasksDone;
      return `<div class="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] ${done ? 'bg-[rgba(52,214,180,.15)] text-[var(--teal)] border border-[var(--teal)]/30' : 'bg-white/5 text-white/20 border border-white/10'} font-bold">
        ${done ? '<i class="fa-solid fa-check"></i>' : idx}
      </div>`;
    }).join('');

    // Expeditions list HTML
    const expeditionsHTML = expeditionsList.length ? `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        ${expeditionsList.map(e => {
          const isDone = e.status === 'Finished' || e.remained_time === 0;
          return `
          <div class="glass card p-3 flex items-center gap-3 border border-white/5 hover:border-white/15 transition-all">
            <div class="w-10 h-10 rounded-xl overflow-hidden glass border border-white/10 shrink-0 bg-black/40">
              ${e.avatar_icon ? `<img src="${e.avatar_icon}" class="w-full h-full object-cover" onerror="this.outerHTML='<div class=\\'w-full h-full flex items-center justify-center text-[var(--text-faint)]\\'><i class=\\'fa-solid fa-user\\'></i></div>'">` : '<div class="w-full h-full flex items-center justify-center text-[var(--text-faint)]"><i class="fa-solid fa-user"></i></div>'}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <span class="text-[12.5px] font-semibold truncate ${isDone ? 'text-[var(--teal)]' : 'text-white'}">
                  ${isDone ? 'Đã hoàn thành' : 'Đang thám hiểm'}
                </span>
                <span class="pill px-1.5 py-0.5 text-[9.5px]" style="background:${isDone ? 'rgba(52,214,180,.14)' : 'rgba(245,166,35,.14)'}; color:${isDone ? 'var(--teal)' : 'var(--amber)'}">
                  ${isDone ? 'Sẵn sàng' : 'Ongoing'}
                </span>
              </div>
              <div class="text-[11px] mono mt-0.5 truncate" style="color:var(--text-faint)">
                ${isDone ? 'Đã sẵn sàng nhận thưởng' : `Hoàn thành: ${e.estimated_finished_time || (e.remained_time ? formatCountdown(e.remained_time) : '...')}`}
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    ` : `
      <div class="glass card p-5 text-center text-[12.5px]" style="color:var(--text-dim)">
        <i class="fa-solid fa-person-hiking text-[20px] mb-1.5 block opacity-40"></i>
        Không có nhân vật nào đang được phái đi thám hiểm
      </div>
    `;

    panel.innerHTML = `
      <div class="space-y-4">
        <!-- Top Toolbar -->
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-2">
            <span class="text-[13px] font-bold tracking-tight">Daily Note Overview</span>
            <span class="pill px-2 py-0.5 text-[10.5px]" style="background:rgba(245,166,35,.14); color:var(--amber)">
              <i class="fa-solid fa-shield-halved mr-1"></i>${acc.nickname || acc.uid || 'Genshin Account'}
            </span>
          </div>
          <button class="btn btn-ghost btn-sm text-[11.5px] py-1 px-2.5" onclick="renderDailyNote(document.getElementById('genshin-panel'))" title="Tải lại dữ liệu">
            <i class="fa-solid fa-rotate-right mr-1"></i> Làm mới
          </button>
        </div>

        <!-- 1. HERO RESIN CARD -->
        <div class="glass card p-5 relative overflow-hidden bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent border border-white/10 shadow-xl">
          <div class="absolute -right-8 -top-8 w-44 h-44 rounded-full ${isResinFull ? 'bg-[var(--rose)]/15' : 'bg-[var(--accent)]/15'} blur-3xl pointer-events-none"></div>
          
          <div class="flex items-start justify-between gap-3 mb-3 relative z-10">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl flex items-center justify-center text-[20px] shadow-lg border border-white/10 shrink-0" style="background:${isResinFull ? 'rgba(244,88,107,.18)' : 'rgba(124,111,240,.18)'}; color:${isResinFull ? 'var(--rose)' : 'var(--accent)'}">
                <i class="fa-solid fa-droplet"></i>
              </div>
              <div>
                <div class="text-[12px] font-semibold uppercase tracking-wider" style="color:var(--text-faint)">Nhựa Nguyên Bản · Original Resin</div>
                <div class="text-[11.5px] mt-0.5" style="color:var(--text-dim)">
                  ${isResinFull ? '<span class="text-[var(--rose)] font-semibold"><i class="fa-solid fa-circle-exclamation mr-1"></i>Đã đạt giới hạn tối đa!</span>' : `<i class="fa-regular fa-clock mr-1"></i>Đầy vào: <span class="mono text-white font-medium">${resinFullTime}</span>`}
                </div>
              </div>
            </div>
            
            <div class="text-right shrink-0">
              <div class="display font-black text-[28px] sm:text-[32px] mono tracking-tight text-white leading-none">
                ${resinCurrent}<span class="text-[16px] font-normal" style="color:var(--text-faint)">/${resinMax}</span>
              </div>
              <span class="pill px-2 py-0.5 text-[10px] mt-1 inline-block" style="background:${isResinFull ? 'rgba(244,88,107,.15)' : 'rgba(52,214,180,.15)'}; color:${isResinFull ? 'var(--rose)' : 'var(--teal)'}">
                ${isResinFull ? 'Đã đầy nhựa' : `${resinPct}% khả dụng`}
              </span>
            </div>
          </div>

          <!-- Resin Progress Bar -->
          <div class="w-full h-2.5 rounded-full overflow-hidden mb-3.5 bg-black/40 border border-white/5 relative z-10">
            <div class="h-full rounded-full transition-all duration-500" style="width:${resinPct}%; background:${isResinFull ? 'linear-gradient(90deg, #f5a623, var(--rose))' : 'linear-gradient(90deg, var(--teal), var(--accent))'}; box-shadow:0 0 10px ${isResinFull ? 'rgba(244,88,107,.5)' : 'rgba(52,214,180,.5)'}"></div>
          </div>

          <!-- Resin Bottom Stats -->
          <div class="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/5 text-[12px] relative z-10">
            <div class="flex items-center gap-1.5" style="color:var(--text-dim)">
              <i class="fa-solid fa-shield-halved text-[var(--accent)]"></i>
              <span>Giảm giá Boss tuần (-50%):</span>
              <span class="mono font-bold text-white">${bossRemain}/${bossLimit} lần</span>
            </div>
            <div class="text-[11.5px] mono" style="color:var(--text-faint)">
              8 phút / 1 Nhựa (+180/ngày)
            </div>
          </div>
        </div>

        <!-- 2. COMMISSIONS & ENCOUNTER POINTS (2-COL) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Daily Commissions -->
          <div class="glass card p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center text-[13px]" style="background:rgba(245,166,35,.15); color:var(--amber)">
                    <i class="fa-solid fa-list-check"></i>
                  </div>
                  <div>
                    <h4 class="font-semibold text-[13px]">Ủy Thác Hàng Ngày</h4>
                    <div class="text-[10.5px]" style="color:var(--text-faint)">Daily Commissions</div>
                  </div>
                </div>
                <span class="pill px-2 py-0.5 text-[10.5px]" style="background:${isAllTasksDone ? 'rgba(52,214,180,.14)' : 'rgba(245,166,35,.14)'}; color:${isAllTasksDone ? 'var(--teal)' : 'var(--amber)'}">
                  ${isAllTasksDone ? 'Hoàn thành' : `${tasksDone}/${tasksTotal}`}
                </span>
              </div>

              <div class="flex items-center justify-between my-3">
                <div class="mono font-black text-[24px] text-white">${tasksDone}<span class="text-[14px] text-white/40">/${tasksTotal}</span></div>
                <div class="flex gap-1.5">${taskDotsHTML}</div>
              </div>
            </div>

            <div class="pt-2.5 border-t border-white/5 flex items-center justify-between text-[11.5px]">
              <span style="color:var(--text-faint)">Thưởng thêm Katheryne:</span>
              <span class="font-semibold ${extraRewardClaimed ? 'text-[var(--teal)]' : (isAllTasksDone ? 'text-[var(--amber)]' : 'text-white/40')}">
                ${extraRewardClaimed ? '<i class="fa-solid fa-circle-check mr-1"></i>Đã nhận' : (isAllTasksDone ? '<i class="fa-solid fa-gift mr-1"></i>Chưa nhận thưởng' : 'Chưa đủ điều kiện')}
              </span>
            </div>
          </div>

          <!-- Stored Attendance Points -->
          <div class="glass card p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center text-[13px]" style="background:rgba(52,214,180,.15); color:var(--teal)">
                    <i class="fa-solid fa-book-bookmark"></i>
                  </div>
                  <div>
                    <h4 class="font-semibold text-[13px]">Điểm Rèn Luyện Tích Lũy</h4>
                    <div class="text-[10.5px]" style="color:var(--text-faint)">Stored Encounter Points</div>
                  </div>
                </div>
                <span class="pill px-2 py-0.5 text-[10.5px]" style="background:rgba(52,214,180,.14); color:var(--teal)">Tích trữ</span>
              </div>

              <div class="my-3">
                <div class="mono font-black text-[24px] text-[var(--teal)]">${storedAttendance}</div>
                <div class="text-[11.5px] mt-0.5" style="color:var(--text-dim)">Dùng nhựa để chuyển đổi thành điểm ủy thác</div>
              </div>
            </div>

            <div class="pt-2.5 border-t border-white/5 flex items-center justify-between text-[11.5px]" style="color:var(--text-faint)">
              <span>Làm mới sau:</span>
              <span class="mono font-semibold text-white">${attendanceCountdown ? formatCountdown(attendanceCountdown) : 'Cuối phiên bản'}</span>
            </div>
          </div>
        </div>

        <!-- 3. EXPEDITIONS -->
        <div>
          <div class="flex items-center justify-between mb-2.5 px-1">
            <h4 class="font-semibold text-[13.5px] flex items-center gap-2">
              <i class="fa-solid fa-person-hiking text-[var(--accent)]"></i>
              <span>Phái Đi Thám Hiểm</span>
              <span class="mono text-[11.5px] text-white/50">(${expCurrent}/${expMax})</span>
            </h4>
            <span class="text-[11px] mono" style="color:var(--text-faint)">Tối đa ${expMax} nhân vật</span>
          </div>
          ${expeditionsHTML}
        </div>

        <!-- 4. SERENITEA POT & TRANSFORMER (2-COL) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Serenitea Pot -->
          <div class="glass card p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center text-[13px]" style="background:rgba(245,166,35,.15); color:var(--amber)">
                    <i class="fa-solid fa-house-chimney-window"></i>
                  </div>
                  <div>
                    <h4 class="font-semibold text-[13px]">Tiền Động Tiên</h4>
                    <div class="text-[10.5px]" style="color:var(--text-faint)">Realm Currency</div>
                  </div>
                </div>
                <span class="pill px-2 py-0.5 text-[10.5px]" style="background:${isCoinFull ? 'rgba(244,88,107,.14)' : 'rgba(245,166,35,.14)'}; color:${isCoinFull ? 'var(--rose)' : 'var(--amber)'}">
                  ${isCoinFull ? 'Đã đầy' : `${coinPct}%`}
                </span>
              </div>

              <div class="my-2.5">
                <div class="mono font-bold text-[20px] text-white">${coinCurrent}<span class="text-[13px] text-white/40">/${coinMax}</span></div>
                <div class="w-full h-1.5 rounded-full overflow-hidden bg-black/40 border border-white/5 mt-2">
                  <div class="h-full rounded-full" style="width:${coinPct}%; background:linear-gradient(90deg, #f5a623, #f4586b)"></div>
                </div>
              </div>
            </div>

            <div class="pt-2 border-t border-white/5 flex items-center justify-between text-[11.5px]">
              <span style="color:var(--text-faint)">Trạng thái:</span>
              <span class="font-medium text-white truncate">${isCoinFull ? 'Đã đầy trữ lượng' : `Đầy vào: ${coinFullTime}`}</span>
            </div>
          </div>

          <!-- Parametric Transformer -->
          <div class="glass card p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center text-[13px]" style="background:rgba(124,111,240,.15); color:var(--accent)">
                    <i class="fa-solid fa-cube"></i>
                  </div>
                  <div>
                    <h4 class="font-semibold text-[13px]">Máy Biến Đổi Tham Số</h4>
                    <div class="text-[10.5px]" style="color:var(--text-faint)">Parametric Transformer</div>
                  </div>
                </div>
                <span class="pill px-2 py-0.5 text-[10.5px]" style="background:${transformerReady ? 'rgba(52,214,180,.14)' : 'rgba(255,255,255,.06)'}; color:${transformerReady ? 'var(--teal)' : 'var(--text-faint)'}">
                  ${transformerObtained ? (transformerReady ? 'Sẵn sàng' : 'Hồi chiêu') : 'Chưa có'}
                </span>
              </div>

              <div class="my-2.5">
                <div class="font-bold text-[16px] ${transformerReady ? 'text-[var(--teal)]' : 'text-white'}">
                  ${transformerObtained ? (transformerReady ? '<i class="fa-solid fa-circle-check mr-1"></i>Sẵn sàng sử dụng' : `<i class="fa-regular fa-clock mr-1 text-[var(--amber)]"></i>${transformerCD}`) : 'Chưa mở khóa vật phẩm'}
                </div>
                <div class="text-[11.5px] mt-1" style="color:var(--text-dim)">Hồi chiêu 7 ngày sau mỗi lần biến đổi</div>
              </div>
            </div>

            <div class="pt-2 border-t border-white/5 flex items-center justify-between text-[11.5px]">
              <span>Độ sẵn sàng:</span>
              <span class="font-semibold ${transformerReady ? 'text-[var(--teal)]' : 'text-white/60'}">${transformerReady ? '100% Sẵn sàng' : 'Đang chờ hồi chiêu'}</span>
            </div>
          </div>
        </div>

        <!-- 5. ARCHON QUEST & WEEKLY ACTIVITY PROGRESS -->
        <div class="glass card p-4 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] shrink-0" style="background:rgba(90,167,239,.15); color:var(--blue,#5aa7ef)">
              <i class="fa-solid fa-scroll"></i>
            </div>
            <div>
              <div class="font-semibold text-[13px]">Nhiệm Vụ Ma Thần &amp; Hoạt Động Tuần</div>
              <div class="text-[11.5px]" style="color:var(--text-dim)">Tiến độ cốt truyện chính: <span class="font-medium text-white">${archonFinished ? 'Hoàn thành toàn bộ' : 'Đang tiến hành'}</span></div>
            </div>
          </div>
          <div class="flex items-center gap-3 sm:self-center">
            <div class="text-right">
              <div class="text-[11px]" style="color:var(--text-faint)">Hoạt động tuần</div>
              <div class="mono font-bold text-[13px] text-white">${weekProgressCurrent}/${weekProgressTotal}</div>
            </div>
            <div class="w-16 h-2 rounded-full overflow-hidden bg-black/40 border border-white/5">
              <div class="h-full rounded-full bg-[var(--accent)]" style="width:${weekPct}%"></div>
            </div>
          </div>
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

  panel.innerHTML = `
    <div class="space-y-3">
      ${skeletonBlock(120)}
      ${skeletonBlock(100)}
      ${skeletonBlock(100)}
      ${skeletonBlock(140)}
    </div>
  `;

  try{
    const res = await fetch(`${GENSHIN_BASE}/accounts/${acc.id}/stats`, { headers: genshinAuthHeaders() });
    const d = await res.json();
    if(!res.ok || !d.ok) throw new Error(d.message || 'Failed to load stats');

    if (d.role) {
      if (d.role.avatar_url) acc.avatar_url = d.role.avatar_url;
      if (d.role.level) acc.role_level = d.role.level;
      if (d.role.nickname) acc.nickname = d.role.nickname;
      try {
        localStorage.setItem(`genshin_cache_${acc.id}`, JSON.stringify({
          avatar_url: d.role.avatar_url,
          level: d.role.level,
          nickname: d.role.nickname
        }));
      } catch(_) {}
      renderAccountBar();
    }

    const chests = d.stats.chests || {};
    const oculus = d.stats.oculus || {};
    const avatars = d.avatars || [];
    const totalChests = (chests.common ?? 0) + (chests.exquisite ?? 0) + (chests.precious ?? 0) + (chests.luxurious ?? 0) + (chests.magic ?? 0);

    panel.innerHTML = `
      <div class="space-y-4">
        <!-- 1. Profile Header & Key Stats (Keeps Avatar untouched) -->
        <div class="glass card p-4 sm:p-5 relative overflow-hidden bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent border border-white/10 shadow-xl">
          <div class="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-[var(--accent)]/10 blur-3xl pointer-events-none"></div>
          
          <div class="flex items-center justify-between gap-3 mb-4 relative z-10">
            <div class="flex items-center gap-3.5">
              <!-- AVATAR SECTION (UNTOUCHED AS REQUESTED) -->
              <div class="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-bold glass border-1 border-white" style="background-color: #8b5a2b; color: white;">
                ${d.role.avatar_url ? `<img src="${d.role.avatar_url}" class="w-full h-full object-cover" onerror="this.remove()">` : d.role.nickname[0]}
              </div>
              <div>
                <div class="font-bold text-[15px] text-white flex items-center gap-2">
                  <span>${d.role.nickname}</span>
                  <span class="pill px-2 py-0.5 text-[10px]" style="background:rgba(245,166,35,.15); color:var(--amber)">Cấp ${d.role.level}</span>
                </div>
                <div class="text-[11.5px] mono mt-0.5" style="color:var(--text-faint)">
                  ${acc.server || 'Asia Server'} <span class="text-white/20">·</span> UID <b class="text-white">${acc.uid || d.role.game_head_id || '890096220'}</b>
                </div>
              </div>
            </div>

            <button class="btn btn-ghost btn-sm text-[11.5px] py-1.5 px-3 shrink-0" onclick="renderRoleStats(document.getElementById('genshin-panel'))" title="Tải lại thống kê">
              <i class="fa-solid fa-rotate-right mr-1"></i> Làm mới
            </button>
          </div>

          <!-- Key Metrics Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 relative z-10">
            ${statChip(d.stats.active_days ?? 0, 'Ngày hoạt động', 'fa-calendar-days', '#34d6b4')}
            ${statChip(d.stats.achievements ?? 0, 'Thành tựu', 'fa-trophy', '#f5a623')}
            ${statChip(d.stats.avatars_count ?? avatars.length, 'Nhân vật', 'fa-users', '#7c6ff0')}
            ${statChip(d.stats.spiral_abyss || '—', 'La Hoàn', 'fa-shield-halved', '#5aa7ef')}
            ${statChip(d.stats.domains ?? 0, 'Bí cảnh', 'fa-dungeon', '#f4586b')}
            ${statChip(d.stats.way_points ?? 0, 'Điểm dịch chuyển', 'fa-location-dot', '#34d6b4')}
          </div>
        </div>

        <!-- 2. Chest Breakdown -->
        <div class="glass card p-4 sm:p-5 border border-white/10 shadow-lg">
          <div class="flex items-center justify-between mb-3.5">
            <h3 class="font-bold text-[14px] text-white flex items-center gap-2">
              <i class="fa-solid fa-gem text-[var(--amber)]"></i>
              <span>Thống Kê Thu Thập Rương Báu</span>
            </h3>
            <span class="text-[11px] mono" style="color:var(--text-faint)">
              Tổng cộng: <b class="text-white">${totalChests.toLocaleString()}</b> rương
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
            ${chestCard(chests.common ?? 0, 'Rương Thường', 'Common', '#9aa4b2')}
            ${chestCard(chests.exquisite ?? 0, 'Rương Cao Cấp', 'Exquisite', '#5aa7ef')}
            ${chestCard(chests.precious ?? 0, 'Rương Quý Giá', 'Precious', '#f5a623')}
            ${chestCard(chests.luxurious ?? 0, 'Rương Siêu Cấp', 'Luxurious', '#b48ef0')}
            ${chestCard(chests.magic ?? 0, 'Rương Kỳ Diệu', 'Remarkable', '#34d6b4')}
          </div>
        </div>

        <!-- 3. Oculus Progress -->
        <div class="glass card p-4 sm:p-5 border border-white/10 shadow-lg">
          <div class="flex items-center justify-between mb-3.5">
            <h3 class="font-bold text-[14px] text-white flex items-center gap-2">
              <i class="fa-solid fa-atom text-[var(--teal)]"></i>
              <span>Tiến Độ Thu Thập Thần Đồng</span>
            </h3>
            <span class="text-[11px] mono" style="color:var(--text-faint)">6 Nguyên tố</span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
            ${oculusCard(oculus.anemo ?? 0, 'Phong Thần Đồng', 'Anemo', 'fa-wind', '#34d6b4')}
            ${oculusCard(oculus.geo ?? 0, 'Nham Thần Đồng', 'Geo', 'fa-gem', '#f5a623')}
            ${oculusCard(oculus.electro ?? 0, 'Lôi Thần Đồng', 'Electro', 'fa-bolt-lightning', '#b48ef0')}
            ${oculusCard(oculus.dendro ?? 0, 'Thảo Thần Đồng', 'Dendro', 'fa-seedling', '#8b9a68')}
            ${oculusCard(oculus.hydro ?? 0, 'Thủy Thần Đồng', 'Hydro', 'fa-droplet', '#5aa7ef')}
            ${oculusCard(oculus.pyro ?? 0, 'Hỏa Thần Đồng', 'Pyro', 'fa-fire', '#f4586b')}
          </div>
        </div>

        <!-- 4. Characters List -->
        <div>
          <div class="flex items-center justify-between mb-3 px-1">
            <h3 class="font-bold text-[14px] text-white flex items-center gap-2">
              <i class="fa-solid fa-users text-[var(--accent)]"></i>
              <span>Danh Sách Nhân Vật Đã Mở Khóa (${avatars.length})</span>
            </h3>
            <span class="text-[11px] mono" style="color:var(--text-faint)">Chi tiết vũ khí &amp; TDV</span>
          </div>

          <div class="space-y-2.5">
            ${avatars.map(a => avatarCardHTML(a)).join('')}
          </div>
        </div>
      </div>
    `;
  } catch(err){
    panel.innerHTML = genshinErrorCard(err.message || 'Failed to load role stats');
  }
}

function statChip(val, label, icon, color){
  return `
    <div class="rounded-xl p-2.5 sm:p-3 text-center border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      <i class="fa-solid ${icon || 'fa-chart-simple'} text-[12px] mb-1 block" style="color:${color || 'var(--accent)'}"></i>
      <div class="font-extrabold text-[15px] sm:text-[16px] mono text-white leading-none">${val}</div>
      <div class="text-[9.5px] sm:text-[10px] mt-1 truncate" style="color:var(--text-dim)">${label}</div>
    </div>`;
}

function chestCard(val, name, rarityName, color){
  return `
    <div class="rounded-xl p-2 sm:p-2.5 border border-white/5 text-center relative overflow-hidden bg-white/[0.02] hover:border-white/15 transition-all">
      <div class="w-7 h-7 rounded-md mx-auto mb-1.5 flex items-center justify-center text-[12px] shadow-sm" style="background:${color}18; color:${color}">
        <i class="fa-solid fa-box-open"></i>
      </div>
      <div class="font-extrabold text-[14.5px] mono text-white leading-none">${val}</div>
      <div class="text-[10.5px] font-semibold mt-1 text-white/90 truncate">${name}</div>
      <div class="text-[9px] mono mt-0.5" style="color:var(--text-faint)">${rarityName}</div>
    </div>`;
}

function oculusCard(val, name, element, icon, color){
  return `
    <div class="rounded-xl p-2 sm:p-2.5 border text-center relative overflow-hidden transition-all hover:scale-[1.02]" style="background:${color}0a; border-color:${color}28">
      <div class="w-7 h-7 rounded-full mx-auto mb-1.5 flex items-center justify-center text-[12px] shadow-md border border-white/10" style="background:${color}22; color:${color}">
        <i class="fa-solid ${icon || 'fa-atom'}"></i>
      </div>
      <div class="font-extrabold text-[14.5px] mono leading-none" style="color:${color}">${val}</div>
      <div class="text-[10.5px] font-semibold mt-1 text-white/90 truncate">${name}</div>
      <div class="text-[9px] mono mt-0.5" style="color:var(--text-faint)">${element}</div>
    </div>`;
}

function rarityStars(n){
  if(!n) return '';
  const color = n>=5 ? '#f5a623' : (n>=4 ? '#b48ef0' : 'var(--text-faint)');
  return `<span class="mono" style="color:${color}; letter-spacing:-1px">${'★'.repeat(n)}</span>`;
}

function avatarCardHTML(a){
  const color = ELEMENT_COLOR[a.element] || '#7c6ff0';
  const is5Star = a.rarity >= 5;
  const relics = a.relics || [];
  const weapon = a.weapon || {};

  return `
    <div class="glass card overflow-hidden border border-white/5 hover:border-white/15 transition-all">
      <button type="button" class="w-full flex items-center gap-3 p-3 sm:p-3.5 text-left cursor-pointer group" onclick="toggleAvatarCard(this)">
        <!-- Character Avatar Image -->
        <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden glass border shrink-0 relative flex items-center justify-center" style="border-color:${color}44; background:${color}15">
          ${a.image 
            ? `<img src="${a.image}" alt="${a.name}" class="w-full h-full object-cover" onerror="this.outerHTML='<i class=\\'fa-solid fa-user text-[18px]\\'></i>'">` 
            : `<i class="fa-solid fa-user text-[18px]" style="color:${color}"></i>`}
          ${is5Star ? '<span class="absolute top-0.5 right-0.5 text-[8px] text-amber-400">★</span>' : ''}
        </div>

        <!-- Character Primary Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold text-[14px] text-white group-hover:text-[var(--accent)] transition-colors">${a.name}</span>
            <span class="pill px-1.5 py-0.2 text-[9.5px] mono font-bold" style="background:${a.constellation > 0 ? 'rgba(52,214,180,.15)' : 'rgba(255,255,255,.06)'}; color:${a.constellation > 0 ? 'var(--teal)' : 'var(--text-faint)'}">
              C${a.constellation ?? 0}
            </span>
            ${a.fetter != null ? `
              <span class="pill px-1.5 py-0.2 text-[9.5px] flex items-center gap-1" style="background:rgba(244,88,107,.12); color:var(--rose)">
                <i class="fa-solid fa-heart text-[8px]"></i>${a.fetter}
              </span>` : ''}
          </div>

          <div class="flex items-center gap-2 mt-1 text-[11.5px]" style="color:var(--text-dim)">
            <span class="mono font-semibold text-white/90">Lv.${a.level}</span>
            <span class="text-white/20">·</span>
            <span class="truncate max-w-[150px] sm:max-w-[200px]" title="${weapon.name || ''}">
              <i class="fa-solid fa-khanda text-[9px] mr-1 opacity-70"></i>${weapon.name || 'Chưa trang bị'}
            </span>
          </div>
        </div>

        <!-- Element Pill & Chevron -->
        <div class="flex items-center gap-2 shrink-0">
          <span class="pill px-2 py-0.5 text-[10.5px] font-semibold flex items-center gap-1" style="background:${color}18; color:${color}; border:1px solid ${color}33">
            ${a.element}
          </span>
          <div class="w-6 h-6 rounded-lg flex items-center justify-center bg-white/5 text-white/40 group-hover:text-white transition-colors">
            <i class="fa-solid fa-chevron-right chev-ic text-[10px] transition-transform duration-200"></i>
          </div>
        </div>
      </button>

      <!-- Collapsible Details: Weapon & Artifacts -->
      <div class="avatar-detail" style="display:none; border-top:1px solid var(--line)">
        <div class="p-3.5 sm:p-4 space-y-3">
          <!-- Weapon Card -->
          <div class="glass card p-3 flex items-center gap-3 border border-white/5">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center text-[16px] glass border border-white/10 shrink-0" style="background:rgba(255,255,255,.05); color:var(--amber)">
              <i class="fa-solid fa-khanda"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <span class="text-[13px] font-semibold text-white truncate">${weapon.name || 'Không có dữ liệu vũ khí'}</span>
                ${rarityStars(weapon.rarity)}
              </div>
              <div class="text-[11px] mono mt-0.5 flex items-center gap-2" style="color:var(--text-faint)">
                <span>Cấp: <b class="text-white">${weapon.level ?? '—'}</b></span>
                <span>·</span>
                <span>Tinh luyện: <b class="text-[var(--teal)]">R${weapon.affix_level ?? 1}</b></span>
              </div>
            </div>
          </div>

          <!-- Relics / Artifacts Grid -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11.5px] font-semibold text-white flex items-center gap-1.5">
                <i class="fa-solid fa-shield text-[var(--accent)]"></i> Thánh Di Vật (${relics.length}/5)
              </span>
            </div>

            ${relics.length ? `
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${relics.map(r => `
                  <div class="rounded-lg p-2.5 bg-white/[0.02] border border-white/5 flex items-center justify-between gap-2 text-[11.5px]">
                    <div class="min-w-0 flex-1">
                      <div class="font-medium text-white truncate">${r.name}</div>
                      <div class="text-[10px] truncate mt-0.5" style="color:var(--text-dim)">
                        ${r.pos_name ? r.pos_name + ' · ' : ''}${r.set_name || 'Set'}
                      </div>
                    </div>
                    <div class="text-right shrink-0">
                      <div class="mono font-bold text-[var(--teal)]">+${r.level}</div>
                      <div class="text-[9px]">${rarityStars(r.rarity)}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="text-[11.5px] py-2 text-center" style="color:var(--text-faint)">Chưa trang bị Thánh Di Vật</div>
            `}
          </div>
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

  panel.innerHTML = `
    <div class="space-y-3">
      ${skeletonBlock(90)}
      <div class="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
        ${Array(28).fill(0).map(() => skeletonBlock(85)).join('')}
      </div>
    </div>
  `;

  try{
    let res = await fetch(`${GENSHIN_BASE}/accounts/${acc.id}/checkin-list`, { headers: genshinAuthHeaders() });
    if(res.status === 404 || res.status === 405){
      res = await fetch(`${GENSHIN_BASE}/accounts/${acc.id}/checkin-list`, { method: 'POST', headers: genshinAuthHeaders() });
    }
    const d = await res.json();
    if(!res.ok || d.ok === false) throw new Error(d.message || 'Failed to load rewards calendar');

    const monthlyAwards = d.monthly_awards || d.awards || [];
    const extraAwards = d.extra_awards || d.short_extra_award || [];
    const currentMonth = d.month || d.now_month || (new Date().getMonth() + 1);
    const totalSignDay = Number(d.total_sign_day ?? d.signed_count ?? (monthlyAwards.filter(a => a.claimed || a.is_sign).length));
    const isTodaySigned = d.is_sign === true || d.today_signed === true;
    const resignAvailable = d.resign_available || d.resign_count > 0;

    panel.innerHTML = `
      <div class="space-y-4">
        <!-- 1. Header Overview Banner -->
        <div class="glass card p-4 sm:p-5 relative overflow-hidden bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent border border-white/10 shadow-xl">
          <div class="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-[var(--amber)]/10 blur-3xl pointer-events-none"></div>
          
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div class="flex items-start sm:items-center gap-3.5">
              <div class="w-11 h-11 rounded-2xl flex items-center justify-center text-[20px] shadow-lg border border-white/10 shrink-0" style="background:rgba(245,166,35,.18); color:var(--amber)">
                <i class="fa-solid fa-calendar-check"></i>
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="display font-bold text-[16px] sm:text-[18px] text-white">Lịch Điểm Danh HoyoLAB · Tháng ${currentMonth}</h3>
                  ${isTodaySigned 
                    ? '<span class="pill px-2 py-0.5 text-[10px]" style="background:rgba(52,214,180,.15); color:var(--teal)"><i class="fa-solid fa-circle-check mr-1"></i>Hôm nay: Đã điểm danh</span>' 
                    : '<span class="pill px-2 py-0.5 text-[10px]" style="background:rgba(245,166,35,.15); color:var(--amber)"><i class="fa-solid fa-clock mr-1"></i>Hôm nay: Chưa điểm danh</span>'}
                </div>
                <div class="text-[12px] mt-1 flex items-center gap-2 flex-wrap" style="color:var(--text-dim)">
                  <span>Đã tích lũy: <b class="text-white mono">${totalSignDay}</b> / ${monthlyAwards.length || 31} ngày</span>
                  <span class="text-white/20">·</span>
                  <span>Tài khoản: <b class="text-white">${acc.nickname || ('UID ' + acc.uid)}</b></span>
                  ${resignAvailable ? `<span class="pill px-1.5 py-0.2 text-[9.5px]" style="background:rgba(124,111,240,.15); color:var(--accent)">Có lượt ký bù</span>` : ''}
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button class="btn btn-ghost btn-sm text-[11.5px] py-1.5 px-3" onclick="renderCalendar(document.getElementById('genshin-panel'))" title="Tải lại">
                <i class="fa-solid fa-rotate-right mr-1"></i> Làm mới
              </button>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="w-full h-2 rounded-full overflow-hidden bg-black/40 border border-white/5 mt-3.5">
            <div class="h-full rounded-full transition-all duration-500" style="width:${Math.min(100, Math.round((totalSignDay / (monthlyAwards.length || 31)) * 100))}%; background:linear-gradient(90deg, var(--teal), var(--amber))"></div>
          </div>
        </div>

        <!-- 2. Extra Milestone Rewards (if available) -->
        ${extraAwards.length ? `
          <div>
            <h4 class="font-semibold text-[13px] mb-2.5 px-1 flex items-center gap-1.5 text-white">
              <i class="fa-solid fa-gift text-[var(--accent)]"></i>
              <span>Phần Thưởng Cột Mốc Điểm Danh</span>
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              ${extraAwards.map(e => {
                const isReached = totalSignDay >= (e.sign_day_required || 0);
                return `
                <div class="glass card p-3 flex items-center gap-3 border ${isReached ? 'border-[var(--teal)]/30 bg-[rgba(52,214,180,.04)]' : 'border-white/5'}">
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 glass border border-white/10 ${isReached ? 'bg-[rgba(52,214,180,.15)] text-[var(--teal)]' : 'bg-white/5 text-[var(--amber)]'}">
                    ${e.icon ? `<img src="${e.icon}" class="w-6 h-6 object-contain" onerror="this.outerHTML='<i class=\\'fa-solid fa-star\\'></i>'">` : '<i class="fa-solid fa-star text-[14px]"></i>'}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-1">
                      <span class="text-[12px] font-semibold truncate text-white">Mốc ${e.sign_day_required} Ngày</span>
                      <span class="pill px-1.5 py-0.2 text-[9.5px]" style="background:${isReached ? 'rgba(52,214,180,.15)' : 'rgba(255,255,255,.06)'}; color:${isReached ? 'var(--teal)' : 'var(--text-faint)'}">
                        ${isReached ? 'Đạt mốc' : 'Chưa đạt'}
                      </span>
                    </div>
                    <div class="text-[11px] mono truncate mt-0.5" style="color:var(--text-dim)">
                      ×${e.count} phần thưởng thêm
                    </div>
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 3. Monthly Awards Grid -->
        <div>
          <div class="flex items-center justify-between mb-2.5 px-1">
            <h4 class="font-semibold text-[13px] flex items-center gap-1.5 text-white">
              <i class="fa-solid fa-boxes-stacked text-[var(--amber)]"></i>
              <span>Danh Sách Phần Thưởng 31 Ngày</span>
            </h4>
            <span class="text-[11px] mono" style="color:var(--text-faint)">Tháng ${currentMonth} / ${new Date().getFullYear()}</span>
          </div>

          <div class="grid grid-cols-5 sm:grid-cols-7 gap-1.5 sm:gap-2">
            ${monthlyAwards.map(a => {
              const dayNum = Number(a.day || a.id || 0);
              const isClaimed = Boolean(a.claimed || a.is_sign || (totalSignDay >= dayNum));
              const isToday = Boolean(a.today || (!isTodaySigned && totalSignDay + 1 === dayNum));
              const isPrimogem = Boolean((a.name && (a.name.toLowerCase().includes('primo') || a.name.includes('Nguyên Thạch'))) || (a.icon && a.icon.toLowerCase().includes('primogem')));

              return `
              <div class="glass card p-1.5 sm:p-2 text-center relative overflow-hidden flex flex-col justify-between group transition-all duration-200 border ${
                isToday 
                  ? 'border-[var(--amber)] shadow-[0_0_10px_rgba(245,166,35,.25)] bg-[rgba(245,166,35,.05)] ring-1 ring-[var(--amber)]/50' 
                  : (isPrimogem ? 'border-amber-500/35 bg-amber-500/[0.03]' : 'border-white/5 hover:border-white/20')
              }">
                <!-- Day Header -->
                <div class="flex items-center justify-between text-[8.5px] sm:text-[9px] mb-0.5">
                  <span class="mono font-semibold ${isToday ? 'text-[var(--amber)]' : 'text-white/40'}">Ngày ${dayNum}</span>
                  ${isPrimogem ? '<i class="fa-solid fa-sparkles text-[8px] text-[var(--amber)]" title="Nguyên Thạch"></i>' : ''}
                </div>

                <!-- Reward Icon -->
                <div class="w-7 h-7 sm:w-8 sm:h-8 mx-auto my-0.5 flex items-center justify-center relative">
                  ${a.icon 
                    ? `<img src="${a.icon}" alt="${a.name || 'Reward'}" class="w-full h-full object-contain filter drop-shadow-sm group-hover:scale-110 transition-transform duration-200" onerror="this.outerHTML='<i class=\\'fa-solid fa-gift text-[14px] text-white/50\\'></i>'">` 
                    : '<i class="fa-solid fa-gift text-[14px] text-white/50"></i>'}
                </div>

                <!-- Reward Name & Count -->
                <div class="mt-0.5">
                  <div class="text-[8.5px] sm:text-[9px] truncate max-w-full text-white/60" title="${a.name}">${a.name}</div>
                  <div class="text-[10px] sm:text-[11px] font-bold mono mt-0.5 ${isPrimogem ? 'text-[var(--amber)]' : 'text-[var(--teal)]'}">
                    ×${a.count}
                  </div>
                </div>

                <!-- Claimed / Today Overlay -->
                ${isClaimed ? `
                  <div class="absolute inset-0 bg-black/55 backdrop-blur-[0.5px] rounded-xl flex flex-col items-center justify-center z-20">
                    <div class="w-5 h-5 rounded-full flex items-center justify-center bg-[rgba(52,214,180,.25)] border border-[var(--teal)] text-[var(--teal)] shadow-sm">
                      <i class="fa-solid fa-check text-[9px]"></i>
                    </div>
                  </div>
                ` : ''}

                ${isToday && !isClaimed ? `
                  <div class="absolute top-0 right-0 bg-[var(--amber)] text-black font-extrabold text-[7.5px] px-1 py-0.2 rounded-bl-md shadow">
                    Nay
                  </div>
                ` : ''}
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- 4. Footer Note -->
        <div class="glass card p-3.5 border border-white/5 flex items-center gap-3 text-[11.5px]" style="color:var(--text-dim)">
          <i class="fa-solid fa-circle-info text-[var(--accent)] text-[14px] shrink-0"></i>
          <div>
            Hệ thống tự động điểm danh hàng ngày được kích hoạt lúc <b class="text-white">00:00 (GMT+8)</b>. Bạn có thể bật tính năng tự động trong phần <b>Cài đặt tài khoản</b>.
          </div>
        </div>
      </div>
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
  if (Sayraa.accent === c) return;
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

function setTheme(themeKey, isUserAction = true) {
  if (!themeKey) return;
  let key = themeKey.toLowerCase();
  if (key === 'classic-dark' || key === 'classic') key = 'classic_dark';
  if (!VALID_APPEARANCES.includes(key)) {
    key = 'system';
  }

  // Prevent duplicate action / toast spam if clicking the already selected theme
  if (isUserAction && Sayraa.theme === key) {
    return;
  }

  Sayraa.theme = key;

  try {
    localStorage.setItem('appearance', key);
  } catch (e) {}

  applyThemeDOM(key);
  initSystemThemeListener();

  document.querySelectorAll('.theme-option').forEach(el => {
    const elTheme = el.getAttribute('data-theme');
    const isMatch = elTheme === key || 
      (key === 'classic_dark' && (elTheme === 'classic_dark' || elTheme === 'classic-dark'));
    const box = el.querySelector('.theme-card-box');
    const label = el.querySelector('.theme-card-label');

    if (box) {
      if (isMatch) {
        box.classList.remove('border-transparent', 'group-hover:border-[var(--line-strong)]');
        box.classList.add('border-[var(--accent)]');
      } else {
        box.classList.remove('border-[var(--accent)]');
        box.classList.add('border-transparent', 'group-hover:border-[var(--line-strong)]');
      }
    }
    if (label) {
      if (isMatch) {
        label.classList.remove('text-[var(--text-dim)]');
        label.classList.add('text-[var(--text)]');
      } else {
        label.classList.remove('text-[var(--text)]');
        label.classList.add('text-[var(--text-dim)]');
      }
    }
  });

  const themeNames = {
    system: 'System',
    dark: 'Dark',
    light: 'Light',
    classic_dark: 'Classic Dark'
  };
  const themeName = themeNames[key] || themeKey;

  if (isUserAction) {
    showToast('info', `${themeName} theme selected`);
    if (Sayraa.user && Sayraa.user.token) {
      fetch(SETTINGS_BASE, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${Sayraa.user.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: key })
      }).catch(e => console.error('Failed to save theme setting', e));
    }
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

/* ============ PORTFOLIO HELPERS ============ */
function filterProjects(cat, btn) {
  document.querySelectorAll('.filter-tab').forEach(b => {
    b.classList.remove('bg-[var(--accent-soft)]', 'text-[var(--accent)]', 'border', 'border-[var(--accent)]');
    b.style.color = 'var(--text-faint)';
  });
  if (btn) {
    btn.classList.add('bg-[var(--accent-soft)]', 'text-[var(--accent)]', 'border', 'border-[var(--accent)]');
    btn.style.color = 'var(--accent)';
  }

  document.querySelectorAll('.project-card').forEach(card => {
    if (cat === 'all' || card.dataset.cat === cat) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

function copyText(text, successMsg) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('success', successMsg || 'Copied to clipboard');
    }).catch(() => fallbackCopy(text, successMsg));
  } else {
    fallbackCopy(text, successMsg);
  }
}

function fallbackCopy(text, successMsg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast('success', successMsg || 'Copied to clipboard');
}
