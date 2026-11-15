/**
 * By Angély — Servidor HTTP/REST API de Produção (Render Web Service + Integração Supabase PostgreSQL)
 * Itaperuna, Rio de Janeiro — Brasil
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

const Seed = require('./public/js/store-data.js');
const Pix = require('./public/js/pix-qrcode.js');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Configuração Supabase via Variáveis de Ambiente (Chave Service Role NUNCA fica no código-fonte)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mhtsubybvriffashamiy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

function hashPassword(password, salt = 'by-angely-salt-v1') {
  return crypto.pbkdf2Sync(String(password), salt, 10000, 32, 'sha256').toString('hex');
}

function sanitizeDbForPublic(rawDb) {
  const copy = JSON.parse(JSON.stringify(rawDb));
  if (Array.isArray(copy.adminUsers)) {
    copy.adminUsers = copy.adminUsers.map((u) => {
      const clean = { ...u };
      delete clean.passwordHash;
      return clean;
    });
  }
  return copy;
}

function ensureLocalDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = Seed.createInitialDatabase();
    initial.adminUsers = initial.adminUsers.map((u) => ({
      ...u,
      passwordHash:
        u.role === 'owner'
          ? hashPassword('Angely@2026')
          : hashPassword('Equipe@2026')
    }));
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler db.json local, recriando base inicial:', err.message);
    return Seed.createInitialDatabase();
  }
}

let db = ensureLocalDatabase();

/**
 * Sincroniza estado com o Supabase PostgreSQL quando SUPABASE_KEY está configurada no servidor
 */
async function syncFromSupabaseOnBoot() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/by_angely_store_state?id=eq.main&select=state`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/json'
      }
    });
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0 && rows[0].state && rows[0].state.storeSettings) {
        db = { ...db, ...rows[0].state };
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
        console.log('[Supabase] Estado sincronizado com sucesso a partir do PostgreSQL.');
        return;
      }
    }
    // Se a tabela estiver vazia, popula o Supabase com o estado inicial
    await pushStateToSupabase(db);
  } catch (err) {
    console.warn('[Supabase] Aviso ao sincronizar no boot:', err.message);
  }
}

async function pushStateToSupabase(currentDb) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;
  try {
    const publicSafeState = sanitizeDbForPublic(currentDb);
    // 1. Atualiza by_angely_store_state
    const stateRes = await fetch(`${SUPABASE_URL}/rest/v1/by_angely_store_state`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: 'main',
        state: publicSafeState,
        updated_at: new Date().toISOString()
      })
    });

    // 2. Sincroniza catálogo em by_angely_products
    if (Array.isArray(currentDb.products) && currentDb.products.length > 0) {
      const prodRows = currentDb.products.map((p) => ({
        id: String(p.id),
        sku: String(p.sku || ''),
        name: String(p.name || ''),
        category: String(p.category || ''),
        price: Number(p.price) || 0,
        promo_price: p.promoPrice ? Number(p.promoPrice) : null,
        is_promo: !!p.isPromo,
        is_demo: !!p.isDemo,
        status: String(p.status || 'published'),
        payload: p,
        updated_at: new Date().toISOString()
      }));
      await fetch(`${SUPABASE_URL}/rest/v1/by_angely_products`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(prodRows)
      });
    }

    // 3. Sincroniza pedidos em by_angely_orders
    if (Array.isArray(currentDb.orders) && currentDb.orders.length > 0) {
      const ordRows = currentDb.orders.map((o) => ({
        id: String(o.id),
        order_number: String(o.orderNumber || ''),
        status: String(o.status || 'awaiting_confirmation'),
        total: Number(o.total) || 0,
        payment_method: String(o.paymentMethod || 'pix'),
        customer_email: (o.customer && o.customer.email) || '',
        payload: o,
        updated_at: new Date().toISOString()
      }));
      await fetch(`${SUPABASE_URL}/rest/v1/by_angely_orders`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(ordRows)
      });
    }

    return stateRes.ok;
  } catch (err) {
    console.warn('[Supabase] Erro ao gravar no PostgreSQL:', err.message);
    return false;
  }
}

function saveDatabase(currentDb) {
  currentDb.updatedAt = new Date().toISOString();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(currentDb, null, 2), 'utf8');
  } catch (e) {
    console.warn('Aviso ao gravar db.json local:', e.message);
  }
  pushStateToSupabase(currentDb);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function setCorsAndSecurityHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Role');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

function sendJson(res, statusCode, payload) {
  setCorsAndSecurityHeaders(res);
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 25 * 1024 * 1024) {
        reject(new Error('Payload excede o limite permitido (25MB).'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error('JSON inválido.'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  setCorsAndSecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname || '/';

  // Health Check para o Render
  if ((pathname === '/api/health' || pathname === '/health') && req.method === 'GET') {
    return sendJson(res, 200, {
      ok: true,
      service: 'by-angely-ecommerce-api',
      store: db.storeSettings.brandName,
      city: db.storeSettings.city,
      supabaseConnected: Boolean(SUPABASE_URL && SUPABASE_KEY),
      productsCount: (db.products || []).length,
      ordersCount: (db.orders || []).length,
      updatedAt: db.updatedAt
    });
  }

  // Estado público e administrativo
  if (pathname === '/api/state' && req.method === 'GET') {
    return sendJson(res, 200, sanitizeDbForPublic(db));
  }

  if (pathname === '/api/state' && req.method === 'POST') {
    try {
      const incoming = await parseBody(req);
      if (incoming && typeof incoming === 'object' && incoming.storeSettings) {
        db = {
          ...db,
          ...incoming,
          updatedAt: new Date().toISOString()
        };
        saveDatabase(db);
        return sendJson(res, 200, { ok: true, updatedAt: db.updatedAt });
      }
      return sendJson(res, 400, { ok: false, error: 'Estrutura de estado inválida.' });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  // Endpoint dedicado de geração e validação EMV Pix BR Code
  if (pathname === '/api/pix/preview' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const payload = Pix.generatePixPayload({
        pixKey: body.pixKey,
        keyType: body.keyType,
        merchantName: body.merchantName || 'BY ANGELY',
        merchantCity: body.merchantCity || 'ITAPERUNA',
        amount: Number(body.amount) || 0,
        txid: body.txid || 'BYANGELYTESTE',
        description: body.description || ''
      });
      const svg = Pix.renderQrSvg(payload);
      return sendJson(res, 200, { ok: true, payload, svg });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  // Arquivos estáticos de public/
  let safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\\.\\.[\\/\\\\])+/, '');
  if (safePath === '/' || safePath === '\\\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Acesso negado.');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const indexFile = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(indexFile, (readErr, content) => {
        if (readErr) {
          res.writeHead(500);
          return res.end('Erro interno ao carregar a aplicação.');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log('==================================================================');
  console.log('  BY ANGÉLY — E-commerce & Painel Administrativo (Itaperuna, RJ)');
  console.log(`  Servidor ativo em: http://${HOST}:${PORT}`);
  console.log('==================================================================');
  syncFromSupabaseOnBoot();
});
