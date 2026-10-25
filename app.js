/* SyncSINGIL prototype: a microloan ledger presented as a bank passbook.
   Data, rules and copy come from the original build. GSAP adds the motion when it
   loads. With reduced motion, or without the script, every view is complete. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const app = $('#app');
const KEY = 'syncsingil_demo_db';
const money = n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = new Date().toISOString().slice(0, 10);
const clone = x => JSON.parse(JSON.stringify(x));
const motion = window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? window.gsap : null;

const seed = {
    users: [
        { id: 'USR-001', name: 'Juan Dela Cruz', username: 'juan', password: 'demo123', role: 'Borrower', email: 'juan@example.com', phone: '09123456789', address: 'Baguio City', status: 'Active' },
        { id: 'USR-002', name: 'Maria Santos', username: 'maria', password: 'demo123', role: 'Staff', email: 'maria@example.com', phone: '09175556666', address: 'Baguio City', status: 'Active' },
        { id: 'USR-003', name: 'Carlo Reyes', username: 'carlo', password: 'demo123', role: 'Collector', email: 'carlo@example.com', phone: '09178889999', address: 'La Trinidad', status: 'Active' },
        { id: 'USR-004', name: 'Admin User', username: 'admin', password: 'admin123', role: 'Admin', email: 'admin@syncsingil.test', phone: '09170000000', address: 'Baguio City', status: 'Active' }
    ],
    loans: [
        { id: 'LN-001', borrower: 'Juan Dela Cruz', userId: 'USR-001', amount: 10000, rate: 5, paid: 3500, due: '2026-11-30', schedule: 'Monthly', status: 'Active' },
        { id: 'LN-002', borrower: 'Maria Santos', userId: 'USR-002', amount: 8000, rate: 4, paid: 8000, due: '2026-10-15', schedule: 'Monthly', status: 'Paid' },
        { id: 'LN-003', borrower: 'Carlo Reyes', userId: 'USR-003', amount: 15000, rate: 5, paid: 3000, due: '2026-10-20', schedule: 'Weekly', status: 'Overdue' },
        { id: 'LN-004', borrower: 'Ana Villanueva', userId: 'USR-005', amount: 12000, rate: 5, paid: 2000, due: '2026-11-05', schedule: 'Monthly', status: 'Active' },
        { id: 'LN-005', borrower: 'Peter Garcia', userId: 'USR-006', amount: 7500, rate: 3, paid: 1500, due: '2026-11-12', schedule: 'Weekly', status: 'Active' }
    ],
    payments: [
        { id: 'PMT-001', loanId: 'LN-001', borrower: 'Juan Dela Cruz', amount: 1000, date: '2026-10-12', method: 'GCash', status: 'Paid' },
        { id: 'PMT-002', loanId: 'LN-002', borrower: 'Maria Santos', amount: 1500, date: '2026-10-11', method: 'Bank Transfer', status: 'Paid' },
        { id: 'PMT-003', loanId: 'LN-003', borrower: 'Carlo Reyes', amount: 1500, date: '2026-10-10', method: 'Cash', status: 'Paid' },
        { id: 'PMT-004', loanId: 'LN-001', borrower: 'Juan Dela Cruz', amount: 2500, date: '2026-09-20', method: 'Cash', status: 'Paid' }
    ],
    collections: [
        { id: 'COL-001', date: '2026-10-25', borrower: 'Juan Dela Cruz', loanId: 'LN-001', amount: 1000, status: 'Pending' },
        { id: 'COL-002', date: '2026-10-20', borrower: 'Carlo Reyes', loanId: 'LN-003', amount: 1500, status: 'Pending' },
        { id: 'COL-003', date: '2026-10-15', borrower: 'Maria Santos', loanId: 'LN-002', amount: 1000, status: 'Completed' }
    ],
    settings: { dueSMS: true, dueEmail: true, paymentSMS: true, paymentEmail: true, overdueSMS: true, overdueEmail: true }
};

let db;
try { db = JSON.parse(localStorage.getItem(KEY)) || clone(seed) } catch (e) { db = clone(seed) }
function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)) } catch (e) { /* storage blocked: the demo keeps working in memory */ }
}

let current = null, page = 'Dashboard', loginRole = 'Borrower', searchText = '';
let filters = { borrower: 'All', loan: 'All', collection: 'All' };
let pendingSlip = null;      // set by a payment; the next Payment History view shows it once
let returnFocus = null;      // the control that opened the open modal

const NAV = {
    Borrower: ['Dashboard', 'My Loans', 'Make Payment', 'Payment History', 'Profile Settings'],
    Staff: ['Dashboard', 'Borrowers', 'Loans', 'Payments', 'Collections', 'Reports', 'Users', 'Settings']
};
const NAV_ICON = {
    Dashboard: 'dashboard', 'My Loans': 'loan', 'Make Payment': 'plus', 'Payment History': 'history', 'Profile Settings': 'gear',
    Borrowers: 'person', Loans: 'loan', Payments: 'transfer', Collections: 'calendar', Reports: 'chart', Users: 'people', Settings: 'gear'
};
const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.6c1.8.8 3 2.7 3.3 5.4"/>',
    loan: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    transfer: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    history: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4"/>',
    chart: '<path d="M4 20h16M7 16v-5M12 16V6M17 16v-8"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    logout: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9 8l-4 4 4 4M5 12h10"/>'
};
const MARK = '<svg class="mark" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/></svg>';
const SETTING_ROWS = [['dueSMS', 'Due date reminders', 'SMS (text message)'], ['dueEmail', 'Due date reminders', 'Email'], ['paymentSMS', 'Payment confirmations', 'SMS (text message)'], ['paymentEmail', 'Payment confirmations', 'Email'], ['overdueSMS', 'Overdue alerts', 'SMS (text message)'], ['overdueEmail', 'Overdue alerts', 'Email']];
const SYSTEM_ROWS = [['dueSMS', 'Due date reminders via SMS'], ['dueEmail', 'Due date reminders via email'], ['paymentSMS', 'Payment confirmations via SMS'], ['paymentEmail', 'Payment confirmations via email'], ['overdueSMS', 'Overdue alerts via SMS'], ['overdueEmail', 'Overdue alerts via email']];

