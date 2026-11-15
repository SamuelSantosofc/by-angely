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
  var RENDER_BACKEND_URL = 'https://by-angely-api.onrender.com';

  function getApiBaseUrl() {
    if (typeof window === 'undefined') return '';
    var host = window.location.hostname;
    // Se estiver rodando direto no Render ou localhost com Node.js, usa a própria origem
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.onrender.com')) {
      return '';
    }
    // Se estiver no Cloudflare Pages (.pages.dev) ou domínio customizado, aponta para o Web Service no Render
    return RENDER_BACKEND_URL;
  }

  /**
   * Busca o estado da loja no Supabase (tabela public.by_angely_store_state)
   */
  async function fetchStateFromSupabase() {
    var url = SUPABASE_URL + '/rest/v1/by_angely_store_state?id=eq.main&select=state,updated_at';
    var res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Accept': 'application/json'
      }
    });
    if (!res.ok) throw new Error('Supabase GET falhou: ' + res.status);
    var rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0 && rows[0].state) {
      return rows[0].state;
    }
    return null;
  }

  /**
   * Registra um novo pedido diretamente na tabela public.by_angely_orders do Supabase (permitido via RLS Insert)
   */
  async function insertOrderToSupabase(order) {
    if (!order || !order.id) return false;
    var url = SUPABASE_URL + '/rest/v1/by_angely_orders';
    var res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
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
   * Faz upload de imagem/vídeo para o Supabase Storage (bucket público `products`)
   * Retorna a URL pública de CDN se bem-sucedido, ou null para usar fallback DataURL.
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
      console.warn('Fallback local para mídia (upload Storage indisponível):', err.message);
    }
    return null;
  }

  root.ByAngelyCloud = {
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
    RENDER_BACKEND_URL: RENDER_BACKEND_URL,
    getApiBaseUrl: getApiBaseUrl,
    fetchStateFromSupabase: fetchStateFromSupabase,
    insertOrderToSupabase: insertOrderToSupabase,
    uploadMediaToSupabaseStorage: uploadMediaToSupabaseStorage
  };
})(typeof self !== 'undefined' ? self : this);
