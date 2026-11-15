/**
 * By Angély — Aplicação Principal da Loja (Storefront, Catálogo, Produto, Sacola, Checkout, Área da Cliente e Acessibilidade)
 * Itaperuna, Rio de Janeiro — Brasil
 */
(function () {
  'use strict';

  const STORAGE_KEY_DB = 'by_angely_db_v1';
  const STORAGE_KEY_CART = 'by_angely_cart_v1';
  const STORAGE_KEY_WISHLIST = 'by_angely_wishlist_v1';
  const STORAGE_KEY_CUSTOMER_SESSION = 'by_angely_customer_session_v1';
  const STORAGE_KEY_ADMIN_SESSION = 'by_angely_admin_session_v1';
  const STORAGE_KEY_COOKIE_CONSENT = 'by_angely_cookie_consent_v1';
  const STORAGE_KEY_A11Y = 'by_angely_a11y_v1';

  // Estado Global da Aplicação
  const AppState = {
    db: null,
    currentView: 'home', // 'home' | 'catalog' | 'favorites' | 'checkout' | 'account' | 'policies' | 'admin'
    activePolicyTab: 'privacy',
    activeAccountTab: 'orders',
    cart: [],
    wishlist: [],
    appliedCoupon: null,
    selectedShippingMethodId: 'pickup_itaperuna',
    selectedPaymentMethod: 'pix',
    lastCreatedOrder: null,
    currentCustomer: null,
    currentAdmin: null,
    activeProductModal: {
      productId: null,
      selectedColor: null,
      selectedSize: null,
      mediaIndex: 0
    },
    filters: {
      search: '',
      category: 'all',
      size: 'all',
      color: 'all',
      style: 'all',
      priceRange: 'all',
      availability: 'all',
      sortBy: 'featured'
    },
    a11y: {
      reduceMotion: false,
      highContrast: false,
      largeText: false,
      disableCustomCursor: false
    }
  };

  // =========================================================================
  // UTILITÁRIOS DE FORMATAÇÃO E SEGURANÇA
  // =========================================================================
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatBRL(value) {
    const num = Number(value) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatDateBR(isoString) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  }

  // Ícones SVG Oficiais (Instagram, WhatsApp, E-mail)
  const OFFICIAL_ICONS = {
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441 1.44-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.124.553 4.195 1.604 6.018L.099 23.541l5.631-1.477a11.986 11.986 0 006.301 1.787h.005c6.645 0 12.03-5.385 12.03-12.031 0-3.214-1.252-6.236-3.524-8.508C18.268 1.039 15.245 0 12.031 0zm6.564 17.243c-.277.781-1.613 1.491-2.238 1.588-.578.088-1.309.125-2.115-.131-.491-.156-1.119-.366-1.922-.712-3.379-1.459-5.586-4.863-5.755-5.088-.168-.225-1.375-1.829-1.375-3.489 0-1.66 0.869-2.476 1.178-2.813.309-.338.675-.422.9-.422.225 0 .45.003.647.012.208.01.486-.079.76.579.281.675.956 2.334 1.041 2.503.084.169.141.366.028.591-.113.225-.169.366-.338.563-.169.197-.355.441-.506.591-.169.169-.345.352-.148.69.197.338.874 1.442 1.877 2.337 1.29 1.15 2.378 1.506 2.716 1.675.338.169.534.141.731-.084.197-.225.844-.984 1.069-1.322.225-.338.45-.281.759-.169.309.113 1.969.928 2.306 1.097.338.169.563.253.647.394.084.141.084.816-.193 1.597z"/></svg>',
    email: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>'
  };

  function getOfficialContacts() {
    const st = (AppState.db && AppState.db.storeSettings) || {};
    const defaultText = 'Olá! Vim pelo site da BY ANGÉLY e gostaria de conhecer os produtos.';
    const waText = st.whatsappGreeting || defaultText;
    const waUrl = 'https://wa.me/5528999871458?text=' + encodeURIComponent(waText);
    const waBaseUrl = 'https://wa.me/5528999871458';
    const igUrl = st.instagramUrl || 'https://www.instagram.com/_by.angely?dlrf=OXJrN2EwdHNka21x';
    const igHandle = (!st.instagramHandle || st.instagramHandle.toLowerCase().includes('a confirmar'))
      ? '@_by.angely'
      : st.instagramHandle;
    const emailAddr = (!st.email || st.email.toLowerCase().includes('a confirmar'))
      ? 'byangely1@gmail.com'
      : st.email;
    const phoneDisplay = (!st.whatsapp || st.whatsapp.toLowerCase().includes('a confirmar'))
      ? '+55 28 99987-1458'
      : st.whatsapp;

    return {
      storeName: 'BY ANGÉLY',
      whatsappDisplay: phoneDisplay,
      whatsappUrl: waUrl,
      whatsappBaseUrl: waBaseUrl,
      whatsappGreeting: waText,
      instagramUrl: igUrl,
      instagramHandle: igHandle,
      email: emailAddr,
      mailtoUrl: 'mailto:' + emailAddr
    };
  }

  /**
   * Gera o link direto do WhatsApp identificando o produto, código SKU, tamanho, cor, valor e link da peça
   */
  function getProductWhatsappUrl(product, selectedSize, selectedColor) {
    if (!product) return getOfficialContacts().whatsappUrl;
    const priceStr = formatBRL(getEffectivePrice(product));
    const sizeInfo = selectedSize || (product.sizes && product.sizes[0]) || 'A definir';
    const colorInfo = selectedColor || (product.colors && product.colors[0] && product.colors[0].name) || 'A definir';
    const baseUrl = (typeof window !== 'undefined' && window.location)
      ? (window.location.origin + window.location.pathname + '?produto=' + encodeURIComponent(product.id))
      : '';

    const messageLines = [
      'Olá! Vim pelo site da BY ANGÉLY e gostaria de informações / comprar este produto:',
      '',
      '• *Produto:* ' + product.name,
      '• *Código (SKU):* ' + (product.sku || product.id),
      '• *Cor selecionada:* ' + colorInfo,
      '• *Tamanho selecionado:* ' + sizeInfo,
      '• *Valor:* ' + priceStr
    ];
    if (baseUrl && baseUrl.startsWith('http')) {
      messageLines.push('• *Link da peça:* ' + baseUrl);
    }

    return 'https://wa.me/5528999871458?text=' + encodeURIComponent(messageLines.join('\n'));
  }

  function getEffectivePrice(product) {
    if (product.isPromo && product.promoPrice && Number(product.promoPrice) > 0 && Number(product.promoPrice) < Number(product.price)) {
      return Number(product.promoPrice);
    }
    return Number(product.price) || 0;
  }

  function getTotalProductStock(product) {
    if (!product || !Array.isArray(product.variations)) return 0;
    return product.variations.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
  }

  function getVariationStock(product, size, color) {
    if (!product || !Array.isArray(product.variations)) return 0;
    const found = product.variations.find((v) => v.size === size && v.color === color);
    return found ? Number(found.stock) || 0 : 0;
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const item = document.createElement('div');
    item.className = 'toast-item';
    if (type === 'success') item.style.borderLeftColor = '#2E7D5B';
    if (type === 'warning') item.style.borderLeftColor = '#D9822B';
    if (type === 'danger') item.style.borderLeftColor = '#C93B3B';
    item.setAttribute('role', 'status');
    item.setAttribute('aria-live', 'polite');
    item.textContent = message;
    container.appendChild(item);
    setTimeout(() => {
      if (item.parentNode) item.parentNode.removeChild(item);
    }, 4200);
  }

  // =========================================================================
  // PERSISTÊNCIA E SINCRONIZAÇÃO (SUPABASE + RENDER BACKEND + LOCALSTORAGE)
  // =========================================================================
  async function loadDatabase() {
    const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';

    // 1. Tenta carregar via Supabase PostgreSQL (alta disponibilidade em sa-east-1)
    if (window.ByAngelyCloud && window.ByAngelyCloud.fetchStateFromSupabase) {
      try {
        const supaState = await window.ByAngelyCloud.fetchStateFromSupabase();
        if (supaState && supaState.storeSettings) {
          AppState.db = supaState;
          try {
            localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(supaState));
          } catch (e) {}
          // Acorda o backend Render em paralelo sem bloquear a renderização
          fetch(apiBase + '/api/health').catch(() => {});
          return;
        }
      } catch (e) {
        // Prossegue para o servidor Render / API
      }
    }

    // 2. Tenta carregar do servidor Node.js / Render (/api/state)
    try {
      const res = await fetch(apiBase + '/api/state', { cache: 'no-store' });
      if (res.ok) {
        const serverDb = await res.json();
        if (serverDb && serverDb.storeSettings) {
          AppState.db = serverDb;
          try {
            localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(serverDb));
          } catch (e) { /* ignore quota */ }
          return;
        }
      }
    } catch (e) {
      // Modo estático/offline: utiliza localStorage ou Seed
    }

    // 3. Fallback para localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DB);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.storeSettings) {
          AppState.db = parsed;
          return;
        }
      }
    } catch (e) { /* fallback to seed */ }

    // 4. Inicializa a partir do Seed oficial
    AppState.db = window.ByAngelySeed.createInitialDatabase();
    saveDatabase();
  }

  async function saveDatabase(auditAction) {
    if (!AppState.db) return;
    if (auditAction) {
      AppState.db.auditLog = AppState.db.auditLog || [];
      AppState.db.auditLog.unshift({
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString(),
        actor: AppState.currentAdmin ? AppState.currentAdmin.name : 'Sistema/Cliente',
        action: auditAction
      });
      if (AppState.db.auditLog.length > 150) {
        AppState.db.auditLog = AppState.db.auditLog.slice(0, 150);
      }
    }
    AppState.db.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(AppState.db));
    } catch (e) {
      console.warn('Aviso: limite de armazenamento local atingido.', e);
    }
    try {
      const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';
      await fetch(apiBase + '/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(AppState.db)
      });
    } catch (e) {
      // Silencioso se rodando sem servidor Node ativo
    }
  }

  function loadLocalClientState() {
    try {
      const cartRaw = localStorage.getItem(STORAGE_KEY_CART);
      if (cartRaw) AppState.cart = JSON.parse(cartRaw) || [];
      const wishRaw = localStorage.getItem(STORAGE_KEY_WISHLIST);
      if (wishRaw) AppState.wishlist = JSON.parse(wishRaw) || [];
      const custRaw = localStorage.getItem(STORAGE_KEY_CUSTOMER_SESSION);
      if (custRaw) AppState.currentCustomer = JSON.parse(custRaw) || null;
      const admRaw = sessionStorage.getItem(STORAGE_KEY_ADMIN_SESSION);
      if (admRaw) AppState.currentAdmin = JSON.parse(admRaw) || null;
      const a11yRaw = localStorage.getItem(STORAGE_KEY_A11Y);
      if (a11yRaw) AppState.a11y = { ...AppState.a11y, ...JSON.parse(a11yRaw) };
    } catch (e) {
      console.warn('Erro ao restaurar sessão local:', e);
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(AppState.cart));
    } catch (e) {}
    updateHeaderCounters();
  }

  function saveWishlist() {
    try {
      localStorage.setItem(STORAGE_KEY_WISHLIST, JSON.stringify(AppState.wishlist));
    } catch (e) {}
    updateHeaderCounters();
  }

  // =========================================================================
  // IDENTIDADE VISUAL (LOGOTIPO OU TIPOGRAFIA "BY ANGÉLY")
  // =========================================================================
  function renderBrandMarkup(stacked = false) {
    const settings = AppState.db.storeSettings;
    if (settings.logoMode === 'image' && settings.logoUrl) {
      return `<img src="${escapeHtml(settings.logoUrl)}" alt="${escapeHtml(settings.logoAlt || settings.brandName)}" class="brand-logo-custom" />`;
    }
    return `
      <span class="brand-wordmark ${stacked ? 'stacked' : ''}" aria-label="${escapeHtml(settings.brandName)}">
        <span class="brand-by">BY</span>
        <span class="brand-angely">ANGÉLY</span>
      </span>
    `;
  }

  function updateGlobalChrome() {
    const settings = AppState.db.storeSettings;

    // Barra de anúncio superior
    const announcementTextEl = document.getElementById('announcement-text');
    if (announcementTextEl) {
      announcementTextEl.textContent = settings.announcementBar || 'By Angély • Itaperuna, RJ';
    }

    // Banner de aviso de demonstração
    const demoBannerEl = document.getElementById('demo-disclosure-banner');
    if (demoBannerEl) {
      const hasDemoProducts = AppState.db.products.some((p) => p.isDemo && p.status === 'published');
      demoBannerEl.style.display = (settings.showDemoBanner && hasDemoProducts) ? 'block' : 'none';
    }

    // Logotipo no Cabeçalho e no Rodapé
    const headerBrandEl = document.getElementById('header-brand-link');
    if (headerBrandEl) headerBrandEl.innerHTML = renderBrandMarkup(false);

    const footerBrandEl = document.getElementById('footer-brand-logo');
    if (footerBrandEl) footerBrandEl.innerHTML = renderBrandMarkup(true);

    // Strip de categorias no cabeçalho
    const stripEl = document.getElementById('header-category-strip');
    if (stripEl) {
      const cats = [...AppState.db.categories].sort((a, b) => (a.order || 0) - (b.order || 0));
      stripEl.innerHTML = `
        <button type="button" class="category-pill-link ${AppState.currentView === 'catalog' && AppState.filters.category === 'all' ? 'active' : ''}" data-action="filter-category" data-category="all">
          Todas as Peças
        </button>
        ${cats.map((c) => `
          <button type="button" class="category-pill-link ${AppState.currentView === 'catalog' && AppState.filters.category === c.slug ? 'active' : ''}" data-action="filter-category" data-category="${escapeHtml(c.slug)}">
            ${escapeHtml(c.name)}
          </button>
        `).join('')}
        <button type="button" class="category-pill-link ${AppState.currentView === 'catalog' && AppState.filters.availability === 'promo' ? 'active' : ''}" data-action="filter-promo" style="color: var(--accent-gold);">
          Promoções
        </button>
      `;
    }

    // Rodapé com informações oficiais e botões funcionais de contato e redes sociais
    const footerStoreInfoEl = document.getElementById('footer-store-info');
    if (footerStoreInfoEl) {
      const contacts = getOfficialContacts();
      footerStoreInfoEl.innerHTML = `
        <p style="margin-bottom:8px;"><strong>${escapeHtml(contacts.storeName)} — ${escapeHtml(settings.brandSubtitle)}</strong></p>
        <p style="font-size:0.83rem;color:#C4BCB0;margin-bottom:6px;">Localização: ${escapeHtml(settings.city)} - ${escapeHtml(settings.state)}, Brasil</p>
        <p style="font-size:0.82rem;color:#E5DACB;margin-bottom:4px;">WhatsApp Oficial: <a href="${escapeHtml(contacts.whatsappUrl)}" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;">${escapeHtml(contacts.whatsappDisplay)}</a></p>
        <p style="font-size:0.82rem;color:#E5DACB;margin-bottom:4px;">Instagram: <a href="${escapeHtml(contacts.instagramUrl)}" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;">${escapeHtml(contacts.instagramHandle)}</a></p>
        <p style="font-size:0.82rem;color:#E5DACB;margin-bottom:6px;">E-mail Comercial: <a href="${escapeHtml(contacts.mailtoUrl)}" style="text-decoration:underline;">${escapeHtml(contacts.email)}</a></p>
        <p style="font-size:0.76rem;color:#9E968B;margin-bottom:4px;">Razão Social / CNPJ: ${escapeHtml(settings.legalName)} (${escapeHtml(settings.cnpj)})</p>
        <div class="footer-social-buttons" role="group" aria-label="Canais oficiais BY ANGÉLY">
          <a href="${escapeHtml(contacts.whatsappUrl)}" target="_blank" rel="noopener noreferrer" class="footer-social-pill" aria-label="Conversar pelo WhatsApp Oficial BY ANGÉLY">
            ${OFFICIAL_ICONS.whatsapp}
            <span>WhatsApp</span>
          </a>
          <a href="${escapeHtml(contacts.instagramUrl)}" target="_blank" rel="noopener noreferrer" class="footer-social-pill" aria-label="Abrir perfil oficial no Instagram @_by.angely">
            ${OFFICIAL_ICONS.instagram}
            <span>Instagram</span>
          </a>
          <a href="${escapeHtml(contacts.mailtoUrl)}" class="footer-social-pill" aria-label="Enviar e-mail para byangely1@gmail.com">
            ${OFFICIAL_ICONS.email}
            <span>E-mail</span>
          </a>
        </div>
      `;
    }

    updateHeaderCounters();
  }

  function updateHeaderCounters() {
    const cartCount = AppState.cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const wishCount = AppState.wishlist.length;

    const cartBadge = document.getElementById('header-cart-count');
    if (cartBadge) cartBadge.textContent = String(cartCount);

    const wishBadge = document.getElementById('header-wishlist-count');
    if (wishBadge) wishBadge.textContent = String(wishCount);

    const accountLabel = document.getElementById('header-account-label');
    if (accountLabel) {
      accountLabel.textContent = AppState.currentCustomer
        ? AppState.currentCustomer.name.split(' ')[0]
        : 'Conta';
    }
  }

  // =========================================================================
  // RENDERIZAÇÃO DE CARTÃO DE PRODUTO
  // =========================================================================
  function renderProductCard(product) {
    const effectivePrice = getEffectivePrice(product);
    const hasPromo = effectivePrice < Number(product.price);
    const discountPercent = hasPromo
      ? Math.round(((Number(product.price) - effectivePrice) / Number(product.price)) * 100)
      : 0;
    const totalStock = getTotalProductStock(product);
    const isFav = AppState.wishlist.includes(product.id);
    const firstImage = (product.media && product.media.find((m) => m.type === 'image')) || (product.media && product.media[0]) || {
      url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80',
      alt: product.name
    };
    const hasVideo = product.media && product.media.some((m) => m.type === 'video');

    return `
      <article class="product-card" data-product-id="${escapeHtml(product.id)}">
        <div class="product-card-media" data-action="open-product" data-product-id="${escapeHtml(product.id)}" role="button" tabindex="0" aria-label="Ver detalhes de ${escapeHtml(product.name)}">
          <div class="product-badges">
            ${product.isDemo ? '<span class="badge-tag badge-demo" title="Imagem ilustrativa de demonstração">Demonstração</span>' : ''}
            ${hasPromo ? `<span class="badge-tag badge-promo">-${discountPercent}%</span>` : ''}
            ${product.isNew && !hasPromo ? '<span class="badge-tag badge-new">Novidade</span>' : ''}
            ${hasVideo ? '<span class="badge-tag badge-video">Vídeo</span>' : ''}
          </div>
          <button type="button" class="wishlist-btn-card ${isFav ? 'active' : ''}" data-action="toggle-wishlist" data-product-id="${escapeHtml(product.id)}" aria-label="${isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}" title="Favoritar peça">
            ${isFav ? '♥' : '♡'}
          </button>
          <img src="${escapeHtml(firstImage.url)}" alt="${escapeHtml(firstImage.alt || product.name)}" loading="lazy" />
        </div>
        <div class="product-card-body">
          <div class="product-card-meta">
            <span>${escapeHtml(product.categoryName || product.category)}</span>
            <span>${escapeHtml(product.style || '')}</span>
          </div>
          <h3 class="product-card-title" data-action="open-product" data-product-id="${escapeHtml(product.id)}">
            ${escapeHtml(product.name)}
          </h3>
          <div class="product-card-prices">
            <span class="price-current">${formatBRL(effectivePrice)}</span>
            ${hasPromo ? `<span class="price-old">${formatBRL(product.price)}</span>` : ''}
          </div>
          <div class="product-card-swatches">
            ${(product.colors || []).map((c) => `
              <span class="color-dot" style="background-color: ${escapeHtml(c.hex || '#ccc')};" title="Cor: ${escapeHtml(c.name)}"></span>
            `).join('')}
            <span class="size-chips-mini">Tam: ${(product.sizes || []).join(', ')}</span>
          </div>
          ${product.isDemo ? `
            <p style="font-size:0.71rem;color:var(--status-warning-text);background:var(--status-warning-bg);padding:4px 7px;border-radius:4px;margin-bottom:10px;">
              Imagem ilustrativa (Demonstração)
            </p>
          ` : ''}
          <div class="product-card-actions">
            <button type="button" class="btn btn-primary btn-sm" data-action="open-product" data-product-id="${escapeHtml(product.id)}" ${totalStock <= 0 ? 'disabled' : ''}>
              ${totalStock > 0 ? 'Escolher Opções' : 'Esgotado'}
            </button>
            <button type="button" class="btn btn-outline btn-sm" data-action="share-product" data-product-id="${escapeHtml(product.id)}" aria-label="Compartilhar ${escapeHtml(product.name)}" title="Compartilhar produto">
              ↗
            </button>
          </div>
        </div>
      </article>
    `;
  }

  // =========================================================================
  // RENDERIZAÇÃO DAS PÁGINAS (VIEWS)
  // =========================================================================
  function navigateTo(view, options = {}) {
    AppState.currentView = view;
    if (options.policyTab) AppState.activePolicyTab = options.policyTab;
    if (options.accountTab) AppState.activeAccountTab = options.accountTab;

    // Atualiza links ativos do menu
    document.querySelectorAll('[data-nav-view]').forEach((el) => {
      el.classList.toggle('active', el.getAttribute('data-nav-view') === view);
    });

    updateGlobalChrome();
    renderMainView();
    if (!options.preserveScroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function renderMainView() {
    const mainEl = document.getElementById('app-main-content');
    if (!mainEl) return;

    switch (AppState.currentView) {
      case 'home':
        mainEl.innerHTML = renderHomeView();
        break;
      case 'catalog':
        mainEl.innerHTML = renderCatalogView();
        bindCatalogFilterEvents();
        break;
      case 'favorites':
        mainEl.innerHTML = renderFavoritesView();
        break;
      case 'checkout':
        mainEl.innerHTML = renderCheckoutView();
        bindCheckoutEvents();
        break;
      case 'account':
        mainEl.innerHTML = renderAccountView();
        bindAccountEvents();
        break;
      case 'policies':
        mainEl.innerHTML = renderPoliciesView();
        break;
      case 'contact':
        mainEl.innerHTML = renderDedicatedContactView();
        break;
      case 'admin':
        if (window.ByAngelyAdmin) {
          window.ByAngelyAdmin.renderAdminView(mainEl);
        }
        break;
      default:
        mainEl.innerHTML = renderHomeView();
    }
  }

  // -------------------------------------------------------------------------
  // 1. PÁGINA INICIAL (HOME)
  // -------------------------------------------------------------------------
  function renderHomeView() {
    const settings = AppState.db.storeSettings;
    const hero = settings.heroBanner || {};
    const story = settings.brandStory || {};
    const publishedProducts = AppState.db.products.filter((p) => p.status === 'published');
    const featuredProducts = publishedProducts.filter((p) => p.isFeatured).slice(0, 4);
    const newProducts = publishedProducts.filter((p) => p.isNew).slice(0, 4);
    const promoProducts = publishedProducts.filter((p) => p.isPromo).slice(0, 4);
    const categories = [...AppState.db.categories].sort((a, b) => (a.order || 0) - (b.order || 0));

    return `
      <!-- Hero Editorial -->
      <section class="hero-section" aria-label="Apresentação da Coleção By Angély">
        <div class="container hero-grid">
          <div class="hero-content">
            <span class="hero-eyebrow">${escapeHtml(hero.eyebrow || 'MODA FEMININA • ITAPERUNA, RJ')}</span>
            <h1 class="hero-title">${escapeHtml(hero.title || 'Elegância natural em cada detalhe.')}</h1>
            <p class="hero-subtitle">${escapeHtml(hero.subtitle || '')}</p>
            <div class="hero-actions">
              <button type="button" class="btn btn-primary" data-action="go-catalog">
                ${escapeHtml(hero.ctaPrimaryText || 'Explorar Coleção')}
              </button>
              <button type="button" class="btn btn-outline" data-action="filter-promo">
                Ver Promoções
              </button>
            </div>
            <div class="hero-trust-strip">
              <div class="hero-trust-item">
                <strong>Atendimento em Itaperuna, RJ</strong>
                <span>Retirada local e envio configuráveis</span>
              </div>
              <div class="hero-trust-item">
                <strong>Pagamento Transparente</strong>
                <span>Pix EMV oficial e checkout seguro</span>
              </div>
              <div class="hero-trust-item">
                <strong>Compra Protegida (CDC/LGPD)</strong>
                <span>7 dias para arrependimento legal</span>
              </div>
            </div>
          </div>
          <div class="hero-media-wrapper">
            <img src="${escapeHtml(hero.imageUrl)}" alt="${escapeHtml(hero.imageAlt || 'Coleção By Angély')}" />
            ${hero.isDemoImage ? `
              <div class="media-credit-badge">
                <span>IMAGEM ILUSTRATIVA DE DEMONSTRAÇÃO</span>
                <button type="button" data-action="go-policies" data-tab="references" style="color:#E5DACB;text-decoration:underline;font-size:0.7rem;">Ver Licença</button>
              </div>
            ` : ''}
          </div>
        </div>
      </section>

      <!-- Categorias da Loja -->
      <section class="section-block" aria-labelledby="sec-cat-title">
        <div class="container">
          <div class="section-header">
            <div>
              <span class="section-eyebrow">Curadoria por Peça</span>
              <h2 id="sec-cat-title" class="section-title">Explore por Categoria</h2>
              <p class="section-description">Modelagens femininas adultas desenhadas para valorizar diferentes silhuetas e ocasiões.</p>
            </div>
            <button type="button" class="btn btn-outline btn-sm" data-action="go-catalog">Ver Catálogo Completo</button>
          </div>
          <div class="categories-grid">
            ${categories.map((cat) => `
              <button type="button" class="category-card" data-action="filter-category" data-category="${escapeHtml(cat.slug)}" aria-label="Explorar categoria ${escapeHtml(cat.name)}">
                <img src="${escapeHtml(cat.imageUrl)}" alt="Categoria ${escapeHtml(cat.name)} — Imagem Ilustrativa" loading="lazy" />
                <div class="category-card-overlay">
                  <span class="category-card-title">${escapeHtml(cat.name)}</span>
                  <span class="category-card-sub">Explorar peças →</span>
                </div>
              </button>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- Produtos em Destaque -->
      <section class="section-block bg-surface" aria-labelledby="sec-feat-title">
        <div class="container">
          <div class="section-header">
            <div>
              <span class="section-eyebrow">Seleção Especial</span>
              <h2 id="sec-feat-title" class="section-title">Destaques da Coleção</h2>
              <p class="section-description">Peças demonstrativas com tabela de medidas, galeria interativa e controle de estoque por tamanho e cor.</p>
            </div>
            <button type="button" class="btn btn-outline btn-sm" data-action="go-catalog">Ver Todos (${publishedProducts.length})</button>
          </div>
          <div class="products-grid">
            ${featuredProducts.map(renderProductCard).join('')}
          </div>
        </div>
      </section>

      <!-- Novidades -->
      <section class="section-block" aria-labelledby="sec-new-title">
        <div class="container">
          <div class="section-header">
            <div>
              <span class="section-eyebrow">Recém-Chegados</span>
              <h2 id="sec-new-title" class="section-title">Novidades</h2>
            </div>
            <button type="button" class="btn btn-outline btn-sm" data-action="go-catalog">Explorar Novidades</button>
          </div>
          <div class="products-grid">
            ${newProducts.map(renderProductCard).join('')}
          </div>
        </div>
      </section>

      <!-- Promoções e Condições Especiais -->
      ${promoProducts.length > 0 ? `
      <section class="section-block bg-surface" aria-labelledby="sec-promo-title">
        <div class="container">
          <div class="section-header">
            <div>
              <span class="section-eyebrow">Oportunidades</span>
              <h2 id="sec-promo-title" class="section-title">Seleção em Promoção</h2>
              <p class="section-description">Valores promocionais claros com indicação do preço anterior e percentual de economia.</p>
            </div>
            <button type="button" class="btn btn-gold btn-sm" data-action="filter-promo">Ver Todas as Promoções</button>
          </div>
          <div class="products-grid">
            ${promoProducts.map(renderProductCard).join('')}
          </div>
        </div>
      </section>
      ` : ''}

      <!-- Apresentação Institucional da Marca -->
      <section class="section-block" aria-labelledby="sec-story-title">
        <div class="container">
          <div class="hero-grid" style="min-height:auto;">
            <div class="hero-media-wrapper" style="aspect-ratio: 4 / 3.2;">
              <img src="${escapeHtml(story.imageUrl)}" alt="Apresentação institucional By Angély — Imagem Ilustrativa" loading="lazy" />
              ${story.isDemoImage ? `
                <div class="media-credit-badge">
                  <span>IMAGEM ILUSTRATIVA • SUBSTITUÍVEL NO PAINEL</span>
                </div>
              ` : ''}
            </div>
            <div class="hero-content">
              <span class="section-eyebrow">Sobre a Marca • Itaperuna, RJ</span>
              <h2 id="sec-story-title" class="section-title" style="margin-bottom:16px;">${escapeHtml(story.title)}</h2>
              <p style="font-size:1.06rem;font-weight:500;color:var(--text-primary);margin-bottom:14px;">
                ${escapeHtml(story.lead)}
              </p>
              <p style="color:var(--text-secondary);margin-bottom:24px;">
                ${escapeHtml(story.body)}
              </p>
              <div class="alert-box alert-info">
                <strong>Personalização pela Proprietária:</strong> Todos os textos institucionais, logotipo oficial, fotos, vídeos, chaves de pagamento e dados de contato podem ser atualizados a qualquer momento no <strong>Painel Administrativo</strong>.
              </div>
              <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
                <a href="${escapeHtml(getOfficialContacts().instagramUrl)}" target="_blank" rel="noopener noreferrer" class="contact-btn-action instagram-style">
                  ${OFFICIAL_ICONS.instagram}
                  <span>Seguir no Instagram (${escapeHtml(getOfficialContacts().instagramHandle)})</span>
                </a>
                <a href="${escapeHtml(getOfficialContacts().whatsappUrl)}" target="_blank" rel="noopener noreferrer" class="contact-btn-action whatsapp-style">
                  ${OFFICIAL_ICONS.whatsapp}
                  <span>Atendimento via WhatsApp</span>
                </a>
              </div>
              <div style="display:flex;gap:12px;flex-wrap:wrap;">
                <button type="button" class="btn btn-primary btn-sm" data-action="go-view" data-view="admin">Acessar Painel da Proprietária</button>
                <button type="button" class="btn btn-outline btn-sm" data-action="go-policies" data-tab="privacy">Políticas e Transparência</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      ${renderContactBlockMarkup()}
    `;
  }

  function renderContactBlockMarkup() {
    const settings = AppState.db.storeSettings;
    const contacts = getOfficialContacts();
    return `
      <!-- Canais Oficiais de Contato, Redes Sociais e Atendimento ao Cliente (SAC) -->
      <section class="section-block bg-surface" id="contact-section" aria-labelledby="sec-contact-title">
        <div class="container">
          <div class="section-header" style="margin-bottom:28px;">
            <div>
              <span class="section-eyebrow">Canais Oficiais • ${escapeHtml(contacts.storeName)}</span>
              <h2 id="sec-contact-title" class="section-title">Atendimento ao Cliente &amp; Redes Sociais</h2>
              <p class="section-description">
                Converse diretamente com a equipe da <strong>${escapeHtml(contacts.storeName)}</strong> pelo WhatsApp, acompanhe as novidades no Instagram oficial ou envie um e-mail comercial.
              </p>
            </div>
          </div>

          <!-- Cartões de Contato Direto com Botões Funcionais -->
          <div class="contact-channels-grid">
            <!-- 1. WhatsApp Oficial -->
            <div class="contact-channel-card">
              <div>
                <div class="contact-channel-header" style="margin-bottom:12px;">
                  <span class="contact-icon-circle">${OFFICIAL_ICONS.whatsapp}</span>
                  <div>
                    <span style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;">Atendimento Rápido</span>
                    <strong style="font-family:var(--font-serif);font-size:1.35rem;">WhatsApp Oficial</strong>
                  </div>
                </div>
                <p style="font-size:0.9rem;font-weight:600;color:var(--text-primary);margin-bottom:4px;">
                  ${escapeHtml(contacts.whatsappDisplay)}
                </p>
                <p style="font-size:0.82rem;color:var(--text-secondary);">
                  Inicie uma conversa direta no WhatsApp para tirar dúvidas sobre peças, tamanhos, disponibilidade e pedidos.
                </p>
              </div>
              <a href="${escapeHtml(contacts.whatsappUrl)}" target="_blank" rel="noopener noreferrer" class="contact-btn-action whatsapp-style" aria-label="Conversar no WhatsApp +55 28 99987-1458">
                ${OFFICIAL_ICONS.whatsapp}
                <span>Conversar no WhatsApp</span>
              </a>
            </div>

            <!-- 2. Instagram Oficial -->
            <div class="contact-channel-card">
              <div>
                <div class="contact-channel-header" style="margin-bottom:12px;">
                  <span class="contact-icon-circle">${OFFICIAL_ICONS.instagram}</span>
                  <div>
                    <span style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;">Rede Social Oficial</span>
                    <strong style="font-family:var(--font-serif);font-size:1.35rem;">Instagram ${escapeHtml(contacts.instagramHandle)}</strong>
                  </div>
                </div>
                <p style="font-size:0.9rem;font-weight:600;color:var(--text-primary);margin-bottom:4px;">
                  ${escapeHtml(contacts.instagramHandle)}
                </p>
                <p style="font-size:0.82rem;color:var(--text-secondary);">
                  Acompanhe os lançamentos, provadores, combinações e novidades exclusivas no perfil oficial da ${escapeHtml(contacts.storeName)}.
                </p>
              </div>
              <a href="${escapeHtml(contacts.instagramUrl)}" target="_blank" rel="noopener noreferrer" class="contact-btn-action instagram-style" aria-label="Abrir perfil oficial da BY ANGÉLY no Instagram">
                ${OFFICIAL_ICONS.instagram}
                <span>Abrir Instagram Oficial</span>
              </a>
            </div>

            <!-- 3. E-mail Comercial -->
            <div class="contact-channel-card">
              <div>
                <div class="contact-channel-header" style="margin-bottom:12px;">
                  <span class="contact-icon-circle">${OFFICIAL_ICONS.email}</span>
                  <div>
                    <span style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;">Canal Formal &amp; SAC</span>
                    <strong style="font-family:var(--font-serif);font-size:1.35rem;">E-mail Comercial</strong>
                  </div>
                </div>
                <p style="font-size:0.9rem;font-weight:600;color:var(--text-primary);margin-bottom:4px;">
                  ${escapeHtml(contacts.email)}
                </p>
                <p style="font-size:0.82rem;color:var(--text-secondary);">
                  Atendimento para solicitações formais, acompanhamento de pedidos, trocas, devoluções e parcerias comerciais.
                </p>
              </div>
              <a href="${escapeHtml(contacts.mailtoUrl)}" class="contact-btn-action" aria-label="Enviar e-mail para byangely1@gmail.com">
                ${OFFICIAL_ICONS.email}
                <span>Enviar E-mail Agora</span>
              </a>
            </div>
          </div>

          <div class="checkout-layout">
            <div>
              <div class="admin-card" style="background:var(--bg-primary);margin-bottom:0;">
                <h3 style="font-family:var(--font-serif);font-size:1.35rem;margin-bottom:12px;">Resumo de Contatos Oficiais — ${escapeHtml(contacts.storeName)}</h3>
                <p style="font-size:0.88rem;margin-bottom:8px;"><strong>Nome da Loja:</strong> ${escapeHtml(contacts.storeName)}</p>
                <p style="font-size:0.88rem;margin-bottom:8px;"><strong>Localidade:</strong> ${escapeHtml(settings.city)} - ${escapeHtml(settings.state)}, Brasil</p>
                <p style="font-size:0.88rem;margin-bottom:8px;"><strong>WhatsApp:</strong> <a href="${escapeHtml(contacts.whatsappUrl)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-gold);font-weight:600;text-decoration:underline;">${escapeHtml(contacts.whatsappDisplay)}</a></p>
                <p style="font-size:0.88rem;margin-bottom:8px;"><strong>Link Direto WhatsApp:</strong> <a href="${escapeHtml(contacts.whatsappBaseUrl)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-gold);text-decoration:underline;">${escapeHtml(contacts.whatsappBaseUrl)}</a></p>
                <p style="font-size:0.88rem;margin-bottom:8px;"><strong>Instagram Oficial:</strong> <a href="${escapeHtml(contacts.instagramUrl)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-gold);font-weight:600;text-decoration:underline;">${escapeHtml(contacts.instagramHandle)}</a></p>
                <p style="font-size:0.88rem;margin-bottom:8px;"><strong>E-mail Comercial:</strong> <a href="${escapeHtml(contacts.mailtoUrl)}" style="color:var(--accent-gold);font-weight:600;text-decoration:underline;">${escapeHtml(contacts.email)}</a></p>
                <p style="font-size:0.88rem;"><strong>Horário de Atendimento:</strong> ${escapeHtml(settings.businessHours)}</p>
              </div>
            </div>

            <div class="admin-card" style="margin-bottom:0;">
              <h3 style="font-family:var(--font-serif);font-size:1.5rem;margin-bottom:12px;">Formulário de Atendimento no Site</h3>
              <form id="sac-contact-form">
                <div style="margin-bottom:12px;">
                  <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Seu Nome Completo *</label>
                  <input type="text" name="name" class="form-control" required placeholder="Digite seu nome" value="${AppState.currentCustomer ? escapeHtml(AppState.currentCustomer.name) : ''}" />
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Seu E-mail *</label>
                    <input type="email" name="email" class="form-control" required placeholder="seu@email.com" value="${AppState.currentCustomer ? escapeHtml(AppState.currentCustomer.email) : ''}" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Assunto *</label>
                    <select name="subject" class="form-control" required>
                      <option value="Dúvida sobre Produto / Medidas">Dúvida sobre Produto / Medidas</option>
                      <option value="Status de Pedido / Pagamento">Status de Pedido / Pagamento</option>
                      <option value="Solicitação de Troca ou Devolução">Solicitação de Troca ou Devolução</option>
                      <option value="Entrega / Retirada em Itaperuna">Entrega / Retirada em Itaperuna</option>
                      <option value="Privacidade e Dados Pessoais (LGPD)">Privacidade e Dados Pessoais (LGPD)</option>
                    </select>
                  </div>
                </div>
                <div style="margin-bottom:14px;">
                  <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Mensagem (Informe o nº do pedido se aplicável) *</label>
                  <textarea name="message" rows="3" class="form-control" required placeholder="Como podemos ajudar?"></textarea>
                </div>
                <button type="submit" class="btn btn-primary btn-block">Enviar Solicitação ao Atendimento</button>
              </form>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderDedicatedContactView() {
    return renderContactBlockMarkup();
  }

  // -------------------------------------------------------------------------
  // 2. CATÁLOGO COM BUSCA E FILTROS COMPLETOS
  // -------------------------------------------------------------------------
  function getFilteredProducts() {
    const f = AppState.filters;
    return AppState.db.products
      .filter((p) => p.status === 'published')
      .filter((p) => {
        if (f.search) {
          const q = f.search.toLowerCase();
          const matchName = (p.name || '').toLowerCase().includes(q);
          const matchDesc = (p.shortDescription || '').toLowerCase().includes(q);
          const matchSku = (p.sku || '').toLowerCase().includes(q);
          const matchStyle = (p.style || '').toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchSku && !matchStyle) return false;
        }
        if (f.category !== 'all' && p.category !== f.category) return false;
        if (f.size !== 'all' && !(p.sizes || []).includes(f.size)) return false;
        if (f.color !== 'all' && !(p.colors || []).some((c) => c.name === f.color)) return false;
        if (f.style !== 'all' && p.style !== f.style) return false;

        const price = getEffectivePrice(p);
        if (f.priceRange === 'up_to_250' && price > 250) return false;
        if (f.priceRange === '250_to_380' && (price < 250 || price > 380)) return false;
        if (f.priceRange === 'above_380' && price <= 380) return false;

        const stock = getTotalProductStock(p);
        if (f.availability === 'in_stock' && stock <= 0) return false;
        if (f.availability === 'promo' && !p.isPromo) return false;

        return true;
      })
      .sort((a, b) => {
        if (f.sortBy === 'price_asc') return getEffectivePrice(a) - getEffectivePrice(b);
        if (f.sortBy === 'price_desc') return getEffectivePrice(b) - getEffectivePrice(a);
        if (f.sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      });
  }

  function renderCatalogView() {
    const published = AppState.db.products.filter((p) => p.status === 'published');
    const filtered = getFilteredProducts();
    const categories = AppState.db.categories;

    // Coleta dinâmica de tamanhos, cores e estilos disponíveis
    const allSizes = Array.from(new Set(published.flatMap((p) => p.sizes || [])));
    const allColors = Array.from(new Set(published.flatMap((p) => (p.colors || []).map((c) => c.name))));
    const allStyles = Array.from(new Set(published.map((p) => p.style).filter(Boolean)));

    const f = AppState.filters;

    return `
      <section class="section-block" aria-labelledby="catalog-heading">
        <div class="container">
          <div class="section-header" style="margin-bottom:24px;">
            <div>
              <span class="section-eyebrow">Coleção By Angély</span>
              <h1 id="catalog-heading" class="section-title">Catálogo de Moda Feminina</h1>
            </div>
          </div>

          <!-- Barra de Filtros -->
          <div class="catalog-toolbar" role="region" aria-label="Filtros do catálogo">
            <div class="catalog-filters-grid">
              <div class="filter-group">
                <label for="filter-search">Buscar peça, estilo ou código</label>
                <input type="search" id="filter-search" class="form-control" placeholder="Ex.: vestido linho, pantalona, blazer..." value="${escapeHtml(f.search)}" />
              </div>
              <div class="filter-group">
                <label for="filter-category">Tipo de Peça</label>
                <select id="filter-category" class="form-control">
                  <option value="all">Todas as categorias</option>
                  ${categories.map((c) => `<option value="${escapeHtml(c.slug)}" ${f.category === c.slug ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
                </select>
              </div>
              <div class="filter-group">
                <label for="filter-size">Tamanho</label>
                <select id="filter-size" class="form-control">
                  <option value="all">Todos</option>
                  ${allSizes.map((s) => `<option value="${escapeHtml(s)}" ${f.size === s ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
                </select>
              </div>
              <div class="filter-group">
                <label for="filter-color">Cor</label>
                <select id="filter-color" class="form-control">
                  <option value="all">Todas as cores</option>
                  ${allColors.map((c) => `<option value="${escapeHtml(c)}" ${f.color === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
                </select>
              </div>
              <div class="filter-group">
                <label for="filter-style">Estilo</label>
                <select id="filter-style" class="form-control">
                  <option value="all">Todos os estilos</option>
                  ${allStyles.map((st) => `<option value="${escapeHtml(st)}" ${f.style === st ? 'selected' : ''}>${escapeHtml(st)}</option>`).join('')}
                </select>
              </div>
              <div class="filter-group">
                <label for="filter-price">Faixa de Preço</label>
                <select id="filter-price" class="form-control">
                  <option value="all" ${f.priceRange === 'all' ? 'selected' : ''}>Qualquer valor</option>
                  <option value="up_to_250" ${f.priceRange === 'up_to_250' ? 'selected' : ''}>Até R$ 250,00</option>
                  <option value="250_to_380" ${f.priceRange === '250_to_380' ? 'selected' : ''}>R$ 250 a R$ 380</option>
                  <option value="above_380" ${f.priceRange === 'above_380' ? 'selected' : ''}>Acima de R$ 380,00</option>
                </select>
              </div>
            </div>

            <div class="catalog-active-meta">
              <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
                <span>Exibindo <strong>${filtered.length}</strong> de ${published.length} peças</span>
                <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
                  <input type="checkbox" id="filter-only-promo" ${f.availability === 'promo' ? 'checked' : ''} />
                  <span>Somente em promoção</span>
                </label>
                <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
                  <input type="checkbox" id="filter-only-stock" ${f.availability === 'in_stock' ? 'checked' : ''} />
                  <span>Somente com estoque disponível</span>
                </label>
              </div>
              <div style="display:flex;align-items:center;gap:10px;">
                <label for="filter-sort" style="font-size:0.78rem;font-weight:600;">Ordenar por:</label>
                <select id="filter-sort" class="form-control" style="width:auto;min-height:36px;padding:4px 10px;">
                  <option value="featured" ${f.sortBy === 'featured' ? 'selected' : ''}>Destaques</option>
                  <option value="newest" ${f.sortBy === 'newest' ? 'selected' : ''}>Novidades</option>
                  <option value="price_asc" ${f.sortBy === 'price_asc' ? 'selected' : ''}>Menor Preço</option>
                  <option value="price_desc" ${f.sortBy === 'price_desc' ? 'selected' : ''}>Maior Preço</option>
                </select>
                <button type="button" class="btn btn-subtle btn-sm" id="btn-reset-filters">Limpar Filtros</button>
              </div>
            </div>
          </div>

          <!-- Lista de Produtos -->
          ${filtered.length > 0 ? `
            <div class="products-grid" id="catalog-results-grid">
              ${filtered.map(renderProductCard).join('')}
            </div>
          ` : `
            <div class="admin-card" style="text-align:center;padding:48px 20px;">
              <h3 style="font-family:var(--font-serif);font-size:1.6rem;margin-bottom:8px;">Nenhuma peça encontrada com esses filtros</h3>
              <p style="color:var(--text-secondary);margin-bottom:18px;">Experimente limpar os filtros selecionados ou buscar por outro termo.</p>
              <button type="button" class="btn btn-primary btn-sm" data-action="reset-catalog-filters">Mostrar Todas as Peças</button>
            </div>
          `}
        </div>
      </section>
    `;
  }

  function bindCatalogFilterEvents() {
    const searchEl = document.getElementById('filter-search');
    const catEl = document.getElementById('filter-category');
    const sizeEl = document.getElementById('filter-size');
    const colorEl = document.getElementById('filter-color');
    const styleEl = document.getElementById('filter-style');
    const priceEl = document.getElementById('filter-price');
    const sortEl = document.getElementById('filter-sort');
    const promoCheck = document.getElementById('filter-only-promo');
    const stockCheck = document.getElementById('filter-only-stock');
    const resetBtn = document.getElementById('btn-reset-filters');

    if (searchEl) {
      searchEl.addEventListener('input', (e) => {
        AppState.filters.search = e.target.value;
        renderMainView();
        const inputAfter = document.getElementById('filter-search');
        if (inputAfter) {
          inputAfter.focus();
          inputAfter.setSelectionRange(inputAfter.value.length, inputAfter.value.length);
        }
      });
    }
    if (catEl) catEl.addEventListener('change', (e) => { AppState.filters.category = e.target.value; renderMainView(); });
    if (sizeEl) sizeEl.addEventListener('change', (e) => { AppState.filters.size = e.target.value; renderMainView(); });
    if (colorEl) colorEl.addEventListener('change', (e) => { AppState.filters.color = e.target.value; renderMainView(); });
    if (styleEl) styleEl.addEventListener('change', (e) => { AppState.filters.style = e.target.value; renderMainView(); });
    if (priceEl) priceEl.addEventListener('change', (e) => { AppState.filters.priceRange = e.target.value; renderMainView(); });
    if (sortEl) sortEl.addEventListener('change', (e) => { AppState.filters.sortBy = e.target.value; renderMainView(); });
    if (promoCheck) {
      promoCheck.addEventListener('change', (e) => {
        AppState.filters.availability = e.target.checked ? 'promo' : 'all';
        renderMainView();
      });
    }
    if (stockCheck) {
      stockCheck.addEventListener('change', (e) => {
        AppState.filters.availability = e.target.checked ? 'in_stock' : 'all';
        renderMainView();
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        resetFilters();
        renderMainView();
      });
    }
  }

  function resetFilters() {
    AppState.filters = {
      search: '',
      category: 'all',
      size: 'all',
      color: 'all',
      style: 'all',
      priceRange: 'all',
      availability: 'all',
      sortBy: 'featured'
    };
  }

  // -------------------------------------------------------------------------
  // 3. PÁGINA DE FAVORITOS (LISTA DE DESEJOS)
  // -------------------------------------------------------------------------
  function renderFavoritesView() {
    const favProducts = AppState.db.products.filter((p) => AppState.wishlist.includes(p.id) && p.status === 'published');
    return `
      <section class="section-block">
        <div class="container">
          <div class="section-header">
            <div>
              <span class="section-eyebrow">Lista de Desejos</span>
              <h1 class="section-title">Minhas Peças Favoritas (${favProducts.length})</h1>
            </div>
            <button type="button" class="btn btn-outline btn-sm" data-action="go-catalog">Continuar Explorando</button>
          </div>
          ${favProducts.length > 0 ? `
            <div class="products-grid">
              ${favProducts.map(renderProductCard).join('')}
            </div>
          ` : `
            <div class="admin-card" style="text-align:center;padding:48px 20px;">
              <h3 style="font-family:var(--font-serif);font-size:1.6rem;margin-bottom:8px;">Sua lista de favoritos está vazia</h3>
              <p style="color:var(--text-secondary);margin-bottom:18px;">Toque no ícone ♡ nos produtos para salvar suas peças preferidas.</p>
              <button type="button" class="btn btn-primary btn-sm" data-action="go-catalog">Explorar Coleção</button>
            </div>
          `}
        </div>
      </section>
    `;
  }

  // =========================================================================
  // MODAL DE DETALHE DO PRODUTO (GALERIA DE FOTOS/VÍDEO, MEDIDAS, AVALIAÇÕES)
  // =========================================================================
  function openProductModal(productId) {
    const product = AppState.db.products.find((p) => p.id === productId);
    if (!product) return;

    const firstAvailableVar = (product.variations || []).find((v) => v.stock > 0) || (product.variations && product.variations[0]);
    AppState.activeProductModal = {
      productId: product.id,
      selectedColor: firstAvailableVar ? firstAvailableVar.color : (product.colors && product.colors[0] ? product.colors[0].name : ''),
      selectedSize: firstAvailableVar ? firstAvailableVar.size : (product.sizes && product.sizes[0] ? product.sizes[0] : ''),
      mediaIndex: 0
    };

    renderProductModalContent();
    const modalBackdrop = document.getElementById('product-detail-modal');
    if (modalBackdrop) {
      modalBackdrop.classList.add('open');
      modalBackdrop.setAttribute('aria-hidden', 'false');
    }
  }

  function renderProductModalContent() {
    const state = AppState.activeProductModal;
    const product = AppState.db.products.find((p) => p.id === state.productId);
    const container = document.getElementById('product-modal-body');
    if (!product || !container) return;

    const effectivePrice = getEffectivePrice(product);
    const hasPromo = effectivePrice < Number(product.price);
    const currentVarStock = getVariationStock(product, state.selectedSize, state.selectedColor);
    const mediaList = product.media && product.media.length > 0 ? product.media : [
      { type: 'image', url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80', alt: product.name }
    ];
    const activeMedia = mediaList[state.mediaIndex] || mediaList[0];
    const productReviews = (AppState.db.reviews || []).filter((r) => r.productId === product.id);
    const isFav = AppState.wishlist.includes(product.id);

    container.innerHTML = `
      <div class="pdp-grid">
        <!-- Coluna Esquerda: Galeria de Fotos e Vídeos -->
        <div>
          <div class="pdp-main-media">
            ${activeMedia.type === 'video' ? `
              <video src="${escapeHtml(activeMedia.url)}" poster="${escapeHtml(activeMedia.poster || '')}" controls playsinline aria-label="${escapeHtml(activeMedia.alt || product.name)}"></video>
            ` : `
              <img src="${escapeHtml(activeMedia.url)}" alt="${escapeHtml(activeMedia.alt || product.name)}" id="pdp-active-img" />
              <button type="button" class="pdp-zoom-btn" data-action="zoom-image" data-url="${escapeHtml(activeMedia.url)}" data-alt="${escapeHtml(activeMedia.alt || product.name)}">
                🔍 Ampliar Imagem
              </button>
            `}
          </div>
          ${activeMedia.credit ? `
            <p style="font-size:0.72rem;color:var(--text-muted);margin-top:6px;">
              Fonte / Licença da mídia: ${escapeHtml(activeMedia.credit)}
            </p>
          ` : ''}
          <div class="pdp-thumbs" role="tablist" aria-label="Galeria de fotos e vídeos do produto">
            ${mediaList.map((m, idx) => `
              <button type="button" class="pdp-thumb-btn ${idx === state.mediaIndex ? 'active' : ''}" data-action="select-pdp-media" data-index="${idx}" aria-label="${m.type === 'video' ? 'Reproduzir vídeo' : 'Ver foto ' + (idx + 1)}">
                ${m.type === 'video' ? `
                  <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#161514;color:#FFF;font-size:0.75rem;font-weight:700;">▶ VÍDEO</div>
                ` : `
                  <img src="${escapeHtml(m.url)}" alt="Miniatura ${idx + 1}" />
                `}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Coluna Direita: Informações, Variações, Estoque e Medidas -->
        <div>
          ${product.isDemo ? `
            <div class="alert-box alert-warning" style="padding:10px 14px;font-size:0.78rem;">
              <strong>PRODUTO DEMONSTRATIVO (IMAGEM ILUSTRATIVA):</strong> ${escapeHtml(product.demoNotice || 'Peça de exemplo para visualização da estrutura da loja. A proprietária pode editar ou remover no painel.')}
            </div>
          ` : ''}

          <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.76rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">
            <span>${escapeHtml(product.categoryName || product.category)} • ${escapeHtml(product.style || '')}</span>
            <span>Cód: ${escapeHtml(product.sku)}</span>
          </div>

          <h2 style="font-family:var(--font-serif);font-size:2rem;font-weight:500;line-height:1.15;margin-bottom:12px;">
            ${escapeHtml(product.name)}
          </h2>

          <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:16px;">
            <span style="font-size:1.55rem;font-weight:700;color:var(--text-primary);">${formatBRL(effectivePrice)}</span>
            ${hasPromo ? `<span style="font-size:1rem;color:var(--text-muted);text-decoration:line-through;">${formatBRL(product.price)}</span>` : ''}
          </div>

          <p style="color:var(--text-secondary);margin-bottom:20px;font-size:0.93rem;">
            ${escapeHtml(product.shortDescription || '')}
          </p>

          <!-- Seleção de Cor -->
          <div class="option-selector-group">
            <div class="option-selector-label">
              <span>Cor Selecionada: <strong>${escapeHtml(state.selectedColor)}</strong></span>
            </div>
            <div class="option-pills">
              ${(product.colors || []).map((c) => `
                <button type="button" class="option-pill ${state.selectedColor === c.name ? 'selected' : ''}" data-action="select-pdp-color" data-color="${escapeHtml(c.name)}">
                  <span class="color-dot" style="background-color:${escapeHtml(c.hex || '#ccc')};"></span>
                  <span>${escapeHtml(c.name)}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Seleção de Tamanho -->
          <div class="option-selector-group">
            <div class="option-selector-label">
              <span>Tamanho: <strong>${escapeHtml(state.selectedSize)}</strong></span>
              <span style="font-size:0.78rem;color:${currentVarStock > 0 ? 'var(--status-success-text)' : 'var(--status-danger-text)'};">
                ${currentVarStock > 0 ? `Disponível (${currentVarStock} un. nesta variação)` : 'Indisponível nesta combinação'}
              </span>
            </div>
            <div class="option-pills">
              ${(product.sizes || []).map((s) => {
                const st = getVariationStock(product, s, state.selectedColor);
                return `
                  <button type="button" class="option-pill ${state.selectedSize === s ? 'selected' : ''} ${st <= 0 ? 'out-of-stock' : ''}" data-action="select-pdp-size" data-size="${escapeHtml(s)}">
                    ${escapeHtml(s)}
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Ações Principais -->
          <div style="display:grid;grid-template-columns:1fr auto auto;gap:10px;margin:22px 0 12px;">
            <button type="button" class="btn btn-primary" data-action="add-to-cart-modal" ${currentVarStock <= 0 ? 'disabled' : ''}>
              ${currentVarStock > 0 ? 'Adicionar à Sacola' : 'Variação Esgotada'}
            </button>
            <button type="button" class="btn btn-outline" data-action="toggle-wishlist" data-product-id="${escapeHtml(product.id)}" aria-label="Favoritar produto">
              ${isFav ? '♥ Salvo' : '♡ Favoritar'}
            </button>
            <button type="button" class="btn btn-outline" data-action="share-product" data-product-id="${escapeHtml(product.id)}" aria-label="Compartilhar">
              ↗
            </button>
          </div>
          <div style="margin-bottom:18px;">
            <a href="${escapeHtml(getProductWhatsappUrl(product, state.selectedSize, state.selectedColor))}" target="_blank" rel="noopener noreferrer" class="contact-btn-action whatsapp-style" style="width:100%;" id="pdp-whatsapp-product-link">
              ${OFFICIAL_ICONS.whatsapp}
              <span>Falar no WhatsApp sobre esta peça (${escapeHtml(state.selectedSize)} • ${escapeHtml(state.selectedColor)})</span>
            </a>
          </div>

          <!-- Descrição, Composição e Tabela de Medidas -->
          <div style="border-top:1px solid var(--border-subtle);padding-top:16px;margin-top:16px;">
            <details open style="margin-bottom:12px;">
              <summary style="font-weight:600;font-size:0.9rem;cursor:pointer;padding:6px 0;">Descrição e Composição</summary>
              <div style="font-size:0.86rem;color:var(--text-secondary);padding-top:8px;">
                <p style="margin-bottom:8px;">${escapeHtml(product.description || '')}</p>
                <p style="margin-bottom:4px;"><strong>Composição:</strong> ${escapeHtml(product.fabricInfo || 'A confirmar pela proprietária')}</p>
                <p><strong>Conservação:</strong> ${escapeHtml(product.careInfo || 'Seguir instruções da etiqueta interna.')}</p>
              </div>
            </details>

            ${product.sizeChart && product.sizeChart.length > 0 ? `
              <details style="margin-bottom:12px;border-top:1px solid var(--border-subtle);padding-top:10px;">
                <summary style="font-weight:600;font-size:0.9rem;cursor:pointer;padding:6px 0;">📏 Tabela de Medidas Referencial</summary>
                <div style="padding-top:8px;overflow-x:auto;">
                  <table class="size-chart-table">
                    <thead>
                      <tr>
                        <th>Tamanho</th>
                        <th>Busto / Largura</th>
                        <th>Cintura / Altura</th>
                        <th>Quadril / Prof.</th>
                        <th>Comprimento</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${product.sizeChart.map((row) => `
                        <tr>
                          <td><strong>${escapeHtml(row.size)}</strong></td>
                          <td>${escapeHtml(row.bust)}</td>
                          <td>${escapeHtml(row.waist)}</td>
                          <td>${escapeHtml(row.hips)}</td>
                          <td>${escapeHtml(row.length)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </details>
            ` : ''}

            <!-- Avaliações de Clientes -->
            <details style="border-top:1px solid var(--border-subtle);padding-top:10px;">
              <summary style="font-weight:600;font-size:0.9rem;cursor:pointer;padding:6px 0;">★ Avaliações sobre a Peça (${productReviews.length})</summary>
              <div style="padding-top:10px;">
                ${productReviews.map((rev) => `
                  <div style="background:var(--bg-primary);padding:10px 12px;border-radius:6px;margin-bottom:8px;font-size:0.82rem;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                      <strong>${escapeHtml(rev.customerName)}</strong>
                      <span style="color:var(--accent-gold);">${'★'.repeat(rev.rating || 5)} • ${escapeHtml(rev.date)}</span>
                    </div>
                    <p style="color:var(--text-secondary);">${escapeHtml(rev.comment)}</p>
                  </div>
                `).join('')}
                <form id="pdp-review-form" data-product-id="${escapeHtml(product.id)}" style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--border-subtle);">
                  <p style="font-size:0.8rem;font-weight:600;margin-bottom:8px;">Deixe sua avaliação sobre esta peça:</p>
                  <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;margin-bottom:8px;">
                    <input type="text" name="customerName" class="form-control" required placeholder="Seu nome" value="${AppState.currentCustomer ? escapeHtml(AppState.currentCustomer.name) : ''}" />
                    <select name="rating" class="form-control">
                      <option value="5">5 Estrelas (Excelente)</option>
                      <option value="4">4 Estrelas (Muito Bom)</option>
                      <option value="3">3 Estrelas (Regular)</option>
                    </select>
                  </div>
                  <textarea name="comment" rows="2" class="form-control" required placeholder="Conte o que achou do caimento e acabamento..." style="margin-bottom:8px;"></textarea>
                  <button type="submit" class="btn btn-subtle btn-sm">Enviar Avaliação</button>
                </form>
              </div>
            </details>
          </div>
        </div>
      </div>
    `;

    const reviewForm = document.getElementById('pdp-review-form');
    const floatingWa = document.querySelector('.floating-whatsapp-concierge');
    if (floatingWa) {
      floatingWa.href = getProductWhatsappUrl(product, state.selectedSize, state.selectedColor);
    }
    if (reviewForm) {
      reviewForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(reviewForm);
        AppState.db.reviews.unshift({
          id: 'rev-' + Date.now(),
          productId: product.id,
          customerName: fd.get('customerName'),
          rating: Number(fd.get('rating')) || 5,
          comment: fd.get('comment'),
          date: new Date().toLocaleDateString('pt-BR'),
          isDemo: false
        });
        saveDatabase('Nova avaliação enviada para ' + product.name);
        renderProductModalContent();
        showToast('Avaliação registrada com sucesso!', 'success');
      });
    }
  }

  // =========================================================================
  // SACOLA DE COMPRAS (CARRINHO, CUPOM, SIMULADOR DE FRETE)
  // =========================================================================
  function addToCart(productId, size, color, qty = 1) {
    const product = AppState.db.products.find((p) => p.id === productId);
    if (!product) return;

    const available = getVariationStock(product, size, color);
    if (available <= 0) {
      showToast('Esta variação de tamanho e cor está sem estoque.', 'danger');
      return;
    }

    const key = `${productId}__${size}__${color}`;
    const existing = AppState.cart.find((item) => item.key === key);

    if (existing) {
      if (existing.quantity + qty > available) {
        showToast(`Estoque máximo atingido (${available} un. disponíveis para ${size} / ${color}).`, 'warning');
        return;
      }
      existing.quantity += qty;
    } else {
      const firstImg = (product.media && product.media.find((m) => m.type === 'image')) || { url: '' };
      AppState.cart.push({
        key,
        productId: product.id,
        sku: product.sku,
        name: product.name,
        size,
        color,
        unitPrice: getEffectivePrice(product),
        imageUrl: firstImg.url,
        isDemo: !!product.isDemo,
        quantity: qty
      });
    }

    saveCart();
    renderCartDrawer();
    openCartDrawer();
    showToast(`"${product.name}" (${size} • ${color}) adicionado à sacola!`, 'success');
  }

  function calculateCartTotals() {
    const subtotal = AppState.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    let discount = 0;

    if (AppState.appliedCoupon) {
      const c = AppState.appliedCoupon;
      if (subtotal >= (Number(c.minOrderAmount) || 0)) {
        if (c.type === 'percent') {
          discount = subtotal * (Number(c.value) / 100);
        } else {
          discount = Number(c.value) || 0;
        }
        discount = Math.min(discount, subtotal);
      } else {
        AppState.appliedCoupon = null;
      }
    }

    const activeMethods = (AppState.db.shippingSettings.methods || []).filter((m) => m.enabled);
    const selectedMethod = activeMethods.find((m) => m.id === AppState.selectedShippingMethodId) || activeMethods[0] || null;
    const shippingCost = selectedMethod && selectedMethod.priceStatus === 'confirmed' ? Number(selectedMethod.price) || 0 : 0;

    const total = Math.max(0, subtotal - discount + shippingCost);
    return {
      subtotal,
      discount,
      shippingMethod: selectedMethod,
      shippingCost,
      total
    };
  }

  function openCartDrawer() {
    renderCartDrawer();
    const drawer = document.getElementById('cart-drawer-backdrop');
    if (drawer) {
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
    }
  }

  function closeCartDrawer() {
    const drawer = document.getElementById('cart-drawer-backdrop');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
    }
  }

  function renderCartDrawer() {
    const bodyEl = document.getElementById('cart-drawer-body');
    const footerEl = document.getElementById('cart-drawer-footer');
    if (!bodyEl || !footerEl) return;

    if (AppState.cart.length === 0) {
      bodyEl.innerHTML = `
        <div style="text-align:center;padding:48px 16px;">
          <p style="font-family:var(--font-serif);font-size:1.5rem;margin-bottom:8px;">Sua sacola está vazia</p>
          <p style="color:var(--text-secondary);font-size:0.88rem;margin-bottom:20px;">Adicione peças da coleção By Angély para iniciar seu pedido.</p>
          <button type="button" class="btn btn-primary btn-sm" data-action="close-cart-go-catalog">Explorar Peças</button>
        </div>
      `;
      footerEl.innerHTML = '';
      return;
    }

    const totals = calculateCartTotals();
    const shippingMethods = (AppState.db.shippingSettings.methods || []).filter((m) => m.enabled);

    bodyEl.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:14px;">
        ${AppState.cart.map((item) => `
          <div style="display:grid;grid-template-columns:68px 1fr auto;gap:12px;padding-bottom:14px;border-bottom:1px solid var(--border-subtle);align-items:center;">
            <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" style="width:68px;height:86px;object-fit:cover;border-radius:4px;background:var(--bg-Muted);" />
            <div>
              <strong style="font-size:0.9rem;display:block;line-height:1.25;">${escapeHtml(item.name)}</strong>
              <span style="font-size:0.78rem;color:var(--text-secondary);display:block;margin:3px 0;">
                Tam: <strong>${escapeHtml(item.size)}</strong> • Cor: <strong>${escapeHtml(item.color)}</strong>
              </span>
              <span style="font-size:0.88rem;font-weight:700;">${formatBRL(item.unitPrice)}</span>
              <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
                <button type="button" class="btn btn-subtle btn-sm" style="min-height:28px;padding:2px 9px;" data-action="cart-qty-dec" data-key="${escapeHtml(item.key)}" aria-label="Diminuir quantidade">-</button>
                <span style="font-size:0.85rem;font-weight:600;">${item.quantity}</span>
                <button type="button" class="btn btn-subtle btn-sm" style="min-height:28px;padding:2px 9px;" data-action="cart-qty-inc" data-key="${escapeHtml(item.key)}" aria-label="Aumentar quantidade">+</button>
              </div>
            </div>
            <button type="button" class="btn btn-subtle btn-sm" style="min-height:32px;padding:4px 8px;" data-action="cart-remove" data-key="${escapeHtml(item.key)}" aria-label="Remover item" title="Remover item">✕</button>
          </div>
        `).join('')}
      </div>

      <!-- Cupom de Desconto -->
      <div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--border-subtle);">
        <label for="cart-coupon-input" style="display:block;font-size:0.75rem;font-weight:600;text-transform:uppercase;margin-bottom:6px;">Cupom de Desconto</label>
        <div style="display:flex;gap:8px;">
          <input type="text" id="cart-coupon-input" class="form-control" placeholder="Ex.: BEMVINDA10" value="${AppState.appliedCoupon ? escapeHtml(AppState.appliedCoupon.code) : ''}" style="min-height:38px;" />
          <button type="button" class="btn btn-outline btn-sm" data-action="apply-coupon">Aplicar</button>
        </div>
        ${AppState.appliedCoupon ? `
          <p style="font-size:0.76rem;color:var(--status-success-text);margin-top:5px;">
            ✓ Cupom <strong>${escapeHtml(AppState.appliedCoupon.code)}</strong> aplicado (-${formatBRL(totals.discount)})
          </p>
        ` : ''}
      </div>

      <!-- Opção de Entrega / Retirada -->
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border-subtle);">
        <label for="cart-shipping-select" style="display:block;font-size:0.75rem;font-weight:600;text-transform:uppercase;margin-bottom:6px;">Modalidade de Entrega / Retirada</label>
        <select id="cart-shipping-select" class="form-control" style="min-height:38px;">
          ${shippingMethods.map((m) => `
            <option value="${escapeHtml(m.id)}" ${totals.shippingMethod && totals.shippingMethod.id === m.id ? 'selected' : ''}>
              ${escapeHtml(m.name)} — ${m.priceStatus === 'confirmed' ? (m.price === 0 ? 'Grátis' : formatBRL(m.price)) : 'Valor a confirmar'}
            </option>
          `).join('')}
        </select>
        ${totals.shippingMethod ? `
          <p style="font-size:0.75rem;color:var(--text-secondary);margin-top:5px;">
            ${escapeHtml(totals.shippingMethod.estimatedDays)}
          </p>
        ` : ''}
      </div>
    `;

    footerEl.innerHTML = `
      <div style="font-size:0.86rem;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span>Subtotal:</span>
          <span>${formatBRL(totals.subtotal)}</span>
        </div>
        ${totals.discount > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;color:var(--status-success-text);">
            <span>Desconto (${escapeHtml(AppState.appliedCoupon.code)}):</span>
            <span>-${formatBRL(totals.discount)}</span>
          </div>
        ` : ''}
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span>Entrega:</span>
          <span>${totals.shippingMethod ? (totals.shippingMethod.priceStatus === 'confirmed' ? formatBRL(totals.shippingCost) : 'A confirmar pela proprietária') : 'A confirmar'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:1.1rem;font-weight:700;padding-top:8px;border-top:1px solid var(--border-subtle);">
          <span>Total do Pedido:</span>
          <span>${formatBRL(totals.total)}</span>
        </div>
      </div>
      <button type="button" class="btn btn-primary btn-block" data-action="proceed-to-checkout">
        Finalizar Compra com Segurança
      </button>
    `;

    const shipSelect = document.getElementById('cart-shipping-select');
    if (shipSelect) {
      shipSelect.addEventListener('change', (e) => {
        AppState.selectedShippingMethodId = e.target.value;
        renderCartDrawer();
      });
    }
  }

  // =========================================================================
  // 4. FINALIZAÇÃO DE COMPRA (CHECKOUT TRANSPARENTE + PIX EMV QR CODE)
  // =========================================================================
  function renderCheckoutView() {
    // Se acabou de concluir um pedido, exibe a tela de instruções de pagamento e recibo do pedido
    if (AppState.lastCreatedOrder) {
      return renderOrderConfirmationScreen(AppState.lastCreatedOrder);
    }

    if (AppState.cart.length === 0) {
      return `
        <section class="section-block">
          <div class="container">
            <div class="admin-card" style="text-align:center;padding:48px 20px;">
              <h1 class="section-title" style="margin-bottom:10px;">Sua sacola está vazia</h1>
              <p style="color:var(--text-secondary);margin-bottom:20px;">Adicione produtos antes de prosseguir para a finalização da compra.</p>
              <button type="button" class="btn btn-primary" data-action="go-catalog">Voltar para a Loja</button>
            </div>
          </div>
        </section>
      `;
    }

    const totals = calculateCartTotals();
    const paySettings = AppState.db.paymentSettings;
    const shipMethods = (AppState.db.shippingSettings.methods || []).filter((m) => m.enabled);
    const activePaymentOptions = [];
    if (paySettings.pix && paySettings.pix.enabled) activePaymentOptions.push({ id: 'pix', label: 'Pix (QR Code EMV e Copia e Cola)' });
    if (paySettings.creditCard && paySettings.creditCard.enabled) activePaymentOptions.push({ id: 'creditCard', label: 'Cartão de Crédito (Ambiente Externo Seguro)' });
    if (paySettings.payOnPickup && paySettings.payOnPickup.enabled) activePaymentOptions.push({ id: 'payOnPickup', label: paySettings.payOnPickup.title || 'Pagamento na Retirada (Itaperuna - RJ)' });

    if (activePaymentOptions.length > 0 && !activePaymentOptions.some((o) => o.id === AppState.selectedPaymentMethod)) {
      AppState.selectedPaymentMethod = activePaymentOptions[0].id;
    }

    const cust = AppState.currentCustomer || {};
    const defaultAddr = (cust.addresses && cust.addresses[0]) || {};

    return `
      <section class="section-block">
        <div class="container">
          <div class="section-header" style="margin-bottom:24px;">
            <div>
              <span class="section-eyebrow">Checkout Transparente (Decreto nº 7.962/2013)</span>
              <h1 class="section-title">Finalização e Revisão do Pedido</h1>
            </div>
            <button type="button" class="btn btn-outline btn-sm" data-action="go-catalog">← Continuar Comprando</button>
          </div>

          <form id="checkout-order-form" class="checkout-layout">
            <!-- Coluna Principal: Dados, Entrega e Pagamento -->
            <div>
              <!-- Etapa 1: Identificação -->
              <div class="admin-card">
                <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:14px;">1. Seus Dados para o Pedido</h2>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Nome Completo *</label>
                    <input type="text" name="customerName" class="form-control" required value="${escapeHtml(cust.name || '')}" placeholder="Ex.: Maria Clara Silva" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">E-mail para Confirmações *</label>
                    <input type="email" name="customerEmail" class="form-control" required value="${escapeHtml(cust.email || '')}" placeholder="seu@email.com" />
                  </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">WhatsApp / Telefone com DDD *</label>
                    <input type="tel" name="customerPhone" class="form-control" required value="${escapeHtml(cust.phone || '')}" placeholder="(22) 99999-9999" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">CPF (Para Nota Fiscal — protegido pela LGPD)</label>
                    <input type="text" name="customerCpf" class="form-control" value="${escapeHtml(cust.cpf || '')}" placeholder="000.000.000-00" />
                  </div>
                </div>
                <label style="display:flex;align-items:flex-start;gap:8px;font-size:0.82rem;color:var(--text-secondary);cursor:pointer;margin-top:8px;">
                  <input type="checkbox" name="marketingOptIn" style="margin-top:4px;" />
                  <span>Desejo receber novidades e promoções da By Angély por e-mail ou WhatsApp. (Consentimento opcional conforme a LGPD — você pode cancelar a qualquer momento na Área da Cliente).</span>
                </label>
              </div>

              <!-- Etapa 2: Entrega ou Retirada -->
              <div class="admin-card">
                <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:14px;">2. Modalidade de Entrega e Endereço</h2>
                <div style="margin-bottom:16px;">
                  <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:6px;">Escolha como deseja receber seu pedido *</label>
                  <div style="display:flex;flex-direction:column;gap:8px;">
                    ${shipMethods.map((m) => `
                      <label style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:1px solid ${totals.shippingMethod && totals.shippingMethod.id === m.id ? 'var(--accent-gold)' : 'var(--border-subtle)'};border-radius:6px;background:${totals.shippingMethod && totals.shippingMethod.id === m.id ? 'var(--bg-accent-subtle)' : 'var(--bg-surface)'};cursor:pointer;">
                        <div style="display:flex;align-items:center;gap:10px;">
                          <input type="radio" name="shippingMethodId" value="${escapeHtml(m.id)}" ${totals.shippingMethod && totals.shippingMethod.id === m.id ? 'checked' : ''} />
                          <div>
                            <strong style="font-size:0.9rem;display:block;">${escapeHtml(m.name)}</strong>
                            <span style="font-size:0.78rem;color:var(--text-secondary);">${escapeHtml(m.estimatedDays)}</span>
                          </div>
                        </div>
                        <span style="font-weight:700;font-size:0.86rem;">
                          ${m.priceStatus === 'confirmed' ? (m.price === 0 ? 'Grátis' : formatBRL(m.price)) : 'A confirmar'}
                        </span>
                      </label>
                    `).join('')}
                  </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 2fr;gap:12px;margin-bottom:12px;">
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">CEP *</label>
                    <input type="text" name="zipCode" id="checkout-cep" class="form-control" required value="${escapeHtml(defaultAddr.zipCode || '28300-000')}" placeholder="28300-000" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Rua / Avenida *</label>
                    <input type="text" name="street" id="checkout-street" class="form-control" required value="${escapeHtml(defaultAddr.street || '')}" placeholder="Nome da rua ou avenida" />
                  </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Número / Compl. *</label>
                    <input type="text" name="number" class="form-control" required value="${escapeHtml(defaultAddr.number || '')}" placeholder="Nº e Apto" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Bairro *</label>
                    <input type="text" name="neighborhood" id="checkout-neighborhood" class="form-control" required value="${escapeHtml(defaultAddr.neighborhood || '')}" placeholder="Bairro" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Cidade / UF *</label>
                    <input type="text" name="cityState" id="checkout-city" class="form-control" required value="${escapeHtml(defaultAddr.cityState || 'Itaperuna - RJ')}" placeholder="Itaperuna - RJ" />
                  </div>
                </div>
              </div>

              <!-- Etapa 3: Forma de Pagamento (Somente opções ativas configuradas pela proprietária) -->
              <div class="admin-card">
                <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:14px;">3. Forma de Pagamento</h2>
                ${activePaymentOptions.length === 0 ? `
                  <div class="alert-box alert-danger">
                    Nenhuma forma de pagamento está ativa no momento. A proprietária deve ativar pelo menos uma opção no Painel Administrativo.
                  </div>
                ` : `
                  <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">
                    ${activePaymentOptions.map((opt) => `
                      <label style="display:flex;align-items:center;gap:10px;padding:12px;border:1px solid ${AppState.selectedPaymentMethod === opt.id ? 'var(--accent-gold)' : 'var(--border-subtle)'};border-radius:6px;background:${AppState.selectedPaymentMethod === opt.id ? 'var(--bg-accent-subtle)' : 'var(--bg-surface)'};cursor:pointer;">
                        <input type="radio" name="paymentMethod" value="${escapeHtml(opt.id)}" ${AppState.selectedPaymentMethod === opt.id ? 'checked' : ''} />
                        <strong style="font-size:0.92rem;">${escapeHtml(opt.label)}</strong>
                      </label>
                    `).join('')}
                  </div>

                  <!-- Detalhamento transparente da opção escolhida -->
                  ${AppState.selectedPaymentMethod === 'pix' ? `
                    <div class="alert-box alert-info">
                      <p style="margin-bottom:6px;"><strong>Pagamento Instantâneo via Pix (Padrão EMV Banco Central):</strong></p>
                      <p style="margin-bottom:6px;">Ao confirmar o pedido, geraremos o <strong>QR Code Pix</strong> e o código <strong>Pix Copia e Cola</strong> com o valor exato de <strong>${formatBRL(totals.total)}</strong> e a identificação do seu pedido.</p>
                      <p style="font-size:0.8rem;">
                        <strong>Recebedor configurado:</strong> ${escapeHtml(paySettings.pix.recipientName)} • <strong>Chave:</strong> ${escapeHtml(paySettings.pix.pixKey)} • <strong>Cidade:</strong> ${escapeHtml(paySettings.pix.recipientCity)}
                      </p>
                      <p style="font-size:0.8rem;margin-top:6px;">
                        <em>Status pós-pedido:</em> ${paySettings.pix.pspWebhookConfigured ? 'Confirmação automática via integração.' : 'Seu pedido ficará como <strong>"Aguardando confirmação de pagamento"</strong> até a conferência do recebimento pela loja.'}
                      </p>
                    </div>
                  ` : ''}

                  ${AppState.selectedPaymentMethod === 'creditCard' ? `
                    <div class="alert-box alert-info">
                      <p style="margin-bottom:6px;"><strong>Segurança em Pagamento por Cartão (PCI-DSS):</strong></p>
                      <p style="margin-bottom:6px;">A By Angély <strong>não coleta nem armazena números completos de cartão</strong> em seu site. Ao confirmar o pedido, você receberá o direcionamento seguro para o serviço de pagamento configurado (${escapeHtml(paySettings.creditCard.providerName)}).</p>
                      <p style="font-size:0.8rem;">
                        <strong>Aviso de Transparência:</strong> Um link de pagamento externo genérico não identifica automaticamente o valor individual de cada pedido nem aprova o status sozinho. Seu pedido ficará registrado como <strong>"Aguardando confirmação"</strong> até que o pagamento seja validado.
                      </p>
                    </div>
                  ` : ''}

                  ${AppState.selectedPaymentMethod === 'payOnPickup' ? `
                    <div class="alert-box alert-info">
                      <p style="margin-bottom:6px;"><strong>${escapeHtml(paySettings.payOnPickup.title)}:</strong></p>
                      <p style="font-size:0.82rem;">${escapeHtml(paySettings.payOnPickup.instructions)}</p>
                    </div>
                  ` : ''}
                `}
              </div>
            </div>

            <!-- Coluna Lateral: Revisão Completa do Pedido (Art. 4º Decreto 7.962/2013) -->
            <div>
              <div class="admin-card" style="position:sticky;top:98px;">
                <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:14px;">Resumo para Revisão</h2>
                <div style="display:flex;flex-direction:column;gap:10px;max-height:280px;overflow-y:auto;margin-bottom:14px;padding-right:4px;">
                  ${AppState.cart.map((item) => `
                    <div style="display:flex;justify-content:space-between;font-size:0.84rem;padding-bottom:8px;border-bottom:1px solid var(--border-subtle);">
                      <div>
                        <strong>${escapeHtml(item.name)}</strong>
                        <div style="font-size:0.75rem;color:var(--text-secondary);">Tam: ${escapeHtml(item.size)} | Cor: ${escapeHtml(item.color)} | Qtd: ${item.quantity}</div>
                      </div>
                      <span style="font-weight:600;white-space:nowrap;">${formatBRL(item.unitPrice * item.quantity)}</span>
                    </div>
                  `).join('')}
                </div>

                <div style="font-size:0.88rem;border-top:1px solid var(--border-subtle);padding-top:12px;margin-bottom:16px;">
                  <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                    <span>Subtotal dos itens:</span>
                    <span>${formatBRL(totals.subtotal)}</span>
                  </div>
                  ${totals.discount > 0 ? `
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px;color:var(--status-success-text);">
                      <span>Cupom (${escapeHtml(AppState.appliedCoupon.code)}):</span>
                      <span>-${formatBRL(totals.discount)}</span>
                    </div>
                  ` : ''}
                  <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                    <span>Entrega (${totals.shippingMethod ? escapeHtml(totals.shippingMethod.name) : 'A definir'}):</span>
                    <span>${totals.shippingMethod && totals.shippingMethod.priceStatus === 'confirmed' ? formatBRL(totals.shippingCost) : 'A confirmar pela proprietária'}</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;font-size:1.2rem;font-weight:700;padding-top:10px;border-top:1px solid var(--border-strong);">
                    <span>Total a Pagar:</span>
                    <span>${formatBRL(totals.total)}</span>
                  </div>
                </div>

                <button type="submit" class="btn btn-primary btn-block" ${activePaymentOptions.length === 0 ? 'disabled' : ''}>
                  Confirmar Pedido (${formatBRL(totals.total)})
                </button>
                <p style="font-size:0.74rem;color:var(--text-muted);text-align:center;margin-top:10px;">
                  Ao confirmar, você concorda com os <button type="button" data-action="go-policies" data-tab="terms" style="text-decoration:underline;">Termos de Uso</button> e a <button type="button" data-action="go-policies" data-tab="privacy" style="text-decoration:underline;">Política de Privacidade</button>.
                </p>
              </div>
            </div>
          </form>
        </div>
      </section>
    `;
  }

  function bindCheckoutEvents() {
    const form = document.getElementById('checkout-order-form');
    if (!form) return;

    // Atualiza método de entrega selecionado
    form.querySelectorAll('input[name="shippingMethodId"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        AppState.selectedShippingMethodId = e.target.value;
        renderMainView();
      });
    });

    // Atualiza método de pagamento selecionado
    form.querySelectorAll('input[name="paymentMethod"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        AppState.selectedPaymentMethod = e.target.value;
        renderMainView();
      });
    });

    // Submissão do pedido
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const totals = calculateCartTotals();
      const orderNumber = 'ANG-' + String(1001 + (AppState.db.orders ? AppState.db.orders.length : 0));
      const txid = ((AppState.db.paymentSettings.pix.txidPrefix || 'BYANGELY') + orderNumber.replace(/\D/g, '')).slice(0, 25);

      // Deduz estoque das variações compradas
      AppState.cart.forEach((item) => {
        const prod = AppState.db.products.find((p) => p.id === item.productId);
        if (prod && Array.isArray(prod.variations)) {
          const v = prod.variations.find((vr) => vr.size === item.size && vr.color === item.color);
          if (v && v.stock >= item.quantity) {
            v.stock -= item.quantity;
          }
          prod.salesCount = (Number(prod.salesCount) || 0) + item.quantity;
        }
      });

      // Gera dados Pix se aplicável
      let pixData = null;
      if (AppState.selectedPaymentMethod === 'pix') {
        const pixCfg = AppState.db.paymentSettings.pix;
        const keyToUse = (pixCfg.pixKey && !pixCfg.pixKey.toLowerCase().includes('a confirmar'))
          ? pixCfg.pixKey
          : 'chave-a-confirmar@byangely.local';
        const nameToUse = (pixCfg.recipientName && !pixCfg.recipientName.toLowerCase().includes('a confirmar'))
          ? pixCfg.recipientName
          : 'BY ANGELY ITAPERUNA';

        const payload = window.ByAngelyPix.generatePixPayload({
          pixKey: keyToUse,
          keyType: pixCfg.keyType,
          merchantName: nameToUse,
          merchantCity: pixCfg.recipientCity || 'ITAPERUNA',
          amount: totals.total,
          txid: txid,
          description: 'PEDIDO ' + orderNumber
        });
        pixData = {
          payload,
          txid,
          recipientName: pixCfg.recipientName,
          pixKey: pixCfg.pixKey,
          recipientCity: pixCfg.recipientCity || 'ITAPERUNA',
          isOwnerKeyConfirmed: !pixCfg.pixKey.toLowerCase().includes('a confirmar')
        };
      }

      const newOrder = {
        id: 'ord-' + Date.now(),
        orderNumber,
        createdAt: new Date().toISOString(),
        // NUNCA simula aprovação de pagamento! Permanece "awaiting_confirmation"
        status: 'awaiting_confirmation',
        statusLabel: 'Aguardando confirmação de pagamento',
        paymentMethod: AppState.selectedPaymentMethod,
        paymentMethodLabel:
          AppState.selectedPaymentMethod === 'pix'
            ? 'Pix (QR Code / Copia e Cola)'
            : AppState.selectedPaymentMethod === 'creditCard'
            ? 'Cartão de Crédito (Link / Provedor Externo)'
            : 'Pagamento na Retirada (Itaperuna - RJ)',
        customer: {
          name: fd.get('customerName'),
          email: fd.get('customerEmail'),
          phone: fd.get('customerPhone'),
          cpf: fd.get('customerCpf') || 'Não informado',
          marketingOptIn: fd.get('marketingOptIn') === 'on'
        },
        shipping: {
          methodId: totals.shippingMethod ? totals.shippingMethod.id : '',
          methodName: totals.shippingMethod ? totals.shippingMethod.name : 'A confirmar',
          cost: totals.shippingCost,
          priceStatus: totals.shippingMethod ? totals.shippingMethod.priceStatus : 'to_confirm',
          address: {
            zipCode: fd.get('zipCode'),
            street: fd.get('street'),
            number: fd.get('number'),
            neighborhood: fd.get('neighborhood'),
            cityState: fd.get('cityState')
          },
          trackingCode: ''
        },
        items: JSON.parse(JSON.stringify(AppState.cart)),
        subtotal: totals.subtotal,
        discount: totals.discount,
        couponCode: AppState.appliedCoupon ? AppState.appliedCoupon.code : null,
        total: totals.total,
        pixData,
        customerPaymentNote: '',
        notificationsLog: [
          {
            date: new Date().toISOString(),
            channel: 'Painel da Cliente',
            message: `Pedido ${orderNumber} registrado com status "Aguardando confirmação de pagamento".`
          }
        ]
      };

      AppState.db.orders.unshift(newOrder);
      if (window.ByAngelyCloud && window.ByAngelyCloud.insertOrderToSupabase) {
        window.ByAngelyCloud.insertOrderToSupabase(newOrder).catch(() => {});
      }

      // Atualiza ou registra cliente na base
      let existingCustomer = AppState.db.customers.find(
        (c) => c.email.toLowerCase() === newOrder.customer.email.toLowerCase()
      );
      if (!existingCustomer) {
        existingCustomer = {
          id: 'cust-' + Date.now(),
          name: newOrder.customer.name,
          email: newOrder.customer.email,
          phone: newOrder.customer.phone,
          cpf: newOrder.customer.cpf,
          marketingOptIn: newOrder.customer.marketingOptIn,
          createdAt: new Date().toISOString(),
          addresses: [newOrder.shipping.address]
        };
        AppState.db.customers.unshift(existingCustomer);
      } else {
        existingCustomer.marketingOptIn = newOrder.customer.marketingOptIn;
      }

      AppState.currentCustomer = existingCustomer;
      try {
        localStorage.setItem(STORAGE_KEY_CUSTOMER_SESSION, JSON.stringify(existingCustomer));
      } catch (err) {}

      AppState.cart = [];
      AppState.appliedCoupon = null;
      saveCart();
      AppState.lastCreatedOrder = newOrder;
      saveDatabase(`Novo pedido ${orderNumber} criado (${formatBRL(newOrder.total)}) — Aguardando confirmação.`);
      renderMainView();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast(`Pedido ${orderNumber} gerado! Confira as instruções de pagamento.`, 'success');
    });
  }

  function renderOrderConfirmationScreen(order) {
    const paySettings = AppState.db.paymentSettings;
    let qrSvg = '';
    if (order.paymentMethod === 'pix' && order.pixData && order.pixData.payload) {
      qrSvg = window.ByAngelyPix.renderQrSvg(order.pixData.payload);
    }

    return `
      <section class="section-block">
        <div class="container" style="max-width:860px;">
          <div class="admin-card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid var(--border-subtle);">
              <div>
                <span class="section-eyebrow">Pedido Registrado</span>
                <h1 style="font-family:var(--font-serif);font-size:2.1rem;">Pedido ${escapeHtml(order.orderNumber)}</h1>
                <p style="font-size:0.86rem;color:var(--text-secondary);">Realizado em ${formatDateBR(order.createdAt)}</p>
              </div>
              <span class="status-pill pending" style="font-size:0.85rem;padding:6px 14px;">
                ⏳ Status: ${escapeHtml(order.statusLabel)}
              </span>
            </div>

            <div class="alert-box alert-warning">
              <strong>Atenção — Status Real do Pagamento:</strong> O seu pedido encontra-se como <strong>"Aguardando confirmação de pagamento"</strong>. A loja nunca simula aprovação automática: o status será atualizado para <em>"Pagamento confirmado"</em> assim que o recebimento for validado pela administração ou pelo provedor de pagamento configurado.
            </div>

            ${order.paymentMethod === 'pix' && order.pixData ? `
              <div style="background:var(--bg-primary);border:1px solid var(--border-strong);border-radius:8px;padding:22px;margin-bottom:22px;text-align:center;">
                <h2 style="font-family:var(--font-serif);font-size:1.6rem;margin-bottom:8px;">Pagamento via Pix (${formatBRL(order.total)})</h2>
                ${!order.pixData.isOwnerKeyConfirmed ? `
                  <div class="alert-box alert-warning" style="text-align:left;">
                    <strong>Nota de Implantação:</strong> A chave Pix definitiva da By Angély ainda está marcada como <em>"A confirmar pela proprietária"</em> no Painel Administrativo. O QR Code abaixo é gerado no padrão oficial EMV do Banco Central para demonstração técnica da cobrança com valor exato (${formatBRL(order.total)}) e identificador <code>${escapeHtml(order.pixData.txid)}</code>.
                  </div>
                ` : ''}

                <!-- Dados do Recebedor para Conferência antes do pagamento -->
                <div style="max-width:480px;margin:0 auto 14px;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:6px;padding:12px;text-align:left;font-size:0.84rem;">
                  <strong style="display:block;margin-bottom:6px;color:var(--accent-gold);text-transform:uppercase;font-size:0.74rem;">Confira os Dados do Recebedor antes de pagar:</strong>
                  <div><strong>Recebedor:</strong> ${escapeHtml(order.pixData.recipientName)}</div>
                  <div><strong>Chave Pix:</strong> ${escapeHtml(order.pixData.pixKey)}</div>
                  <div><strong>Cidade:</strong> ${escapeHtml(order.pixData.recipientCity)}</div>
                  <div><strong>Valor Exato:</strong> ${formatBRL(order.total)}</div>
                  <div><strong>Identificador (TXID):</strong> ${escapeHtml(order.pixData.txid)}</div>
                </div>

                <div class="pix-qr-box">
                  ${qrSvg}
                </div>

                <div style="max-width:520px;margin:14px auto 0;">
                  <label style="display:block;font-size:0.76rem;font-weight:700;text-transform:uppercase;margin-bottom:6px;">Código Pix Copia e Cola (EMV BR Code):</label>
                  <div style="display:flex;gap:8px;">
                    <input type="text" id="pix-copia-cola-input" class="form-control" readonly value="${escapeHtml(order.pixData.payload)}" style="font-family:monospace;font-size:0.78rem;" />
                    <button type="button" class="btn btn-primary btn-sm" data-action="copy-pix-code">Copiar Código</button>
                  </div>
                </div>
              </div>
            ` : ''}

            ${order.paymentMethod === 'creditCard' ? `
              <div style="background:var(--bg-primary);border:1px solid var(--border-strong);border-radius:8px;padding:22px;margin-bottom:22px;">
                <h2 style="font-family:var(--font-serif);font-size:1.6rem;margin-bottom:8px;">Pagamento por Cartão de Crédito (${formatBRL(order.total)})</h2>
                <p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:14px;">
                  ${escapeHtml(paySettings.creditCard.instructions)}
                </p>
                ${paySettings.creditCard.externalPaymentLink ? `
                  <a href="${escapeHtml(paySettings.creditCard.externalPaymentLink)}" target="_blank" rel="noopener noreferrer" class="btn btn-gold">
                    Ir para Página Segura de Pagamento (${escapeHtml(paySettings.creditCard.providerName)}) ↗
                  </a>
                ` : `
                  <div class="alert-box alert-warning">
                    <strong>Link de pagamento externo pendente de configuração:</strong> A proprietária ainda não cadastrou o link externo ou provedor de cartão no Painel Administrativo. Seu pedido nº <strong>${escapeHtml(order.orderNumber)}</strong> está salvo como <em>Aguardando confirmação</em>.
                  </div>
                `}
              </div>
            ` : ''}

            ${order.paymentMethod === 'payOnPickup' ? `
              <div style="background:var(--bg-primary);border:1px solid var(--border-strong);border-radius:8px;padding:22px;margin-bottom:22px;">
                <h2 style="font-family:var(--font-serif);font-size:1.6rem;margin-bottom:8px;">Pagamento na Retirada em Itaperuna - RJ</h2>
                <p style="font-size:0.9rem;color:var(--text-secondary);">
                  ${escapeHtml(paySettings.payOnPickup.instructions)}
                </p>
              </div>
            ` : ''}

            <!-- Envio opcional de comprovante / observação do pagamento pelo cliente -->
            <div style="border-top:1px solid var(--border-subtle);padding-top:16px;margin-bottom:20px;">
              <h3 style="font-size:0.95rem;margin-bottom:8px;">Já realizou o pagamento? Informe o comprovante ou observação para agilizar a conferência:</h3>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <input type="text" id="order-payment-note-input" class="form-control" style="flex:1;" placeholder="Ex.: Pix enviado às 14h30 pelo banco Itaú (ID E12345...)" value="${escapeHtml(order.customerPaymentNote || '')}" />
                <button type="button" class="btn btn-outline btn-sm" data-action="save-payment-note" data-order-id="${escapeHtml(order.id)}">Enviar Aviso de Pagamento</button>
              </div>
            </div>

            <div style="display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap;">
              <button type="button" class="btn btn-primary" data-action="finish-order-go-account">
                Acompanhar Pedido na Área da Cliente
              </button>
              <button type="button" class="btn btn-outline" data-action="finish-order-go-catalog">
                Voltar para a Loja
              </button>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // =========================================================================
  // 5. ÁREA DA CLIENTE (CONTA, LOGIN, RECUPERAÇÃO DE SENHA, PEDIDOS E TROCAS)
  // =========================================================================
  function renderAccountView() {
    if (!AppState.currentCustomer) {
      return renderCustomerAuthScreen();
    }

    const cust = AppState.currentCustomer;
    const myOrders = (AppState.db.orders || []).filter(
      (o) => o.customer && o.customer.email && o.customer.email.toLowerCase() === cust.email.toLowerCase()
    );
    const myReturns = (AppState.db.returnRequests || []).filter(
      (r) => r.customerEmail && r.customerEmail.toLowerCase() === cust.email.toLowerCase()
    );

    return `
      <section class="section-block">
        <div class="container">
          <div class="section-header" style="margin-bottom:24px;">
            <div>
              <span class="section-eyebrow">Área da Cliente</span>
              <h1 class="section-title">Olá, ${escapeHtml(cust.name)}</h1>
              <p style="color:var(--text-secondary);font-size:0.88rem;">${escapeHtml(cust.email)}</p>
            </div>
            <button type="button" class="btn btn-outline btn-sm" data-action="customer-logout">Sair da Conta</button>
          </div>

          <div style="display:flex;gap:10px;margin-bottom:24px;flex-wrap:wrap;">
            <button type="button" class="btn ${AppState.activeAccountTab === 'orders' ? 'btn-primary' : 'btn-subtle'} btn-sm" data-action="switch-account-tab" data-tab="orders">
              Meus Pedidos (${myOrders.length})
            </button>
            <button type="button" class="btn ${AppState.activeAccountTab === 'returns' ? 'btn-primary' : 'btn-subtle'} btn-sm" data-action="switch-account-tab" data-tab="returns">
              Trocas e Devoluções (${myReturns.length})
            </button>
            <button type="button" class="btn ${AppState.activeAccountTab === 'profile' ? 'btn-primary' : 'btn-subtle'} btn-sm" data-action="switch-account-tab" data-tab="profile">
              Dados Pessoais, Endereços & Privacidade (LGPD)
            </button>
          </div>

          ${AppState.activeAccountTab === 'orders' ? `
            <div>
              ${myOrders.length === 0 ? `
                <div class="admin-card" style="text-align:center;padding:40px 20px;">
                  <p style="font-family:var(--font-serif);font-size:1.4rem;margin-bottom:8px;">Você ainda não possui pedidos realizados</p>
                  <button type="button" class="btn btn-primary btn-sm" data-action="go-catalog">Explorar Catálogo</button>
                </div>
              ` : myOrders.map((ord) => `
                <div class="admin-card">
                  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding-bottom:12px;border-bottom:1px solid var(--border-subtle);margin-bottom:12px;">
                    <div>
                      <strong style="font-size:1.05rem;">Pedido ${escapeHtml(ord.orderNumber)}</strong>
                      <span style="font-size:0.8rem;color:var(--text-secondary);margin-left:10px;">${formatDateBR(ord.createdAt)}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <span class="status-pill ${ord.status === 'paid' || ord.status === 'delivered' ? 'confirmed' : ord.status === 'cancelled' ? 'danger' : 'pending'}">
                        ${escapeHtml(ord.statusLabel)}
                      </span>
                      <strong>${formatBRL(ord.total)}</strong>
                    </div>
                  </div>

                  <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:16px;font-size:0.86rem;">
                    <div>
                      <strong style="display:block;margin-bottom:6px;">Itens do Pedido:</strong>
                      ${(ord.items || []).map((it) => `
                        <div style="margin-bottom:4px;">• ${it.quantity}x ${escapeHtml(it.name)} (${escapeHtml(it.size)} / ${escapeHtml(it.color)}) — ${formatBRL(it.unitPrice * it.quantity)}</div>
                      `).join('')}
                    </div>
                    <div>
                      <div><strong>Forma de Pagamento:</strong> ${escapeHtml(ord.paymentMethodLabel)}</div>
                      <div><strong>Modalidade de Entrega:</strong> ${escapeHtml(ord.shipping ? ord.shipping.methodName : '')}</div>
                      <div><strong>Código de Rastreio:</strong> ${ord.shipping && ord.shipping.trackingCode ? `<span style="background:var(--status-info-bg);color:var(--status-info-text);padding:2px 8px;border-radius:4px;font-family:monospace;font-weight:700;">${escapeHtml(ord.shipping.trackingCode)}</span>` : '<span style="color:var(--text-muted);">Aguardando postagem / não aplicável</span>'}</div>
                      ${ord.customerPaymentNote ? `<div style="margin-top:4px;color:var(--status-info-text);"><strong>Seu aviso de pagamento:</strong> ${escapeHtml(ord.customerPaymentNote)}</div>` : ''}
                    </div>
                  </div>

                  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid var(--border-subtle);">
                    ${ord.status === 'awaiting_confirmation' ? `
                      <button type="button" class="btn btn-gold btn-sm" data-action="reopen-order-payment" data-order-id="${escapeHtml(ord.id)}">
                        Ver QR Code Pix / Instruções de Pagamento
                      </button>
                    ` : ''}
                    <button type="button" class="btn btn-outline btn-sm" data-action="open-return-request" data-order-number="${escapeHtml(ord.orderNumber)}">
                      Solicitar Troca ou Devolução (Art. 49 CDC)
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${AppState.activeAccountTab === 'returns' ? `
            <div class="admin-card">
              <h2 style="font-family:var(--font-serif);font-size:1.5rem;margin-bottom:10px;">Solicitar Troca ou Devolução (Direito de Arrependimento — CDC)</h2>
              <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:16px;">
                Conforme o Art. 49 do Código de Defesa do Consumidor, você pode exercer o direito de arrependimento em até 7 dias corridos após o recebimento, ou solicitar troca de tamanho/peça com defeito.
              </p>
              <form id="customer-return-form" style="margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid var(--border-subtle);">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Número do Pedido *</label>
                    <input type="text" name="orderNumber" id="return-order-number" class="form-control" required placeholder="Ex.: ANG-1001" value="${myOrders[0] ? escapeHtml(myOrders[0].orderNumber) : ''}" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Tipo de Solicitação *</label>
                    <select name="type" class="form-control" required>
                      <option value="Arrependimento de Compra (Até 7 dias - Art. 49 CDC)">Arrependimento de Compra (Até 7 dias - Art. 49 CDC)</option>
                      <option value="Troca de Tamanho ou Cor">Troca de Tamanho ou Cor</option>
                      <option value="Peça com Defeito de Fabricação (Art. 26 CDC)">Peça com Defeito de Fabricação (Art. 26 CDC)</option>
                    </select>
                  </div>
                </div>
                <div style="margin-bottom:12px;">
                  <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Detalhes da Solicitação (Peça e motivo) *</label>
                  <textarea name="reason" rows="2" class="form-control" required placeholder="Informe qual peça deseja trocar ou devolver..."></textarea>
                </div>
                <button type="submit" class="btn btn-primary btn-sm">Registrar Solicitação</button>
              </form>

              <h3 style="font-size:1rem;margin-bottom:12px;">Histórico de Solicitações (${myReturns.length})</h3>
              ${myReturns.length === 0 ? `<p style="font-size:0.86rem;color:var(--text-muted);">Nenhuma solicitação registrada até o momento.</p>` : myReturns.map((r) => `
                <div style="padding:12px;border:1px solid var(--border-subtle);border-radius:6px;margin-bottom:10px;font-size:0.86rem;">
                  <div style="display:flex;justify-content:space-between;">
                    <strong>Pedido ${escapeHtml(r.orderNumber)} — ${escapeHtml(r.type)}</strong>
                    <span class="status-pill pending">${escapeHtml(r.status)}</span>
                  </div>
                  <p style="margin-top:4px;color:var(--text-secondary);">${escapeHtml(r.reason)}</p>
                  ${r.ownerResponse ? `<p style="margin-top:6px;color:var(--status-info-text);"><strong>Resposta da Loja:</strong> ${escapeHtml(r.ownerResponse)}</p>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${AppState.activeAccountTab === 'profile' ? `
            <div class="admin-card">
              <h2 style="font-family:var(--font-serif);font-size:1.5rem;margin-bottom:14px;">Meus Dados e Preferências de Privacidade (LGPD)</h2>
              <form id="customer-profile-form">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Nome Completo</label>
                    <input type="text" name="name" class="form-control" required value="${escapeHtml(cust.name)}" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Telefone / WhatsApp</label>
                    <input type="text" name="phone" class="form-control" value="${escapeHtml(cust.phone || '')}" />
                  </div>
                </div>
                <div style="padding:12px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:6px;margin-bottom:14px;">
                  <strong style="display:block;font-size:0.86rem;margin-bottom:6px;">Controle de Comunicações Publicitárias (Direito de Revogação / Opt-out LGPD)</strong>
                  <label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;cursor:pointer;">
                    <input type="checkbox" name="marketingOptIn" ${cust.marketingOptIn ? 'checked' : ''} />
                    <span>Autorizo o recebimento de ofertas e novidades promocionais da By Angély. (Desmarque e salve a qualquer momento para cancelar o recebimento imediatamente).</span>
                  </label>
                </div>
                <button type="submit" class="btn btn-primary btn-sm">Salvar Alterações e Preferências</button>
              </form>
            </div>
          ` : ''}
        </div>
      </section>
    `;
  }

  function renderCustomerAuthScreen() {
    return `
      <section class="section-block">
        <div class="container">
          <div class="checkout-layout" style="grid-template-columns:1fr 1fr;">
            <!-- Entrar -->
            <div class="admin-card">
              <span class="section-eyebrow">Cliente Cadastrada</span>
              <h1 style="font-family:var(--font-serif);font-size:1.8rem;margin-bottom:14px;">Entrar na Minha Conta</h1>
              <form id="customer-login-form">
                <div style="margin-bottom:12px;">
                  <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">E-mail *</label>
                  <input type="email" name="email" class="form-control" required placeholder="seu@email.com" />
                </div>
                <div style="margin-bottom:14px;">
                  <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Senha *</label>
                  <input type="password" name="password" class="form-control" required placeholder="••••••••" />
                </div>
                <button type="submit" class="btn btn-primary btn-block">Acessar Conta</button>
              </form>

              <details style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-subtle);">
                <summary style="font-size:0.82rem;font-weight:600;cursor:pointer;">Esqueceu sua senha? Recuperar acesso</summary>
                <form id="customer-recover-form" style="margin-top:10px;">
                  <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:8px;">Informe seu e-mail cadastrado e defina uma nova senha:</p>
                  <input type="email" name="email" class="form-control" required placeholder="E-mail da conta" style="margin-bottom:8px;" />
                  <input type="password" name="newPassword" class="form-control" required placeholder="Nova senha (mín. 6 caracteres)" minlength="6" style="margin-bottom:8px;" />
                  <button type="submit" class="btn btn-outline btn-sm">Redefinir Senha</button>
                </form>
              </details>
            </div>

            <!-- Criar Conta -->
            <div class="admin-card">
              <span class="section-eyebrow">Primeira Compra</span>
              <h2 style="font-family:var(--font-serif);font-size:1.8rem;margin-bottom:14px;">Criar Conta de Cliente</h2>
              <form id="customer-register-form">
                <div style="margin-bottom:10px;">
                  <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Nome Completo *</label>
                  <input type="text" name="name" class="form-control" required placeholder="Seu nome completo" />
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">E-mail *</label>
                    <input type="email" name="email" class="form-control" required placeholder="seu@email.com" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">WhatsApp / Celular *</label>
                    <input type="tel" name="phone" class="form-control" required placeholder="(22) 99999-9999" />
                  </div>
                </div>
                <div style="margin-bottom:12px;">
                  <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Crie uma Senha *</label>
                  <input type="password" name="password" class="form-control" required minlength="6" placeholder="Mínimo de 6 caracteres" />
                </div>
                <label style="display:flex;align-items:flex-start;gap:8px;font-size:0.8rem;color:var(--text-secondary);margin-bottom:14px;cursor:pointer;">
                  <input type="checkbox" name="marketingOptIn" style="margin-top:3px;" />
                  <span>Aceito receber novidades promocionais (Opcional — você pode cancelar quando quiser).</span>
                </label>
                <button type="submit" class="btn btn-gold btn-block">Criar Minha Conta</button>
              </form>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function bindAccountEvents() {
    const loginForm = document.getElementById('customer-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(loginForm);
        const email = String(fd.get('email') || '').trim().toLowerCase();
        const pass = String(fd.get('password') || '');
        const found = (AppState.db.customers || []).find(
          (c) => c.email.toLowerCase() === email && (!c.password || c.password === pass)
        );
        if (!found) {
          showToast('E-mail ou senha não encontrados. Crie sua conta ao lado se for seu primeiro acesso.', 'danger');
          return;
        }
        AppState.currentCustomer = found;
        localStorage.setItem(STORAGE_KEY_CUSTOMER_SESSION, JSON.stringify(found));
        updateHeaderCounters();
        renderMainView();
        showToast(`Bem-vinda de volta, ${found.name}!`, 'success');
      });
    }

    const regForm = document.getElementById('customer-register-form');
    if (regForm) {
      regForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(regForm);
        const email = String(fd.get('email') || '').trim().toLowerCase();
        if ((AppState.db.customers || []).some((c) => c.email.toLowerCase() === email)) {
          showToast('Já existe um cadastro com este e-mail. Faça login ao lado.', 'warning');
          return;
        }
        const newCust = {
          id: 'cust-' + Date.now(),
          name: fd.get('name'),
          email: fd.get('email'),
          phone: fd.get('phone'),
          password: fd.get('password'),
          marketingOptIn: fd.get('marketingOptIn') === 'on',
          createdAt: new Date().toISOString(),
          addresses: []
        };
        AppState.db.customers.unshift(newCust);
        AppState.currentCustomer = newCust;
        localStorage.setItem(STORAGE_KEY_CUSTOMER_SESSION, JSON.stringify(newCust));
        saveDatabase('Novo cadastro de cliente: ' + newCust.email);
        updateHeaderCounters();
        renderMainView();
        showToast('Conta criada com sucesso!', 'success');
      });
    }

    const recForm = document.getElementById('customer-recover-form');
    if (recForm) {
      recForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(recForm);
        const email = String(fd.get('email') || '').trim().toLowerCase();
        const cust = (AppState.db.customers || []).find((c) => c.email.toLowerCase() === email);
        if (!cust) {
          showToast('Nenhum cadastro localizado para este e-mail.', 'danger');
          return;
        }
        cust.password = fd.get('newPassword');
        saveDatabase('Recuperação de senha de cliente concluída.');
        showToast('Senha redefinida com sucesso! Você já pode entrar.', 'success');
        recForm.reset();
      });
    }

    const returnForm = document.getElementById('customer-return-form');
    if (returnForm) {
      returnForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(returnForm);
        const reqObj = {
          id: 'ret-' + Date.now(),
          orderNumber: fd.get('orderNumber'),
          customerName: AppState.currentCustomer.name,
          customerEmail: AppState.currentCustomer.email,
          type: fd.get('type'),
          reason: fd.get('reason'),
          status: 'Em análise pela loja',
          ownerResponse: '',
          createdAt: new Date().toISOString()
        };
        AppState.db.returnRequests.unshift(reqObj);
        saveDatabase(`Solicitação de troca/devolução aberta para ${reqObj.orderNumber}`);
        renderMainView();
        showToast('Solicitação de troca/devolução registrada com sucesso!', 'success');
      });
    }

    const profForm = document.getElementById('customer-profile-form');
    if (profForm) {
      profForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(profForm);
        const c = AppState.db.customers.find((x) => x.id === AppState.currentCustomer.id);
        if (c) {
          c.name = fd.get('name');
          c.phone = fd.get('phone');
          c.marketingOptIn = fd.get('marketingOptIn') === 'on';
          AppState.currentCustomer = c;
          localStorage.setItem(STORAGE_KEY_CUSTOMER_SESSION, JSON.stringify(c));
          saveDatabase('Preferências de dados e LGPD atualizadas pela cliente.');
          updateHeaderCounters();
          showToast('Dados e preferências de privacidade atualizados!', 'success');
        }
      });
    }
  }

  // =========================================================================
  // 6. PÁGINA DE POLÍTICAS LEGAIS, FONTES OFICIAIS E LICENÇAS DE IMAGEM
  // =========================================================================
  function renderPoliciesView() {
    const pol = AppState.db.policies;
    const tab = AppState.activePolicyTab || 'privacy';
    const currentPolicyObj =
      tab === 'privacy' ? pol.privacy :
      tab === 'terms' ? pol.terms :
      tab === 'shipping' ? pol.shippingPolicy :
      tab === 'returns' ? pol.returnsPolicy : null;

    return `
      <section class="section-block">
        <div class="container" style="max-width:980px;">
          <div class="section-header" style="margin-bottom:20px;">
            <div>
              <span class="section-eyebrow">Transparência, Conformidade Legal e Licenciamento</span>
              <h1 class="section-title">Políticas, Termos & Fontes do Projeto</h1>
            </div>
          </div>

          <div class="alert-box alert-warning">
            <strong>Aviso de Revisão Obrigatória pela Proprietária:</strong> ${escapeHtml(pol.legalDisclaimer)}
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px;">
            <button type="button" class="btn ${tab === 'privacy' ? 'btn-primary' : 'btn-subtle'} btn-sm" data-action="go-policies" data-tab="privacy">Política de Privacidade (LGPD)</button>
            <button type="button" class="btn ${tab === 'terms' ? 'btn-primary' : 'btn-subtle'} btn-sm" data-action="go-policies" data-tab="terms">Termos de Uso</button>
            <button type="button" class="btn ${tab === 'shipping' ? 'btn-primary' : 'btn-subtle'} btn-sm" data-action="go-policies" data-tab="shipping">Política de Entrega</button>
            <button type="button" class="btn ${tab === 'returns' ? 'btn-primary' : 'btn-subtle'} btn-sm" data-action="go-policies" data-tab="returns">Trocas e Devoluções (CDC)</button>
            <button type="button" class="btn ${tab === 'references' ? 'btn-primary' : 'btn-subtle'} btn-sm" data-action="go-policies" data-tab="references">Fontes Oficiais & Licenças de Imagens</button>
          </div>

          ${currentPolicyObj ? `
            <div class="admin-card">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
                <h2 style="font-family:var(--font-serif);font-size:1.85rem;">${escapeHtml(currentPolicyObj.title)}</h2>
                <span class="status-pill ${currentPolicyObj.needsOwnerConfirmation ? 'pending' : 'confirmed'}">
                  ${currentPolicyObj.needsOwnerConfirmation ? 'Requer confirmação da proprietária' : 'Confirmada pela proprietária'}
                </span>
              </div>

              ${currentPolicyObj.needsOwnerConfirmation && currentPolicyObj.pendingFields && currentPolicyObj.pendingFields.length > 0 ? `
                <div class="alert-box alert-info">
                  <strong>Itens que a proprietária precisa revisar e confirmar no Painel antes de publicar:</strong>
                  <ul style="margin:6px 0 0 18px;">
                    ${currentPolicyObj.pendingFields.map((pf) => `<li>${escapeHtml(pf)}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}

              ${(currentPolicyObj.content || []).map((sec) => `
                <div style="margin-bottom:18px;">
                  <h3 style="font-size:1.05rem;margin-bottom:6px;color:var(--text-primary);">${escapeHtml(sec.heading)}</h3>
                  <p style="color:var(--text-secondary);font-size:0.92rem;line-height:1.7;">${escapeHtml(sec.body)}</p>
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${tab === 'references' ? `
            <div class="admin-card">
              <h2 style="font-family:var(--font-serif);font-size:1.75rem;margin-bottom:8px;">Fontes Oficiais e Legislação Consultada</h2>
              <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:16px;">
                Data da pesquisa e consulta das referências: <strong>${escapeHtml(pol.lastConsultationDate || '14/11/2026')}</strong>. Nenhum texto de terceiros foi copiado.
              </p>
              <div style="overflow-x:auto;">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Tema / Categoria</th>
                      <th>Norma / Documento Oficial</th>
                      <th>Órgão / Instituição</th>
                      <th>Data Consulta</th>
                      <th>Aplicação no Projeto</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${(AppState.db.officialReferences || []).map((ref) => `
                      <tr>
                        <td><strong>${escapeHtml(ref.category)}</strong></td>
                        <td><a href="${escapeHtml(ref.url)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-gold);text-decoration:underline;">${escapeHtml(ref.title)} ↗</a></td>
                        <td>${escapeHtml(ref.institution)}</td>
                        <td>${escapeHtml(ref.consultedAt)}</td>
                        <td>${escapeHtml(ref.usageNote)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="admin-card">
              <h2 style="font-family:var(--font-serif);font-size:1.75rem;margin-bottom:8px;">Registro de Licenças das Imagens Demonstrativas</h2>
              <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:16px;">
                Todas as fotografias abaixo são de moda feminina adulta e possuem licença verificada para demonstração. Nenhuma foto das imagens de referência ou do Instagram da By Angély foi reutilizada. A proprietária pode substituir ou remover todas pelo Painel Administrativo.
              </p>
              <div style="overflow-x:auto;">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Local de Uso</th>
                      <th>Fotógrafo / Autor</th>
                      <th>Fonte Original</th>
                      <th>Condições da Licença</th>
                      <th>Data Verificação</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${(AppState.db.imageLicenses || []).map((img) => `
                      <tr>
                        <td><strong>${escapeHtml(img.usageLocation)}</strong></td>
                        <td>${escapeHtml(img.author)}</td>
                        <td><a href="${escapeHtml(img.url)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-gold);text-decoration:underline;">${escapeHtml(img.source)} ↗</a></td>
                        <td>${escapeHtml(img.license)}</td>
                        <td>${escapeHtml(img.consultedAt)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}
        </div>
      </section>
    `;
  }

  // =========================================================================
  // DELEGAÇÃO GLOBAL DE EVENTOS E INTERAÇÕES
  // =========================================================================
  function setupGlobalEvents() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action], [data-nav-view]');
      if (!target) return;

      const navView = target.getAttribute('data-nav-view');
      if (navView) {
        e.preventDefault();
        AppState.lastCreatedOrder = null;
        closeMobileMenu();
        navigateTo(navView);
        return;
      }

      const action = target.getAttribute('data-action');
      if (!action) return;

      switch (action) {
        case 'go-view': {
          const v = target.getAttribute('data-view') || 'home';
          AppState.lastCreatedOrder = null;
          closeMobileMenu();
          navigateTo(v);
          break;
        }
        case 'go-catalog': {
          AppState.lastCreatedOrder = null;
          resetFilters();
          closeMobileMenu();
          navigateTo('catalog');
          break;
        }
        case 'filter-category': {
          const cat = target.getAttribute('data-category') || 'all';
          resetFilters();
          AppState.filters.category = cat;
          closeMobileMenu();
          navigateTo('catalog');
          break;
        }
        case 'filter-promo': {
          resetFilters();
          AppState.filters.availability = 'promo';
          closeMobileMenu();
          navigateTo('catalog');
          break;
        }
        case 'reset-catalog-filters': {
          resetFilters();
          renderMainView();
          break;
        }
        case 'open-product': {
          const pid = target.getAttribute('data-product-id');
          openProductModal(pid);
          break;
        }
        case 'close-product-modal': {
          const modal = document.getElementById('product-detail-modal');
          if (modal) modal.classList.remove('open');
          const floatingWa = document.querySelector('.floating-whatsapp-concierge');
          if (floatingWa) floatingWa.href = getOfficialContacts().whatsappUrl;
          break;
        }
        case 'select-pdp-color': {
          AppState.activeProductModal.selectedColor = target.getAttribute('data-color');
          renderProductModalContent();
          break;
        }
        case 'select-pdp-size': {
          AppState.activeProductModal.selectedSize = target.getAttribute('data-size');
          renderProductModalContent();
          break;
        }
        case 'select-pdp-media': {
          AppState.activeProductModal.mediaIndex = Number(target.getAttribute('data-index')) || 0;
          renderProductModalContent();
          break;
        }
        case 'zoom-image': {
          const url = target.getAttribute('data-url');
          const alt = target.getAttribute('data-alt') || '';
          const lb = document.getElementById('lightbox-overlay');
          const lbImg = document.getElementById('lightbox-img');
          if (lb && lbImg) {
            lbImg.src = url;
            lbImg.alt = alt;
            lb.classList.add('open');
          }
          break;
        }
        case 'close-lightbox': {
          const lb = document.getElementById('lightbox-overlay');
          if (lb) lb.classList.remove('open');
          break;
        }
        case 'add-to-cart-modal': {
          const st = AppState.activeProductModal;
          addToCart(st.productId, st.selectedSize, st.selectedColor, 1);
          const modal = document.getElementById('product-detail-modal');
          if (modal) modal.classList.remove('open');
          break;
        }
        case 'toggle-wishlist': {
          const pid = target.getAttribute('data-product-id');
          const idx = AppState.wishlist.indexOf(pid);
          if (idx >= 0) {
            AppState.wishlist.splice(idx, 1);
            showToast('Peça removida dos favoritos.');
          } else {
            AppState.wishlist.push(pid);
            showToast('Peça salva nos seus Favoritos!', 'success');
          }
          saveWishlist();
          renderMainView();
          if (document.getElementById('product-detail-modal').classList.contains('open')) {
            renderProductModalContent();
          }
          break;
        }
        case 'share-product': {
          const pid = target.getAttribute('data-product-id');
          const prod = AppState.db.products.find((p) => p.id === pid);
          const shareUrl = window.location.origin + window.location.pathname + '?produto=' + encodeURIComponent(pid);
          if (navigator.share && prod) {
            navigator.share({ title: prod.name + ' — By Angély', url: shareUrl }).catch(() => {});
          } else if (navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl);
            showToast('Link do produto copiado para a área de transferência!', 'success');
          }
          break;
        }
        case 'open-cart': {
          openCartDrawer();
          break;
        }
        case 'close-cart': {
          closeCartDrawer();
          break;
        }
        case 'close-cart-go-catalog': {
          closeCartDrawer();
          navigateTo('catalog');
          break;
        }
        case 'cart-qty-inc': {
          const key = target.getAttribute('data-key');
          const item = AppState.cart.find((i) => i.key === key);
          if (item) {
            const prod = AppState.db.products.find((p) => p.id === item.productId);
            const avail = getVariationStock(prod, item.size, item.color);
            if (item.quantity + 1 <= avail) {
              item.quantity += 1;
              saveCart();
              renderCartDrawer();
            } else {
              showToast(`Limite de estoque disponível atingido (${avail} un.).`, 'warning');
            }
          }
          break;
        }
        case 'cart-qty-dec': {
          const key = target.getAttribute('data-key');
          const item = AppState.cart.find((i) => i.key === key);
          if (item) {
            if (item.quantity > 1) {
              item.quantity -= 1;
            } else {
              AppState.cart = AppState.cart.filter((i) => i.key !== key);
            }
            saveCart();
            renderCartDrawer();
          }
          break;
        }
        case 'cart-remove': {
          const key = target.getAttribute('data-key');
          AppState.cart = AppState.cart.filter((i) => i.key !== key);
          saveCart();
          renderCartDrawer();
          showToast('Item removido da sacola.');
          break;
        }
        case 'apply-coupon': {
          const input = document.getElementById('cart-coupon-input');
          const code = input ? input.value.trim().toUpperCase() : '';
          if (!code) return;
          const found = (AppState.db.coupons || []).find((c) => c.code.toUpperCase() === code && c.active);
          if (!found) {
            showToast('Cupom inválido ou inativo.', 'danger');
            return;
          }
          const subtotal = AppState.cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
          if (subtotal < (Number(found.minOrderAmount) || 0)) {
            showToast(`Este cupom requer pedido mínimo de ${formatBRL(found.minOrderAmount)}.`, 'warning');
            return;
          }
          AppState.appliedCoupon = found;
          renderCartDrawer();
          showToast(`Cupom ${found.code} aplicado com sucesso!`, 'success');
          break;
        }
        case 'proceed-to-checkout': {
          closeCartDrawer();
          AppState.lastCreatedOrder = null;
          navigateTo('checkout');
          break;
        }
        case 'copy-pix-code': {
          const input = document.getElementById('pix-copia-cola-input');
          if (input && navigator.clipboard) {
            navigator.clipboard.writeText(input.value);
            showToast('Código Pix Copia e Cola copiado!', 'success');
          }
          break;
        }
        case 'save-payment-note': {
          const oid = target.getAttribute('data-order-id');
          const noteInput = document.getElementById('order-payment-note-input');
          const ord = (AppState.db.orders || []).find((o) => o.id === oid);
          if (ord && noteInput && noteInput.value.trim()) {
            ord.customerPaymentNote = noteInput.value.trim();
            ord.notificationsLog.push({
              date: new Date().toISOString(),
              channel: 'Cliente',
              message: 'Aviso de pagamento enviado pela cliente: ' + ord.customerPaymentNote
            });
            saveDatabase(`Aviso de pagamento anexado ao pedido ${ord.orderNumber}`);
            showToast('Aviso registrado! A proprietária verá sua mensagem no painel.', 'success');
          }
          break;
        }
        case 'finish-order-go-account': {
          AppState.lastCreatedOrder = null;
          navigateTo('account', { accountTab: 'orders' });
          break;
        }
        case 'finish-order-go-catalog': {
          AppState.lastCreatedOrder = null;
          navigateTo('catalog');
          break;
        }
        case 'reopen-order-payment': {
          const oid = target.getAttribute('data-order-id');
          const ord = (AppState.db.orders || []).find((o) => o.id === oid);
          if (ord) {
            AppState.lastCreatedOrder = ord;
            navigateTo('checkout');
          }
          break;
        }
        case 'open-return-request': {
          const onum = target.getAttribute('data-order-number');
          navigateTo('account', { accountTab: 'returns' });
          setTimeout(() => {
            const inp = document.getElementById('return-order-number');
            if (inp && onum) inp.value = onum;
          }, 50);
          break;
        }
        case 'switch-account-tab': {
          AppState.activeAccountTab = target.getAttribute('data-tab') || 'orders';
          renderMainView();
          break;
        }
        case 'customer-logout': {
          AppState.currentCustomer = null;
          localStorage.removeItem(STORAGE_KEY_CUSTOMER_SESSION);
          updateHeaderCounters();
          renderMainView();
          showToast('Você saiu da sua conta.');
          break;
        }
        case 'go-policies': {
          const tab = target.getAttribute('data-tab') || 'privacy';
          navigateTo('policies', { policyTab: tab });
          break;
        }
        case 'open-mobile-menu': {
          const dr = document.getElementById('mobile-menu-backdrop');
          if (dr) dr.classList.add('open');
          break;
        }
        case 'close-mobile-menu': {
          closeMobileMenu();
          break;
        }
        case 'toggle-a11y-modal': {
          const m = document.getElementById('a11y-modal-backdrop');
          if (m) m.classList.toggle('open');
          break;
        }
      }
    });

    // Formulário de SAC na Home
    document.addEventListener('submit', (e) => {
      if (e.target && e.target.id === 'sac-contact-form') {
        e.preventDefault();
        const fd = new FormData(e.target);
        AppState.db.contactMessages.unshift({
          id: 'sac-' + Date.now(),
          name: fd.get('name'),
          email: fd.get('email'),
          subject: fd.get('subject'),
          message: fd.get('message'),
          status: 'Pendente',
          createdAt: new Date().toISOString()
        });
        saveDatabase('Nova mensagem recebida no SAC: ' + fd.get('subject'));
        e.target.reset();
        showToast('Sua mensagem foi registrada e enviada ao atendimento da By Angély!', 'success');
      }
    });

    // Fechar modais com tecla Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.getElementById('product-detail-modal')?.classList.remove('open');
        document.getElementById('lightbox-overlay')?.classList.remove('open');
        document.getElementById('a11y-modal-backdrop')?.classList.remove('open');
        closeCartDrawer();
        closeMobileMenu();
      }
    });
  }

  function closeMobileMenu() {
    const dr = document.getElementById('mobile-menu-backdrop');
    if (dr) dr.classList.remove('open');
  }

  // =========================================================================
  // ACESSIBILIDADE, CURSOR EDITORIAL DISCRETO E COOKIES (ANPD / LGPD)
  // =========================================================================
  function applyA11ySettings() {
    document.body.classList.toggle('reduce-motion', !!AppState.a11y.reduceMotion);
    document.body.classList.toggle('high-contrast', !!AppState.a11y.highContrast);
    document.body.classList.toggle('large-text', !!AppState.a11y.largeText);
    document.body.classList.toggle('disable-custom-cursor', !!AppState.a11y.disableCustomCursor);
    try {
      localStorage.setItem(STORAGE_KEY_A11Y, JSON.stringify(AppState.a11y));
    } catch (e) {}
  }

  function initAccessibilityControls() {
    applyA11ySettings();
    const bindToggle = (id, prop) => {
      const el = document.getElementById(id);
      if (el) {
        el.checked = !!AppState.a11y[prop];
        el.addEventListener('change', (e) => {
          AppState.a11y[prop] = e.target.checked;
          applyA11ySettings();
          showToast('Preferência de acessibilidade atualizada.');
        });
      }
    };
    bindToggle('a11y-reduce-motion', 'reduceMotion');
    bindToggle('a11y-high-contrast', 'highContrast');
    bindToggle('a11y-large-text', 'largeText');
    bindToggle('a11y-disable-cursor', 'disableCustomCursor');
  }

  function initCustomCursor() {
    const ring = document.getElementById('custom-cursor-ring');
    if (!ring) return;

    document.addEventListener('mousemove', (e) => {
      ring.style.left = e.clientX + 'px';
      ring.style.top = e.clientY + 'px';
      const target = e.target;
      const isControl = target && target.closest('input, textarea, select, button, a, label');
      const isMedia = target && target.closest('.product-card-media, .category-card');
      ring.classList.toggle('is-hidden-over-control', !!isControl);
      ring.classList.toggle('is-hovering-card', !!isMedia && !isControl);
    });
  }

  function initCookieBanner() {
    const banner = document.getElementById('cookie-consent-banner');
    if (!banner) return;
    const saved = localStorage.getItem(STORAGE_KEY_COOKIE_CONSENT);
    if (!saved) {
      banner.classList.add('visible');
    }
    document.getElementById('btn-cookies-essential')?.addEventListener('click', () => {
      localStorage.setItem(STORAGE_KEY_COOKIE_CONSENT, JSON.stringify({ essential: true, analytics: false, marketing: false, date: new Date().toISOString() }));
      banner.classList.remove('visible');
      showToast('Preferência salva: apenas cookies estritamente necessários ativos.');
    });
    document.getElementById('btn-cookies-all')?.addEventListener('click', () => {
      localStorage.setItem(STORAGE_KEY_COOKIE_CONSENT, JSON.stringify({ essential: true, analytics: true, marketing: true, date: new Date().toISOString() }));
      banner.classList.remove('visible');
      showToast('Preferências de cookies salvas.');
    });
  }

  // Exporta interface pública para o módulo Admin (`admin.js`)
  window.ByAngelyApp = {
    getState: () => AppState,
    saveDatabase,
    renderMainView,
    updateGlobalChrome,
    navigateTo,
    showToast,
    escapeHtml,
    formatBRL,
    formatDateBR,
    getTotalProductStock
  };

  // Inicialização geral ao carregar o DOM
  window.addEventListener('DOMContentLoaded', async () => {
    loadLocalClientState();
    await loadDatabase();
    setupGlobalEvents();
    initAccessibilityControls();
    initCustomCursor();
    initCookieBanner();
    updateGlobalChrome();
    renderMainView();

    // Se a URL contiver ?produto=ID (vindo de um link compartilhado ou WhatsApp), abre o produto automaticamente
    try {
      const params = new URLSearchParams(window.location.search);
      const prodParam = params.get('produto');
      if (prodParam) {
        openProductModal(prodParam);
      }
    } catch (e) {}
  });
})();