const icon = n => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const balance = l => Math.max(0, Number(l.amount || 0) * (1 + Number(l.rate || 0) / 100) - Number(l.paid || 0));
const effStatus = l => (balance(l) === 0 ? 'Paid' : l.status === 'Paid' ? 'Active' : l.status);
const overdueCount = () => db.loans.filter(l => l.status === 'Overdue' && balance(l) > 0).length;
const myLoans = () => db.loans.filter(l => l.userId === current.id || l.borrower === current.name);
const navItems = () => (current.role === 'Borrower' ? NAV.Borrower : NAV.Staff);
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const opts = (list, selected) => list.map(o => `<option ${o === selected ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('');
const btn = (label, action, cls = '') => `<button class="btn ${cls}" type="button" data-action="${action}">${label}</button>`;
const panel = (inner, cls = '') => `<section class="panel ${cls}" data-enter>${inner}</section>`;
const GOOD = ['Paid', 'Active', 'Completed'];

/* Status: an overdue loan is the teller's red impression; routine states are pills. */
function statusBadge(s) {
    if (s === 'Overdue') return '<span class="impression">Overdue</span>';
    const tone = GOOD.includes(s) ? 'paid' : s === 'Inactive' ? 'inactive' : 'pending';
    return `<span class="stamp stamp--${tone}">${escapeHtml(s)}</span>`;
}

function head(title, sub = '', action = '') {
    return `<header class="page-head" data-enter><div><h1>${title}</h1>${sub ? `<p class="lede">${sub}</p>` : ''}</div>${action}</header>`;
}

function table(headers, rows) {
    return `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}" class="empty">No records found</td></tr>`}</tbody></table></div>`;
}

/* Running balance for every payment, walked back from each loan's current balance,
   so the last entry always agrees with the balance figure shown elsewhere. */
function paymentBalances() {
    const out = {};
    db.loans.forEach(l => {
        let bal = balance(l);
        db.payments
            .filter(p => p.loanId === l.id)
            .sort((a, b) => b.date.localeCompare(a.date) || db.payments.indexOf(b) - db.payments.indexOf(a))
            .forEach(p => { out[p.id] = bal; bal += Number(p.amount || 0) });
    });
    return out;
}

function readSettings(root) {
    $$('[data-setting]', root).forEach(x => { db.settings[x.dataset.setting] = x.checked });
}

/* Motion. Every helper is a no-op without GSAP, so content never waits on it. */
function countUp(el) {
    if (!motion) return;
    const to = Number(el.dataset.count) || 0;
    const o = { v: 0 };
    el.textContent = money(0);
    motion.to(o, { v: to, duration: 1.3, ease: 'expo.out', onUpdate: () => { el.textContent = money(o.v) } });
}

function stampIn(el, delay = 0) {
    if (!motion || !el) return;
    motion.fromTo(el, { scale: 1.6, opacity: 0, rotate: -14 }, { scale: 1, opacity: 1, rotate: el.classList.contains('impression--hero') ? -6 : 0, duration: .5, ease: 'power4.out', delay });
}

function enter(root) {
    if (!motion) return;
    motion.fromTo(root, { opacity: 0, rotateY: -18, transformOrigin: 'left center' }, { opacity: 1, rotateY: 0, duration: .9, ease: 'expo.out', clearProps: 'transform,opacity' });
    motion.from($$('[data-enter]', root), { opacity: 0, y: 18, duration: .7, ease: 'expo.out', stagger: .06, clearProps: 'transform,opacity' });
    $$('.carry__figure', root).forEach(countUp);
    const bars = $$('.bar > i, .seg', root);
    if (bars.length) motion.from(bars, { scaleX: 0, duration: 1.1, ease: 'expo.out', stagger: .08, clearProps: 'transform' });
    $$('[data-stamp]', root).forEach(el => stampIn(el, .5));
}

function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.textContent = msg;
    document.body.append(t);
    if (motion) motion.fromTo(t, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .5, ease: 'expo.out' });
    setTimeout(() => {
        if (motion) motion.to(t, { y: 8, opacity: 0, duration: .3, ease: 'power2.in', onComplete: () => t.remove() });
        else t.remove();
    }, 2600);
}

function modal(html) {
    returnFocus = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    document.body.append(wrap);
    const box = wrap.firstElementChild, title = box.querySelector('h2');
    if (title) {
        title.id = 'modal-title';
        box.setAttribute('aria-labelledby', 'modal-title');
    }
    wrap.querySelectorAll('[data-close]').forEach(b => { b.onclick = () => closeModal(wrap) });
    wrap.onclick = e => { if (e.target === wrap) closeModal(wrap) };
    if (motion) {
        motion.fromTo(wrap, { opacity: 0 }, { opacity: 1, duration: .25, ease: 'power1.out' });
        motion.fromTo(box, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: .6, ease: 'expo.out' });
    }
    requestAnimationFrame(() => { const f = box.querySelector('input, select, button'); if (f) f.focus() });
    return wrap;
}

function closeModal(wrap) {
    if (!wrap.isConnected || wrap.dataset.closing) return;
    wrap.dataset.closing = '1';
    const done = () => {
        wrap.remove();
        if (returnFocus && returnFocus.isConnected) returnFocus.focus();
    };
    if (motion) motion.to(wrap, { opacity: 0, duration: .2, ease: 'power1.in', onComplete: done });
    else done();
}

/* Keyboard: Escape closes a modal, and Tab stays inside it while it is open. */
document.addEventListener('keydown', e => {
    const open = $('.modal-backdrop');
    if (!open) return;
    if (e.key === 'Escape') return closeModal(open);
    if (e.key !== 'Tab') return;
    const focusable = $$('button:not([disabled]), input:not([disabled]), select:not([disabled])', open);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
});

