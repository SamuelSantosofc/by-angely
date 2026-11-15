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
const SECRETS_FILE = path.join(DATA_DIR, 'payment_secrets.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const PIX_WEBHOOK_SECRET = process.env.PIX_WEBHOOK_SECRET || 'by-angely-pix-webhook-secret-2026';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mhtsubybvriffashamiy.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odHN1YnlidnJpZmZhc2hhbWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNjQwMjEsImV4cCI6MjA5MTc0MDAyMX0.w-cW0lK66k-z2A5b6yJ8wN4x_Q9mR3tE1uP7vY5kL2o'.replace(/\s+/g, '');

function hashPassword(password, salt = 'by-angely-salt-v1') {
  return crypto.pbkdf2Sync(String(password), salt, 10000, 32, 'sha256').toString('hex');
}

function generateToken(prefix = 'tok') {
  return `${prefix}_${ crypto.randomBytes(24).toString('hex') }`;
}

function isValidClothingSize(sz) {
  if (sz === null || sz === undefined) return false;
  const s = String(sz).trim().toLowerCase();
  return Boolean(s) && !['0', '00', 'null', 'undefined', 'nan', '-', 'nenhum', 'n/a'].includes(s);
}

function isValidColorName(clr) {
  if (clr === null || clr === undefined) return false;
  const s = String(clr).trim().toLowerCase();
  return Boolean(s) && !['0', '00', 'null', 'undefined', 'nan', '-'].includes(s);
}

function getEffectivePrice(product) {
  if (!product) return 0;
  if (product.isPromo && product.promoPrice && Number(product.promoPrice) > 0 && Number(product.promoPrice) < Number(product.price)) {
    return Number(product.promoPrice);
  }
  return Number(product.price) || 0;
}

function getVariationStock(product, size, color) {
  if (!product || !Array.isArray(product.variations)) return 0;
  const found = product.variations.find((v) => v.size === size && v.color === color);
  return found ? Math.max(0, Number(found.stock) || 0) : 0;
}

const ORDER_STATUS_LABELS = {
  awaiting_payment: 'Aguardando pagamento',
  awaiting_confirmation: 'Aguardando pagamento',
  awaiting_whatsapp: 'Aguardando confirmação pelo WhatsApp',
  paid: 'Pagamento aprovado',
  awaiting_separation: 'Aguardando separação',
  in_separation: 'Em separação',
  preparing: 'Em separação',
  ready_for_shipping: 'Pedido pronto para envio ou retirada',
  ready_pickup: 'Pedido pronto para envio ou retirada',
  shipped: 'Enviado',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
  cancelled_expired: 'Cancelado por falta de pagamento',
  late_payment_reconciliation: 'Pagamento após expiração — Em conciliação'
};

function repairDatabaseState(rawDb) {
  const seed = Seed.createInitialDatabase();
  const target = rawDb && typeof rawDb === 'object' ? rawDb : seed;

  target.storeSettings = {
    ...(seed.storeSettings || {}),
    ...(target.storeSettings || {}),
    homeSections: {
      showHero: true,
      showFeatured: true,
      showNewArrivals: true,
      showPromos: true,
      showCategories: true,
      showBestSellers: false,
      showBrandStory: true,
      showContactSection: false,
      ...((target.storeSettings && target.storeSettings.homeSections) || {})
    }
  };

  const seedCats = seed.categories || [];
  if (!Array.isArray(target.categories) || target.categories.length === 0) {
    target.categories = JSON.parse(JSON.stringify(seedCats));
  } else {
    target.categories = target.categories.map((cat, idx) => {
      const slugNorm = String(cat.slug || cat.name || '').toLowerCase();
      const match = seedCats.find(
        (sc) => sc.slug === slugNorm || (slugNorm.includes('blusa') && sc.slug === 'blusas')
      ) || seedCats[idx] || seedCats[0];
      return {
        ...match,
        ...cat,
        slug: slugNorm.includes('blusa') ? 'blusas' : (cat.slug || match.slug),
        name: slugNorm.includes('blusa') ? 'Blusas & Camisas' : (cat.name || match.name),
        imageUrl: (cat.imageUrl && String(cat.imageUrl).trim().length > 8) ? cat.imageUrl : match.imageUrl
      };
    });
  }

  target.orders = (target.orders || []).filter(
    (o) => o && o.id !== 'ord-demo-1001' && o.orderNumber !== 'BYA-2026-1042'
  );
  target.customers = (target.customers || []).filter(
    (c) => c && c.id !== 'cust-demo-1' && c.email !== 'cliente.exemplo@email.local'
  );
  target.reviews = (target.reviews || []).filter(
    (r) => r && !r.isDemo && r.id !== 'rev-1' && r.id !== 'rev-2'
  );

  target.pixCharges = Array.isArray(target.pixCharges) ? target.pixCharges : [];
  target.processedWebhooks = Array.isArray(target.processedWebhooks) ? target.processedWebhooks : [];
  target.financialEvents = Array.isArray(target.financialEvents) ? target.financialEvents : [];
  target.stockMovements = Array.isArray(target.stockMovements) ? target.stockMovements : [];
  target.adminNotifications = Array.isArray(target.adminNotifications) ? target.adminNotifications : [];

  const seedPay = seed.paymentSettings || {};
  const isV3 = target.paymentSettings && target.paymentSettings.paymentConfigVersion >= 3;

  target.paymentSettings = {
    ...seedPay,
    ...(target.paymentSettings || {}),
    paymentConfigVersion: 3,
    whatsapp: {
      ...seedPay.whatsapp,
      ...((target.paymentSettings && target.paymentSettings.whatsapp) || {}),
      enabled: isV3
        ? Boolean(target.paymentSettings.whatsapp && target.paymentSettings.whatsapp.enabled)
        : true
    },
    pix: {
      ...seedPay.pix,
      ...((target.paymentSettings && target.paymentSettings.pix) || {}),
      enabled: isV3 && target.paymentSettings.pix && typeof target.paymentSettings.pix.enabled === 'boolean'
        ? target.paymentSettings.pix.enabled
        : true,
      keyType: 'telefone',
      pixKey: (target.paymentSettings && target.paymentSettings.pix && target.paymentSettings.pix.pixKey && !String(target.paymentSettings.pix.pixKey).toLowerCase().includes('a confirmar'))
        ? target.paymentSettings.pix.pixKey
        : '+5528999871458',
      recipientName: (target.paymentSettings && target.paymentSettings.pix && target.paymentSettings.pix.recipientName && !String(target.paymentSettings.pix.recipientName).toLowerCase().includes('a confirmar'))
        ? target.paymentSettings.pix.recipientName
        : 'BY ANGELY',
      recipientCity: (target.paymentSettings && target.paymentSettings.pix && target.paymentSettings.pix.recipientCity) || 'ITAPERUNA',
      txidPrefix: (target.paymentSettings && target.paymentSettings.pix && target.paymentSettings.pix.txidPrefix) || 'BYANGELY',
      expirationMinutes: Math.max(1, Number((target.paymentSettings && target.paymentSettings.pix && target.paymentSettings.pix.expirationMinutes) || 15)),
      confirmationMode: 'webhook_auto',
      pspWebhookConfigured: true,
      pspProviderName: (target.paymentSettings && target.paymentSettings.pix && target.paymentSettings.pix.pspProviderName) || 'Pix Dinâmico EMV + Webhook Automático'
    },
    creditCard: {
      ...seedPay.creditCard,
      ...((target.paymentSettings && target.paymentSettings.creditCard) || {}),
      enabled: isV3 ? Boolean(target.paymentSettings.creditCard && target.paymentSettings.creditCard.enabled) : false
    },
    debitCard: {
      ...seedPay.debitCard,
      ...((target.paymentSettings && target.paymentSettings.debitCard) || {}),
      enabled: isV3 ? Boolean(target.paymentSettings.debitCard && target.paymentSettings.debitCard.enabled) : false
    },
    payOnPickup: {
      ...seedPay.payOnPickup,
      ...((target.paymentSettings && target.paymentSettings.payOnPickup) || {}),
      enabled: isV3 ? Boolean(target.paymentSettings.payOnPickup && target.paymentSettings.payOnPickup.enabled) : false
    }
  };

  ['creditCard', 'debitCard'].forEach((cardKey) => {
    const cardCfg = target.paymentSettings[cardKey];
    if (cardCfg && typeof cardCfg.externalPaymentLink === 'string' && cardCfg.externalPaymentLink.includes('wa.me/')) {
      cardCfg.externalPaymentLink = '';
    }
  });

  const seedProducts = seed.products || [];
  if (!Array.isArray(target.products) || target.products.length === 0) {
    target.products = JSON.parse(JSON.stringify(seedProducts));
  } else {
    const publishedCount = target.products.filter((p) => p && p.status === 'published' && Number(p.price) > 0).length;
    target.products = target.products.map((prod) => {
      const seedMatch = seedProducts.find((sp) => sp.id === prod.id || sp.sku === prod.sku);
      const cleanedSizes = Array.isArray(prod.sizes) ? prod.sizes.filter(isValidClothingSize) : [];
      const validSizes = cleanedSizes.length > 0
        ? cleanedSizes
        : (seedMatch && seedMatch.sizes ? [...seedMatch.sizes] : ['P', 'M', 'G']);

      const hasInvalidVarSize = Array.isArray(prod.variations) && prod.variations.some((v) => !isValidClothingSize(v && v.size));
      const validVariations = hasInvalidVarSize && seedMatch && seedMatch.variations
        ? JSON.parse(JSON.stringify(seedMatch.variations))
        : Array.isArray(prod.variations)
          ? prod.variations.map((v) => ({ ...v, size: isValidClothingSize(v.size) ? v.size : (validSizes[0] || 'M') }))
          : (seedMatch && seedMatch.variations ? JSON.parse(JSON.stringify(seedMatch.variations)) : [{ size: validSizes[0] || 'M', color: 'Padrão', stock: 4 }]);

      if (seedMatch && (!Number(prod.price) || Number(prod.price) <= 0)) {
        return {
          ...seedMatch,
          ...prod,
          sizes: validSizes,
          variations: validVariations,
          price: seedMatch.price,
          promoPrice: seedMatch.promoPrice,
          isPromo: seedMatch.isPromo,
          status: publishedCount === 0 ? 'published' : (prod.status || 'published'),
          stockByVariation: (prod.stockByVariation && Object.keys(prod.stockByVariation).length > 0)
            ? prod.stockByVariation
            : seedMatch.stockByVariation
        };
      }
      if (seedMatch && publishedCount === 0 && prod.isDemo) {
        return { ...prod, sizes: validSizes, variations: validVariations, status: 'published' };
      }
      return { ...prod, sizes: validSizes, variations: validVariations };
    });
  }

  const seedCoupons = seed.coupons || [];
  if (!Array.isArray(target.coupons) || target.coupons.length === 0) {
    target.coupons = JSON.parse(JSON.stringify(seedCoupons));
  } else {
    target.coupons = target.coupons.map((cp) => {
      const seedCp = seedCoupons.find((sc) => sc.code === cp.code);
      if (seedCp && (!target.catalogDataRepairV3 || !cp.type)) {
        return {
          ...seedCp,
          ...cp,
          type: seedCp.type,
          value: seedCp.value,
          minOrder: seedCp.minOrder,
          description: seedCp.description
        };
      }
      return cp;
    });
  }

  if (Array.isArray(target.adminUsers)) {
    target.adminUsers = target.adminUsers
      .filter((u) => u && u.email !== 'proprietaria@byangely.local')
      .map((u) => ({
        ...u,
        passwordHash: u.passwordHash || hashPassword(u.role === 'owner' ? 'Angely@2026' : 'Equipe@2026')
      }));
  }

  target.catalogDataRepairV3 = true;
  return target;
}

function sanitizeCustomerForClient(cust) {
  if (!cust) return null;
  const clean = { ...cust };
  delete clean.password;
  delete clean.passwordHash;
  return clean;
}

function sanitizeDbForPublic(rawDb, options = {}) {
  const copy = JSON.parse(JSON.stringify(rawDb));
  if (Array.isArray(copy.adminUsers)) {
    copy.adminUsers = copy.adminUsers.map((u) => {
      const clean = { ...u };
      delete clean.passwordHash;
      delete clean.customPassword;
      return clean;
    });
  }
  if (copy.paymentSettings) {
    ['creditCard', 'debitCard', 'pix'].forEach((methodKey) => {
      if (copy.paymentSettings[methodKey] && typeof copy.paymentSettings[methodKey] === 'object') {
        delete copy.paymentSettings[methodKey].secretToken;
        delete copy.paymentSettings[methodKey].accessToken;
        delete copy.paymentSettings[methodKey].clientSecret;
        delete copy.paymentSettings[methodKey].privateKey;
        delete copy.paymentSettings[methodKey].webhookSecret;
      }
    });
  }
  if (Array.isArray(copy.customers)) {
    copy.customers = copy.customers.map((c) => {
      const clean = { ...c };
      delete clean.password;
      delete clean.passwordHash;
      delete clean.sessionToken;
      return clean;
    });
  }
  if (!options.isAdmin && options.customerEmail) {
    const emailNorm = String(options.customerEmail).trim().toLowerCase();
    copy.orders = (copy.orders || []).filter(
      (o) => o && o.customer && String(o.customer.email || '').trim().toLowerCase() === emailNorm
    );
  }
  copy.serverNow = new Date().toISOString();
  return copy;
}

function ensureLocalDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = repairDatabaseState(Seed.createInitialDatabase());
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
    const repaired = repairDatabaseState(JSON.parse(raw));
    fs.writeFileSync(DB_FILE, JSON.stringify(repaired, null, 2), 'utf8');
    return repaired;
  } catch (err) {
    console.error('Erro ao ler db.json local, recriando base inicial:', err.message);
    return repairDatabaseState(Seed.createInitialDatabase());
  }
}

