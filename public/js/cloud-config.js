/**
 * By Angély — Configuração de Nuvem (Supabase + Render Backend + Cloudflare Pages)
 *
 * SEGURANÇA:
 * - Apenas a chave pública `anon` do Supabase (protegida por Row Level Security - RLS no PostgreSQL)
 *   é referenciada no cliente web.
 * - A chave secreta `SUPABASE_SERVICE_ROLE_KEY` fica EXCLUSIVAMENTE nas variáveis de ambiente do servidor (Render).
 */
(function (root) {
  'use strict';

  var SUPABASE_URL = 'https://mhtsubybvriffashamiy.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odHN1YnlidnJpZmZhc2hhbWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2ODUyNzYsImV4cCI6MjExMDI2MTI3Nn0.j_5mQVbi1qjN-RxlMemwliyBcRQKdXqpZeeenLtpkaM';
  var RENDER_BACKEND_URL = 'https://by-angely.onrender.com';

  function getApiBaseUrl() {
    if (typeof window === 'undefined') return '';
    var host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.onrender.com')) {
      return '';
    }
    return RENDER_BACKEND_URL;
  }

  function sanitizeStateForCloud(rawDb) {
    if (!rawDb) return rawDb;
    var copy = JSON.parse(JSON.stringify(rawDb));
    if (Array.isArray(copy.adminUsers)) {
      copy.adminUsers = copy.adminUsers.map(function (u) {
        var clean = Object.assign({}, u);
        delete clean.passwordHash;
        delete clean.customPassword;
        delete clean.sessionToken;
        return clean;
      });
    }
    if (Array.isArray(copy.customers)) {
      copy.customers = copy.customers.map(function (c) {
        var cleanCust = Object.assign({}, c);
        delete cleanCust.password;
        delete cleanCust.passwordHash;
        delete cleanCust.sessionToken;
        delete cleanCust.deletedEmailHash;
        return cleanCust;
      });
    }
    return copy;
  }

  /**
   * Busca o estado da loja no Supabase (tabela public.by_angely_store_state)
   */
  async function fetchStateFromSupabase() {
    var url = SUPABASE_URL + '/rest/v1/by_angely_store_state?id=eq.main&select=state,updated_at';
    var res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Accept': 'application/json'
      }
    });
    if (!res.ok) throw new Error('Supabase GET falhou: ' + res.status);
    var rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0 && rows[0].state) {
      var st = rows[0].state;
      if (rows[0].updated_at && !st.updatedAt) {
        st.updatedAt = rows[0].updated_at;
      }
      return st;
    }
    return null;
  }

  /**
   * Salva o estado completo da loja diretamente no Supabase (by_angely_store_state + by_angely_products)
   */
  async function saveStateToSupabase(currentDb) {
    if (!currentDb || !currentDb.storeSettings) return false;
    var safeDb = sanitizeStateForCloud(currentDb);
    var nowIso = safeDb.updatedAt || new Date().toISOString();
    safeDb.updatedAt = nowIso;

    var okState = false;
    try {
      var stateRes = await fetch(SUPABASE_URL + '/rest/v1/by_angely_store_state?on_conflict=id', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify({
          id: 'main',
          state: safeDb,
          updated_at: nowIso
        })
      });
      okState = stateRes.ok;
    } catch (err) {
      console.warn('Aviso ao sincronizar by_angely_store_state no Supabase:', err.message);
    }

    try {
      if (Array.isArray(safeDb.products) && safeDb.products.length > 0) {
        var prodRows = safeDb.products.map(function (p) {
          return {
            id: String(p.id),
            sku: String(p.sku || ''),
            name: String(p.name || ''),
            category: String(p.category || ''),
            price: Number(p.price) || 0,
            promo_price: p.promoPrice ? Number(p.promoPrice) : null,
            is_promo: Boolean(p.isPromo),
            is_demo: Boolean(p.isDemo),
            status: String(p.status || 'published'),
            payload: p,
            updated_at: nowIso
          };
        });
        await fetch(SUPABASE_URL + '/rest/v1/by_angely_products?on_conflict=id', {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=minimal'
          },
          body: JSON.stringify(prodRows)
        });
      }
    } catch (err) {
      console.warn('Aviso ao sincronizar by_angely_products no Supabase:', err.message);
    }

    return okState;
  }

  /**
   * Registra um novo pedido diretamente na tabela public.by_angely_orders do Supabase
   */
  async function insertOrderToSupabase(order) {
    if (!order || !order.id) return false;
    var url = SUPABASE_URL + '/rest/v1/by_angely_orders?on_conflict=id';
    var res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({
        id: order.id,
        order_number: order.orderNumber,
        status: order.status || 'awaiting_confirmation',
        total: Number(order.total) || 0,
        payment_method: order.paymentMethod || 'pix',
        customer_email: (order.customer && order.customer.email) || '',
        payload: order,
        updated_at: new Date().toISOString()
      })
    });
    return res.ok;
  }

  /**
   * Comprime uma imagem no navegador via Canvas para garantir carregamento rápido e leveza no banco
   */
  function compressImageFileToDataUrl(file, maxWidth, quality) {
    maxWidth = maxWidth || 1080;
    quality = quality || 0.84;
    return new Promise(function (resolve) {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        var fallbackReader = new FileReader();
        fallbackReader.onload = function (ev) { resolve(ev.target.result); };
        fallbackReader.onerror = function () { resolve(null); };
        fallbackReader.readAsDataURL(file);
        return;
      }
      var reader = new FileReader();
      reader.onload = function (ev) {
        var img = new Image();
        img.onload = function () {
          try {
            var w = img.width;
            var h = img.height;
            if (w > maxWidth) {
              h = Math.round((h * maxWidth) / w);
              w = maxWidth;
            }
            var canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            var outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            var compressed = canvas.toDataURL(outType, quality);
            resolve(compressed);
          } catch (e) {
            resolve(ev.target.result);
          }
        };
        img.onerror = function () { resolve(ev.target.result); };
        img.src = ev.target.result;
      };
      reader.onerror = function () { resolve(null); };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Faz upload de imagem/vídeo para o Supabase Storage (bucket público `products`)
   * Retorna a URL pública de CDN se bem-sucedido, ou DataURL otimizada como fallback imediato.
   */
  async function uploadMediaToSupabaseStorage(file) {
    if (!file) return null;
    try {
      var ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      var safeName = 'item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
      var objectPath = 'catalog/' + safeName;
      var uploadUrl = SUPABASE_URL + '/storage/v1/object/products/' + objectPath;

      var res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'true'
        },
        body: file
      });

      if (res.ok) {
        return SUPABASE_URL + '/storage/v1/object/public/products/' + objectPath;
      }
    } catch (err) {
      console.warn('Usando otimização local para mídia:', err.message);
    }
    return await compressImageFileToDataUrl(file, 1080, 0.84);
  }

  root.ByAngelyCloud = {
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
    RENDER_BACKEND_URL: RENDER_BACKEND_URL,
    getApiBaseUrl: getApiBaseUrl,
    fetchStateFromSupabase: fetchStateFromSupabase,
    saveStateToSupabase: saveStateToSupabase,
    insertOrderToSupabase: insertOrderToSupabase,
    uploadMediaToSupabaseStorage: uploadMediaToSupabaseStorage,
    compressImageFileToDataUrl: compressImageFileToDataUrl
  };
})(typeof self !== 'undefined' ? self : this);
