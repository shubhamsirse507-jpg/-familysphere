import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_TOKEN } from '../middleware/adminAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.resolve(__dirname, '../../../family_members.csv');

// Simple CSV parser
function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const values = [];
    let inQuote = false, cur = '';
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { values.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    values.push(cur.trim());
    return headers.reduce((obj, h, i) => { obj[h] = values[i] || ''; return obj; }, {});
  });
  return { headers, rows };
}

// ===========================================================
// GET /admin/login  — Show login page
// ===========================================================
export const showLogin = (req, res) => {
  const error = req.query.error ? 'Invalid username or password.' : '';
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>FamilySphere Admin Login</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
      font-family: 'Outfit', sans-serif;
    }
    .card {
      background: rgba(255,255,255,0.07);
      backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 24px;
      padding: 48px 40px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 30px 80px rgba(0,0,0,0.5);
    }
    .logo {
      font-size: 32px;
      font-weight: 800;
      background: linear-gradient(90deg, #a78bfa, #60a5fa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-align: center;
      margin-bottom: 6px;
    }
    .subtitle {
      text-align: center;
      color: rgba(255,255,255,0.45);
      font-size: 13px;
      margin-bottom: 36px;
      letter-spacing: 0.5px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(239,68,68,0.15);
      border: 1px solid rgba(239,68,68,0.3);
      color: #fca5a5;
      font-size: 11px;
      padding: 4px 12px;
      border-radius: 20px;
      margin: 0 auto 28px;
      display: table;
    }
    label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: rgba(255,255,255,0.5);
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    input {
      width: 100%;
      padding: 14px 16px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px;
      color: #fff;
      font-size: 15px;
      font-family: 'Outfit', sans-serif;
      margin-bottom: 20px;
      transition: border-color 0.2s;
      outline: none;
    }
    input:focus { border-color: #a78bfa; background: rgba(167,139,250,0.08); }
    .error {
      background: rgba(239,68,68,0.12);
      border: 1px solid rgba(239,68,68,0.3);
      color: #fca5a5;
      font-size: 13px;
      padding: 12px 16px;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    button {
      width: 100%;
      padding: 15px;
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      color: #fff;
      font-size: 16px;
      font-weight: 700;
      font-family: 'Outfit', sans-serif;
      border: none;
      border-radius: 14px;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      box-shadow: 0 8px 24px rgba(124,58,237,0.4);
    }
    button:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(124,58,237,0.55); }
    button:active { transform: translateY(0); }
    .footer {
      text-align: center;
      margin-top: 24px;
      font-size: 12px;
      color: rgba(255,255,255,0.25);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🛡️ FamilySphere</div>
    <div class="subtitle">Developer Admin Portal</div>
    <div class="badge">🔐 Restricted Access</div>
    ${error ? `<div class="error">⚠️ ${error}</div>` : ''}
    <form method="POST" action="/admin/login">
      <label>Admin Username</label>
      <input type="text" name="username" placeholder="Enter admin username" required autocomplete="off"/>
      <label>Admin Password</label>
      <input type="password" name="password" placeholder="••••••••••••" required/>
      <button type="submit">Access Admin Dashboard →</button>
    </form>
    <div class="footer">FamilySphere © 2025 — Developer Eyes Only</div>
  </div>
</body>
</html>`);
};

// ===========================================================
// POST /admin/login  — Process login
// ===========================================================
export const processLogin = (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // Set secure admin session cookie (httpOnly, 8-hour expiry)
    const expires = new Date(Date.now() + 8 * 60 * 60 * 1000).toUTCString();
    res.setHeader('Set-Cookie', `admin_token=${ADMIN_TOKEN}; Path=/admin; HttpOnly; Expires=${expires}`);
    return res.redirect('/admin/dashboard');
  }
  return res.redirect('/admin/login?error=1');
};

// ===========================================================
// GET /admin/logout
// ===========================================================
export const logout = (req, res) => {
  res.setHeader('Set-Cookie', 'admin_token=; Path=/admin; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  res.redirect('/admin/login');
};

// ===========================================================
// GET /admin/dashboard  — Show user table
// ===========================================================
export const showDashboard = (req, res) => {
  let rows = [];
  let headers = [];
  let csvExists = false;

  if (fs.existsSync(CSV_PATH)) {
    csvExists = true;
    const content = fs.readFileSync(CSV_PATH, 'utf8');
    const parsed = parseCSV(content);
    headers = parsed.headers;
    rows = parsed.rows;
  }

  const rowsHtml = rows.map((row, i) => `
    <tr>
      <td>${i + 1}</td>
      ${headers.map(h => {
        if (h.toLowerCase() === 'password') {
          return `<td><span class="password-cell" onclick="this.textContent = this.textContent === '••••••••' ? '${(row[h]||'').replace(/'/g,"\\'")}' : '••••••••'" style="cursor:pointer;" title="Click to reveal">••••••••</span></td>`;
        }
        if (h.toLowerCase() === 'profilephoto' && row[h] && row[h].startsWith('http')) {
          return `<td><img src="${row[h]}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid #a78bfa;"/></td>`;
        }
        return `<td>${row[h] || '<span style="color:rgba(255,255,255,0.2)">—</span>'}</td>`;
      }).join('')}
    </tr>`).join('');

  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>FamilySphere Admin Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
      font-family: 'Outfit', sans-serif;
      color: #e2e8f0;
    }
    /* ---- Header ---- */
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 36px;
      background: rgba(255,255,255,0.04);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      backdrop-filter: blur(20px);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-left { display: flex; align-items: center; gap: 14px; }
    .header-logo { font-size: 24px; font-weight: 800; background: linear-gradient(90deg, #a78bfa, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .header-sub { font-size: 12px; color: rgba(255,255,255,0.35); letter-spacing: 0.5px; }
    .admin-badge { background: rgba(167,139,250,0.15); border: 1px solid rgba(167,139,250,0.3); color: #c4b5fd; font-size: 12px; padding: 4px 14px; border-radius: 20px; font-weight: 600; }
    .logout-btn {
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.25);
      color: #fca5a5;
      padding: 8px 20px;
      border-radius: 10px;
      font-size: 13px;
      font-family: 'Outfit', sans-serif;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.2s;
    }
    .logout-btn:hover { background: rgba(239,68,68,0.2); }
    /* ---- Main ---- */
    main { padding: 36px; max-width: 1400px; margin: 0 auto; }
    /* ---- Stats Cards ---- */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 36px; }
    .stat-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 18px;
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 18px;
      transition: transform 0.2s;
    }
    .stat-card:hover { transform: translateY(-2px); }
    .stat-icon { font-size: 36px; }
    .stat-value { font-size: 32px; font-weight: 800; background: linear-gradient(90deg, #a78bfa, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .stat-label { font-size: 12px; color: rgba(255,255,255,0.4); letter-spacing: 0.5px; text-transform: uppercase; }
    /* ---- Table Section ---- */
    .table-section {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      overflow: hidden;
    }
    .table-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 22px 28px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .table-title { font-size: 18px; font-weight: 700; }
    .download-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      color: #fff;
      text-decoration: none;
      padding: 10px 22px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      font-family: 'Outfit', sans-serif;
      transition: transform 0.15s, box-shadow 0.15s;
      box-shadow: 0 4px 16px rgba(124,58,237,0.35);
    }
    .download-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(124,58,237,0.5); }
    .table-wrapper { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    thead { background: rgba(167,139,250,0.1); }
    th {
      padding: 14px 20px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: rgba(167,139,250,0.9);
      white-space: nowrap;
    }
    tbody tr { border-bottom: 1px solid rgba(255,255,255,0.04); transition: background 0.15s; }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: rgba(255,255,255,0.04); }
    td { padding: 14px 20px; font-size: 14px; color: rgba(255,255,255,0.8); }
    td:first-child { color: rgba(255,255,255,0.3); font-size: 12px; }
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: rgba(255,255,255,0.3);
    }
    .empty-state .icon { font-size: 48px; margin-bottom: 12px; }
    /* ---- Refresh ---- */
    .refresh-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      color: rgba(255,255,255,0.3);
      padding: 14px 28px;
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; display: inline-block; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
  </style>
</head>
<body>
  <header>
    <div class="header-left">
      <div>
        <div class="header-logo">🛡️ FamilySphere Admin</div>
        <div class="header-sub">Developer Dashboard — Restricted Access</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:14px;">
      <span class="admin-badge">👤 ${ADMIN_USERNAME}</span>
      <a href="/admin/logout" class="logout-btn">🚪 Logout</a>
    </div>
  </header>

  <main>
    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div>
          <div class="stat-value">${rows.length}</div>
          <div class="stat-label">Total Users</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📁</div>
        <div>
          <div class="stat-value">${csvExists ? '✓' : '✗'}</div>
          <div class="stat-label">CSV File</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🕐</div>
        <div>
          <div class="stat-value" style="font-size:18px;">${new Date().toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'})}</div>
          <div class="stat-label">Last Loaded</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🌐</div>
        <div>
          <div class="stat-value" style="font-size:18px;">Live</div>
          <div class="stat-label">Server Status</div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="table-section">
      <div class="table-header">
        <div class="table-title">📋 Registered Users (from family_members.csv)</div>
        <a href="/admin/download" class="download-btn">⬇️ Download CSV</a>
      </div>
      <div class="table-wrapper">
        ${rows.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>#</th>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>` : `
        <div class="empty-state">
          <div class="icon">📭</div>
          <div>No users registered yet.</div>
          <div style="font-size:12px;margin-top:6px;">Users will appear here once they sign up.</div>
        </div>`}
      </div>
      <div class="refresh-bar">
        <span class="dot"></span>
        Live data from <code style="color:rgba(167,139,250,0.7);margin:0 4px;">family_members.csv</code> — 
        <a href="/admin/dashboard" style="color:rgba(167,139,250,0.7);text-decoration:none;">🔄 Refresh</a>
      </div>
    </div>
  </main>
</body>
</html>`);
};

// ===========================================================
// GET /admin/download  — Force-download the CSV file
// ===========================================================
export const downloadCSV = (req, res) => {
  if (!fs.existsSync(CSV_PATH)) {
    return res.status(404).send('CSV file not found.');
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="familysphere_users.csv"');
  fs.createReadStream(CSV_PATH).pipe(res);
};
