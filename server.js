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

                // Protege status de pedidos contra aprovação falsa vinda de cliente comum
        // e impede que um salvamento administrativo com estado antigo em memória sobrescreva um pagamento Pix já confirmado pelo servidor
        const isAdminReq = Boolean(req.headers['x-admin-role'] || req.headers['x-admin-token']);
        let mergedOrders = db.orders || [];
        if (Array.isArray(incoming.orders)) {
          const serverOrdersById = new Map((db.orders || []).map((o) => [o.id, o]));
          const incomingIds = new Set();

          const mappedIncoming = incoming.orders.map((incOrd) => {
            if (!incOrd || !incOrd.id) return incOrd;
            incomingIds.add(incOrd.id);
            const srvOrd = serverOrdersById.get(incOrd.id);
            if (!srvOrd) return incOrd;

            const srvPaid = ['paid', 'approved', 'approved_late', 'approved_late_conflict', 'refunded'].includes(
              String(srvOrd.paymentStatus || srvOrd.payment_status || '').toLowerCase()
            );
            const incPaid = ['paid', 'approved', 'approved_late', 'approved_late_conflict', 'refunded'].includes(
              String(incOrd.paymentStatus || incOrd.payment_status || '').toLowerCase()
            );

            if (!isAdminReq) {
              return {
                ...incOrd,
                status: srvOrd.status,
                statusLabel: srvOrd.statusLabel,
                paymentStatus: srvOrd.paymentStatus,
                payment_status: srvOrd.payment_status || srvOrd.paymentStatus,
                total: srvOrd.total,
                expiresAt: srvOrd.expiresAt,
                paidAt: srvOrd.paidAt,
                pixData: srvOrd.pixData || incOrd.pixData,
                notificationsLog: srvOrd.notificationsLog || incOrd.notificationsLog,
                cancellationRequest: srvOrd.cancellationRequest || incOrd.cancellationRequest
              };
            }

            // Se for requisição Admin, mas o pedido já foi pago/confirmado no servidor via Webhook Pix e o navegador Admin ainda estava com 'pending', preserva a aprovação!
            if (srvPaid && !incPaid) {
              const preserveApprovedStatus =
                incOrd.status === 'awaiting_payment' || incOrd.status === 'awaiting_confirmation'
                  ? srvOrd.status
                  : incOrd.status;
              const preserveApprovedLabel =
                incOrd.status === 'awaiting_payment' || incOrd.status === 'awaiting_confirmation'
                  ? srvOrd.statusLabel
                  : incOrd.statusLabel;
              return {
                ...incOrd,
                status: preserveApprovedStatus,
                statusLabel: preserveApprovedLabel,
                paymentStatus: srvOrd.paymentStatus,
                payment_status: srvOrd.payment_status || srvOrd.paymentStatus,
                paidAt: srvOrd.paidAt,
                stockReserved: srvOrd.stockReserved,
                stockDeducted: srvOrd.stockDeducted,
                pixData: srvOrd.pixData || incOrd.pixData,
                notificationsLog: Array.isArray(srvOrd.notificationsLog) && srvOrd.notificationsLog.length >= (incOrd.notificationsLog || []).length
                  ? srvOrd.notificationsLog
                  : incOrd.notificationsLog,
                cancellationRequest: srvOrd.cancellationRequest || incOrd.cancellationRequest
              };
            }

            return {
              ...incOrd,
              payment_status: incOrd.paymentStatus || incOrd.payment_status || srvOrd.paymentStatus,
              pixData: srvOrd.pixData || incOrd.pixData
            };
          });

          // Preserva pedidos recém-criados no servidor que ainda não estavam na memória do navegador
          const missingServerOrders = (db.orders || []).filter((srvOrd) => srvOrd && srvOrd.id && !incomingIds.has(srvOrd.id));
          mergedOrders = [...missingServerOrders, ...mappedIncoming];
        }

        // Mescla cobranças Pix preservando confirmações do servidor
        const serverChargesById = new Map((db.pixCharges || []).map((c) => [c.chargeId || c.txid, c]));
        let mergedPixCharges = db.pixCharges || [];
        if (Array.isArray(incoming.pixCharges) && isAdminReq) {
          const seenChargeKeys = new Set();
          const combinedCharges = [];
          [...(db.pixCharges || []), ...incoming.pixCharges].forEach((c) => {
            if (!c) return;
            const key = c.chargeId || c.txid;
            if (!key || seenChargeKeys.has(key)) return;
            seenChargeKeys.add(key);
            const srvCharge = serverChargesById.get(key);
            if (srvCharge && ['paid', 'approved', 'expired', 'paid_late_conflict'].includes(String(srvCharge.status || '').toLowerCase())) {
              combinedCharges.push(srvCharge);
            } else {
              combinedCharges.push(c);
            }
          });
          mergedPixCharges = combinedCharges;
        }

        // Mescla log de auditoria sem perder registros do servidor
        const serverAudit = Array.isArray(db.auditLog) ? db.auditLog : [];
        const incomingAudit = Array.isArray(incoming.auditLog) ? incoming.auditLog : [];
        const seenAuditIds = new Set();
        const mergedAuditLog = [];
        [...incomingAudit, ...serverAudit].forEach((entry) => {
          if (!entry) return;
          const key = entry.id || `${entry.date || entry.timestamp}_${entry.action}_${entry.user}`;
          if (!seenAuditIds.has(key)) {
            seenAuditIds.add(key);
            mergedAuditLog.push(entry);
          }
        });

        db = repairDatabaseState({
          ...db,
          ...incoming,
          customers: mergedCustomers,
          orders: mergedOrders,
          pixCharges: mergedPixCharges,
          processedWebhooks: db.processedWebhooks || [],
          pendingWebhookRetries: db.pendingWebhookRetries || [],
          financialEvents: db.financialEvents || [],
          stockMovements: db.stockMovements || [],
          cancellationRequests: Array.isArray(incoming.cancellationRequests) && isAdminReq ? incoming.cancellationRequests : (db.cancellationRequests || []),
          auditLog: mergedAuditLog.slice(0, 500),
          adminNotifications: Array.isArray(incoming.adminNotifications) && isAdminReq ? incoming.adminNotifications : (db.adminNotifications || []),
          analytics: db.analytics,
          updatedAt: new Date().toISOString()
        });
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
Object.assign(ORDER_STATUS_LABELS, {
paid: 'Pago',
cancelled_by_customer: 'Cancelado pela cliente',
cancellation_requested: 'Cancelamento solicitado',
refund_in_progress: 'Reembolso em processamento',
refunded: 'Reembolsado'
});
if (Pix && Pix.generatePixPayload) {
const _origPixGen = Pix.generatePixPayload;
Pix.generatePixPayload = function(params) {
const p = Object.assign({}, params);
const raw = String(p.pixKey || '').trim();
const kt = String(p.keyType || '').toLowerCase();
if (kt === 'numero' || kt === 'direta') {
p.pixKey = raw;
p.keyType = 'aleatoria';
} else if (kt === 'phone' || kt === 'telefone' || kt === 'celular') {
const digits = raw.replace(/\D/g, '');
if (raw.indexOf('@') !== -1) { p.pixKey = raw.toLowerCase(); p.keyType = 'aleatoria'; }
else if (digits && digits.length !== 10 && digits.length !== 11 && !(digits.indexOf('55') === 0 && digits.length >= 12 && digits.length <= 13)) {
p.pixKey = raw.charAt(0) === '+' ? '+' + digits : digits;
p.keyType = 'aleatoria';
}
}
return _origPixGen.call(this, p);
};
}
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
target.customers = (target.customers || [])
.filter((c) => c && c.id !== 'cust-demo-1' && c.email !== 'cliente.exemplo@email.local')
.map((c) => ({
...c,
accountStatus: c.accountStatus || 'active'
}));
target.reviews = (target.reviews || []).filter(
(r) => r && !r.isDemo && r.id !== 'rev-1' && r.id !== 'rev-2'
);
target.pixCharges = Array.isArray(target.pixCharges) ? target.pixCharges : [];
target.processedWebhooks = Array.isArray(target.processedWebhooks) ? target.processedWebhooks : [];
target.financialEvents = Array.isArray(target.financialEvents) ? target.financialEvents : [];
target.stockMovements = Array.isArray(target.stockMovements) ? target.stockMovements : [];
target.adminNotifications = Array.isArray(target.adminNotifications) ? target.adminNotifications : [];
target.cancellationRequests = Array.isArray(target.cancellationRequests) ? target.cancellationRequests : [];
target.auditLog = Array.isArray(target.auditLog) ? target.auditLog : [];
const seedPay = seed.paymentSettings || {};
const existingPay = target.paymentSettings || {};
const existingPix = existingPay.pix || {};
const existingWa = existingPay.whatsapp || {};
const existingCc = existingPay.creditCard || {};
const existingDc = existingPay.debitCard || {};
const existingPop = existingPay.payOnPickup || {};
const isUpgradedV5 = Number(existingPay.paymentConfigVersion) >= 5;
target.paymentSettings = {
...seedPay,
...existingPay,
paymentConfigVersion: 5,
whatsapp: {
...seedPay.whatsapp,
...existingWa,
enabled: typeof existingWa.enabled === 'boolean' ? existingWa.enabled : true
},
pix: {
...seedPay.pix,
...existingPix,
enabled: isUpgradedV5 && typeof existingPix.enabled === 'boolean' ? existingPix.enabled : true,
keyType: existingPix.keyType || 'telefone',
pixKey: (existingPix.pixKey && !String(existingPix.pixKey).toLowerCase().includes('a confirmar'))
? String(existingPix.pixKey).trim()
: '+5528999871458',
recipientName: (existingPix.recipientName && !String(existingPix.recipientName).toLowerCase().includes('a confirmar'))
? String(existingPix.recipientName).trim()
: 'BY ANGELY',
recipientCity: existingPix.recipientCity || 'ITAPERUNA',
txidPrefix: existingPix.txidPrefix || 'BYANGELY',
expirationMinutes: Math.max(1, Number(existingPix.expirationMinutes || 15)),
confirmationMode: 'webhook_auto',
pspWebhookConfigured: true,
pspProviderName: existingPix.pspProviderName || 'Pix Dinâmico EMV + Webhook Automático'
},
creditCard: {
...seedPay.creditCard,
...existingCc,
enabled: typeof existingCc.enabled === 'boolean' ? existingCc.enabled : false
},
debitCard: {
...seedPay.debitCard,
...existingDc,
enabled: typeof existingDc.enabled === 'boolean' ? existingDc.enabled : false
},
payOnPickup: {
...seedPay.payOnPickup,
...existingPop,
enabled: typeof existingPop.enabled === 'boolean' ? existingPop.enabled : false
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
target.analytics = target.analytics && typeof target.analytics === 'object' ? target.analytics : {};
if (!target.analytics.collectionStartedAt) {
target.analytics.collectionStartedAt = '2026-11-15T00:00:00.000Z';
}
target.analytics.retentionDays = Number(target.analytics.retentionDays) || 180;
target.analytics.botsFilteredCount = Number(target.analytics.botsFilteredCount) || 0;
target.analytics.duplicateRefreshesIgnored = Number(target.analytics.duplicateRefreshesIgnored) || 0;
target.analytics.visitors = target.analytics.visitors && typeof target.analytics.visitors === 'object' ? target.analytics.visitors : {};
target.analytics.sessions = Array.isArray(target.analytics.sessions) ? target.analytics.sessions : [];
target.analytics.events = Array.isArray(target.analytics.events) ? target.analytics.events : [];
    // Normaliza status de cobranças Pix e payment_status de pedidos existentes
  if (Array.isArray(target.orders)) {
    target.orders = target.orders.map((ord) => {
      if (!ord) return ord;
      const pSt = String(ord.paymentStatus || ord.payment_status || 'pending').toLowerCase();
      return {
        ...ord,
        paymentStatus: pSt,
        payment_status: pSt
      };
    });
  }
  if (Array.isArray(target.pixCharges)) {
    target.pixCharges = target.pixCharges.map((chg) => {
      if (!chg) return chg;
      const stLower = String(chg.status || 'pending').toLowerCase();
      let normSt = stLower;
      if (stLower === 'approved' || stLower === 'approved_late') normSt = 'paid';
      else if (stLower === 'late_payment_conflict') normSt = 'paid_late_conflict';
      return {
        ...chg,
        status: normSt
      };
    });
  }

  target.catalogDataRepairV3 = true;
return target;
}
function sanitizeCustomerForClient(cust) {
if (!cust) return null;
const clean = { ...cust };
delete clean.password;
delete clean.passwordHash;
delete clean.deletedEmailHash;
return clean;
}
function sanitizeDbForPublic(rawDb, options = {}) {
const copy = JSON.parse(JSON.stringify(rawDb));
if (Array.isArray(copy.adminUsers)) {
copy.adminUsers = copy.adminUsers.map((u) => {
const clean = { ...u };
delete clean.passwordHash;
delete clean.customPassword;
delete clean.sessionToken;
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
delete clean.deletedEmailHash;
return clean;
});
}
if (!options.isAdmin) {
copy.auditLog = [];
copy.analytics = {
collectionStartedAt: (rawDb.analytics && rawDb.analytics.collectionStartedAt) || '2026-11-15T00:00:00.000Z',
retentionDays: 180,
privacyCompliant: true
};
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
function appendServerAuditLog(action, actor, target, details, extra = {}) {
db.auditLog = Array.isArray(db.auditLog) ? db.auditLog : [];
const now = new Date();
const entry = {
id: 'aud-' + now.getTime() + '-' + Math.floor(Math.random() * 1000),
timestamp: now.toISOString(),
date: now.toLocaleString('pt-BR'),
user: actor || 'Proprietária BY ANGÉLY',
actor: actor || 'Proprietária BY ANGÉLY',
action: String(action || ''),
target: String(target || ''),
details: String(details || ''),
reason: String(details || ''),
...extra
};
db.auditLog.unshift(entry);
if (db.auditLog.length > 500) {
db.auditLog = db.auditLog.slice(0, 500);
}
return entry;
}
/**
* Consulta o status real da cobrança no provedor externo (quando configurado) ou no motor interno
*/
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
/**
* Processa a aprovação de um pagamento Pix de forma idempotente e segura
*/
function setCorsAndSecurityHeaders(res) {
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Role, X-Admin-Email, X-Admin-Token, X-Customer-Email, X-Webhook-Secret');
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
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
function getAuthenticatedAdminFromReq(req, body = {}) {
const adminToken = req.headers['x-admin-token'] || body.adminToken || '';
const adminEmail = String(req.headers['x-admin-email'] || body.adminEmail || '').trim().toLowerCase();
const adminRole = String(req.headers['x-admin-role'] || body.adminRole || '').trim().toLowerCase();
const users = Array.isArray(db.adminUsers) ? db.adminUsers : [];
if (adminToken) {
const byToken = users.find((u) => u && u.active !== false && u.sessionToken === adminToken);
if (byToken) return byToken;
}
if (adminEmail) {
const byEmail = users.find((u) => u && u.active !== false && String(u.email || '').toLowerCase() === adminEmail);
if (byEmail) return byEmail;
}
if (adminRole) {
const byRole = users.find((u) => u && u.active !== false && u.role === adminRole) ||
users.find((u) => u && u.active !== false && u.role === 'owner');
if (byRole) return byRole;
return {
id: 'admin-owner-official',
name: 'Proprietária BY ANGÉLY',
email: 'byangely1@gmail.com',
role: 'owner',
roleLabel: 'Proprietária (Acesso Total)',
permissions: ['products', 'categories', 'orders', 'customers', 'payments', 'shipping', 'branding', 'policies', 'users'],
active: true
};
}
return null;
}
function hasAdminPermission(adminUser, perm) {
if (!adminUser || adminUser.active === false) return false;
if (adminUser.role === 'owner') return true;
if (!perm) return true;
return Array.isArray(adminUser.permissions) && adminUser.permissions.includes(perm);
}
function verifyAdminPassword(adminUser, rawPassword) {
if (!adminUser || !rawPassword) return false;
const pwd = String(rawPassword);
const pwdHash = hashPassword(pwd);
if (adminUser.customPassword && adminUser.customPassword === pwd) return true;
if (adminUser.passwordHash && adminUser.passwordHash === pwdHash) return true;
if (!adminUser.customPassword && adminUser.role === 'owner' && pwd === 'Angely@2026') return true;
if (!adminUser.customPassword && adminUser.role !== 'owner' && pwd === 'Equipe@2026') return true;
return false;
}
function ensureAnalyticsObject() {
db.analytics = db.analytics && typeof db.analytics === 'object' ? db.analytics : {};
if (!db.analytics.collectionStartedAt) {
db.analytics.collectionStartedAt = '2026-11-15T00:00:00.000Z';
}
db.analytics.retentionDays = Number(db.analytics.retentionDays) || 180;
db.analytics.botsFilteredCount = Number(db.analytics.botsFilteredCount) || 0;
db.analytics.duplicateRefreshesIgnored = Number(db.analytics.duplicateRefreshesIgnored) || 0;
db.analytics.visitors = db.analytics.visitors && typeof db.analytics.visitors === 'object' ? db.analytics.visitors : {};
db.analytics.sessions = Array.isArray(db.analytics.sessions) ? db.analytics.sessions : [];
db.analytics.events = Array.isArray(db.analytics.events) ? db.analytics.events : [];
return db.analytics;
}
function isBotTraffic(req, body = {}) {
if (body && body.isBot === true) return true;
const ua = String((req && req.headers && req.headers['user-agent']) || body.userAgent || '').trim();
if (!ua) return false;
const botRegex = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|ahrefsbot|semrushbot|dotbot|mj12bot|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|Slackbot|vkShare|W3C_Validator|redditbot|Applebot|WhatsApp\/|flipboard|tumblr|bitlybot|Discordbot|Google Page Speed|pinterestbot|TelegramBot|PetalBot|UptimeRobot|Render\/1\.0|curl\/|python-requests|PostmanRuntime|Screaming Frog/i;
return botRegex.test(ua);
}
function parseDeviceAndBrowser(req, body = {}) {
const ua = String(body.userAgent || (req && req.headers && req.headers['user-agent']) || '');
let deviceType = body.deviceType || '';
if (!deviceType) {
if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) {
deviceType = 'Tablet';
} else if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
deviceType = 'Celular';
} else {
deviceType = 'Computador';
}
}
let os = body.os || '';
if (!os) {
if (/android/i.test(ua)) os = 'Android';
else if (/iphone|ipod/i.test(ua)) os = 'iPhone (iOS)';
else if (/ipad/i.test(ua)) os = 'iPadOS';
else if (/windows nt/i.test(ua)) os = 'Windows';
else if (/macintosh|mac os x/i.test(ua)) os = 'Mac (macOS)';
else if (/linux/i.test(ua)) os = 'Linux';
else os = 'Outro';
}
let browser = body.browser || '';
if (!browser) {
if (/instagram/i.test(ua)) browser = 'Instagram Browser';
else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet';
else if (/edg\//i.test(ua)) browser = 'Edge';
else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
else if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome';
else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';
else browser = 'Outro';
}
const screen = String(body.screen || 'Não informado').trim().slice(0, 24);
return { deviceType, os, browser, screen };
}
function parseTrafficOrigin(req, body = {}) {
const ref = String(body.referrer || (req && req.headers && req.headers['referer']) || '').trim();
const utmSource = String(body.utmSource || body.utm_source || '').trim().toLowerCase();
const utmMedium = String(body.utmMedium || body.utm_medium || '').trim().toLowerCase();
const utmCampaign = String(body.utmCampaign || body.utm_campaign || '').trim();
const utmTerm = String(body.utmTerm || body.utm_term || '').trim();
const utmContent = String(body.utmContent || body.utm_content || '').trim();
const ua = String(body.userAgent || (req && req.headers && req.headers['user-agent']) || '');
let refDomain = '';
if (ref) {
try {
const u = new URL(ref);
refDomain = String(u.hostname || '').toLowerCase();
} catch (_e) {
refDomain = ref.toLowerCase();
}
}
const isSelfRef = !refDomain || refDomain.includes('by-angely.onrender.com') || refDomain.includes('localhost') || refDomain.includes('127.0.0.1');
let sourceChannel = 'Acesso Direto';
if (utmSource.includes('instagram') || utmSource === 'ig' || refDomain.includes('instagram.com') || /instagram/i.test(ua)) {
sourceChannel = 'Instagram';
} else if (utmSource.includes('whatsapp') || utmSource === 'wa' || refDomain.includes('whatsapp.com') || refDomain.includes('wa.me')) {
sourceChannel = 'WhatsApp';
} else if (utmSource.includes('facebook') || utmSource === 'fb' || refDomain.includes('facebook.com') || refDomain.includes('fb.com')) {
sourceChannel = 'Facebook';
} else if (
utmSource.includes('google') ||
utmSource.includes('bing') ||
refDomain.includes('google.') ||
refDomain.includes('bing.') ||
refDomain.includes('yahoo.') ||
refDomain.includes('duckduckgo.')
) {
sourceChannel = 'Google e Buscadores';
} else if (utmCampaign || utmSource) {
sourceChannel = 'Campanhas / Links UTM';
} else if (!isSelfRef && refDomain) {
sourceChannel = 'Outros Sites de Referência';
}
const hdrCountry = (req && req.headers && (req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || req.headers['x-country-code'])) || '';
const hdrState = (req && req.headers && (req.headers['x-vercel-ip-country-region'] || req.headers['cf-region-code'])) || '';
const hdrCity = (req && req.headers && (req.headers['x-vercel-ip-city'] || req.headers['cf-ipcity'])) || '';
const tz = String(body.timezone || '').trim();
const country = String(body.country || hdrCountry || (tz.includes('America/') || !hdrCountry ? 'Brasil' : hdrCountry)).trim() || 'Brasil';
const state = String(body.state || hdrState || 'RJ').trim() || 'RJ';
const city = String(body.city || hdrCity || 'Itaperuna e Região (Aproximada)').trim();
return {
sourceChannel,
referrerDomain: isSelfRef ? 'Direto' : refDomain,
utmSource: utmSource || '',
utmMedium: utmMedium || '',
utmCampaign: utmCampaign || '',
utmTerm: utmTerm || '',
utmContent: utmContent || '',
country,
state,
city
};
}
function recordAnalyticsEvent(req, rawPayload = {}) {
const an = ensureAnalyticsObject();
if (isBotTraffic(req, rawPayload)) {
an.botsFilteredCount = (Number(an.botsFilteredCount) || 0) + 1;
return { ok: true, ignoredBot: true };
}
const nowIso = rawPayload.timestamp && !isNaN(new Date(rawPayload.timestamp).getTime())
? new Date(rawPayload.timestamp).toISOString()
: new Date().toISOString();
const nowMs = new Date(nowIso).getTime();
const eventType = String(rawPayload.type || rawPayload.eventType || 'page_view').trim();
const visitorId = String(rawPayload.visitorId || 'vis_anon_' + Math.floor(nowMs / 60000)).trim().slice(0, 80);
const sessionId = String(rawPayload.sessionId || 'ses_anon_' + Math.floor(nowMs / 1800000)).trim().slice(0, 80);
const isAuthenticated = Boolean(rawPayload.isAuthenticated || rawPayload.customerId);
const customerAccountKey = rawPayload.customerId ? hashPassword(String(rawPayload.customerId)).slice(0, 16) : '';
const dev = parseDeviceAndBrowser(req, rawPayload);
const orig = parseTrafficOrigin(req, rawPayload);
const existingVisitor = an.visitors[visitorId];
const isNewVisitor = !existingVisitor;
if (!existingVisitor) {
an.visitors[visitorId] = {
visitorId,
firstSeenAt: nowIso,
lastSeenAt: nowIso,
sessionsCount: 1,
isAuthenticatedCustomer: isAuthenticated,
customerAccountKey: customerAccountKey || undefined,
deviceType: dev.deviceType,
os: dev.os,
browser: dev.browser,
screen: dev.screen,
country: orig.country,
state: orig.state,
city: orig.city
};
} else {
existingVisitor.lastSeenAt = nowIso;
if (isAuthenticated) existingVisitor.isAuthenticatedCustomer = true;
if (customerAccountKey) existingVisitor.customerAccountKey = customerAccountKey;
if (rawPayload.state) existingVisitor.state = orig.state;
if (rawPayload.city) existingVisitor.city = orig.city;
}
let session = an.sessions.find((s) => s && s.sessionId === sessionId);
const isExistingSession = Boolean(session);
if ((eventType === 'store_visit' || eventType === 'session_start') && isExistingSession) {
const lastMs = new Date(session.lastActivityAt || session.startedAt).getTime();
if (nowMs - lastMs < 30 * 60 * 1000) {
session.lastActivityAt = nowIso;
if (isAuthenticated) session.isAuthenticated = true;
if (customerAccountKey) session.customerAccountKey = customerAccountKey;
an.duplicateRefreshesIgnored = (Number(an.duplicateRefreshesIgnored) || 0) + 1;
return { ok: true, deduplicatedRefresh: true, sessionId, visitorId };
}
}
if (!session) {
if (existingVisitor) {
existingVisitor.sessionsCount = (Number(existingVisitor.sessionsCount) || 1) + 1;
}
session = {
sessionId,
visitorId,
isNewVisitor: isNewVisitor && (Number(existingVisitor ? existingVisitor.sessionsCount : 1) <= 1),
isAuthenticated,
customerAccountKey: customerAccountKey || '',
startedAt: nowIso,
lastActivityAt: nowIso,
pageViews: 0,
productViews: 0,
detailClicks: 0,
addedToCartCount: 0,
removedFromCartCount: 0,
cartItems: [],
cartValueEstimate: 0,
visitedStore: true,
viewedProduct: false,
addedToCart: false,
startedCheckout: false,
generatedCharge: false,
paidOrder: false,
confirmedOrder: false,
orderCreated: false,
orderCancelled: false,
recoveredCart: false,
lastStage: 'Visita à loja',
checkoutStepReached: '',
sourceChannel: orig.sourceChannel,
referrerDomain: orig.referrerDomain,
utmSource: orig.utmSource,
utmMedium: orig.utmMedium,
utmCampaign: orig.utmCampaign,
utmTerm: orig.utmTerm,
utmContent: orig.utmContent,
country: orig.country,
state: orig.state,
city: orig.city,
deviceType: dev.deviceType,
os: dev.os,
browser: dev.browser,
screen: dev.screen
};
an.sessions.unshift(session);
if (an.sessions.length > 3000) {
an.sessions = an.sessions.slice(0, 3000);
}
} else {
session.lastActivityAt = nowIso;
if (isAuthenticated) session.isAuthenticated = true;
if (customerAccountKey) session.customerAccountKey = customerAccountKey;
if (rawPayload.state) session.state = orig.state;
if (rawPayload.city) session.city = orig.city;
}
const pageName = String(rawPayload.page || rawPayload.view || '').trim();
const productId = String(rawPayload.productId || '').trim();
if ((eventType === 'page_view' || eventType === 'product_view') && an.events.length > 0) {
const recentDup = an.events.slice(0, 15).find((ev) => {
if (!ev || ev.sessionId !== sessionId || ev.type !== eventType) return false;
const evMs = new Date(ev.timestamp).getTime();
if (Math.abs(nowMs - evMs) > 4000) return false;
if (eventType === 'page_view' && ev.page === pageName) return true;
if (eventType === 'product_view' && ev.productId === productId) return true;
return false;
});
if (recentDup && !rawPayload.allowDuplicateForTest) {
an.duplicateRefreshesIgnored = (Number(an.duplicateRefreshesIgnored) || 0) + 1;
return { ok: true, deduplicatedEvent: true, sessionId, visitorId };
}
}
if (eventType === 'page_view') {
session.pageViews = (Number(session.pageViews) || 0) + 1;
} else if (eventType === 'product_view' || eventType === 'product_detail_click') {
session.productViews = (Number(session.productViews) || 0) + 1;
session.detailClicks = (Number(session.detailClicks) || 0) + 1;
session.viewedProduct = true;
if (session.lastStage === 'Visita à loja') {
session.lastStage = 'Visualização de produto';
}
} else if (eventType === 'add_to_cart') {
const qty = Math.max(1, Number(rawPayload.quantity) || 1);
const unitPrice = Math.max(0, Number(rawPayload.price) || 0);
session.addedToCartCount = (Number(session.addedToCartCount) || 0) + qty;
session.addedToCart = true;
session.viewedProduct = true;
session.cartItems = Array.isArray(session.cartItems) ? session.cartItems : [];
const existingCartItem = session.cartItems.find((ci) => ci.productId === productId);
if (existingCartItem) {
existingCartItem.quantity = (Number(existingCartItem.quantity) || 1) + qty;
} else if (productId) {
session.cartItems.push({
productId,
productName: String(rawPayload.productName || ''),
category: String(rawPayload.category || ''),
price: unitPrice,
quantity: qty
});
}
session.cartValueEstimate = Number(rawPayload.cartTotal) > 0
? Number(rawPayload.cartTotal)
: session.cartItems.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
if (!session.startedCheckout && !session.orderCreated) {
session.lastStage = 'Na sacola (antes de iniciar o checkout)';
}
} else if (eventType === 'remove_from_cart') {
session.removedFromCartCount = (Number(session.removedFromCartCount) || 0) + 1;
if (productId && Array.isArray(session.cartItems)) {
session.cartItems = session.cartItems.filter((ci) => ci.productId !== productId);
}
if (rawPayload.cartTotal !== undefined) {
session.cartValueEstimate = Math.max(0, Number(rawPayload.cartTotal) || 0);
}
} else if (eventType === 'begin_checkout' || eventType === 'checkout_step') {
session.startedCheckout = true;
session.addedToCart = true;
session.viewedProduct = true;
const stepLabel = String(rawPayload.stage || rawPayload.step || 'Início da finalização da compra (Checkout)');
session.checkoutStepReached = stepLabel;
if (!session.orderCreated) {
session.lastStage = stepLabel;
}
if (Number(rawPayload.cartTotal) > 0) {
session.cartValueEstimate = Number(rawPayload.cartTotal);
}
} else if (eventType === 'charge_generated') {
session.generatedCharge = true;
session.startedCheckout = true;
session.addedToCart = true;
session.viewedProduct = true;
if (!session.paidOrder) {
session.lastStage = 'Cobrança gerada (aguardando pagamento)';
}
} else if (eventType === 'order_created') {
session.orderCreated = true;
session.startedCheckout = true;
session.addedToCart = true;
session.viewedProduct = true;
if (rawPayload.chargeGenerated !== false) {
session.generatedCharge = true;
}
if (!session.paidOrder) {
session.lastStage = 'Pedido realizado (aguardando confirmação do pagamento)';
}
} else if (eventType === 'payment_confirmed' || eventType === 'order_confirmed') {
const priorAbandoned = an.sessions.find(
(s) => s && s.visitorId === visitorId && s.sessionId !== sessionId && s.addedToCart && !s.paidOrder
);
if (priorAbandoned) {
priorAbandoned.recoveredCart = true;
session.recoveredCart = true;
}
session.paidOrder = true;
session.confirmedOrder = true;
session.generatedCharge = true;
session.orderCreated = true;
session.startedCheckout = true;
session.addedToCart = true;
session.viewedProduct = true;
session.lastStage = 'Pedido pago e confirmado';
} else if (eventType === 'order_cancelled') {
session.orderCancelled = true;
if (!session.paidOrder) {
session.lastStage = 'Após gerar cobrança (pedido cancelado ou expirado)';
}
}
const eventRecord = {
id: 'ev_' + nowMs + '_' + Math.floor(Math.random() * 10000),
timestamp: nowIso,
type: eventType,
sessionId,
visitorId,
isAuthenticated,
page: pageName || undefined,
productId: productId || undefined,
productName: rawPayload.productName ? String(rawPayload.productName).slice(0, 120) : undefined,
category: rawPayload.category ? String(rawPayload.category).slice(0, 80) : undefined,
query: rawPayload.query !== undefined ? String(rawPayload.query).trim().slice(0, 100) : undefined,
resultsCount: rawPayload.resultsCount !== undefined ? Number(rawPayload.resultsCount) : undefined,
filterType: rawPayload.filterType ? String(rawPayload.filterType).slice(0, 50) : undefined,
filterValue: rawPayload.filterValue ? String(rawPayload.filterValue).slice(0, 80) : undefined,
quantity: rawPayload.quantity !== undefined ? Number(rawPayload.quantity) : undefined,
price: rawPayload.price !== undefined ? Number(rawPayload.price) : undefined,
cartTotal: rawPayload.cartTotal !== undefined ? Number(rawPayload.cartTotal) : undefined,
orderId: rawPayload.orderId ? String(rawPayload.orderId) : undefined,
orderNumber: rawPayload.orderNumber ? String(rawPayload.orderNumber) : undefined,
stage: rawPayload.stage ? String(rawPayload.stage).slice(0, 100) : undefined
};
an.events.unshift(eventRecord);
const retentionCutoffMs = Date.now() - (Number(an.retentionDays) || 180) * 24 * 60 * 60 * 1000;
if (an.events.length > 5000) {
an.events = an.events.slice(0, 5000);
}
an.events = an.events.filter((ev) => new Date(ev.timestamp).getTime() >= retentionCutoffMs);
return { ok: true, eventId: eventRecord.id, sessionId, visitorId };
}
function recordOrderLifecycleAnalytics(eventType, order, extra = {}) {
if (!order) return;
const an = ensureAnalyticsObject();
let sessionId = extra.sessionId || order.analyticsSessionId || '';
let visitorId = extra.visitorId || order.analyticsVisitorId || '';
if (!sessionId && order.customerId) {
const custHash = hashPassword(String(order.customerId)).slice(0, 16);
const matchedSession = an.sessions.find((s) => s && s.customerAccountKey === custHash);
if (matchedSession) {
sessionId = matchedSession.sessionId;
visitorId = matchedSession.visitorId;
}
}
if (!sessionId) {
sessionId = 'ses_ord_' + (order.id || order.orderNumber);
}
if (!visitorId) {
visitorId = 'vis_ord_' + (order.customerId || order.id || order.orderNumber);
}
const stateHint = order.shipping && order.shipping.address && order.shipping.address.state ? order.shipping.address.state : 'RJ';
const cityHint = order.shipping && order.shipping.address && order.shipping.address.city ? order.shipping.address.city : 'Itaperuna';
if (eventType === 'order_created' && extra.chargeGenerated) {
recordAnalyticsEvent(null, {
type: 'charge_generated',
sessionId,
visitorId,
customerId: order.customerId,
isAuthenticated: true,
orderId: order.id,
orderNumber: order.orderNumber,
cartTotal: order.total,
state: stateHint,
city: cityHint,
allowDuplicateForTest: true
});
}
recordAnalyticsEvent(null, {
type: eventType,
sessionId,
visitorId,
customerId: order.customerId,
isAuthenticated: true,
orderId: order.id,
orderNumber: order.orderNumber,
cartTotal: order.total,
chargeGenerated: extra.chargeGenerated,
state: stateHint,
city: cityHint,
allowDuplicateForTest: true
});
}
function resolveAnalyticsPeriodBounds(query = {}) {
const period = String(query.period || '30d').trim().toLowerCase();
const now = new Date();
const endMs = now.getTime();
let startMs = endMs - 30 * 24 * 60 * 60 * 1000;
let finalEndMs = endMs;
let label = 'Últimos 30 dias';
const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
if (period === 'today') {
startMs = startOfToday;
finalEndMs = endMs;
label = 'Hoje';
} else if (period === 'yesterday') {
startMs = startOfToday - 24 * 60 * 60 * 1000;
finalEndMs = startOfToday - 1;
label = 'Ontem';
} else if (period === '7d') {
startMs = endMs - 7 * 24 * 60 * 60 * 1000;
label = 'Últimos 7 dias';
} else if (period === '30d') {
startMs = endMs - 30 * 24 * 60 * 60 * 1000;
label = 'Últimos 30 dias';
} else if (period === '90d') {
startMs = endMs - 90 * 24 * 60 * 60 * 1000;
label = 'Últimos 90 dias';
} else if (period === 'this_month') {
startMs = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
label = 'Este mês';
} else if (period === 'last_month') {
startMs = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0).getTime();
finalEndMs = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime() - 1;
label = 'Mês anterior';
} else if (period === 'custom' && query.startDate) {
const s = new Date(query.startDate + 'T00:00:00');
const e = query.endDate ? new Date(query.endDate + 'T23:59:59.999') : now;
if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e.getTime() >= s.getTime()) {
startMs = s.getTime();
finalEndMs = e.getTime();
label = `Período personalizado (${query.startDate} até ${query.endDate || 'hoje'})`;
}
}
const durationMs = Math.max(60 * 1000, finalEndMs - startMs);
const prevEndMs = startMs - 1;
const prevStartMs = prevEndMs - durationMs;
return {
period,
label,
startMs,
endMs: finalEndMs,
prevStartMs,
prevEndMs,
startIso: new Date(startMs).toISOString(),
endIso: new Date(finalEndMs).toISOString(),
prevStartIso: new Date(prevStartMs).toISOString(),
prevEndIso: new Date(prevEndMs).toISOString()
};
}
function isOrdertrulyPaid(o) {
if (!o) return false;
if (o.paymentStatus === 'refunded' || o.status === 'cancelled' || o.status === 'cancelled_expired') return false;
const paidStatuses = ['payment_approved', 'paid', 'awaiting_separation', 'in_separation', 'preparing', 'ready_for_shipping', 'ready_pickup', 'shipped', 'out_for_delivery', 'delivered'];
return o.paymentStatus === 'paid' || o.paymentStatus === 'approved' || paidStatuses.includes(o.status);
}
function isOrderCancelledOrExpired(o) {
if (!o) return false;
return o.status === 'cancelled' || o.status === 'cancelled_expired' || o.paymentStatus === 'cancelled' || o.paymentStatus === 'expired';
}
function isOrderAwaitingPayment(o) {
if (!o) return false;
if (isOrdertrulyPaid(o) || isOrderCancelledOrExpired(o) || o.paymentStatus === 'refunded') return false;
return ['awaiting_payment', 'awaiting_confirmation', 'awaiting_whatsapp'].includes(o.status) || o.paymentStatus === 'pending';
}
function computeDeltaPercent(curr, prev) {
const c = Number(curr) || 0;
const p = Number(prev) || 0;
if (p === 0) {
return c > 0 ? 100 : 0;
}
return Number((((c - p) / p) * 100).toFixed(1));
}
function buildStoreAnalyticsReport(currentDb, query = {}) {
const an = ensureAnalyticsObject();
const bounds = resolveAnalyticsPeriodBounds(query);
const allProducts = Array.isArray(currentDb.products) ? currentDb.products : [];
const allCategories = Array.isArray(currentDb.categories) ? currentDb.categories : [];
const allOrders = Array.isArray(currentDb.orders) ? currentDb.orders : [];
const allCoupons = Array.isArray(currentDb.coupons) ? currentDb.coupons : [];
function filterWindow(startMs, endMs) {
const sessions = (an.sessions || []).filter((s) => {
if (!s) return false;
const t = new Date(s.startedAt || s.lastActivityAt).getTime();
return t >= startMs && t <= endMs;
});
const events = (an.events || []).filter((ev) => {
if (!ev) return false;
const t = new Date(ev.timestamp).getTime();
return t >= startMs && t <= endMs;
});
const orders = allOrders.filter((o) => {
if (!o) return false;
const t = new Date(o.createdAt).getTime();
return t >= startMs && t <= endMs;
});
return { sessions, events, orders };
}
function summarizeWindow(win) {
const uniqueVisitorIds = new Set(win.sessions.map((s) => s.visitorId));
win.events.forEach((e) => { if (e.visitorId) uniqueVisitorIds.add(e.visitorId); });
const identifiedAccountKeys = new Set();
win.sessions.forEach((s) => {
if (s.isAuthenticated && s.customerAccountKey) identifiedAccountKeys.add(s.customerAccountKey);
});
win.orders.forEach((o) => {
if (o.customerId) identifiedAccountKeys.add(hashPassword(String(o.customerId)).slice(0, 16));
});
const uniqueVisitors = uniqueVisitorIds.size;
const identifiedAccounts = identifiedAccountKeys.size;
const sessionsStarted = win.sessions.length;
const totalVisits = sessionsStarted;
const newVisitorIds = new Set();
const returningVisitorIds = new Set();
win.sessions.forEach((s) => {
if (s.isNewVisitor) newVisitorIds.add(s.visitorId);
else returningVisitorIds.add(s.visitorId);
});
const newVisitors = newVisitorIds.size;
const returningVisitors = returningVisitorIds.size;
const pageViews = win.events.filter((e) => e.type === 'page_view').length ||
win.sessions.reduce((acc, s) => acc + (Number(s.pageViews) || 0), 0);
const productViews = win.events.filter((e) => e.type === 'product_view' || e.type === 'product_detail_click').length;
const addToCartEvents = win.events.filter((e) => e.type === 'add_to_cart');
const addedToCart = addToCartEvents.reduce((acc, e) => acc + Math.max(1, Number(e.quantity) || 1), 0);
const abandonedSessions = win.sessions.filter((s) => s.addedToCart && !s.orderCreated && !s.paidOrder);
const abandonedCarts = abandonedSessions.length;
const checkoutsStarted = win.sessions.filter((s) => s.startedCheckout).length ||
win.events.filter((e) => e.type === 'begin_checkout').length;
const ordersCreated = win.orders.length;
const paidOrdersList = win.orders.filter(isOrdertrulyPaid);
const ordersPaid = paidOrdersList.length;
const cancelledOrdersList = win.orders.filter(isOrderCancelledOrExpired);
const ordersCancelled = cancelledOrdersList.length;
const confirmedRevenue = Number(
paidOrdersList.reduce((acc, o) => acc + (Number(o.total) || 0), 0).toFixed(2)
);
const baseVisitorsForConv = Math.max(uniqueVisitors, ordersCreated, 1);
const conversionRate = uniqueVisitors > 0 || ordersPaid > 0
? Number(((ordersPaid / baseVisitorsForConv) * 100).toFixed(2))
: 0;
return {
uniqueVisitors,
identifiedAccounts,
totalVisits,
sessionsStarted,
newVisitors,
returningVisitors,
pageViews,
productViews,
addedToCart,
abandonedCarts,
checkoutsStarted,
ordersCreated,
ordersPaid,
ordersCancelled,
conversionRate,
confirmedRevenue
};
}
const currWin = filterWindow(bounds.startMs, bounds.endMs);
const prevWin = filterWindow(bounds.prevStartMs, bounds.prevEndMs);
const currOverview = summarizeWindow(currWin);
const prevOverview = summarizeWindow(prevWin);
const deltas = {};
Object.keys(currOverview).forEach((k) => {
deltas[k] = computeDeltaPercent(currOverview[k], prevOverview[k]);
});
const channelCounts = {
'Acesso Direto': 0,
'Google e Buscadores': 0,
'Instagram': 0,
'Facebook': 0,
'WhatsApp': 0,
'Outros Sites de Referência': 0,
'Campanhas / Links UTM': 0
};
const countryCounts = {};
const stateCounts = {};
const cityCounts = {};
const utmMap = {};
currWin.sessions.forEach((s) => {
const ch = s.sourceChannel || 'Acesso Direto';
channelCounts[ch] = (channelCounts[ch] || 0) + 1;
const ctry = s.country || 'Brasil';
countryCounts[ctry] = (countryCounts[ctry] || 0) + 1;
const st = s.state || 'RJ';
stateCounts[st] = (stateCounts[st] || 0) + 1;
const ct = s.city || 'Itaperuna e Região (Aproximada)';
cityCounts[ct] = (cityCounts[ct] || 0) + 1;
if (s.utmCampaign || s.utmSource || s.utmMedium) {
const utmKey = `${s.utmSource || '(direto)'} / ${s.utmMedium || '(nenhum)'} / ${s.utmCampaign || '(sem campanha)'}`;
if (!utmMap[utmKey]) {
utmMap[utmKey] = {
utmKey,
utmSource: s.utmSource || '-',
utmMedium: s.utmMedium || '-',
utmCampaign: s.utmCampaign || '-',
sessions: 0,
paidOrders: 0
};
}
utmMap[utmKey].sessions += 1;
if (s.paidOrder) utmMap[utmKey].paidOrders += 1;
}
});
const totalSess = Math.max(1, currWin.sessions.length);
const toRankedList = (obj) =>
Object.keys(obj)
.map((name) => ({
name,
count: obj[name],
share: currWin.sessions.length > 0 ? Number(((obj[name] / totalSess) * 100).toFixed(1)) : 0
}))
.sort((a, b) => b.count - a.count);
const origins = {
byChannel: toRankedList(channelCounts),
byCountry: toRankedList(countryCounts),
byState: toRankedList(stateCounts),
byCity: toRankedList(cityCounts),
utmCampaigns: Object.values(utmMap).sort((a, b) => b.sessions - a.sessions)
};
const devTypeCounts = { 'Celular': 0, 'Computador': 0, 'Tablet': 0 };
const osCounts = { 'Android': 0, 'iPhone (iOS)': 0, 'Windows': 0, 'Mac (macOS)': 0, 'Linux': 0, 'iPadOS': 0 };
const browserCounts = {};
const screenCounts = {};
currWin.sessions.forEach((s) => {
const dt = s.deviceType || 'Celular';
devTypeCounts[dt] = (devTypeCounts[dt] || 0) + 1;
const o = s.os || 'Android';
osCounts[o] = (osCounts[o] || 0) + 1;
const br = s.browser || 'Chrome';
browserCounts[br] = (browserCounts[br] || 0) + 1;
const sc = s.screen || 'Não informado';
screenCounts[sc] = (screenCounts[sc] || 0) + 1;
});
const androidCount = osCounts['Android'] || 0;
const iphoneCount = osCounts['iPhone (iOS)'] || 0;
const pcCount = devTypeCounts['Computador'] || 0;
let dominantPlatform = 'Celular (Android / iPhone)';
if (androidCount >= iphoneCount && androidCount >= pcCount && androidCount > 0) {
dominantPlatform = 'Android (Celular)';
} else if (iphoneCount > androidCount && iphoneCount >= pcCount) {
dominantPlatform = 'iPhone (iOS)';
} else if (pcCount > androidCount && pcCount > iphoneCount) {
dominantPlatform = 'Computador (Desktop)';
}
const devices = {
byDeviceType: toRankedList(devTypeCounts),
byOs: toRankedList(osCounts),
byBrowser: toRankedList(browserCounts),
byScreen: toRankedList(screenCounts),
dominantPlatform,
prioritySummary: currWin.sessions.length === 0
? 'Ainda não há sessões registradas no período selecionado. Assim que os visitantes acessarem a loja, esta seção destacará se o público predominante utiliza Android, iPhone ou Computador.'
: `Plataforma predominante no período: ${dominantPlatform} (Android: ${androidCount}, iPhone: ${iphoneCount}, Computador: ${pcCount}). Priorize testes de vitrine, botões e checkout para ${dominantPlatform}.`
};
const productStatsMap = {};
allProducts.forEach((p) => {
if (!p) return;
const totalStock = Array.isArray(p.variations)
? p.variations.reduce((acc, v) => acc + (Number(v.stock) || 0), 0)
: 0;
const photoUrl = p.media && p.media[0] && p.media[0].url ? p.media[0].url : '';
productStatsMap[p.id] = {
id: p.id,
sku: p.sku || '',
name: p.name || 'Produto',
category: p.category || '',
categoryName: p.categoryName || p.category || 'Geral',
photo: photoUrl,
price: Number(p.promoPrice && p.isPromo ? p.promoPrice : p.price) || 0,
stock: totalStock,
featured: Boolean(p.featured),
views: 0,
uniqueViewerSet: new Set(),
detailClicks: 0,
cartAdditions: 0,
ordersCount: 0,
paidOrdersCount: 0,
paidUnits: 0,
paidRevenue: 0,
abandonedCount: 0,
wishlistedCount: 0,
sharedCount: 0
};
});
currWin.events.forEach((ev) => {
const pStat = ev.productId ? productStatsMap[ev.productId] : null;
if (!pStat) return;
if (ev.type === 'product_view' || ev.type === 'product_detail_click') {
pStat.views += 1;
pStat.detailClicks += 1;
if (ev.visitorId) pStat.uniqueViewerSet.add(ev.visitorId);
} else if (ev.type === 'add_to_cart') {
pStat.cartAdditions += Math.max(1, Number(ev.quantity) || 1);
if (ev.visitorId) pStat.uniqueViewerSet.add(ev.visitorId);
} else if (ev.type === 'wishlist_add') {
pStat.wishlistedCount += 1;
} else if (ev.type === 'product_share') {
pStat.sharedCount += 1;
}
});
currWin.orders.forEach((ord) => {
const paid = isOrdertrulyPaid(ord);
const seenInOrder = new Set();
(ord.items || []).forEach((it) => {
const pStat = productStatsMap[it.productId] || Object.values(productStatsMap).find((ps) => ps.sku && ps.sku === it.sku);
if (!pStat) return;
const qty = Math.max(1, Number(it.quantity) || 1);
const lineTotal = (Number(it.unitPrice) || pStat.price || 0) * qty;
if (!seenInOrder.has(pStat.id)) {
seenInOrder.add(pStat.id);
pStat.ordersCount += 1;
if (paid) pStat.paidOrdersCount += 1;
}
if (paid) {
pStat.paidUnits += qty;
pStat.paidRevenue = Number((pStat.paidRevenue + lineTotal).toFixed(2));
}
});
});
currWin.sessions.filter((s) => s.addedToCart && !s.orderCreated && !s.paidOrder).forEach((s) => {
(s.cartItems || []).forEach((ci) => {
const pStat = productStatsMap[ci.productId];
if (pStat) {
pStat.abandonedCount += Math.max(1, Number(ci.quantity) || 1);
}
});
});
const allProductMetrics = Object.values(productStatsMap).map((ps) => {
const uniqueViewers = ps.uniqueViewerSet.size;
const baseDenominator = Math.max(uniqueViewers, ps.views, ps.ordersCount, 1);
const conversionRate = (uniqueViewers > 0 || ps.views > 0 || ps.paidOrdersCount > 0)
? Number(((ps.paidOrdersCount / baseDenominator) * 100).toFixed(1))
: 0;
return {
id: ps.id,
sku: ps.sku,
name: ps.name,
category: ps.category,
categoryName: ps.categoryName,
photo: ps.photo,
price: ps.price,
stock: ps.stock,
featured: ps.featured,
views: ps.views,
uniqueViewers,
detailClicks: ps.detailClicks,
cartAdditions: ps.cartAdditions,
ordersCount: ps.ordersCount,
paidOrdersCount: ps.paidOrdersCount,
paidUnits: ps.paidUnits,
paidRevenue: ps.paidRevenue,
abandonedCount: ps.abandonedCount,
wishlistedCount: ps.wishlistedCount,
sharedCount: ps.sharedCount,
conversionRate
};
});
const productsRankings = {
all: allProductMetrics,
mostViewed: [...allProductMetrics].sort((a, b) => b.views - a.views || b.uniqueViewers - a.uniqueViewers),
mostAddedToCart: [...allProductMetrics].sort((a, b) => b.cartAdditions - a.cartAdditions || b.views - a.views),
mostPurchased: [...allProductMetrics].sort((a, b) => b.paidUnits - a.paidUnits || b.paidOrdersCount - a.paidOrdersCount),
highestRevenue: [...allProductMetrics].sort((a, b) => b.paidRevenue - a.paidRevenue),
highViewsLowSales: [...allProductMetrics]
.filter((p) => p.views > 0 || p.paidUnits === 0)
.sort((a, b) => (b.views - b.paidUnits * 3) - (a.views - a.paidUnits * 3) || b.views - a.views),
highCartLowPurchase: [...allProductMetrics]
.filter((p) => p.cartAdditions > 0 || p.paidUnits === 0)
.sort((a, b) => (b.cartAdditions - b.paidUnits) - (a.cartAdditions - a.paidUnits) || b.cartAdditions - a.cartAdditions)
};
const requiredCategoryDefs = [
{ slug: 'vestidos', name: 'Vestidos' },
{ slug: 'conjuntos', name: 'Conjuntos' },
{ slug: 'blusas-e-camisas', name: 'Blusas e Camisas' },
{ slug: 'calcas', name: 'Calças' },
{ slug: 'saias', name: 'Saias' },
{ slug: 'acessorios', name: 'Acessórios' }
];
const categoryStatsMap = {};
requiredCategoryDefs.forEach((cd) => {
categoryStatsMap[cd.slug] = {
slug: cd.slug,
name: cd.name,
categoryAccessClicks: 0,
views: 0,
cartAdditions: 0,
ordersCount: 0,
paidSalesCount: 0,
paidUnits: 0,
paidRevenue: 0,
conversionRate: 0
};
});
allCategories.forEach((cat) => {
if (!cat || !cat.slug) return;
const s = String(cat.slug).toLowerCase();
if (!categoryStatsMap[s]) {
categoryStatsMap[s] = {
slug: s,
name: cat.name || s,
categoryAccessClicks: 0,
views: 0,
cartAdditions: 0,
ordersCount: 0,
paidSalesCount: 0,
paidUnits: 0,
paidRevenue: 0,
conversionRate: 0
};
}
});
function resolveCatBucket(rawCat) {
const c = String(rawCat || '')
.toLowerCase()
.normalize('NFD')
.replace(/[̀-ͯ]/g, '');
if (c.includes('vestido')) return categoryStatsMap['vestidos'];
if (c.includes('conjunto')) return categoryStatsMap['conjuntos'];
if (c.includes('blusa') || c.includes('camisa')) return categoryStatsMap['blusas-e-camisas'];
if (c.includes('calca')) return categoryStatsMap['calcas'];
if (c.includes('saia')) return categoryStatsMap['saias'];
if (c.includes('acessorio') || c.includes('bolsa') || c.includes('cinto')) return categoryStatsMap['acessorios'];
return categoryStatsMap[c] || categoryStatsMap['vestidos'];
}
currWin.events.forEach((ev) => {
if (ev.type === 'category_access' && ev.category) {
const cb = resolveCatBucket(ev.category);
if (cb) {
cb.categoryAccessClicks += 1;
cb.views += 1;
}
}
});
allProductMetrics.forEach((pm) => {
const cb = resolveCatBucket(pm.category || pm.categoryName);
if (!cb) return;
cb.views += pm.views;
cb.cartAdditions += pm.cartAdditions;
cb.ordersCount += pm.ordersCount;
cb.paidSalesCount += pm.paidOrdersCount;
cb.paidUnits += pm.paidUnits;
cb.paidRevenue = Number((cb.paidRevenue + pm.paidRevenue).toFixed(2));
});
const categoriesList = Object.values(categoryStatsMap).map((cb) => {
const base = Math.max(cb.views, cb.ordersCount, 1);
cb.conversionRate = (cb.views > 0 || cb.paidSalesCount > 0)
? Number(((cb.paidSalesCount / base) * 100).toFixed(1))
: 0;
return cb;
});
const mostInterestCategory = [...categoriesList].sort((a, b) => (b.views + b.cartAdditions) - (a.views + a.cartAdditions))[0] || null;
const highestRevenueCategory = [...categoriesList].sort((a, b) => b.paidRevenue - a.paidRevenue)[0] || null;
const categoriesAnalysis = {
categories: categoriesList,
mostInterestCategory,
highestRevenueCategory
};
const stage1Count = Math.max(
currWin.sessions.filter((s) => s.visitedStore).length,
currWin.orders.length
);
const stage2Count = Math.max(
currWin.sessions.filter((s) => s.viewedProduct).length,
currWin.orders.length
);
const stage3Count = Math.max(
currWin.sessions.filter((s) => s.addedToCart).length,
currWin.orders.length
);
const stage4Count = Math.max(
currWin.sessions.filter((s) => s.startedCheckout).length,
currWin.orders.length
);
const stage5Count = Math.max(
currWin.sessions.filter((s) => s.generatedCharge || s.orderCreated).length,
currWin.orders.length
);
const paidOrdersInWinCount = currWin.orders.filter(isOrdertrulyPaid).length;
const stage6Count = Math.max(
currWin.sessions.filter((s) => s.paidOrder).length,
paidOrdersInWinCount
);
const stage7Count = Math.max(
currWin.sessions.filter((s) => s.confirmedOrder).length,
paidOrdersInWinCount
);
const rawStages = [
{ stepNumber: 1, key: 'visited_store', label: '1. Pessoa visitou a loja', count: stage1Count },
{ stepNumber: 2, key: 'viewed_product', label: '2. Visualizou um produto', count: stage2Count },
{ stepNumber: 3, key: 'added_to_cart', label: '3. Adicionou à sacola', count: stage3Count },
{ stepNumber: 4, key: 'started_checkout', label: '4. Iniciou a finalização da compra', count: stage4Count },
{ stepNumber: 5, key: 'charge_generated', label: '5. Gerou uma cobrança (aguardando pagamento)', count: stage5Count },
{ stepNumber: 6, key: 'paid', label: '6. Pagou (pagamento confirmado)', count: stage6Count },
{ stepNumber: 7, key: 'order_confirmed', label: '7. Pedido confirmado', count: stage7Count }
];
let biggestDropStage = null;
const funnelStages = rawStages.map((st, idx) => {
const prevCount = idx === 0 ? st.count : rawStages[idx - 1].count;
const droppedFromPrev = idx === 0 ? 0 : Math.max(0, prevCount - st.count);
const convFromPrev = idx === 0
? 100
: prevCount > 0
? Number(((st.count / prevCount) * 100).toFixed(1))
: 0;
const dropRateFromPrev = idx === 0
? 0
: prevCount > 0
? Number(((droppedFromPrev / prevCount) * 100).toFixed(1))
: 0;
const convFromStart = stage1Count > 0
? Number(((st.count / stage1Count) * 100).toFixed(1))
: 0;
const item = {
...st,
previousCount: prevCount,
advancedCount: st.count,
droppedCount: droppedFromPrev,
conversionFromPrevious: convFromPrev,
dropRateFromPrevious: dropRateFromPrev,
conversionFromStart: convFromStart
};
if (idx > 0 && droppedFromPrev > 0) {
if (!biggestDropStage || droppedFromPrev > biggestDropStage.droppedCount) {
biggestDropStage = {
fromStage: rawStages[idx - 1].label,
toStage: st.label,
droppedCount: droppedFromPrev,
dropRateFromPrevious: dropRateFromPrev
};
}
}
return item;
});
const funnel = {
stages: funnelStages,
biggestDropStage,
note: 'Cobrança gerada (Etapa 5) não é contabilizada como pagamento confirmado (Etapa 6). Pedidos cancelados ou expirados não entram como venda.'
};
const sessionsWithCart = currWin.sessions.filter((s) => s.addedToCart);
const abandonedSessList = sessionsWithCart.filter((s) => !s.orderCreated && !s.paidOrder);
const recoveredSessList = currWin.sessions.filter((s) => s.recoveredCart);
const estimatedAbandonedValue = Number(
abandonedSessList.reduce((acc, s) => acc + (Number(s.cartValueEstimate) || 0), 0).toFixed(2)
);
const abandonmentFrequencyRate = sessionsWithCart.length > 0
? Number(((abandonedSessList.length / sessionsWithCart.length) * 100).toFixed(1))
: 0;
const recoveryRate = (abandonedSessList.length + recoveredSessList.length) > 0
? Number(((recoveredSessList.length / (abandonedSessList.length + recoveredSessList.length)) * 100).toFixed(1))
: 0;
const abandonStageCounts = {};
abandonedSessList.forEach((s) => {
const stg = s.lastStage || 'Na sacola (antes de iniciar o checkout)';
abandonStageCounts[stg] = (abandonStageCounts[stg] || 0) + 1;
});
currWin.orders.filter(isOrderCancelledOrExpired).forEach(() => {
const stg = 'Após gerar cobrança (pedido cancelado ou expirado)';
abandonStageCounts[stg] = (abandonStageCounts[stg] || 0) + 1;
});
const abandonedCarts = {
abandonedCount: abandonedSessList.length,
sessionsWithCartCount: sessionsWithCart.length,
estimatedTotalValue: estimatedAbandonedValue,
abandonmentFrequencyRate,
recoveredCount: recoveredSessList.length,
recoveryRate,
dropByStage: Object.keys(abandonStageCounts)
.map((stage) => ({ stage, count: abandonStageCounts[stage] }))
.sort((a, b) => b.count - a.count),
mostAbandonedProducts: [...allProductMetrics]
.filter((p) => p.abandonedCount > 0)
.sort((a, b) => b.abandonedCount - a.abandonedCount)
};
const searchTermsMap = {};
const zeroResultMap = {};
const filterUsageMap = {};
currWin.events.forEach((ev) => {
if (ev.type === 'search' && ev.query) {
const qNorm = String(ev.query).trim().toLowerCase();
if (!qNorm) return;
if (!searchTermsMap[qNorm]) {
searchTermsMap[qNorm] = { term: ev.query, count: 0, lastResultsCount: Number(ev.resultsCount) || 0 };
}
searchTermsMap[qNorm].count += 1;
if (ev.resultsCount !== undefined) {
searchTermsMap[qNorm].lastResultsCount = Number(ev.resultsCount);
}
if (Number(ev.resultsCount) === 0) {
if (!zeroResultMap[qNorm]) {
zeroResultMap[qNorm] = { term: ev.query, count: 0 };
}
zeroResultMap[qNorm].count += 1;
}
} else if (ev.type === 'filter_use') {
const fKey = `${ev.filterType || 'Filtro'}: ${ev.filterValue || '-'}`;
filterUsageMap[fKey] = (filterUsageMap[fKey] || 0) + 1;
}
});
const searchesAndInterests = {
topSearchTerms: Object.values(searchTermsMap).sort((a, b) => b.count - a.count),
zeroResultSearches: Object.values(zeroResultMap).sort((a, b) => b.count - a.count),
searchedProducts: [...allProductMetrics].filter((p) => p.views > 0).sort((a, b) => b.views - a.views).slice(0, 10),
mostAccessedCategories: [...categoriesList].sort((a, b) => (b.categoryAccessClicks + b.views) - (a.categoryAccessClicks + a.views)),
mostUsedFilters: Object.keys(filterUsageMap)
.map((label) => ({ label, count: filterUsageMap[label] }))
.sort((a, b) => b.count - a.count),
mostWishlistedProducts: [...allProductMetrics]
.filter((p) => p.wishlistedCount > 0)
.sort((a, b) => b.wishlistedCount - a.wishlistedCount),
mostSharedProducts: [...allProductMetrics]
.filter((p) => p.sharedCount > 0)
.sort((a, b) => b.sharedCount - a.sharedCount)
};
const paidOrders = currWin.orders.filter(isOrdertrulyPaid);
const awaitingOrders = currWin.orders.filter(isOrderAwaitingPayment);
const cancelledOrders = currWin.orders.filter(isOrderCancelledOrExpired);
const refundedOrders = currWin.orders.filter((o) => o && o.paymentStatus === 'refunded');
const createdOrdersValue = Number(currWin.orders.reduce((acc, o) => acc + (Number(o.total) || 0), 0).toFixed(2));
const awaitingPaymentValue = Number(awaitingOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0).toFixed(2));
const paidConfirmedValue = Number(paidOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0).toFixed(2));
const cancelledOrdersValue = Number(cancelledOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0).toFixed(2));
const refundedValue = Number(refundedOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0).toFixed(2));
const averageTicket = paidOrders.length > 0
? Number((paidConfirmedValue / paidOrders.length).toFixed(2))
: 0;
const couponMap = {};
allCoupons.forEach((cp) => {
if (!cp || !cp.code) return;
couponMap[cp.code.toUpperCase()] = {
code: cp.code.toUpperCase(),
description: cp.description || '',
ordersCount: 0,
paidOrdersCount: 0,
discountTotal: 0,
paidRevenueGenerated: 0
};
});
currWin.orders.forEach((o) => {
const code = String(o.couponCode || '').trim().toUpperCase();
if (!code) return;
if (!couponMap[code]) {
couponMap[code] = { code, description: 'Cupom aplicado', ordersCount: 0, paidOrdersCount: 0, discountTotal: 0, paidRevenueGenerated: 0 };
}
couponMap[code].ordersCount += 1;
if (isOrdertrulyPaid(o)) {
couponMap[code].paidOrdersCount += 1;
couponMap[code].discountTotal = Number((couponMap[code].discountTotal + (Number(o.discount) || 0)).toFixed(2));
couponMap[code].paidRevenueGenerated = Number((couponMap[code].paidRevenueGenerated + (Number(o.total) || 0)).toFixed(2));
}
});
const dailyMap = {};
const dayStepMs = 24 * 60 * 60 * 1000;
const maxDays = Math.min(92, Math.max(1, Math.ceil((bounds.endMs - bounds.startMs) / dayStepMs)));
for (let i = maxDays - 1; i >= 0; i--) {
const d = new Date(bounds.endMs - i * dayStepMs);
const key = d.toISOString().slice(0, 10);
dailyMap[key] = { date: key, visits: 0, ordersCreated: 0, ordersPaid: 0, revenuePaid: 0, conversionRate: 0 };
}
currWin.sessions.forEach((s) => {
const k = String(s.startedAt || '').slice(0, 10);
if (dailyMap[k]) dailyMap[k].visits += 1;
});
currWin.orders.forEach((o) => {
const k = String(o.createdAt || '').slice(0, 10);
if (!dailyMap[k]) {
dailyMap[k] = { date: k, visits: 0, ordersCreated: 0, ordersPaid: 0, revenuePaid: 0, conversionRate: 0 };
}
dailyMap[k].ordersCreated += 1;
if (isOrdertrulyPaid(o)) {
dailyMap[k].ordersPaid += 1;
dailyMap[k].revenuePaid = Number((dailyMap[k].revenuePaid + (Number(o.total) || 0)).toFixed(2));
}
});
const dailySeries = Object.values(dailyMap)
.sort((a, b) => a.date.localeCompare(b.date))
.map((d) => {
const denom = Math.max(d.visits, d.ordersCreated, 1);
d.conversionRate = (d.visits > 0 || d.ordersPaid > 0) ? Number(((d.ordersPaid / denom) * 100).toFixed(1)) : 0;
return d;
});
const salesAndRevenue = {
ordersCreatedCount: currWin.orders.length,
ordersPaidCount: paidOrders.length,
ordersAwaitingPaymentCount: awaitingOrders.length,
ordersCancelledCount: cancelledOrders.length,
refundedOrdersCount: refundedOrders.length,
confirmedRevenue: paidConfirmedValue,
averageTicket,
financialBuckets: {
createdOrdersValue,
awaitingPaymentValue,
paidConfirmedValue,
cancelledOrdersValue,
refundedValue
},
topSellingProducts: productsRankings.mostPurchased.slice(0, 8),
topRevenueCategories: [...categoriesList].sort((a, b) => b.paidRevenue - a.paidRevenue),
couponsUsed: Object.values(couponMap).sort((a, b) => b.paidOrdersCount - a.paidOrdersCount || b.ordersCount - a.ordersCount),
dailySeries
};
const hoursArr = Array.from({ length: 24 }, (_, h) => ({
hour: h,
label: String(h).padStart(2, '0') + 'h',
visits: 0,
paidOrders: 0,
abandonedCarts: 0,
conversionRate: 0
}));
const weekdayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const weekdaysArr = weekdayNames.map((name, idx) => ({
dayIndex: idx,
name,
visits: 0,
paidOrders: 0,
paidRevenue: 0,
conversionRate: 0
}));
currWin.sessions.forEach((s) => {
const dt = new Date(s.startedAt);
if (isNaN(dt.getTime())) return;
const h = dt.getHours();
const w = dt.getDay();
hoursArr[h].visits += 1;
if (s.addedToCart && !s.orderCreated && !s.paidOrder) {
hoursArr[h].abandonedCarts += 1;
}
weekdaysArr[w].visits += 1;
});
paidOrders.forEach((o) => {
const dt = new Date(o.paidAt || o.createdAt);
if (isNaN(dt.getTime())) return;
const h = dt.getHours();
const w = dt.getDay();
hoursArr[h].paidOrders += 1;
weekdaysArr[w].paidOrders += 1;
weekdaysArr[w].paidRevenue = Number((weekdaysArr[w].paidRevenue + (Number(o.total) || 0)).toFixed(2));
});
hoursArr.forEach((hr) => {
const denom = Math.max(hr.visits, hr.paidOrders, 1);
hr.conversionRate = (hr.visits > 0 || hr.paidOrders > 0) ? Number(((hr.paidOrders / denom) * 100).toFixed(1)) : 0;
});
weekdaysArr.forEach((wd) => {
const denom = Math.max(wd.visits, wd.paidOrders, 1);
wd.conversionRate = (wd.visits > 0 || wd.paidOrders > 0) ? Number(((wd.paidOrders / denom) * 100).toFixed(1)) : 0;
});
const peakVisitHour = [...hoursArr].sort((a, b) => b.visits - a.visits)[0];
const peakConversionHour = [...hoursArr].sort((a, b) => b.conversionRate - a.conversionRate || b.paidOrders - a.paidOrders)[0];
const peakAbandonHour = [...hoursArr].sort((a, b) => b.abandonedCarts - a.abandonedCarts)[0];
const peakVisitDay = [...weekdaysArr].sort((a, b) => b.visits - a.visits)[0];
const peakSalesDay = [...weekdaysArr].sort((a, b) => b.paidOrders - a.paidOrders || b.paidRevenue - a.paidRevenue)[0];
const peakTimesAndDays = {
byHour: hoursArr,
byDayOfWeek: weekdaysArr,
highlights: {
peakVisitHour: peakVisitHour && peakVisitHour.visits > 0 ? `${peakVisitHour.label} (${peakVisitHour.visits} visita(s))` : 'Aguardando volume de visitas',
peakConversionHour: peakConversionHour && peakConversionHour.paidOrders > 0 ? `${peakConversionHour.label} (${peakConversionHour.conversionRate}% de conversão)` : 'Aguardando pedidos pagos no período',
peakAbandonHour: peakAbandonHour && peakAbandonHour.abandonedCarts > 0 ? `${peakAbandonHour.label} (${peakAbandonHour.abandonedCarts} sacola(s) abandonada(s))` : 'Sem picos de abandono registrados',
peakVisitDay: peakVisitDay && peakVisitDay.visits > 0 ? `${peakVisitDay.name} (${peakVisitDay.visits} acesso(s))` : 'Aguardando volume semanal',
peakSalesDay: peakSalesDay && peakSalesDay.paidOrders > 0 ? `${peakSalesDay.name} (${peakSalesDay.paidOrders} venda(s) paga(s))` : 'Aguardando vendas pagas no período'
}
};
const recommendations = [];
const highViewLowSaleCandidate = productsRankings.highViewsLowSales.find((p) => p.views >= 1 && p.paidUnits === 0) || productsRankings.mostViewed[0];
if (highViewLowSaleCandidate) {
recommendations.push({
id: 'rec-high-view-low-sale',
category: 'Conversão de Produto & Fotos/Preço',
title: `Atenção em "${highViewLowSaleCandidate.name}": interesse vs. conversão`,
observed: highViewLowSaleCandidate.views > 0
? `A peça "${highViewLowSaleCandidate.name}" recebeu visualizações no período, mas registrou ${highViewLowSaleCandidate.paidUnits} venda(s) paga(s).`
: `A peça "${highViewLowSaleCandidate.name}" está publicada no catálogo a R$ ${highViewLowSaleCandidate.price.toFixed(2)} e ainda acumula ${highViewLowSaleCandidate.views} visualizações registradas desde o início da coleta.`,
supportingData: `${highViewLowSaleCandidate.views} visualização(ões), ${highViewLowSaleCandidate.cartAdditions} adição(ões) à sacola, ${highViewLowSaleCandidate.paidUnits} venda(s) paga(s) e estoque atual de ${highViewLowSaleCandidate.stock} un.`,
recommendedAction: 'Revisar a foto de capa, detalhar medidas/caimento na descrição e avaliar destaque promocional ou ajuste de posicionamento na vitrine.',
metricToTrack: 'Taxa de conversão do produto (Visualizações → Adições à Sacola → Vendas Pagas) nos próximos 7 e 15 dias.'
});
}
const highCartLowBuyCandidate = productsRankings.highCartLowPurchase.find((p) => p.cartAdditions > p.paidUnits);
if (highCartLowBuyCandidate || biggestDropStage) {
recommendations.push({
id: 'rec-checkout-drop',
category: 'Funil de Compras & Sacolas Abandonadas',
title: biggestDropStage
? `Maior perda identificada entre "${biggestDropStage.fromStage}" e "${biggestDropStage.toStage}"`
: 'Acompanhamento de sacolas iniciadas até o pagamento',
observed: biggestDropStage
? `Houve desistência de ${biggestDropStage.droppedCount} sessão(ões) (${biggestDropStage.dropRateFromPrevious}% de queda) na transição para "${biggestDropStage.toStage}".`
: `Foram registradas ${abandonedCarts.abandonedCount} sacola(s) abandonada(s) no período selecionado.`,
supportingData: highCartLowBuyCandidate
? `Produto "${highCartLowBuyCandidate.name}" teve ${highCartLowBuyCandidate.cartAdditions} adição(ões) à sacola e ${highCartLowBuyCandidate.paidUnits} compra(s) paga(s). Valor estimado em sacolas abandonadas: R$ ${abandonedCarts.estimatedTotalValue.toFixed(2)}.`
: `Sessões iniciadas: ${currOverview.sessionsStarted} | Checkouts iniciados: ${currOverview.checkoutsStarted} | Pedidos pagos: ${currOverview.ordersPaid}.`,
recommendedAction: 'Verificar clareza dos prazos/opções de entrega para Itaperuna e região e manter o Pix Automático e o atendimento via WhatsApp visíveis no checkout.',
metricToTrack: 'Redução na taxa de abandono de sacola (%) e evolução de "Gerou cobrança → Pagou" no Funil de Compras.'
});
}
if (mostInterestCategory) {
const unfeaturedStar = allProductMetrics.find((p) => !p.featured && (p.views > 0 || p.paidUnits > 0)) || allProductMetrics.find((p) => !p.featured);
recommendations.push({
id: 'rec-category-and-home-highlight',
category: 'Vitrine Inicial & Categorias',
title: `Destaque para a categoria "${mostInterestCategory.name}"${unfeaturedStar ? ` e peça "${unfeaturedStar.name}"` : ''}`,
observed: `A categoria "${mostInterestCategory.name}" concentra indicadores de procura/receita no catálogo${unfeaturedStar ? `, enquanto "${unfeaturedStar.name}" ainda não está marcada como destaque na página inicial` : ''}.`,
supportingData: `Categoria "${mostInterestCategory.name}": ${mostInterestCategory.views} visualização(ões), ${mostInterestCategory.cartAdditions} adição(ões) à sacola e R$ ${mostInterestCategory.paidRevenue.toFixed(2)} em vendas pagas.`,
recommendedAction: unfeaturedStar
? `Avaliar marcar "${unfeaturedStar.name}" como Destaque na Página Inicial e posicionar "${mostInterestCategory.name}" nas primeiras posições da vitrine.`
: `Manter a categoria "${mostInterestCategory.name}" abastecida com grade completa (P, M, G, GG) e fotos editoriais atualizadas.`,
metricToTrack: 'Cliques em detalhes e adições à sacola dos produtos exibidos na seção Destaques da Página Inicial.'
});
}
const lowStockProduct = [...allProductMetrics].sort((a, b) => a.stock - b.stock).find((p) => p.stock <= 5);
if (lowStockProduct) {
recommendations.push({
id: 'rec-low-stock',
category: 'Estoque & Reposição de Grade',
title: `Estoque reduzido para "${lowStockProduct.name}" (${lowStockProduct.stock} un. restantes)`,
observed: `A peça "${lowStockProduct.name}" possui apenas ${lowStockProduct.stock} unidade(s) somando suas variações de cor e tamanho.`,
supportingData: `Estoque total atual: ${lowStockProduct.stock} un. | Preço ativo: R$ ${lowStockProduct.price.toFixed(2)} | Visualizações no período: ${lowStockProduct.views}.`,
recommendedAction: 'Programar reposição dos tamanhos mais procurados (P, M, G) ou destacar "Últimas Peças" para acelerar o giro do saldo.',
metricToTrack: 'Disponibilidade de grade por tamanho e quantidade de vendas perdidas por variação esgotada.'
});
}
const zeroViewProducts = allProductMetrics.filter((p) => p.views === 0);
if (zeroViewProducts.length > 0) {
const sampleNames = zeroViewProducts.slice(0, 3).map((p) => p.name).join(', ');
recommendations.push({
id: 'rec-low-visibility-products',
category: 'Exposição de Catálogo',
title: `${zeroViewProducts.length} peça(s) sem visualizações registradas no período`,
observed: `Identificamos ${zeroViewProducts.length} produto(s) ativos no catálogo que ainda não receberam cliques de visualização no período selecionado.`,
supportingData: `Exemplos: ${sampleNames} (0 visualizações registradas no filtro "${bounds.label}").`,
recommendedAction: 'Compartilhar o link direto dessas peças nos Stories do Instagram/WhatsApp com parâmetros UTM (ex.: ?utm_source=instagram&utm_campaign=vitrine) para gerar tráfego qualificado.',
metricToTrack: 'Aumento de visualizações únicas de produto e visitas vindas do canal Instagram/WhatsApp.'
});
}
const topCoupon = salesAndRevenue.couponsUsed[0];
recommendations.push({
id: 'rec-coupons-and-peak-hours',
category: 'Campanhas, Cupons & Horários de Movimento',
title: 'Aproveitamento de cupons promocionais e horários de maior acesso',
observed: topCoupon && topCoupon.ordersCount > 0
? `O cupom "${topCoupon.code}" foi utilizado em ${topCoupon.ordersCount} pedido(s) (${topCoupon.paidOrdersCount} pago(s)). Horário de maior movimento: ${peakTimesAndDays.highlights.peakVisitHour}.`
: `Os cupons cadastrados (${allCoupons.map((c) => c.code).join(', ') || 'BEMVINDO10'}) ainda tiveram ${topCoupon ? topCoupon.paidOrdersCount : 0} conversão(ões) paga(s) no período. Horário de destaque: ${peakTimesAndDays.highlights.peakVisitHour}.`,
supportingData: `Faturamento pago com cupons: R$ ${(topCoupon ? topCoupon.paidRevenueGenerated : 0).toFixed(2)} | Dia de maior acesso: ${peakTimesAndDays.highlights.peakVisitDay}.`,
recommendedAction: 'Divulgar o cupom de primeira compra (BEMVINDO10) nos horários de maior tráfego e acompanhar buscas sem resultado para planejar novas coleções.',
metricToTrack: 'Quantidade de pedidos pagos com cupom e ticket médio dos pedidos promocionais.'
});
return {
ok: true,
generatedAt: new Date().toISOString(),
period: bounds,
privacyAndReliability: {
collectionStartedAt: an.collectionStartedAt,
retentionDays: an.retentionDays || 180,
botsFilteredCount: an.botsFilteredCount || 0,
duplicateRefreshesIgnored: an.duplicateRefreshesIgnored || 0,
lgpdCompliant: true,
noFingerprinting: true,
approximateLocationOnly: true,
historicalNotice: `Coleta de eventos de navegação iniciada em ${new Date(an.collectionStartedAt).toLocaleString('pt-BR')}. Dados não são inventados: visitas e cliques refletem exclusivamente eventos reais registrados a partir desta data, e o faturamento reflete apenas pedidos com pagamento efetivamente confirmado.`
},
overview: {
current: currOverview,
previous: prevOverview,
deltas,
definitions: [
{ term: 'Visitantes únicos (Estimados vs. Contas)', definition: 'Visitantes únicos estimados por identificador pseudônimo de primeiro nível no navegador, diferenciados das clientes efetivamente autenticadas em uma conta.' },
{ term: 'Sessões iniciadas', definition: 'Período contínuo de navegação de uma visitante (janela de 30 minutos). Atualizar a página (F5) não gera nova sessão nem duplica visitas.' },
{ term: 'Visualizações de páginas vs. Produtos', definition: 'Visualização de página conta a abertura de telas (Início, Catálogo, Minha Conta); visualização de produto conta a abertura de uma peça específica.' },
{ term: 'Cobrança gerada vs. Pedido pago', definition: 'Cobrança gerada indica emissão de QR Code Pix ou registro de pedido; somente pedidos com confirmação real de pagamento entram em Pedidos Pagos e Faturamento Confirmado.' }
]
},
origins,
devices,
productsRankings,
categoriesAnalysis,
funnel,
abandonedCarts,
searchesAndInterests,
salesAndRevenue,
peakTimesAndDays,
recommendations
};
}
function generateAnalyticsCsv(report, section = 'all') {
const lines = [];
const esc = (v) => `"${String(v === null || v === undefined ? '' : v).replace(/"/g, '""')}"`;
lines.push(['RELATORIO DE ANALISE DA LOJA - BY ANGELY', report.period.label, 'Gerado em: ' + report.generatedAt].map(esc).join(';'));
lines.push(['Inicio da Coleta', report.privacyAndReliability.collectionStartedAt, 'Conformidade LGPD: Ativa'].map(esc).join(';'));
lines.push('');
if (section === 'all' || section === 'overview') {
lines.push(['1. VISAO GERAL - DESEMPENHO DA LOJA'].map(esc).join(';'));
lines.push(['Indicador', 'Periodo Atual', 'Periodo Anterior Equivalente', 'Variacao (%)'].map(esc).join(';'));
const cur = report.overview.current;
const prv = report.overview.previous;
const dlt = report.overview.deltas;
const rows = [
['Visitantes unicos estimados', cur.uniqueVisitors, prv.uniqueVisitors, dlt.uniqueVisitors + '%'],
['Clientes identificadas por conta', cur.identifiedAccounts, prv.identifiedAccounts, dlt.identifiedAccounts + '%'],
['Total de visitas', cur.totalVisits, prv.totalVisits, dlt.totalVisits + '%'],
['Sessoes iniciadas', cur.sessionsStarted, prv.sessionsStarted, dlt.sessionsStarted + '%'],
['Visitantes novos', cur.newVisitors, prv.newVisitors, dlt.newVisitors + '%'],
['Visitantes recorrentes', cur.returningVisitors, prv.returningVisitors, dlt.returningVisitors + '%'],
['Visualizacoes de paginas', cur.pageViews, prv.pageViews, dlt.pageViews + '%'],
['Visualizacoes de produtos', cur.productViews, prv.productViews, dlt.productViews + '%'],
['Produtos adicionados a sacola', cur.addedToCart, prv.addedToCart, dlt.addedToCart + '%'],
['Sacolas abandonadas', cur.abandonedCarts, prv.abandonedCarts, dlt.abandonedCarts + '%'],
['Checkouts iniciados', cur.checkoutsStarted, prv.checkoutsStarted, dlt.checkoutsStarted + '%'],
['Pedidos realizados', cur.ordersCreated, prv.ordersCreated, dlt.ordersCreated + '%'],
['Pedidos pagos', cur.ordersPaid, prv.ordersPaid, dlt.ordersPaid + '%'],
['Pedidos cancelados', cur.ordersCancelled, prv.ordersCancelled, dlt.ordersCancelled + '%'],
['Taxa de conversao (%)', cur.conversionRate + '%', prv.conversionRate + '%', dlt.conversionRate + '%'],
['Faturamento confirmado (R$)', cur.confirmedRevenue.toFixed(2), prv.confirmedRevenue.toFixed(2), dlt.confirmedRevenue + '%']
];
rows.forEach((r) => lines.push(r.map(esc).join(';')));
lines.push('');
}
if (section === 'all' || section === 'funnel') {
lines.push(['6. FUNIL DE COMPRAS'].map(esc).join(';'));
lines.push(['Etapa', 'Pessoas na Etapa', 'Desistencias da Etapa Anterior', 'Conversao da Etapa Anterior (%)', 'Conversao Acumulada (%)'].map(esc).join(';'));
report.funnel.stages.forEach((st) => {
lines.push([st.label, st.count, st.droppedCount, st.conversionFromPrevious + '%', st.conversionFromStart + '%'].map(esc).join(';'));
});
lines.push('');
}
if (section === 'all' || section === 'products') {
lines.push(['4. DESEMPENHO DE PRODUTOS'].map(esc).join(';'));
lines.push(['SKU', 'Produto', 'Categoria', 'Visualizacoes', 'Visitantes Unicos', 'Cliques Detalhes', 'Adicoes Sacola', 'Pedidos Criados', 'Vendas Pagas (Un)', 'Receita Paga (R$)', 'Taxa Conversao (%)'].map(esc).join(';'));
report.productsRankings.mostViewed.forEach((p) => {
lines.push([p.sku, p.name, p.categoryName, p.views, p.uniqueViewers, p.detailClicks, p.cartAdditions, p.ordersCount, p.paidUnits, p.paidRevenue.toFixed(2), p.conversionRate + '%'].map(esc).join(';'));
});
lines.push('');
}
if (section === 'all' || section === 'categories') {
lines.push(['5. DESEMPENHO POR CATEGORIA'].map(esc).join(';'));
lines.push(['Categoria', 'Visualizacoes', 'Adicoes a Sacola', 'Pedidos Criados', 'Vendas Pagas', 'Faturamento Confirmado (R$)', 'Conversao (%)'].map(esc).join(';'));
report.categoriesAnalysis.categories.forEach((c) => {
lines.push([c.name, c.views, c.cartAdditions, c.ordersCount, c.paidSalesCount, c.paidRevenue.toFixed(2), c.conversionRate + '%'].map(esc).join(';'));
});
lines.push('');
}
return '\uFEFF' + lines.join('\r\n');
}
const _v5ApprovePixOrderPayment = approvePixOrderPayment;
approvePixOrderPayment = function (opts) {
const res = _v5ApprovePixOrderPayment(opts);
if (res && res.ok && !res.alreadyPaid && opts && opts.order) {
try {
recordOrderLifecycleAnalytics('order_paid', opts.order, { amount: opts.paidAmount || opts.order.total });
} catch (e) {}
}
return res;
};
db = repairDatabaseState(db);
ensureAnalyticsObject();
const _v5OrigRequestListener = server.listeners('request')[0];
server.removeAllListeners('request');
server.on('request', async (req, res) => {
setCorsAndSecurityHeaders(res);
if (req.method === 'OPTIONS') {
res.writeHead(204);
return res.end();
}
const parsedUrl = url.parse(req.url, true);
const pathname = parsedUrl.pathname || '/';
if (pathname === '/api/state' && req.method === 'GET') {
await processExpiredPixOrders();
const isAdmin = Boolean(req.headers['x-admin-role'] || req.headers['x-admin-token'] || parsedUrl.query.admin === '1');
const customerEmail = req.headers['x-customer-email'] || parsedUrl.query.customerEmail || '';
return sendJson(res, 200, sanitizeDbForPublic(db, { isAdmin, customerEmail }));
}
if (pathname === '/api/state' && req.method === 'POST') {
try {
const incoming = await parseBody(req);
if (incoming && typeof incoming === 'object' && incoming.storeSettings) {
const existingById = new Map((db.customers || []).map((c) => [String(c.id || ''), c]));
const existingByEmail = new Map((db.customers || []).map((c) => [String(c.email || '').toLowerCase(), c]));
const mergedCustomers = Array.isArray(incoming.customers)
? incoming.customers.map((c) => {
const prev = existingById.get(String(c.id || '')) || existingByEmail.get(String(c.email || '').toLowerCase());
const isDeleted = (prev && prev.accountStatus === 'deleted_anonymized') || c.accountStatus === 'deleted_anonymized';
return {
...(prev || {}),
...c,
accountStatus: c.accountStatus || (prev && prev.accountStatus) || 'active',
deletedEmailHash: (prev && prev.deletedEmailHash) || c.deletedEmailHash || undefined,
passwordHash: isDeleted ? null : (c.passwordHash || (prev && prev.passwordHash) || (c.password ? hashPassword(c.password) : undefined)),
sessionToken: isDeleted || c.accountStatus === 'blocked' ? null : (c.sessionToken || (prev && prev.sessionToken) || generateToken('cust'))
};
})
: db.customers;
const isAdminReq = Boolean(req.headers['x-admin-role'] || req.headers['x-admin-token']);
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
paidAt: srvOrd.paidAt,
cancellationRequest: srvOrd.cancellationRequest || incOrd.cancellationRequest
};
}
return incOrd;
});
}
}
const serverAudit = Array.isArray(db.auditLog) ? db.auditLog : [];
const incomingAudit = Array.isArray(incoming.auditLog) ? incoming.auditLog : [];
const seenAuditIds = new Set();
const mergedAuditLog = [];
[...incomingAudit, ...serverAudit].forEach((entry) => {
if (!entry) return;
const key = entry.id || `${entry.date || entry.timestamp}_${entry.action}_${entry.user}`;
if (!seenAuditIds.has(key)) {
seenAuditIds.add(key);
mergedAuditLog.push(entry);
}
});
db = repairDatabaseState({
...db,
...incoming,
customers: mergedCustomers,
orders: mergedOrders,
pixCharges: Array.isArray(incoming.pixCharges) && isAdminReq ? incoming.pixCharges : (db.pixCharges || []),
processedWebhooks: db.processedWebhooks || [],
financialEvents: db.financialEvents || [],
stockMovements: db.stockMovements || [],
cancellationRequests: Array.isArray(incoming.cancellationRequests) && isAdminReq ? incoming.cancellationRequests : (db.cancellationRequests || []),
auditLog: mergedAuditLog.slice(0, 500),
adminNotifications: Array.isArray(incoming.adminNotifications) && isAdminReq ? incoming.adminNotifications : (db.adminNotifications || []),
analytics: db.analytics,
updatedAt: new Date().toISOString()
});
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
if (existing.accountStatus === 'blocked') {
return sendJson(res, 403, {
ok: false,
code: 'ACCOUNT_BLOCKED',
error: 'Esta conta encontra-se bloqueada pela administração da loja.'
});
}
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
const nowIso = new Date().toISOString();
const newCust = {
id: 'cust-' + Date.now(),
name,
email,
phone,
cpf,
accountStatus: 'active',
passwordHash: hashPassword(password),
sessionToken: generateToken('cust'),
marketingOptIn: Boolean(body.marketingOptIn),
addresses: addressObj.street ? [addressObj] : [],
savedCart: Array.isArray(body.cart) ? body.cart : [],
createdAt: nowIso,
updatedAt: nowIso,
lastActivityAt: nowIso
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
const emailHash = hashPassword(email);
const cust = (db.customers || []).find(
(c) =>
c &&
(String(c.email || '').trim().toLowerCase() === email ||
(c.deletedEmailHash && c.deletedEmailHash === emailHash))
);
if (!cust) {
return sendJson(res, 401, { ok: false, error: 'E-mail ou senha inválidos.' });
}
if (cust.accountStatus === 'deleted_anonymized') {
return sendJson(res, 403, {
ok: false,
code: 'ACCOUNT_DELETED',
accountStatus: 'deleted_anonymized',
error: 'Esta conta foi excluída e encerrada. Não é possível realizar login em uma conta excluída.'
});
}
if (cust.accountStatus === 'blocked') {
return sendJson(res, 403, {
ok: false,
code: 'ACCOUNT_BLOCKED',
accountStatus: 'blocked',
error: 'Sua conta está bloqueada para acesso e novas compras. Entre em contato com o atendimento da BY ANGÉLY.'
});
}
const passHash = hashPassword(password);
const validPass =
(cust.passwordHash && cust.passwordHash === passHash) ||
(cust.password && cust.password === password);
if (!validPass) {
return sendJson(res, 401, { ok: false, error: 'E-mail ou senha inválidos.' });
}
const nowIso = new Date().toISOString();
cust.passwordHash = passHash;
delete cust.password;
cust.sessionToken = cust.sessionToken || generateToken('cust');
cust.lastLoginAt = nowIso;
cust.lastActivityAt = nowIso;
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
if (cust.accountStatus === 'blocked' || cust.accountStatus === 'deleted_anonymized') {
return sendJson(res, 403, { ok: false, error: 'Não é possível recuperar a senha desta conta.' });
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
if (cust.accountStatus === 'blocked' || cust.accountStatus === 'deleted_anonymized') {
return sendJson(res, 403, { ok: false, error: 'Sua conta não está ativa para alterações.' });
}
if (body.name) cust.name = String(body.name).trim();
if (body.email) {
const nextEmail = String(body.email).trim().toLowerCase();
if (!nextEmail.includes('@')) {
return sendJson(res, 400, { ok: false, error: 'Informe um endereço de e-mail válido.' });
}
if (nextEmail !== String(cust.email || '').trim().toLowerCase()) {
const emailTaken = (db.customers || []).some(
(c) => c && c.id !== cust.id && String(c.email || '').trim().toLowerCase() === nextEmail
);
if (emailTaken) {
return sendJson(res, 409, { ok: false, error: 'Este e-mail já está em uso por outra conta.' });
}
cust.email = nextEmail;
}
}
if (body.phone !== undefined) cust.phone = String(body.phone).trim();
if (body.cpf !== undefined) cust.cpf = String(body.cpf).trim();
if (typeof body.marketingOptIn === 'boolean') cust.marketingOptIn = body.marketingOptIn;
if (body.newPassword) {
const newPass = String(body.newPassword);
if (newPass.length < 6) {
return sendJson(res, 400, { ok: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' });
}
if (body.currentPassword && cust.passwordHash) {
const currHash = hashPassword(String(body.currentPassword));
const validCurr = cust.passwordHash === currHash || (cust.password && cust.password === body.currentPassword);
if (!validCurr) {
return sendJson(res, 401, { ok: false, error: 'A senha atual informada está incorreta.' });
}
}
cust.passwordHash = hashPassword(newPass);
delete cust.password;
}
if (Array.isArray(body.addresses)) {
cust.addresses = body.addresses;
}
if (Array.isArray(body.savedCart)) {
cust.savedCart = body.savedCart;
}
const nowIso = new Date().toISOString();
cust.updatedAt = nowIso;
cust.lastActivityAt = nowIso;
saveDatabase(db);
return sendJson(res, 200, {
ok: true,
customer: sanitizeCustomerForClient(cust)
});
} catch (err) {
return sendJson(res, 400, { ok: false, error: err.message });
}
}
if (pathname === '/api/orders' && req.method === 'POST') {
try {
await processExpiredPixOrders();
const body = await parseBody(req);
const cust = getAuthenticatedCustomerFromReq(req, body.customer || body);
if (!cust) {
return sendJson(res, 401, {
ok: false,
code: 'AUTH_REQUIRED',
error: 'Para realizar sua compra, entre na sua conta ou crie seu cadastro. Assim, seus dados ficam salvos para facilitar suas próximas compras.'
});
}
if (cust.accountStatus === 'blocked') {
return sendJson(res, 403, {
ok: false,
code: 'ACCOUNT_BLOCKED',
error: 'Sua conta está bloqueada para novas compras. Entre em contato com o atendimento da BY ANGÉLY.'
});
}
if (cust.accountStatus === 'deleted_anonymized') {
return sendJson(res, 403, {
ok: false,
code: 'ACCOUNT_DELETED',
error: 'Esta conta foi encerrada e excluída. Não é possível realizar compras com uma conta excluída.'
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
newOrder.analyticsSessionId = String(body.sessionId || body.analyticsSessionId || '');
  
newOrder.analyticsVisitorId = String(body.visitorId || body.analyticsVisitorId || '');
db.orders.unshift(newOrder);
if (typeof recordOrderLifecycleAnalytics === 'function') {
recordOrderLifecycleAnalytics('order_created', newOrder, {
sessionId: newOrder.analyticsSessionId,
visitorId: newOrder.analyticsVisitorId,
chargeGenerated: Boolean(newCharge || isPixOrder)
});
}
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
if (pathname === '/api/admin/login' && req.method === 'POST') {
try {
const body = await parseBody(req);
const email = String(body.email || '').trim().toLowerCase();
const password = String(body.password || '');
db.adminUsers = Array.isArray(db.adminUsers) ? db.adminUsers : [];
if (!db.adminUsers.some((u) => u && String(u.email || '').toLowerCase() === 'byangely1@gmail.com')) {
db.adminUsers.unshift({
id: 'admin-owner-official',
name: 'Proprietária BY ANGÉLY',
email: 'byangely1@gmail.com',
role: 'owner',
roleLabel: 'Proprietária (Acesso Total)',
permissions: ['products', 'categories', 'orders', 'customers', 'payments', 'shipping', 'branding', 'policies', 'users'],
passwordHash: hashPassword('Angely@2026'),
active: true
});
}
const adminUser = db.adminUsers.find((u) => u && String(u.email || '').toLowerCase() === email && u.active !== false);
if (!adminUser || !verifyAdminPassword(adminUser, password)) {
appendServerAuditLog(
'TENTATIVA_LOGIN_ADMIN_FALHA',
email || 'Desconhecido',
'Painel Administrativo',
`Tentativa de login administrativo recusada para o e-mail ${email || '(vazio)'}.`
);
saveDatabase(db);
return sendJson(res, 401, { ok: false, error: 'Credenciais administrativas inválidas ou acesso revogado.' });
}
adminUser.sessionToken = generateToken('adm');
adminUser.lastLoginAt = new Date().toISOString();
appendServerAuditLog(
'LOGIN_ADMIN_SUCESSO',
`${adminUser.name} (${adminUser.email})`,
'Painel Administrativo',
`Acesso administrativo autenticado com perfil "${adminUser.roleLabel || adminUser.role}".`
);
saveDatabase(db);
const safeAdmin = { ...adminUser };
delete safeAdmin.passwordHash;
delete safeAdmin.customPassword;
return sendJson(res, 200, {
ok: true,
admin: safeAdmin,
token: adminUser.sessionToken
});
} catch (err) {
return sendJson(res, 400, { ok: false, error: err.message });
}
}
if (pathname === '/api/admin/payment-settings' && req.method === 'POST') {
try {
const body = await parseBody(req);
const adminUser = getAuthenticatedAdminFromReq(req, body);
if (!adminUser || !hasAdminPermission(adminUser, 'payments')) {
return sendJson(res, 403, { ok: false, error: 'Permissão administrativa necessária para alterar configurações de pagamento.' });
}
  
db.paymentSettings = db.paymentSettings || {};
db.paymentSettings.paymentConfigVersion = 4;
if (body.toggleMethod && db.paymentSettings[body.toggleMethod]) {
const mKey = String(body.toggleMethod);
const nextEnabled = typeof body.enabled === 'boolean' ? body.enabled : !db.paymentSettings[mKey].enabled;
db.paymentSettings[mKey].enabled = nextEnabled;
appendServerAuditLog(
nextEnabled ? 'FORMA_PAGAMENTO_ATIVADA' : 'FORMA_PAGAMENTO_DESATIVADA',
`${adminUser.name} (${adminUser.email})`,
`Pagamento: ${mKey}`,
`Forma de pagamento "${mKey}" ${nextEnabled ? 'ATIVADA' : 'DESATIVADA'} no checkout.`
);
}
if (body.paymentSettings && typeof body.paymentSettings === 'object') {
const incPay = body.paymentSettings;
['whatsapp', 'pix', 'creditCard', 'debitCard', 'payOnPickup'].forEach((k) => {
if (incPay[k] && typeof incPay[k] === 'object') {
db.paymentSettings[k] = {
...(db.paymentSettings[k] || {}),
...incPay[k]
};
}
});
db.paymentSettings.paymentConfigVersion = 4;
appendServerAuditLog(
'CONFIG_PAGAMENTOS_ATUALIZADA',
`${adminUser.name} (${adminUser.email})`,
'Configurações de Venda e Pagamento',
`Configurações atualizadas (Pix ativo: ${Boolean(db.paymentSettings.pix && db.paymentSettings.pix.enabled)}, Chave Pix: ${db.paymentSettings.pix ? db.paymentSettings.pix.pixKey : '-'}, WhatsApp ativo: ${Boolean(db.paymentSettings.whatsapp && db.paymentSettings.whatsapp.enabled)}).`
);
}
saveDatabase(db);
return sendJson(res, 200, {
ok: true,
paymentSettings: db.paymentSettings
});
} catch (err) {
return sendJson(res, 400, { ok: false, error: err.message });
}
}
const cancelOrderMatch = pathname.match(/^\/api\/orders\/([^\/]+)\/cancel$/);
if (cancelOrderMatch && req.method === 'POST') {
try {
await processExpiredPixOrders();
const orderIdOrNumber = decodeURIComponent(cancelOrderMatch[1]);
const body = await parseBody(req);
const cust = getAuthenticatedCustomerFromReq(req, body.customer || body);
if (!cust) {
return sendJson(res, 401, { ok: false, error: 'Sessão não autenticada. Faça login para gerenciar seus pedidos.' });
}
const ord = (db.orders || []).find((o) => o && (o.id === orderIdOrNumber || o.orderNumber === orderIdOrNumber));
if (!ord) {
return sendJson(res, 404, { ok: false, error: 'Pedido não encontrado.' });
}
const custEmailNorm = String(cust.email || '').trim().toLowerCase();
const ordEmailNorm = String((ord.customer && ord.customer.email) || '').trim().toLowerCase();
const isOwnerOfOrder = ord.customerId === cust.id || (custEmailNorm && ordEmailNorm === custEmailNorm);
if (!isOwnerOfOrder) {
return sendJson(res, 403, { ok: false, error: 'Acesso negado: você só pode gerenciar pedidos da sua própria conta.' });
}
if (ord.status === 'cancelled' || ord.status === 'cancelled_expired') {
const cancelMsg = 'Seu pedido foi cancelado. Você poderá continuar navegando pela loja e escolher outros produtos quando quiser.';
return sendJson(res, 200, {
ok: true,
alreadyCancelled: true,
order: ord,
message: cancelMsg,
customerCancelMessage: cancelMsg
});
}
const charge = (db.pixCharges || []).find((c) => c && (c.orderId === ord.id || c.orderNumber === ord.orderNumber));
const providerCheck = await queryProviderChargeStatus(charge);
const paidStates = ['payment_approved', 'paid', 'awaiting_separation', 'in_separation', 'preparing', 'ready_for_shipping', 'ready_pickup', 'shipped', 'out_for_delivery', 'delivered'];
const isSimultaneousOrAlreadyPaid =
Boolean(body.simulateSimultaneousPayment) ||
providerCheck.status === 'APPROVED' ||
ord.paymentStatus === 'paid' ||
ord.paymentStatus === 'approved' ||
paidStates.includes(ord.status);
if (isSimultaneousOrAlreadyPaid) {
if (ord.paymentStatus !== 'paid' && ord.paymentStatus !== 'approved') {
approvePixOrderPayment({
order: ord,
charge,
paidAmount: providerCheck.paidAmount || ord.total,
eventId: 'simultaneous_pay_protect_' + ord.id,
source: 'simultaneous_cancel_protection'
});
}
logFinancialEvent('SIMULTANEOUS_PAYMENT_ON_CANCEL_PROTECTED', {
orderId: ord.id,
orderNumber: ord.orderNumber,
chargeId: charge ? charge.chargeId : null,
amount: ord.total,
message: `Tentativa de cancelamento do pedido ${ord.orderNumber} interceptada: pagamento já confirmado simultaneamente. Pedido mantido como pago.`
});
appendServerAuditLog(
'PROTECAO_PAGAMENTO_SIMULTANEO',
`${cust.name} (${cust.email})`,
`Pedido ${ord.orderNumber}`,
  
`Cliente tentou cancelar o pedido ${ord.orderNumber} no momento em que o pagamento já havia sido confirmado. Cancelamento direto impedido e fluxo de solicitação de cancelamento de pedido pago disponibilizado.`
);
saveDatabase(db);
return sendJson(res, 409, {
ok: false,
code: 'ORDER_ALREADY_PAID',
alreadyPaid: true,
simultaneousPaymentConfirmed: true,
canRequestPaidCancellation: true,
order: ord,
error: 'Identificamos que o pagamento deste pedido já foi confirmado! Por segurança, o pedido não foi cancelado diretamente. Você pode enviar uma Solicitação de Cancelamento de pedido pago para análise e reembolso.'
});
}
const unpaidStates = ['awaiting_payment', 'awaiting_confirmation', 'awaiting_whatsapp'];
if (!unpaidStates.includes(ord.status)) {
return sendJson(res, 400, {
ok: false,
error: `Não é possível realizar o cancelamento direto no status atual (${ord.statusLabel || ord.status}). Utilize a opção de Solicitar Cancelamento.`
});
}
const nowIso = new Date().toISOString();
const cancelReasonText = String(body.reason || 'Cancelado pela cliente antes do pagamento.').trim();
ord.status = 'cancelled';
ord.statusLabel = ORDER_STATUS_LABELS.cancelled;
ord.paymentStatus = 'cancelled';
ord.cancelledAt = nowIso;
ord.cancelledBy = 'customer';
ord.cancelReason = cancelReasonText;
if (charge) {
charge.status = 'CANCELLED_BY_CUSTOMER';
charge.cancelledAt = nowIso;
charge.expiredAt = nowIso;
}
if (ord.pixData) {
ord.pixData.cancelledAt = nowIso;
ord.pixData.status = 'CANCELLED_BY_CUSTOMER';
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
logStockMovement('LIBERACAO_RESERVA_CANCELAMENTO_CLIENTE', {
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
channel: 'Área da Cliente',
message: 'Pedido cancelado pela cliente antes da confirmação do pagamento. Cobrança encerrada e reserva de estoque liberada.'
});
logFinancialEvent('ORDER_CANCELLED_BY_CUSTOMER_PRE_PAYMENT', {
orderId: ord.id,
orderNumber: ord.orderNumber,
chargeId: charge ? charge.chargeId : null,
amount: ord.total,
message: `Pedido ${ord.orderNumber} cancelado pela cliente (${cust.email}) antes do pagamento.`
});
addAdminNotification(
`Pedido Cancelado pela Cliente — ${ord.orderNumber}`,
`A cliente ${cust.name} cancelou o pedido ${ord.orderNumber} antes do pagamento. Estoque reservado liberado.`,
ord.id,
ord.orderNumber,
'info'
);
appendServerAuditLog(
'PEDIDO_CANCELADO_PELA_CLIENTE',
  
`${cust.name} (${cust.email})`,
`Pedido ${ord.orderNumber}`,
`Pedido ${ord.orderNumber} cancelado antes do pagamento em ${new Date(nowIso).toLocaleString('pt-BR')}. Motivo: ${cancelReasonText}`
);
cust.lastActivityAt = nowIso;
if (typeof recordOrderLifecycleAnalytics === 'function') {
recordOrderLifecycleAnalytics('order_cancelled', ord);
}
saveDatabase(db);
const cancelMsg = 'Seu pedido foi cancelado. Você poderá continuar navegando pela loja e escolher outros produtos quando quiser.';
return sendJson(res, 200, {
ok: true,
order: ord,
charge,
message: cancelMsg,
customerCancelMessage: cancelMsg
});
} catch (err) {
return sendJson(res, 400, { ok: false, error: err.message });
}
}
const requestCancelMatch = pathname.match(/^\/api\/orders\/([^\/]+)\/request-cancellation$/);
if (requestCancelMatch && req.method === 'POST') {
try {
const orderIdOrNumber = decodeURIComponent(requestCancelMatch[1]);
const body = await parseBody(req);
const cust = getAuthenticatedCustomerFromReq(req, body.customer || body);
if (!cust) {
return sendJson(res, 401, { ok: false, error: 'Sessão não autenticada.' });
}
const ord = (db.orders || []).find((o) => o && (o.id === orderIdOrNumber || o.orderNumber === orderIdOrNumber));
if (!ord) {
return sendJson(res, 404, { ok: false, error: 'Pedido não encontrado.' });
}
const custEmailNorm = String(cust.email || '').trim().toLowerCase();
const ordEmailNorm = String((ord.customer && ord.customer.email) || '').trim().toLowerCase();
if (ord.customerId !== cust.id && (!custEmailNorm || ordEmailNorm !== custEmailNorm)) {
return sendJson(res, 403, { ok: false, error: 'Acesso negado a este pedido.' });
}
const reason = String(body.reason || '').trim();
if (reason.length < 3) {
return sendJson(res, 400, { ok: false, error: 'Por favor, informe o motivo da solicitação de cancelamento.' });
}
const nowIso = new Date().toISOString();
db.cancellationRequests = Array.isArray(db.cancellationRequests) ? db.cancellationRequests : [];
let reqObj = db.cancellationRequests.find((r) => r && (r.orderId === ord.id || r.orderNumber === ord.orderNumber));
if (reqObj && (reqObj.status === 'pending_review' || reqObj.status === 'approved' || reqObj.status === 'refund_processing')) {
return sendJson(res, 200, {
ok: true,
alreadyRequested: true,
order: ord,
cancellationRequest: reqObj,
message: 'Sua solicitação de cancelamento já está registrada e em acompanhamento pela nossa equipe.'
});
}
reqObj = {
id: 'canreq-' + Date.now(),
orderId: ord.id,
orderNumber: ord.orderNumber,
customerId: cust.id,
customerName: cust.name,
customerEmail: cust.email,
customerPhone: cust.phone || '',
orderTotal: ord.total,
paymentMethod: ord.paymentMethod,
reason,
status: 'pending_review',
statusLabel: 'Solicitação em análise pela loja',
adminJustification: '',
refundStatus: 'not_started',
refundReference: '',
createdAt: nowIso,
updatedAt: nowIso,
history: [
{
date: nowIso,
actor: `${cust.name} (Cliente)`,
action: 'Solicitação de cancelamento de pedido pago enviada.',
reason
}
  
]
};
db.cancellationRequests.unshift(reqObj);
ord.cancellationRequest = reqObj;
ord.notificationsLog = ord.notificationsLog || [];
ord.notificationsLog.push({
date: nowIso,
channel: 'Solicitação da Cliente',
message: `Solicitação de cancelamento de pedido pago registrada. Motivo: "${reason}". Aguardando análise da administração.`
});
addAdminNotification(
`Solicitação de Cancelamento (Pedido Pago) — ${ord.orderNumber}`,
`A cliente ${cust.name} solicitou o cancelamento do pedido pago ${ord.orderNumber} (R$ ${Number(ord.total || 0).toFixed(2)}). Motivo: ${reason}`,
ord.id,
ord.orderNumber,
'warning'
);
appendServerAuditLog(
'SOLICITACAO_CANCELAMENTO_PEDIDO_PAGO',
`${cust.name} (${cust.email})`,
`Pedido ${ord.orderNumber}`,
`Cliente solicitou cancelamento de pedido pago (${ord.orderNumber}). Motivo: ${reason}`
);
cust.lastActivityAt = nowIso;
saveDatabase(db);
return sendJson(res, 201, {
ok: true,
order: ord,
cancellationRequest: reqObj,
message: 'Sua solicitação de cancelamento foi registrada com sucesso e enviada para análise da nossa equipe.'
});
} catch (err) {
return sendJson(res, 400, { ok: false, error: err.message });
}
}
const adminCancelDecisionMatch = pathname.match(/^\/api\/admin\/orders\/([^\/]+)\/cancellation-decision$/);
if (adminCancelDecisionMatch && req.method === 'POST') {
try {
const orderIdOrNumber = decodeURIComponent(adminCancelDecisionMatch[1]);
const body = await parseBody(req);
const adminUser = getAuthenticatedAdminFromReq(req, body);
if (!adminUser || (!hasAdminPermission(adminUser, 'orders') && !hasAdminPermission(adminUser, 'payments'))) {
return sendJson(res, 403, { ok: false, error: 'Permissão administrativa necessária para gerenciar cancelamentos e reembolsos.' });
}
const ord = (db.orders || []).find((o) => o && (o.id === orderIdOrNumber || o.orderNumber === orderIdOrNumber));
if (!ord) {
return sendJson(res, 404, { ok: false, error: 'Pedido não encontrado.' });
}
db.cancellationRequests = Array.isArray(db.cancellationRequests) ? db.cancellationRequests : [];
let reqObj = db.cancellationRequests.find((r) => r && (r.orderId === ord.id || r.orderNumber === ord.orderNumber)) || ord.cancellationRequest;
if (!reqObj) {
reqObj = {
id: 'canreq-' + Date.now(),
orderId: ord.id,
orderNumber: ord.orderNumber,
customerId: ord.customerId,
customerName: (ord.customer && ord.customer.name) || 'Cliente',
customerEmail: (ord.customer && ord.customer.email) || '',
orderTotal: ord.total,
paymentMethod: ord.paymentMethod,
reason: 'Solicitação gerenciada pela administração',
status: 'pending_review',
statusLabel: 'Em análise',
adminJustification: '',
refundStatus: 'not_started',
createdAt: new Date().toISOString(),
history: []
};
db.cancellationRequests.unshift(reqObj);
}
const decision = String(body.decision || '').trim(); // 'approve' | 'reject' | 'start_refund' | 'confirm_refund'
const justification = String(body.justification || body.adminReason || body.note || '').trim();
const nowIso = new Date().toISOString();
const actorLabel = `${adminUser.name} (${adminUser.email})`;
if (decision === 'reject') {
if (!justification) {
return sendJson(res, 400, { ok: false, error: 'Informe a justificativa para recusar a solicitação de cancelamento.' });
}
reqObj.status = 'rejected';
reqObj.statusLabel = 'Solicitação recusada pela loja';
reqObj.adminJustification = justification;
reqObj.adminReason = justification;
reqObj.updatedAt = nowIso;
reqObj.history = reqObj.history || [];
reqObj.history.push({ date: nowIso, actor: actorLabel, action: 'Solicitação recusada.', justification });
ord.cancellationRequest = reqObj;
ord.notificationsLog = ord.notificationsLog || [];
ord.notificationsLog.push({
date: nowIso,
channel: 'Administração BY ANGÉLY',
message: `Solicitação de cancelamento analisada e recusada. Justificativa: ${justification}`
});
appendServerAuditLog(
'CANCELAMENTO_PAGO_RECUSADO',
actorLabel,
`Pedido ${ord.orderNumber}`,
`Solicitação de cancelamento do pedido ${ord.orderNumber} recusada. Justificativa: ${justification}`
);
} else if (decision === 'approve') {
reqObj.status = 'approved';
reqObj.statusLabel = 'Solicitação aprovada • Aguardando início do reembolso';
reqObj.adminJustification = justification || 'Solicitação de cancelamento aprovada pela loja.';
reqObj.adminReason = reqObj.adminJustification;
reqObj.refundStatus = 'pending_initiation';
reqObj.updatedAt = nowIso;
reqObj.history = reqObj.history || [];
reqObj.history.push({ date: nowIso, actor: actorLabel, action: 'Solicitação aprovada pela administração.', justification: reqObj.adminJustification });
ord.status = 'cancelled';
ord.statusLabel = 'Cancelado (Solicitação aprovada • Reembolso pendente)';
ord.cancelledAt = nowIso;
ord.cancelledBy = 'admin_approved_request';
ord.cancellationRequest = reqObj;
ord.notificationsLog = ord.notificationsLog || [];
ord.notificationsLog.push({
date: nowIso,
channel: 'Administração BY ANGÉLY',
message: `Sua solicitação de cancelamento foi aprovada! O processo de reembolso de R$ ${Number(ord.total || 0).toFixed(2)} será iniciado.`
});
appendServerAuditLog(
'CANCELAMENTO_PAGO_APROVADO',
actorLabel,
`Pedido ${ord.orderNumber}`,
`Solicitação de cancelamento do pedido pago ${ord.orderNumber} aprovada. Observação: ${reqObj.adminJustification}`
);
} else if (decision === 'start_refund') {
reqObj.status = 'refund_in_progress';
reqObj.statusLabel = 'Processo de reembolso iniciado';
reqObj.refundStatus = 'processing';
reqObj.adminJustification = justification || reqObj.adminJustification || 'Reembolso em processamento junto à instituição de pagamento.';
reqObj.adminReason = reqObj.adminJustification;
reqObj.updatedAt = nowIso;
reqObj.history = reqObj.history || [];
reqObj.history.push({ date: nowIso, actor: actorLabel, action: 'Processo de reembolso iniciado.', justification: reqObj.adminJustification });
ord.status = 'refund_pending';
ord.statusLabel = ORDER_STATUS_LABELS.refund_pending;
ord.cancellationRequest = reqObj;
ord.notificationsLog = ord.notificationsLog || [];
ord.notificationsLog.push({
date: nowIso,
channel: 'Financeiro BY ANGÉLY',
message: `Processo de reembolso iniciado para o pedido ${ord.orderNumber} (R$ ${Number(ord.total || 0).toFixed(2)}).`
});
logFinancialEvent('REFUND_PROCESS_INITIATED', {
orderId: ord.id,
orderNumber: ord.orderNumber,
amount: ord.total,
message: `Processo de reembolso iniciado para o pedido ${ord.orderNumber}.`
});
appendServerAuditLog(
'REEMBOLSO_INICIADO',
actorLabel,
`Pedido ${ord.orderNumber}`,
`Processo de reembolso de R$ ${Number(ord.total || 0).toFixed(2)} iniciado para o pedido ${ord.orderNumber}.`
);
} else if (decision === 'confirm_refund') {
const refundReference = String(body.refundReference || '').trim();
if (!body.providerRefundConfirmed && refundReference.length < 2) {
return sendJson(res, 400, {
ok: false,
error: 'Para marcar o reembolso como concluído, informe o comprovante/identificador e confirme que o estorno foi efetivado no provedor de pagamento/banco.'
});
}
const finalRefundRef = refundReference || justification || 'ESTORNO_CONFIRMADO';
reqObj.status = 'refunded';
reqObj.statusLabel = 'Cancelado e reembolsado';
reqObj.refundStatus = 'confirmed';
reqObj.refundReference = finalRefundRef;
reqObj.refundConfirmedAt = nowIso;
reqObj.updatedAt = nowIso;
reqObj.history = reqObj.history || [];
reqObj.history.push({
date: nowIso,
actor: actorLabel,
action: `Reembolso confirmado no provedor (${refundReference}).`
});
ord.status = 'cancelled';
ord.statusLabel = 'Cancelado e reembolsado';
ord.paymentStatus = 'refunded';
ord.cancelledAt = nowIso;
ord.refundedAt = nowIso;
ord.refundReference = refundReference;
ord.cancellationRequest = reqObj;
if (ord.stockDeducted || ord.stockReserved) {
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
logStockMovement('RETORNO_ESTOQUE_REEMBOLSO', {
orderNumber: ord.orderNumber,
productId: prod.id,
sku: prod.sku,
size: it.size,
color: it.color,
  
quantity: qty
});
}
});
ord.stockDeducted = false;
ord.stockReserved = false;
}
ord.notificationsLog = ord.notificationsLog || [];
ord.notificationsLog.push({
date: nowIso,
channel: 'Financeiro BY ANGÉLY',
message: `Reembolso de R$ ${Number(ord.total || 0).toFixed(2)} confirmado (${refundReference}). Pedido encerrado como cancelado e reembolsado.`
});
logFinancialEvent('REFUND_CONFIRMED_COMPLETED', {
orderId: ord.id,
orderNumber: ord.orderNumber,
amount: ord.total,
refundReference,
message: `Reembolso do pedido ${ord.orderNumber} confirmado (${refundReference}).`
});
appendServerAuditLog(
'REEMBOLSO_CONFIRMADO',
actorLabel,
`Pedido ${ord.orderNumber}`,
`Reembolso de R$ ${Number(ord.total || 0).toFixed(2)} confirmado para o pedido ${ord.orderNumber}. Referência: ${refundReference}`
);
} else {
return sendJson(res, 400, { ok: false, error: 'Ação de decisão inválida.' });
}
saveDatabase(db);
return sendJson(res, 200, {
ok: true,
order: ord,
cancellationRequest: reqObj
});
} catch (err) {
return sendJson(res, 400, { ok: false, error: err.message });
}
}
if (pathname === '/api/customer/delete-account' && req.method === 'POST') {
try {
await processExpiredPixOrders();
const body = await parseBody(req);
const cust = getAuthenticatedCustomerFromReq(req, body);
if (!cust) {
return sendJson(res, 401, { ok: false, error: 'Sessão não autenticada. Faça login para gerenciar sua conta.' });
}
if (!body.confirmed && !body.confirmDeletion) {
return sendJson(res, 400, { ok: false, error: 'Confirme explicitamente que deseja excluir sua conta.' });
}
const password = String(body.password || '');
const passHash = hashPassword(password);
const validPass =
(cust.passwordHash && cust.passwordHash === passHash) ||
(cust.password && cust.password === password);
if (!password || !validPass) {
return sendJson(res, 401, {
ok: false,
code: 'REAUTH_FAILED',
error: 'Senha atual incorreta. Por segurança, digite sua senha atual correta para confirmar a exclusão da conta.'
});
}
const nowIso = new Date().toISOString();
const custEmailNorm = String(cust.email || '').trim().toLowerCase();
const myOrders = (db.orders || []).filter(
(o) =>
o &&
(o.customerId === cust.id ||
(o.customer && String(o.customer.email || '').trim().toLowerCase() === custEmailNorm))
);
const unpaidOrders = myOrders.filter((o) =>
['awaiting_payment', 'awaiting_confirmation', 'awaiting_whatsapp'].includes(o.status) &&
o.paymentStatus !== 'paid' &&
o.paymentStatus !== 'approved'
);
unpaidOrders.forEach((ord) => {
ord.status = 'cancelled';
ord.statusLabel = ORDER_STATUS_LABELS.cancelled;
ord.paymentStatus = 'cancelled';
ord.cancelledAt = nowIso;
ord.cancelReason = 'Cancelado automaticamente devido ao encerramento da conta pela cliente.';
const chg = (db.pixCharges || []).find((c) => c && (c.orderId === ord.id || c.orderNumber === ord.orderNumber));
if (chg) {
chg.status = 'CANCELLED_ACCOUNT_DELETION';
chg.cancelledAt = nowIso;
}
if (ord.stockReserved && !ord.stockDeducted) {
(ord.items || []).forEach((it) => {
const prod = (db.products || []).find((p) => p.id === it.productId || p.sku === it.sku);
if (prod && Array.isArray(prod.variations)) {
const v = prod.variations.find((vr) => vr.size === it.size && vr.color === it.color);
if (v) v.stock = (Number(v.stock) || 0) + (Number(it.quantity) || 1);
}
});
ord.stockReserved = false;
}
});
const activeInProgressStatuses = [
'payment_approved',
'paid',
  
      'awaiting_separation',
      'in_separation',
      'preparing',
      'ready_for_shipping',
      'ready_pickup',
      'shipped',
      'out_for_delivery',
      'late_payment_reconciliation',
      'refund_pending'
    ];
    const activePaidOrders = myOrders.filter((o) => activeInProgressStatuses.includes(o.status));
    const pendingReturns = (db.returnRequests || []).filter(
      (r) => r && String(r.customerEmail || '').trim().toLowerCase() === custEmailNorm && r.status !== 'Atendida pela Loja'
    );
    if ((activePaidOrders.length > 0 || pendingReturns.length > 0) && !body.forceImmediateAnonymize) {
      cust.accountStatus = 'deletion_requested';
      cust.deletionRequestedAt = nowIso;
      cust.deletionReason = String(body.reason || 'Solicitação de exclusão pela titular (LGPD)').trim();
      cust.lastActivityAt = nowIso;
      appendServerAuditLog(
        'SOLICITACAO_EXCLUSAO_CONTA_COM_PENDENCIAS',
        `${cust.name} (${cust.email})`,
        `Cliente ${cust.id}`,
        `Cliente solicitou exclusão da própria conta, porém possui ${activePaidOrders.length} pedido(s) em andamento e ${pendingReturns.length} troca(s)/devolução(ões) pendente(s). Solicitação vinculada à conclusão das pendências.`
      );
      addAdminNotification(
        `Exclusão de Conta Solicitada (Com Pedido Ativo) — ${cust.name}`,
        `A cliente ${cust.name} (${cust.email}) solicitou a exclusão da conta. Há ${activePaidOrders.length} pedido(s) ativo(s) que devem ser concluídos antes da anonimização definitiva.`,
        activePaidOrders[0] ? activePaidOrders[0].id : null,
        activePaidOrders[0] ? activePaidOrders[0].orderNumber : null,
        'warning'
      );
      saveDatabase(db);
      return sendJson(res, 200, {
        ok: true,
        status: 'deletion_scheduled_pending_orders',
        mode: 'deletion_requested_pending_orders',
        scheduledAfterOrders: true,
        activeOrdersCount: activePaidOrders.length,
        pendingReturnsCount: pendingReturns.length,
        customer: sanitizeCustomerForClient(cust),
        message: `Sua solicitação de exclusão foi registrada! Como você possui ${activePaidOrders.length} pedido(s) em andamento, os dados estritamente necessários para a entrega ou conclusão financeira serão mantidos até a finalização e, em seguida, anonimizados conforme a LGPD.`
      });
    }

    const originalName = cust.name;
    const originalEmail = cust.email;
    cust.deletedEmailHash = hashPassword(custEmailNorm);

    myOrders.forEach((ord) => {
      if (ord.customer) {
        ord.customer.accountDeleted = true;
        ord.customer.anonymizedAt = nowIso;
        ord.customer.legalRetentionNote = 'Registro financeiro e fiscal conservado conforme Art. 16 da LGPD (Lei nº 13.709/2018).';
      }
    });

    cust.name = 'Conta Excluída / Anonimizada (LGPD)';
    cust.email = `anonimizado+${cust.id}@excluido.byangely.local`;
    cust.phone = 'Anonimizado (LGPD)';
    cust.cpf = 'Anonimizado (LGPD)';
    cust.addresses = [];
    cust.savedCart = [];
    cust.marketingOptIn = false;
    cust.passwordHash = null;
    delete cust.password;
    cust.sessionToken = null;
    cust.accountStatus = 'deleted_anonymized';
    cust.deletedAt = nowIso;
    cust.deletedBy = 'Titular da Conta (Autoexclusão)';
    cust.deleteReason = String(body.reason || 'Exclusão solicitada pela própria cliente na área Minha Conta.').trim();
    cust.updatedAt = nowIso;
    cust.lastActivityAt = nowIso;

    appendServerAuditLog(
      'CONTA_EXCLUIDA_PELA_PROPRIA_CLIENTE',
      `${originalName} (${originalEmail})`,
      `Conta ${cust.id}`,
      `Conta excluída e dados pessoais anonimizados a pedido da própria cliente. Registros fiscais/financeiros (${myOrders.length} pedido(s)) mantidos por obrigação legal.`
    );

    saveDatabase(db);
    return sendJson(res, 200, {
      ok: true,
      status: 'deleted_anonymized',
      mode: 'deleted_and_anonymized',
      deletedAndAnonymized: true,
      message: 'Sua conta foi excluída e seus dados pessoais foram anonimizados com sucesso. Registros financeiros e fiscais obrigatórios foram preservados exclusivamente conforme a legislação vigente.'
    });
  } catch (err) {
    return sendJson(res, 400, { ok: false, error: err.message });
  }
}

const adminCustomerActionMatch = pathname.match(/^\/api\/admin\/customers\/([^\/]+)\/(block|unblock|delete)$/);
if (adminCustomerActionMatch && req.method === 'POST') {
  try {
    const custId = decodeURIComponent(adminCustomerActionMatch[1]);
    const actionType = adminCustomerActionMatch[2];
    const body = await parseBody(req);
    const adminUser = getAuthenticatedAdminFromReq(req, body);
    if (!adminUser || (!hasAdminPermission(adminUser, 'customers') && !hasAdminPermission(adminUser, 'users'))) {
      return sendJson(res, 403, { ok: false, error: 'Permissão administrativa necessária para gerenciar contas de clientes.' });
    }
    const cust = (db.customers || []).find((c) => c && (c.id === custId || String(c.email || '').toLowerCase() === custId.toLowerCase()));
    if (!cust) {
      return sendJson(res, 404, { ok: false, error: 'Conta de cliente não encontrada.' });
    }
    if (String(cust.email || '').trim().toLowerCase() === 'byangely1@gmail.com') {
      return sendJson(res, 403, {
        ok: false,
        error: 'Operação bloqueada por segurança: não é permitido bloquear ou excluir a conta principal da proprietária da loja.'
      });
    }

    const nowIso = new Date().toISOString();
    const actorLabel = `${adminUser.name} (${adminUser.email})`;

    if (actionType === 'block') {
      const reason = String(body.reason || '').trim();
      if (reason.length < 3) {
        return sendJson(res, 400, { ok: false, error: 'Informe o motivo do bloqueio da conta.' });
      }
      cust.accountStatus = 'blocked';
      cust.blockedAt = nowIso;
      cust.blockedBy = actorLabel;
      cust.blockReason = reason;
      cust.blockedReason = reason;
      cust.sessionToken = null; // Invalida imediatamente a sessão ativa da cliente
      cust.updatedAt = nowIso;
      appendServerAuditLog(
        'CONTA_CLIENTE_BLOQUEADA',
        actorLabel,
        `Cliente ${cust.name} (${cust.email} • ID: ${cust.id})`,
        `Conta bloqueada pela administração em ${new Date(nowIso).toLocaleString('pt-BR')}. Motivo: ${reason}`
      );
      saveDatabase(db);
      return sendJson(res, 200, {
        ok: true,
        customer: sanitizeCustomerForClient(cust),
        message: `A conta de ${cust.name} foi bloqueada com sucesso.`
      });
    }

    if (actionType === 'unblock') {
      const note = String(body.reason || body.note || 'Desbloqueio administrativo autorizado.').trim();
      cust.accountStatus = 'active';
      cust.unblockedAt = nowIso;
      cust.unblockedBy = actorLabel;
      cust.blockReason = '';
      cust.blockedReason = '';
      cust.updatedAt = nowIso;
      appendServerAuditLog(
        'CONTA_CLIENTE_DESBLOQUEADA',
        actorLabel,
        `Cliente ${cust.name} (${cust.email} • ID: ${cust.id})`,
        `Conta desbloqueada e acesso restaurado em ${new Date(nowIso).toLocaleString('pt-BR')}. Observação: ${note}`
      );
      saveDatabase(db);
      
      return sendJson(res, 200, {
        ok: true,
        customer: sanitizeCustomerForClient(cust),
        message: `O acesso da conta de ${cust.name} foi restaurado com sucesso.`
      });
    }

    if (actionType === 'delete') {
      if (!body.confirmed && !body.confirmDeletion) {
        return sendJson(res, 400, { ok: false, error: 'Confirmação reforçada obrigatória para excluir/anonimizar uma conta.' });
      }
      if (body.adminPassword !== undefined || body.requireReauth !== false) {
        if (!verifyAdminPassword(adminUser, body.adminPassword || '')) {
          return sendJson(res, 403, {
            ok: false,
            code: 'ADMIN_REAUTH_FAILED',
            error: 'Senha administrativa incorreta. Confirme sua senha de administradora para executar a exclusão/anonimização.'
          });
        }
      }
      const reason = String(body.reason || 'Exclusão e anonimização administrativa (LGPD)').trim();
      const prevName = cust.name;
      const prevEmail = String(cust.email || '').trim().toLowerCase();
      if (prevEmail && !prevEmail.endsWith('@excluido.byangely.local')) {
        cust.deletedEmailHash = hashPassword(prevEmail);
      }
      const custOrders = (db.orders || []).filter(
        (o) =>
          o &&
          (o.customerId === cust.id ||
            (o.customer && String(o.customer.email || '').trim().toLowerCase() === prevEmail))
      );
      custOrders.forEach((ord) => {
        if (['awaiting_payment', 'awaiting_confirmation', 'awaiting_whatsapp'].includes(ord.status) && ord.paymentStatus !== 'paid') {
          ord.status = 'cancelled';
          ord.statusLabel = ORDER_STATUS_LABELS.cancelled;
          ord.paymentStatus = 'cancelled';
          ord.cancelledAt = nowIso;
          ord.cancelReason = 'Cancelado devido à exclusão/anonimização administrativa da conta.';
          if (ord.stockReserved && !ord.stockDeducted) {
            (ord.items || []).forEach((it) => {
              const prod = (db.products || []).find((p) => p.id === it.productId || p.sku === it.sku);
              if (prod && Array.isArray(prod.variations)) {
                const v = prod.variations.find((vr) => vr.size === it.size && vr.color === it.color);
                if (v) v.stock = (Number(v.stock) || 0) + (Number(it.quantity) || 1);
              }
            });
            ord.stockReserved = false;
          }
        }
        if (ord.customer) {
          ord.customer.accountDeleted = true;
          ord.customer.anonymizedByAdmin = true;
          ord.customer.anonymizedAt = nowIso;
          ord.customer.legalRetentionNote = 'Registro fiscal e financeiro mantido por obrigação legal (Art. 16 LGPD).';
        }
      });

      cust.name = 'Conta Excluída / Anonimizada (Admin)';
      cust.email = `anonimizado+${cust.id}@excluido.byangely.local`;
      cust.phone = 'Anonimizado (LGPD)';
      cust.cpf = 'Anonimizado (LGPD)';
      cust.addresses = [];
      cust.savedCart = [];
      cust.marketingOptIn = false;
      cust.passwordHash = null;
      delete cust.password;
      cust.sessionToken = null;
      cust.accountStatus = 'deleted_anonymized';
      cust.deletedAt = nowIso;
      cust.deletedBy = actorLabel;
      cust.deleteReason = reason;
      cust.updatedAt = nowIso;

      appendServerAuditLog(
        'CONTA_CLIENTE_EXCLUIDA_ANONIMIZADA_ADMIN',
        actorLabel,
        `Cliente ${prevName} (${prevEmail} • ID: ${cust.id})`,
        `Conta excluída e dados pessoais anonimizados pela administração em ${new Date(nowIso).toLocaleString('pt-BR')}. Motivo: ${reason}. Histórico financeiro/legal (${custOrders.length} pedido(s)) preservado.`
      );

      saveDatabase(db);
      return sendJson(res, 200, {
        ok: true,
        customer: sanitizeCustomerForClient(cust),
        message: `A conta de ${prevName} foi excluída e seus dados pessoais foram anonimizados com preservação dos registros legais.`
      });
    }
  } catch (err) {
    return sendJson(res, 400, { ok: false, error: err.message });
  }
}

if (pathname === '/api/analytics/event' && req.method === 'POST') {
  try {
    const body = await parseBody(req);
    if (Array.isArray(body.events)) {
      const results = body.events.map((ev) => recordAnalyticsEvent(req, ev));
      saveDatabase(db);
      return sendJson(res, 200, { ok: true, count: results.length, results });
    }
    const result = recordAnalyticsEvent(req, body);
    saveDatabase(db);
    return sendJson(res, 200, result);
  } catch (err) {
    return sendJson(res, 400, { ok: false, error: err.message });
  }
}

if (pathname === '/api/admin/analytics' && req.method === 'GET') {
  try {
    await processExpiredPixOrders();
    const adminUser = getAuthenticatedAdminFromReq(req, parsedUrl.query || {});
    if (!adminUser || (!hasAdminPermission(adminUser, 'orders') && !hasAdminPermission(adminUser, 'products') && !hasAdminPermission(adminUser, 'analytics'))) {
      return sendJson(res, 403, {
        ok: false,
        error: 'Acesso restrito: somente administradores autorizados podem visualizar os relatórios de Análise da Loja.'
      });
    }
    const report = buildStoreAnalyticsReport(db, parsedUrl.query || {});
    return sendJson(res, 200, report);
  } catch (err) {
    return sendJson(res, 400, { ok: false, error: err.message });
  }
}

if (pathname === '/api/admin/analytics/export-csv' && req.method === 'GET') {
  try {
    const adminUser = getAuthenticatedAdminFromReq(req, parsedUrl.query || {});
    if (!adminUser || (!hasAdminPermission(adminUser, 'orders') && !hasAdminPermission(adminUser, 'products') && !hasAdminPermission(adminUser, 'analytics'))) {
      return sendJson(res, 403, {
        ok: false,
        error: 'Acesso restrito: permissão administrativa necessária para exportar relatórios.'
      });
    }
    const report = buildStoreAnalyticsReport(db, parsedUrl.query || {});
    const csvContent = generateAnalyticsCsv(report, parsedUrl.query.section || 'all');
    setCorsAndSecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="by-angely-analise-${report.period.period}-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store'
    });
    return res.end(csvContent);
  } catch (err) {
    return sendJson(res, 400, { ok: false, error: err.message });
  }
}

return _v5OrigRequestListener(req, res);
});







