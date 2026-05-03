const SHEET_ID = '1-yF9f9LepfGBpg1fyhewTcgT7oePscPEScD9v-8Ggn4';
    const API_URL = 'https://script.google.com/macros/s/AKfycbz0X0mVJrnPbpe1AbljY60OuQ1DTZ1NpL968NUabwZVtwm3ArjOZN3gw3IpBrppKDpDdA/exec';
    const POLL_MS = 0;

    const CATEGORIES = ['Spotify', 'Claude', 'ChatGPT', 'Grok'];

    const csvAcc = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Accounts`;
    const csvCdk = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=CDK`;
    const csvStats = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Stats`;
    const csvProfit = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=ProfitProducts`;
    const csvSales = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=PlayerokOrders`;

    let salesRows = [];
    let isAdmin = false;
    let accounts = [];
    let cdks = [];
    let statsRows = [];
    let profitRows = [];
    let currentTab = 'accounts';
    let filterType = 'all';
    let filterUsed = 'all';
    let filterCategory = 'all';
    let profitGame = 'Roblox';
    let accountRates = JSON.parse(localStorage.getItem('accountRates') || '{}');

    if (!accountRates.default) accountRates.default = '0.783';
    if (!accountRates.Roblox) accountRates.Roblox = accountRates.default;
    let playerokRate = Number(localStorage.getItem('playerokRate') || '80.36');
    let editId = null;
    let customOrder = null;
    let pollTimer = null;
    let selected = new Set();
    let confirmResolve = null;
    let currentUser = "";
    

function showConfirm(title, text, type = 'danger') {
  return new Promise(resolve => {
    confirmResolve = resolve;

    const isAdd = type === 'add';

    document.getElementById('modal-title').textContent = '';
    document.getElementById('modal-body').innerHTML = `
      <div class="confirm-box ${isAdd ? 'confirm-add' : 'confirm-danger'}">
        <button class="confirm-x" onclick="confirmNo()">✕</button>

        <div class="confirm-icon">
          ${isAdd ? '🔑' : '🗑'}
        </div>

        <div class="confirm-title">${title}</div>
        <div class="confirm-text">${text}</div>

        <div class="confirm-actions">
          <button class="btn-cancel" onclick="confirmNo()">Скасувати</button>
          <button class="${isAdd ? 'btn-confirm-add' : 'btn-danger'}" onclick="confirmYes()">
            ${isAdd ? '＋ Додати' : '🗑 Підтвердити'}
          </button>
        </div>
      </div>
    `;

    document.getElementById('modal').style.display = 'flex';
  });
}

function confirmYes() {
  document.getElementById('modal').style.display = 'none';
  if (confirmResolve) confirmResolve(true);
}

function confirmNo() {
  document.getElementById('modal').style.display = 'none';
  if (confirmResolve) confirmResolve(false);
}
    function toast(text, type = 'ok') {
  const box = document.getElementById('toast');
  if (!box) return;

  const el = document.createElement('div');
  el.className = 'toast-msg ' + type;
  el.textContent = text;

  box.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, 2500);
}

    function authRequest(login, password) {
  return new Promise(resolve => {
    const cb = "auth_cb_" + Date.now();

    window[cb] = data => {
      delete window[cb];
      script.remove();
      resolve(data);
    };

    const script = document.createElement("script");
    script.src =
      API_URL +
      "?callback=" + cb +
      "&login=" + encodeURIComponent(login) +
      "&password=" + encodeURIComponent(password);

    document.body.appendChild(script);
  });
}

async function tryLogin() {
  const pw = document.getElementById("pw-input").value;
  const res = await authRequest("admin", pw);

  if (res.status === "ok") {
    localStorage.setItem("managerRole", "admin");
    localStorage.setItem("workerName", "Admin");

    currentUser = "Admin";
    isAdmin = true;
    startApp();
  } else {
    document.getElementById("pw-err").style.display = "block";
    toast("Невірний Пароль Власника", "err");
  }
}

async function enterAsWorker() {
  const name = document.getElementById('worker-name').value.trim();
  const pass = document.getElementById('worker-pass').value.trim();

  if (!name) {
    toast('Введи нік працівника', 'err');
    return;
  }

  const res = await authRequest(name, pass);

  if (res.status === 'ok') {
    localStorage.setItem('managerRole', 'worker');
    localStorage.setItem('workerName', name);

    isAdmin = false;
    currentUser = name;
    startApp();
  } else {
    toast('Невірний нік або пароль працівника', 'err');
  }
}

    function logout() {
  localStorage.removeItem('managerRole');
  clearInterval(pollTimer);
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('pw-input').value = '';
}

    function startApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  currentUser = localStorage.getItem("workerName") || "";

  const badge = document.getElementById('role-badge');
  badge.className = 'role-badge ' + (isAdmin ? 'admin' : 'worker');

  badge.innerHTML = isAdmin
      ? `ВЛАСНИК`
      : `${currentUser || 'Працівник'}`;

  document.getElementById('btn-add').style.display = isAdmin ? 'flex' : 'none';

  loadData();

  clearInterval(pollTimer);
}

    function parseCSV(text) {
      const clean = text.trim();
      if (!clean) return [];

      const lines = clean.split('\n');
      if (lines.length < 2) return [];

      const headers = parseLine(lines[0]);

      return lines.slice(1).map(line => {
        const vals = parseLine(line);
        const obj = {};

        headers.forEach((h, i) => {
        obj[h.trim()] = (vals[i] || '').trim();
        });

        obj.__cells = vals;
      return obj;
      }).filter(r => Object.values(r).some(v => v));
    }

    function parseLine(line) {
      const result = [];
      let cur = '';
      let inQ = false;

      for (let i = 0; i < line.length; i++) {
        const c = line[i];

        if (c === '"') {
          if (inQ && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQ = !inQ;
          }
        } else if (c === ',' && !inQ) {
          result.push(cur);
          cur = '';
        } else {
          cur += c;
        }
      }

      result.push(cur);
      return result;
    }

    async function loadCSV(url) {
  try {
    const r = await fetch(url + '&t=' + Date.now());
    if (!r.ok) return [];
    return parseCSV(await r.text());
  } catch (e) {
    console.error('CSV error:', url, e);
    return [];
  }
}

async function loadData() {
  try {
    const [accRaw, cdkRaw, statsRaw, profitRaw, salesRaw] = await Promise.all([
        loadCSV(csvAcc),
        loadCSV(csvCdk),
        loadCSV(csvStats),
        loadCSV(csvProfit),
        loadCSV(csvSales)
    ]);

    accounts = accRaw.map((a, i) => ({ ...a, _id: i }));

    cdks = cdkRaw.map((c, i) => ({
      ...c,
      _id: i,
      _used: String(c.used || '').toLowerCase() === 'true' || c.used === '1',
      category: c.category || 'Spotify',
      note: String(c.note || '').toLowerCase() === 'false' ? '' : (c.note || ''),
      used_at: c.used_at || '',
      used_by: c.used_by || ''
    }));

    statsRows = statsRaw;
    salesRows = salesRaw;

    profitRows = profitRaw.map((r, i) => {
  const vals = Object.values(r);

  return {
    _row: i,
    game: String(vals[0] || '').trim(),
    product: String(vals[1] || '').trim(),
    sell_rub: String(vals[2] || '').trim(),
    buy_usd: String(vals[3] || '').trim(),
    match: String(vals[4] || '').trim()
  };
});

    updateStats();
    render();
    renderCategoryStats();

    document.getElementById('sync-info').textContent = '';
  } catch (e) {
    console.error(e);
    document.getElementById('sync-info').textContent = '⚠ Помилка завантаження — відкрий Console';
  }
}
    
function getUsedTotal(category) {
  return statsRows
    .filter(s => s.category === category)
    .reduce((sum, s) => sum + Number(s.used_count || 0), 0);
}

function getUsedToday(category) {
  const now = new Date();
  const today =
    now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');

  return statsRows
    .filter(s => normalizeDate(s.date) === today && s.category === category)
    .reduce((sum, s) => sum + Number(s.used_count || 0), 0);
}

function todayLocal() {
  const d = new Date();

  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function normalizeDate(value) {
  const v = String(value || '').trim();
  if (!v) return '';

  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);

  const m = v.match(/Date\((\d+),(\d+),(\d+)\)/);
  if (m) {
    return `${m[1]}-${String(Number(m[2]) + 1).padStart(2, '0')}-${String(Number(m[3])).padStart(2, '0')}`;
  }

  const eu = v.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (eu) {
    return `${eu[3]}-${eu[2]}-${eu[1]}`;
  }

  return v;
}

    function updateStats() {
      document.getElementById('s-acc').textContent = accounts.length;

      const active = cdks.filter(c => !c._used).length;
      document.getElementById('s-active').textContent = active;

      const usedTotal = CATEGORIES.reduce((sum, c) => sum + getUsedTotal(c), 0);
      document.getElementById('s-used-total').textContent = usedTotal;
    }

    function renderCategoryStats() {
  const wrap = document.getElementById('cat-stats');

  if (currentTab === 'profit') {
  wrap.style.display = 'none';
  wrap.innerHTML = '';
  return;
}    

  if (currentTab === 'accounts') {
    wrap.style.display = 'grid';

    const appCount = accounts.filter(a => String(a.type || '').toLowerCase() === 'itunes').length;
    const xboxCount = accounts.filter(a => String(a.type || '').toLowerCase() === 'xbox').length;

    const appBalance = getAccountBalance('itunes');
    const xboxBalance = getAccountBalance('xbox');

    wrap.className = 'cat-stats accounts-mode';

wrap.innerHTML = `
  <div class="account-quick-card xbox" onclick="filterType='xbox';render();renderCategoryStats()">
    ${accIcon('xbox')}
    <div>
      <div class="account-quick-title">Xbox</div>
      <div class="account-quick-stats">
        <div>
          <div class="account-quick-label">Всього акаунтів</div>
          <div class="account-quick-num" style="color:#4ade80">${xboxCount}</div>
        </div>
        <div>
          <div class="account-quick-label">Загальний баланс</div>
          <div class="account-quick-num" style="color:#4ade80">$${xboxBalance}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="account-quick-card itunes" onclick="filterType='itunes';render();renderCategoryStats()">
    ${accIcon('itunes')}
    <div>
      <div class="account-quick-title">App Store</div>
      <div class="account-quick-stats">
        <div>
          <div class="account-quick-label">Всього акаунтів</div>
          <div class="account-quick-num" style="color:#3b82f6">${appCount}</div>
        </div>
        <div>
          <div class="account-quick-label">Загальний баланс</div>
          <div class="account-quick-num" style="color:#3b82f6">$${appBalance}</div>
        </div>
      </div>
    </div>
  </div>