/* Entry: the passbook spread. */
function paintRoleTabs() {
    $$('[data-role]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.role === loginRole)));
    const tabs = $('#roleTabs');
    if (tabs) tabs.dataset.active = loginRole === 'Admin' ? '1' : '0';
}

function login() {
    current = null;
    app.innerHTML = `
    <main class="entry">
        <div class="spread">
            <section class="spread__cover" aria-label="SyncSINGIL">
                <div class="wordmark">${MARK}<h1>SyncSINGIL</h1></div>
                <div class="cover-copy">
                    <p class="cover-title">Microloan Management and Collection Tracking System</p>
                    <p class="cover-tagline">Secure. Organized. Efficient.</p>
                </div>
            </section>
            <section class="spread__page">
                <span class="rules" aria-hidden="true"></span>
                <h2>Welcome to SyncSINGIL</h2>
                <p class="lede">Sign in to manage loans or view your borrower account.</p>
                <div class="index-tabs" id="roleTabs" role="tablist">
                    <span class="tab-ink" aria-hidden="true"></span>
                    <button class="tab-btn" type="button" role="tab" data-role="Borrower">Borrower</button>
                    <button class="tab-btn" type="button" role="tab" data-role="Admin">Admin / Staff</button>
                </div>
                <form id="loginForm">
                    <label for="username">Username or email</label>
                    <input id="username" autocomplete="username" required placeholder="Enter username or email">
                    <label for="password">Password</label>
                    <input id="password" type="password" autocomplete="current-password" required placeholder="Enter password">
                    <p id="loginError" class="form-error" aria-live="polite"></p>
                    <button class="btn btn--block">Login</button>
                </form>
                <p class="footer-note">Borrowers can view balances, make demo payments, check payment history and set reminders. Staff can manage borrowers, loans, collections and reports.</p>
                <div class="demo-note"><b>Demo accounts</b><br>Borrower: <b>juan</b> / <b>demo123</b><br>Admin: <b>admin</b> / <b>admin123</b><br><span class="muted">Prototype only: data is stored in this browser.</span></div>
            </section>
        </div>
    </main>`;
    paintRoleTabs();
    $$('[data-role]').forEach(b => { b.onclick = () => { loginRole = b.dataset.role; paintRoleTabs() } });
    const err = $('#loginError');
    const fail = msg => {
        err.textContent = msg;
        $$('#username, #password').forEach(f => f.setAttribute('aria-invalid', 'true'));
    };
    $$('#username, #password').forEach(f => {
        f.oninput = () => { err.textContent = ''; f.removeAttribute('aria-invalid') };
    });
    $('#loginForm').onsubmit = e => {
        e.preventDefault();
        const u = $('#username').value.trim().toLowerCase(), p = $('#password').value;
        const found = db.users.find(x => (x.username.toLowerCase() === u || x.email.toLowerCase() === u) && x.password === p);
        if (!found) return fail('Login failed. Try a demo account.');
        if (loginRole === 'Admin' && found.role === 'Borrower') return fail('Please choose Borrower login for this account.');
        if (loginRole === 'Borrower' && found.role !== 'Borrower') return fail('Please choose Admin / Staff login for this account.');
        current = found;
        page = 'Dashboard';
        render(true);
    };
    if (motion) {
        motion.timeline({ defaults: { ease: 'expo.out' } })
            .from('.spread', { opacity: 0, y: 28, duration: .9 })
            .from('.spread__cover', { rotateY: -22, transformOrigin: 'left center', duration: 1.2 }, .05)
            .from('.rules', { clipPath: 'inset(0 0 100% 0)', duration: 1.2 }, .3)
            .from('.spread__page > :not(.rules)', { opacity: 0, y: 14, duration: .7, stagger: .07 }, .35);
    }
}

/* Shell: index tabs on the fore-edge, and the leaf. */
function render(animate = false) {
    if (!current) return login();
    const borrower = current.role === 'Borrower';
    app.innerHTML = `
    <div class="shell">
        <aside class="index" aria-label="Portal">
            <div class="logo">${MARK}<span>Sync<em>SINGIL</em></span></div>
            <nav class="index__nav" aria-label="Sections">
                ${navItems().map(n => `<button class="nav" type="button" data-page="${n}" aria-current="${n === page ? 'page' : 'false'}">${icon(NAV_ICON[n])}<span>${n}</span></button>`).join('')}
            </nav>
            <div class="index__foot">
                <p class="label">${borrower ? 'Borrower Portal' : 'Administration Portal'}</p>
                <div class="index__who"><span class="index__name">${escapeHtml(current.name)}</span><span class="stamp stamp--ink">${escapeHtml(current.role)}</span></div>
                <button class="nav nav--logout" type="button" id="logout" aria-label="Logout">${icon('logout')}<span class="nav__text">Logout</span></button>
            </div>
        </aside>
        <div class="leaf">
            <header class="topbar">
                <span class="topbar__user">${icon('person')}<span>${escapeHtml(current.name)}</span><span class="stamp stamp--ink">${escapeHtml(current.role)}</span></span>
            </header>
            <section class="content" id="content" tabindex="-1"></section>
        </div>
    </div>`;
    $$('[data-page]').forEach(b => { b.onclick = () => go(b.dataset.page) });
    $('#logout').onclick = () => { page = 'Dashboard'; login() };
    drawPage(animate);
}

function go(p) {
    page = p;
    searchText = '';
    filters = { borrower: 'All', loan: 'All', collection: 'All' };
    $$('[data-page]').forEach(b => b.setAttribute('aria-current', b.dataset.page === p ? 'page' : 'false'));
    window.scrollTo({ top: 0 });
    drawPage(true);
}

const PAGES = {
    Dashboard: () => (current.role === 'Borrower' ? borrowerDashboard() : adminDashboard()),
    'My Loans': borrowerLoans,
    'Make Payment': makePayment,
    'Payment History': () => paymentHistory(true),
    'Profile Settings': profileSettings,
    Borrowers: borrowersPage,
    Loans: loansPage,
    Payments: () => paymentHistory(false),
    Collections: collectionsPage,
    Reports: reportsPage,
    Users: usersPage,
    Settings: settingsPage
};

function drawPage(animate = false) {
    const c = $('#content');
    if (!c) return;
    c.innerHTML = (PAGES[page] || PAGES.Dashboard)();
    wirePage(c);
    if (animate) enter(c);
}

function wirePage(c) {
    $$('[data-action]', c).forEach(b => { b.onclick = () => doAction(b.dataset.action) });
    $$('[data-tab]', c).forEach(b => {
        b.onclick = () => {
            $$('[data-tab]', c).forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-selected', String(x === b)) });
            drawProfileTab(b.dataset.tab);
        };
    });
    if (page === 'Profile Settings') drawProfileTab('personal');
    const search = $('#search', c);
    if (search) {
        search.oninput = () => {
            searchText = search.value;
            const pos = search.selectionStart;
            drawPage(false);
            const n = $('#search');
            if (n) { n.focus(); n.setSelectionRange(pos, pos) }
        };
    }
    [['borrowerStatus', 'borrower'], ['loanStatus', 'loan'], ['collectionStatus', 'collection']].forEach(([id, key]) => {
        const s = $('#' + id, c);
        if (s) s.onchange = () => { filters[key] = s.value; drawPage(false) };
    });
    const payForm = $('#payForm', c);
    if (payForm) wirePayment(c, payForm);
    const saveSettingsBtn = $('#saveSettings', c);
    if (saveSettingsBtn) saveSettingsBtn.onclick = () => { readSettings(c); save(); toast('System settings saved') };
}

function doAction(action) {
    if (action.startsWith('goto:')) return go(action.slice(5));
    if (action === 'addBorrower') return userModal(null, 'Borrower');
    if (action === 'addUser') return userModal(null, 'Staff');
    if (action === 'addLoan') return loanModal(null);
    if (action === 'addCollection') return collectionModal(null);
    if (action === 'exportCSV') return exportCSV();
    const [act, id] = action.split(':');
    if (act === 'editUser') return userModal(db.users.find(u => u.id === id));
    if (act === 'viewBorrower') return borrowerModal(id);
    if (act === 'editLoan') return loanModal(db.loans.find(l => l.id === id));
    if (act === 'editCollection') return collectionModal(db.collections.find(x => x.id === id));
    if (act === 'completeCollection') {
        db.collections.find(x => x.id === id).status = 'Completed';
        save();
        drawPage(false);
        toast('Collection marked complete');
        return;
    }
    if (act === 'toggleUser') {
        const u = db.users.find(x => x.id === id);
        u.status = u.status === 'Active' ? 'Inactive' : 'Active';
        save();
        drawPage(false);
    }
}

/* Borrower portal. */
function borrowerDashboard() {
    const ls = myLoans(), after = paymentBalances();
    const total = ls.reduce((s, l) => s + l.amount, 0), paid = ls.reduce((s, l) => s + l.paid, 0), bal = ls.reduce((s, l) => s + balance(l), 0);
    const next = ls.filter(l => balance(l) > 0).sort((a, b) => a.due.localeCompare(b.due))[0];
    const ps = db.payments.filter(p => p.borrower === current.name).slice().sort((a, b) => b.date.localeCompare(a.date));
    return head('Borrower Dashboard', `Welcome back, ${escapeHtml(current.name)}!`) + `
    <section class="carry" data-enter aria-label="Account summary">
        <div class="carry__main">
            <p class="label">Outstanding Balance</p>
            <p class="carry__figure" data-count="${bal}">${money(bal)}</p>
            <p class="muted">Remaining amount due</p>
        </div>
        <dl class="carry__side">
            <div><dt>Total Loan Amount</dt><dd>${money(total)}</dd><small>Across your loans</small></div>
            <div><dt>Total Paid</dt><dd>${money(paid)}</dd><small>Payments recorded</small></div>
            <div><dt>Next Due Date</dt><dd>${next ? next.due : 'No upcoming due'}</dd><small>Amount: ${next ? money(Math.min(balance(next), 1000)) : '—'}</small></div>
        </dl>
    </section>
    <div class="grid2">
        ${panel(`<h3>My Loan Summary</h3>${ls.length ? `<ul class="ledger-lines">${ls.map(l => `<li><b>${l.id}</b><span>Due ${l.due} · ${l.schedule}</span><span class="num">${money(balance(l))} outstanding</span></li>`).join('')}</ul>` : '<div class="empty">No loans linked to this account.</div>'}${btn('View My Loans', 'goto:My Loans', 'btn--ghost')}`)}
        ${panel(`<h3>Recent Payment Activity</h3>${table(['Date', 'Loan', 'Amount', 'Balance', 'Status'], ps.slice(0, 4).map(p => `<tr><td class="num">${p.date}</td><td class="id">${p.loanId}</td><td class="num">${money(p.amount)}</td><td class="num">${money(after[p.id])}</td><td>${statusBadge(p.status)}</td></tr>`).join(''))}${btn('Make a Payment', 'goto:Make Payment')}`)}
    </div>
    ${panel(`<h3>Due Date Reminders</h3><p class="muted">Choose SMS or email reminders in Profile Settings. Reminders are a prototype preference and are not sent from this demo.</p>${btn('Set Notification Preferences', 'goto:Profile Settings', 'btn--ghost')}`, 'stack-gap')}`;
}

function borrowerLoans() {
    const ls = myLoans();
    return head('My Loans', 'Review loan details, outstanding balance and due dates.') + panel(table(
        ['Loan ID', 'Loan Amount', 'Total Paid', 'Outstanding Balance', 'Due Date', 'Schedule', 'Status'],
        ls.map(l => `<tr><td class="id">${l.id}</td><td class="num">${money(l.amount)}</td><td class="num">${money(l.paid)}</td><td class="num"><b>${money(balance(l))}</b></td><td class="num">${l.due}</td><td>${l.schedule}</td><td>${statusBadge(effStatus(l))}</td></tr>`).join('')
    ));
}

function makePayment() {
    const ls = myLoans().filter(l => balance(l) > 0);
    return head('Make Payment', 'Submit a payment against one of your outstanding loans.') + panel(`
    <form id="payForm" class="pay-form">
        <label for="payLoan">Choose loan</label>
        <select id="payLoan" required>${ls.map(l => `<option value="${l.id}">${l.id} — Balance ${money(balance(l))}</option>`).join('')}</select>
        <label for="payAmount">Payment amount (₱)</label>
        <input id="payAmount" type="number" min="1" step=".01" required placeholder="Enter amount">
        <p class="preview">Balance after this payment <b id="payPreview" aria-live="polite">—</b></p>
        <fieldset class="methods">
            <legend>Payment method</legend>
            <div class="pay-methods">
                <button class="chip" type="button" data-method="GCash" aria-pressed="true">GCash</button>
                <button class="chip" type="button" data-method="Bank Transfer" aria-pressed="false">Bank Transfer</button>
                <button class="chip" type="button" data-method="Cash" aria-pressed="false">Cash / In person</button>
            </div>
        </fieldset>
        <input type="hidden" id="payMethod" value="GCash">
        <div class="notice warn">Prototype only: this form records a demo payment. It does not connect to a real payment gateway or transfer money.</div>
        <div class="form-actions"><button class="btn" ${ls.length ? '' : 'disabled'}>Submit Demo Payment</button></div>
    </form>`);
}

function wirePayment(c, form) {
    const method = $('#payMethod', c), amount = $('#payAmount', c), loan = $('#payLoan', c), preview = $('#payPreview', c);
    const chips = $$('[data-method]', c);
    const update = () => {
        const l = db.loans.find(x => x.id === loan.value), amt = Number(amount.value);
        preview.textContent = !l || !(amt > 0) ? '—' : money(Math.max(0, balance(l) - amt));
    };
    amount.oninput = update;
    loan.onchange = update;
    chips.forEach(b => {
        b.onclick = () => {
            method.value = b.dataset.method;
            chips.forEach(x => { const on = x === b; x.classList.toggle('chosen', on); x.setAttribute('aria-pressed', String(on)) });
            if (motion) motion.fromTo(b, { scale: .94 }, { scale: 1, duration: .5, ease: 'expo.out' });
        };
    });
    form.onsubmit = e => {
        e.preventDefault();
        const l = db.loans.find(x => x.id === loan.value), amt = Number(amount.value);
        if (!l || amt <= 0 || amt > balance(l)) return toast('Enter an amount up to the outstanding balance.');
        const p = { id: 'PMT-' + String(Date.now()).slice(-6), loanId: l.id, borrower: current.name, amount: amt, date: today, method: method.value, status: 'Paid' };
        db.payments.push(p);
        l.paid += amt;
        if (balance(l) === 0) l.status = 'Paid';
        save();
        pendingSlip = { id: p.id, loan: l.id, amount: amt, date: today, method: p.method, ref: p.id };
        go('Payment History');
    };
}

/* The confirmation sits on the page, in the ledger it belongs to, and the new entry is stamped there. */
function slipPanel(r) {
    return panel(`<p class="notice success">Payment recorded successfully (demo)</p>
        <div class="stamp-field"><span class="impression impression--hero" data-stamp>Recorded</span></div>
        <h3>Payment Confirmation</h3>
        <dl class="facts">
            <div><dt>Loan</dt><dd>${r.loan}</dd></div>
            <div><dt>Payment amount</dt><dd>${money(r.amount)}</dd></div>
            <div><dt>Date</dt><dd>${r.date}</dd></div>
            <div><dt>Method</dt><dd>${escapeHtml(r.method)}</dd></div>
            <div><dt>Reference number</dt><dd>${r.ref}</dd></div>
        </dl>
        <p class="muted small">No real money was transferred.</p>
        <div class="form-actions">${btn('Back to Dashboard', 'goto:Dashboard')}</div>`, 'slip');
}

function paymentHistory(borrowerOnly = false) {
    const ps = db.payments.filter(p => !borrowerOnly || p.borrower === current.name).slice().sort((a, b) => b.date.localeCompare(a.date));
    const after = paymentBalances();
    const slip = borrowerOnly && pendingSlip ? slipPanel(pendingSlip) : '';
    const stampId = pendingSlip ? pendingSlip.id : null;
    pendingSlip = null;
    return head(borrowerOnly ? 'Payment History' : 'Payments', borrowerOnly ? 'Review recorded payment transactions.' : 'Review transactions recorded by the system.') + slip + panel(table(
        ['Payment ID', 'Loan ID', 'Borrower', 'Amount', 'Balance', 'Date', 'Method', 'Status'],
        ps.map(p => `<tr><td class="id">${p.id}</td><td class="id">${p.loanId}</td><td>${escapeHtml(p.borrower)}</td><td class="num">${money(p.amount)}</td><td class="num">${money(after[p.id])}</td><td class="num">${p.date}</td><td>${escapeHtml(p.method)}</td><td>${p.id === stampId ? '<span class="impression impression--paid" data-stamp>Recorded</span>' : statusBadge(p.status)}</td></tr>`).join('')
    ));
}

function profileSettings() {
    return head('Profile Settings', 'Manage your account information, security and reminders.') + panel(`
    <div class="tabs" role="tablist">
        <button class="tab active" type="button" role="tab" aria-selected="true" data-tab="personal">Personal Information</button>
        <button class="tab" type="button" role="tab" aria-selected="false" data-tab="security">Security</button>
        <button class="tab" type="button" role="tab" aria-selected="false" data-tab="notifications">Notifications</button>
    </div>
    <div id="profileTab"></div>`);
}

function drawProfileTab(tab) {
    const el = $('#profileTab');
    if (!el) return;
    if (tab === 'personal') {
        el.innerHTML = `<form id="profileForm"><div class="form-grid">
            <div><label for="pname">Full name</label><input id="pname" value="${escapeHtml(current.name)}" required></div>
            <div><label for="pemail">Email address</label><input id="pemail" type="email" value="${escapeHtml(current.email)}" required></div>
            <div><label for="pphone">Phone number</label><input id="pphone" value="${escapeHtml(current.phone)}" required></div>
            <div><label for="paddress">Address</label><input id="paddress" value="${escapeHtml(current.address || '')}"></div>
        </div><div class="form-actions"><button class="btn">Save Profile</button></div></form>`;
        $('#profileForm').onsubmit = e => {
            e.preventDefault();
            const oldName = current.name;
            current.name = $('#pname').value.trim();
            current.email = $('#pemail').value.trim();
            current.phone = $('#pphone').value.trim();
            current.address = $('#paddress').value.trim();
            db.loans.forEach(l => { if (l.userId === current.id) l.borrower = current.name });
            db.payments.forEach(p => { if (p.borrower === oldName) p.borrower = current.name });
            save();
            toast('Profile saved');
            render();
        };
    } else if (tab === 'security') {
        el.innerHTML = `<form id="passwordForm">
            <label for="oldpass">Current password</label><input id="oldpass" type="password" autocomplete="current-password" required>
            <label for="newpass">New password</label><input id="newpass" type="password" minlength="6" autocomplete="new-password" required>
            <label for="confpass">Confirm new password</label><input id="confpass" type="password" minlength="6" autocomplete="new-password" required>
            <div class="form-actions"><button class="btn">Update Password</button></div>
        </form>`;
        $('#passwordForm').onsubmit = e => {
            e.preventDefault();
            if ($('#oldpass').value !== current.password) return toast('Current password is incorrect.');
            if ($('#newpass').value !== $('#confpass').value) return toast('New passwords do not match.');
            current.password = $('#newpass').value;
            save();
            toast('Password updated');
            e.target.reset();
        };
    } else {
        el.innerHTML = `<h3>Notification Preferences</h3>
            <p class="muted">Choose how you would like to receive loan due-date and payment reminders.</p>
            <div class="notice">Reminder examples: 3 days before a due date and on the due date. A reminder can include the loan ID, due date and amount due.</div>
            ${SETTING_ROWS.map(([key, title, channel]) => `<div class="switchrow"><div><b>${title}</b><div class="muted small">${channel}</div></div><input type="checkbox" data-setting="${key}" aria-label="${title}, ${channel}" ${db.settings[key] ? 'checked' : ''}></div>`).join('')}
            <div class="form-actions"><button class="btn" id="saveNotify" type="button">Save Preferences</button><button class="btn btn--ghost" id="previewNotify" type="button">Preview Reminder</button></div>
            <p class="footer-note">Actual SMS/email delivery requires a backend service and an SMS/email provider. This demo only saves your preferences locally.</p>`;
        $('#saveNotify').onclick = () => { readSettings(el); save(); toast('Notification preferences saved locally') };
        $('#previewNotify').onclick = previewReminder;
    }
}

function previewReminder() {
    const l = db.loans.find(x => (x.userId === current.id || x.borrower === current.name) && balance(x) > 0);
    const id = l ? l.id : 'LN-001', due = l ? l.due : '[due date]', amt = money(l ? Math.min(balance(l), 1000) : 1000);
    modal(`<h2>Reminder Preview</h2>
        <p><b>SMS example</b></p>
        <div class="notice">SyncSINGIL: Reminder that loan ${id} is due on ${due}. Amount due: ${amt}. Please log in to view your loan details.</div>
        <p><b>Email example</b></p>
        <div class="notice"><b>Subject: Loan Due Date Reminder</b><br>Hello ${escapeHtml(current.name)},<br>This is a reminder that your loan ${id} is due on ${due}. Amount due: ${amt}.<br>Please log in to SyncSINGIL to review your balance.</div>
        <p class="muted small">Preview only. No message was sent.</p>
        <div class="form-actions"><button class="btn btn--ghost" type="button" data-close>Close</button></div>`);
}

/* Staff and admin portal. */
function adminDashboard() {
    const after = paymentBalances();
    const total = db.loans.reduce((s, l) => s + l.amount, 0), out = db.loans.reduce((s, l) => s + balance(l), 0), col = db.payments.reduce((s, p) => s + p.amount, 0);
    const over = overdueCount();
    const active = db.loans.filter(l => balance(l) > 0 && l.status !== 'Overdue').length;
    const paidN = db.loans.filter(l => balance(l) === 0).length;
    const withBal = db.loans.filter(l => balance(l) > 0).length;
    const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    const seg = n => (n > 0 ? `flex: ${n} 1 0` : 'flex: 0 1 0');
    return head('Dashboard', 'Overview of loans, collections and business activity') + `
    <section class="strip" data-enter>
        <div><span class="label">Total Borrowers</span><b>${db.users.filter(u => u.role === 'Borrower').length}</b><small>Registered borrower accounts</small></div>
        <div><span class="label">Active Loans</span><b>${withBal}</b><small>Loans with a balance</small></div>
        <div><span class="label">Total Outstanding</span><b>${money(out)}</b><small>Remaining borrower balances</small></div>
        <div><span class="label">Collected This Demo</span><b>${money(col)}</b><small>Recorded payments</small></div>
    </section>
    <div class="grid2">
        ${panel(`<h3>Monthly Collection Trend (sample)</h3><div class="bars">${months.map((m, i) => `<div class="bar-row"><span>${m}</span><div class="bar"><i style="width:${25 + i * 11}%"></i></div><b>${money(col * (.2 + i * .08))}</b></div>`).join('')}</div><p class="footer-note">Illustrative chart for prototype layout, not historical analytics.</p>`)}
        ${panel(`<h3>Loan Status Overview</h3>
            <div class="stack" role="img" aria-label="Loans: ${active} active, ${over} overdue, ${paidN} paid">
                <i class="seg seg--active" style="${seg(active)}"></i><i class="seg seg--overdue" style="${seg(over)}"></i><i class="seg seg--paid" style="${seg(paidN)}"></i>
            </div>
            <ul class="legend"><li>${statusBadge('Active')} ${active}</li><li>${statusBadge('Overdue')} ${over}</li><li>${statusBadge('Paid')} ${paidN}</li></ul>
            <div class="notice warn">Overdue accounts: <b>${over}</b>. Review the collection schedule.</div>
            ${btn('View Reports', 'goto:Reports', 'btn--ghost')}`)}
    </div>
    ${panel(`<h3>Recent Payments</h3>${table(['Payment ID', 'Borrower', 'Loan', 'Amount', 'Balance', 'Date', 'Method', 'Status'], db.payments.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map(p => `<tr><td class="id">${p.id}</td><td>${escapeHtml(p.borrower)}</td><td class="id">${p.loanId}</td><td class="num">${money(p.amount)}</td><td class="num">${money(after[p.id])}</td><td class="num">${p.date}</td><td>${escapeHtml(p.method)}</td><td>${statusBadge(p.status)}</td></tr>`).join(''))}`, 'stack-gap')}`;
}

function borrowersPage() {
    const q = searchText.toLowerCase();
    const users = db.users.filter(u => u.role === 'Borrower' && (filters.borrower === 'All' || u.status === filters.borrower) && [u.name, u.email, u.phone, u.id].some(v => String(v).toLowerCase().includes(q)));
    return head('Manage Borrowers', 'Create and maintain borrower accounts.', btn('+ Add Borrower', 'addBorrower')) + panel(`
        <div class="toolbar">
            <input id="search" type="search" aria-label="Search borrowers" placeholder="Search name, phone, ID..." value="${escapeHtml(searchText)}">
            <select id="borrowerStatus" aria-label="Filter by status">${opts(['All', 'Active', 'Inactive'], filters.borrower)}</select>
        </div>
        ${table(['ID', 'Name', 'Phone', 'Email', 'Status', 'Actions'], users.map(u => `<tr><td class="id">${u.id}</td><td>${escapeHtml(u.name)}</td><td class="num">${escapeHtml(u.phone)}</td><td>${escapeHtml(u.email)}</td><td>${statusBadge(u.status)}</td><td class="actions"><button class="btn btn--sm" type="button" data-action="editUser:${u.id}">Edit</button><button class="btn btn--sm btn--ghost" type="button" data-action="viewBorrower:${u.id}">View</button></td></tr>`).join(''))}`);
}

function loansPage() {
    const q = searchText.toLowerCase();
    const ls = db.loans.filter(l => (filters.loan === 'All' || effStatus(l) === filters.loan) && [l.id, l.borrower, effStatus(l)].some(v => String(v).toLowerCase().includes(q)));
    return head('Manage Loans', 'Create loans, set schedules and track balances.', btn('+ Add Loan', 'addLoan')) + panel(`
        <div class="toolbar">
            <input id="search" type="search" aria-label="Search loans" placeholder="Search borrower or loan number..." value="${escapeHtml(searchText)}">
            <select id="loanStatus" aria-label="Filter by status">${opts(['All', 'Active', 'Overdue', 'Paid'], filters.loan)}</select>
        </div>
        ${table(['Loan #', 'Borrower', 'Amount', 'Paid', 'Outstanding', 'Due Date', 'Schedule', 'Status', 'Actions'], ls.map(l => `<tr><td class="id">${l.id}</td><td>${escapeHtml(l.borrower)}</td><td class="num">${money(l.amount)}</td><td class="num">${money(l.paid)}</td><td class="num"><b>${money(balance(l))}</b></td><td class="num">${l.due}</td><td>${l.schedule}</td><td>${statusBadge(effStatus(l))}</td><td class="actions"><button class="btn btn--sm" type="button" data-action="editLoan:${l.id}">Edit</button></td></tr>`).join(''))}`);
}

function collectionsPage() {
    const rows = db.collections.filter(x => filters.collection === 'All' || x.status === filters.collection);
    return head('Collection Schedule', 'Organize collection visits and monitor collection status.', btn('+ Add Schedule', 'addCollection')) + panel(`
        <div class="toolbar"><label for="collectionStatus">Filter by status</label><select id="collectionStatus">${opts(['All', 'Pending', 'Completed', 'Overdue'], filters.collection)}</select></div>
        ${table(['Schedule ID', 'Due Date', 'Borrower', 'Loan', 'Amount', 'Status', 'Actions'], rows.map(x => `<tr><td class="id">${x.id}</td><td class="num">${x.date}</td><td>${escapeHtml(x.borrower)}</td><td class="id">${x.loanId}</td><td class="num">${money(x.amount)}</td><td>${statusBadge(x.status)}</td><td class="actions">${x.status === 'Completed' ? '' : `<button class="btn btn--sm" type="button" data-action="completeCollection:${x.id}">Complete</button>`}<button class="btn btn--sm btn--ghost" type="button" data-action="editCollection:${x.id}">Edit</button></td></tr>`).join(''))}`);
}

function reportsPage() {
    const total = db.loans.reduce((s, l) => s + l.amount, 0), out = db.loans.reduce((s, l) => s + balance(l), 0), col = db.payments.reduce((s, p) => s + p.amount, 0), over = overdueCount();
    const rate = col + out > 0 ? Math.round((col / (col + out)) * 100) : 0;
    return head('Reports', 'Loan summary, payment totals, collections and borrower activity.', btn('Export CSV', 'exportCSV', 'btn--ghost')) + `
    <section class="strip" data-enter>
        <div><span class="label">Total Loan Amount</span><b>${money(total)}</b><small>All recorded loans</small></div>
        <div><span class="label">Total Collected</span><b>${money(col)}</b><small>Payments recorded</small></div>
        <div><span class="label">Outstanding Balance</span><b>${money(out)}</b><small>Estimated current balances</small></div>
        <div><span class="label">Overdue Accounts</span><b>${over}</b><small>Loans marked overdue</small></div>
    </section>
    <div class="grid2">
        ${panel(`<h3>Loan Summary</h3>${table(['Loan', 'Borrower', 'Principal', 'Paid', 'Outstanding', 'Status'], db.loans.map(l => `<tr><td class="id">${l.id}</td><td>${escapeHtml(l.borrower)}</td><td class="num">${money(l.amount)}</td><td class="num">${money(l.paid)}</td><td class="num">${money(balance(l))}</td><td>${statusBadge(effStatus(l))}</td></tr>`).join(''))}`)}
        ${panel(`<h3>Collection Rate</h3><p class="rate">${rate}%</p><div class="bar bar--wide"><i style="width:${rate}%"></i></div><p>Recorded payments: <b class="num">${money(col)}</b></p><p>Outstanding balances: <b class="num">${money(out)}</b></p><p class="footer-note">This is a simple prototype summary, not an audited financial report.</p>`)}
    </div>`;
}

function usersPage() {
    return head('Manage Users', 'Create staff accounts and assign access roles.', btn('+ Add User', 'addUser')) + panel(table(
        ['User ID', 'Name', 'Username', 'Role', 'Email', 'Status', 'Actions'],
        db.users.map(u => `<tr><td class="id">${u.id}</td><td>${escapeHtml(u.name)}</td><td class="id">${escapeHtml(u.username)}</td><td>${u.role}</td><td>${escapeHtml(u.email)}</td><td>${statusBadge(u.status)}</td><td class="actions"><button class="btn btn--sm" type="button" data-action="editUser:${u.id}">Edit</button><button class="btn btn--sm btn--ghost" type="button" data-action="toggleUser:${u.id}">${u.status === 'Active' ? 'Disable' : 'Enable'}</button></td></tr>`).join('')
    ));
}

function settingsPage() {
    return head('System Settings', 'Configure reminders and account security.') + panel(`
        <h3>Notification Settings</h3>
        <p class="muted">Configure the reminder channels available to users. Borrowers choose their personal preferences in Profile Settings.</p>
        ${SYSTEM_ROWS.map(([key, label]) => `<div class="switchrow"><b>${label}</b><input type="checkbox" data-setting="${key}" aria-label="${label}" ${db.settings[key] ? 'checked' : ''}></div>`).join('')}
        <div class="form-actions"><button class="btn" id="saveSettings" type="button">Save Settings</button></div>
        <div class="notice warn">For production, protect customer data, hash passwords, use server-side permissions, and connect a verified SMS/email provider.</div>`);
}

/* Modals: borrower details, users, loans, collections, reminder preview. */
function borrowerModal(id) {
    const u = db.users.find(x => x.id === id);
    if (!u) return;
    const ls = db.loans.filter(l => l.userId === id || l.borrower === u.name);
    modal(`<h2>Borrower Details</h2>
        <p><b>${escapeHtml(u.name)}</b> (${u.id})</p>
        <p class="muted">${escapeHtml(u.email)} · ${escapeHtml(u.phone)}</p>
        <h3>Loan Summary</h3>
        ${table(['Loan', 'Amount', 'Outstanding', 'Due', 'Status'], ls.map(l => `<tr><td class="id">${l.id}</td><td class="num">${money(l.amount)}</td><td class="num">${money(balance(l))}</td><td class="num">${l.due}</td><td>${statusBadge(effStatus(l))}</td></tr>`).join(''))}
        <div class="form-actions"><button class="btn btn--ghost" type="button" data-close>Close</button></div>`);
}

function userModal(u, role = 'Staff') {
    const isNew = !u;
    const m = modal(`<h2>${isNew ? 'Add' : 'Edit'} ${role === 'Borrower' ? 'Borrower' : 'User'}</h2>
        <form id="userForm"><div class="form-grid">
            <div><label for="uname">Full name</label><input id="uname" name="name" required value="${escapeHtml(u?.name || '')}"></div>
            <div><label for="uuser">Username</label><input id="uuser" name="username" required value="${escapeHtml(u?.username || '')}"></div>
            <div><label for="uemail">Email</label><input id="uemail" name="email" type="email" required value="${escapeHtml(u?.email || '')}"></div>
            <div><label for="uphone">Phone</label><input id="uphone" name="phone" required value="${escapeHtml(u?.phone || '')}"></div>
            <div><label for="uaddr">Address</label><input id="uaddr" name="address" value="${escapeHtml(u?.address || '')}"></div>
            <div><label for="urole">Role</label><select id="urole" name="role">${opts(['Borrower', 'Admin', 'Staff', 'Collector'], u?.role || role)}</select></div>
            <div><label for="upass">${isNew ? 'Temporary password' : 'New password (leave blank to keep current)'}</label><input id="upass" name="password" type="password" ${isNew ? 'required' : ''} minlength="6" autocomplete="new-password"></div>
            <div><label for="ustatus">Status</label><select id="ustatus" name="status">${opts(['Active', 'Inactive'], u?.status || 'Active')}</select></div>
        </div>
        <div class="form-actions"><button class="btn">Save User</button><button class="btn btn--ghost" type="button" data-close>Cancel</button></div></form>`);
    m.querySelector('#userForm').onsubmit = e => {
        e.preventDefault();
        const v = Object.fromEntries(new FormData(e.target).entries());
        if (isNew) db.users.push({ ...v, id: 'USR-' + String(Date.now()).slice(-5) });
        else {
            if (!v.password) delete v.password;
            Object.assign(u, v);
        }
        save();
        closeModal(m);
        render();
        toast('User saved');
    };
}

function loanModal(l) {
    const isNew = !l;
    const m = modal(`<h2>${isNew ? 'Add' : 'Edit'} Loan</h2>
        <form id="loanForm">
            <label for="lborrower">Borrower</label>
            <select id="lborrower" name="userId" required>${db.users.filter(u => u.role === 'Borrower').map(u => `<option value="${u.id}" ${l?.userId === u.id ? 'selected' : ''}>${escapeHtml(u.name)}</option>`).join('')}</select>
            <div class="form-grid">
                <div><label for="lamount">Loan amount</label><input id="lamount" name="amount" type="number" min="1" required value="${l?.amount || ''}"></div>
                <div><label for="lrate">Interest rate (%)</label><input id="lrate" name="rate" type="number" min="0" step=".1" value="${l?.rate ?? 5}"></div>
                <div><label for="lstart">Start date</label><input id="lstart" name="start" type="date" value="${l?.start || today}"></div>
                <div><label for="ldue">Due date</label><input id="ldue" name="due" type="date" required value="${l?.due || today}"></div>
                <div><label for="lsched">Payment schedule</label><select id="lsched" name="schedule">${opts(['Daily', 'Weekly', 'Monthly'], l?.schedule || 'Monthly')}</select></div>
                <div><label for="lstatus">Status</label><select id="lstatus" name="status">${opts(['Active', 'Overdue', 'Paid'], l?.status || 'Active')}</select></div>
            </div>
            <div class="form-actions"><button class="btn">Save Loan</button><button class="btn btn--ghost" type="button" data-close>Cancel</button></div>
        </form>`);
    m.querySelector('#loanForm').onsubmit = e => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.target).entries());
        const u = db.users.find(x => x.id === f.userId);
        f.amount = Number(f.amount);
        f.rate = Number(f.rate);
        f.borrower = u.name;
        if (isNew) {
            f.id = 'LN-' + String(Date.now()).slice(-5);
            f.paid = 0;
            db.loans.push(f);
        } else {
            f.paid = l.paid;
            Object.assign(l, f);
        }
        save();
        closeModal(m);
        render();
        toast('Loan saved');
    };
}