let db = ensureLocalDatabase();

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
        const remoteState = rows[0].state;
        const needsRepair = !remoteState.paymentSettings || remoteState.paymentSettings.paymentConfigVersion < 3 || !remoteState.catalogDataRepairV3;
        db = repairDatabaseState({ ...db, ...remoteState });
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
        if (needsRepair) {
          await pushStateToSupabase(db);
        }
        console.log('[Supabase] Estado sincronizado e validado com sucesso a partir do PostgreSQL.');
        return;
      }
    }
    await pushStateToSupabase(db);
  } catch (err) {
    console.warn('[Supabase] Aviso ao sincronizar no boot:', err.message);
  }
}

async function pushStateToSupabase(currentDb) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;
  try {
    const publicSafeState = sanitizeDbForPublic(currentDb, { isAdmin: true });
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

    if (Array.isArray(currentDb.orders) && currentDb.orders.length > 0) {
      const ordRows = currentDb.orders.map((o) => ({
        id: String(o.id),
        order_number: String(o.orderNumber || ''),
        status: String(o.status || 'awaiting_payment'),
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

function logFinancialEvent(type, details) {
  db.financialEvents = db.financialEvents || [];
  db.financialEvents.unshift({
    id: 'fin-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString(),
    type,
    ...details
  });
  if (db.financialEvents.length > 300) {
    db.financialEvents = db.financialEvents.slice(0, 300);
  }
}

function logStockMovement(type, details) {
  db.stockMovements = db.stockMovements || [];
  db.stockMovements.unshift({
    id: 'stk-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString(),
    type,
    ...details
  });
  if (db.stockMovements.length > 300) {
    db.stockMovements = db.stockMovements.slice(0, 300);
  }
}

function addAdminNotification(title, message, orderId, orderNumber, severity = 'info') {
  db.adminNotifications = db.adminNotifications || [];
  db.adminNotifications.unshift({
    id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString(),
    title,
    message,
    orderId: orderId || null,
    orderNumber: orderNumber || null,
    severity,
    read: false
  });
  if (db.adminNotifications.length > 100) {
    db.adminNotifications = db.adminNotifications.slice(0, 100);
  }
}

async function queryProviderChargeStatus(charge) {
  if (!charge) return { status: 'UNKNOWN' };
  if (charge.status === 'APPROVED' || charge.status === 'APPROVED_LATE') {
    return { status: 'APPROVED', paidAmount: charge.paidAmount || charge.amount, paidAt: charge.paidAt };
  }
  try {
    if (fs.existsSync(SECRETS_FILE)) {
      const secrets = JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf8'));
      if (secrets.pix && secrets.pix.accessToken && charge.externalChargeId && secrets.pix.provider === 'mercado_pago') {
        const resp = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(charge.externalChargeId)}`, {
          headers: { 'Authorization': `Bearer ${secrets.pix.accessToken}` }
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.status === 'approved') {
            return {
              status: 'APPROVED',
              paidAmount: Number(data.transaction_amount) || charge.amount,
              paidAt: data.date_approved || new Date().toISOString(),
              externalId: String(data.id)
            };
          }
        }
      }
    }
  } catch (_err) {
  }
  return { status: charge.status || 'PENDING' };
}

function approvePixOrderPayment({ order, charge, paidAmount, eventId, source = 'webhook' }) {
  const nowIso = new Date().toISOString();
  const expectedTotal = Number(Number(order.total || 0).toFixed(2));
  const receivedTotal = Number(Number(paidAmount !== undefined ? paidAmount : expectedTotal).toFixed(2));

  if (Math.abs(receivedTotal - expectedTotal) > 0.009) {
    logFinancialEvent('VALUE_MISMATCH_REJECTED', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      chargeId: charge ? charge.chargeId : null,
      txid: charge ? charge.txid : null,
      expectedAmount: expectedTotal,
      receivedAmount: receivedTotal,
      source,
      message: `Pagamento Pix rejeitado: valor recebido (R$ ${receivedTotal.toFixed(2)}) diverge do total do pedido (R$ ${expectedTotal.toFixed(2)}).`
    });
    addAdminNotification(
      `Divergência de Valor Pix — Pedido ${order.orderNumber}`,
      `Notificação recebida com valor R$ ${receivedTotal.toFixed(2)}, mas o pedido é de R$ ${expectedTotal.toFixed(2)}. O pedido não foi aprovado automaticamente.`,
      order.id,
      order.orderNumber,
      'danger'
    );
    saveDatabase(db);
    return {
      ok: false,
      code: 'VALUE_MISMATCH',
      error: `Valor recebido (R$ ${receivedTotal.toFixed(2)}) diverge do valor exato do pedido (R$ ${expectedTotal.toFixed(2)}).`,
      expected: expectedTotal,
      received: receivedTotal
    };
  }

  if (order.paymentStatus === 'paid' || order.paymentStatus === 'approved' || order.paymentStatus === 'approved_late') {
    if (eventId && !db.processedWebhooks.includes(eventId)) {
      db.processedWebhooks.push(eventId);
      saveDatabase(db);
    }
    return {
      ok: true,
      idempotent: true,
      idempotentDuplicate: true,
      order,
      charge
    };
  }

  const wasExpiredOrCancelled =
    order.status === 'cancelled_expired' ||
    order.status === 'cancelled' ||
    (charge && charge.status === 'EXPIRED');

  if (wasExpiredOrCancelled) {
    let canFulfillStock = true;
    (order.items || []).forEach((it) => {
      const prod = (db.products || []).find((p) => p.id === it.productId || p.sku === it.sku);
      const avail = getVariationStock(prod, it.size, it.color);
      if (avail < (Number(it.quantity) || 1)) {
        canFulfillStock = false;
      }
    });

    if (canFulfillStock) {
      (order.items || []).forEach((it) => {
        const prod = (db.products || []).find((p) => p.id === it.productId || p.sku === it.sku);
        if (prod && Array.isArray(prod.variations)) {
          const v = prod.variations.find((vr) => vr.size === it.size && vr.color === it.color);
          const qty = Number(it.quantity) || 1;
          if (v) {
            v.stock = Math.max(0, (Number(v.stock) || 0) - qty);
          }
          prod.salesCount = (Number(prod.salesCount) || 0) + qty;
          logStockMovement('BAIXA_CONCILIACAO_TARDIA', {
            orderNumber: order.orderNumber,
            productId: prod.id,
            sku: prod.sku,
            size: it.size,
            color: it.color,
            quantity: qty
          });
        }
      });
      order.stockReserved = false;
      order.stockDeducted = true;
      order.reconciledLatePayment = true;
      order.paymentStatus = 'paid';
      order.status = 'payment_approved';
      order.statusLabel = 'Pagamento aprovado • Aguardando separação';
      order.paidAt = nowIso;
if (charge) {
        charge.status = 'paid';
        charge.paidAt = nowIso;
        charge.paidAmount = receivedTotal;
      }
      order.notificationsLog = order.notificationsLog || [];
      order.notificationsLog.push({
        date: nowIso,
        channel: 'Conciliação Automática Pix',
        message: 'Pagamento confirmado após expiração inicial. Estoque validado e pedido reaberto automaticamente para separação.'
      });
      logFinancialEvent('LATE_PAYMENT_RECONCILED_APPROVED', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        chargeId: charge ? charge.chargeId : null,
        amount: receivedTotal,
        message: `Pagamento tardio do pedido ${order.orderNumber} conciliado com sucesso (estoque disponível).`
      });
      addAdminNotification(
        `Pagamento Tardio Conciliado — Pedido ${order.orderNumber}`,
        `O pagamento Pix de R$ ${receivedTotal.toFixed(2)} chegou após a expiração, mas havia estoque disponível. Pedido aprovado e aguardando separação.`,
        order.id,
        order.orderNumber,
        'warning'
      );
    } else {
      order.reconciledLatePayment = true;
      order.paymentStatus = 'approved_late_conflict';
      order.status = 'late_payment_reconciliation';
      order.statusLabel = ORDER_STATUS_LABELS.late_payment_reconciliation;
      order.paidAt = nowIso;
      if (charge) {
        charge.status = 'LATE_PAYMENT_CONFLICT';
        charge.paidAt = nowIso;
        charge.paidAmount = receivedTotal;
      }
      order.notificationsLog = order.notificationsLog || [];
      order.notificationsLog.push({
        date: nowIso,
        channel: 'Conciliação Financeira Pix',
        message: 'Pagamento recebido após a expiração do prazo, porém um ou mais itens esgotaram. Pedido encaminhado para estorno ou troca prioritária pela proprietária.'
      });
      logFinancialEvent('LATE_PAYMENT_STOCK_CONFLICT', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        chargeId: charge ? charge.chargeId : null,
        amount: receivedTotal,
        message: `Pagamento tardio recebido para ${order.orderNumber}, mas item sem estoque. Requer estorno/atendimento manual pela proprietária.`
      });
      addAdminNotification(
        `URGENTE: Pagamento Tardio sem Estoque — Pedido ${order.orderNumber}`,
        `A cliente pagou R$ ${receivedTotal.toFixed(2)} após a expiração e a peça esgotou. Entre em contato para estorno ou substituição.`,
        order.id,
        order.orderNumber,
        'danger'
      );
    }
    if (eventId && !db.processedWebhooks.includes(eventId)) {
      db.processedWebhooks.push(eventId);
    }
    saveDatabase(db);
    return { ok: true, latePayment: true, order, charge };
  }

  if (!order.stockDeducted) {
    (order.items || []).forEach((it) => {
      const prod = (db.products || []).find((p) => p.id === it.productId || p.sku === it.sku);
      if (prod && Array.isArray(prod.variations)) {
        const v = prod.variations.find((vr) => vr.size === it.size && vr.color === it.color);
        const qty = Number(it.quantity) || 1;
        if (!order.stockReserved && v) {
          v.stock = Math.max(0, (Number(v.stock) || 0) - qty);
        }
        prod.salesCount = (Number(prod.salesCount) || 0) + qty;
        logStockMovement('BAIXA_DEFINITIVA_VENDA_PIX', {
          orderNumber: order.orderNumber,
          productId: prod.id,
          sku: prod.sku,
          size: it.size,
          color: it.color,
          quantity: qty
        });
      }
    });
    order.stockReserved = false;
    order.stockDeducted = true;
  }

  order.paymentStatus = 'paid';
  order.status = 'payment_approved';
  order.statusLabel = 'Pagamento aprovado • Aguardando separação';
  order.paidAt = nowIso;
  if (charge) {
    charge.status = 'paid';
    charge.paidAt = nowIso;
    charge.paidAmount = receivedTotal;
  }
  order.notificationsLog = order.notificationsLog || [];
  order.notificationsLog.push({
    date: nowIso,
    channel: 'Confirmação Automática Pix',
    message: 'Pagamento confirmado! Seu pedido foi recebido pela BY ANGÉLY e está aguardando separação.'
  });
  logFinancialEvent('PIX_PAYMENT_APPROVED', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    chargeId: charge ? charge.chargeId : null,
    txid: charge ? charge.txid : null,
    amount: receivedTotal,
    source,
    message: `Pagamento Pix de R$ ${receivedTotal.toFixed(2)} confirmado automaticamente para o pedido ${order.orderNumber}.`
  });
  addAdminNotification(
    `Novo Pedido Pago via Pix — ${order.orderNumber}`,
    `Cliente ${order.customer ? order.customer.name : ''} • Total pago: R$ ${receivedTotal.toFixed(2)}. Pedido pronto para iniciar separação.`,
    order.id,
    order.orderNumber,
    'success'
  );
  if (eventId && !db.processedWebhooks.includes(eventId)) {
    db.processedWebhooks.push(eventId);
  }
  saveDatabase(db);
  return { ok: true, order, charge };
}

async function processExpiredPixOrders() {
  if (!db || !Array.isArray(db.orders)) return false;
  const nowMs = Date.now();
  let changed = false;

  for (const ord of db.orders) {
    if (!ord) continue;
    const isPendingPix =
      ord.paymentMethod === 'pix' &&
      (ord.status === 'awaiting_payment' || ord.status === 'awaiting_confirmation') &&
      ord.paymentStatus !== 'approved' &&
      ord.expiresAt;

    if (!isPendingPix) continue;
    const expMs = new Date(ord.expiresAt).getTime();
    if (isNaN(expMs) || nowMs < expMs) continue;

    const charge = (db.pixCharges || []).find((c) => c.orderId === ord.id || c.orderNumber === ord.orderNumber);
    const providerCheck = await queryProviderChargeStatus(charge);
    if (providerCheck.status === 'APPROVED') {
      approvePixOrderPayment({
        order: ord,
        charge,
        paidAmount: providerCheck.paidAmount || ord.total,
        eventId: 'auto-check-' + ord.id,
        source: 'pre_expiration_verification'
      });
      changed = true;
      continue;
    }

    const nowIso = new Date().toISOString();
    ord.status = 'cancelled_expired';
    ord.paymentStatus = 'expired';
    ord.statusLabel = ORDER_STATUS_LABELS.cancelled_expired;
    ord.expiredAt = nowIso;
    if (charge) {
      charge.status = 'EXPIRED';
      charge.expiredAt = nowIso;
    }

    if (ord.stockReserved && !ord.stockDeducted) {
      (ord.items || []).forEach((it) => {
        const prod = (db.products || []).find((p) => p.id === it.productId || p.sku === it.sku);
        if (prod && Array.isArray(prod.variations)) {
          const v = prod.variations.find((vr) => vr.size === it.size && vr.color === it.color);
          const qty = Number(it.quantity) || 1;
          if (v) {
            v.stock = (Number(v.stock) || 0) + qty;
          }
          logStockMovement('LIBERACAO_RESERVA_EXPIRACAO', {
            orderNumber: ord.orderNumber,
            productId: prod.id,
            sku: prod.sku,
            size: it.size,
            color: it.color,
            quantity: qty
          });
        }
      });
      ord.stockReserved = false;
    }

    ord.notificationsLog = ord.notificationsLog || [];
    ord.notificationsLog.push({
      date: nowIso,
      channel: 'Sistema Automático Pix',
      message: 'Prazo de pagamento Pix expirado. Pedido cancelado automaticamente por falta de pagamento e reserva de estoque liberada.'
    });
    logFinancialEvent('PIX_EXPIRED_AUTO_CANCELLED', {
      orderId: ord.id,
      orderNumber: ord.orderNumber,
      chargeId: charge ? charge.chargeId : null,
      txid: charge ? charge.txid : null,
      amount: ord.total,
      message: `Pedido ${ord.orderNumber} cancelado automaticamente após expiração do prazo Pix sem pagamento.`
    });
    changed = true;
  }

  if (changed) {
    saveDatabase(db);
  }
  return changed;
}

setInterval(() => {
  processExpiredPixOrders().catch((err) => console.warn('[PixExpiryWorker]', err.message));
}, 5000);

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Role, X-Customer-Email, X-Webhook-Secret');
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

function getAuthenticatedCustomerFromReq(req, bodyCustomer) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const custId = (bodyCustomer && (bodyCustomer.customerId || bodyCustomer.id)) || '';
  const emailHeader = req.headers['x-customer-email'] || (bodyCustomer && bodyCustomer.email) || '';

  if (token) {
    const byToken = (db.customers || []).find((c) => c && c.sessionToken === token);
    if (byToken) return byToken;
  }
  if (custId) {
    const byId = (db.customers || []).find((c) => c && c.id === custId);
    if (byId) return byId;
  }
  if (emailHeader) {
    const emailNorm = String(emailHeader).trim().toLowerCase();
    const byEmail = (db.customers || []).find((c) => c && String(c.email || '').trim().toLowerCase() === emailNorm);
    if (byEmail) return byEmail;
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  setCorsAndSecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname || '/';

  if ((pathname === '/api/health' || pathname === '/health') && req.method === 'GET') {
    await processExpiredPixOrders();
    return sendJson(res, 200, {
      ok: true,
      service: 'by-angely-ecommerce-api',
      store: db.storeSettings.brandName,
      city: db.storeSettings.city,
      supabaseConnected: Boolean(SUPABASE_URL && SUPABASE_KEY),
      productsCount: (db.products || []).length,
      ordersCount: (db.orders || []).length,
      pixChargesCount: (db.pixCharges || []).length,
      serverNow: new Date().toISOString(),
      updatedAt: db.updatedAt
    });
  }

  if (pathname === '/api/state' && req.method === 'GET') {
    await processExpiredPixOrders();
    const isAdmin = Boolean(req.headers['x-admin-role']);
    const customerEmail = req.headers['x-customer-email'] || parsedUrl.query.customerEmail || '';
    return sendJson(res, 200, sanitizeDbForPublic(db, { isAdmin: true, customerEmail }));
  }

  if (pathname === '/api/state' && req.method === 'POST') {
    try {
      const incoming = await parseBody(req);
      if (incoming && typeof incoming === 'object' && incoming.storeSettings) {
        const existingCustomersMap = new Map((db.customers || []).map((c) => [String(c.email || '').toLowerCase(), c]));
        const mergedCustomers = Array.isArray(incoming.customers)
          ? incoming.customers.map((c) => {
              const prev = existingCustomersMap.get(String(c.email || '').toLowerCase());
              return {
                ...(prev || {}),
                ...c,
                passwordHash: c.passwordHash || (prev && prev.passwordHash) || (c.password ? hashPassword(c.password) : undefined),
                sessionToken: c.sessionToken || (prev && prev.sessionToken) || generateToken('cust')
              };
            })
          : db.customers;

        const isAdminReq = Boolean(req.headers['x-admin-role']);
        let mergedOrders = db.orders || [];
        if (Array.isArray(incoming.orders)) {
          if (isAdminReq) {
            mergedOrders = incoming.orders;
          } else {
            const serverOrdersById = new Map((db.orders || []).map((o) => [o.id, o]));
            mergedOrders = incoming.orders.map((incOrd) => {
              const srvOrd = serverOrdersById.get(incOrd.id);
              if (srvOrd) {
                return {
                  ...incOrd,
                  status: srvOrd.status,
                  statusLabel: srvOrd.statusLabel,
                  paymentStatus: srvOrd.paymentStatus,
                  total: srvOrd.total,
                  expiresAt: srvOrd.expiresAt,
                  paidAt: srvOrd.paidAt
                };
              }
              return incOrd;
            });
          }
        }

        db = {
          ...db,
          ...incoming,
          customers: mergedCustomers,
          orders: mergedOrders,
          pixCharges: Array.isArray(incoming.pixCharges) && isAdminReq ? incoming.pixCharges : (db.pixCharges || []),
          processedWebhooks: db.processedWebhooks || [],
          financialEvents: db.financialEvents || [],
          stockMovements: db.stockMovements || [],
          adminNotifications: Array.isArray(incoming.adminNotifications) && isAdminReq ? incoming.adminNotifications : (db.adminNotifications || []),
          updatedAt: new Date().toISOString()
        };
        saveDatabase(db);
        return sendJson(res, 200, { ok: true, updatedAt: db.updatedAt, serverNow: new Date().toISOString() });
      }
      return sendJson(res, 400, { ok: false, error: 'Estrutura de estado inválida.' });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  if (pathname === '/api/auth/register' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const phone = String(body.phone || '').trim();
      const cpf = String(body.cpf || '').trim();
      const password = String(body.password || '');

      if (!name || !email || !email.includes('@') || !phone || password.length < 6) {
        return sendJson(res, 400, {
          ok: false,
          error: 'Preencha nome completo, e-mail válido, telefone/WhatsApp e senha com no mínimo 6 caracteres.'
        });
      }

      const existing = (db.customers || []).find((c) => String(c.email || '').trim().toLowerCase() === email);
      if (existing) {
        return sendJson(res, 409, {
          ok: false,
          error: 'Já existe um cadastro com este e-mail. Faça login na sua conta.'
        });
      }

      const addrSrc = body.address && typeof body.address === 'object' ? body.address : body;
      const cityVal = String(addrSrc.city || 'Itaperuna').trim();
      const stateVal = String(addrSrc.state || 'RJ').trim().toUpperCase();
      const addressObj = {
        id: 'addr-' + Date.now(),
        label: addrSrc.label || body.addressLabel || 'Endereço Principal',
        zipCode: String(addrSrc.zipCode || '').trim(),
        street: String(addrSrc.street || '').trim(),
        number: String(addrSrc.number || '').trim(),
        complement: String(addrSrc.complement || '').trim(),
        neighborhood: String(addrSrc.neighborhood || '').trim(),
        city: cityVal,
        state: stateVal,
        cityState: `${cityVal} - ${stateVal}`,
        reference: String(addrSrc.reference || '').trim(),
        isDefault: true
      };

      const newCust = {
        id: 'cust-' + Date.now(),
        name,
        email,
        phone,
        cpf,
        passwordHash: hashPassword(password),
        sessionToken: generateToken('cust'),
        marketingOptIn: Boolean(body.marketingOptIn),
        addresses: addressObj.street ? [addressObj] : [],
        savedCart: Array.isArray(body.cart) ? body.cart : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.customers = db.customers || [];
      db.customers.unshift(newCust);
      saveDatabase(db);

      return sendJson(res, 201, {
        ok: true,
        customer: sanitizeCustomerForClient(newCust),
        token: newCust.sessionToken,
        sessionToken: newCust.sessionToken
      });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const cust = (db.customers || []).find((c) => String(c.email || '').trim().toLowerCase() === email);
      if (!cust) {
        return sendJson(res, 401, { ok: false, error: 'E-mail ou senha inválidos.' });
      }
      const passHash = hashPassword(password);
      const validPass =
        (cust.passwordHash && cust.passwordHash === passHash) ||
        (cust.password && cust.password === password);
      if (!validPass) {
        return sendJson(res, 401, { ok: false, error: 'E-mail ou senha inválidos.' });
      }
      cust.passwordHash = passHash;
      delete cust.password;
      cust.sessionToken = cust.sessionToken || generateToken('cust');
      cust.lastLoginAt = new Date().toISOString();
      saveDatabase(db);
      return sendJson(res, 200, {
        ok: true,
        customer: sanitizeCustomerForClient(cust),
        token: cust.sessionToken,
        sessionToken: cust.sessionToken
      });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  if (pathname === '/api/auth/recover' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const newPassword = String(body.newPassword || '');
      if (!email || newPassword.length < 6) {
        return sendJson(res, 400, { ok: false, error: 'Informe um e-mail válido e nova senha com no mínimo 6 caracteres.' });
      }
      const cust = (db.customers || []).find((c) => String(c.email || '').trim().toLowerCase() === email);
      if (!cust) {
        return sendJson(res, 404, { ok: false, error: 'E-mail não localizado.' });
      }
      cust.passwordHash = hashPassword(newPassword);
      delete cust.password;
      cust.updatedAt = new Date().toISOString();
      saveDatabase(db);
      return sendJson(res, 200, { ok: true });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  if (pathname === '/api/customer/profile' && (req.method === 'PUT' || req.method === 'POST')) {
    try {
      const body = await parseBody(req);
      const cust = getAuthenticatedCustomerFromReq(req, body);
      if (!cust) {
        return sendJson(res, 401, { ok: false, error: 'Sessão não autenticada.' });
      }
      if (body.name) cust.name = String(body.name).trim();
      if (body.phone !== undefined) cust.phone = String(body.phone).trim();
      if (body.cpf !== undefined) cust.cpf = String(body.cpf).trim();
      if (typeof body.marketingOptIn === 'boolean') cust.marketingOptIn = body.marketingOptIn;
      if (Array.isArray(body.addresses)) {
        cust.addresses = body.addresses;
      }
      if (Array.isArray(body.savedCart)) {
        cust.savedCart = body.savedCart;
      }
      cust.updatedAt = new Date().toISOString();
      saveDatabase(db);
      return sendJson(res, 200, {
        ok: true,
        customer: sanitizeCustomerForClient(cust)
      });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  if (pathname === '/api/customer/orders' && req.method === 'GET') {
    await processExpiredPixOrders();
    const cust = getAuthenticatedCustomerFromReq(req, { email: parsedUrl.query.email });
    if (!cust) {
      return sendJson(res, 401, {
        ok: false,
        error: 'Para consultar seus pedidos, entre na sua conta.'
      });
    }
    const emailNorm = String(cust.email || '').trim().toLowerCase();
    const myOrders = (db.orders || []).filter(
      (o) =>
        o &&
        (o.customerId === cust.id ||
          (o.customer && String(o.customer.email || '').trim().toLowerCase() === emailNorm))
    );
    return sendJson(res, 200, {
      ok: true,
      serverNow: new Date().toISOString(),
      orders: myOrders
    });
  }

  if (pathname === '/api/orders' && req.method === 'POST') {
    try {
      await processExpiredPixOrders();
      const body = await parseBody(req);
      const cust = getAuthenticatedCustomerFromReq(req, body.customer);
      if (!cust) {
        return sendJson(res, 401, {
          ok: false,
          code: 'AUTH_REQUIRED',
          error: 'Para realizar sua compra, entre na sua conta ou crie seu cadastro. Assim, seus dados ficam salvos para facilitar suas próximas compras.'
        });
      }

      const rawItems = Array.isArray(body.items) ? body.items : [];
      if (rawItems.length === 0) {
        return sendJson(res, 400, { ok: false, error: 'A sacola está vazia.' });
      }

      const validatedItems = [];
      let subtotal = 0;

      for (const reqItem of rawItems) {
        const prod = (db.products || []).find((p) => p.id === reqItem.productId && p.status === 'published');
        if (!prod) {
          return sendJson(res, 400, { ok: false, error: `O produto "${reqItem.name || reqItem.productId}" não está mais disponível.` });
        }

        const cleanSize = isValidClothingSize(reqItem.size)
          ? String(reqItem.size).trim()
          : (Array.isArray(prod.sizes) ? (prod.sizes.find(isValidClothingSize) || 'M') : 'M');

        const cleanColor = isValidColorName(reqItem.color)
          ? String(reqItem.color).trim()
          : (Array.isArray(prod.colors) && prod.colors[0] ? prod.colors[0].name : 'Padrão');

        const qty = Math.max(1, Math.floor(Number(reqItem.quantity) || 1));
        const avail = getVariationStock(prod, cleanSize, cleanColor);
        if (avail < qty) {
          return sendJson(res, 409, {
            ok: false,
            code: 'OUT_OF_STOCK',
            error: `Estoque insuficiente para "${prod.name}" (${cleanSize} / ${cleanColor}). Disponível: ${avail} un.`
          });
        }

        const realUnitPrice = getEffectivePrice(prod);
        const firstImg = (prod.media && prod.media.find((m) => m.type === 'image' && m.url)) || { url: reqItem.imageUrl || '' };
        validatedItems.push({
          key: `${prod.id}__${cleanSize}__${cleanColor}`,
          productId: prod.id,
          sku: prod.sku,
          name: prod.name,
          size: cleanSize,
          color: cleanColor,
          unitPrice: realUnitPrice,
          quantity: qty,
          imageUrl: firstImg.url
        });
        subtotal += realUnitPrice * qty;
      }

      let discount = 0;
      let appliedCouponCode = null;
      if (body.couponCode) {
        const codeUpper = String(body.couponCode).trim().toUpperCase();
        const foundCoupon = (db.coupons || []).find((c) => c.code.toUpperCase() === codeUpper && c.active);
        if (foundCoupon && subtotal >= (Number(foundCoupon.minOrderAmount) || 0)) {
          if (foundCoupon.type === 'percent') {
            discount = subtotal * (Number(foundCoupon.value) / 100);
          } else {
            discount = Number(foundCoupon.value) || 0;
          }
          discount = Math.min(discount, subtotal);
          appliedCouponCode = foundCoupon.code;
          foundCoupon.usedCount = (Number(foundCoupon.usedCount) || 0) + 1;
        }
      }

      const activeShipMethods = (db.shippingSettings && db.shippingSettings.methods || []).filter((m) => m.enabled);
      const selectedShip = activeShipMethods.find((m) => m.id === body.shippingMethodId) || activeShipMethods[0] || null;
      const shippingCost = selectedShip && selectedShip.priceStatus === 'confirmed' ? (Number(selectedShip.price) || 0) : 0;
      const total = Number(Math.max(0.01, subtotal - discount + shippingCost).toFixed(2));

      const chosenMethod = body.paymentMethod || 'pix';
      if (!db.paymentSettings || !db.paymentSettings[chosenMethod] || !db.paymentSettings[chosenMethod].enabled) {
        return sendJson(res, 400, { ok: false, error: 'A forma de pagamento selecionada não está ativa no momento.' });
      }

      const shippingAddress = {
        zipCode: String((body.address && body.address.zipCode) || '28300-000').trim(),
        street: String((body.address && body.address.street) || '').trim(),
        number: String((body.address && body.address.number) || '').trim(),
        complement: String((body.address && body.address.complement) || '').trim(),
        neighborhood: String((body.address && body.address.neighborhood) || '').trim(),
        city: String((body.address && body.address.city) || 'Itaperuna').trim(),
        state: String((body.address && body.address.state) || 'RJ').trim().toUpperCase(),
        cityState: String((body.address && body.address.cityState) || `${(body.address && body.address.city) || 'Itaperuna'} - ${(body.address && body.address.state) || 'RJ'}`).trim(),
        reference: String((body.address && body.address.reference) || '').trim()
      };

      if (body.customer) {
        if (body.customer.name) cust.name = String(body.customer.name).trim();
        if (body.customer.phone) cust.phone = String(body.customer.phone).trim();
        if (body.customer.cpf) cust.cpf = String(body.customer.cpf).trim();
      }

      if (shippingAddress.street) {
        cust.addresses = Array.isArray(cust.addresses) ? cust.addresses : [];
        const addrExists = cust.addresses.some(
          (a) => a.street === shippingAddress.street && a.number === shippingAddress.number && a.zipCode === shippingAddress.zipCode
        );
        if (!addrExists) {
          cust.addresses.unshift({
            id: 'addr-' + Date.now(),
            label: 'Endereço de Entrega',
            ...shippingAddress,
            isDefault: cust.addresses.length === 0
          });
        }
      }

      cust.savedCart = [];

      const nextIndex = 1001 + (db.orders ? db.orders.length : 0);
      const orderNumber = 'ANG-' + String(nextIndex);
      const now = new Date();
      const nowIso = now.toISOString();

      const isPixOrder = chosenMethod === 'pix';
      const isWhatsappOrder = chosenMethod === 'whatsapp';

      if (isPixOrder) {
        validatedItems.forEach((it) => {
          const prod = db.products.find((p) => p.id === it.productId);
          if (prod && Array.isArray(prod.variations)) {
            const v = prod.variations.find((vr) => vr.size === it.size && vr.color === it.color);
            if (v) {
              v.stock = Math.max(0, (Number(v.stock) || 0) - it.quantity);
            }
            logStockMovement('RESERVA_TEMPORARIA_PIX', {
              orderNumber,
              productId: prod.id,
              sku: prod.sku,
              size: it.size,
              color: it.color,
              quantity: it.quantity
            });
          }
        });
      }

      const expirationMinutes = Math.max(1, Number((db.paymentSettings.pix && db.paymentSettings.pix.expirationMinutes) || 15));
      const expiresAtIso = isPixOrder
        ? new Date(now.getTime() + expirationMinutes * 60 * 1000).toISOString()
        : null;

      let pixData = null;
      let newCharge = null;

      if (isPixOrder) {
        const pixCfg = db.paymentSettings.pix || {};
        const keyToUse = (pixCfg.pixKey && !String(pixCfg.pixKey).toLowerCase().includes('a confirmar'))
          ? pixCfg.pixKey
          : '+5528999871458';
        const nameToUse = (pixCfg.recipientName && !String(pixCfg.recipientName).toLowerCase().includes('a confirmar'))
          ? pixCfg.recipientName
          : 'BY ANGELY';
        const randSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
        const txid = (`${pixCfg.txidPrefix || 'BYA'}${nextIndex}${randSuffix}`).replace(/[^A-Z0-9]/gi, '').slice(0, 25);
        const chargeId = 'chg_' + crypto.randomBytes(10).toString('hex');
        const payload = Pix.generatePixPayload({
          pixKey: keyToUse,
          keyType: pixCfg.keyType || 'telefone',
          merchantName: nameToUse,
          merchantCity: pixCfg.recipientCity || 'ITAPERUNA',
          amount: total,
          txid,
          description: 'PEDIDO ' + orderNumber
        });
        const qrSvg = Pix.renderQrSvg(payload);

        pixData = {
          chargeId,
          payload,
          qrSvg,
          txid,
          amount: total,
          recipientName: nameToUse,
          pixKey: keyToUse,
          recipientCity: pixCfg.recipientCity || 'ITAPERUNA',
          createdAt: nowIso,
          expiresAt: expiresAtIso,
          expirationMinutes
        };

        newCharge = {
          chargeId,
          txid,
          orderId: 'ord-' + now.getTime(),
          orderNumber,
          customerId: cust.id,
          customerEmail: cust.email,
          customerName: cust.name,
          amount: total,
          status: 'PENDING',
          provider: pixCfg.pspProviderName || 'Pix EMV + Webhook Automático',
          payload,
          createdAt: nowIso,
          expiresAt: expiresAtIso,
          paidAt: null
        };
      }

      const methodLabels = {
        pix: 'Pix pelo Site (Confirmação Automática)',
        whatsapp: 'Atendimento e Finalização pelo WhatsApp',
        creditCard: 'Cartão de Crédito pelo Site',
        debitCard: 'Cartão de Débito pelo Site',
        payOnPickup: 'Pagamento na Retirada (Itaperuna - RJ)'
      };

      const orderId = newCharge ? newCharge.orderId : 'ord-' + now.getTime();
      const newOrder = {
        id: orderId,
        orderNumber,
        customerId: cust.id,
        createdAt: nowIso,
        expiresAt: expiresAtIso,
        paidAt: null,
        status: isWhatsappOrder ? 'awaiting_whatsapp' : 'awaiting_payment',
        statusLabel: isWhatsappOrder ? ORDER_STATUS_LABELS.awaiting_whatsapp : ORDER_STATUS_LABELS.awaiting_payment,
        paymentStatus: 'pending',
        paymentMethod: chosenMethod,
        paymentMethodLabel: methodLabels[chosenMethod] || chosenMethod,
        stockReserved: isPixOrder,
        stockDeducted: false,
        customer: {
          id: cust.id,
          name: cust.name,
          email: cust.email,
          phone: cust.phone,
          cpf: cust.cpf || 'Não informado',
          marketingOptIn: Boolean(cust.marketingOptIn)
        },
        shipping: {
          methodId: selectedShip ? selectedShip.id : '',
          methodName: selectedShip ? selectedShip.name : 'A confirmar',
          cost: shippingCost,
          priceStatus: selectedShip ? selectedShip.priceStatus : 'to_confirm',
          address: shippingAddress,
          trackingCode: ''
        },
        items: validatedItems,
        subtotal: Number(subtotal.toFixed(2)),
        discount: Number(discount.toFixed(2)),
        couponCode: appliedCouponCode,
        total,
        pixData,
        customerNotes: String(body.customerNotes || '').trim(),
        notificationsLog: [
          {
            date: nowIso,
            channel: isPixOrder ? 'Cobrança Pix Gerada' : 'Pedido Registrado',
            message: isPixOrder
              ? `Pedido ${orderNumber} criado com status "Aguardando pagamento". Prazo de expiração: ${expirationMinutes} minutos.`
              : `Pedido ${orderNumber} registrado com status "${ORDER_STATUS_LABELS.awaiting_whatsapp}".`
          }
        ]
      };

      if (newCharge) {
        db.pixCharges.unshift(newCharge);
        logFinancialEvent('PIX_CHARGE_CREATED', {
          orderId: newOrder.id,
          orderNumber: newOrder.orderNumber,
          chargeId: newCharge.chargeId,
          txid: newCharge.txid,
          amount: total,
          expiresAt: expiresAtIso,
          message: `Cobrança Pix ${newCharge.txid} gerada para o pedido ${newOrder.orderNumber} (R$ ${total.toFixed(2)}).`
        });
      }

      db.orders.unshift(newOrder);
      saveDatabase(db);

      return sendJson(res, 201, {
        ok: true,
        serverNow: new Date().toISOString(),
        order: newOrder,
        charge: newCharge,
        customer: sanitizeCustomerForClient(cust)
      });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  const paymentStatusMatch = pathname.match(/^\/api\/orders\/([^\/]+)\/payment-status$/);
  if (paymentStatusMatch && req.method === 'GET') {
    await processExpiredPixOrders();
    const orderIdOrNumber = decodeURIComponent(paymentStatusMatch[1]);
    const ord = (db.orders || []).find((o) => o.id === orderIdOrNumber || o.orderNumber === orderIdOrNumber);
    if (!ord) {
      return sendJson(res, 404, { ok: false, error: 'Pedido não encontrado.' });
    }

    const charge = (db.pixCharges || []).find((c) => c.orderId === ord.id || c.orderNumber === ord.orderNumber);
    const nowMs = Date.now();
    const expMs = ord.expiresAt ? new Date(ord.expiresAt).getTime() : nowMs;
    const remainingSeconds = ord.status === 'awaiting_payment'
      ? Math.max(0, Math.floor((expMs - nowMs) / 1000))
      : 0;

    return sendJson(res, 200, {
      ok: true,
      serverNow: new Date().toISOString(),
      orderId: ord.id,
      orderNumber: ord.orderNumber,
      status: ord.status,
      statusLabel: ord.statusLabel,
      paymentStatus: ord.paymentStatus,
      chargeId: charge ? charge.chargeId : null,
      txid: charge ? charge.txid : null,
      chargeStatus: charge ? charge.status : null,
      amount: ord.total,
      createdAt: ord.createdAt,
      expiresAt: ord.expiresAt,
      paidAt: ord.paidAt || null,
      remainingSeconds,
      order: ord
    });
  }

  if (pathname === '/api/webhooks/pix' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const headerSecret = req.headers['x-webhook-secret'] || body.webhookSecret || '';
      if (headerSecret !== PIX_WEBHOOK_SECRET) {
        logFinancialEvent('WEBHOOK_AUTH_FAILED', {
          ip: req.socket.remoteAddress,
          message: 'Tentativa de notificação no webhook Pix com assinatura/segredo inválido.'
        });
        saveDatabase(db);
        return sendJson(res, 401, { ok: false, error: 'Assinatura de webhook inválida.' });
      }

      const pixItem = Array.isArray(body.pix) && body.pix[0] ? body.pix[0] : body;
      const eventId = String(pixItem.endToEndId || pixItem.eventId || body.eventId || '').trim();
      const txid = String(pixItem.txid || body.txid || '').trim();
      const chargeId = String(pixItem.chargeId || body.chargeId || '').trim();
      const orderId = String(pixItem.orderId || body.orderId || '').trim();
      const paidAmount = pixItem.valor !== undefined ? Number(pixItem.valor) : (pixItem.amount !== undefined ? Number(pixItem.amount) : undefined);

      if (eventId && (db.processedWebhooks || []).includes(eventId)) {
        return sendJson(res, 200, {
          ok: true,
          idempotent: true,
          idempotentDuplicate: true,
          message: 'Notificação Pix já processada anteriormente (idempotente).'
        });
      }

      const charge = (db.pixCharges || []).find(
        (c) =>
          (chargeId && c.chargeId === chargeId) ||
          (txid && c.txid === txid) ||
          (orderId && (c.orderId === orderId || c.orderNumber === orderId))
      );

      const order = (db.orders || []).find(
        (o) =>
          (charge && (o.id === charge.orderId || o.orderNumber === charge.orderNumber)) ||
          (orderId && (o.id === orderId || o.orderNumber === orderId)) ||
          (txid && o.pixData && o.pixData.txid === txid)
      );

      if (!order) {
        logFinancialEvent('WEBHOOK_ORDER_NOT_FOUND', {
          eventId,
          txid,
          chargeId,
          orderId,
          paidAmount,
          message: 'Notificação Pix recebida para cobrança/pedido não localizado.'
        });
        saveDatabase(db);
        return sendJson(res, 404, { ok: false, error: 'Cobrança ou pedido não localizado para o TXID informado.' });
      }

      const result = approvePixOrderPayment({
        order,
        charge,
        paidAmount,
        eventId: eventId || `evt_${txid || order.id}_${Date.now()}`,
        source: 'pix_webhook'
      });

      if (!result.ok) {
        return sendJson(res, 400, result);
      }

      return sendJson(res, 200, {
        ok: true,
        idempotent: Boolean(result.idempotent),
        idempotentDuplicate: Boolean(result.idempotent || result.idempotentDuplicate),
        latePayment: Boolean(result.latePayment),
        reconciledLatePayment: Boolean(result.latePayment),
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        statusLabel: order.statusLabel,
        paymentStatus: order.paymentStatus,
        paidAt: order.paidAt
      });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  if (pathname === '/api/pix/sandbox-simulate-payment' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const orderId = String(body.orderId || body.orderNumber || '').trim();
      const txid = String(body.txid || '').trim();
      const charge = (db.pixCharges || []).find(
        (c) => (txid && c.txid === txid) || (orderId && (c.orderId === orderId || c.orderNumber === orderId))
      );
      const order = (db.orders || []).find(
        (o) =>
          (charge && (o.id === charge.orderId || o.orderNumber === charge.orderNumber)) ||
          (orderId && (o.id === orderId || o.orderNumber === orderId))
      );

      if (!order) {
        return sendJson(res, 404, { ok: false, error: 'Pedido não encontrado para simulação Sandbox.' });
      }

      if (body.forceExpireFirst) {
        order.expiresAt = new Date(Date.now() - 5000).toISOString();
        if (charge) charge.expiresAt = order.expiresAt;
        await processExpiredPixOrders();
        if (body.onlyExpire) {
          return sendJson(res, 200, {
            ok: true,
            expired: true,
            order
          });
        }
      }

      const simAmount = body.amount !== undefined ? Number(body.amount) : order.total;
      const simEventId = body.eventId || `sandbox_e2e_${order.orderNumber}_${Date.now()}`;
      const result = approvePixOrderPayment({
        order,
        charge,
        paidAmount: simAmount,
        eventId: simEventId,
        source: 'sandbox_provider_webhook'
      });

      if (!result.ok) {
        return sendJson(res, 422, result);
      }

      return sendJson(res, 200, {
        ok: true,
        idempotent: Boolean(result.idempotent),
        latePayment: Boolean(result.latePayment),
        order: result.order,
        charge: result.charge
      });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  const adminOrderStatusMatch = pathname.match(/^\/api\/admin\/orders\/([^\/]+)\/status$/);
  if (adminOrderStatusMatch && req.method === 'POST') {
    try {
      const orderId = decodeURIComponent(adminOrderStatusMatch[1]);
      const body = await parseBody(req);
      const ord = (db.orders || []).find((o) => o.id === orderId || o.orderNumber === orderId);
      if (!ord) {
        return sendJson(res, 404, { ok: false, error: 'Pedido não localizado.' });
      }

      const newStatus = String(body.status || ord.status).trim();
      const newLabel = body.statusLabel || ORDER_STATUS_LABELS[newStatus] || newStatus;
      const trackingCode = body.trackingCode !== undefined ? String(body.trackingCode).trim() : (ord.shipping && ord.shipping.trackingCode) || '';
      const prevStatus = ord.status;

      ord.status = newStatus;
      ord.statusLabel = newLabel;
      if (ord.shipping) {
        ord.shipping.trackingCode = trackingCode;
      }

      const confirmedStates = ['paid', 'awaiting_separation', 'in_separation', 'preparing', 'ready_for_shipping', 'ready_pickup', 'shipped', 'out_for_delivery', 'delivered'];
      if (!ord.stockDeducted && confirmedStates.includes(newStatus)) {
        (ord.items || []).forEach((it) => {
          const prod = (db.products || []).find((p) => p.id === it.productId || p.sku === it.sku);
          if (prod && Array.isArray(prod.variations)) {
            const v = prod.variations.find((vr) => vr.size === it.size && vr.color === it.color);
            const qty = Number(it.quantity) || 1;
            if (!ord.stockReserved && v) {
              v.stock = Math.max(0, (Number(v.stock) || 0) - qty);
            }
            prod.salesCount = (Number(prod.salesCount) || 0) + qty;
          }
        });
        ord.stockReserved = false;
        ord.stockDeducted = true;
        ord.paymentStatus = 'approved';
      } else if ((ord.stockDeducted || ord.stockReserved) && (newStatus === 'cancelled' || newStatus === 'cancelled_expired')) {
        (ord.items || []).forEach((it) => {
          const prod = (db.products || []).find((p) => p.id === it.productId || p.sku === it.sku);
          if (prod && Array.isArray(prod.variations)) {
            const v = prod.variations.find((vr) => vr.size === it.size && vr.color === it.color);
            const qty = Number(it.quantity) || 1;
            if (v) {
              v.stock = (Number(v.stock) || 0) + qty;
            }
            if (ord.stockDeducted) {
              prod.salesCount = Math.max(0, (Number(prod.salesCount) || 0) - qty);
            }
          }
        });
        ord.stockReserved = false;
        ord.stockDeducted = false;
      }

      let customerStepMsg = `Status do pedido atualizado para "${newLabel}".`;
      if (newStatus === 'in_separation' || newStatus === 'preparing') {
        customerStepMsg = 'Seu pedido está em separação.';
      } else if (newStatus === 'ready_for_shipping' || newStatus === 'ready_pickup') {
        customerStepMsg = 'Seu pedido está pronto para envio ou retirada.';
      } else if (newStatus === 'shipped') {
        customerStepMsg = `Seu pedido foi enviado!${trackingCode ? ' Código de rastreio: ' + trackingCode : ''}`;
      } else if (newStatus === 'out_for_delivery') {
        customerStepMsg = 'Seu pedido saiu para entrega!';
      } else if (newStatus === 'delivered') {
        customerStepMsg = 'Pedido entregue! Agradecemos por escolher a BY ANGÉLY.';
      }

      ord.notificationsLog = ord.notificationsLog || [];
      ord.notificationsLog.push({
        date: new Date().toISOString(),
        channel: 'BY ANGÉLY',
        message: customerStepMsg,
        previousStatus: prevStatus
      });

      saveDatabase(db);
      return sendJson(res, 200, { ok: true, order: ord });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  if (pathname === '/api/admin/payment-credentials' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      let existingSecrets = {};
      if (fs.existsSync(SECRETS_FILE)) {
        try {
          existingSecrets = JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf8'));
        } catch (_e) {
          existingSecrets = {};
        }
      }

      if (body.pixAccessToken) {
        existingSecrets.pix = {
          provider: String(body.pixProvider || 'mercado_pago'),
          environment: String(body.pixEnvironment || 'sandbox'),
          accessToken: String(body.pixAccessToken).trim(),
          secretTokenConfigured: true,
          updatedAt: new Date().toISOString()
        };
        if (db.paymentSettings && db.paymentSettings.pix) {
          db.paymentSettings.pix.hasBackendSecretConfigured = true;
          db.paymentSettings.pix.pspWebhookConfigured = true;
        }
      }

      if (body.creditCardSecretToken) {
        existingSecrets.creditCard = {
          provider: String(body.creditCardProvider || ''),
          environment: String(body.creditCardEnvironment || 'sandbox'),
          secretTokenConfigured: true,
          secretTokenHash: hashPassword(body.creditCardSecretToken),
          updatedAt: new Date().toISOString()
        };
        if (db.paymentSettings && db.paymentSettings.creditCard) {
          db.paymentSettings.creditCard.hasBackendSecretConfigured = true;
        }
      }

      if (body.debitCardSecretToken) {
        existingSecrets.debitCard = {
          provider: String(body.debitCardProvider || ''),
          environment: String(body.debitCardEnvironment || 'sandbox'),
          secretTokenConfigured: true,
          secretTokenHash: hashPassword(body.debitCardSecretToken),
          updatedAt: new Date().toISOString()
        };
        if (db.paymentSettings && db.paymentSettings.debitCard) {
          db.paymentSettings.debitCard.hasBackendSecretConfigured = true;
        }
      }

      fs.writeFileSync(SECRETS_FILE, JSON.stringify(existingSecrets, null, 2), 'utf8');
      saveDatabase(db);
      return sendJson(res, 200, { ok: true, savedOnBackend: true });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

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

  let safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
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