`;
return;
}

  wrap.className = 'cat-stats';
  wrap.style.display = 'grid';

  wrap.innerHTML = CATEGORIES.map(cat => {
    const active = cdks.filter(c => !c._used && c.category === cat).length;
    const usedTotal = getUsedTotal(cat);
    const usedToday = getUsedToday(cat);

    return `
      <div class="cat-card ${filterCategory === cat ? 'active' : ''}" onclick="setCategory('${cat}')">
        <div class="cat-name">${catIcon(cat)} ${cat}</div>

        <div class="cat-row">
          <div>
            <div>Активні</div>
            <div class="cat-num" style="color:#4ade80">${active}</div>
          </div>

          <div>
            <div>Сьогодні</div>
            <div class="cat-num" style="color:#facc15">${usedToday}</div>
          </div>

          <div>
            <div>Всього</div>
            <div class="cat-num" style="color:#f87171">${usedTotal}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

    function setCategory(cat) {
      filterCategory = filterCategory === cat ? 'all' : cat;
      currentTab = 'cdks';
      switchTab('cdks', true);
      render();
      renderCategoryStats();
    }

    function switchTab(tab, keepCategory = false) {
      currentTab = tab;

      document.body.classList.toggle('profit-mode', tab === 'profit');

      document.getElementById('tab-accounts').className =
        'tab-btn' + (tab === 'accounts' ? ' active' : '');

      document.getElementById('tab-cdks').className =
        'tab-btn' + (tab === 'cdks' ? ' active' : '');

      document.getElementById('tab-profit').className =
  'tab-btn' + (tab === 'profit' ? ' active' : '');

      document.getElementById('search').value = '';
      document.getElementById('top-stats').style.display =
      currentTab === 'profit' ? 'none' : 'grid';
      document.getElementById('btn-add').style.display =
      isAdmin && currentTab !== 'profit' ? 'flex' : 'none';
      filterType = 'all';
      filterUsed = 'all';

      if (!keepCategory && tab !== 'cdks') {
        filterCategory = 'all';
      }

      const cards = document.getElementById('cards');
if (cards) {
  cards.style.animation = 'none';
  cards.offsetHeight;
  cards.style.animation = '';
}

render();
renderCategoryStats();
    }

   function renderChips() {
  const c = document.getElementById('chips');

  if (currentTab === 'profit') {
    const games = [...new Set(profitRows.map(r => r.game).filter(Boolean))];

    c.innerHTML = games.map(game => `
      <button class="chip${profitGame === game ? ' active' : ''}" onclick="setProfitGame('${esc(game)}')">
        ${esc(game)}
      </button>
    `).join('');

    return;
  }

  if (currentTab === 'accounts') {
    c.innerHTML = ['all', 'xbox', 'itunes'].map(v => `
      <button class="chip${filterType === v ? ' active' : ''}" onclick="filterType='${v}';render()">
        ${v === 'all' ? 'Всі' : v === 'xbox' ? 'Xbox' : 'App Store'}
      </button>
    `).join('');
    return;
  }

  c.innerHTML = `
    <button class="chip chip-all${filterUsed === 'all' ? ' active' : ''}" onclick="filterUsed='all';render()">Всі</button>
    <button class="chip chip-active${filterUsed === 'active' ? ' active' : ''}" onclick="filterUsed='active';render()">✓ Активні</button>
    <button class="chip chip-used${filterUsed === 'used' ? ' active' : ''}" onclick="filterUsed='used';render()">✕ Використані</button>
    <button class="chip chip-today${filterUsed === 'today' ? ' active' : ''}" onclick="filterUsed='today';render()">📅 За день</button>
  `;
}