function collectionModal(x) {
    const isNew = !x;
    const m = modal(`<h2>${isNew ? 'Add' : 'Edit'} Collection Schedule</h2>
        <form id="collectionForm"><div class="form-grid">
            <div><label for="cborrower">Borrower</label><select id="cborrower" name="borrower">${opts(db.users.filter(u => u.role === 'Borrower').map(u => u.name), x?.borrower)}</select></div>
            <div><label for="cloan">Loan</label><select id="cloan" name="loanId">${db.loans.map(l => `<option ${x?.loanId === l.id ? 'selected' : ''}>${l.id}</option>`).join('')}</select></div>
            <div><label for="cdate">Due date</label><input id="cdate" name="date" type="date" required value="${x?.date || today}"></div>
            <div><label for="camount">Amount</label><input id="camount" name="amount" type="number" min="1" required value="${x?.amount || ''}"></div>
            <div><label for="cstatus">Status</label><select id="cstatus" name="status">${opts(['Pending', 'Completed', 'Overdue'], x?.status || 'Pending')}</select></div>
        </div>
        <div class="form-actions"><button class="btn">Save Schedule</button><button class="btn btn--ghost" type="button" data-close>Cancel</button></div></form>`);
    m.querySelector('#collectionForm').onsubmit = e => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.target).entries());
        f.amount = Number(f.amount);
        if (isNew) {
            f.id = 'COL-' + String(Date.now()).slice(-5);
            db.collections.push(f);
        } else Object.assign(x, f);
        save();
        closeModal(m);
        render();
        toast('Collection schedule saved');
    };
}

function exportCSV() {
    const rows = [['Loan', 'Borrower', 'Amount', 'Paid', 'Outstanding', 'Due Date', 'Status'], ...db.loans.map(l => [l.id, l.borrower, l.amount, l.paid, balance(l), l.due, l.status])];
    const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'syncsingil-report.csv';
    a.click();
    URL.revokeObjectURL(url);
}

save();
login();