function setProfitGame(game) {
  profitGame = game;
  render();
}    

function render() {
      renderChips();
      renderActions();

            const q = document.getElementById('search').value.toLowerCase();
      const el = document.getElementById('cards');

      if (currentTab === 'profit') {
        renderProfit();
        return;
      }

      if (currentTab === 'accounts') {
        let list = accounts.filter(a => {
  if (filterType !== 'all' && (a.type || '').toLowerCase() !== filterType) return false;
  if (!q) return true;

  return (
    (a.login || '') +
    (a.note || '') +
    (a.rate || '') +
    (a.type || '')
  ).toLowerCase().includes(q);
}).sort((a, b) => {
  return moneyNum(b.balance) - moneyNum(a.balance);
});

        el.innerHTML = list.length
          ? list.map(accCard).join('')
          : '<div class="empty">Акаунтів не знайдено</div>';
      } else {
        let list = cdks.filter(c => {
          if (filterUsed === 'active' && c._used) return false;
          if (filterUsed === 'used' && !c._used) return false;
          if (filterUsed === 'today') {
          if (!c._used) return false;
  if (!c.used_at) return false;

  const today = todayLocal();
  if (normalizeDate(c.used_at) !== today) return false;
}
          if (filterCategory !== 'all' && c.category !== filterCategory) return false;
          if (!q) return true;

          return (
            (c.label || '') +
            (c.code || '') +
            (c.note || '') +
            (c.category || '')
          ).toLowerCase().includes(q);
        });

        el.innerHTML = list.length
          ? list.map(cdkCard).join('')
          : '<div class="empty">Кодів не знайдено</div>';
      }
    }

    function num(v) {
  return Number(String(v || '0').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
}

function fixedFee(sell) {
  if (sell < 500) return 19;
  if (sell < 1000) return 25;
  if (sell < 2500) return 37;
  if (sell < 5000) return 49;
  if (sell < 10000) return 75;
  return 99;
}

function fmtRubNoZero(v) {
  return Math.round(v).toLocaleString('ru-RU') + ' ₽';
}

function fmtUsd(v) {
  return '$' + v.toFixed(2).replace('.', ',');
}

function getSalesRows(period = 'day') {
  return getSalesRowsRaw(period).filter(r => {
    const status = String(r.status || '').toUpperCase();
    const matched = String(r.matched || '').toUpperCase();
    const profit = num(r.profit_usd);

    if (status !== 'SENT' && status !== 'CONFIRMED') return false;
    if (matched === 'NO') return false;
    if (!profit) return false;

    return true;
  });
}

function getUnmatchedSales(period = 'day') {
  return getSalesRowsRaw(period).filter(r => {
    return String(r.matched || '').toUpperCase() === 'NO' || num(r.profit_usd) === 0;
  });
}

function openUnmatchedSales() {
  const list = getUnmatchedSales('day');

  document.getElementById('modal-title').textContent = 'Продажі без match';

  document.getElementById('modal-body').innerHTML = list.length
    ? `
      <div style="display:grid;gap:10px">
        ${list.map(r => `
          <div class="field-note">
            <b>${esc(r.title || 'Без назви')}</b><br>
            <span>${esc(r.date || '')}</span>
          </div>
        `).join('')}
      </div>
    `
    : `<div class="empty">Всі продажі сьогодні знайдені ✅</div>`;

  document.getElementById('modal').style.display = 'flex';
}

function getSalesRows(period = 'day') {
  return getSalesRowsRaw(period).filter(r => {
    return String(r.matched || '').toUpperCase() !== 'NO' && num(r.profit_usd) !== 0;
  });
}

function getSalesSum(field = 'profit_usd', period = 'day') {
  return getSalesRows(period)
    .reduce((sum, r) => sum + num(r[field]), 0);
}

function getSalesCount(period = 'day') {
  return getSalesRows(period).length;
}  

function gameIcon(game) {
  const g = String(game || '').toLowerCase();

  if (g.includes('roblox')) return 'roblox.png';
  if (g.includes('clash royale')) return 'clashroyale.png';
  if (g.includes('brawl')) return 'brawlstars.png';
  if (g.includes('fc')) return 'fcmobile.png';
  if (g.includes('clash of clans')) return 'clashofclans.png';
  if (g.includes('app') || g.includes('apps')) return 'apps.png';

  return 'game.png';
}    

function getProfitIcon(game) {
  const g = String(game || '').toLowerCase();

  if (g.includes('roblox')) return 'roblox.png';
  if (g.includes('clash royale')) return 'clashroyale.png';
  if (g.includes('brawl')) return 'brawlstars.png';
  if (g.includes('clash of clans')) return 'clashofclans.png';
  if (g.includes('fc')) return 'fcmobile.png';
  if (g.includes('apps') || g.includes('app')) return 'apps.png';

  return 'game.png';
}

function profitUsesAccountRate() {
  const g = String(profitGame || '').toLowerCase();
  return !g.includes('apps') && !g.includes('app');
}

function showCustomOrderBtn() {
  const g = String(profitGame || '').toLowerCase();
  return !g.includes('apps') && !g.includes('app') && !g.includes('roblox');
}    

function renderProfit() {
  const el = document.getElementById('cards');
  const q = document.getElementById('search').value.toLowerCase();

  const accountRate = getCurrentAccountRate();
  const playerokRate = getPlayerokRate();
  const useAccRate = profitUsesAccountRate();

  const rows = profitRows.filter(r => {
    if (profitGame && String(r.game).trim() !== String(profitGame).trim()) return false;
    return !q || ((r.product || '') + (r.match || '')).toLowerCase().includes(q);
  }).map(r => calcProfitRow(r, accountRate, playerokRate));

  const dayUsd = getSalesSum('profit_usd', 'day');
  const salesToday = getSalesCount('day');
  const monthUsd = getSalesSum('profit_usd', 'month');
  const unmatchedToday = getUnmatchedSales('day').length;

  el.innerHTML = `
    <div class="profit-dashboard">
      <div class="profit-stat">
        <span>Прибуток сьогодні</span>
        <b>${fmtUsd(dayUsd)}</b>
      </div>

      <div class="profit-stat">
        <span>Продажів сьогодні</span>
        <b>${salesToday}</b>
      </div>

      <div class="profit-stat profit-custom" onclick="openUnmatchedSales()">
        <span>Без match сьогодні</span>
        <b style="color:${unmatchedToday ? '#f87171' : '#4ade80'}">${unmatchedToday}</b>
      </div>

      <div class="profit-stat">
        <span>Прибуток за місяць</span>
        <b>${fmtUsd(monthUsd)}</b>
      </div>

      ${showCustomOrderBtn() ? `
        <div class="profit-stat profit-custom" onclick="openCustomOrder()">
          <span>Індивідуальний заказ</span>
          <b>🧾</b>
        </div>
      ` : ''}
    </div>

    <div class="profit-box">
      <div class="profit-head">
        <div>
          <div class="profit-title">💸 Profit Board</div>
        </div>

        ${isAdmin ? `
          <button class="btn-mini" onclick="openAddProfitProduct()">
            ＋ Додати товар
          </button>
        ` : ''}

        <div class="profit-rate-panel">
          ${useAccRate ? `
            <div class="profit-rate-card">
              <span>Курс Accounts</span>
              <b>${accountRate}</b>
              <button onclick="editAccountRate()">змінити</button>
            </div>
          ` : ''}

          <div class="profit-rate-card">
            <span>Курс Playerok</span>
            <b>${playerokRate}</b>
            <button onclick="editPlayerokRate()">змінити</button>
          </div>
        </div>
      </div>

      <div class="profit-table-wrap">
        <div class="profit-grid">
          ${rows.map(r => `
            <div class="profit-card">
              <div class="profit-card-top">
                <div class="profit-icon-box">
                  <img class="profit-game-icon" src="${getProfitIcon(r.game)}" alt="">
                </div>

                <div class="profit-product-name">${esc(r.product || 'Без назви')}</div>
              </div>

              <div class="profit-price">${fmtRubNoZero(r.sell)}</div>

              <div class="profit-card-info">
                <div class="profit-card-row">
                  <span>Закуп</span>
                  <b>${fmtUsd(r.buyUsd)}</b>
                </div>

                <div class="profit-card-row profit">
                  <span>Прибуток</span>
                  <b>${fmtUsd(r.profitUsd)}</b>
                </div>
              </div>

              ${isAdmin ? `
                <div class="profit-card-actions">
                  <button class="btn-mini" onclick="editProfitProduct(${r._row})">✎</button>
                  <button class="btn-mini" style="border-color:#ef4444;color:#f87171" onclick="deleteProfitProduct(${r._row})">🗑</button>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function calcProfitRow(r, accountRate, playerokRate) {
  const sell = num(r.sell_rub);
  const buyUsd = num(r.buy_usd);

  const game = String(r.game || '').toLowerCase();
  const useAccRate = !(game.includes('apps') || game.includes('app'));

  const buyRub = useAccRate
    ? buyUsd * accountRate * playerokRate
    : buyUsd * playerokRate;

  const commission = sell * 0.14 + fixedFee(sell);
  const profitRub = sell - commission - buyRub;
  const profitUsd = profitRub / playerokRate;

  return {
    ...r,
    sell,
    buyUsd,
    buyRub,
    commission,
    profitRub,
    profitUsd
  };
}

function getPlayerokRate() {
  return Number(localStorage.getItem('playerokRate') || '80.36');
}

function editPlayerokRate() {
  openRateModal('playerok');
}

function editAccountRate() {
  openRateModal('accounts');
}

function openAddProfitProduct() {
  document.getElementById('modal-title').textContent = 'Новий товар';

  document.getElementById('modal-body').innerHTML = `
    <div class="form-field">
      <label class="form-label">Гра</label>
      <input class="form-input" id="new-game" value="${esc(profitGame || '')}" placeholder="Roblox">
    </div>

    <div class="form-field">
      <label class="form-label">Товар</label>
      <input class="form-input" id="new-product" placeholder="Наприклад: 400 Robux">
    </div>

    <div class="form-field">
      <label class="form-label">Продажа ₽</label>
      <input class="form-input" id="new-sell" placeholder="199">
    </div>

    <div class="form-field">
      <label class="form-label">Закуп $</label>
      <input class="form-input" id="new-buy" placeholder="0.99">
    </div>

    <div class="form-field">
      <label class="form-label">Match</label>
      <input class="form-input" id="new-match" placeholder="400">
    </div>

    <div class="form-footer">
      <button class="btn-cancel" onclick="closeModal()">Скасувати</button>
      <button class="btn-primary" style="width:auto" onclick="saveNewProfitProduct()">Додати</button>
    </div>
  `;

  document.getElementById('modal').style.display = 'flex';
}    

async function saveNewProfitProduct() {
  const game = document.getElementById('new-game').value.trim();
  const product = document.getElementById('new-product').value.trim();
  const sell = document.getElementById('new-sell').value.trim();
  const buy = document.getElementById('new-buy').value.trim();
  const match = document.getElementById('new-match').value.trim();

  if (!game || !product || !sell || !buy || !match) {
    toast('Заповни всі поля', 'err');
    return;
  }

  await postApi({
    type: 'profit',
    action: 'add',
    game,
    product,
    sell_rub: sell,
    buy_usd: buy,
    match
  });

  profitGame = game;
  toast('Товар додано', 'ok');
  closeModal();
  setTimeout(loadData, 1000);
} 

function editProfitProduct(rowIndex) {
  const row = profitRows.find(r => r._row === rowIndex);
  if (!row) return;

  document.getElementById('modal-title').textContent = 'Редагувати товар';

  document.getElementById('modal-body').innerHTML = `
    <div class="form-field">
      <label class="form-label">Гра</label>
      <input class="form-input" id="pp-game" value="${esc(row.game)}">
    </div>

    <div class="form-field">
      <label class="form-label">Товар</label>
      <input class="form-input" id="pp-product" value="${esc(row.product)}">
    </div>

    <div class="form-field">
      <label class="form-label">Продажа ₽</label>
      <input class="form-input" id="pp-sell" value="${esc(row.sell_rub)}">
    </div>

    <div class="form-field">
      <label class="form-label">Закуп $</label>
      <input class="form-input" id="pp-buy" value="${esc(row.buy_usd)}">
    </div>

    <div class="form-field">
      <label class="form-label">Match</label>
      <input class="form-input" id="pp-match" value="${esc(row.match)}">
    </div>

    <div class="form-footer">
      <button class="btn-cancel" onclick="closeModal()">Скасувати</button>
      <button class="btn-primary" style="width:auto" onclick="saveProfitProduct(${rowIndex})">Зберегти</button>
    </div>
  `;

  document.getElementById('modal').style.display = 'flex';
}

async function saveProfitProduct(rowIndex) {
  await postApi({
    type: 'profit',
    action: 'update',
    row: rowIndex,
    game: document.getElementById('pp-game').value.trim(),
    product: document.getElementById('pp-product').value.trim(),
    sell_rub: document.getElementById('pp-sell').value.trim(),
    buy_usd: document.getElementById('pp-buy').value.trim(),
    match: document.getElementById('pp-match').value.trim()
  });

  toast('Товар оновлено', 'ok');
  closeModal();
  setTimeout(loadData, 1000);
}

async function deleteProfitProduct(rowIndex) {
  const ok = await showConfirm(
    'Видалити товар?',
    'Цей товар буде видалено з ProfitProducts.'
  );

  if (!ok) return;

  await postApi({
    type: 'profit',
    action: 'delete',
    row: rowIndex
  });

  toast('Товар видалено', 'ok');
  closeModal();
  setTimeout(loadData, 1000);
}    

function openCustomOrder() {
  document.getElementById('modal-title').textContent = '';

  document.getElementById('modal-body').innerHTML = `
    <div class="rate-modal">
      <div class="rate-modal-icon">💼</div>
      <div class="rate-modal-title">Індивідуальний заказ</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <input class="rate-modal-input" id="custom-sell" placeholder="Продажа ₽" oninput="calcCustomModal()">
        <input class="rate-modal-input" id="custom-buy-usd" placeholder="Закуп $" oninput="calcCustomModal()">
      </div>

      <div class="custom-result" style="grid-template-columns:1fr 1fr;margin-top:18px">
  <div>
    <span>Закуп $</span>
    <b id="m-buy-usd">$0,00</b>
  </div>

  <div>
    <span>Прибуток $</span>
    <b class="yellow" id="m-usd">$0,00</b>
  </div>
</div>
    </div>
  `;

  document.getElementById('modal').style.display = 'flex';
}

function calcCustomModal() {
  const sell = num(document.getElementById('custom-sell').value);
  const buyUsd = num(document.getElementById('custom-buy-usd').value);

  const accountRate = getCurrentAccountRate();
  const playerokRate = getPlayerokRate();

  const buyRub = buyUsd * accountRate * playerokRate;
  const commission = sell * 0.14 + fixedFee(sell);
  const profitRub = sell - commission - buyRub;
  const profitUsd = profitRub / playerokRate;

  document.getElementById('m-buy-usd').textContent = fmtUsd(buyUsd);
document.getElementById('m-usd').textContent = fmtUsd(profitUsd);
}    

function closeCustomOrder() {
  customOrder = null;
  render();
}

function updateCustomOrder(field, value) {
  customOrder[field] = value;
  updateCustomResult();
}

function updateCustomResult() {
  const accountRate = getCurrentAccountRate();
  const playerokRate = getPlayerokRate();

  const sell = num(customOrder.sell);
  const buyUsd = num(customOrder.buy);
  const buyRub = buyUsd * accountRate * playerokRate;
  const commission = sell * 0.14 + fixedFee(sell);
  const profitRub = sell - commission - buyRub;
  const profitUsd = profitRub / playerokRate;

  document.getElementById('custom-buy').textContent = fmtRub(buyRub);
  document.getElementById('custom-commission').textContent = fmtRub(commission);
  document.getElementById('custom-profit').textContent = fmtRub(profitRub);
  document.getElementById('custom-usd').textContent = fmtUsd(profitUsd);
}    

function customOrderBox(accountRate, playerokRate) {
  const sell = num(customOrder.sell);
  const buyUsd = num(customOrder.buy);
  const buyRub = buyUsd * accountRate * playerokRate;
  const commission = sell * 0.14 + fixedFee(sell);
  const profitRub = sell - commission - buyRub;
  const profitUsd = profitRub / playerokRate;

  return `
    <div class="custom-order-box">
      <button class="custom-x" onclick="closeCustomOrder()">✕</button>

      <div class="custom-title">🧾 Індивідуальний заказ</div>

      <div class="custom-grid" style="grid-template-columns:1fr 1fr">
      
      <input class="form-input" placeholder="Продажа ₽" value="${esc(customOrder.sell)}"
    oninput="updateCustomOrder('sell', this.value)">

  <input class="form-input" placeholder="Закуп $" value="${esc(customOrder.buy)}"
    oninput="updateCustomOrder('buy', this.value)">
</div>

            <div class="custom-result" style="grid-template-columns:1fr 1fr">
        <div>
          <span>Закуп $</span>
          <b>${fmtUsd(buyUsd)}</b>
        </div>

        <div>
          <span>Прибуток $</span>
          <b class="yellow">${fmtUsd(profitUsd)}</b>
        </div>
      </div>
  `;
}    

function openRateModal(type) {
  const isAcc = type === 'accounts';
  const title = isAcc ? 'Курс Accounts' : 'Курс Playerok';
  const current = isAcc ? getCurrentAccountRate() : playerokRate;

  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = `
    <div class="rate-modal">
      <div class="rate-modal-icon">💱</div>
      <div class="rate-modal-title">Змінити ${title}</div>
      <input
        class="rate-modal-input"
        id="rate-input"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        value="${String(current).replace('.', ',')}"
        onkeydown="if(event.key==='Enter')saveRateModal('${type}')"
        autofocus
      >

      <div class="rate-modal-actions">
        <button class="btn-cancel" onclick="closeModal()">Скасувати</button>
        <button class="btn-primary" style="width:auto" onclick="saveRateModal('${type}')">Зберегти</button>
      </div>
    </div>
  `;

  document.getElementById('modal').style.display = 'flex';

  setTimeout(() => {
    const inp = document.getElementById('rate-input');
    if (inp) inp.focus();
  }, 50);
}

function saveRateModal(type) {
  const value = num(document.getElementById('rate-input').value);

  if (!value) {
    toast('Введи правильний курс', 'err');
    return;
  }

  if (type === 'accounts') {
  if (profitGame === 'Roblox') {
    accountRates.Roblox = value;
  } else {
    accountRates.default = value;
  }

  localStorage.setItem('accountRates', JSON.stringify(accountRates));
} else {
  playerokRate = value;
  localStorage.setItem('playerokRate', value);
}

  closeModal();
  render();
}    

function getCurrentAccountRate() {
  return Number(accountRates[profitGame] || accountRates.default || '0.783');
}

    function accCard(a) {
  const xb = String(a.type || '').toLowerCase() === 'xbox';
  const typeName = xb ? 'Xbox' : 'App Store';
  const icon = xb ? 'Xbox.png' : 'Appstore.png';
  const twofaOrLink = xb ? (a.twofa || '') : (a.link || '');
  const twofaLabel = xb ? '2FA' : 'LINK';

  const adminBtns = isAdmin ? `
    <button class="btn-icon btn-edit" onclick="openEditAcc(${a._id})">${svgEdit}</button>
    <button class="btn-icon btn-del" onclick="deleteAccount(${a._id})">${svgTrash}</button>
  ` : '';

  return `
    <div class="acc-card acc-card-compact">
      <div class="acc-compact-top">
        <div class="acc-compact-brand">
          <img src="${icon}" class="acc-compact-icon" alt="${typeName}">
          <div>
            <div class="acc-compact-title">${typeName}</div>
            ${a.rate ? `<div class="acc-compact-rate">💰 ${esc(a.rate)}</div>` : ''}
          </div>
        </div>

        <div class="acc-compact-balance">
          <span>Баланс</span>
          <b>$${esc(a.balance || '0')}</b>
        </div>

        <div class="acc-compact-actions">
          ${adminBtns}
        </div>
      </div>

      <div class="acc-compact-grid">
        ${a.login ? `
          <div class="acc-compact-field">
            <span>LOGIN</span>
            <b>${esc(a.login)}</b>
            ${copyBtn(a.login)}
          </div>
        ` : ''}

        ${a.password ? `
          <div class="acc-compact-field">
            <span>PASS</span>
            <b class="pass" id="pv-${a._id}">••••••••••••</b>
            <button class="btn-eye" onclick="toggleAccPass(${a._id},'${esc(a.password)}',this)">
  ${eyeOffIcon}
</button>
            ${copyBtn(a.password)}
          </div>
        ` : ''}

        ${twofaOrLink ? `
          <div class="acc-compact-field">
            <span>${twofaLabel}</span>
            <b>${esc(twofaOrLink)}</b>
            ${copyBtn(twofaOrLink)}
          </div>
        ` : ''}
      </div>

      ${a.note ? `<div class="field-note">${esc(a.note)}</div>` : ''}
    </div>
  `;
}

    function toggleAccPass(id, pw, btn) {
  const el = document.getElementById('pv-' + id);
  if (!el) return;

  if (el.classList.contains('show')) {
    el.textContent = '••••••••••••';
    el.classList.remove('show');
    if (btn) btn.innerHTML = eyeOffIcon;
  } else {
    el.textContent = pw;
    el.classList.add('show');
    if (btn) btn.innerHTML = eyeIcon;
  }
}

    
  function renderActions() {
  const el = document.getElementById('actions-bar');

  if (!el || !isAdmin || currentTab !== 'cdks') {
    selected.clear();
    if (el) el.innerHTML = '';
    return;
  }

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;width:100%">
      <button class="btn-secondary" onclick="deleteSelectedCdks()">
        🗑 Видалити вибрані
      </button>

      <button class="btn-danger" onclick="deleteFilteredCdks()">
        🗑 Видалити цей список
      </button>

      <div style="color:#94a3b8;font-weight:700;margin-left:auto">
        Вибрано: ${selected.size}
      </div>
    </div>
  `;
}
    
function toggleSelect(id) {
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  render();
}

async function deleteSelectedCdks() {
  if (!selected.size) {
    toast('Нічого не вибрано', 'err');
    return;
  }

  const ok = await showConfirm(
  'Видалити вибрані CDK?',
  `Буде видалено: <b>${selected.size}</b> CDK. Перед цим буде створена резервна копія.`
);

if (!ok) return;

  await postApi({
    type: 'cdk',
    action: 'deleteRows',
    rows: Array.from(selected)
  });

  selected.clear();
  setTimeout(loadData, 1000);
}

async function deleteFilteredCdks() {
  const list = cdks.filter(c => {
    if (filterUsed === 'active' && c._used) return false;
    if (filterUsed === 'used' && !c._used) return false;
    if (filterUsed === 'today') {
    if (!c.used_at) return false;

  const today = todayLocal();
  if (normalizeDate(c.used_at) !== today) return false;
}
    if (filterCategory !== 'all' && c.category !== filterCategory) return false;
    return true;
  });

  if (!list.length) {
    toast('Немає що видаляти', 'err');
  return;
  }

  const ok = await showConfirm(
  'Видалити цей список?',
  `Буде видалено: <b>${list.length}</b> CDK з поточного фільтру. Перед цим буде створена резервна копія.`
);

if (!ok) return;

  await postApi({
    type: 'cdk',
    action: 'deleteRows',
    rows: list.map(x => x._id)
  });

  selected.clear();
  setTimeout(loadData, 1000);
}      

    function cdkCard(c) {
      const adminBtns = isAdmin ? `
  <button class="btn-icon btn-edit" onclick="openEditCdk(${c._id})">${svgEdit}</button>
  <button class="btn-icon btn-del" onclick="deleteCdk(${c._id})">${svgTrash}</button>
` : `
  <button class="btn-icon btn-edit" onclick="openEditCdk(${c._id})">${svgEdit}</button>
`;
      
      const usedBy = c._used && c.used_by
      ? `<div class="field-note" style="margin-top:10px;color:#facc15">👤 Використав: ${esc(c.used_by)}</div>`
      : "";

      const workerToggle = `
        <button class="btn-toggle ${c._used ? 'used' : 'active'}" onclick="workerToggleCdk(${c._id})">
          ${c._used ? '✗ Використано' : '✓ Активний'}
        </button>
      `;

      const codeDisplay = c._used
        ? `
          <span class="cdk-code masked" id="cc-${c._id}">${'•'.repeat((c.code || '').length)}</span>
          <button class="btn-reveal" onclick="revealCdk(${c._id},'${esc(c.code)}')">👁</button>
        `
        : `
          <span class="cdk-code active">${esc(c.code)}</span>
          ${copyBtn(c.code)}
        `;

      return `
        <div class="cdk-card ${c._used ? 'used' : 'active'}">
          <div class="cdk-head">
            <div class="cdk-title">
              ${isAdmin ? `<input type="checkbox" class="cdk-select" ${selected.has(c._id) ? 'checked' : ''} onclick="event.stopPropagation();toggleSelect(${c._id})">` : ''}
              ${catIcon(c.category)}
              ${esc(c.category || 'CDK')}
      
            </div>

            <div class="cdk-controls">
              ${workerToggle}
              ${adminBtns}
            </div>
          </div>

          <div class="cdk-code-box">
            ${codeDisplay}
          </div>

          ${usedBy}

          ${c.note && String(c.note).toLowerCase() !== 'false'
          ? `<div class="field-note" style="margin-top:10px">${esc(c.note)}</div>`
          : ''}
        </div>
      `;
    }

    function revealCdk(id, code) {
      const el = document.getElementById('cc-' + id);
      if (!el) return;

      el.textContent = el.textContent.includes('•')
        ? code
        : '•'.repeat(code.length);
    }

    async function postApi(payload) {
  await fetch(API_URL, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify({
      ...payload,
      user: currentUser || localStorage.getItem("workerName") || "Unknown"
    })
  });
}

    async function workerToggleCdk(id) {
  const c = cdks[id];
  if (!c) return;

  const newStatus = !c._used;

  await postApi({
    type: "cdk",
    action: "toggle",
    row: id,
    used: newStatus ? "TRUE" : "FALSE"
  });

  setTimeout(loadData, 1000);
}

    async function deleteCdk(id) {
  const ok = await showConfirm(
    'Видалити CDK?',
    'Цей код буде видалено. Перед цим буде створена резервна копія.'
  );

  if (!ok) return;

  await postApi({
    type: 'cdk',
    action: 'delete',
    row: id
  });

  toast('CDK видалено', 'ok');
  setTimeout(loadData, 1000);
}

    let copyTimers = {};

    async function deleteAccount(id) {
  const ok = await showConfirm(
    'Видалити акаунт?',
    'Цей акаунт буде видалено з таблиці.'
  );

  if (!ok) return;

  await postApi({
    type: 'account',
    action: 'delete',
    row: id
  });

  toast('Акаунт видалено', 'ok');
  setTimeout(loadData, 1000);
}

    function copyText(text, btnEl) {
      navigator.clipboard.writeText(text).then(() => {
        btnEl.innerHTML = '<span class="copy-check">✓</span>';
        btnEl.classList.add('ok');

        clearTimeout(copyTimers[text]);

        copyTimers[text] = setTimeout(() => {
          btnEl.innerHTML = `
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="9" y="9" width="13" height="13" rx="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
`;
          btnEl.classList.remove('ok');
        }, 1400);
      });
    }

    function copyBtn(text) {
  return `
    <button class="btn-copy" onclick="copyText('${esc(text)}',this)">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    </button>
  `;
}

    function openAddModal() {
  editId = null;

  if (currentTab === 'accounts') {
    document.getElementById('modal-title').textContent = 'Новий акаунт';
    document.getElementById('modal-body').innerHTML = accountTypeChoice();
    document.getElementById('modal').style.display = 'flex';
    return;
  }

  document.getElementById('modal-title').textContent = 'Новий CDK';
  document.getElementById('modal-body').innerHTML = cdkForm(null);
  document.getElementById('modal').style.display = 'flex';
}
    function accIcon(type) {
  const t = String(type || '').toLowerCase();

  if (t === 'xbox') {
    return `<img src="Xbox.png" class="account-big-icon" alt="Xbox">`;
  }

  return `<img src="Appstore.png" class="account-big-icon" alt="App Store">`;
}

    function accountTypeChoice() {
  return `
  <div class="account-choice-grid">
    <div class="account-choice-card" onclick="openAccountForm('itunes')">
      <div class="account-choice-head">
        ${accIcon('itunes')}
        <div class="account-choice-title">App Store</div>
      </div>
    </div>

    <div class="account-choice-card" onclick="openAccountForm('xbox')">
      <div class="account-choice-head">
        ${accIcon('xbox')}
        <div class="account-choice-title">Xbox</div>
      </div>
    </div>
  </div>
`;
}

function openAccountForm(type) {
  editId = null;
  document.getElementById('modal-title').textContent =
    type === 'xbox' ? 'Новий Xbox акаунт' : 'Новий App Store акаунт';
  document.getElementById('modal-body').innerHTML = accForm(null, type);
}

function moneyNum(value) {
  return Number(
    String(value || '0')
      .replace(',', '.')
      .replace(/[^\d.]/g, '')
  ) || 0;
}    

function getAccountBalance(type) {
  return accounts
    .filter(a => String(a.type || '').toLowerCase() === type)
    .reduce((sum, a) => {
      const n = String(a.balance || '').replace(',', '.').replace(/[^\d.]/g, '');
      return sum + Number(n || 0);
    }, 0);
}

    function openEditAcc(id) {
      editId = id;
      document.getElementById('modal-title').textContent = 'Редагувати акаунт';
      document.getElementById('modal-body').innerHTML = accForm(accounts[id]);
      document.getElementById('modal').style.display = 'flex';
    }

    function openEditCdk(id) {
      editId = id;
      document.getElementById('modal-title').textContent = 'Редагувати CDK';
      document.getElementById('modal-body').innerHTML = cdkForm(cdks[id]);
      document.getElementById('modal').style.display = 'flex';
    }

    function closeModal() {
      document.getElementById('modal').style.display = 'none';
    }

    function accForm(a, forcedType = null) {
  const t = forcedType || (a ? (a.type || 'xbox').toLowerCase() : 'xbox');
  const isXbox = t === 'xbox';

  return `
    <div>
      <div class="form-field">
        <label class="form-label">Тип</label>

        <div class="type-btns">
          <button class="type-btn${t === 'itunes' ? ' sel' : ''}" id="tb-itunes" onclick="openAccountForm('itunes')">${accIcon('itunes')} App Store</button>
          <button class="type-btn${t === 'xbox' ? ' sel' : ''}" id="tb-xbox" onclick="openAccountForm('xbox')">${accIcon('xbox')} Xbox</button>
        </div>

        <input type="hidden" id="f-type" value="${t}">
      </div>

      <div class="form-field">
        <label class="form-label">${isXbox ? 'Логін / Email' : 'Email'}</label>
        <input class="form-input" id="f-login" value="${esc(a?.login || '')}" placeholder="${isXbox ? 'example@outlook.com' : 'example@gmail.com'}">
      </div>

      <div class="form-field">
        <label class="form-label">Пароль</label>
        <div class="pass-field">
          <input class="form-input" type="password" id="f-pass" value="${esc(a?.password || '')}" placeholder="Введіть пароль">
          <button class="pass-toggle" onclick="togglePw('f-pass',this)">👁</button>
        </div>
      </div>

      ${isXbox ? `
        <div class="form-field">
          <label class="form-label">2FA Email</label>
          <input class="form-input" id="f-twofa" value="${esc(a?.twofa || '')}" placeholder="Пошта для 2FA">
        </div>
      ` : `
        <div class="form-field">
          <label class="form-label">Посилання <span style="color:#94a3b8">(необовʼязково)</span></label>
          <input class="form-input" id="f-link" value="${esc(a?.link || '')}" placeholder="https://...">
        </div>
      `}

      <div class="form-field">
        <label class="form-label">Баланс</label>
        <input class="form-input" id="f-balance" value="${esc(a?.balance || '')}" placeholder="Наприклад: 5.00 USD">
      </div>

      <div class="form-field">
        <label class="form-label">Курс</label>
        <input class="form-input" id="f-rate" value="${esc(a?.rate || '')}" placeholder="Наприклад: 40.50">
      </div>

      <div class="form-field">
        <label class="form-label">Нотатка</label>
        <textarea class="form-input" id="f-note" placeholder="Додайте нотатку">${esc(a?.note || '')}</textarea>
      </div>

      <div class="form-footer">
        <button class="btn-cancel" onclick="closeModal()">Скасувати</button>
        <button class="btn-primary" style="width:auto" onclick="saveAccForm()">Зберегти</button>
      </div>
    </div>
  `;
}

function cdkForm(c) {
  const used = c ? c._used : false;
  const cat = c?.category || (filterCategory !== 'all' ? filterCategory : 'Spotify');

  return `
    <div>
      <div class="form-field">
        <label class="form-label">Категорія</label>
        <select class="form-input" id="f-category">
          ${CATEGORIES.map(x => `
            <option value="${x}" ${cat === x ? 'selected' : ''}>${x}</option>
          `).join('')}
        </select>
      </div>

      <div class="form-field">
        <label class="form-label">CDK Код</label>

        ${c ? `
          <input
            class="form-input code-inp"
            id="f-code"
            value="${esc(c?.code || '')}"
            oninput="this.value=this.value.toUpperCase()"
          >
        ` : `
          <textarea
            class="form-input code-inp"
            id="f-bulk-codes"
            style="min-height:180px;letter-spacing:1px;"
            placeholder="Встав один або багато CDK кодів сюди"
          ></textarea>
        `}
      </div>

      <div class="status-row">
        <span class="form-label" style="margin:0">Статус:</span>

        <button
          class="btn-toggle ${used ? 'used' : 'active'}"
          id="f-status-btn"
          onclick="toggleFormStatus()"
        >
          ${used ? '✗ Використано' : '✓ Активний'}
        </button>

        <input type="hidden" id="f-status" value="${used}">
      </div>

      <div class="form-field">
        <label class="form-label">Нотатка</label>
        <textarea class="form-input" id="f-note">${esc(c?.note || '')}</textarea>
      </div>

      <div class="form-footer">
        <button class="btn-cancel" onclick="closeModal()">Скасувати</button>
        <button class="btn-primary" style="width:auto" onclick="saveCdkForm()">Зберегти</button>
      </div>
    </div>
  `;
}

    function selType(t) {
      document.getElementById('f-type').value = t;
      document.getElementById('tb-xbox').className = 'type-btn' + (t === 'xbox' ? ' sel' : '');
      document.getElementById('tb-itunes').className = 'type-btn' + (t === 'itunes' ? ' sel' : '');
    }

    function toggleFormStatus() {
      const inp = document.getElementById('f-status');
      const btn = document.getElementById('f-status-btn');
      const now = inp.value === 'true';

      inp.value = !now;
      btn.className = 'btn-toggle ' + (!now ? 'used' : 'active');
      btn.textContent = !now ? '✗ Використано' : '✓ Активний';
    }

    async function saveAccForm() {
  const accType = document.getElementById('f-type').value;
  const isEdit = editId !== null;

  await postApi({
    type: 'account',
    action: isEdit ? 'update' : 'add',
    row: editId,
    accType,
    login: document.getElementById('f-login').value.trim(),
    password: document.getElementById('f-pass').value.trim(),
    link: accType === 'itunes' ? document.getElementById('f-link').value.trim() : '',
    balance: document.getElementById('f-balance').value.trim(),
    rate: document.getElementById('f-rate').value.trim(),
    note: document.getElementById('f-note').value.trim(),
    twofa: accType === 'xbox' ? document.getElementById('f-twofa').value.trim() : ''
  });

  toast(isEdit ? 'Акаунт оновлено' : 'Акаунт додано', 'ok');
  closeModal();
  setTimeout(loadData, 1000);
}

    async function saveCdkForm() {
  const isEdit = editId !== null;
  const category = document.getElementById('f-category').value;
  const used = document.getElementById('f-status').value === 'true' ? 'TRUE' : 'FALSE';
  const note = document.getElementById('f-note').value;

  if (!isEdit) {
    const raw = document.getElementById('f-bulk-codes').value;

    const codes = raw
  .match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g)
  ?.map(x => x.trim().toUpperCase()) || [];

if (!codes.length) {
  await showConfirm(
    'CDK не знайдено',
    'Встав коди формату <b>67c72481-378f-49ae-a6b1-9cbb9236e280</b>'
  );
  return;
}

const uniqueCodes = [...new Set(codes)];
const existingCodes = cdks.map(x => String(x.code || '').toUpperCase());
const filteredCodes = uniqueCodes.filter(code => !existingCodes.includes(code));

if (!filteredCodes.length) {
  await showConfirm(
    'Дублікати',
    'Усі ці CDK вже є в таблиці. Нових кодів для додавання немає.'
  );
  return;
}

    const ok = await showConfirm(
  'Додати CDK коди?',
  `Ти додаєш <b>${filteredCodes.length}</b> CDK у категорію <b>${category}</b>.<br>Продовжити?`,
  'add'
);

if (!ok) return;

    await postApi({
      type: 'cdk',
      action: 'bulkAdd',
      category,
      label: category,
      used,
      note,
      codes: filteredCodes
    });

        toast('CDK додано', 'ok');
    closeModal();
    setTimeout(loadData, 1000);
    return;

  } else {
    await postApi({
      type: 'cdk',
      action: 'update',
      row: editId,
      label: category,
      code: document.getElementById('f-code').value,
      used,
      note,
      category
    });

    toast('CDK оновлено', 'ok');
  }

  closeModal();
  setTimeout(loadData, 1000);
}

    function togglePw(id, btn) {
      const inp = document.getElementById(id);
      inp.type = inp.type === 'password' ? 'text' : 'password';
      btn.innerHTML = inp.type === 'password' ? '👁' : '🙈';
    }

    function catIcon(cat) {
  const files = {
    Spotify: ['spotify.png', 'spotify'],
    Claude: ['claude.png', 'claude'],
    ChatGPT: ['chatgpt.png', 'chatgpt'],
    Grok: ['grok.png', 'grok']
  };

  const item = files[cat];
  if (!item) return '🔑';

  return `<img src="${item[0]}" class="cat-icon ${item[1]}" alt="${cat}">`;
}

    function esc(s) {
      return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    const eyeIcon = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
`;

const eyeOffIcon = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 3l18 18"></path>
    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"></path>
    <path d="M9.9 4.2A10.6 10.6 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-4.1 5.1"></path>
    <path d="M6.6 6.6A18.6 18.6 0 0 0 1 12s4 8 11 8a10.9 10.9 0 0 0 4.7-1"></path>
  </svg>
`;

    const svgEdit = `
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    `;

    const svgTrash = `
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      </svg>
    `;
  window.addEventListener('load', () => {
  const savedRole = localStorage.getItem('managerRole');

  if (savedRole === 'admin') {
    isAdmin = true;
    startApp();
  }

  if (savedRole === 'worker') {
    isAdmin = false;
    startApp();
  }
});
