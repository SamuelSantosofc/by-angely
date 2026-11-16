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
    selectedPaymentMethod: 'whatsapp',
    lastCreatedOrder: null,
    currentCustomer: null,
    currentAdmin: null,
    activeProductModal: {
      productId: null,
      selectedColor: null,
      selectedSize: null,
      quantity: 1,
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

  const CATEGORY_COVER_FALLBACKS = {
    vestidos: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=85',
    conjuntos: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=85',
    blusas: 'https://images.unsplash.com/photo-1551163943-3f6a855d1153?auto=format&fit=crop&w=900&q=85',
    'blusas-camisas': 'https://images.unsplash.com/photo-1551163943-3f6a855d1153?auto=format&fit=crop&w=900&q=85',
    calcas: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=85',
    saias: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=900&q=85',
    acessorios: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=85'
  };

  window.ByAngelyHandleMediaError = function (imgEl, fallbackLabel) {
    if (!imgEl || !imgEl.parentElement) return;
    const fb = imgEl.getAttribute('data-fallback-src');
    if (fb && !imgEl.dataset.fallbackTried && fb !== imgEl.src) {
      imgEl.dataset.fallbackTried = '1';
      imgEl.src = fb;
      return;
    }
    const label = fallbackLabel || 'BY ANGÉLY • Foto em atualização';
    const box = document.createElement('div');
    box.className = 'media-placeholder-box';
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', label);
    box.innerHTML =
      '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>' +
      '<circle cx="8.5" cy="8.5" r="1.5"></circle>' +
      '<polyline points="21 15 16 10 5 21"></polyline>' +
      '</svg>' +
      '<span>' + escapeHtml(label) + '</span>';
    if (imgEl.className) {
      box.style.width = imgEl.classList.contains('cart-item-thumb') ? '76px' : '100%';
      box.style.height = imgEl.classList.contains('cart-item-thumb') ? '96px' : '100%';
    }
    imgEl.replaceWith(box);
  };

  function normalizeCategorySlug(val) {
    if (!val) return '';
    const raw = String(val)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    if (raw.includes('blusa') || raw.includes('camisa')) return 'blusas';
    if (raw.includes('vestido')) return 'vestidos';
    if (raw.includes('conjunto')) return 'conjuntos';
    if (raw.includes('calca')) return 'calcas';
    if (raw.includes('saia')) return 'saias';
    if (raw.includes('acessorio') || raw.includes('bolsa') || raw.includes('cinto')) return 'acessorios';
    return raw.replace(/[^a-z0-9]+/g, '-');
  }

  function matchesCategory(product, filterSlug) {
    if (!filterSlug || filterSlug === 'all') return true;
    if (!product) return false;
    const targetNorm = normalizeCategorySlug(filterSlug);
    const prodSlugNorm = normalizeCategorySlug(product.category);
    const prodNameNorm = normalizeCategorySlug(product.categoryName);
    return (
      product.category === filterSlug ||
      prodSlugNorm === targetNorm ||
      prodNameNorm === targetNorm
    );
  }

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

  // Validação de tamanho e cor reais (impede exibição de "0" ou valores inválidos)
  function isValidClothingSize(sz) {
    if (sz === null || sz === undefined) return false;
    const s = String(sz).trim();
    if (!s) return false;
    const lower = s.toLowerCase();
    return !['0', '00', 'null', 'undefined', 'nan', '-', 'nenhum', 'n/a'].includes(lower);
  }

  function isValidColorName(clr) {
    if (clr === null || clr === undefined) return false;
    const s = String(clr).trim();
    if (!s) return false;
    const lower = s.toLowerCase();
    return !['0', '00', 'null', 'undefined', 'nan', '-'].includes(lower);
  }

  // Ícones SVG Oficiais Proporcionais (Instagram, WhatsApp, E-mail — 18x18px)
  const OFFICIAL_ICONS = {
    instagram: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="width:18px;height:18px;flex-shrink:0;" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="width:18px;height:18px;flex-shrink:0;" aria-hidden="true"><path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.124.553 4.195 1.604 6.018L.099 23.541l5.631-1.477a11.986 11.986 0 006.301 1.787h.005c6.645 0 12.03-5.385 12.03-12.031 0-3.214-1.252-6.236-3.524-8.508C18.268 1.039 15.245 0 12.031 0zm6.564 17.243c-.277.781-1.613 1.491-2.238 1.588-.578.088-1.309.125-2.115-.131-.491-.156-1.119-.366-1.922-.712-3.379-1.459-5.586-4.863-5.755-5.088-.168-.225-1.375-1.829-1.375-3.489 0-1.66 0.869-2.476 1.178-2.813.309-.338.675-.422.9-.422.225 0 .45.003.647.012.208.01.486-.079.76.579.281.675.956 2.334 1.041 2.503.084.169.141.366.028.591-.113.225-.169.366-.338.563-.169.197-.355.441-.506.591-.169.169-.345.352-.148.69.197.338.874 1.442 1.877 2.337 1.29 1.15 2.378 1.506 2.716 1.675.338.169.534.141.731-.084.197-.225.844-.984 1.069-1.322.225-.338.45-.281.759-.169.309.113 1.969.928 2.306 1.097.338.169.563.253.647.394.084.141.084.816-.193 1.597z"/></svg>',
    email: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="width:18px;height:18px;flex-shrink:0;" aria-hidden="true"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>'
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
   * Gera o link direto do WhatsApp na ficha do produto identificando:
   * Nome da loja BY ANGÉLY, Nome da peça, Código/SKU, Cor, Tamanho, Quantidade, Preço, Link e Pergunta sobre disponibilidade
   */
  function getProductWhatsappUrl(product, selectedSize, selectedColor, quantity) {
    if (!product) return getOfficialContacts().whatsappUrl;
    const priceStr = formatBRL(getEffectivePrice(product));
    const sizeInfo = selectedSize || (product.sizes && product.sizes[0]) || 'A definir';
    const colorInfo = selectedColor || (product.colors && product.colors[0] && product.colors[0].name) || 'A definir';
    const qtyInfo = Number(quantity) >= 1 ? String(quantity) : '1';
    let productUrl = 'https://by-angely.onrender.com/?produto=' + encodeURIComponent(product.id);
    if (typeof window !== 'undefined' && window.location && window.location.protocol && window.location.protocol.startsWith('http')) {
      productUrl = window.location.origin + window.location.pathname + '?produto=' + encodeURIComponent(product.id);
    }

    const messageLines = [
      'Olá! Vim pelo site da *BY ANGÉLY* e gostaria de falar sobre esta peça:',
      '',
      '• *Loja:* BY ANGÉLY',
      '• *Peça:* ' + product.name,
      '• *Código (SKU):* ' + (product.sku || product.id),
      '• *Cor selecionada:* ' + colorInfo,
      '• *Tamanho selecionado:* ' + sizeInfo,
      '• *Quantidade:* ' + qtyInfo,
      '• *Preço no site:* ' + priceStr,
      '• *Link da peça:* ' + productUrl,
      '',
      'Esta peça está disponível nesta cor e tamanho?'
    ];

    return 'https://wa.me/5528999871458?text=' + encodeURIComponent(messageLines.join('\n'));
  }

  /**
   * Gera a mensagem completa e estruturada para finalização de pedido pelo WhatsApp
   */
  function buildOrderWhatsappMessage(order) {
    if (!order) return '';
    const cust = order.customer || {};
    const ship = order.shipping || {};
    const addr = ship.address || {};
    const items = Array.isArray(order.items) ? order.items : [];
    const dateStr = formatDateBR(order.createdAt || new Date().toISOString());

    const lines = [
      '🛍️ *NOVO PEDIDO — BY ANGÉLY*',
      '━━━━━━━━━━━━━━━━━━━━',
      '• *Código do Pedido:* ' + (order.orderNumber || order.id),
      '• *Data e Horário:* ' + dateStr,
      '',
      '👤 *DADOS DA CLIENTE*',
      '• *Nome completo:* ' + (cust.name || 'Não informado'),
      '• *Telefone / WhatsApp:* ' + (cust.phone || 'Não informado')
    ];
    if (cust.email) {
      lines.push('• *E-mail:* ' + cust.email);
    }

    lines.push(
      '',
      '🚚 *FORMA DE RECEBIMENTO E ENDEREÇO*',
      '• *Forma de recebimento:* ' + (ship.methodName || 'A combinar'),
      '• *Cidade / UF:* ' + (addr.cityState || 'Itaperuna - RJ'),
      '• *Bairro:* ' + (addr.neighborhood || 'Não informado')
    );
    if (addr.street) {
      lines.push('• *Endereço:* ' + addr.street + (addr.number ? ', nº ' + addr.number : ''));
    }
    if (addr.zipCode) {
      lines.push('• *CEP:* ' + addr.zipCode);
    }

    lines.push('', '👗 *LISTA COMPLETA DOS PRODUTOS*');
    items.forEach((it, idx) => {
      const unitP = Number(it.unitPrice) || 0;
      const qty = Number(it.quantity) || 1;
      const subP = unitP * qty;
      lines.push(
        (idx + 1) + '. *' + it.name + '*' + (it.sku ? ' (' + it.sku + ')' : ''),
        '   - Tamanho: ' + (it.size || 'Único') + ' | Cor: ' + (it.color || 'Padrão'),
        '   - Quantidade: ' + qty + ' un.',
        '   - Preço unitário: ' + formatBRL(unitP),
        '   - Subtotal do produto: ' + formatBRL(subP)
      );
    });

    lines.push(
      '',
      '💰 *VALORES DO PEDIDO*',
      '• *Total dos produtos:* ' + formatBRL(order.subtotal != null ? order.subtotal : order.total)
    );
    if (order.discount && Number(order.discount) > 0) {
      lines.push('• *Desconto (' + (order.couponCode || 'Cupom') + '):* -' + formatBRL(order.discount));
    }
    if (ship.priceStatus === 'confirmed' && Number(ship.cost) > 0) {
      lines.push('• *Entrega / Frete:* ' + formatBRL(ship.cost));
    } else {
      lines.push('• *Entrega / Frete:* A confirmar no atendimento');
    }
    lines.push('• *TOTAL DO PEDIDO:* *' + formatBRL(order.total) + '*');

    const obs = order.customerNotes || order.customerPaymentNote || '';
    lines.push('• *Observações:* ' + (String(obs).trim() ? String(obs).trim() : 'Nenhuma observação adicional'));
    lines.push('', 'Aguardo a confirmação do pedido pela equipe da BY ANGÉLY. Obrigada!');

    return lines.join('\n');
  }

  function getOrderWhatsappUrl(order) {
    const msg = buildOrderWhatsappMessage(order);
    return 'https://wa.me/5528999871458?text=' + encodeURIComponent(msg);
  }

  /**
   * Verifica se uma forma de pagamento está devidamente configurada/validada para ser exibida como funcional
   */
  function isPaymentOptionConfigured(methodId, paySettings) {
    const pay = paySettings || (AppState.db && AppState.db.paymentSettings) || {};
    if (methodId === 'whatsapp') {
      return Boolean(pay.whatsapp);
    }
    if (methodId === 'pix') {
      if (!pay.pix) return false;
      const key = String(pay.pix.pixKey || '').trim();
      const rec = String(pay.pix.recipientName || 'BY ANGELY').trim();
      if (key.length < 1 || key.toLowerCase().includes('a confirmar') || rec.length < 1 || rec.toLowerCase().includes('a confirmar')) {
        return false;
      }
      return true;
    }
    if (methodId === 'creditCard' || methodId === 'credit_card') {
      if (!pay.creditCard) return false;
      const prov = String(pay.creditCard.providerName || pay.creditCard.provider || '').trim();
      const link = String(pay.creditCard.externalPaymentLink || '').trim();
      const pubKey = String(pay.creditCard.publicKey || '').trim();
      const hasRealLink = (link.startsWith('http://') || link.startsWith('https://')) && !link.includes('wa.me/');
      const hasApiCreds = Boolean(pay.creditCard.pspApiConfigured || pay.creditCard.hasSecretCredentials || pubKey.length >= 4);
      return Boolean(prov.length >= 2 && !prov.toLowerCase().includes('a confirmar') && (hasRealLink || hasApiCreds));
    }
    if (methodId === 'debitCard' || methodId === 'debit_card') {
      if (!pay.debitCard) return false;
      const prov = String(pay.debitCard.providerName || pay.debitCard.provider || '').trim();
      const link = String(pay.debitCard.externalPaymentLink || '').trim();
      const pubKey = String(pay.debitCard.publicKey || '').trim();
      const hasRealLink = (link.startsWith('http://') || link.startsWith('https://')) && !link.includes('wa.me/');
      const hasApiCreds = Boolean(pay.debitCard.pspApiConfigured || pay.debitCard.hasSecretCredentials || pubKey.length >= 4);
      return Boolean(prov.length >= 2 && !prov.toLowerCase().includes('a confirmar') && (hasRealLink || hasApiCreds));
    }
    if (methodId === 'payOnPickup' || methodId === 'pay_on_pickup') {
      return Boolean(pay.payOnPickup);
    }
    return false;
  }

  /**
   * Retorna diagnóstico detalhado do estado de configuração e validação de cada forma de pagamento para o Painel Admin
   */
  function getPaymentIntegrationStatus(methodId, paySettings, storeSettings) {
    const pay = paySettings || (AppState.db && AppState.db.paymentSettings) || {};
    const st = storeSettings || (AppState.db && AppState.db.storeSettings) || {};

    if (methodId === 'whatsapp') {
      return {
        stateCode: 'validated',
        badgeClass: 'confirmed',
        label: 'Integração validada (+55 28 99987-1458)',
        detail: 'Canal oficial conectado e mensagem automática validada.'
      };
    }

    if (methodId === 'pix') {
      if (!pay.pix) {
        return { stateCode: 'pending', badgeClass: 'pending', label: 'Aguardando configuração', detail: 'Informe a chave Pix da loja.' };
      }
      const key = String(pay.pix.pixKey || '').trim();
      const rec = String(pay.pix.recipientName || 'BY ANGELY').trim();
      const kType = String(pay.pix.keyType || 'telefone').toLowerCase();
      if (!key || key.toLowerCase().includes('a confirmar') || !rec || rec.toLowerCase().includes('a confirmar')) {
        return { stateCode: 'pending', badgeClass: 'pending', label: 'Aguardando configuração', detail: 'Preencha a chave Pix ou número e o nome do recebedor.' };
      }
      if (pay.pix.pspWebhookConfigured) {
        return {
          stateCode: 'validated',
          badgeClass: 'confirmed',
          label: 'Integração validada',
          detail: 'Chave Pix (' + key + ') • QR Code EMV + Webhook automático ativo.'
        };
      }
      return {
        stateCode: 'configured',
        badgeClass: 'info',
        label: 'Configurado (' + kType.toUpperCase() + ')',
        detail: 'Chave Pix (' + key + ') pronta para recebimento.'
      };
    }

    if (methodId === 'creditCard' || methodId === 'debitCard') {
      const cardObj = pay[methodId] || {};
      const prov = String(cardObj.providerName || cardObj.provider || '').trim();
      const link = String(cardObj.externalPaymentLink || '').trim();
      const hasRealLink = (link.startsWith('http://') || link.startsWith('https://')) && !link.includes('wa.me/');
      const hasSecret = Boolean(cardObj.hasSecretCredentials || cardObj.hasBackendSecretConfigured || cardObj.pspApiConfigured);
      if (hasSecret && prov.length >= 2) {
        return {
          stateCode: 'validated',
          badgeClass: 'confirmed',
          label: 'Integração validada',
          detail: `Credencial privada armazenada no servidor (${prov}).`
        };
      }
      if (hasRealLink && prov.length >= 2) {
        return {
          stateCode: 'configured',
          badgeClass: 'info',
          label: 'Configurado (Link HTTPS externo)',
          detail: `Redirecionamento externo configurado para ${prov}.`
        };
      }
      return {
        stateCode: 'pending',
        badgeClass: 'pending',
        label: 'Aguardando configuração',
        detail: 'Informe a URL HTTPS real do provedor ou token secreto da API antes de ativar.'
      };
    }

    if (methodId === 'payOnPickup') {
      const addrPending = !st.addressLine || String(st.addressLine).toLowerCase().includes('a confirmar');
      if (addrPending) {
        return {
          stateCode: 'pending',
          badgeClass: 'pending',
          label: 'Aguardando configuração de endereço',
          detail: 'Confirme o endereço completo de retirada em Itaperuna na aba Dados da Loja.'
        };
      }
      return {
        stateCode: 'configured',
        badgeClass: 'confirmed',
        label: 'Configurado',
        detail: 'Endereço presencial em Itaperuna confirmado.'
      };
    }

    return { stateCode: 'pending', badgeClass: 'pending', label: 'Aguardando configuração', detail: '' };
  }

  /**
   * Retorna somente as formas de pagamento que estão ATIVADAS pela proprietária e CONFIGURADAS/VALIDADAS
   */
  function getAvailableCheckoutPaymentOptions(paySettings) {
    const pay = paySettings || (AppState.db && AppState.db.paymentSettings) || {};
    const options = [];
    if (pay.whatsapp && pay.whatsapp.enabled && isPaymentOptionConfigured('whatsapp', pay)) {
      options.push({
        id: 'whatsapp',
        label: pay.whatsapp.title || 'Atendimento e Finalização pelo WhatsApp'
      });
    }
    if (pay.pix && pay.pix.enabled && isPaymentOptionConfigured('pix', pay)) {
      options.push({
        id: 'pix',
        label: 'Pix pelo Site (QR Code EMV e Copia e Cola)'
      });
    }
    if (pay.creditCard && pay.creditCard.enabled && isPaymentOptionConfigured('creditCard', pay)) {
      options.push({
        id: 'creditCard',
        label: 'Cartão de Crédito pelo Site (Ambiente Seguro)'
      });
    }
    if (pay.debitCard && pay.debitCard.enabled && isPaymentOptionConfigured('debitCard', pay)) {
      options.push({
        id: 'debitCard',
        label: 'Cartão de Débito pelo Site (Ambiente Seguro)'
      });
    }
    if (pay.payOnPickup && pay.payOnPickup.enabled && isPaymentOptionConfigured('payOnPickup', pay)) {
      options.push({
        id: 'payOnPickup',
        label: pay.payOnPickup.title || 'Pagamento na Retirada (Itaperuna - RJ)'
      });
    }
    return options;
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
    if (type === 'success') item.style.borderLeftColor = '#111111';
    if (type === 'warning') item.style.borderLeftColor = '#52525B';
    if (type === 'danger') item.style.borderLeftColor = '#18181B';
    item.setAttribute('role', 'status');
    item.setAttribute('aria-live', 'polite');
    item.textContent = message;
    container.appendChild(item);
    setTimeout(() => {
      if (item.parentNode) item.parentNode.removeChild(item);
    }, 4200);
  }

  // =========================================================================
  // NORMALIZAÇÃO E REPARO AUTOMÁTICO DO BANCO DE DADOS
  // =========================================================================
  function normalizeAndRepairDatabase(rawDb) {
    const seed = window.ByAngelySeed ? window.ByAngelySeed.createInitialDatabase() : {};
    const db = rawDb && typeof rawDb === 'object' ? rawDb : seed;

    db.storeSettings = { ...(seed.storeSettings || {}), ...(db.storeSettings || {}) };
    db.storeSettings.heroBanner = {
      ...((seed.storeSettings && seed.storeSettings.heroBanner) || {}),
      ...((db.storeSettings && db.storeSettings.heroBanner) || {})
    };
    db.storeSettings.brandStory = {
      ...((seed.storeSettings && seed.storeSettings.brandStory) || {}),
      ...((db.storeSettings && db.storeSettings.brandStory) || {})
    };

    // Limpa produtos e garante fotos válidas, preços reais e prioridade para peças publicadas pela proprietária
    const seedProducts = seed.products || [];
    const needsCatalogV3Repair = !db.catalogDataRepairV3;
    if (!Array.isArray(db.products) || db.products.length === 0) {
      db.products = JSON.parse(JSON.stringify(seedProducts));
    }

    // Remove eventual duplicata corrompida com preço R$ 0,00 se já existir a peça correspondente no catálogo
    const seenSkus = new Set();
    db.products = db.products.filter((p) => {
      if (!p) return false;
      const cleanName = String(p.name || '').replace(/\s*\(Demonstração\)\s*/gi, '').trim().toLowerCase();
      if (Number(p.price) <= 0 && String(p.sku) === '2023' && db.products.some((other) => other !== p && String(other.name || '').toLowerCase().includes(cleanName))) {
        return false;
      }
      if (p.sku && seenSkus.has(p.sku)) return false;
      if (p.sku) seenSkus.add(p.sku);
      return true;
    });

    db.products = db.products.map((p) => {
      const cleanName = String(p.name || 'Peça By Angély').replace(/\s*\(Demonstração\)\s*/gi, '').trim();
      const seedMatch = seedProducts.find(
        (sp) =>
          sp.id === p.id ||
          sp.sku === p.sku ||
          String(sp.name || '').toLowerCase() === cleanName.toLowerCase()
      );
      const normCat = normalizeCategorySlug(p.category || (seedMatch && seedMatch.category) || p.categoryName || 'vestidos');
      const fallbackImg = CATEGORY_COVER_FALLBACKS[normCat] || CATEGORY_COVER_FALLBACKS.vestidos;

      // Se o produto estava corrompido (preço <= 0 ou peça demo pausada sem estoque de versão antiga), restaura dados íntegros do Seed
      const hadZeroPrice = !(Number(p.price) > 0);
      const hadZeroStock = getTotalProductStock(p) <= 0;
      const shouldRestoreFromSeed = seedMatch && (hadZeroPrice || (needsCatalogV3 && p.isDemo && (hadZeroStock || p.status === 'paused')) || (p.isDemo && hadZeroPrice));

      function needsCatalogV3() {
        return needsCatalogV3Repair;
      }

      const validPrice = Number(p.price) > 0 ? Number(p.price) : (seedMatch ? seedMatch.price : 299.90);
      const validPromoPrice = p.promoPrice && Number(p.promoPrice) > 0
        ? Number(p.promoPrice)
        : (shouldRestoreFromSeed && seedMatch ? seedMatch.promoPrice : null);
      const validIsPromo = typeof p.isPromo === 'boolean' && !hadZeroPrice
        ? p.isPromo
        : (seedMatch ? Boolean(seedMatch.isPromo) : Boolean(validPromoPrice));
      const validStatus = (needsCatalogV3Repair && p.isDemo && hadZeroPrice)
        ? 'published'
        : (p.status || 'published');
      const cleanedSizes = Array.isArray(p.sizes) ? p.sizes.filter(isValidClothingSize) : [];
      const validSizes = cleanedSizes.length > 0
        ? cleanedSizes
        : (seedMatch && seedMatch.sizes ? [...seedMatch.sizes] : ['P', 'M', 'G']);
      const validColors = Array.isArray(p.colors) && p.colors.length > 0
        ? p.colors
        : (seedMatch && seedMatch.colors ? JSON.parse(JSON.stringify(seedMatch.colors)) : [{ name: 'Padrão', hex: '#806044' }]);
      const hasInvalidVariationSize = Array.isArray(p.variations) && p.variations.some((v) => !isValidClothingSize(v && v.size));
      const validVariations = Array.isArray(p.variations) && p.variations.length > 0 && getTotalProductStock(p) > 0 && !hasInvalidVariationSize
        ? p.variations
        : (seedMatch && seedMatch.variations
            ? JSON.parse(JSON.stringify(seedMatch.variations))
            : p.variations && p.variations.length > 0
              ? p.variations.map((v) => ({
                  ...v,
                  size: isValidClothingSize(v.size) ? v.size : (validSizes[0] || 'M'),
                  color: isValidColorName(v.color) ? v.color : (validColors[0] ? validColors[0].name : 'Padrão')
                }))
              : [{ size: validSizes[0] || 'M', color: validColors[0] ? validColors[0].name : 'Padrão', stock: 4 }]);

      const rawMedia = Array.isArray(p.media) && p.media.length > 0
        ? p.media
        : (seedMatch && seedMatch.media ? seedMatch.media : [{ type: 'image', url: fallbackImg, alt: cleanName }]);
      const media = rawMedia.map((m) => ({
        ...m,
        url: m.url || fallbackImg,
        alt: String(m.alt || cleanName).replace(/\s*—\s*Imagem Ilustrativa/gi, '').trim()
      }));
      const salesCount = p.isDemo ? 0 : (Number(p.salesCount) || 0);

      return {
        ...(seedMatch || {}),
        ...p,
        name: cleanName,
        category: normCat,
        price: validPrice,
        promoPrice: validPromoPrice,
        isPromo: validIsPromo,
        status: validStatus,
        sizes: validSizes,
        colors: validColors,
        variations: validVariations,
        media,
        salesCount
      };
    });
    db.catalogDataRepairV3 = true;

    // Ordena de modo que produtos reais (isDemo === false) fiquem sempre no topo antes dos demonstrativos
    db.products.sort((a, b) => {
      const aReal = !a.isDemo ? 1 : 0;
      const bReal = !b.isDemo ? 1 : 0;
      if (aReal !== bReal) return bReal - aReal;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    // Repara categorias garantindo que todas tenham imageUrl válida e nome padronizado
    const seedCats = seed.categories || [];
    if (!Array.isArray(db.categories) || db.categories.length === 0) {
      db.categories = JSON.parse(JSON.stringify(seedCats));
    }
    db.categories = db.categories.map((cat, idx) => {
      const normSlug = normalizeCategorySlug(cat.slug || cat.name);
      const seedMatch = seedCats.find((sc) => normalizeCategorySlug(sc.slug) === normSlug);
      // Procura se há produto real publicado nesta categoria para usar como foto de capa se a categoria não tiver foto própria
      const realProductInCat = db.products.find(
        (p) => !p.isDemo && p.status === 'published' && matchesCategory(p, normSlug) && p.media && p.media[0] && p.media[0].url
      );
      const validImageUrl =
        (cat.imageUrl && String(cat.imageUrl).trim().length > 8 ? cat.imageUrl : '') ||
        (realProductInCat ? realProductInCat.media[0].url : '') ||
        (seedMatch ? seedMatch.imageUrl : '') ||
        CATEGORY_COVER_FALLBACKS[normSlug] ||
        CATEGORY_COVER_FALLBACKS.vestidos;

      const cleanName = normSlug === 'blusas' ? 'Blusas & Camisas' : (cat.name || (seedMatch ? seedMatch.name : 'Categoria'));
      return {
        ...cat,
        id: cat.id || (seedMatch ? seedMatch.id : 'cat-' + (idx + 1)),
        slug: normSlug === 'blusas' ? 'blusas' : (cat.slug || normSlug),
        name: cleanName,
        description: cat.description || (seedMatch ? seedMatch.description : ''),
        imageUrl: validImageUrl,
        imageAlt: `Categoria ${cleanName} — By Angély`,
        order: cat.order || idx + 1
      };
    });

    // Remove registros fictícios ("dados fake") de pedidos, clientes e avaliações
    db.orders = (db.orders || []).filter(
      (o) =>
        o &&
        o.id !== 'ord-demo-1001' &&
        o.orderNumber !== 'BYA-2026-1042' &&
        !(o.customer && String(o.customer.name || '').includes('Pedido de Exemplo'))
    );
    db.customers = (db.customers || []).filter(
      (c) => c && c.id !== 'cust-demo-1' && c.email !== 'cliente.exemplo@email.local'
    );
    db.reviews = (db.reviews || []).filter(
      (r) => r && !r.isDemo && r.id !== 'rev-1' && r.id !== 'rev-2'
    );

    // Garante conta oficial da proprietária e remove contas demonstrativas duplicadas
    db.adminUsers = (db.adminUsers || []).filter(
      (u) => u && u.email !== 'equipe@byangely.local' && u.email !== 'proprietaria@byangely.local'
    );
    if (!db.adminUsers.some((u) => u.email && u.email.toLowerCase() === 'byangely1@gmail.com')) {
      db.adminUsers.unshift({
        id: 'admin-owner-official',
        name: 'Proprietária BY ANGÉLY',
        email: 'byangely1@gmail.com',
        role: 'owner',
        roleLabel: 'Proprietária (Acesso Total)',
        permissions: ['products', 'categories', 'orders', 'customers', 'payments', 'shipping', 'branding', 'policies', 'users'],
        active: true
      });
    }

    // Normaliza cupons (corrige BEMVINDO10 e ITAPERUNA5 quando salvos como valor fixo ou sem regras completas)
    if (!Array.isArray(db.coupons) || db.coupons.length === 0) {
      db.coupons = JSON.parse(JSON.stringify(seed.coupons || []));
    } else {
      db.coupons = db.coupons.map((cp) => {
        const codeUpper = String(cp.code || '').trim().toUpperCase();
        let type = cp.type || 'percent';
        let value = Number(cp.value) || 10;
        let minOrderAmount = Number(cp.minOrderAmount) || 0;
        let description = cp.description || '';
        if ((codeUpper === 'BEMVINDO10' || codeUpper === 'BEMVINDA10') && (needsCatalogV3Repair || (type === 'fixed' && value === 10))) {
          type = 'percent';
          value = 10;
          minOrderAmount = minOrderAmount > 0 ? minOrderAmount : 150;
          description = '10% de desconto na primeira compra acima de R$ 150,00';
        }
        if (codeUpper === 'ITAPERUNA5' && (needsCatalogV3Repair || (type === 'fixed' && value === 5))) {
          type = 'percent';
          value = 5;
          minOrderAmount = minOrderAmount > 0 ? minOrderAmount : 200;
          description = '5% de desconto especial para clientes de Itaperuna acima de R$ 200,00';
        }
        return {
          ...cp,
          code: codeUpper,
          type,
          value,
          minOrderAmount,
          description,
          startDate: cp.startDate || '2026-01-01',
          endDate: cp.endDate || '2026-12-31',
          usageLimit: Number(cp.usageLimit) || 100,
          usedCount: Number(cp.usedCount) || 0,
          applyToPromo: cp.applyToPromo !== false
        };
      });
    }

    // Normaliza configurações de venda e pagamento preservando 100% as escolhas salvas pela proprietária
    const seedPay = seed.paymentSettings || {};
    const rawPay = db.paymentSettings || {};

    const rawPixKey = (rawPay.pix && rawPay.pix.pixKey && !String(rawPay.pix.pixKey).toLowerCase().includes('a confirmar'))
      ? String(rawPay.pix.pixKey).trim()
      : '+5528999871458';
    const normalizedPixKeyType = (rawPay.pix && rawPay.pix.keyType && String(rawPay.pix.keyType).trim())
      ? String(rawPay.pix.keyType).trim().toLowerCase()
      : 'telefone';

    const rawCreditLink = (rawPay.creditCard && rawPay.creditCard.externalPaymentLink) || '';
    const rawDebitLink = (rawPay.debitCard && rawPay.debitCard.externalPaymentLink) || '';

    db.paymentSettings = {
      paymentConfigVersion: 4,
      whatsapp: {
        ...(seedPay.whatsapp || {}),
        ...(rawPay.whatsapp || {}),
        enabled: rawPay.whatsapp && typeof rawPay.whatsapp.enabled === 'boolean'
          ? rawPay.whatsapp.enabled
          : true
      },
      pix: {
        ...(seedPay.pix || {}),
        ...(rawPay.pix || {}),
        keyType: normalizedPixKeyType,
        pixKey: rawPixKey,
        recipientName: (rawPay.pix && rawPay.pix.recipientName && !String(rawPay.pix.recipientName).toLowerCase().includes('a confirmar'))
          ? String(rawPay.pix.recipientName).trim()
          : 'BY ANGELY',
        recipientCity: (rawPay.pix && rawPay.pix.recipientCity) ? String(rawPay.pix.recipientCity).trim() : 'ITAPERUNA',
        txidPrefix: (rawPay.pix && rawPay.pix.txidPrefix) ? String(rawPay.pix.txidPrefix).trim() : 'BYANGELY',
        enabled: rawPay.pix && typeof rawPay.pix.enabled === 'boolean'
          ? rawPay.pix.enabled
          : true
      },
      creditCard: {
        ...(seedPay.creditCard || {}),
        ...(rawPay.creditCard || {}),
        providerName: (rawPay.creditCard && rawPay.creditCard.providerName && !String(rawPay.creditCard.providerName).toLowerCase().includes('a confirmar'))
          ? rawPay.creditCard.providerName
          : '',
        externalPaymentLink: rawCreditLink === 'https://wa.me/5528999871458' ? '' : rawCreditLink,
        enabled: rawPay.creditCard && typeof rawPay.creditCard.enabled === 'boolean'
          ? rawPay.creditCard.enabled
          : false
      },
      debitCard: {
        ...(seedPay.debitCard || {}),
        ...(rawPay.debitCard || {}),
        providerName: (rawPay.debitCard && rawPay.debitCard.providerName && !String(rawPay.debitCard.providerName).toLowerCase().includes('a confirmar'))
          ? rawPay.debitCard.providerName
          : '',
        externalPaymentLink: rawDebitLink === 'https://wa.me/5528999871458' ? '' : rawDebitLink,
        enabled: rawPay.debitCard && typeof rawPay.debitCard.enabled === 'boolean'
          ? rawPay.debitCard.enabled
          : false
      },
      payOnPickup: {
        ...(seedPay.payOnPickup || {}),
        ...(rawPay.payOnPickup || {}),
        enabled: rawPay.payOnPickup && typeof rawPay.payOnPickup.enabled === 'boolean'
          ? rawPay.payOnPickup.enabled
          : false
      }
    };

    return db;
  }

  // =========================================================================
  // PERSISTÊNCIA E SINCRONIZAÇÃO (SUPABASE + RENDER BACKEND + LOCALSTORAGE)
  // =========================================================================
  function getAdminRequestHeaders() {
    const headers = {};
    if (AppState.currentAdmin) {
      headers['X-Admin-Role'] = AppState.currentAdmin.role || 'Proprietária';
      headers['X-Admin-Email'] = AppState.currentAdmin.email || '';
      if (AppState.currentAdmin.token) {
        headers['X-Admin-Token'] = AppState.currentAdmin.token;
        headers['Authorization'] = 'Bearer ' + AppState.currentAdmin.token;
      }
    }
    return headers;
  }

  async function loadDatabase() {
    const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';
    let supaState = null;
    let serverState = null;
    let localState = null;

    try {
      const saved = localStorage.getItem(STORAGE_KEY_DB);
      if (saved) localState = JSON.parse(saved);
    } catch (e) {}

    const stateReqHeaders = { ...getAdminRequestHeaders() };
    if (!stateReqHeaders['Authorization'] && AppState.currentCustomer && AppState.currentCustomer.token) {
      stateReqHeaders['Authorization'] = 'Bearer ' + AppState.currentCustomer.token;
    }

    // Busca da API oficial do servidor e mantém fallback para Supabase somente se o servidor não responder
    const tasks = [];
    tasks.push(
      fetch(apiBase + '/api/state', {
        cache: 'no-store',
        headers: stateReqHeaders
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((st) => { serverState = st; })
        .catch(() => {})
    );
    if (apiBase && window.ByAngelyCloud && window.ByAngelyCloud.fetchStateFromSupabase) {
      tasks.push(
        window.ByAngelyCloud.fetchStateFromSupabase()
          .then((st) => { supaState = st; })
          .catch(() => {})
      );
    }

    await Promise.allSettled(tasks);

    // Determina a melhor base combinando produtos reais cadastrados pela proprietária
    const candidates = [serverState, supaState, localState].filter((c) => c && c.storeSettings);
    let chosen = null;
    if (candidates.length > 0) {
      candidates.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      chosen = candidates[0];

      // Se o servidor possui paymentSettings versão >= 4 mais recente ou atualizada, preserva-o contra cache antigo
      if (serverState && serverState.paymentSettings && Number(serverState.paymentSettings.paymentConfigVersion) >= 4) {
        const chosenPayVer = chosen.paymentSettings ? Number(chosen.paymentSettings.paymentConfigVersion || 0) : 0;
        const serverTs = new Date(serverState.updatedAt || 0).getTime();
        const chosenTs = new Date(chosen.updatedAt || 0).getTime();
        if (chosenPayVer < 4 || serverTs >= chosenTs - 5000) {
          chosen.paymentSettings = serverState.paymentSettings;
        }
      }
      if (serverState && Array.isArray(serverState.orders)) {
        chosen.orders = serverState.orders;
      }
      if (serverState && Array.isArray(serverState.customers)) {
        chosen.customers = serverState.customers;
      }
      if (serverState && Array.isArray(serverState.auditLog) && serverState.auditLog.length > 0) {
        chosen.auditLog = serverState.auditLog;
      }

      // Preserva produtos reais (isDemo === false) que estejam em qualquer uma das fontes
      const allRealProductsMap = new Map();
      candidates.forEach((cand) => {
        (cand.products || []).forEach((p) => {
          if (p && !p.isDemo && p.id) {
            allRealProductsMap.set(p.id, p);
          }
        });
      });
      if (allRealProductsMap.size > 0) {
        const existingIds = new Set((chosen.products || []).map((p) => p.id));
        allRealProductsMap.forEach((realProd, id) => {
          if (!existingIds.has(id)) {
            chosen.products = [realProd, ...(chosen.products || [])];
          }
        });
      }
    } else {
      chosen = window.ByAngelySeed.createInitialDatabase();
    }

    const hadMissingCatImages =
      supaState &&
      Array.isArray(supaState.categories) &&
      supaState.categories.some((c) => !c.imageUrl || String(c.imageUrl).trim().length < 8);
    const hadFakeOrders =
      supaState &&
      Array.isArray(supaState.orders) &&
      supaState.orders.some((o) => o.id === 'ord-demo-1001' || o.orderNumber === 'BYA-2026-1042');

    AppState.db = normalizeAndRepairDatabase(chosen);

    try {
      localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(AppState.db));
    } catch (e) {}

    if (hadMissingCatImages || hadFakeOrders || !supaState) {
      saveDatabase();
    }
  }

  async function saveDatabase(auditAction) {
    if (!AppState.db) return;
    AppState.db = normalizeAndRepairDatabase(AppState.db);

    if (auditAction) {
      AppState.db.auditLog = AppState.db.auditLog || [];
      AppState.db.auditLog.unshift({
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString(),
        actor: AppState.currentAdmin ? AppState.currentAdmin.name : 'Sistema/Cliente',
        actorRole: AppState.currentAdmin ? (AppState.currentAdmin.role || 'Administrador') : 'Cliente',
        action: auditAction
      });
      if (AppState.db.auditLog.length > 250) {
        AppState.db.auditLog = AppState.db.auditLog.slice(0, 250);
      }
    }
    AppState.db.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(AppState.db));
    } catch (e) {
      console.warn('Aviso: limite de armazenamento local atingido.', e);
    }

    const syncPromises = [];
    const isAuthAdminSession = Boolean(AppState.currentAdmin && AppState.currentAdmin.token);
    if (isAuthAdminSession) {
      if (window.ByAngelyCloud && window.ByAngelyCloud.saveStateToSupabase) {
        syncPromises.push(window.ByAngelyCloud.saveStateToSupabase(AppState.db).catch(() => {}));
      }
      const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';
      syncPromises.push(
        fetch(apiBase + '/api/state', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAdminRequestHeaders()
          },
          body: JSON.stringify(AppState.db)
        }).catch(() => {})
      );
    }

    await Promise.allSettled(syncPromises);
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
    const isAdminLogged = Boolean(AppState.currentAdmin);

    // Barra de anúncio superior
    const announcementTextEl = document.getElementById('announcement-text');
    if (announcementTextEl) {
      const rawBar = settings.announcementBar || 'BY ANGÉLY • Moda Feminina Contemporânea • Itaperuna, RJ';
      announcementTextEl.textContent = isAdminLogged
        ? rawBar
        : 'BY ANGÉLY • Moda Feminina Contemporânea • Itaperuna, RJ';
    }

    // Controles exclusivos do Admin no topo, menu e rodapé
    const adminTopControls = document.getElementById('admin-top-bar-controls');
    if (adminTopControls) {
      adminTopControls.style.display = isAdminLogged ? 'inline-flex' : 'none';
    }
    document.querySelectorAll('.admin-only-element').forEach((el) => {
      el.style.display = isAdminLogged ? '' : 'none';
    });

    // Banner de aviso de demonstração (visível apenas para Admin logado)
    const demoBannerEl = document.getElementById('demo-disclosure-banner');
    if (demoBannerEl) {
      const hasDemoProducts = AppState.db.products.some((p) => p.isDemo && p.status === 'published');
      demoBannerEl.style.display = (isAdminLogged && settings.showDemoBanner && hasDemoProducts) ? 'block' : 'none';
    }

    // Logotipo no Cabeçalho e no Rodapé
    const headerBrandEl = document.getElementById('header-brand-link');
    if (headerBrandEl) headerBrandEl.innerHTML = renderBrandMarkup(false);

    const footerBrandEl = document.getElementById('footer-brand-logo');
    if (footerBrandEl) footerBrandEl.innerHTML = renderBrandMarkup(true);

    // Strip de categorias no cabeçalho (Navegação rápida por categorias inteligentes)
    const stripEl = document.getElementById('header-category-strip');
    if (stripEl) {
      const cats = [...AppState.db.categories].sort((a, b) => (a.order || 0) - (b.order || 0));
      stripEl.innerHTML = `
        <button type="button" class="category-pill-link ${AppState.currentView === 'catalog' && AppState.filters.category === 'all' && AppState.filters.availability !== 'promo' ? 'active' : ''}" data-action="filter-category" data-category="all">
          Todas as Peças
        </button>
        ${cats.map((c) => `
          <button type="button" class="category-pill-link ${AppState.currentView === 'catalog' && matchesCategory({ category: AppState.filters.category }, c.slug) && AppState.filters.category !== 'all' ? 'active' : ''}" data-action="filter-category" data-category="${escapeHtml(c.slug)}">
            ${escapeHtml(c.name)}
          </button>
        `).join('')}
        <button type="button" class="category-pill-link ${AppState.currentView === 'catalog' && AppState.filters.availability === 'promo' ? 'active' : ''}" data-action="filter-promo" style="font-weight:700;">
          Promoções
        </button>
      `;
    }

    // Rodapé elegante: apenas botões para visitantes; dados detalhados visíveis apenas para Admin
    const footerStoreInfoEl = document.getElementById('footer-store-info');
    if (footerStoreInfoEl) {
      const contacts = getOfficialContacts();
      footerStoreInfoEl.innerHTML = `
        <p style="margin-bottom:6px;"><strong>${escapeHtml(contacts.storeName)} — ${escapeHtml(settings.brandSubtitle)}</strong></p>
        <p style="font-size:0.83rem;color:#A1A1AA;margin-bottom:10px;">${escapeHtml(settings.city)} - ${escapeHtml(settings.state)}, Brasil</p>
        ${isAdminLogged ? `
          <div style="padding:8px 10px;background:rgba(255,255,255,0.08);border-radius:6px;margin-bottom:10px;font-size:0.76rem;color:#D4D4D8;">
            <div><strong>[Visão Admin]</strong> WhatsApp: ${escapeHtml(contacts.whatsappDisplay)}</div>
            <div>Instagram: ${escapeHtml(contacts.instagramHandle)} | E-mail: ${escapeHtml(contacts.email)}</div>
          </div>
        ` : ''}
        <div class="footer-social-buttons" role="group" aria-label="Canais oficiais BY ANGÉLY">
          <a href="${escapeHtml(contacts.whatsappUrl)}" target="_blank" rel="noopener noreferrer" class="footer-social-pill" aria-label="Conversar pelo WhatsApp Oficial BY ANGÉLY">
            ${OFFICIAL_ICONS.whatsapp}
            <span>WhatsApp</span>
          </a>
          <a href="${escapeHtml(contacts.instagramUrl)}" target="_blank" rel="noopener noreferrer" class="footer-social-pill" aria-label="Abrir perfil oficial no Instagram">
            ${OFFICIAL_ICONS.instagram}
            <span>Instagram</span>
          </a>
          <a href="${escapeHtml(contacts.mailtoUrl)}" class="footer-social-pill" aria-label="Enviar e-mail comercial">
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
  // RENDERIZAÇÃO DE CARTÃO DE PRODUTO (VITRINE COMERCIAL 2 COLUNAS NO MOBILE)
  // =========================================================================
  function renderProductCard(product) {
    const effectivePrice = getEffectivePrice(product);
    const hasPromo = effectivePrice < Number(product.price);
    const discountPercent = hasPromo
      ? Math.round(((Number(product.price) - effectivePrice) / Number(product.price)) * 100)
      : 0;
    const totalStock = getTotalProductStock(product);
    const isFav = AppState.wishlist.includes(product.id);
    const normCat = normalizeCategorySlug(product.category || product.categoryName || 'vestidos');
    const fallbackUrl = CATEGORY_COVER_FALLBACKS[normCat] || CATEGORY_COVER_FALLBACKS.vestidos;
    const firstImage = (product.media && product.media.find((m) => m.type === 'image' && m.url && String(m.url).trim())) || (product.media && product.media.find((m) => m.url && String(m.url).trim())) || null;
    const hasRealImg = Boolean(firstImage && firstImage.url);
    const hasVideo = product.media && product.media.some((m) => m.type === 'video');
    const isAdminLogged = Boolean(AppState.currentAdmin);

    const stockStatusClass = totalStock <= 0 ? 'out-stock' : totalStock <= 3 ? 'low-stock' : 'in-stock';
    const stockStatusText = totalStock <= 0
      ? 'Esgotado'
      : totalStock <= 3
      ? `Últimas peças (${totalStock} un.)`
      : 'Em estoque';

    return `
      <article class="product-card" data-product-id="${escapeHtml(product.id)}">
        <div class="product-card-media" data-action="open-product" data-product-id="${escapeHtml(product.id)}" role="button" tabindex="0" aria-label="Ver detalhes de ${escapeHtml(product.name)}">
          <div class="product-badges">
            ${isAdminLogged && product.isDemo ? '<span class="badge-tag badge-demo" title="Visão Admin: Peça demonstrativa">Demo</span>' : ''}
            ${hasPromo ? `<span class="badge-tag badge-promo">-${discountPercent}%</span>` : ''}
            ${product.isNew && !hasPromo ? '<span class="badge-tag badge-new">Novidade</span>' : ''}
            ${hasVideo ? '<span class="badge-tag badge-video">Vídeo</span>' : ''}
          </div>
          <button type="button" class="wishlist-btn-card ${isFav ? 'active' : ''}" data-action="toggle-wishlist" data-product-id="${escapeHtml(product.id)}" aria-label="${isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}" title="Favoritar peça">
            ${isFav ? '♥' : '♡'}
          </button>
          ${hasRealImg
            ? `<img src="${escapeHtml(firstImage.url)}" alt="${escapeHtml(firstImage.alt || product.name)}" data-fallback-src="${escapeHtml(fallbackUrl)}" onerror="window.ByAngelyHandleMediaError && window.ByAngelyHandleMediaError(this)" />`
            : `<div class="media-placeholder-box" role="img" aria-label="${escapeHtml(product.name)}"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg><span>Foto indisponível</span></div>`}
        </div>
        <div class="product-card-body">
          <div class="product-card-meta">
            <span>${escapeHtml(product.categoryName || product.category)}</span>
            <span class="stock-availability-indicator ${stockStatusClass}">${escapeHtml(stockStatusText)}</span>
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
          <div class="product-card-actions">
            <button type="button" class="btn btn-primary btn-sm" data-action="card-add-to-cart" data-product-id="${escapeHtml(product.id)}" ${totalStock <= 0 ? 'disabled' : ''}>
              ${totalStock > 0 ? 'Adicionar à Sacola' : 'Esgotado'}
            </button>
            <button type="button" class="btn btn-outline btn-sm" data-action="open-product" data-product-id="${escapeHtml(product.id)}" aria-label="Ver detalhes de ${escapeHtml(product.name)}" title="Ver detalhes e medidas">
              Detalhes
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

    // Fecha modais e gavetas abertas ao navegar entre telas
    const pdpModal = document.getElementById('product-detail-modal');
    if (pdpModal) {
      pdpModal.classList.remove('open');
      pdpModal.setAttribute('aria-hidden', 'true');
    }
    closeCartDrawer();

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
  // 1. PÁGINA INICIAL (HOME) — VITRINE COMERCIAL PRIORIZANDO OS PRODUTOS
  // -------------------------------------------------------------------------
  function renderHomeView() {
    const settings = AppState.db.storeSettings;
    const hero = settings.heroBanner || {};
    const story = settings.brandStory || {};
    const publishedProducts = AppState.db.products.filter((p) => p.status === 'published');
    // Garante que produtos reais da proprietária e peças em destaque apareçam imediatamente
    const featuredProducts = [
      ...publishedProducts.filter((p) => !p.isDemo),
      ...publishedProducts.filter((p) => p.isDemo && p.isFeatured),
      ...publishedProducts.filter((p) => p.isDemo && !p.isFeatured)
    ].slice(0, 8);
    const newProducts = publishedProducts.filter((p) => p.isNew).slice(0, 4);
    const promoProducts = publishedProducts.filter((p) => p.isPromo).slice(0, 4);
    const bestSellerProducts = publishedProducts
      .filter((p) => (Number(p.salesCount) || 0) > 0)
      .sort((a, b) => (Number(b.salesCount) || 0) - (Number(a.salesCount) || 0))
      .slice(0, 4);
    const categories = [...AppState.db.categories].sort((a, b) => (a.order || 0) - (b.order || 0));

    return `
      <!-- Hero Editorial Compacto -->
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
            <img src="${escapeHtml(hero.imageUrl || CATEGORY_COVER_FALLBACKS.vestidos)}" alt="${escapeHtml(hero.imageAlt || 'Coleção By Angély')}" onerror="this.onerror=null;this.src='${escapeHtml(CATEGORY_COVER_FALLBACKS.vestidos)}';" />
            ${Boolean(AppState.currentAdmin) && hero.isDemoImage ? `
              <div class="media-credit-badge">
                <span>VISÃO ADMIN • IMAGEM DEMONSTRATIVA</span>
                <button type="button" data-action="go-policies" data-tab="references" style="color:#D4D4D8;text-decoration:underline;font-size:0.7rem;">Ver Licença</button>
              </div>
            ` : ''}
          </div>
        </div>
      </section>

      <!-- Vitrine Principal: Produtos em Destaque Visíveis Imediatamente -->
      <section class="section-block bg-surface" aria-labelledby="sec-feat-title">
        <div class="container">
          <div class="section-header">
            <div>
              <span class="section-eyebrow">Vitrine Oficial • By Angély</span>
              <h2 id="sec-feat-title" class="section-title">Peças em Destaque</h2>
              <p class="section-description">Toque em qualquer peça para ver detalhes, medidas, cores disponíveis ou adicionar diretamente à sacola.</p>
            </div>
            <button type="button" class="btn btn-outline btn-sm" data-action="go-catalog">Ver Catálogo (${publishedProducts.length})</button>
          </div>
          <div class="products-grid">
            ${featuredProducts.map(renderProductCard).join('')}
          </div>
        </div>
      </section>

      <!-- Categorias Inteligentes da Loja -->
      <section class="section-block" aria-labelledby="sec-cat-title">
        <div class="container">
          <div class="section-header">
            <div>
              <span class="section-eyebrow">Curadoria por Peça</span>
              <h2 id="sec-cat-title" class="section-title">Explore por Categoria</h2>
              <p class="section-description">Selecione uma categoria para visualizar imediatamente as peças disponíveis.</p>
            </div>
            <button type="button" class="btn btn-outline btn-sm" data-action="go-catalog">Ver Todas as Categorias</button>
          </div>
          <div class="categories-grid">
            ${categories.map((cat) => {
              const normSlug = normalizeCategorySlug(cat.slug || cat.name);
              const fbImg = CATEGORY_COVER_FALLBACKS[normSlug] || CATEGORY_COVER_FALLBACKS.vestidos;
              const imgUrl = (cat.imageUrl && String(cat.imageUrl).trim().length > 8) ? cat.imageUrl : fbImg;
              const countInCat = publishedProducts.filter((p) => matchesCategory(p, cat.slug)).length;
              return `
                <button type="button" class="category-card" data-action="filter-category" data-category="${escapeHtml(cat.slug)}" aria-label="Explorar categoria ${escapeHtml(cat.name)}">
                  <img src="${escapeHtml(imgUrl)}" alt="Categoria ${escapeHtml(cat.name)}" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(fbImg)}';" />
                  <div class="category-card-overlay">
                    <span class="category-card-title">${escapeHtml(cat.name)}</span>
                    <span class="category-card-sub">${countInCat > 0 ? countInCat + (countInCat === 1 ? ' peça →' : ' peças →') : 'Explorar peças →'}</span>
                  </div>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      </section>

      <!-- Novidades -->
      ${newProducts.length > 0 ? `
      <section class="section-block bg-surface" aria-labelledby="sec-new-title">
        <div class="container">
          <div class="section-header">
            <div>
              <span class="section-eyebrow">Recém-Chegados</span>
              <h2 id="sec-new-title" class="section-title">Novidades da Coleção</h2>
            </div>
            <button type="button" class="btn btn-outline btn-sm" data-action="go-catalog">Ver Todas as Novidades</button>
          </div>
          <div class="products-grid">
            ${newProducts.map(renderProductCard).join('')}
          </div>
        </div>
      </section>
      ` : ''}

      <!-- Ofertas Especiais / Promoções -->
      ${promoProducts.length > 0 ? `
      <section class="section-block" aria-labelledby="sec-promo-title">
        <div class="container">
          <div class="section-header">
            <div>
              <span class="section-eyebrow">Condições Especiais</span>
              <h2 id="sec-promo-title" class="section-title">Ofertas Especiais</h2>
              <p class="section-description">Peças selecionadas com desconto real e indicação transparente do valor anterior.</p>
            </div>
            <button type="button" class="btn btn-gold btn-sm" data-action="filter-promo">Ver Todas as Promoções</button>
          </div>
          <div class="products-grid">
            ${promoProducts.map(renderProductCard).join('')}
          </div>
        </div>
      </section>
      ` : ''}

      <!-- Mais Vendidos (Exibido apenas quando existem vendas reais registradas) -->
      ${bestSellerProducts.length > 0 ? `
      <section class="section-block bg-surface" aria-labelledby="sec-best-title">
        <div class="container">
          <div class="section-header">
            <div>
              <span class="section-eyebrow">Preferidas das Clientes</span>
              <h2 id="sec-best-title" class="section-title">Mais Vendidos</h2>
            </div>
            <button type="button" class="btn btn-outline btn-sm" data-action="go-catalog">Ver Catálogo</button>
          </div>
          <div class="products-grid">
            ${bestSellerProducts.map(renderProductCard).join('')}
          </div>
        </div>
      </section>
      ` : ''}

      <!-- Apresentação Institucional da Marca -->
      <section class="section-block" aria-labelledby="sec-story-title">
        <div class="container">
          <div class="hero-grid" style="min-height:auto;">
            <div class="hero-media-wrapper" style="aspect-ratio: 4 / 3.2;">
              <img src="${escapeHtml(story.imageUrl || CATEGORY_COVER_FALLBACKS.conjuntos)}" alt="Apresentação institucional By Angély" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(CATEGORY_COVER_FALLBACKS.conjuntos)}';" />
              ${Boolean(AppState.currentAdmin) && story.isDemoImage ? `
                <div class="media-credit-badge">
                  <span>VISÃO ADMIN • SUBSTITUÍVEL NO PAINEL</span>
                </div>
              ` : ''}
            </div>
            <div class="hero-content">
              <span class="section-eyebrow">Sobre a Marca • Itaperuna, RJ</span>
              <h2 id="sec-story-title" class="section-title" style="margin-bottom:16px;">${escapeHtml(story.title)}</h2>
              <p style="font-size:1.04rem;font-weight:500;color:var(--text-primary);margin-bottom:14px;">
                ${escapeHtml(story.lead)}
              </p>
              <p style="color:var(--text-secondary);margin-bottom:24px;">
                ${escapeHtml(story.body)}
              </p>
              <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
                <a href="${escapeHtml(getOfficialContacts().instagramUrl)}" target="_blank" rel="noopener noreferrer" class="contact-btn-action instagram-style">
                  ${OFFICIAL_ICONS.instagram}
                  <span>Seguir no Instagram</span>
                </a>
                <a href="${escapeHtml(getOfficialContacts().whatsappUrl)}" target="_blank" rel="noopener noreferrer" class="contact-btn-action whatsapp-style">
                  ${OFFICIAL_ICONS.whatsapp}
                  <span>Conversar no WhatsApp</span>
                </a>
              </div>
              <div style="display:flex;gap:12px;flex-wrap:wrap;">
                ${Boolean(AppState.currentAdmin) ? `
                  <button type="button" class="btn btn-primary btn-sm" data-action="go-view" data-view="admin">Painel da Proprietária</button>
                ` : ''}
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
    const isAdminLogged = Boolean(AppState.currentAdmin);
    return `
      <!-- Canais Oficiais de Contato, Redes Sociais e Atendimento ao Cliente (SAC) -->
      <section class="section-block bg-surface" id="contact-section" aria-labelledby="sec-contact-title">
        <div class="container">
          <div class="section-header" style="margin-bottom:28px;">
            <div>
              <span class="section-eyebrow">Canais Oficiais • ${escapeHtml(contacts.storeName)}</span>
              <h2 id="sec-contact-title" class="section-title">Atendimento ao Cliente &amp; Redes Sociais</h2>
              <p class="section-description">
                Converse diretamente com a equipe da <strong>${escapeHtml(contacts.storeName)}</strong> pelo WhatsApp, acompanhe as novidades no Instagram oficial ou envie uma mensagem.
              </p>
            </div>
          </div>

          <!-- Cartões de Contato Direto com Apenas os Botões Elegantes (Dados camuflados exceto para Admin) -->
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
                ${isAdminLogged ? `<p style="font-size:0.8rem;color:var(--accent-gold);margin-bottom:4px;">[Admin] ${escapeHtml(contacts.whatsappDisplay)}</p>` : ''}
                <p style="font-size:0.84rem;color:var(--text-secondary);">
                  Inicie uma conversa direta no WhatsApp para tirar dúvidas sobre peças, tamanhos, disponibilidade e pedidos.
                </p>
              </div>
              <a href="${escapeHtml(contacts.whatsappUrl)}" target="_blank" rel="noopener noreferrer" class="contact-btn-action whatsapp-style" aria-label="Conversar no WhatsApp Oficial BY ANGÉLY">
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
                    <strong style="font-family:var(--font-serif);font-size:1.35rem;">Instagram Oficial</strong>
                  </div>
                </div>
                ${isAdminLogged ? `<p style="font-size:0.8rem;color:var(--accent-gold);margin-bottom:4px;">[Admin] ${escapeHtml(contacts.instagramHandle)}</p>` : ''}
                <p style="font-size:0.84rem;color:var(--text-secondary);">
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
                ${isAdminLogged ? `<p style="font-size:0.8rem;color:var(--accent-gold);margin-bottom:4px;">[Admin] ${escapeHtml(contacts.email)}</p>` : ''}
                <p style="font-size:0.84rem;color:var(--text-secondary);">
                  Atendimento para solicitações formais, acompanhamento de pedidos, trocas, devoluções e parcerias comerciais.
                </p>
              </div>
              <a href="${escapeHtml(contacts.mailtoUrl)}" class="contact-btn-action" aria-label="Enviar e-mail comercial para a BY ANGÉLY">
                ${OFFICIAL_ICONS.email}
                <span>Enviar E-mail Agora</span>
              </a>
            </div>
          </div>

          <div class="checkout-layout">
            <div>
              <div class="admin-card" style="background:var(--bg-primary);margin-bottom:0;">
                <h3 style="font-family:var(--font-serif);font-size:1.4rem;margin-bottom:10px;">Atendimento Personalizado — ${escapeHtml(contacts.storeName)}</h3>
                <p style="font-size:0.88rem;color:var(--text-secondary);margin-bottom:16px;">
                  Nossa equipe em <strong>${escapeHtml(settings.city)} - ${escapeHtml(settings.state)}</strong> oferece consultoria de estilo, medidas e acompanhamento completo do seu pedido. Escolha seu canal preferido abaixo:
                </p>
                <div style="display:flex;flex-direction:column;gap:10px;">
                  <a href="${escapeHtml(contacts.whatsappUrl)}" target="_blank" rel="noopener noreferrer" class="contact-btn-action whatsapp-style">
                    ${OFFICIAL_ICONS.whatsapp}
                    <span>Atendimento via WhatsApp</span>
                  </a>
                  <a href="${escapeHtml(contacts.instagramUrl)}" target="_blank" rel="noopener noreferrer" class="contact-btn-action instagram-style">
                    ${OFFICIAL_ICONS.instagram}
                    <span>Visitar Perfil no Instagram</span>
                  </a>
                  <a href="${escapeHtml(contacts.mailtoUrl)}" class="contact-btn-action">
                    ${OFFICIAL_ICONS.email}
                    <span>Entrar em Contato por E-mail</span>
                  </a>
                </div>
                ${isAdminLogged ? `
                  <div style="margin-top:16px;padding-top:12px;border-top:1px dashed var(--border-strong);font-size:0.78rem;color:var(--text-secondary);">
                    <strong>🔒 Dados Internos (Visíveis apenas para Admin):</strong><br/>
                    WhatsApp: ${escapeHtml(contacts.whatsappDisplay)} | Instagram: ${escapeHtml(contacts.instagramHandle)} | E-mail: ${escapeHtml(contacts.email)}
                  </div>
                ` : ''}
              </div>
            </div>

            <div class="admin-card" style="margin-bottom:0;">
              <h3 style="font-family:var(--font-serif);font-size:1.5rem;margin-bottom:12px;">Formulário de Atendimento no Site</h3>
              <form id="sac-contact-form">
                <div style="margin-bottom:12px;">
                  <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Seu Nome Completo *</label>
                  <input type="text" name="name" class="form-control" required placeholder="Digite seu nome" value="${AppState.currentCustomer ? escapeHtml(AppState.currentCustomer.name) : ''}" />
                </div>
                <div class="sac-form-grid">
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
  // 2. CATÁLOGO REESTRUTURADO (VITRINE IMEDIATA + PAINEL DE FILTROS RECOLHIDO)
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
          const matchCat = (p.categoryName || '').toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchSku && !matchStyle && !matchCat) return false;
        }
        if (f.category !== 'all' && !matchesCategory(p, f.category)) return false;
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
        // Padrão ('featured'): prioriza produtos reais da proprietária primeiro, depois destaques
        const aReal = !a.isDemo ? 1 : 0;
        const bReal = !b.isDemo ? 1 : 0;
        if (aReal !== bReal) return bReal - aReal;
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      });
  }

  function countActiveCatalogFilters() {
    const f = AppState.filters;
    let count = 0;
    if (f.search && f.search.trim()) count++;
    if (f.category && f.category !== 'all') count++;
    if (f.size && f.size !== 'all') count++;
    if (f.color && f.color !== 'all') count++;
    if (f.style && f.style !== 'all') count++;
    if (f.priceRange && f.priceRange !== 'all') count++;
    if (f.availability && f.availability !== 'all') count++;
    if (f.sortBy && f.sortBy !== 'featured') count++;
    return count;
  }

  function renderCatalogView() {
    const published = AppState.db.products.filter((p) => p.status === 'published');
    const filtered = getFilteredProducts();
    const categories = AppState.db.categories || [];
    const f = AppState.filters;

    const selectedCatObj = f.category !== 'all'
      ? categories.find((c) => matchesCategory({ category: c.slug, categoryName: c.name }, f.category))
      : null;

    const categoryTitle = f.availability === 'promo'
      ? 'Promoções & Ofertas Especiais'
      : selectedCatObj
      ? selectedCatObj.name
      : 'Catálogo Completo';

    const activeFiltersCount = countActiveCatalogFilters();

    const activeChips = [];
    if (selectedCatObj) activeChips.push({ label: `Categoria: ${selectedCatObj.name}`, key: 'category' });
    if (f.size !== 'all') activeChips.push({ label: `Tamanho: ${f.size}`, key: 'size' });
    if (f.color !== 'all') activeChips.push({ label: `Cor: ${f.color}`, key: 'color' });
    if (f.style !== 'all') activeChips.push({ label: `Estilo: ${f.style}`, key: 'style' });
    if (f.priceRange === 'up_to_250') activeChips.push({ label: 'Até R$ 250', key: 'priceRange' });
    if (f.priceRange === '250_to_380') activeChips.push({ label: 'R$ 250 a R$ 380', key: 'priceRange' });
    if (f.priceRange === 'above_380') activeChips.push({ label: 'Acima de R$ 380', key: 'priceRange' });
    if (f.availability === 'promo') activeChips.push({ label: 'Em promoção', key: 'availability' });
    if (f.availability === 'in_stock') activeChips.push({ label: 'Com estoque', key: 'availability' });

    return `
      <section class="section-block" style="padding-top:20px;" aria-labelledby="catalog-heading">
        <div class="container">
          <!-- Ordem 3, 4 e 5: Título da Categoria, Quantidade de Produtos Encontrados e Botão Discreto "FILTRAR E ORDENAR" -->
          <div class="catalog-header-compact">
            <div class="catalog-header-info">
              <h1 id="catalog-heading">${escapeHtml(categoryTitle)}</h1>
              <span class="catalog-count-text" id="catalog-product-count">
                ${filtered.length} ${filtered.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
              </span>
            </div>

            <div class="catalog-controls-bar">
              <div style="position:relative;flex:1;min-width:160px;max-width:260px;">
                <input
                  type="search"
                  id="filter-search"
                  class="form-control"
                  placeholder="Buscar peça..."
                  aria-label="Buscar peça por nome, tecido ou SKU"
                  value="${escapeHtml(f.search)}"
                  style="min-height:42px;padding-left:12px;font-size:0.84rem;"
                />
              </div>

              <button
                type="button"
                class="btn-filter-trigger"
                data-action="open-filter-drawer"
                aria-label="Abrir painel de filtros e ordenação"
              >
                <svg class="lucide-icon" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
                <span>FILTRAR E ORDENAR</span>
                ${activeFiltersCount > 0 ? `<span class="filter-count-badge">${activeFiltersCount}</span>` : ''}
              </button>
            </div>
          </div>

          ${activeChips.length > 0 ? `
            <div class="active-filters-strip" aria-label="Filtros aplicados">
              ${activeChips.map((chip) => `
                <button type="button" class="active-filter-chip" data-action="remove-single-filter" data-filter-key="${escapeHtml(chip.key)}" title="Remover filtro">
                  <span>${escapeHtml(chip.label)}</span>
                  <span aria-hidden="true">✕</span>
                </button>
              `).join('')}
              <button type="button" class="btn btn-subtle btn-sm" data-action="reset-catalog-filters" style="min-height:30px;padding:4px 10px;font-size:0.72rem;">
                Limpar todos
              </button>
            </div>
          ` : ''}

          <!-- Ordem 6: Grade de Produtos Visível Imediatamente -->
          ${filtered.length > 0 ? `
            <div class="products-grid" id="catalog-results-grid">
              ${filtered.map(renderProductCard).join('')}
            </div>
          ` : `
            <div class="admin-card" style="text-align:center;padding:48px 20px;">
              <h2 style="font-family:var(--font-serif);font-size:1.6rem;margin-bottom:8px;">Nenhuma peça encontrada com esses filtros</h2>
              <p style="color:var(--text-secondary);margin-bottom:18px;">Experimente limpar os filtros selecionados ou visualizar todas as peças da loja.</p>
              <button type="button" class="btn btn-primary btn-sm" data-action="reset-catalog-filters">Mostrar Todas as Peças (${published.length})</button>
            </div>
          `}
        </div>
      </section>
    `;
  }

  function openFilterDrawer() {
    renderFilterDrawerBody();
    const backdrop = document.getElementById('filter-drawer-backdrop');
    if (backdrop) {
      backdrop.classList.add('open');
      backdrop.setAttribute('aria-hidden', 'false');
    }
  }

  function closeFilterDrawer() {
    const backdrop = document.getElementById('filter-drawer-backdrop');
    if (backdrop) {
      backdrop.classList.remove('open');
      backdrop.setAttribute('aria-hidden', 'true');
    }
  }

  function renderFilterDrawerBody() {
    const bodyEl = document.getElementById('filter-drawer-body');
    if (!bodyEl) return;

    const published = AppState.db.products.filter((p) => p.status === 'published');
    const categories = AppState.db.categories || [];
    const allSizes = Array.from(new Set(published.flatMap((p) => p.sizes || [])));
    const allColors = Array.from(new Set(published.flatMap((p) => (p.colors || []).map((c) => c.name))));
    const allStyles = Array.from(new Set(published.map((p) => p.style).filter(Boolean)));
    const f = AppState.filters;

    bodyEl.innerHTML = `
      <form id="drawer-filters-form">
        <!-- Ordenação -->
        <div class="filter-section-group">
          <label class="filter-section-label" for="drawer-filter-sort">Ordenar por</label>
          <select id="drawer-filter-sort" class="form-control">
            <option value="featured" ${f.sortBy === 'featured' ? 'selected' : ''}>Destaques da Coleção</option>
            <option value="newest" ${f.sortBy === 'newest' ? 'selected' : ''}>Novidades (Mais recentes)</option>
            <option value="price_asc" ${f.sortBy === 'price_asc' ? 'selected' : ''}>Menor Preço</option>
            <option value="price_desc" ${f.sortBy === 'price_desc' ? 'selected' : ''}>Maior Preço</option>
          </select>
        </div>

        <!-- Tipo de Peça (Categoria) -->
        <div class="filter-section-group">
          <label class="filter-section-label" for="drawer-filter-category">Tipo de peça</label>
          <select id="drawer-filter-category" class="form-control">
            <option value="all">Todas as categorias</option>
            ${categories.map((c) => `
              <option value="${escapeHtml(c.slug)}" ${matchesCategory({ category: f.category }, c.slug) && f.category !== 'all' ? 'selected' : ''}>
                ${escapeHtml(c.name)}
              </option>
            `).join('')}
          </select>
        </div>

        <!-- Tamanho -->
        <div class="filter-section-group">
          <label class="filter-section-label" for="drawer-filter-size">Tamanho</label>
          <select id="drawer-filter-size" class="form-control">
            <option value="all">Todos os tamanhos</option>
            ${allSizes.map((s) => `<option value="${escapeHtml(s)}" ${f.size === s ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
          </select>
        </div>

        <!-- Cor -->
        <div class="filter-section-group">
          <label class="filter-section-label" for="drawer-filter-color">Cor</label>
          <select id="drawer-filter-color" class="form-control">
            <option value="all">Todas as cores</option>
            ${allColors.map((c) => `<option value="${escapeHtml(c)}" ${f.color === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>
        </div>

        <!-- Estilo -->
        <div class="filter-section-group">
          <label class="filter-section-label" for="drawer-filter-style">Estilo</label>
          <select id="drawer-filter-style" class="form-control">
            <option value="all">Todos os estilos</option>
            ${allStyles.map((st) => `<option value="${escapeHtml(st)}" ${f.style === st ? 'selected' : ''}>${escapeHtml(st)}</option>`).join('')}
          </select>
        </div>

        <!-- Faixa de Preço -->
        <div class="filter-section-group">
          <label class="filter-section-label" for="drawer-filter-price">Faixa de preço</label>
          <select id="drawer-filter-price" class="form-control">
            <option value="all" ${f.priceRange === 'all' ? 'selected' : ''}>Qualquer valor</option>
            <option value="up_to_250" ${f.priceRange === 'up_to_250' ? 'selected' : ''}>Até R$ 250,00</option>
            <option value="250_to_380" ${f.priceRange === '250_to_380' ? 'selected' : ''}>De R$ 250,00 a R$ 380,00</option>
            <option value="above_380" ${f.priceRange === 'above_380' ? 'selected' : ''}>Acima de R$ 380,00</option>
          </select>
        </div>

        <!-- Opções Rápidas: Promoção e Estoque -->
        <div class="filter-section-group">
          <span class="filter-section-label">Disponibilidade e Ofertas</span>
          <label class="filter-checkbox-row" for="drawer-filter-only-promo">
            <input type="checkbox" id="drawer-filter-only-promo" ${f.availability === 'promo' ? 'checked' : ''} />
            <span>Somente em promoção</span>
          </label>
          <label class="filter-checkbox-row" for="drawer-filter-only-stock">
            <input type="checkbox" id="drawer-filter-only-stock" ${f.availability === 'in_stock' ? 'checked' : ''} />
            <span>Somente com estoque disponível</span>
          </label>
        </div>
      </form>
    `;

    const promoChk = document.getElementById('drawer-filter-only-promo');
    const stockChk = document.getElementById('drawer-filter-only-stock');
    if (promoChk && stockChk) {
      promoChk.addEventListener('change', () => {
        if (promoChk.checked) stockChk.checked = false;
      });
      stockChk.addEventListener('change', () => {
        if (stockChk.checked) promoChk.checked = false;
      });
    }
  }

  function applyFilterDrawer() {
    const sortEl = document.getElementById('drawer-filter-sort');
    const catEl = document.getElementById('drawer-filter-category');
    const sizeEl = document.getElementById('drawer-filter-size');
    const colorEl = document.getElementById('drawer-filter-color');
    const styleEl = document.getElementById('drawer-filter-style');
    const priceEl = document.getElementById('drawer-filter-price');
    const promoChk = document.getElementById('drawer-filter-only-promo');
    const stockChk = document.getElementById('drawer-filter-only-stock');

    if (sortEl) AppState.filters.sortBy = sortEl.value;
    if (catEl) AppState.filters.category = catEl.value;
    if (sizeEl) AppState.filters.size = sizeEl.value;
    if (colorEl) AppState.filters.color = colorEl.value;
    if (styleEl) AppState.filters.style = styleEl.value;
    if (priceEl) AppState.filters.priceRange = priceEl.value;
    if (promoChk && promoChk.checked) {
      AppState.filters.availability = 'promo';
    } else if (stockChk && stockChk.checked) {
      AppState.filters.availability = 'in_stock';
    } else {
      AppState.filters.availability = 'all';
    }

    closeFilterDrawer();
    if (AppState.currentView !== 'catalog') {
      navigateTo('catalog');
    } else {
      updateGlobalChrome();
      renderMainView();
    }
  }

  function bindCatalogFilterEvents() {
    const searchEl = document.getElementById('filter-search');
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
  // MODAL DE DETALHE DO PRODUTO (GALERIA, TAMANHOS, CORES, QUANTIDADE, SACOLA, COMPRAR AGORA E WHATSAPP)
  // =========================================================================
  function openProductModal(productId) {
    const product = AppState.db.products.find((p) => p.id === productId);
    if (!product) return;

    const firstAvailableVar = (product.variations || []).find((v) => v.stock > 0) || (product.variations && product.variations[0]);
    AppState.activeProductModal = {
      productId: product.id,
      selectedColor: firstAvailableVar ? firstAvailableVar.color : (product.colors && product.colors[0] ? product.colors[0].name : ''),
      selectedSize: firstAvailableVar ? firstAvailableVar.size : (product.sizes && product.sizes[0] ? product.sizes[0] : ''),
      quantity: 1,
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
    const selectedQty = Math.max(1, Math.min(Number(state.quantity) || 1, Math.max(1, currentVarStock)));
    state.quantity = selectedQty;

    const normCat = normalizeCategorySlug(product.category || product.categoryName || 'vestidos');
    const fallbackUrl = CATEGORY_COVER_FALLBACKS[normCat] || CATEGORY_COVER_FALLBACKS.vestidos;
    const mediaList = product.media && product.media.length > 0 ? product.media : [
      { type: 'image', url: fallbackUrl, alt: product.name }
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
              <img src="${escapeHtml(activeMedia.url)}" alt="${escapeHtml(activeMedia.alt || product.name)}" id="pdp-active-img" onerror="this.onerror=null;this.src='${escapeHtml(fallbackUrl)}';" />
              <button type="button" class="pdp-zoom-btn" data-action="zoom-image" data-url="${escapeHtml(activeMedia.url)}" data-alt="${escapeHtml(activeMedia.alt || product.name)}">
                Ampliar Imagem
              </button>
            `}
          </div>
          ${Boolean(AppState.currentAdmin) && activeMedia.credit ? `
            <p style="font-size:0.72rem;color:var(--text-muted);margin-top:6px;">
              [Admin] Fonte / Licença da mídia: ${escapeHtml(activeMedia.credit)}
            </p>
          ` : ''}
          <div class="pdp-thumbs" role="tablist" aria-label="Galeria de fotos e vídeos do produto">
            ${mediaList.map((m, idx) => `
              <button type="button" class="pdp-thumb-btn ${idx === state.mediaIndex ? 'active' : ''}" data-action="select-pdp-media" data-index="${idx}" aria-label="${m.type === 'video' ? 'Reproduzir vídeo' : 'Ver foto ' + (idx + 1)}">
                ${m.type === 'video' ? `
                  <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#111111;color:#FFF;font-size:0.72rem;font-weight:700;">▶ VÍDEO</div>
                ` : `
                  <img src="${escapeHtml(m.url)}" alt="Miniatura ${idx + 1}" onerror="this.onerror=null;this.src='${escapeHtml(fallbackUrl)}';" />
                `}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Coluna Direita: Informações, Variações, Quantidade e Ações -->
        <div>
          ${Boolean(AppState.currentAdmin) && product.isDemo ? `
            <div class="alert-box alert-warning" style="padding:10px 14px;font-size:0.78rem;">
              <strong>[VISÃO ADMIN] PRODUTO DEMONSTRATIVO:</strong> ${escapeHtml(product.demoNotice || 'Peça de exemplo. Você pode editar ou remover no painel.')}
            </div>
          ` : ''}

          <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">
            <span>${escapeHtml(product.categoryName || product.category)} • ${escapeHtml(product.style || '')}</span>
            <span>Cód: ${escapeHtml(product.sku)}</span>
          </div>

          <h2 style="font-family:var(--font-serif);font-size:1.95rem;font-weight:600;line-height:1.15;margin-bottom:10px;">
            ${escapeHtml(product.name)}
          </h2>

          <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:14px;">
            <span style="font-size:1.5rem;font-weight:700;color:var(--accent-brown);">${formatBRL(effectivePrice)}</span>
            ${hasPromo ? `<span style="font-size:0.98rem;color:var(--text-muted);text-decoration:line-through;">${formatBRL(product.price)}</span>` : ''}
          </div>

          <p style="color:var(--text-secondary);margin-bottom:18px;font-size:0.9rem;">
            ${escapeHtml(product.shortDescription || '')}
          </p>

          <!-- Seleção de Cor -->
          <div class="option-selector-group">
            <div class="option-selector-label">
              <span>Cor selecionada: <strong>${escapeHtml(state.selectedColor)}</strong></span>
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

          <!-- Seleção de Tamanho e Estoque -->
          <div class="option-selector-group">
            <div class="option-selector-label">
              <span>Tamanho: <strong>${escapeHtml(state.selectedSize)}</strong></span>
              <span style="font-size:0.76rem;color:${currentVarStock > 0 ? 'var(--status-success-text)' : 'var(--status-danger-text)'};">
                ${currentVarStock > 0 ? `Disponível (${currentVarStock} un.)` : 'Indisponível nesta combinação'}
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

          <!-- Seleção de Quantidade e Favoritar -->
          <div class="option-selector-group" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:16px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:0.76rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Quantidade:</span>
              <div class="qty-stepper" role="group" aria-label="Selecionar quantidade">
                <button type="button" data-action="pdp-qty-dec" aria-label="Diminuir quantidade" ${selectedQty <= 1 ? 'disabled' : ''}>−</button>
                <span aria-live="polite">${selectedQty}</span>
                <button type="button" data-action="pdp-qty-inc" aria-label="Aumentar quantidade" ${selectedQty >= currentVarStock ? 'disabled' : ''}>+</button>
              </div>
            </div>

            <div style="display:flex;gap:8px;">
              <button type="button" class="btn btn-outline btn-sm" data-action="toggle-wishlist" data-product-id="${escapeHtml(product.id)}" aria-label="Favoritar produto">
                ${isFav ? '♥ Salvo' : '♡ Favoritar'}
              </button>
              <button type="button" class="btn btn-outline btn-sm" data-action="share-product" data-product-id="${escapeHtml(product.id)}" aria-label="Compartilhar peça" title="Compartilhar">
                ↗
              </button>
            </div>
          </div>

          <!-- Botões Principais: Adicionar à Sacola + Comprar Agora -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0 10px;">
            <button type="button" class="btn btn-primary" data-action="add-to-cart-modal" ${currentVarStock <= 0 ? 'disabled' : ''}>
              ${currentVarStock > 0 ? 'Adicionar à Sacola' : 'Variação Esgotada'}
            </button>
            <button type="button" class="btn btn-gold" data-action="buy-now-modal" ${currentVarStock <= 0 ? 'disabled' : ''}>
              Comprar Agora
            </button>
          </div>

          <!-- Botão de Atendimento WhatsApp Identificando o Produto (Preservado integralmente) -->
          <div style="margin-bottom:18px;">
            <a href="${escapeHtml(getProductWhatsappUrl(product, state.selectedSize, state.selectedColor, state.quantity))}" target="_blank" rel="noopener noreferrer" class="contact-btn-action whatsapp-style" style="width:100%;" id="pdp-whatsapp-product-link">
              ${OFFICIAL_ICONS.whatsapp}
              <span>FALAR NO WHATSAPP SOBRE ESTA PEÇA</span>
            </a>
          </div>

          <!-- Descrição, Composição e Tabela de Medidas -->
          <div style="border-top:1px solid var(--border-subtle);padding-top:14px;margin-top:14px;">
            <details open style="margin-bottom:10px;">
              <summary style="font-weight:600;font-size:0.88rem;cursor:pointer;padding:6px 0;">Descrição e Composição</summary>
              <div style="font-size:0.85rem;color:var(--text-secondary);padding-top:8px;">
                <p style="margin-bottom:8px;">${escapeHtml(product.description || '')}</p>
                <p style="margin-bottom:4px;"><strong>Composição:</strong> ${escapeHtml(product.fabricInfo || 'Consulte a etiqueta da peça')}</p>
                <p><strong>Conservação:</strong> ${escapeHtml(product.careInfo || 'Seguir instruções da etiqueta interna.')}</p>
              </div>
            </details>

            ${product.sizeChart && product.sizeChart.length > 0 ? `
              <details style="margin-bottom:10px;border-top:1px solid var(--border-subtle);padding-top:10px;">
                <summary style="font-weight:600;font-size:0.88rem;cursor:pointer;padding:6px 0;">Tabela de Medidas Referencial</summary>
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
              <summary style="font-weight:600;font-size:0.88rem;cursor:pointer;padding:6px 0;">Avaliações sobre a Peça (${productReviews.length})</summary>
              <div style="padding-top:10px;">
                ${productReviews.length === 0 ? `
                  <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:10px;">Seja a primeira cliente a avaliar esta peça.</p>
                ` : productReviews.map((rev) => `
                  <div style="background:var(--bg-primary);padding:10px 12px;border-radius:8px;margin-bottom:8px;font-size:0.82rem;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                      <strong>${escapeHtml(rev.customerName)}</strong>
                      <span style="color:var(--accent-gold);">${'★'.repeat(rev.rating || 5)} • ${escapeHtml(rev.date)}</span>
                    </div>
                    <p style="color:var(--text-secondary);">${escapeHtml(rev.comment)}</p>
                  </div>
                `).join('')}
                <form id="pdp-review-form" data-product-id="${escapeHtml(product.id)}" style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--border-subtle);">
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
      floatingWa.href = getProductWhatsappUrl(product, state.selectedSize, state.selectedColor, state.quantity);
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
  // SACOLA DE COMPRAS (CARRINHO, SUBTOTAIS, CUPOM, SIMULADOR DE FRETE)
  // =========================================================================
  function addToCart(productId, size, color, qty = 1, options = {}) {
    const product = AppState.db.products.find((p) => p.id === productId);
    if (!product) return false;

    const cleanSize = isValidClothingSize(size)
      ? String(size).trim()
      : (Array.isArray(product.sizes) ? (product.sizes.find(isValidClothingSize) || '') : '');
    const cleanColor = isValidColorName(color)
      ? String(color).trim()
      : (Array.isArray(product.colors) && product.colors[0] ? (product.colors[0].name || '') : '');

    const available = getVariationStock(product, cleanSize, cleanColor);
    if (available <= 0) {
      showToast('Esta variação de tamanho e cor está sem estoque.', 'danger');
      return false;
    }

    const key = `${productId}__${cleanSize}__${cleanColor}`;
    const existing = AppState.cart.find((item) => item.key === key);

    if (existing) {
      if (existing.quantity + qty > available) {
        showToast(`Estoque máximo atingido (${available} un. disponíveis para ${cleanSize} / ${cleanColor}).`, 'warning');
        return false;
      }
      existing.quantity += qty;
    } else {
      const normCat = normalizeCategorySlug(product.category || product.categoryName || 'vestidos');
      const fb = CATEGORY_COVER_FALLBACKS[normCat] || CATEGORY_COVER_FALLBACKS.vestidos;
      const firstImg = (product.media && product.media.find((m) => m.type === 'image' && m.url)) || { url: fb };
      AppState.cart.push({
        key,
        productId: product.id,
        sku: product.sku,
        name: product.name,
        size: cleanSize,
        color: cleanColor,
        unitPrice: getEffectivePrice(product),
        imageUrl: firstImg.url,
        isDemo: !!product.isDemo,
        quantity: qty
      });
    }

    saveCart();
    renderCartDrawer();
    if (!options.skipOpenDrawer) {
      openCartDrawer();
    }
    showToast(`"${product.name}" (${size} • ${color}) adicionado à sacola!`, 'success');
    return true;
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

  function sanitizeCartItems() {
    if (!Array.isArray(AppState.cart) || AppState.cart.length === 0) return;
    let changed = false;
    AppState.cart = AppState.cart.map((item) => {
      if (!item) return item;
      const prod = AppState.db && Array.isArray(AppState.db.products)
        ? AppState.db.products.find((p) => p.id === item.productId || p.sku === item.sku || p.name === item.name)
        : null;
      let cleanSize = isValidClothingSize(item.size) ? String(item.size).trim() : '';
      if (!cleanSize && prod && Array.isArray(prod.sizes)) {
        const firstValid = prod.sizes.find(isValidClothingSize);
        if (firstValid) cleanSize = firstValid;
      }
      let cleanColor = isValidColorName(item.color) ? String(item.color).trim() : '';
      if (!cleanColor && prod && Array.isArray(prod.colors) && prod.colors[0]) {
        cleanColor = prod.colors[0].name || '';
      }
      const newKey = `${item.productId}__${cleanSize}__${cleanColor}`;
      if (cleanSize !== item.size || cleanColor !== item.color || newKey !== item.key) {
        changed = true;
        return {
          ...item,
          size: cleanSize,
          color: cleanColor,
          key: newKey
        };
      }
      return item;
    });
    if (changed) {
      saveCart();
    }
  }

  function renderCartDrawer() {
    const bodyEl = document.getElementById('cart-drawer-body');
    const footerEl = document.getElementById('cart-drawer-footer');
    if (!bodyEl || !footerEl) return;

    sanitizeCartItems();

    if (AppState.cart.length === 0) {
      bodyEl.innerHTML = `
        <div class="cart-empty-state">
          <p class="cart-empty-title">Sua sacola está vazia</p>
          <p class="cart-empty-sub">Adicione peças da coleção BY ANGÉLY para iniciar seu pedido.</p>
          <button type="button" class="btn btn-primary btn-sm" data-action="close-cart-go-catalog">Explorar Peças</button>
        </div>
      `;
      footerEl.innerHTML = '';
      return;
    }

    const totals = calculateCartTotals();
    const shippingMethods = (AppState.db.shippingSettings.methods || []).filter((m) => m.enabled);

    bodyEl.innerHTML = `
      <div class="cart-items-list">
        ${AppState.cart.map((item) => {
          const itemSubtotal = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1);
          const hasValidSize = isValidClothingSize(item.size);
          const hasValidColor = isValidColorName(item.color);
          const metaParts = [];
          if (hasValidSize) metaParts.push(`Tamanho: <strong>${escapeHtml(item.size)}</strong>`);
          if (hasValidColor) metaParts.push(`Cor: <strong>${escapeHtml(item.color)}</strong>`);
          const metaHtml = metaParts.length > 0
            ? `<div class="cart-item-meta">${metaParts.join(' <span aria-hidden="true">•</span> ')}</div>`
            : '';

          return `
            <article class="cart-item-card">
              <img
                src="${escapeHtml(item.imageUrl || CATEGORY_COVER_FALLBACKS.vestidos)}"
                alt="${escapeHtml(item.name)}"
                class="cart-item-thumb"
                data-fallback-src="${escapeHtml(CATEGORY_COVER_FALLBACKS.vestidos)}"
                onerror="window.ByAngelyHandleMediaError && window.ByAngelyHandleMediaError(this, 'Peça')"
              />
              <div class="cart-item-info">
                <strong class="cart-item-title">${escapeHtml(item.name)}</strong>
                ${metaHtml}
                <div class="cart-item-prices">
                  <span>Unitário: ${formatBRL(item.unitPrice)}</span>
                  <span aria-hidden="true">•</span>
                  <strong class="cart-item-subtotal">Subtotal: ${formatBRL(itemSubtotal)}</strong>
                </div>
                <div class="cart-item-actions-row">
                  <div class="qty-stepper cart-qty-stepper" role="group" aria-label="Quantidade de ${escapeHtml(item.name)}">
                    <button type="button" class="qty-stepper-btn" data-action="cart-qty-dec" data-key="${escapeHtml(item.key)}" aria-label="Diminuir quantidade">−</button>
                    <span class="qty-stepper-val">${item.quantity}</span>
                    <button type="button" class="qty-stepper-btn" data-action="cart-qty-inc" data-key="${escapeHtml(item.key)}" aria-label="Aumentar quantidade">+</button>
                  </div>
                  <button type="button" class="cart-item-remove-btn" data-action="cart-remove" data-key="${escapeHtml(item.key)}" aria-label="Remover ${escapeHtml(item.name)} da sacola" title="Remover produto">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    <span>Remover</span>
                  </button>
                </div>
              </div>
            </article>
          `;
        }).join('')}
      </div>

      <!-- Cupom de Desconto -->
      <div class="cart-section-box">
        <label for="cart-coupon-input" class="cart-section-label">Cupom de Desconto</label>
        <div class="cart-coupon-row">
          <input
            type="text"
            id="cart-coupon-input"
            class="form-control cart-coupon-input"
            placeholder="Ex.: BEMVINDO10"
            value="${AppState.appliedCoupon ? escapeHtml(AppState.appliedCoupon.code) : ''}"
          />
          <button type="button" class="btn btn-outline btn-sm cart-coupon-btn" data-action="apply-coupon">Aplicar</button>
        </div>
        ${AppState.appliedCoupon ? `
          <p class="cart-coupon-feedback">
            ✓ Cupom <strong>${escapeHtml(AppState.appliedCoupon.code)}</strong> aplicado (-${formatBRL(totals.discount)})
          </p>
        ` : ''}
      </div>

      <!-- Modalidade de Entrega / Retirada -->
      <div class="cart-section-box">
        <label for="cart-shipping-select" class="cart-section-label">Modalidade de Entrega / Retirada</label>
        <select id="cart-shipping-select" class="form-control cart-shipping-select">
          ${shippingMethods.map((m) => `
            <option value="${escapeHtml(m.id)}" ${totals.shippingMethod && totals.shippingMethod.id === m.id ? 'selected' : ''}>
              ${escapeHtml(m.name)} (${m.priceStatus === 'confirmed' ? (m.price === 0 ? 'Grátis' : formatBRL(m.price)) : 'A confirmar'})
            </option>
          `).join('')}
        </select>
        ${totals.shippingMethod ? `
          <div class="cart-shipping-note">
            <span><strong>Status do frete:</strong> ${totals.shippingMethod.priceStatus === 'confirmed' ? (totals.shippingMethod.price === 0 ? 'Grátis' : formatBRL(totals.shippingMethod.price)) : 'Valor a confirmar'}</span>
            <span>${escapeHtml(totals.shippingMethod.estimatedDays)}</span>
          </div>
        ` : ''}
      </div>
    `;

    const activePayOpts = getAvailableCheckoutPaymentOptions(AppState.db.paymentSettings);
    const isOnlyWhatsapp = activePayOpts.length === 1 && activePayOpts[0].id === 'whatsapp';

    footerEl.innerHTML = `
      <div class="cart-summary-list">
        <div class="cart-summary-row">
          <span>Subtotal dos itens</span>
          <strong>${formatBRL(totals.subtotal)}</strong>
        </div>
        ${totals.discount > 0 && AppState.appliedCoupon ? `
          <div class="cart-summary-row discount">
            <span>Desconto (${escapeHtml(AppState.appliedCoupon.code)})</span>
            <strong>-${formatBRL(totals.discount)}</strong>
          </div>
        ` : ''}
        <div class="cart-summary-row">
          <span>Entrega</span>
          <span>${totals.shippingMethod ? (totals.shippingMethod.priceStatus === 'confirmed' ? formatBRL(totals.shippingCost) : 'A confirmar pela proprietária') : 'A confirmar'}</span>
        </div>
        <div class="cart-summary-total">
          <span>Total do Pedido</span>
          <strong>${formatBRL(totals.total)}</strong>
        </div>
      </div>
      <button type="button" class="btn btn-primary btn-block ${isOnlyWhatsapp ? 'btn-cart-whatsapp' : ''}" data-action="proceed-to-checkout" id="btn-cart-proceed-checkout">
        ${isOnlyWhatsapp
          ? `${OFFICIAL_ICONS.whatsapp}<span>FINALIZAR PEDIDO PELO WHATSAPP</span>`
          : '<span>FINALIZAR COMPRA COM SEGURANÇA</span>'}
      </button>
      <button type="button" class="btn btn-outline btn-block btn-sm" data-action="open-cart-page" id="btn-cart-open-page" style="margin-top:8px;">
        Abrir página da sacola →
      </button>
    `;

    const shipSelect = document.getElementById('cart-shipping-select');
    if (shipSelect) {
      shipSelect.addEventListener('change', (e) => {
        AppState.selectedShippingMethodId = e.target.value;
        renderCartDrawer();
        if (AppState.currentView === 'cart') renderMainView();
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
    const activePaymentOptions = getAvailableCheckoutPaymentOptions(paySettings);

    if (activePaymentOptions.length > 0 && !activePaymentOptions.some((o) => o.id === AppState.selectedPaymentMethod)) {
      AppState.selectedPaymentMethod = activePaymentOptions[0].id;
    }

    const isOnlyWhatsapp = activePaymentOptions.length === 1 && activePaymentOptions[0].id === 'whatsapp';
    const isWhatsappSelected = isOnlyWhatsapp || AppState.selectedPaymentMethod === 'whatsapp';

    const cust = AppState.currentCustomer || {};
    const defaultAddr = (cust.addresses && cust.addresses[0]) || {};

    return `
      <section class="section-block">
        <div class="container">
          <div class="section-header" style="margin-bottom:24px;">
            <div>
              <span class="section-eyebrow">BY ANGÉLY • Finalização de Pedido</span>
              <h1 class="section-title">Identificação, Entrega e Revisão do Pedido</h1>
            </div>
            <button type="button" class="btn btn-outline btn-sm" data-action="go-catalog">← Continuar Comprando</button>
          </div>

          <form id="checkout-order-form" class="checkout-layout">
            <!-- Coluna Principal: Dados, Entrega e Pagamento (quando aplicável) -->
            <div>
              <!-- Etapa 1: Identificação -->
              <div class="admin-card">
                <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:14px;">1. Seus Dados para o Pedido</h2>
                <div class="sac-form-grid">
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Nome Completo *</label>
                    <input type="text" name="customerName" class="form-control" required value="${escapeHtml(cust.name || '')}" placeholder="Ex.: Maria Clara Silva" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">WhatsApp / Telefone com DDD *</label>
                    <input type="tel" name="customerPhone" class="form-control" required value="${escapeHtml(cust.phone || '')}" placeholder="(28) 99999-9999" />
                  </div>
                </div>
                <div class="sac-form-grid">
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">E-mail para Acompanhamento *</label>
                    <input type="email" name="customerEmail" class="form-control" required value="${escapeHtml(cust.email || '')}" placeholder="seu@email.com" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">CPF (Opcional — protegido pela LGPD)</label>
                    <input type="text" name="customerCpf" class="form-control" value="${escapeHtml(cust.cpf || '')}" placeholder="000.000.000-00" />
                  </div>
                </div>
                <div style="margin-bottom:10px;">
                  <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Observações do Pedido (Opcional)</label>
                  <input type="text" name="customerNotes" class="form-control" placeholder="Ex.: Horário de preferência para entrega/retirada ou observação sobre a peça" />
                </div>
                <label style="display:flex;align-items:flex-start;gap:8px;font-size:0.82rem;color:var(--text-secondary);cursor:pointer;margin-top:8px;">
                  <input type="checkbox" name="marketingOptIn" style="margin-top:4px;" />
                  <span>Desejo receber novidades e promoções da By Angély por e-mail ou WhatsApp. (Consentimento opcional conforme a LGPD).</span>
                </label>
              </div>

              <!-- Etapa 2: Entrega ou Retirada -->
              <div class="admin-card">
                <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:14px;">2. Forma de Recebimento e Endereço</h2>
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

                <div class="sac-form-grid">
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">CEP *</label>
                    <input type="text" name="zipCode" id="checkout-cep" class="form-control" required value="${escapeHtml(defaultAddr.zipCode || '28300-000')}" placeholder="28300-000" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Rua / Avenida *</label>
                    <input type="text" name="street" id="checkout-street" class="form-control" required value="${escapeHtml(defaultAddr.street || '')}" placeholder="Nome da rua ou avenida" />
                  </div>
                </div>
                <div class="sac-form-grid">
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Número / Compl. *</label>
                    <input type="text" name="number" class="form-control" required value="${escapeHtml(defaultAddr.number || '')}" placeholder="Nº e Apto" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Bairro *</label>
                    <input type="text" name="neighborhood" id="checkout-neighborhood" class="form-control" required value="${escapeHtml(defaultAddr.neighborhood || '')}" placeholder="Bairro" />
                  </div>
                </div>
                <div>
                  <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Cidade / UF *</label>
                  <input type="text" name="cityState" id="checkout-city" class="form-control" required value="${escapeHtml(defaultAddr.cityState || 'Itaperuna - RJ')}" placeholder="Itaperuna - RJ" />
                </div>
              </div>

              <!-- Etapa 3: Exibida SOMENTE quando há opções online ativas ou múltiplas formas ativas.
                   Quando SOMENTE o WhatsApp está ativo, oculta completamente a seleção de pagamento online! -->
              ${isOnlyWhatsapp ? '' : activePaymentOptions.length === 0 ? `
                <div class="admin-card" id="checkout-no-payment-warning">
                  <div class="alert-box alert-danger" style="margin-bottom:0;">
                    A finalização de pedidos está temporariamente indisponível para atualização de configurações da loja. Por favor, fale diretamente conosco pelo WhatsApp ou tente novamente em instantes.
                  </div>
                </div>
              ` : `
                <div class="admin-card" id="checkout-payment-step-card">
                  <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:14px;">3. Forma de Finalização e Pagamento</h2>
                  <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;" id="checkout-active-payment-list">
                    ${activePaymentOptions.map((opt) => `
                      <label style="display:flex;align-items:center;gap:10px;padding:12px;border:1px solid ${AppState.selectedPaymentMethod === opt.id ? 'var(--accent-gold)' : 'var(--border-subtle)'};border-radius:6px;background:${AppState.selectedPaymentMethod === opt.id ? 'var(--bg-accent-subtle)' : 'var(--bg-surface)'};cursor:pointer;">
                        <input type="radio" name="paymentMethod" value="${escapeHtml(opt.id)}" ${AppState.selectedPaymentMethod === opt.id ? 'checked' : ''} />
                        <strong style="font-size:0.92rem;">${escapeHtml(opt.label)}</strong>
                      </label>
                    `).join('')}
                  </div>

                  ${AppState.selectedPaymentMethod === 'whatsapp' ? `
                    <div class="alert-box alert-info" style="margin-bottom:0;">
                      <p style="margin-bottom:4px;"><strong>Atendimento e Finalização pelo WhatsApp Oficial:</strong></p>
                      <p style="font-size:0.82rem;">${escapeHtml(paySettings.whatsapp.instructions || 'Seu pedido será registrado como aguardando confirmação e enviado completo para o WhatsApp oficial da BY ANGÉLY.')}</p>
                    </div>
                  ` : ''}

                  ${AppState.selectedPaymentMethod === 'pix' ? `
                    <div class="alert-box alert-info" style="margin-bottom:0;">
                      <p style="margin-bottom:6px;"><strong>Pagamento via Pix pelo Site (Padrão EMV Banco Central):</strong></p>
                      <p style="margin-bottom:6px;">Ao confirmar o pedido, geraremos o <strong>QR Code Pix</strong> e o código <strong>Pix Copia e Cola</strong> com o valor exato de <strong>${formatBRL(totals.total)}</strong>.</p>
                      <p style="font-size:0.8rem;">
                        <strong>Recebedor:</strong> ${escapeHtml(paySettings.pix.recipientName)} • <strong>Chave:</strong> ${escapeHtml(paySettings.pix.pixKey)} • <strong>Cidade:</strong> ${escapeHtml(paySettings.pix.recipientCity)}
                      </p>
                    </div>
                  ` : ''}

                  ${AppState.selectedPaymentMethod === 'creditCard' ? `
                    <div class="alert-box alert-info" style="margin-bottom:0;">
                      <p style="margin-bottom:6px;"><strong>Pagamento por Cartão de Crédito (${escapeHtml(paySettings.creditCard.providerName)}):</strong></p>
                      <p style="font-size:0.82rem;">${escapeHtml(paySettings.creditCard.instructions)}</p>
                    </div>
                  ` : ''}

                  ${AppState.selectedPaymentMethod === 'debitCard' ? `
                    <div class="alert-box alert-info" style="margin-bottom:0;">
                      <p style="margin-bottom:6px;"><strong>Pagamento por Cartão de Débito (${escapeHtml(paySettings.debitCard.providerName)}):</strong></p>
                      <p style="font-size:0.82rem;">${escapeHtml(paySettings.debitCard.instructions)}</p>
                    </div>
                  ` : ''}

                  ${AppState.selectedPaymentMethod === 'payOnPickup' ? `
                    <div class="alert-box alert-info" style="margin-bottom:0;">
                      <p style="margin-bottom:6px;"><strong>${escapeHtml(paySettings.payOnPickup.title)}:</strong></p>
                      <p style="font-size:0.82rem;">${escapeHtml(paySettings.payOnPickup.instructions)}</p>
                    </div>
                  ` : ''}
                </div>
              `}
            </div>

            <!-- Coluna Lateral: Revisão Completa do Pedido -->
            <div>
              <div class="admin-card" style="position:sticky;top:98px;">
                <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:14px;">Resumo do Pedido</h2>
                <div style="display:flex;flex-direction:column;gap:10px;max-height:280px;overflow-y:auto;margin-bottom:14px;padding-right:4px;">
                  ${AppState.cart.map((item) => {
                    const sizePart = isValidClothingSize(item.size) ? `Tam: ${escapeHtml(item.size)} | ` : '';
                    const colorPart = isValidColorName(item.color) ? `Cor: ${escapeHtml(item.color)} | ` : '';
                    return `
                      <div style="display:flex;justify-content:space-between;font-size:0.84rem;padding-bottom:8px;border-bottom:1px solid var(--border-subtle);">
                        <div>
                          <strong>${escapeHtml(item.name)}</strong>
                          <div style="font-size:0.75rem;color:var(--text-secondary);">${sizePart}${colorPart}Qtd: ${item.quantity}x (${formatBRL(item.unitPrice)})</div>
                        </div>
                        <span style="font-weight:600;white-space:nowrap;">${formatBRL(item.unitPrice * item.quantity)}</span>
                      </div>
                    `;
                  }).join('')}
                </div>

                <div style="font-size:0.88rem;border-top:1px solid var(--border-subtle);padding-top:12px;margin-bottom:16px;">
                  <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                    <span>Total dos produtos:</span>
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
                    <span>${totals.shippingMethod && totals.shippingMethod.priceStatus === 'confirmed' ? formatBRL(totals.shippingCost) : 'A confirmar'}</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;font-size:1.2rem;font-weight:700;padding-top:10px;border-top:1px solid var(--border-strong);">
                    <span>Total do Pedido:</span>
                    <span>${formatBRL(totals.total)}</span>
                  </div>
                </div>

                <button type="submit" id="btn-submit-checkout" class="btn btn-primary btn-block ${isWhatsappSelected ? 'btn-cart-whatsapp' : ''}" ${activePaymentOptions.length === 0 ? 'disabled' : ''}>
                  ${isWhatsappSelected
                    ? `${OFFICIAL_ICONS.whatsapp}<span>FINALIZAR PEDIDO PELO WHATSAPP</span>`
                    : `Confirmar Pedido (${formatBRL(totals.total)})`}
                </button>
                <p style="font-size:0.74rem;color:var(--text-muted);text-align:center;margin-top:10px;">
                  Ao finalizar, seu pedido é registrado com segurança e você concorda com os <button type="button" data-action="go-policies" data-tab="terms" style="text-decoration:underline;">Termos de Uso</button> e a <button type="button" data-action="go-policies" data-tab="privacy" style="text-decoration:underline;">Política de Privacidade</button>.
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
      const activePaymentOptions = getAvailableCheckoutPaymentOptions(AppState.db.paymentSettings);
      if (activePaymentOptions.length === 0) {
        showToast('Nenhuma forma de pagamento está ativa no momento.', 'danger');
        return;
      }

      const chosenMethod = activePaymentOptions.length === 1
        ? activePaymentOptions[0].id
        : (activePaymentOptions.some((o) => o.id === AppState.selectedPaymentMethod)
            ? AppState.selectedPaymentMethod
            : activePaymentOptions[0].id);

      const fd = new FormData(form);
      const totals = calculateCartTotals();
      const orderNumber = 'ANG-' + String(1001 + (AppState.db.orders ? AppState.db.orders.length : 0));
      const txid = ((AppState.db.paymentSettings.pix.txidPrefix || 'BYANGELY') + orderNumber.replace(/\D/g, '')).slice(0, 25);

      // Deduz estoque das variações reservadas no pedido
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
      if (chosenMethod === 'pix') {
        const pixCfg = AppState.db.paymentSettings.pix;
        const keyToUse = (pixCfg.pixKey && !pixCfg.pixKey.toLowerCase().includes('a confirmar'))
          ? pixCfg.pixKey
          : '+5528999871458';
        const nameToUse = (pixCfg.recipientName && !pixCfg.recipientName.toLowerCase().includes('a confirmar'))
          ? pixCfg.recipientName
          : 'BY ANGELY';

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

      const isWhatsappOrder = chosenMethod === 'whatsapp';
      const methodLabels = {
        whatsapp: 'Atendimento e Finalização pelo WhatsApp',
        pix: 'Pix pelo Site (QR Code / Copia e Cola)',
        creditCard: 'Cartão de Crédito pelo Site',
        debitCard: 'Cartão de Débito pelo Site',
        payOnPickup: 'Pagamento na Retirada (Itaperuna - RJ)'
      };

      const newOrder = {
        id: 'ord-' + Date.now(),
        orderNumber,
        createdAt: new Date().toISOString(),
        // NUNCA marca como pago automaticamente!
        status: isWhatsappOrder ? 'awaiting_whatsapp' : 'awaiting_confirmation',
        statusLabel: isWhatsappOrder ? 'Aguardando confirmação pelo WhatsApp' : 'Aguardando pagamento',
        paymentMethod: chosenMethod,
        paymentMethodLabel: methodLabels[chosenMethod] || chosenMethod,
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
        customerNotes: String(fd.get('customerNotes') || '').trim(),
        customerPaymentNote: '',
        notificationsLog: [
          {
            date: new Date().toISOString(),
            channel: isWhatsappOrder ? 'WhatsApp Oficial' : 'Painel da Cliente',
            message: `Pedido ${orderNumber} registrado com status "${isWhatsappOrder ? 'Aguardando confirmação pelo WhatsApp' : 'Aguardando pagamento'}".`
          }
        ]
      };

      newOrder.whatsappMessage = buildOrderWhatsappMessage(newOrder);
      newOrder.whatsappOrderUrl = getOrderWhatsappUrl(newOrder);

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
      saveDatabase(`Novo pedido ${orderNumber} criado (${formatBRL(newOrder.total)}) — ${newOrder.statusLabel}.`);
      renderMainView();
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (isWhatsappOrder) {
        showToast(`Pedido ${orderNumber} registrado! Abrindo conversa no WhatsApp da BY ANGÉLY...`, 'success');
        try {
          window.open(newOrder.whatsappOrderUrl, '_blank', 'noopener,noreferrer');
        } catch (err) {}
      } else {
        showToast(`Pedido ${orderNumber} gerado! Confira as instruções de pagamento.`, 'success');
      }
    });
  }

  function renderOrderConfirmationScreen(order) {
    const paySettings = AppState.db.paymentSettings;
    let qrSvg = '';
    if (order.paymentMethod === 'pix' && order.pixData && order.pixData.payload) {
      qrSvg = window.ByAngelyPix.renderQrSvg(order.pixData.payload);
    }
    const waOrderUrl = order.whatsappOrderUrl || getOrderWhatsappUrl(order);
    const waOrderText = order.whatsappMessage || buildOrderWhatsappMessage(order);

    return `
      <section class="section-block">
        <div class="container" style="max-width:860px;">
          <div class="admin-card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid var(--border-subtle);">
              <div>
                <span class="section-eyebrow">Solicitação Registrada</span>
                <h1 style="font-family:var(--font-serif);font-size:2.1rem;">Pedido ${escapeHtml(order.orderNumber)}</h1>
                <p style="font-size:0.86rem;color:var(--text-secondary);">Realizado em ${formatDateBR(order.createdAt)}</p>
              </div>
              <span class="status-pill pending" style="font-size:0.85rem;padding:6px 14px;">
                ⏳ Status: ${escapeHtml(order.statusLabel)}
              </span>
            </div>

            ${order.paymentMethod === 'whatsapp' ? `
              <div style="background:var(--bg-primary);border:1px solid var(--border-strong);border-radius:8px;padding:22px;margin-bottom:22px;">
                <h2 style="font-family:var(--font-serif);font-size:1.65rem;margin-bottom:8px;">Finalize o Atendimento no WhatsApp Oficial (${formatBRL(order.total)})</h2>
                <p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:16px;">
                  Seu pedido <strong>${escapeHtml(order.orderNumber)}</strong> foi salvo como <strong>"Aguardando confirmação pelo WhatsApp"</strong>. Caso a janela do WhatsApp não tenha aberto automaticamente, clique no botão abaixo para enviar a mensagem completa do seu pedido:
                </p>
                <div style="margin-bottom:16px;">
                  <a href="${escapeHtml(waOrderUrl)}" target="_blank" rel="noopener noreferrer" class="contact-btn-action whatsapp-style" id="btn-open-whatsapp-order" style="width:100%;max-width:440px;">
                    ${OFFICIAL_ICONS.whatsapp}
                    <span>ENVIAR PEDIDO NO WHATSAPP DA BY ANGÉLY</span>
                  </a>
                </div>
                <details style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:6px;padding:12px;">
                  <summary style="font-size:0.82rem;font-weight:600;cursor:pointer;">Conferir mensagem completa gerada para o WhatsApp</summary>
                  <pre style="white-space:pre-wrap;font-family:var(--font-sans);font-size:0.8rem;color:var(--text-secondary);margin-top:10px;line-height:1.5;">${escapeHtml(waOrderText)}</pre>
                </details>
              </div>
            ` : `
              <div class="alert-box alert-warning">
                <strong>Atenção — Status Real do Pedido:</strong> O seu pedido encontra-se como <strong>"${escapeHtml(order.statusLabel)}"</strong>. A loja nunca simula aprovação automática: o status será atualizado para <em>"Pagamento confirmado"</em> assim que o recebimento for validado pela administração.
              </div>
            `}

            ${order.paymentMethod === 'pix' && order.pixData ? `
              <div style="background:var(--bg-primary);border:1px solid var(--border-strong);border-radius:8px;padding:22px;margin-bottom:22px;text-align:center;">
                <h2 style="font-family:var(--font-serif);font-size:1.6rem;margin-bottom:8px;">Pagamento via Pix (${formatBRL(order.total)})</h2>
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
                ` : ''}
              </div>
            ` : ''}

            ${order.paymentMethod === 'debitCard' ? `
              <div style="background:var(--bg-primary);border:1px solid var(--border-strong);border-radius:8px;padding:22px;margin-bottom:22px;">
                <h2 style="font-family:var(--font-serif);font-size:1.6rem;margin-bottom:8px;">Pagamento por Cartão de Débito (${formatBRL(order.total)})</h2>
                <p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:14px;">
                  ${escapeHtml(paySettings.debitCard.instructions)}
                </p>
                ${paySettings.debitCard.externalPaymentLink ? `
                  <a href="${escapeHtml(paySettings.debitCard.externalPaymentLink)}" target="_blank" rel="noopener noreferrer" class="btn btn-gold">
                    Ir para Página Segura de Pagamento (${escapeHtml(paySettings.debitCard.providerName)}) ↗
                  </a>
                ` : ''}
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
              <h3 style="font-size:0.95rem;margin-bottom:8px;">Deseja enviar alguma informação adicional ou comprovante sobre este pedido?</h3>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <input type="text" id="order-payment-note-input" class="form-control" style="flex:1;" placeholder="Informe uma observação ou código de comprovante..." value="${escapeHtml(order.customerPaymentNote || '')}" />
                <button type="button" class="btn btn-outline btn-sm" data-action="save-payment-note" data-order-id="${escapeHtml(order.id)}">Salvar Observação</button>
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
                  <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:8px;">Informe seu e-mail cadastrado. Se ele existir em nossa base, enviaremos um link oficial para redefinição:</p>
                  <input type="email" name="email" class="form-control" required placeholder="E-mail da conta" style="margin-bottom:8px;" />
                  <button type="submit" class="btn btn-outline btn-sm">Enviar Link de Redefinição</button>
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
      // Fecha painéis se clicar diretamente no fundo escuro (backdrop)
      if (e.target && e.target.id === 'mobile-menu-backdrop') {
        closeMobileMenu();
        return;
      }
      if (e.target && e.target.id === 'filter-drawer-backdrop') {
        closeFilterDrawer();
        return;
      }
      if (e.target && e.target.id === 'cart-drawer-backdrop') {
        closeCartDrawer();
        return;
      }
      if (e.target && e.target.id === 'product-detail-modal') {
        e.target.classList.remove('open');
        return;
      }

      const target = e.target.closest('[data-action], [data-nav-view]');
      if (!target) return;

      const action = target.getAttribute('data-action');
      const navView = target.getAttribute('data-nav-view');

      if (navView && !action) {
        e.preventDefault();
        AppState.lastCreatedOrder = null;
        closeMobileMenu();
        navigateTo(navView);
        return;
      }

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
          updateGlobalChrome();
          renderMainView();
          break;
        }
        case 'remove-single-filter': {
          const fKey = target.getAttribute('data-filter-key');
          if (fKey && AppState.filters[fKey] !== undefined) {
            AppState.filters[fKey] = 'all';
            updateGlobalChrome();
            renderMainView();
          }
          break;
        }
        case 'open-filter-drawer': {
          openFilterDrawer();
          break;
        }
        case 'close-filter-drawer': {
          closeFilterDrawer();
          break;
        }
        case 'apply-filter-drawer': {
          applyFilterDrawer();
          break;
        }
        case 'clear-filter-drawer': {
          resetFilters();
          renderFilterDrawerBody();
          updateGlobalChrome();
          renderMainView();
          showToast('Filtros limpos.');
          break;
        }
        case 'card-add-to-cart': {
          const pid = target.getAttribute('data-product-id');
          const prod = AppState.db.products.find((p) => p.id === pid);
          if (!prod) break;
          const availVar = (prod.variations || []).find((v) => Number(v.stock) > 0);
          if (availVar) {
            addToCart(prod.id, availVar.size, availVar.color, 1);
          } else {
            openProductModal(pid);
          }
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
          AppState.activeProductModal.quantity = 1;
          renderProductModalContent();
          break;
        }
        case 'select-pdp-size': {
          AppState.activeProductModal.selectedSize = target.getAttribute('data-size');
          AppState.activeProductModal.quantity = 1;
          renderProductModalContent();
          break;
        }
        case 'pdp-qty-inc': {
          const st = AppState.activeProductModal;
          const prod = AppState.db.products.find((p) => p.id === st.productId);
          const maxStock = getVariationStock(prod, st.selectedSize, st.selectedColor);
          if ((st.quantity || 1) < maxStock) {
            st.quantity = (st.quantity || 1) + 1;
            renderProductModalContent();
          }
          break;
        }
        case 'pdp-qty-dec': {
          const st = AppState.activeProductModal;
          if ((st.quantity || 1) > 1) {
            st.quantity = (st.quantity || 1) - 1;
            renderProductModalContent();
          }
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
          const added = addToCart(st.productId, st.selectedSize, st.selectedColor, Number(st.quantity) || 1);
          if (added) {
            const modal = document.getElementById('product-detail-modal');
            if (modal) modal.classList.remove('open');
          }
          break;
        }
        case 'buy-now-modal': {
          const st = AppState.activeProductModal;
          const added = addToCart(st.productId, st.selectedSize, st.selectedColor, Number(st.quantity) || 1, { skipOpenDrawer: true });
          if (added) {
            const modal = document.getElementById('product-detail-modal');
            if (modal) modal.classList.remove('open');
            AppState.lastCreatedOrder = null;
            navigateTo('checkout');
          }
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
        case 'open-cart-page': {
          closeCartDrawer();
          navigateTo('cart');
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
              if (AppState.currentView === 'cart') renderMainView();
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
            if (AppState.currentView === 'cart') renderMainView();
          }
          break;
        }
        case 'cart-remove': {
          const key = target.getAttribute('data-key');
          AppState.cart = AppState.cart.filter((i) => i.key !== key);
          saveCart();
          renderCartDrawer();
          if (AppState.currentView === 'cart') renderMainView();
          showToast('Item removido da sacola.');
          break;
        }
        case 'apply-coupon':
        case 'apply-page-coupon': {
          const input = document.getElementById(action === 'apply-page-coupon' ? 'cart-page-coupon-input' : 'cart-coupon-input');
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
          if (AppState.currentView === 'cart') renderMainView();
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
          closeMobileMenu();
          if (AppState.currentView !== 'account') {
            navigateTo('account', { accountTab: AppState.activeAccountTab });
          } else {
            renderMainView();
          }
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
          closeMobileMenu();
          navigateTo('policies', { policyTab: tab });
          break;
        }
        case 'open-mobile-menu': {
          const dr = document.getElementById('mobile-menu-backdrop');
          if (dr) {
            dr.classList.add('open');
            dr.setAttribute('aria-hidden', 'false');
          }
          break;
        }
        case 'close-mobile-menu': {
          closeMobileMenu();
          break;
        }
        case 'toggle-a11y-modal': {
          closeMobileMenu();
          const m = document.getElementById('a11y-modal-backdrop');
          if (m) m.classList.toggle('open');
          break;
        }
      }
    });

    // Formulário de SAC na Home
    document.addEventListener('submit', async (e) => {
      if (e.target && e.target.id === 'sac-contact-form') {
        e.preventDefault();
        const formEl = e.target;
        const fd = new FormData(formEl);
        const payload = {
          name: String(fd.get('name') || '').trim(),
          email: String(fd.get('email') || '').trim(),
          subject: String(fd.get('subject') || '').trim(),
          message: String(fd.get('message') || '').trim()
        };
        try {
          const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';
          const res = await fetch(apiBase + '/api/public/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json().catch(() => null);
          if (!res.ok || !data || !data.ok) {
            showToast((data && data.error) || 'Não foi possível enviar sua mensagem.', 'danger');
            return;
          }
          AppState.db.contactMessages = AppState.db.contactMessages || [];
          AppState.db.contactMessages.unshift(data.contactMessage);
          formEl.reset();
          showToast('Sua mensagem foi registrada e enviada ao atendimento da By Angély!', 'success');
        } catch (_err) {
          showToast('Erro de conexão ao enviar mensagem.', 'danger');
        }
      }
    });

    // Fechar modais com tecla Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.getElementById('product-detail-modal')?.classList.remove('open');
        document.getElementById('lightbox-overlay')?.classList.remove('open');
        document.getElementById('a11y-modal-backdrop')?.classList.remove('open');
        closeFilterDrawer();
        closeCartDrawer();
        closeMobileMenu();
      }
    });
  }

  function closeMobileMenu() {
    const dr = document.getElementById('mobile-menu-backdrop');
    if (dr) {
      dr.classList.remove('open');
      dr.setAttribute('aria-hidden', 'true');
    }
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

  // Exporta interface pública para o módulo Admin (`admin.js`) e testes
  window.ByAngelyApp = {
    getState: () => AppState,
    loadDatabase,
    saveDatabase,
    renderMainView,
    updateGlobalChrome,
    navigateTo,
    showToast,
    escapeHtml,
    formatBRL,
    formatDateBR,
    getTotalProductStock,
    getProductWhatsappUrl,
    buildOrderWhatsappMessage,
    getOrderWhatsappUrl,
    isPaymentOptionConfigured,
    getPaymentIntegrationStatus,
    getAvailableCheckoutPaymentOptions,
    getVariationStock,
    renderProductCard,
    addToCart,
    calculateCartTotals,
    openProductModal,
    openCartDrawer,
    renderCartDrawer
  };

  // Inicialização geral ao carregar o DOM (Renderização instantânea + Sincronização em nuvem)
  window.addEventListener('DOMContentLoaded', async () => {
    loadLocalClientState();

    // 1. Renderização instantânea (0ms) com estado local ou Seed oficial normalizado
    let initialDb = null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DB);
      if (saved) initialDb = JSON.parse(saved);
    } catch (e) {}
    AppState.db = normalizeAndRepairDatabase(initialDb || window.ByAngelySeed.createInitialDatabase());
    sanitizeCartItems();

    setupGlobalEvents();
    initAccessibilityControls();
    initCustomCursor();
    initCookieBanner();

    try {
      const params = new URLSearchParams(window.location.search);
      if (window.location.hash === '#admin' || params.has('admin')) {
        AppState.currentView = 'admin';
      } else if (window.location.hash === '#catalog' || params.has('catalogo')) {
        AppState.currentView = 'catalog';
      }
      updateGlobalChrome();
      renderMainView();
      const prodParam = params.get('produto');
      if (prodParam) {
        openProductModal(prodParam);
      }
    } catch (e) {
      updateGlobalChrome();
      renderMainView();
    }

    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#admin') {
        navigateTo('admin');
      } else if (window.location.hash === '#catalog') {
        navigateTo('catalog');
      }
    });

    // 2. Sincroniza em segundo plano com Supabase e Render Backend e atualiza a vitrine
    await loadDatabase();
    updateGlobalChrome();
    if (AppState.currentView !== 'admin') {
      renderMainView();
    }
  });
const _origNormalizeAndRepairDatabase = typeof normalizeAndRepairDatabase === 'function' ? normalizeAndRepairDatabase : null;
if (_origNormalizeAndRepairDatabase) {
normalizeAndRepairDatabase = function (rawDb) {
const rawPayIn = (rawDb && rawDb.paymentSettings) || {};
const rawPixIn = rawPayIn.pix || {};
const repaired = _origNormalizeAndRepairDatabase(rawDb);
repaired.storeSettings = repaired.storeSettings || {};
repaired.storeSettings.homeSections = {
showHero: true,
showFeatured: true,
showNewArrivals: true,
showPromos: true,
showCategories: true,
showBestSellers: false,
showBrandStory: true,
showContactSection: false,
...(repaired.storeSettings.homeSections || {})
};
repaired.paymentSettings = repaired.paymentSettings || {};
repaired.paymentSettings.paymentConfigVersion = 4;
if (rawPayIn.whatsapp && typeof rawPayIn.whatsapp.enabled === 'boolean') {
  repaired.paymentSettings.whatsapp = { ...(repaired.paymentSettings.whatsapp || {}), ...rawPayIn.whatsapp, enabled: rawPayIn.whatsapp.enabled };
}
if (rawPayIn.creditCard && typeof rawPayIn.creditCard.enabled === 'boolean') {
  repaired.paymentSettings.creditCard = { ...(repaired.paymentSettings.creditCard || {}), ...rawPayIn.creditCard, enabled: rawPayIn.creditCard.enabled };
}
if (rawPayIn.debitCard && typeof rawPayIn.debitCard.enabled === 'boolean') {
  repaired.paymentSettings.debitCard = { ...(repaired.paymentSettings.debitCard || {}), ...rawPayIn.debitCard, enabled: rawPayIn.debitCard.enabled };
}
if (rawPayIn.payOnPickup && typeof rawPayIn.payOnPickup.enabled === 'boolean') {
  repaired.paymentSettings.payOnPickup = { ...(repaired.paymentSettings.payOnPickup || {}), ...rawPayIn.payOnPickup, enabled: rawPayIn.payOnPickup.enabled };
}
const preservedPixEnabled = typeof rawPixIn.enabled === 'boolean'
? rawPixIn.enabled
: (typeof (repaired.paymentSettings.pix && repaired.paymentSettings.pix.enabled) === 'boolean' ? repaired.paymentSettings.pix.enabled : true);
const preservedPixKey = (rawPixIn.pixKey && !String(rawPixIn.pixKey).toLowerCase().includes('a confirmar'))
? String(rawPixIn.pixKey).trim()
: ((repaired.paymentSettings.pix && repaired.paymentSettings.pix.pixKey) || '+5528999871458');
const preservedKeyType = (rawPixIn.keyType && String(rawPixIn.keyType).trim())
? String(rawPixIn.keyType).trim().toLowerCase()
: ((repaired.paymentSettings.pix && repaired.paymentSettings.pix.keyType) || 'telefone');
const preservedRecipientName = (rawPixIn.recipientName && !String(rawPixIn.recipientName).toLowerCase().includes('a confirmar'))
? String(rawPixIn.recipientName).trim()
: ((repaired.paymentSettings.pix && repaired.paymentSettings.pix.recipientName) || 'BY ANGELY');
const preservedRecipientCity = (rawPixIn.recipientCity && String(rawPixIn.recipientCity).trim())
? String(rawPixIn.recipientCity).trim()
: ((repaired.paymentSettings.pix && repaired.paymentSettings.pix.recipientCity) || 'ITAPERUNA');
const preservedTxidPrefix = (rawPixIn.txidPrefix && String(rawPixIn.txidPrefix).trim())
? String(rawPixIn.txidPrefix).trim()
: ((repaired.paymentSettings.pix && repaired.paymentSettings.pix.txidPrefix) || 'BYANGELY');
repaired.paymentSettings.pix = {
...(repaired.paymentSettings.pix || {}),
enabled: preservedPixEnabled,
keyType: preservedKeyType,
pixKey: preservedPixKey,
recipientName: preservedRecipientName,
recipientCity: preservedRecipientCity,
txidPrefix: preservedTxidPrefix,
expirationMinutes: Math.max(1, Number((rawPixIn.expirationMinutes || (repaired.paymentSettings.pix && repaired.paymentSettings.pix.expirationMinutes))) || 15),
confirmationMode: (rawPixIn.confirmationMode) || (repaired.paymentSettings.pix && repaired.paymentSettings.pix.confirmationMode) || 'webhook_auto',
pspWebhookConfigured: rawPixIn.pspWebhookConfigured !== undefined ? Boolean(rawPixIn.pspWebhookConfigured) : true
};
return repaired;
};
}
function ensureV3DomElements() {
const header = document.getElementById('site-header');
if (header && !document.getElementById('header-search-bar')) {
const searchBar = document.createElement('div');
searchBar.id = 'header-search-bar';
searchBar.className = 'header-search-bar';
searchBar.style.cssText = 'display:none;background:#F7F7F7;border-top:1px solid #E4E4E7;padding:12px 0;box-shadow:0 8px 20px rgba(17,17,17,0.06);';
searchBar.innerHTML =
'<div class="container" style="display:flex;align-items:center;gap:8px;max-width:740px;">' +
'<form id="header-search-form" style="display:flex;align-items:center;gap:8px;flex:1;margin:0;" onsubmit="return false;">' +
'<div style="position:relative;flex:1;display:flex;align-items:center;">' +
'<input type="search" id="header-search-input" class="form-control" placeholder="Buscar por vestido, conjunto, blusa, calça, cor ou código..." aria-label="Buscar produtos na loja" style="width:100%;height:42px;padding:0 36px 0 14px;border-radius:999px;border:1px solid #D4D4D8;background:#FFFFFF;font-size:0.9rem;color:#111111;" autocomplete="off" />' +
'<button type="button" id="header-search-clear" data-action="clear-header-search" aria-label="Limpar busca" title="Limpar texto" style="display:none;position:absolute;right:10px;background:none;border:none;color:#52525B;font-size:1.1rem;cursor:pointer;padding:4px;line-height:1;">&times;</button>' +
'</div>' +
'<button type="submit" class="btn btn-primary btn-sm" id="header-search-submit" style="height:42px;padding:0 18px;border-radius:999px;font-size:0.8rem;font-weight:600;white-space:nowrap;">Buscar</button>' +
'<button type="button" class="btn btn-outline btn-sm" data-action="close-header-search" aria-label="Fechar busca" style="height:42px;padding:0 12px;border-radius:999px;font-size:0.78rem;">Fechar</button>' +
'</form>' +
'</div>' +
'<div id="header-search-results" class="container" style="max-width:740px;margin-top:8px;display:none;"></div>';
header.appendChild(searchBar);
}
if (!document.getElementById('order-detail-modal')) {
const modal = document.createElement('div');
modal.id = 'order-detail-modal';
modal.className = 'modal-backdrop';
modal.setAttribute('aria-hidden', 'true');
modal.setAttribute('role', 'dialog');
modal.setAttribute('aria-modal', 'true');
modal.setAttribute('aria-labelledby', 'order-detail-modal-title');
modal.innerHTML =
'<div class="modal-container" style="max-width:680px;">' +
'<div class="modal-header">' +
'<span class="modal-header-title" id="order-detail-modal-title">Detalhes do Pedido</span>' +
'<button type="button" class="drawer-close" data-action="close-order-detail-modal" aria-label="Fechar detalhes do pedido"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
'</div>' +
'<div id="order-detail-modal-body" style="padding:20px;max-height:78vh;overflow-y:auto;"></div>' +
'</div>';
document.body.appendChild(modal);
}
const legalLine = document.getElementById('footer-payment-legal-line') || Array.from(document.querySelectorAll('.footer-bottom p')).find((p) => p.textContent.includes('Compra segura'));
if (legalLine) {
legalLine.id = 'footer-payment-legal-line';
legalLine.textContent = 'Compra segura • Pix Dinâmico com Confirmação Automática e Atendimento Oficial via WhatsApp • Conformidade LGPD (Lei nº 13.709/2018) e Decreto nº 7.962/2013.';
}
}
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', ensureV3DomElements);
} else {
ensureV3DomElements();
}
AppState.selectedPaymentMethod = 'pix';
AppState.pendingPurchaseIntent = null;
AppState.showPurchaseAuthBanner = false;
AppState.pixPollIntervalId = null;
AppState.pixCountdownIntervalId = null;
AppState.pixRemainingSecondsMap = {};
const MANDATORY_LOGIN_MESSAGE =
'Para realizar sua compra, entre na sua conta ou crie seu cadastro. Assim, seus dados ficam salvos para facilitar suas próximas compras.';
const ORDER_STATUS_META = {
awaiting_payment: {
code: 'awaiting_payment',
step: 1,
label: 'Aguardando pagamento',
paymentLabel: 'Aguardando pagamento',
badgeClass: 'pending',
customerMessage: 'Realize o pagamento via Pix dentro do prazo de 15 minutos para confirmação automática do seu pedido.'
},
awaiting_confirmation: {
code: 'awaiting_confirmation',
step: 1,
label: 'Aguardando pagamento',
paymentLabel: 'Aguardando pagamento',
badgeClass: 'pending',
customerMessage: 'Realize o pagamento via Pix dentro do prazo de 15 minutos para confirmação automática do seu pedido.'
},
awaiting_whatsapp: {
code: 'awaiting_whatsapp',
step: 1,
label: 'Aguardando confirmação pelo WhatsApp',
paymentLabel: 'Aguardando atendimento via WhatsApp',
badgeClass: 'pending',
customerMessage: 'Seu pedido foi registrado e encaminhado para confirmação pelo WhatsApp oficial da BY ANGÉLY.'
},
payment_approved: {
code: 'payment_approved',
step: 2,
label: 'Pagamento aprovado • Aguardando separação',
paymentLabel: 'Pagamento aprovado',
badgeClass: 'confirmed',
customerMessage: 'Pagamento confirmado! Seu pedido foi recebido pela BY ANGÉLY e está aguardando separação.'
},
paid: {
code: 'paid',
step: 2,
label: 'Pagamento aprovado • Aguardando separação',
paymentLabel: 'Pagamento aprovado',
badgeClass: 'confirmed',
customerMessage: 'Pagamento confirmado! Seu pedido foi recebido pela BY ANGÉLY e está aguardando separação.'
},
awaiting_separation: {
code: 'awaiting_separation',
step: 3,
label: 'Aguardando separação',
paymentLabel: 'Pagamento aprovado',
badgeClass: 'confirmed',
customerMessage: 'Pagamento confirmado! Seu pedido foi recebido pela BY ANGÉLY e está aguardando separação.'
},
in_separation: {
code: 'in_separation',
step: 4,
label: 'Em separação',
paymentLabel: 'Pagamento aprovado',
badgeClass: 'confirmed',
customerMessage: 'Seu pedido está em separação.'
},
preparing: {
code: 'preparing',
step: 4,
label: 'Em separação',
paymentLabel: 'Pagamento aprovado',
badgeClass: 'confirmed',
customerMessage: 'Seu pedido está em separação.'
},
ready_for_shipping: {
code: 'ready_for_shipping',
step: 5,
label: 'Pedido pronto para envio ou retirada',
paymentLabel: 'Pagamento aprovado',
badgeClass: 'confirmed',
customerMessage: 'Seu pedido está pronto para envio ou retirada!'
},
shipped: {
code: 'shipped',
step: 6,
label: 'Enviado',
paymentLabel: 'Pagamento aprovado',
badgeClass: 'confirmed',
customerMessage: 'Seu pedido foi enviado! Confira o código de rastreio abaixo.'
},
out_for_delivery: {
code: 'out_for_delivery',
step: 7,
label: 'Saiu para entrega',
paymentLabel: 'Pagamento aprovado',
badgeClass: 'confirmed',
customerMessage: 'Seu pedido saiu para entrega no endereço informado.'
},
delivered: {
code: 'delivered',
step: 8,
label: 'Entregue',
paymentLabel: 'Pagamento aprovado',
badgeClass: 'confirmed',
customerMessage: 'Pedido entregue! Agradecemos por escolher a BY ANGÉLY.'
},
cancelled_expired: {
code: 'cancelled_expired',
step: 9,
label: 'Cancelado por falta de pagamento',
paymentLabel: 'Expirado / Não pago',
badgeClass: 'danger',
customerMessage: 'O prazo de 15 minutos para pagamento do QR Code Pix expirou e o pedido foi cancelado automaticamente.'
},
cancelled: {
code: 'cancelled',
step: 9,
label: 'Cancelado',
paymentLabel: 'Cancelado',
badgeClass: 'danger',
customerMessage: 'Este pedido foi cancelado.'
},
late_payment_reconciliation: {
code: 'late_payment_reconciliation',
step: 3,
label: 'Pagamento recebido após expiração (Em conciliação)',
paymentLabel: 'Pago (Em conciliação prioritária)',
badgeClass: 'pending',
customerMessage: 'Recebemos a confirmação do seu pagamento após o vencimento do QR Code. Nossa equipe já foi alertada para concluir a conciliação prioritária ou estorno imediato.'
}
};
function getOrderStatusMeta(order) {
if (!order) return ORDER_STATUS_META.awaiting_payment;
const raw = String(order.status || 'awaiting_payment').trim();
if (ORDER_STATUS_META[raw]) return ORDER_STATUS_META[raw];
return {
code: raw,
step: 1,
label: order.statusLabel || 'Aguardando pagamento',
paymentLabel: order.paymentStatus === 'paid' ? 'Pagamento aprovado' : 'Aguardando pagamento',
badgeClass: order.paymentStatus === 'paid' ? 'confirmed' : 'pending',
customerMessage: order.statusLabel || ''
};
}
function normalizeSearchText(str) {
if (!str) return '';
return String(str)
.toLowerCase()
.normalize('NFD')
.replace(/[\u0300-\u036f]/g, '')
.trim();
}
function formatCountdownMMSS(totalSeconds) {
const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
const m = Math.floor(sec / 60);
const s = sec % 60;
return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
function getAvailableCheckoutPaymentOptions(paySettings) {
const pay = paySettings || (AppState.db && AppState.db.paymentSettings) || {};
const options = [];
if (pay.pix && pay.pix.enabled && isPaymentOptionConfigured('pix', pay)) {
options.push({
id: 'pix',
label: 'Pix Automático (QR Code e Copia e Cola — Confirmação Imediata)'
});
}
if (pay.whatsapp && pay.whatsapp.enabled && isPaymentOptionConfigured('whatsapp', pay)) {
options.push({
id: 'whatsapp',
label: pay.whatsapp.title || 'Atendimento e Finalização pelo WhatsApp'
});
}
if (pay.creditCard && pay.creditCard.enabled && isPaymentOptionConfigured('creditCard', pay)) {
options.push({
id: 'creditCard',
label: 'Cartão de Crédito pelo Site (Ambiente Seguro)'
});
}
if (pay.debitCard && pay.debitCard.enabled && isPaymentOptionConfigured('debitCard', pay)) {
options.push({
id: 'debitCard',
label: 'Cartão de Débito pelo Site (Ambiente Seguro)'
});
}
if (pay.payOnPickup && pay.payOnPickup.enabled && isPaymentOptionConfigured('payOnPickup', pay)) {
options.push({
id: 'payOnPickup',
label: pay.payOnPickup.title || 'Pagamento na Retirada (Itaperuna - RJ)'
});
}
return options;
}
function requireCustomerAuthForPurchase(intent) {
if (AppState.currentCustomer && AppState.currentCustomer.email) {
return true;
}
AppState.pendingPurchaseIntent = intent || null;
AppState.showPurchaseAuthBanner = true;
const pdpModal = document.getElementById('product-detail-modal');
if (pdpModal) {
pdpModal.classList.remove('open');
pdpModal.setAttribute('aria-hidden', 'true');
}
closeCartDrawer();
closeMobileMenu();
showToast(MANDATORY_LOGIN_MESSAGE, 'info');
navigateTo('account');
return false;
}
function syncCustomerCartToServer() {
if (!AppState.currentCustomer || !AppState.currentCustomer.id) return;
AppState.currentCustomer.savedCart = JSON.parse(JSON.stringify(AppState.cart || []));
try {
localStorage.setItem(STORAGE_KEY_CUSTOMER_SESSION, JSON.stringify(AppState.currentCustomer));
} catch (e) {}
const dbCust = (AppState.db && AppState.db.customers || []).find(
(c) => c.id === AppState.currentCustomer.id || (c.email && c.email.toLowerCase() === AppState.currentCustomer.email.toLowerCase())
);
if (dbCust) {
dbCust.savedCart = JSON.parse(JSON.stringify(AppState.cart || []));
}
const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';
const headers = { 'Content-Type': 'application/json' };
if (AppState.currentCustomer.token) {
headers['Authorization'] = 'Bearer ' + AppState.currentCustomer.token;
}
fetch(apiBase + '/api/customer/profile', {
method: 'PUT',
headers,
body: JSON.stringify({
customerId: AppState.currentCustomer.id,
savedCart: AppState.cart
})
}).catch(() => {});
}
function resumePendingPurchaseIntent() {
const intent = AppState.pendingPurchaseIntent;
AppState.pendingPurchaseIntent = null;
AppState.showPurchaseAuthBanner = false;
if (!intent) return false;
if (intent.type === 'add_to_cart' && intent.productId) {
const added = addToCart(intent.productId, intent.size, intent.color, intent.qty || 1, intent.options || {});
if (added && intent.options && intent.options.goToCheckout) {
AppState.lastCreatedOrder = null;
navigateTo('checkout');
return true;
}
if (added) {
navigateTo('catalog');
openCartDrawer();
return true;
}
}
if (intent.type === 'checkout') {
navigateTo('checkout');
return true;
}
return false;
}
function addToCart(productId, size, color, qty = 1, options = {}) {
if (!requireCustomerAuthForPurchase({ type: 'add_to_cart', productId, size, color, qty, options })) {
return false;
}
const product = AppState.db.products.find((p) => p.id === productId);
if (!product) return false;
const cleanSize = isValidClothingSize(size)
? String(size).trim()
: (Array.isArray(product.sizes) ? (product.sizes.find(isValidClothingSize) || '') : '');
const cleanColor = isValidColorName(color)
? String(color).trim()
: (Array.isArray(product.colors) && product.colors[0] ? (product.colors[0].name || '') : '');
const available = getVariationStock(product, cleanSize, cleanColor);
if (available <= 0) {
showToast('Esta variação de tamanho e cor está sem estoque.', 'danger');
return false;
}
const key = `${productId}__${cleanSize}__${cleanColor}`;
const existing = AppState.cart.find((item) => item.key === key);
if (existing) {
if (existing.quantity + qty > available) {
showToast(`Estoque máximo atingido (${available} un. disponíveis para ${cleanSize} / ${cleanColor}).`, 'warning');
return false;
}
existing.quantity += qty;
} else {
const normCat = normalizeCategorySlug(product.category || product.categoryName || 'vestidos');
const fb = CATEGORY_COVER_FALLBACKS[normCat] || CATEGORY_COVER_FALLBACKS.vestidos;
const firstImg = (product.media && product.media.find((m) => m.type === 'image' && m.url)) || { url: fb };
AppState.cart.push({
key,
productId: product.id,
sku: product.sku,
name: product.name,
size: cleanSize,
color: cleanColor,
unitPrice: getEffectivePrice(product),
imageUrl: firstImg.url,
isDemo: !!product.isDemo,
quantity: qty
});
}
saveCart();
syncCustomerCartToServer();
renderCartDrawer();
if (!options.skipOpenDrawer) {
openCartDrawer();
}
showToast(`"${product.name}" (${cleanSize} • ${cleanColor}) adicionado à sacola!`, 'success');
return true;
}
function getFilteredProducts() {
const f = AppState.filters;
const rawQuery = normalizeSearchText(f.search || '');
const queryWords = rawQuery ? rawQuery.split(/\s+/).filter(Boolean) : [];
return AppState.db.products
.filter((p) => p.status === 'published')
.filter((p) => {
if (queryWords.length > 0) {
const searchableBlob = normalizeSearchText([
p.name,
p.shortDescription,
p.description,
p.sku,
p.style,
p.categoryName,
p.category,
p.fabricInfo,
...(Array.isArray(p.colors) ? p.colors.map((c) => c.name) : []),
...(Array.isArray(p.sizes) ? p.sizes : [])
].join(' '));
const allWordsMatch = queryWords.every((w) => searchableBlob.includes(w));
if (!allWordsMatch) return false;
}
if (f.category !== 'all' && !matchesCategory(p, f.category)) return false;
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
const aReal = !a.isDemo ? 1 : 0;
const bReal = !b.isDemo ? 1 : 0;
if (aReal !== bReal) return bReal - aReal;
return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
});
}
function renderHomeView() {
const settings = AppState.db.storeSettings || {};
const hero = settings.heroBanner || {};
const story = settings.brandStory || {};
const vis = {
hero: true,
featured: true,
newArrivals: true,
promotions: true,
categories: true,
brandStory: true,
...(settings.homeSections || {})
};
const publishedProducts = AppState.db.products.filter((p) => p.status === 'published');
const featuredProducts = [
...publishedProducts.filter((p) => !p.isDemo),
...publishedProducts.filter((p) => p.isDemo && p.isFeatured),
...publishedProducts.filter((p) => p.isDemo && !p.isFeatured)
].slice(0, 8);
const newProducts = publishedProducts.filter((p) => p.isNew).slice(0, 4);
const promoProducts = publishedProducts.filter((p) => p.isPromo).slice(0, 4);
const categories = [...(AppState.db.categories || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
return `
${vis.hero !== false ? `
<!-- 1. Identidade da Loja e Coleção -->
<section class="hero-section" aria-label="Apresentação da Coleção By Angély">
<div class="container hero-grid">
<div class="hero-content">
<span class="hero-eyebrow">${escapeHtml(hero.eyebrow || 'MODA FEMININA • ITAPERUNA, RJ')}</span>
<h1 class="hero-title">${escapeHtml(hero.title || 'Elegância natural em cada detalhe.')}</h1>
<p class="hero-subtitle">${escapeHtml(hero.subtitle || '')}</p>
<div class="hero-actions">
<button type="button" class="btn btn-primary" data-action="go-catalog">
${escapeHtml(hero.ctaPrimaryText || 'Ver Coleção')}
</button>
<button type="button" class="btn btn-outline" data-action="filter-promo">
${escapeHtml(hero.ctaSecondaryText || 'Ofertas Especiais')}
</button>
</div>
</div>
<div class="hero-media-wrapper">
<img src="${escapeHtml(hero.imageUrl || CATEGORY_COVER_FALLBACKS.vestidos)}" alt="${escapeHtml(hero.imageAlt || 'Coleção By Angély')}" data-fallback-src="${escapeHtml(CATEGORY_COVER_FALLBACKS.vestidos)}" onerror="window.ByAngelyHandleMediaError && window.ByAngelyHandleMediaError(this, 'Coleção BY ANGÉLY')" />
</div>
</div>
</section>
` : ''}
${vis.featured !== false ? `
<!-- 2. Produtos em Destaque -->
<section class="section-block bg-surface" aria-labelledby="sec-feat-title">
<div class="container">
<div class="section-header">
<div>
<span class="section-eyebrow">Curadoria BY ANGÉLY</span>
<h2 id="sec-feat-title" class="section-title">Peças em Destaque</h2>
<p class="section-description">Modelagens elegantes e tecidos selecionados. Toque em qualquer peça para ver detalhes e tamanhos.</p>
</div>
<button type="button" class="btn btn-outline btn-sm" data-action="go-catalog">Ver Catálogo (${publishedProducts.length})</button>
</div>
<div class="products-grid">
${featuredProducts.map(renderProductCard).join('')}
</div>
</div>
</section>
` : ''}
${vis.newArrivals !== false && newProducts.length > 0 ? `
<!-- 3. Novidades da Coleção -->
<section class="section-block" aria-labelledby="sec-new-title">
<div class="container">
<div class="section-header">
<div>
<span class="section-eyebrow">Lançamentos</span>
<h2 id="sec-new-title" class="section-title">Novidades da Coleção</h2>
</div>
<button type="button" class="btn btn-outline btn-sm" data-action="go-catalog">Ver Todas as Peças</button>
</div>
<div class="products-grid">
${newProducts.map(renderProductCard).join('')}
</div>
</div>
</section>
` : ''}
${vis.promotions !== false && promoProducts.length > 0 ? `
<!-- 4. Promoções e Condições Especiais -->
<section class="section-block bg-surface" aria-labelledby="sec-promo-title">
<div class="container">
<div class="section-header">
<div>
<span class="section-eyebrow">Oportunidades</span>
<h2 id="sec-promo-title" class="section-title">Promoções Selecionadas</h2>
<p class="section-description">Peças com desconto especial por tempo limitado.</p>
</div>
<button type="button" class="btn btn-gold btn-sm" data-action="filter-promo">Ver Promoções</button>
</div>
<div class="products-grid">
${promoProducts.map(renderProductCard).join('')}
</div>
</div>
</section>
` : ''}
${vis.categories !== false ? `
<!-- 5. Categorias da Loja -->
<section class="section-block" aria-labelledby="sec-cat-title">
<div class="container">
<div class="section-header">
<div>
<span class="section-eyebrow">Navegação Rápida</span>
<h2 id="sec-cat-title" class="section-title">Explore por Categoria</h2>
</div>
<button type="button" class="btn btn-outline btn-sm" data-action="go-catalog">Catálogo Completo</button>
</div>
<div class="categories-grid">
${categories.map((cat) => {
const normSlug = normalizeCategorySlug(cat.slug || cat.name);
const fbImg = CATEGORY_COVER_FALLBACKS[normSlug] || CATEGORY_COVER_FALLBACKS.vestidos;
const imgUrl = (cat.imageUrl && String(cat.imageUrl).trim().length > 8) ? cat.imageUrl : fbImg;
const countInCat = publishedProducts.filter((p) => matchesCategory(p, cat.slug)).length;
return `
<button type="button" class="category-card" data-action="filter-category" data-category="${escapeHtml(cat.slug)}" aria-label="Explorar categoria ${escapeHtml(cat.name)}">
<img src="${escapeHtml(imgUrl)}" alt="Categoria ${escapeHtml(cat.name)}" data-fallback-src="${escapeHtml(fbImg)}" onerror="window.ByAngelyHandleMediaError && window.ByAngelyHandleMediaError(this, '${escapeHtml(cat.name)}')" />
<div class="category-card-overlay">
<span class="category-card-title">${escapeHtml(cat.name)}</span>
<span class="category-card-sub">${countInCat > 0 ? countInCat + (countInCat === 1 ? ' peça →' : ' peças →') : 'Explorar →'}</span>
</div>
</button>
`;
}).join('')}
</div>
</div>
</section>
` : ''}
${vis.brandStory !== false ? `
<!-- 6. A Essência By Angély -->
<section class="section-block bg-surface" aria-labelledby="sec-story-title">
<div class="container">
<div class="hero-grid" style="min-height:auto;">
<div class="hero-media-wrapper" style="aspect-ratio: 4 / 3.2;">
<img src="${escapeHtml(story.imageUrl || CATEGORY_COVER_FALLBACKS.conjuntos)}" alt="By Angély — Itaperuna, RJ" data-fallback-src="${escapeHtml(CATEGORY_COVER_FALLBACKS.conjuntos)}" onerror="window.ByAngelyHandleMediaError && window.ByAngelyHandleMediaError(this, 'Essência BY ANGÉLY')" />
</div>
<div class="hero-content">
<span class="section-eyebrow">Boutique Feminina • Itaperuna, RJ</span>
<h2 id="sec-story-title" class="section-title" style="margin-bottom:14px;">${escapeHtml(story.title || 'A Essência By Angély')}</h2>
<p style="font-size:1.02rem;font-weight:500;color:var(--text-primary);margin-bottom:12px;">
${escapeHtml(story.lead || '')}
</p>
<p style="color:var(--text-secondary);margin-bottom:20px;">
${escapeHtml(story.body || '')}
</p>
<div style="display:flex;gap:12px;flex-wrap:wrap;">
<a href="${escapeHtml(getOfficialContacts().instagramUrl)}" target="_blank" rel="noopener noreferrer" class="contact-btn-action instagram-style">
${OFFICIAL_ICONS.instagram}
<span>Instagram Oficial</span>
</a>
<a href="${escapeHtml(getOfficialContacts().whatsappUrl)}" target="_blank" rel="noopener noreferrer" class="contact-btn-action whatsapp-style">
${OFFICIAL_ICONS.whatsapp}
<span>Atendimento no WhatsApp</span>
</a>
</div>
</div>
</div>
</div>
</section>
` : ''}
`;
}
function renderProductModalContent() {
const state = AppState.activeProductModal;
const product = AppState.db.products.find((p) => p.id === state.productId);
const container = document.getElementById('product-modal-body');
if (!product || !container) return;
const effectivePrice = getEffectivePrice(product);
const hasPromo = effectivePrice < Number(product.price);
const currentVarStock = getVariationStock(product, state.selectedSize, state.selectedColor);
const selectedQty = Math.max(1, Math.min(Number(state.quantity) || 1, Math.max(1, currentVarStock)));
state.quantity = selectedQty;
const normCat = normalizeCategorySlug(product.category || product.categoryName || 'vestidos');
const fallbackUrl = CATEGORY_COVER_FALLBACKS[normCat] || CATEGORY_COVER_FALLBACKS.vestidos;
const mediaList = product.media && product.media.length > 0 ? product.media : [
{ type: 'image', url: fallbackUrl, alt: product.name }
];
const activeMedia = mediaList[state.mediaIndex] || mediaList[0];
const productReviews = (AppState.db.reviews || []).filter(
(r) => r && r.productId === product.id && r.status !== 'hidden' && r.status !== 'rejected'
);
const avgRating = productReviews.length > 0
? (productReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / productReviews.length).toFixed(1)
: null;
const isFav = AppState.wishlist.includes(product.id);
const cust = AppState.currentCustomer;
const alreadyReviewed = Boolean(
cust && productReviews.some(
(r) =>
(r.customerId && r.customerId === cust.id) ||
(r.customerEmail && cust.email && r.customerEmail.toLowerCase() === cust.email.toLowerCase())
)
);
container.innerHTML = `
<div class="pdp-grid">
<div>
<div class="pdp-main-media">
${activeMedia.type === 'video' ? `
<video src="${escapeHtml(activeMedia.url)}" poster="${escapeHtml(activeMedia.poster || '')}" controls playsinline aria-label="${escapeHtml(activeMedia.alt || product.name)}"></video>
` : `
<img src="${escapeHtml(activeMedia.url)}" alt="${escapeHtml(activeMedia.alt || product.name)}" id="pdp-active-img" data-fallback-src="${escapeHtml(fallbackUrl)}" onerror="window.ByAngelyHandleMediaError && window.ByAngelyHandleMediaError(this, '${escapeHtml(product.name)}')" />
<button type="button" class="pdp-zoom-btn" data-action="zoom-image" data-url="${escapeHtml(activeMedia.url)}" data-alt="${escapeHtml(activeMedia.alt || product.name)}">
Ampliar Imagem
</button>
`}
</div>
<div class="pdp-thumbs" role="tablist" aria-label="Galeria de fotos e vídeos do produto">
${mediaList.map((m, idx) => `
<button type="button" class="pdp-thumb-btn ${idx === state.mediaIndex ? 'active' : ''}" data-action="select-pdp-media" data-index="${idx}" aria-label="${m.type === 'video' ? 'Reproduzir vídeo' : 'Ver foto ' + (idx + 1)}">
${m.type === 'video' ? `
<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#111111;color:#FFFFFF;font-size:0.72rem;font-weight:700;">▶ VÍDEO</div>
` : `
<img src="${escapeHtml(m.url)}" alt="Miniatura ${idx + 1}" data-fallback-src="${escapeHtml(fallbackUrl)}" onerror="window.ByAngelyHandleMediaError && window.ByAngelyHandleMediaError(this, 'Miniatura')" />
`}
</button>
`).join('')}
</div>
</div>
<div>
<div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">
<span>${escapeHtml(product.categoryName || product.category)} ${product.style ? '• ' + escapeHtml(product.style) : ''}</span>
<span>Cód: ${escapeHtml(product.sku)}</span>
</div>
<h2 style="font-family:var(--font-serif);font-size:1.95rem;font-weight:600;line-height:1.15;margin-bottom:8px;">
${escapeHtml(product.name)}
</h2>
${avgRating ? `
<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;font-size:0.84rem;color:var(--accent-gold);">
<span>★ ${avgRating}</span>
<span style="color:var(--text-secondary);">(${productReviews.length} ${productReviews.length === 1 ? 'avaliação' : 'avaliações'})</span>
</div>
` : ''}
<div style="display:flex;align-items:baseline;gap:12px;margin-bottom:14px;">
<span style="font-size:1.5rem;font-weight:700;color:var(--accent-brown);">${formatBRL(effectivePrice)}</span>
${hasPromo ? `<span style="font-size:0.98rem;color:var(--text-muted);text-decoration:line-through;">${formatBRL(product.price)}</span>` : ''}
</div>
<p style="color:var(--text-secondary);margin-bottom:18px;font-size:0.9rem;">
${escapeHtml(product.shortDescription || '')}
</p>
<div class="option-selector-group">
<div class="option-selector-label">
<span>Cor selecionada: <strong>${escapeHtml(state.selectedColor)}</strong></span>
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
<div class="option-selector-group">
<div class="option-selector-label">
<span>Tamanho: <strong>${escapeHtml(state.selectedSize)}</strong></span>
<span style="font-size:0.76rem;color:${currentVarStock > 0 ? 'var(--status-success-text)' : 'var(--status-danger-text)'};">
${currentVarStock > 0 ? `Disponível (${currentVarStock} un.)` : 'Indisponível nesta combinação'}
</span>
</div>
<div class="option-pills">
${(product.sizes || []).filter(isValidClothingSize).map((s) => {
const st = getVariationStock(product, s, state.selectedColor);
return `
<button type="button" class="option-pill ${state.selectedSize === s ? 'selected' : ''} ${st <= 0 ? 'out-of-stock' : ''}" data-action="select-pdp-size" data-size="${escapeHtml(s)}">
${escapeHtml(s)}
</button>
`;
}).join('')}
</div>
</div>
<div class="option-selector-group" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:16px;">
<div style="display:flex;align-items:center;gap:10px;">
<span style="font-size:0.76rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Quantidade:</span>
<div class="qty-stepper" role="group" aria-label="Selecionar quantidade">
<button type="button" data-action="pdp-qty-dec" aria-label="Diminuir quantidade" ${selectedQty <= 1 ? 'disabled' : ''}>−</button>
<span aria-live="polite">${selectedQty}</span>
<button type="button" data-action="pdp-qty-inc" aria-label="Aumentar quantidade" ${selectedQty >= currentVarStock ? 'disabled' : ''}>+</button>
</div>
</div>
<div style="display:flex;gap:8px;">
<button type="button" class="btn btn-outline btn-sm" data-action="toggle-wishlist" data-product-id="${escapeHtml(product.id)}" aria-label="Favoritar produto">
${isFav ? '♥ Salvo' : '♡ Favoritar'}
</button>
<button type="button" class="btn btn-outline btn-sm" data-action="share-product" data-product-id="${escapeHtml(product.id)}" aria-label="Compartilhar peça" title="Compartilhar">
↗
</button>
</div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0 10px;">
<button type="button" class="btn btn-primary" data-action="add-to-cart-modal" ${currentVarStock <= 0 ? 'disabled' : ''}>
${currentVarStock > 0 ? 'Adicionar à Sacola' : 'Variação Esgotada'}
</button>
<button type="button" class="btn btn-gold" data-action="buy-now-modal" ${currentVarStock <= 0 ? 'disabled' : ''}>
Comprar Agora
</button>
</div>
<div style="margin-bottom:18px;">
<a href="${escapeHtml(getProductWhatsappUrl(product, state.selectedSize, state.selectedColor, state.quantity))}" target="_blank" rel="noopener noreferrer" class="contact-btn-action whatsapp-style" style="width:100%;" id="pdp-whatsapp-product-link">
${OFFICIAL_ICONS.whatsapp}
<span>FALAR NO WHATSAPP SOBRE ESTA PEÇA</span>
</a>
</div>
<div style="border-top:1px solid var(--border-subtle);padding-top:14px;margin-top:14px;">
<details open style="margin-bottom:10px;">
<summary style="font-weight:600;font-size:0.88rem;cursor:pointer;padding:6px 0;">Descrição e Composição</summary>
<div style="font-size:0.85rem;color:var(--text-secondary);padding-top:8px;">
<p style="margin-bottom:8px;">${escapeHtml(product.description || '')}</p>
<p style="margin-bottom:4px;"><strong>Composição:</strong> ${escapeHtml(product.fabricInfo || 'Consulte a etiqueta da peça')}</p>
<p><strong>Conservação:</strong> ${escapeHtml(product.careInfo || 'Seguir instruções da etiqueta interna.')}</p>
</div>
</details>
${product.sizeChart && product.sizeChart.length > 0 ? `
<details style="margin-bottom:10px;border-top:1px solid var(--border-subtle);padding-top:10px;">
<summary style="font-weight:600;font-size:0.88rem;cursor:pointer;padding:6px 0;">Tabela de Medidas Referencial</summary>
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
<details style="margin-bottom:10px;border-top:1px solid var(--border-subtle);padding-top:10px;">
<summary style="font-weight:600;font-size:0.88rem;cursor:pointer;padding:6px 0;">Trocas, Entrega e Pagamento</summary>
<div style="font-size:0.82rem;color:var(--text-secondary);padding-top:8px;display:flex;flex-direction:column;gap:6px;line-height:1.5;">
<div><strong>Pagamento:</strong> Pix com QR Code ou Copia e Cola e atendimento oficial pelo WhatsApp.</div>
<div><strong>Entrega e Retirada:</strong> Frete por região/Correios com código de rastreio ou retirada em Itaperuna/RJ.</div>
<div><strong>Trocas e Devoluções:</strong> Até 7 dias corridos após o recebimento (com etiqueta e sem uso), solicitando direto em <em>Minha Conta → Trocas e Devoluções</em>.</div>
</div>
</details>
<!-- Avaliações de Clientes (1 a 5 estrelas, comentário opcional, cliente logada) -->
<details open style="border-top:1px solid var(--border-subtle);padding-top:10px;">
<summary style="font-weight:600;font-size:0.88rem;cursor:pointer;padding:6px 0;">
Avaliações das Clientes (${productReviews.length}) ${avgRating ? `• ★ ${avgRating}` : ''}
</summary>
<div style="padding-top:10px;">
${productReviews.length === 0 ? `
<p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:10px;">Esta peça ainda não possui avaliações. Seja a primeira cliente a avaliar!</p>
` : productReviews.map((rev) => `
<div style="background:var(--bg-primary);padding:10px 12px;border-radius:8px;margin-bottom:8px;font-size:0.82rem;">
<div style="display:flex;justify-content:space-between;margin-bottom:4px;">
<strong>${escapeHtml(rev.customerName)}</strong>
<span style="color:var(--accent-gold);">${'★'.repeat(Math.max(1, Math.min(5, Number(rev.rating) || 5)))}${'☆'.repeat(5 - Math.max(1, Math.min(5, Number(rev.rating) || 5)))} • ${escapeHtml(rev.date)}</span>
</div>
${rev.comment ? `<p style="color:var(--text-secondary);">${escapeHtml(rev.comment)}</p>` : ''}
</div>
`).join('')}
${!cust ? `
<div style="margin-top:10px;padding:12px;background:var(--bg-primary);border:1px dashed var(--border-strong);border-radius:8px;text-align:center;">
<p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:8px;">Entre na sua conta para avaliar esta peça.</p>
<button type="button" class="btn btn-outline btn-sm" data-action="close-pdp-go-login">Entrar para Avaliar</button>
</div>
` : alreadyReviewed ? `
<p style="font-size:0.8rem;color:var(--status-success-text);margin-top:8px;">✓ Você já registrou sua avaliação para esta peça. Obrigada!</p>
` : `
<form id="pdp-review-form" data-product-id="${escapeHtml(product.id)}" style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--border-subtle);">
<p style="font-size:0.8rem;font-weight:600;margin-bottom:8px;">Avaliar como ${escapeHtml(cust.name)}:</p>
<div style="margin-bottom:8px;">
<label style="display:block;font-size:0.75rem;margin-bottom:4px;">Nota (1 a 5 estrelas) *</label>
<select name="rating" class="form-control" required>
<option value="5">★★★★★ — 5 Estrelas (Excelente)</option>
<option value="4">★★★★☆ — 4 Estrelas (Muito Bom)</option>
<option value="3">★★★☆☆ — 3 Estrelas (Bom / Regular)</option>
<option value="2">★★☆☆☆ — 2 Estrelas (Abaixo do esperado)</option>
<option value="1">★☆☆☆☆ — 1 Estrela (Insatisfeita)</option>
</select>
</div>
<textarea name="comment" rows="2" class="form-control" placeholder="Comentário opcional sobre caimento, tecido e acabamento..." style="margin-bottom:8px;"></textarea>
<button type="submit" class="btn btn-subtle btn-sm">Enviar Avaliação</button>
</form>
`}
</div>
</details>
</div>
</div>
</div>
`;
const reviewForm = document.getElementById('pdp-review-form');
if (reviewForm) {
reviewForm.addEventListener('submit', async (e) => {
e.preventDefault();
if (!AppState.currentCustomer) {
showToast('Entre na sua conta para enviar uma avaliação.', 'warning');
return;
}
const existingDup = (AppState.db.reviews || []).some(
(r) =>
r &&
r.productId === product.id &&
((r.customerId && r.customerId === AppState.currentCustomer.id) ||
(r.customerEmail && r.customerEmail.toLowerCase() === AppState.currentCustomer.email.toLowerCase()))
);
if (existingDup) {
showToast('Você já avaliou este produto.', 'warning');
return;
}
const fd = new FormData(reviewForm);
const ratingNum = Math.max(1, Math.min(5, Number(fd.get('rating')) || 5));
const commentText = String(fd.get('comment') || '').trim();
const revHeaders = { 'Content-Type': 'application/json' };
if (AppState.currentCustomer && AppState.currentCustomer.token) {
  revHeaders['Authorization'] = 'Bearer ' + AppState.currentCustomer.token;
}
try {
  const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';
  const res = await fetch(apiBase + '/api/public/reviews', {
    method: 'POST',
    headers: revHeaders,
    body: JSON.stringify({ productId: product.id, rating: ratingNum, comment: commentText })
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || !data.ok) {
    showToast((data && data.error) || 'Não foi possível registrar a avaliação.', 'danger');
    return;
  }
  AppState.db.reviews = AppState.db.reviews || [];
  AppState.db.reviews.unshift(data.review);
  saveDatabase();
  renderProductModalContent();
  showToast('Avaliação registrada com sucesso!', 'success');
} catch (_err) {
  showToast('Erro de conexão ao registrar avaliação.', 'danger');
}
});
}
}
function renderCheckoutView() {
if (AppState.lastCreatedOrder) {
return renderOrderConfirmationScreen(AppState.lastCreatedOrder);
}
if (!AppState.currentCustomer || !AppState.currentCustomer.email) {
AppState.pendingPurchaseIntent = { type: 'checkout' };
AppState.showPurchaseAuthBanner = true;
const cartTotals = AppState.cart.length > 0 ? calculateCartTotals() : null;
const itemsCount = AppState.cart.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
return `
<section class="section-block" id="view-checkout-auth-step">
  <div class="container">
    <div class="section-header" style="margin-bottom:18px;">
      <div>
        <span class="section-eyebrow">BY ANGÉLY • Checkout Seguro</span>
        <h1 class="section-title">Finalização da Compra</h1>
        <p style="font-size:0.86rem;color:var(--text-secondary);">Identifique-se para confirmar endereço de entrega e gerar o pagamento do pedido.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" class="btn btn-outline btn-sm" data-action="open-cart-page">← Ver Sacola (${itemsCount})</button>
        <button type="button" class="btn btn-outline btn-sm" data-action="go-catalog">Continuar Comprando</button>
      </div>
    </div>
    <div class="checkout-step-bar" aria-label="Etapas do Checkout">
      <div class="checkout-step-pill active"><strong>1. Identificação</strong> • Entrar ou criar conta</div>
      <div class="checkout-step-pill"><strong>2. Entrega e Frete</strong> • Endereço e modalidade</div>
      <div class="checkout-step-pill"><strong>3. Pagamento</strong> • Pix ou WhatsApp</div>
    </div>
    <div class="cart-page-grid" style="align-items:start;">
      <div>
        ${renderCustomerAuthScreen('checkout')}
      </div>
      <aside class="admin-card" aria-label="Resumo da Sacola no Checkout">
        <span class="section-eyebrow">Resumo da Sacola</span>
        <h2 style="font-family:var(--font-serif);font-size:1.35rem;margin-bottom:12px;">${itemsCount} ${itemsCount === 1 ? 'peça selecionada' : 'peças selecionadas'}</h2>
        ${cartTotals && AppState.cart.length > 0 ? `
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
            ${AppState.cart.map((it) => `
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:0.84rem;padding:8px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;">
                <div style="min-width:0;">
                  <strong style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(it.name)}</strong>
                  <span style="font-size:0.75rem;color:var(--text-secondary);">Qtd: ${it.quantity}${isValidClothingSize(it.size) ? ' • Tam: ' + escapeHtml(it.size) : ''}</span>
                </div>
                <strong>${formatBRL((Number(it.unitPrice) || 0) * (Number(it.quantity) || 1))}</strong>
              </div>
            `).join('')}
          </div>
          <div style="border-top:1px solid var(--border-subtle);padding-top:10px;display:flex;flex-direction:column;gap:6px;font-size:0.86rem;">
            <div style="display:flex;justify-content:space-between;"><span>Subtotal</span><strong>${formatBRL(cartTotals.subtotal)}</strong></div>
            ${cartTotals.discount > 0 ? `<div style="display:flex;justify-content:space-between;"><span>Desconto</span><strong>-${formatBRL(cartTotals.discount)}</strong></div>` : ''}
            <div style="display:flex;justify-content:space-between;"><span>Entrega</span><span>${cartTotals.shippingMethod && cartTotals.shippingMethod.priceStatus === 'confirmed' ? formatBRL(cartTotals.shippingCost) : 'A confirmar'}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:1.05rem;font-weight:700;padding-top:8px;border-top:1px solid var(--border-strong);"><span>Total Previsto</span><span>${formatBRL(cartTotals.total)}</span></div>
          </div>
        ` : `
          <p style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:14px;">Sua sacola está vazia no momento. Entre na sua conta ou adicione peças do catálogo.</p>
          <button type="button" class="btn btn-primary btn-block btn-sm" data-action="go-catalog">Explorar Catálogo</button>
        `}
      </aside>
    </div>
  </div>
</section>
`;
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
const activePaymentOptions = getAvailableCheckoutPaymentOptions(paySettings);
if (activePaymentOptions.length > 0 && !activePaymentOptions.some((o) => o.id === AppState.selectedPaymentMethod)) {
AppState.selectedPaymentMethod = activePaymentOptions[0].id;
}
const isWhatsappSelected = AppState.selectedPaymentMethod === 'whatsapp';
const cust = AppState.currentCustomer || {};
const savedAddresses = Array.isArray(cust.addresses) && cust.addresses.length > 0 ? cust.addresses : [];
const selectedAddrIdx = Math.min(Number(AppState.selectedCheckoutAddressIndex) || 0, Math.max(0, savedAddresses.length - 1));
const defaultAddr = savedAddresses[selectedAddrIdx] || {};
const splitCityState = String(defaultAddr.cityState || '').split('-').map((s) => s.trim());
const addrCity = defaultAddr.city || splitCityState[0] || 'Itaperuna';
const addrState = defaultAddr.state || splitCityState[1] || 'RJ';
return `
<section class="section-block">
<div class="container">
<div class="section-header" style="margin-bottom:24px;">
<div>
<span class="section-eyebrow">BY ANGÉLY • Checkout Seguro</span>
<h1 class="section-title">Revisão de Dados, Entrega e Pagamento</h1>
<p style="font-size:0.86rem;color:var(--text-secondary);">Logada como <strong>${escapeHtml(cust.name)}</strong> (${escapeHtml(cust.email)}) — seus dados foram preenchidos automaticamente.</p>
</div>
<button type="button" class="btn btn-outline btn-sm" data-action="go-catalog">← Continuar Comprando</button>
</div>
<form id="checkout-order-form" class="checkout-layout">
<div>
<!-- Etapa 1: Dados da Cliente -->
<div class="admin-card">
<h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:14px;">1. Dados da Cliente</h2>
<div class="sac-form-grid">
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Nome Completo *</label>
<input type="text" name="customerName" class="form-control" required value="${escapeHtml(cust.name || '')}" />
</div>
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">WhatsApp / Telefone com DDD *</label>
<input type="tel" name="customerPhone" class="form-control" required value="${escapeHtml(cust.phone || '')}" />
</div>
</div>
<div class="sac-form-grid">
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">E-mail da Conta *</label>
<input type="email" name="customerEmail" class="form-control" required readonly value="${escapeHtml(cust.email || '')}" style="background:var(--bg-primary);" />
</div>
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">CPF (Para nota / identificação do pagamento)</label>
<input type="text" name="customerCpf" class="form-control" value="${escapeHtml(cust.cpf && cust.cpf !== 'Não informado' ? cust.cpf : '')}" placeholder="000.000.000-00" />
</div>
</div>
</div>
<!-- Etapa 2: Endereço Permanente e Entrega -->
<div class="admin-card">
<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px;">
<h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:0;">2. Endereço de Entrega e Modalidade</h2>
${savedAddresses.length > 1 ? `
<select id="checkout-saved-address-select" class="form-control" style="max-width:260px;font-size:0.82rem;">
${savedAddresses.map((a, idx) => `
<option value="${idx}" ${idx === selectedAddrIdx ? 'selected' : ''}>
${escapeHtml(a.label || ('Endereço ' + (idx + 1)))}: ${escapeHtml(a.street || '')}, ${escapeHtml(a.number || '')}
</option>
`).join('')}
</select>
` : ''}
</div>
<div style="margin-bottom:16px;">
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:6px;">Modalidade de Recebimento *</label>
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
<div class="sac-form-grid">
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">CEP *</label>
<input type="text" name="zipCode" id="checkout-cep" class="form-control" required value="${escapeHtml(defaultAddr.zipCode || '28300-000')}" placeholder="28300-000" />
</div>
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Endereço (Rua / Avenida) *</label>
<input type="text" name="street" id="checkout-street" class="form-control" required value="${escapeHtml(defaultAddr.street || '')}" placeholder="Nome da rua ou avenida" />
</div>
</div>
<div class="sac-form-grid">
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Número *</label>
<input type="text" name="number" class="form-control" required value="${escapeHtml(defaultAddr.number || '')}" placeholder="Nº" />
</div>
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Complemento</label>
<input type="text" name="complement" class="form-control" value="${escapeHtml(defaultAddr.complement || '')}" placeholder="Apto, bloco, casa (opcional)" />
</div>
</div>
<div class="sac-form-grid">
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Bairro *</label>
<input type="text" name="neighborhood" id="checkout-neighborhood" class="form-control" required value="${escapeHtml(defaultAddr.neighborhood || '')}" placeholder="Bairro" />
</div>
<div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;">
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Cidade *</label>
<input type="text" name="city" id="checkout-city" class="form-control" required value="${escapeHtml(addrCity)}" placeholder="Itaperuna" />
</div>
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Estado (UF) *</label>
<input type="text" name="state" id="checkout-state" class="form-control" required maxlength="2" value="${escapeHtml(addrState)}" placeholder="RJ" />
</div>
</div>
</div>
<div style="margin-bottom:10px;">
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Referência para entrega (Opcional)</label>
<input type="text" name="reference" class="form-control" value="${escapeHtml(defaultAddr.reference || '')}" placeholder="Próximo a..." />
</div>
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Observações do Pedido (Opcional)</label>
<input type="text" name="customerNotes" class="form-control" placeholder="Alguma observação especial para a separação ou entrega?" />
</div>
</div>
<!-- Etapa 3: Forma de Pagamento (Pix Automático 15 min ou WhatsApp) -->
<div class="admin-card" id="checkout-payment-step-card">
<h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:14px;">3. Forma de Pagamento</h2>
<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;" id="checkout-active-payment-list">
${activePaymentOptions.map((opt) => `
<label style="display:flex;align-items:center;gap:10px;padding:12px;border:1px solid ${AppState.selectedPaymentMethod === opt.id ? 'var(--accent-gold)' : 'var(--border-subtle)'};border-radius:6px;background:${AppState.selectedPaymentMethod === opt.id ? 'var(--bg-accent-subtle)' : 'var(--bg-surface)'};cursor:pointer;">
<input type="radio" name="paymentMethod" value="${escapeHtml(opt.id)}" ${AppState.selectedPaymentMethod === opt.id ? 'checked' : ''} />
<strong style="font-size:0.92rem;">${escapeHtml(opt.label)}</strong>
</label>
`).join('')}
</div>
${AppState.selectedPaymentMethod === 'pix' ? `
<div class="alert-box alert-info" style="margin-bottom:0;">
<p style="margin-bottom:6px;"><strong>⚡ Pagamento via Pix com Confirmação Automática (Prazo de ${Number(paySettings.pix.expirationMinutes) || 15} minutos):</strong></p>
<p style="margin-bottom:6px;font-size:0.84rem;">Ao confirmar, o sistema gera o <strong>QR Code Pix</strong> e o código <strong>Pix Copia e Cola</strong> no valor exato de <strong>${formatBRL(totals.total)}</strong>. Assim que o pagamento é concluído no seu banco, o pedido é aprovado automaticamente e enviado para separação — sem precisar enviar comprovante!</p>
<p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0;">
Caso o pagamento não seja realizado em até <strong>${Number(paySettings.pix.expirationMinutes) || 15} minutos</strong>, o QR Code expira e o pedido é cancelado automaticamente.
</p>
</div>
` : ''}
${AppState.selectedPaymentMethod === 'whatsapp' ? `
<div class="alert-box alert-info" style="margin-bottom:0;">
<p style="margin-bottom:4px;"><strong>Atendimento e Finalização pelo WhatsApp Oficial:</strong></p>
<p style="font-size:0.82rem;">${escapeHtml(paySettings.whatsapp.instructions || 'Seu pedido será registrado e encaminhado para o WhatsApp oficial da BY ANGÉLY.')}</p>
</div>
` : ''}
</div>
</div>
<!-- Coluna Lateral: Resumo do Pedido -->
<div>
<div class="admin-card" style="position:sticky;top:98px;">
<h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:14px;">Resumo do Pedido</h2>
<div style="display:flex;flex-direction:column;gap:10px;max-height:280px;overflow-y:auto;margin-bottom:14px;padding-right:4px;">
${AppState.cart.map((item) => {
const sizePart = isValidClothingSize(item.size) ? `Tam: ${escapeHtml(item.size)} | ` : '';
const colorPart = isValidColorName(item.color) ? `Cor: ${escapeHtml(item.color)} | ` : '';
return `
<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:0.84rem;padding-bottom:8px;border-bottom:1px solid var(--border-subtle);">
<div style="display:flex;align-items:center;gap:10px;">
<img src="${escapeHtml(item.imageUrl || CATEGORY_COVER_FALLBACKS.vestidos)}" alt="${escapeHtml(item.name)}" style="width:44px;height:56px;object-fit:cover;border-radius:6px;flex-shrink:0;" />
<div>
<strong>${escapeHtml(item.name)}</strong>
<div style="font-size:0.75rem;color:var(--text-secondary);">${sizePart}${colorPart}Qtd: ${item.quantity}x (${formatBRL(item.unitPrice)})</div>
</div>
</div>
<span style="font-weight:600;white-space:nowrap;">${formatBRL(item.unitPrice * item.quantity)}</span>
</div>
`;
}).join('')}
</div>
<div style="font-size:0.88rem;border-top:1px solid var(--border-subtle);padding-top:12px;margin-bottom:16px;">
<div style="display:flex;justify-content:space-between;margin-bottom:6px;">
<span>Subtotal dos produtos:</span>
<span>${formatBRL(totals.subtotal)}</span>
</div>
${totals.discount > 0 && AppState.appliedCoupon ? `
<div style="display:flex;justify-content:space-between;margin-bottom:6px;color:var(--status-success-text);">
<span>Cupom (${escapeHtml(AppState.appliedCoupon.code)}):</span>
<span>-${formatBRL(totals.discount)}</span>
</div>
` : ''}
<div style="display:flex;justify-content:space-between;margin-bottom:8px;">
<span>Entrega (${totals.shippingMethod ? escapeHtml(totals.shippingMethod.name) : 'A definir'}):</span>
<span>${totals.shippingMethod && totals.shippingMethod.priceStatus === 'confirmed' ? formatBRL(totals.shippingCost) : 'A confirmar'}</span>
</div>
<div style="display:flex;justify-content:space-between;font-size:1.2rem;font-weight:700;padding-top:10px;border-top:1px solid var(--border-strong);">
<span>Total do Pedido:</span>
<span>${formatBRL(totals.total)}</span>
</div>
</div>
<button type="submit" id="btn-submit-checkout" class="btn btn-primary btn-block ${isWhatsappSelected ? 'btn-cart-whatsapp' : ''}">
${isWhatsappSelected
? `${OFFICIAL_ICONS.whatsapp}<span>FINALIZAR PEDIDO PELO WHATSAPP</span>`
: `Gerar QR Code Pix (${formatBRL(totals.total)})`}
</button>
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
const savedAddrSelect = document.getElementById('checkout-saved-address-select');
if (savedAddrSelect) {
savedAddrSelect.addEventListener('change', (e) => {
AppState.selectedCheckoutAddressIndex = Number(e.target.value) || 0;
renderMainView();
});
}
form.querySelectorAll('input[name="shippingMethodId"]').forEach((radio) => {
radio.addEventListener('change', (e) => {
AppState.selectedShippingMethodId = e.target.value;
renderMainView();
});
});
form.querySelectorAll('input[name="paymentMethod"]').forEach((radio) => {
radio.addEventListener('change', (e) => {
AppState.selectedPaymentMethod = e.target.value;
renderMainView();
});
});
form.addEventListener('submit', async (e) => {
e.preventDefault();
if (!AppState.currentCustomer || !AppState.currentCustomer.email) {
requireCustomerAuthForPurchase({ type: 'checkout' });
return;
}
const submitBtn = document.getElementById('btn-submit-checkout');
if (submitBtn) {
submitBtn.disabled = true;
submitBtn.textContent = 'Processando seu pedido...';
}
const fd = new FormData(form);
const totals = calculateCartTotals();
const activePaymentOptions = getAvailableCheckoutPaymentOptions(AppState.db.paymentSettings);
const chosenMethod = activePaymentOptions.some((o) => o.id === AppState.selectedPaymentMethod)
? AppState.selectedPaymentMethod
: (activePaymentOptions[0] ? activePaymentOptions[0].id : 'pix');
const cityVal = String(fd.get('city') || 'Itaperuna').trim();
const stateVal = String(fd.get('state') || 'RJ').trim().toUpperCase();
const addressObj = {
label: 'Endereço Principal',
zipCode: String(fd.get('zipCode') || '').trim(),
street: String(fd.get('street') || '').trim(),
number: String(fd.get('number') || '').trim(),
complement: String(fd.get('complement') || '').trim(),
neighborhood: String(fd.get('neighborhood') || '').trim(),
city: cityVal,
state: stateVal,
cityState: `${cityVal} - ${stateVal}`,
reference: String(fd.get('reference') || '').trim()
};
const pixCfg = (AppState.db.paymentSettings && AppState.db.paymentSettings.pix) || {};
const tempTxid = ((pixCfg.txidPrefix || 'BYANGELY') + Date.now()).slice(0, 25);
const pixEmvPayload = (chosenMethod === 'pix' && window.ByAngelyPix)
? window.ByAngelyPix.generatePixPayload({
pixKey: pixCfg.pixKey || '+5528999871458',
keyType: pixCfg.keyType || 'telefone',
merchantName: pixCfg.recipientName || 'BY ANGELY',
merchantCity: pixCfg.recipientCity || 'ITAPERUNA',
amount: totals.total,
txid: tempTxid,
description: 'PEDIDO BY ANGELY'
})
: '';
const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';
const headers = { 'Content-Type': 'application/json' };
if (AppState.currentCustomer.token) {
headers['Authorization'] = 'Bearer ' + AppState.currentCustomer.token;
}
try {
const res = await fetch(apiBase + '/api/orders', {
method: 'POST',
headers,
body: JSON.stringify({
customerId: AppState.currentCustomer.id,
items: AppState.cart,
shippingMethodId: totals.shippingMethod ? totals.shippingMethod.id : 'pickup_itaperuna',
address: addressObj,
paymentMethod: chosenMethod,
couponCode: AppState.appliedCoupon ? AppState.appliedCoupon.code : null,
customerNotes: String(fd.get('customerNotes') || '').trim(),
pixPayload: pixEmvPayload
})
});
const data = await res.json();
if (!res.ok || !data.ok) {
showToast(data.error || 'Não foi possível criar o pedido. Verifique os dados.', 'danger');
if (submitBtn) {
submitBtn.disabled = false;
submitBtn.textContent = 'Tentar Novamente';
}
return;
}
const createdOrder = data.order;
if (createdOrder.paymentMethod === 'pix' && createdOrder.pixData && !createdOrder.pixData.payload && window.ByAngelyPix) {
createdOrder.pixData.payload = window.ByAngelyPix.generatePixPayload({
pixKey: createdOrder.pixData.pixKey || '+5528999871458',
keyType: pixCfg.keyType || 'telefone',
merchantName: createdOrder.pixData.recipientName || 'BY ANGELY',
merchantCity: createdOrder.pixData.recipientCity || 'ITAPERUNA',
amount: createdOrder.total,
txid: createdOrder.pixData.txid || tempTxid,
description: 'PEDIDO ' + createdOrder.orderNumber
});
}
createdOrder.whatsappMessage = buildOrderWhatsappMessage(createdOrder);
createdOrder.whatsappOrderUrl = getOrderWhatsappUrl(createdOrder);
AppState.currentCustomer.name = String(fd.get('customerName') || AppState.currentCustomer.name).trim();
AppState.currentCustomer.phone = String(fd.get('customerPhone') || AppState.currentCustomer.phone).trim();
AppState.currentCustomer.cpf = String(fd.get('customerCpf') || AppState.currentCustomer.cpf || '').trim();
if (!Array.isArray(AppState.currentCustomer.addresses) || AppState.currentCustomer.addresses.length === 0) {
AppState.currentCustomer.addresses = [addressObj];
} else {
AppState.currentCustomer.addresses[0] = { ...AppState.currentCustomer.addresses[0], ...addressObj };
}
AppState.currentCustomer.savedCart = [];
localStorage.setItem(STORAGE_KEY_CUSTOMER_SESSION, JSON.stringify(AppState.currentCustomer));
await loadDatabase();
const existingIdx = (AppState.db.orders || []).findIndex((o) => o.id === createdOrder.id);
if (existingIdx >= 0) {
AppState.db.orders[existingIdx] = createdOrder;
} else {
AppState.db.orders.unshift(createdOrder);
}
AppState.cart = [];
AppState.appliedCoupon = null;
saveCart();
AppState.lastCreatedOrder = createdOrder;
renderMainView();
window.scrollTo({ top: 0, behavior: 'smooth' });
if (chosenMethod === 'whatsapp') {
showToast(`Pedido ${createdOrder.orderNumber} registrado! Abrindo WhatsApp...`, 'success');
try {
window.open(createdOrder.whatsappOrderUrl, '_blank', 'noopener,noreferrer');
} catch (err) {}
} else {
showToast(`Pedido ${createdOrder.orderNumber} gerado! Realize o pagamento via Pix em até ${createdOrder.expirationMinutes || 15} minutos.`, 'success');
}
} catch (err) {
console.error('Erro ao processar pedido:', err);
showToast('Erro de conexão ao registrar o pedido. Tente novamente.', 'danger');
if (submitBtn) {
submitBtn.disabled = false;
submitBtn.textContent = 'Confirmar Pedido';
}
}
});
}
function stopPixPaymentPolling() {
if (AppState.pixPollIntervalId) {
clearInterval(AppState.pixPollIntervalId);
AppState.pixPollIntervalId = null;
}
if (AppState.pixCountdownIntervalId) {
clearInterval(AppState.pixCountdownIntervalId);
AppState.pixCountdownIntervalId = null;
}
}
function startPixPaymentPolling(orderId) {
stopPixPaymentPolling();
if (!orderId) return;
const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';
AppState.pixCountdownIntervalId = setInterval(() => {
if (AppState.pixRemainingSecondsMap[orderId] !== undefined && AppState.pixRemainingSecondsMap[orderId] > 0) {
AppState.pixRemainingSecondsMap[orderId] -= 1;
const rem = AppState.pixRemainingSecondsMap[orderId];
document.querySelectorAll(`[data-pix-timer-for="${orderId}"]`).forEach((el) => {
el.textContent = formatCountdownMMSS(rem);
});
if (rem <= 0) {
checkOrderStatusNow();
}
}
}, 1000);
async function checkOrderStatusNow() {
try {
const pollHeaders = { ...getAdminRequestHeaders() };
if (AppState.currentCustomer && AppState.currentCustomer.token) {
  pollHeaders['Authorization'] = 'Bearer ' + AppState.currentCustomer.token;
}
const res = await fetch(`${apiBase}/api/orders/${encodeURIComponent(orderId)}/payment-status`, {
cache: 'no-store',
headers: pollHeaders
});
if (!res.ok) return;
const data = await res.json();
if (!data || !data.ok) return;
if (typeof data.remainingSeconds === 'number') {
AppState.pixRemainingSecondsMap[orderId] = data.remainingSeconds;
document.querySelectorAll(`[data-pix-timer-for="${orderId}"]`).forEach((el) => {
el.textContent = formatCountdownMMSS(data.remainingSeconds);
});
}
const localOrder = (AppState.db.orders || []).find((o) => o.id === orderId);
const prevStatus = localOrder ? localOrder.status : (AppState.lastCreatedOrder && AppState.lastCreatedOrder.id === orderId ? AppState.lastCreatedOrder.status : null);
if (localOrder) {
localOrder.status = data.status;
localOrder.statusLabel = data.statusLabel;
localOrder.paymentStatus = data.paymentStatus;
localOrder.paidAt = data.paidAt || localOrder.paidAt;
localOrder.cancelledAt = data.cancelledAt || localOrder.cancelledAt;
if (Array.isArray(data.notificationsLog)) {
localOrder.notificationsLog = data.notificationsLog;
}
}
if (AppState.lastCreatedOrder && AppState.lastCreatedOrder.id === orderId) {
AppState.lastCreatedOrder.status = data.status;
AppState.lastCreatedOrder.statusLabel = data.statusLabel;
AppState.lastCreatedOrder.paymentStatus = data.paymentStatus;
AppState.lastCreatedOrder.paidAt = data.paidAt || AppState.lastCreatedOrder.paidAt;
AppState.lastCreatedOrder.cancelledAt = data.cancelledAt || AppState.lastCreatedOrder.cancelledAt;
if (Array.isArray(data.notificationsLog)) {
AppState.lastCreatedOrder.notificationsLog = data.notificationsLog;
}
}
if (data.paymentStatus === 'paid' || data.status === 'payment_approved') {
stopPixPaymentPolling();
if (prevStatus !== data.status) {
showToast('Pagamento confirmado! Seu pedido foi recebido pela BY ANGÉLY e está aguardando separação.', 'success');
await loadDatabase();
}
if (AppState.currentView === 'checkout' || AppState.currentView === 'account') {
renderMainView();
}
const detailModal = document.getElementById('order-detail-modal');
if (detailModal && detailModal.classList.contains('open')) {
openOrderDetailModal(orderId);
}
} else if (data.status === 'cancelled_expired' || data.status === 'cancelled') {
stopPixPaymentPolling();
if (prevStatus !== data.status) {
showToast('O prazo de 15 minutos do QR Code Pix expirou e o pedido foi cancelado automaticamente.', 'warning');
await loadDatabase();
}
if (AppState.currentView === 'checkout' || AppState.currentView === 'account') {
renderMainView();
}
const detailModal = document.getElementById('order-detail-modal');
if (detailModal && detailModal.classList.contains('open')) {
openOrderDetailModal(orderId);
}
}
} catch (e) {}
}
checkOrderStatusNow();
AppState.pixPollIntervalId = setInterval(checkOrderStatusNow, 3000);
}
function renderOrderConfirmationScreen(order) {
const meta = getOrderStatusMeta(order);
const isPaid = order.paymentStatus === 'paid' || order.status === 'payment_approved' || order.status === 'awaiting_separation' || order.status === 'in_separation';
const isExpiredOrCancelled = order.status === 'cancelled_expired' || order.status === 'cancelled';
const isAwaitingPix = order.paymentMethod === 'pix' && !isPaid && !isExpiredOrCancelled;
let qrSvg = '';
if (order.paymentMethod === 'pix' && order.pixData && order.pixData.payload && window.ByAngelyPix) {
qrSvg = window.ByAngelyPix.renderQrSvg(order.pixData.payload);
}
const expMs = order.expiresAt ? new Date(order.expiresAt).getTime() : (new Date(order.createdAt).getTime() + 15 * 60 * 1000);
const initialRemainingSec = AppState.pixRemainingSecondsMap[order.id] !== undefined
? AppState.pixRemainingSecondsMap[order.id]
: Math.max(0, Math.floor((expMs - Date.now()) / 1000));
AppState.pixRemainingSecondsMap[order.id] = initialRemainingSec;
if (isAwaitingPix) {
setTimeout(() => startPixPaymentPolling(order.id), 50);
} else {
stopPixPaymentPolling();
}
const waOrderUrl = order.whatsappOrderUrl || getOrderWhatsappUrl(order);
return `
<section class="section-block">
<div class="container" style="max-width:860px;">
<div class="admin-card">
<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid var(--border-subtle);">
<div>
<span class="section-eyebrow">Acompanhamento em Tempo Real</span>
<h1 style="font-family:var(--font-serif);font-size:2.05rem;">Pedido ${escapeHtml(order.orderNumber)}</h1>
<p style="font-size:0.86rem;color:var(--text-secondary);">Registrado em ${formatDateBR(order.createdAt)}</p>
</div>
<span class="status-pill ${meta.badgeClass}" id="order-screen-status-pill" style="font-size:0.86rem;padding:7px 14px;">
${escapeHtml(meta.label)}
</span>
</div>
<!-- Status Aprovado Automaticamente -->
${isPaid ? `
<div id="pix-approved-banner" style="background:#111111;border:1.5px solid #111111;border-radius:12px;padding:22px;margin-bottom:22px;text-align:center;color:#FFFFFF;">
<div style="width:48px;height:48px;border-radius:50%;background:#FFFFFF;color:#111111;display:inline-flex;align-items:center;justify-content:center;font-size:1.35rem;font-weight:700;margin-bottom:10px;">✓</div>
<h2 style="font-family:var(--font-serif);font-size:1.65rem;color:#FFFFFF;margin-bottom:8px;">
Pagamento confirmado! Seu pedido foi recebido pela BY ANGÉLY e está aguardando separação.
</h2>
<p style="font-size:0.9rem;color:#E4E4E7;margin-bottom:0;">
O pagamento de <strong>${formatBRL(order.total)}</strong> foi reconhecido automaticamente. Não é necessário enviar comprovante.
</p>
</div>
` : ''}
<!-- Status Expirado / Cancelado Após 15 Minutos -->
${isExpiredOrCancelled ? `
<div id="pix-expired-banner" style="background:#F4F4F5;border:1.5px solid #18181B;border-radius:12px;padding:22px;margin-bottom:22px;text-align:center;">
<div style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;background:#18181B;color:#FFFFFF;font-size:0.74rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:10px;">! ENCERRADO</div>
<h2 style="font-family:var(--font-serif);font-size:1.55rem;color:#111111;margin-bottom:8px;">
${escapeHtml(meta.label)}
</h2>
<p style="font-size:0.9rem;color:#52525B;margin-bottom:14px;">
${escapeHtml(meta.customerMessage)} As peças reservadas voltaram para o estoque disponível da loja.
</p>
<button type="button" class="btn btn-primary btn-sm" data-action="finish-order-go-catalog">Fazer Novo Pedido</button>
</div>
` : ''}
<!-- Pagamento via Pix Aguardando Confirmação (Com Cronômetro de 15 Minutos) -->
${isAwaitingPix && order.pixData ? `
<div id="pix-awaiting-box" style="background:#FFFFFF;border:1px solid var(--border-strong);border-radius:12px;padding:22px;margin-bottom:22px;text-align:center;">
<div style="display:inline-flex;align-items:center;gap:10px;background:#F4F4F5;border:1px solid #18181B;color:#111111;padding:8px 16px;border-radius:999px;font-size:0.86rem;font-weight:600;margin-bottom:14px;">
<span>⏱️ Tempo restante para pagar:</span>
<strong data-pix-timer-for="${escapeHtml(order.id)}" id="pix-countdown-timer" style="font-family:monospace;font-size:1.1rem;color:#111111;">${formatCountdownMMSS(initialRemainingSec)}</strong>
<span style="font-size:0.76rem;color:#52525B;">(Vence em ${formatDateBR(order.expiresAt)})</span>
</div>
<h2 style="font-family:var(--font-serif);font-size:1.65rem;margin-bottom:6px;">Escaneie o QR Code Pix (${formatBRL(order.total)})</h2>
<p style="font-size:0.86rem;color:var(--text-secondary);max-width:560px;margin:0 auto 14px;">
Abra o aplicativo do seu banco, escolha pagar via <strong>QR Code</strong> ou <strong>Pix Copia e Cola</strong>.
</p>
<div class="pix-qr-box" style="margin:0 auto 14px;">
${order.pixData.qrCodeBase64
  ? `<img src="data:image/png;base64,${escapeHtml(order.pixData.qrCodeBase64)}" alt="QR Code Pix ${escapeHtml(order.orderNumber)}" style="width:220px;height:220px;display:block;margin:0 auto;object-fit:contain;" />`
  : qrSvg}
</div>
<div style="max-width:520px;margin:0 auto 16px;">
<label style="display:block;font-size:0.76rem;font-weight:700;text-transform:uppercase;margin-bottom:6px;">Código Pix Copia e Cola:</label>
<div style="display:flex;gap:8px;">
<input type="text" id="pix-copia-cola-input" class="form-control" readonly value="${escapeHtml(order.pixData.payload)}" style="font-family:monospace;font-size:0.78rem;" />
<button type="button" class="btn btn-primary btn-sm" data-action="copy-pix-code">Copiar Código</button>
</div>
</div>
<div style="max-width:520px;margin:0 auto 14px;background:#F7F7F7;border:1px solid var(--border-subtle);border-radius:8px;padding:12px;text-align:left;font-size:0.82rem;">
<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span><strong>Pedido:</strong> ${escapeHtml(order.orderNumber)}</span><span><strong>Valor Exato:</strong> ${formatBRL(order.total)}</span></div>
<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span><strong>Recebedor:</strong> ${escapeHtml(order.pixData.recipientName)}</span><span><strong>Chave:</strong> ${escapeHtml(order.pixData.pixKey)}</span></div>
<div><strong>Identificador da Cobrança:</strong> <code style="font-size:0.76rem;">${escapeHtml(order.pixData.chargeId || order.pixData.txid)}</code></div>
</div>
${order.pixData.isStaticFallback ? `
<div style="max-width:520px;margin:0 auto 14px;background:#F4F4F5;border:1px dashed #71717A;border-radius:8px;padding:10px 12px;font-size:0.78rem;color:#111111;text-align:left;">
  <strong>! Aviso sobre confirmação automática:</strong> O QR Code foi gerado em modo chave Pix direta (sem provedor PSP conectado no servidor). Alguns bancos solicitam conferência do valor (<strong>${formatBRL(order.total)}</strong>) e não enviam confirmação automática ao site sem provedor configurado.
</div>
` : ''}
<div style="display:inline-flex;align-items:center;gap:8px;font-size:0.82rem;color:#111111;font-weight:600;padding:8px 14px;background:#F4F4F5;border:1px solid #D4D4D8;border-radius:999px;">
<span>↻ Aguardando confirmação automática do banco...</span>
</div>
<p style="font-size:0.76rem;color:var(--text-muted);margin-top:10px;margin-bottom:0;">
Aviso: caso o pagamento não seja confirmado em até ${Number(order.expirationMinutes) || 15} minutos, este QR Code expira e o pedido é cancelado automaticamente.
</p>
</div>
` : ''}
${order.paymentMethod === 'whatsapp' ? `
<div style="background:var(--bg-primary);border:1px solid var(--border-strong);border-radius:8px;padding:22px;margin-bottom:22px;">
<h2 style="font-family:var(--font-serif);font-size:1.65rem;margin-bottom:8px;">Atendimento no WhatsApp Oficial (${formatBRL(order.total)})</h2>
<p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:16px;">
Seu pedido <strong>${escapeHtml(order.orderNumber)}</strong> está registrado. Clique abaixo caso queira abrir a conversa novamente no WhatsApp da BY ANGÉLY:
</p>
<a href="${escapeHtml(waOrderUrl)}" target="_blank" rel="noopener noreferrer" class="contact-btn-action whatsapp-style" id="btn-open-whatsapp-order" style="width:100%;max-width:440px;">
${OFFICIAL_ICONS.whatsapp}
<span>ENVIAR PEDIDO NO WHATSAPP DA BY ANGÉLY</span>
</a>
</div>
` : ''}
<!-- Resumo dos Produtos e Endereço do Pedido -->
<div style="border-top:1px solid var(--border-subtle);padding-top:16px;margin-bottom:20px;">
<h3 style="font-family:var(--font-serif);font-size:1.25rem;margin-bottom:10px;">Itens do Pedido</h3>
<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
${(order.items || []).map((it) => `
<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:var(--bg-primary);border-radius:8px;font-size:0.85rem;">
<div style="display:flex;align-items:center;gap:10px;">
<img src="${escapeHtml(it.imageUrl || CATEGORY_COVER_FALLBACKS.vestidos)}" alt="${escapeHtml(it.name)}" data-fallback-src="${escapeHtml(CATEGORY_COVER_FALLBACKS.vestidos)}" onerror="window.ByAngelyHandleMediaError && window.ByAngelyHandleMediaError(this, 'Peça')" style="width:40px;height:50px;object-fit:cover;border-radius:6px;" />
<div>
<strong>${escapeHtml(it.name)}</strong>
<div style="font-size:0.76rem;color:var(--text-secondary);">Tam: ${escapeHtml(it.size)} • Cor: ${escapeHtml(it.color)} • Qtd: ${it.quantity}x (${formatBRL(it.unitPrice)})</div>
</div>
</div>
<strong>${formatBRL(it.unitPrice * it.quantity)}</strong>
</div>
`).join('')}
</div>
</div>
<div style="display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap;">
<button type="button" class="btn btn-primary" data-action="finish-order-go-account">
Ver em Meus Pedidos
</button>
<button type="button" class="btn btn-outline" data-action="finish-order-go-catalog">
Continuar na Loja
</button>
</div>
</div>
</div>
</section>
`;
}
function renderCustomerAuthScreen() {
const showBanner = Boolean(AppState.showPurchaseAuthBanner);
return `
<section class="section-block">
<div class="container">
${showBanner ? `
<div id="mandatory-auth-purchase-banner" style="background:#F4F4F5;border:1.5px solid #71717A;border-radius:12px;padding:18px 22px;margin-bottom:24px;display:flex;align-items:center;gap:14px;box-shadow:0 6px 20px rgba(17, 17, 17,0.08);">
<div style="width:40px;height:40px;border-radius:50%;background:#111111;color:#FFF;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.1rem;">🔒</div>
<div>
<strong style="display:block;font-family:var(--font-serif);font-size:1.25rem;color:#111111;margin-bottom:2px;">Identificação Necessária para Comprar</strong>
<p style="font-size:0.92rem;color:#52525B;margin:0;">${escapeHtml(MANDATORY_LOGIN_MESSAGE)}</p>
</div>
</div>
` : ''}
<div class="checkout-layout" style="grid-template-columns:1fr 1.25fr;align-items:start;">
<!-- Coluna 1: Entrar na Conta & Recuperar Senha -->
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
<button type="submit" class="btn btn-primary btn-block">Entrar na Conta</button>
</form>
<details style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-subtle);">
<summary style="font-size:0.82rem;font-weight:600;cursor:pointer;">Esqueceu sua senha? Recuperar senha</summary>
<form id="customer-recover-form" style="margin-top:10px;">
<p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:8px;">Informe seu e-mail cadastrado. Se ele existir em nossa base, enviaremos um link oficial para redefinição:</p>
<input type="email" name="email" class="form-control" required placeholder="E-mail da conta" style="margin-bottom:8px;" />
<button type="submit" class="btn btn-outline btn-sm">Enviar Link de Redefinição</button>
</form>
</details>
</div>
<!-- Coluna 2: Criar Conta Completa com Endereço Permanente -->
<div class="admin-card">
<span class="section-eyebrow">Novo Cadastro • BY ANGÉLY</span>
<h2 style="font-family:var(--font-serif);font-size:1.8rem;margin-bottom:6px;">Criar Minha Conta</h2>
<p style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:14px;">Cadastre seus dados e endereço uma única vez para comprar com rapidez e acompanhar seus pedidos.</p>
<form id="customer-register-form">
<div class="sac-form-grid">
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Nome Completo *</label>
<input type="text" name="name" class="form-control" required placeholder="Ex.: Ana Beatriz Souza" />
</div>
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Telefone / WhatsApp *</label>
<input type="tel" name="phone" class="form-control" required placeholder="(28) 99999-9999" />
</div>
</div>
<div class="sac-form-grid">
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">E-mail *</label>
<input type="email" name="email" class="form-control" required placeholder="seu@email.com" />
</div>
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">CPF (Opcional)</label>
<input type="text" name="cpf" class="form-control" placeholder="000.000.000-00" />
</div>
</div>
<div style="margin-bottom:14px;">
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Crie uma Senha *</label>
<input type="password" name="password" class="form-control" required minlength="6" placeholder="Mínimo de 6 caracteres" />
</div>
<div style="padding-top:12px;border-top:1px solid var(--border-subtle);margin-bottom:12px;">
<strong style="display:block;font-size:0.84rem;color:var(--accent-brown);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Endereço Principal para Entrega</strong>
<div class="sac-form-grid">
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">CEP *</label>
<input type="text" name="zipCode" id="reg-cep-input" class="form-control" required placeholder="28300-000" value="28300-000" />
</div>
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Endereço (Rua / Av.) *</label>
<input type="text" name="street" id="reg-street-input" class="form-control" required placeholder="Nome da rua ou avenida" />
</div>
</div>
<div class="sac-form-grid">
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Número *</label>
<input type="text" name="number" class="form-control" required placeholder="Nº" />
</div>
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Complemento</label>
<input type="text" name="complement" class="form-control" placeholder="Apto, bloco, casa (opcional)" />
</div>
</div>
<div class="sac-form-grid">
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Bairro *</label>
<input type="text" name="neighborhood" id="reg-neighborhood-input" class="form-control" required placeholder="Bairro" />
</div>
<div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;">
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Cidade *</label>
<input type="text" name="city" id="reg-city-input" class="form-control" required value="Itaperuna" />
</div>
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Estado *</label>
<input type="text" name="state" id="reg-state-input" class="form-control" required maxlength="2" value="RJ" />
</div>
</div>
</div>
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Referência para entrega (Opcional)</label>
<input type="text" name="reference" class="form-control" placeholder="Ponto de referência (opcional)" />
</div>
</div>
<label style="display:flex;align-items:flex-start;gap:8px;font-size:0.8rem;color:var(--text-secondary);margin-bottom:14px;cursor:pointer;">
<input type="checkbox" name="marketingOptIn" style="margin-top:3px;" />
<span>Aceito receber novidades promocionais da BY ANGÉLY (Opcional — LGPD).</span>
</label>
<button type="submit" class="btn btn-gold btn-block">Criar Conta e Continuar</button>
</form>
</div>
</div>
</div>
</section>
`;
}
function renderAccountView() {
if (!AppState.currentCustomer || !AppState.currentCustomer.email) {
return renderCustomerAuthScreen();
}
const cust = AppState.currentCustomer;
const myOrders = (AppState.db.orders || []).filter((o) => {
if (!o) return false;
if (o.customerId && cust.id && o.customerId === cust.id) return true;
const ordEmail = o.customer && o.customer.email ? o.customer.email.toLowerCase() : '';
return ordEmail && ordEmail === cust.email.toLowerCase();
});
const myReturns = (AppState.db.returnRequests || []).filter(
(r) => r.customerEmail && r.customerEmail.toLowerCase() === cust.email.toLowerCase()
);
const primaryAddr = (Array.isArray(cust.addresses) && cust.addresses[0]) || {};
const splitCS = String(primaryAddr.cityState || '').split('-').map((s) => s.trim());
return `
<section class="section-block">
<div class="container">
<div class="section-header" style="margin-bottom:24px;">
<div>
<span class="section-eyebrow">Área da Cliente • BY ANGÉLY</span>
<h1 class="section-title">Olá, ${escapeHtml(cust.name)}</h1>
<p style="color:var(--text-secondary);font-size:0.88rem;">${escapeHtml(cust.email)} ${cust.phone ? '• ' + escapeHtml(cust.phone) : ''}</p>
</div>
<button type="button" class="btn btn-outline btn-sm" data-action="customer-logout">Sair da Conta</button>
</div>
<div style="display:flex;gap:10px;margin-bottom:24px;flex-wrap:wrap;">
<button type="button" class="btn ${AppState.activeAccountTab === 'orders' ? 'btn-primary' : 'btn-subtle'} btn-sm" data-action="switch-account-tab" data-tab="orders">
Meus Pedidos (${myOrders.length})
</button>
<button type="button" class="btn ${AppState.activeAccountTab === 'profile' ? 'btn-primary' : 'btn-subtle'} btn-sm" data-action="switch-account-tab" data-tab="profile">
Meus Dados e Endereços (${(cust.addresses || []).length})
</button>
<button type="button" class="btn ${AppState.activeAccountTab === 'returns' ? 'btn-primary' : 'btn-subtle'} btn-sm" data-action="switch-account-tab" data-tab="returns">
Trocas e Devoluções (${myReturns.length})
</button>
</div>
${AppState.activeAccountTab === 'orders' ? `
<div>
${myOrders.length === 0 ? `
<div class="admin-card" style="text-align:center;padding:40px 20px;">
<p style="font-family:var(--font-serif);font-size:1.4rem;margin-bottom:8px;">Você ainda não possui pedidos realizados</p>
<p style="color:var(--text-secondary);font-size:0.88rem;margin-bottom:16px;">Assim que você realizar sua primeira compra, todos os detalhes e o status em tempo real aparecerão aqui.</p>
<button type="button" class="btn btn-primary btn-sm" data-action="go-catalog">Explorar Catálogo</button>
</div>
` : myOrders.map((ord) => {
const meta = getOrderStatusMeta(ord);
const isAwaitingPix = ord.paymentMethod === 'pix' && (ord.status === 'awaiting_payment' || ord.status === 'awaiting_confirmation');
return `
<div class="admin-card" data-order-card-id="${escapeHtml(ord.id)}">
<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding-bottom:12px;border-bottom:1px solid var(--border-subtle);margin-bottom:12px;">
<div>
<strong style="font-size:1.08rem;">Pedido ${escapeHtml(ord.orderNumber)}</strong>
<span style="font-size:0.8rem;color:var(--text-secondary);margin-left:10px;">Realizado em ${formatDateBR(ord.createdAt)}</span>
</div>
<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
<span class="status-pill ${meta.badgeClass}">
${escapeHtml(meta.label)}
</span>
<strong style="font-size:1.08rem;color:var(--accent-brown);">${formatBRL(ord.total)}</strong>
</div>
</div>
${meta.customerMessage ? `
<div style="padding:10px 14px;border-radius:8px;margin-bottom:14px;font-size:0.85rem;background:${meta.badgeClass === 'confirmed' ? '#F4F4F5' : meta.badgeClass === 'danger' ? '#F4F4F5' : '#F4F4F5'};color:${meta.badgeClass === 'confirmed' ? '#111111' : meta.badgeClass === 'danger' ? '#111111' : '#18181B'};border:1px solid ${meta.badgeClass === 'confirmed' ? '#111111' : meta.badgeClass === 'danger' ? '#D4D4D8' : '#D4D4D8'};">
<strong>Status atual:</strong> ${escapeHtml(meta.customerMessage)}
</div>
` : ''}
<div style="display:grid;grid-template-columns:1.35fr 1fr;gap:16px;font-size:0.85rem;">
<div>
<strong style="display:block;margin-bottom:8px;">Produtos Comprados:</strong>
<div style="display:flex;flex-direction:column;gap:8px;">
${(ord.items || []).map((it) => `
<div style="display:flex;align-items:center;gap:10px;padding:6px 8px;background:var(--bg-primary);border-radius:6px;">
<img src="${escapeHtml(it.imageUrl || CATEGORY_COVER_FALLBACKS.vestidos)}" alt="${escapeHtml(it.name)}" style="width:38px;height:48px;object-fit:cover;border-radius:4px;flex-shrink:0;" />
<div style="flex:1;">
<strong>${escapeHtml(it.name)}</strong>
<div style="font-size:0.76rem;color:var(--text-secondary);">
Tam: ${escapeHtml(it.size)} • Cor: ${escapeHtml(it.color)} • Qtd: ${it.quantity}x (${formatBRL(it.unitPrice)})
</div>
</div>
<strong>${formatBRL(it.unitPrice * it.quantity)}</strong>
</div>
`).join('')}
</div>
</div>
<div style="background:var(--bg-primary);padding:12px;border-radius:8px;">
<div style="margin-bottom:4px;"><strong>Forma de Pagamento:</strong> ${escapeHtml(ord.paymentMethodLabel)}</div>
<div style="margin-bottom:4px;"><strong>Status do Pagamento:</strong> ${escapeHtml(meta.paymentLabel)}</div>
<div style="margin-bottom:4px;"><strong>Status da Entrega:</strong> ${escapeHtml(meta.label)}</div>
<div style="margin-bottom:4px;"><strong>Modalidade:</strong> ${escapeHtml(ord.shipping ? ord.shipping.methodName : '')} (${ord.shipping && ord.shipping.cost > 0 ? formatBRL(ord.shipping.cost) : 'Grátis / A confirmar'})</div>
<div><strong>Código de Rastreio:</strong> ${ord.shipping && ord.shipping.trackingCode ? `<span style="background:var(--status-info-bg);color:var(--status-info-text);padding:2px 8px;border-radius:4px;font-family:monospace;font-weight:700;">${escapeHtml(ord.shipping.trackingCode)}</span>` : '<span style="color:var(--text-muted);">Aguardando envio / não aplicável</span>'}</div>
</div>
</div>
<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid var(--border-subtle);">
<button type="button" class="btn btn-primary btn-sm" data-action="open-order-detail-modal" data-order-id="${escapeHtml(ord.id)}">
Ver Detalhes do Pedido
</button>
${isAwaitingPix ? `
<button type="button" class="btn btn-gold btn-sm" data-action="reopen-order-payment" data-order-id="${escapeHtml(ord.id)}">
Pagar com QR Code Pix Agora
</button>
` : ''}
<button type="button" class="btn btn-outline btn-sm" data-action="open-return-request" data-order-number="${escapeHtml(ord.orderNumber)}">
Solicitar Troca ou Devolução
</button>
</div>
</div>
`;
}).join('')}
</div>
` : ''}
${AppState.activeAccountTab === 'profile' ? `
<div class="admin-card">
<h2 style="font-family:var(--font-serif);font-size:1.55rem;margin-bottom:6px;">Meus Dados e Endereços Salvos</h2>
<p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px;">Mantenha seus dados e endereço atualizados para preenchimento automático em todas as suas compras.</p>
<form id="customer-profile-form">
<div class="sac-form-grid">
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Nome Completo *</label>
<input type="text" name="name" class="form-control" required value="${escapeHtml(cust.name || '')}" />
</div>
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Telefone / WhatsApp *</label>
<input type="text" name="phone" class="form-control" required value="${escapeHtml(cust.phone || '')}" />
</div>
</div>
<div class="sac-form-grid">
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">E-mail Cadastrado</label>
<input type="email" class="form-control" readonly value="${escapeHtml(cust.email || '')}" style="background:var(--bg-primary);" />
</div>
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">CPF (Opcional)</label>
<input type="text" name="cpf" class="form-control" value="${escapeHtml(cust.cpf && cust.cpf !== 'Não informado' ? cust.cpf : '')}" placeholder="000.000.000-00" />
</div>
</div>
<div style="padding-top:14px;border-top:1px solid var(--border-subtle);margin-top:10px;margin-bottom:14px;">
<strong style="display:block;font-size:0.86rem;color:var(--accent-brown);text-transform:uppercase;margin-bottom:10px;">Endereço Principal de Entrega</strong>
<div class="sac-form-grid">
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">CEP *</label>
<input type="text" name="zipCode" class="form-control" required value="${escapeHtml(primaryAddr.zipCode || '28300-000')}" />
</div>
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Endereço (Rua / Av.) *</label>
<input type="text" name="street" class="form-control" required value="${escapeHtml(primaryAddr.street || '')}" />
</div>
</div>
<div class="sac-form-grid">
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Número *</label>
<input type="text" name="number" class="form-control" required value="${escapeHtml(primaryAddr.number || '')}" />
</div>
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Complemento</label>
<input type="text" name="complement" class="form-control" value="${escapeHtml(primaryAddr.complement || '')}" />
</div>
</div>
<div class="sac-form-grid">
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Bairro *</label>
<input type="text" name="neighborhood" class="form-control" required value="${escapeHtml(primaryAddr.neighborhood || '')}" />
</div>
<div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;">
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Cidade *</label>
<input type="text" name="city" class="form-control" required value="${escapeHtml(primaryAddr.city || splitCS[0] || 'Itaperuna')}" />
</div>
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Estado (UF) *</label>
<input type="text" name="state" class="form-control" required maxlength="2" value="${escapeHtml(primaryAddr.state || splitCS[1] || 'RJ')}" />
</div>
</div>
</div>
<div>
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Referência para entrega (Opcional)</label>
<input type="text" name="reference" class="form-control" value="${escapeHtml(primaryAddr.reference || '')}" />
</div>
</div>
<div style="padding:12px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:6px;margin-bottom:14px;">
<label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;cursor:pointer;">
<input type="checkbox" name="marketingOptIn" ${cust.marketingOptIn ? 'checked' : ''} />
<span>Autorizo o recebimento de comunicações promocionais da BY ANGÉLY (LGPD).</span>
</label>
</div>
<button type="submit" class="btn btn-primary btn-sm">Salvar Dados e Endereço</button>
</form>
</div>
` : ''}
${AppState.activeAccountTab === 'returns' ? `
<div class="admin-card">
<h2 style="font-family:var(--font-serif);font-size:1.5rem;margin-bottom:10px;">Solicitar Troca ou Devolução (Art. 49 CDC)</h2>
<form id="customer-return-form" style="margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid var(--border-subtle);">
<div class="sac-form-grid">
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
<label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Detalhes da Solicitação *</label>
<textarea name="reason" rows="2" class="form-control" required placeholder="Informe qual peça deseja trocar ou devolver..."></textarea>
</div>
<button type="submit" class="btn btn-primary btn-sm">Registrar Solicitação</button>
</form>
<h3 style="font-size:1rem;margin-bottom:12px;">Histórico de Solicitações (${myReturns.length})</h3>
${myReturns.length === 0 ? `<p style="font-size:0.86rem;color:var(--text-muted);">Nenhuma solicitação registrada.</p>` : myReturns.map((r) => `
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
</div>
</section>
`;
}
function bindAccountEvents() {
const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';
const loginForm = document.getElementById('customer-login-form');
if (loginForm) {
loginForm.addEventListener('submit', async (e) => {
e.preventDefault();
const fd = new FormData(loginForm);
const email = String(fd.get('email') || '').trim().toLowerCase();
const password = String(fd.get('password') || '');
try {
const res = await fetch(apiBase + '/api/auth/login', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ email, password })
});
const data = await res.json();
if (res.ok && data && data.ok && data.customer) {
AppState.currentCustomer = { ...data.customer, token: data.token };
localStorage.setItem(STORAGE_KEY_CUSTOMER_SESSION, JSON.stringify(AppState.currentCustomer));
if (Array.isArray(data.customer.savedCart) && data.customer.savedCart.length > 0 && AppState.cart.length === 0) {
AppState.cart = data.customer.savedCart;
saveCart();
}
await loadDatabase();
updateHeaderCounters();
showToast(`Bem-vinda de volta, ${AppState.currentCustomer.name}!`, 'success');
if (!resumePendingPurchaseIntent()) {
renderMainView();
}
return;
}
showToast((data && data.error) || 'E-mail ou senha incorretos.', 'danger');
} catch (err) {
showToast('Erro ao autenticar. Verifique sua conexão.', 'danger');
}
});
}
const regForm = document.getElementById('customer-register-form');
if (regForm) {
const cepInput = document.getElementById('reg-cep-input');
if (cepInput) {
cepInput.addEventListener('blur', async () => {
const cleanCep = String(cepInput.value || '').replace(/\D/g, '');
if (cleanCep.length === 8) {
try {
const r = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
const d = await r.json();
if (d && !d.erro) {
const stEl = document.getElementById('reg-street-input');
const nbEl = document.getElementById('reg-neighborhood-input');
const ctEl = document.getElementById('reg-city-input');
const ufEl = document.getElementById('reg-state-input');
if (stEl && d.logradouro && !stEl.value) stEl.value = d.logradouro;
if (nbEl && d.bairro && !nbEl.value) nbEl.value = d.bairro;
if (ctEl && d.localidade) ctEl.value = d.localidade;
if (ufEl && d.uf) ufEl.value = d.uf;
}
} catch (e) {}
}
});
}
regForm.addEventListener('submit', async (e) => {
e.preventDefault();
const fd = new FormData(regForm);
const city = String(fd.get('city') || 'Itaperuna').trim();
const state = String(fd.get('state') || 'RJ').trim().toUpperCase();
const address = {
label: 'Principal',
zipCode: String(fd.get('zipCode') || '').trim(),
street: String(fd.get('street') || '').trim(),
number: String(fd.get('number') || '').trim(),
complement: String(fd.get('complement') || '').trim(),
neighborhood: String(fd.get('neighborhood') || '').trim(),
city,
state,
cityState: `${city} - ${state}`,
reference: String(fd.get('reference') || '').trim()
};
try {
const res = await fetch(apiBase + '/api/auth/register', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
name: fd.get('name'),
email: fd.get('email'),
phone: fd.get('phone'),
cpf: fd.get('cpf') || '',
password: fd.get('password'),
marketingOptIn: fd.get('marketingOptIn') === 'on',
address
})
});
const data = await res.json();
if (!res.ok || !data || !data.ok) {
showToast((data && data.error) || 'Não foi possível concluir o cadastro.', 'danger');
return;
}
AppState.currentCustomer = { ...data.customer, token: data.token };
localStorage.setItem(STORAGE_KEY_CUSTOMER_SESSION, JSON.stringify(AppState.currentCustomer));
await loadDatabase();
updateHeaderCounters();
showToast('Cadastro criado com sucesso! Seus dados e endereço foram salvos.', 'success');
if (!resumePendingPurchaseIntent()) {
renderMainView();
}
} catch (err) {
showToast('Erro de conexão ao criar conta.', 'danger');
}
});
}
const recForm = document.getElementById('customer-recover-form');
if (recForm) {
recForm.addEventListener('submit', async (e) => {
e.preventDefault();
const fd = new FormData(recForm);
const email = String(fd.get('email') || '').trim().toLowerCase();
if (!window.ByAngelyFirebaseAuth || !isValidEmailFormat(email)) {
showToast('Informe um endereço de e-mail válido.', 'warning');
return;
}
const result = await window.ByAngelyFirebaseAuth.requestPasswordReset(email);
if (!result.ok) {
showToast(result.error || 'Não foi possível solicitar a redefinição.', 'danger');
return;
}
showToast('Se este e-mail estiver cadastrado, enviaremos um link oficial para redefinir sua senha.', 'success');
recForm.reset();
});
}
const profForm = document.getElementById('customer-profile-form');
if (profForm) {
profForm.addEventListener('submit', async (e) => {
e.preventDefault();
const fd = new FormData(profForm);
const city = String(fd.get('city') || 'Itaperuna').trim();
const state = String(fd.get('state') || 'RJ').trim().toUpperCase();
const updatedAddr = {
label: 'Principal',
zipCode: String(fd.get('zipCode') || '').trim(),
street: String(fd.get('street') || '').trim(),
number: String(fd.get('number') || '').trim(),
complement: String(fd.get('complement') || '').trim(),
neighborhood: String(fd.get('neighborhood') || '').trim(),
city,
state,
cityState: `${city} - ${state}`,
reference: String(fd.get('reference') || '').trim()
};
const existingAddrs = Array.isArray(AppState.currentCustomer.addresses) ? [...AppState.currentCustomer.addresses] : [];
existingAddrs[0] = updatedAddr;
const headers = { 'Content-Type': 'application/json' };
if (AppState.currentCustomer.token) {
headers['Authorization'] = 'Bearer ' + AppState.currentCustomer.token;
}
try {
const res = await fetch(apiBase + '/api/customer/profile', {
method: 'PUT',
headers,
body: JSON.stringify({
customerId: AppState.currentCustomer.id,
name: fd.get('name'),
phone: fd.get('phone'),
cpf: fd.get('cpf') || '',
marketingOptIn: fd.get('marketingOptIn') === 'on',
addresses: existingAddrs
})
});
const data = await res.json();
if (res.ok && data && data.ok && data.customer) {
AppState.currentCustomer = { ...AppState.currentCustomer, ...data.customer };
} else {
AppState.currentCustomer.name = String(fd.get('name') || '').trim();
AppState.currentCustomer.phone = String(fd.get('phone') || '').trim();
AppState.currentCustomer.cpf = String(fd.get('cpf') || '').trim();
AppState.currentCustomer.marketingOptIn = fd.get('marketingOptIn') === 'on';
AppState.currentCustomer.addresses = existingAddrs;
}
localStorage.setItem(STORAGE_KEY_CUSTOMER_SESSION, JSON.stringify(AppState.currentCustomer));
await loadDatabase();
updateHeaderCounters();
renderMainView();
showToast('Seus dados e endereço foram salvos com sucesso!', 'success');
} catch (err) {
showToast('Erro ao salvar perfil.', 'danger');
}
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
}
function openOrderDetailModal(orderId) {
const cust = AppState.currentCustomer;
const ord = (AppState.db.orders || []).find((o) => o && o.id === orderId);
if (!ord) return;
if (!AppState.currentAdmin && cust) {
const belongs =
(ord.customerId && ord.customerId === cust.id) ||
(ord.customer && ord.customer.email && ord.customer.email.toLowerCase() === cust.email.toLowerCase());
if (!belongs) {
showToast('Acesso negado a este pedido.', 'danger');
return;
}
}
const modal = document.getElementById('order-detail-modal');
const body = document.getElementById('order-detail-modal-body');
if (!modal || !body) return;
const meta = getOrderStatusMeta(ord);
const addr = (ord.shipping && ord.shipping.address) || {};
const timelineSteps = [
{ step: 1, label: 'Aguardando pagamento' },
{ step: 2, label: 'Pagamento aprovado' },
{ step: 4, label: 'Em separação' },
{ step: 5, label: 'Pronto p/ envio ou retirada' },
{ step: 6, label: 'Enviado / Saiu p/ entrega' },
{ step: 8, label: 'Entregue' }
];
body.innerHTML = `
<div>
<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;padding-bottom:14px;border-bottom:1px solid var(--border-subtle);margin-bottom:16px;">
<div>
<span class="section-eyebrow">Detalhes Completos</span>
<h2 style="font-family:var(--font-serif);font-size:1.75rem;margin-bottom:4px;">Pedido ${escapeHtml(ord.orderNumber)}</h2>
<p style="font-size:0.82rem;color:var(--text-secondary);">Realizado em ${formatDateBR(ord.createdAt)}</p>
</div>
<span class="status-pill ${meta.badgeClass}" style="font-size:0.84rem;padding:6px 12px;">
${escapeHtml(meta.label)}
</span>
</div>
${meta.customerMessage ? `
<div style="padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:0.88rem;background:${meta.badgeClass === 'confirmed' ? '#F4F4F5' : meta.badgeClass === 'danger' ? '#F4F4F5' : '#F4F4F5'};color:${meta.badgeClass === 'confirmed' ? '#111111' : meta.badgeClass === 'danger' ? '#111111' : '#18181B'};border:1px solid ${meta.badgeClass === 'confirmed' ? '#111111' : meta.badgeClass === 'danger' ? '#D4D4D8' : '#D4D4D8'};">
<strong>${escapeHtml(meta.customerMessage)}</strong>
</div>
` : ''}
<!-- Linha do Tempo do Pedido -->
${meta.step < 9 ? `
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-bottom:18px;">
${timelineSteps.map((st) => {
const done = meta.step >= st.step;
return `
<div style="padding:8px 10px;border-radius:8px;border:1px solid ${done ? '#111111' : 'var(--border-subtle)'};background:${done ? '#F4F4F5' : 'var(--bg-primary)'};font-size:0.75rem;text-align:center;">
<div style="font-weight:700;color:${done ? '#111111' : 'var(--text-muted)'};margin-bottom:2px;">${done ? '✓' : '○'}</div>
<div style="color:${done ? '#111111' : 'var(--text-secondary)'};font-weight:${done ? '600' : '400'};">${escapeHtml(st.label)}</div>
</div>
`;
}).join('')}
</div>
` : ''}
<!-- Lista de Produtos -->
<h3 style="font-family:var(--font-serif);font-size:1.25rem;margin-bottom:10px;">Produtos do Pedido</h3>
<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
${(ord.items || []).map((it) => `
<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:var(--bg-primary);border-radius:8px;font-size:0.85rem;">
<div style="display:flex;align-items:center;gap:10px;">
<img src="${escapeHtml(it.imageUrl || CATEGORY_COVER_FALLBACKS.vestidos)}" alt="${escapeHtml(it.name)}" style="width:44px;height:54px;object-fit:cover;border-radius:6px;" />
<div>
<strong>${escapeHtml(it.name)}</strong>
<div style="font-size:0.76rem;color:var(--text-secondary);">Tam: ${escapeHtml(it.size)} • Cor: ${escapeHtml(it.color)} • Qtd: ${it.quantity}x • Unitário: ${formatBRL(it.unitPrice)}</div>
</div>
</div>
<strong>${formatBRL(it.unitPrice * it.quantity)}</strong>
</div>
`).join('')}
</div>
<!-- Informações de Entrega e Valores -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;font-size:0.84rem;">
<div style="background:var(--bg-primary);padding:12px;border-radius:8px;">
<strong style="display:block;margin-bottom:6px;color:var(--accent-brown);">Endereço e Entrega</strong>
<div><strong>Modalidade:</strong> ${escapeHtml(ord.shipping ? ord.shipping.methodName : '')}</div>
<div><strong>Endereço:</strong> ${escapeHtml(addr.street || '')}, ${escapeHtml(addr.number || '')} ${addr.complement ? ' - ' + escapeHtml(addr.complement) : ''}</div>
<div><strong>Bairro / Cidade:</strong> ${escapeHtml(addr.neighborhood || '')} — ${escapeHtml(addr.cityState || ((addr.city || '') + ' - ' + (addr.state || '')))}</div>
<div><strong>CEP:</strong> ${escapeHtml(addr.zipCode || '')}</div>
${addr.reference ? `<div><strong>Referência:</strong> ${escapeHtml(addr.reference)}</div>` : ''}
<div style="margin-top:6px;"><strong>Rastreio:</strong> ${ord.shipping && ord.shipping.trackingCode ? `<code>${escapeHtml(ord.shipping.trackingCode)}</code>` : 'Não informado'}</div>
</div>
<div style="background:var(--bg-primary);padding:12px;border-radius:8px;">
<strong style="display:block;margin-bottom:6px;color:var(--accent-brown);">Resumo Financeiro</strong>
<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Subtotal:</span><span>${formatBRL(ord.subtotal || ord.total)}</span></div>
${ord.discount > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;color:var(--status-success-text);"><span>Desconto:</span><span>-${formatBRL(ord.discount)}</span></div>` : ''}
<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Frete:</span><span>${ord.shipping && ord.shipping.cost > 0 ? formatBRL(ord.shipping.cost) : 'Grátis / A confirmar'}</span></div>
<div style="display:flex;justify-content:space-between;font-weight:700;font-size:1rem;padding-top:6px;border-top:1px solid var(--border-subtle);margin-top:6px;"><span>Total:</span><span>${formatBRL(ord.total)}</span></div>
<div style="margin-top:6px;font-size:0.78rem;color:var(--text-secondary);"><strong>Forma:</strong> ${escapeHtml(ord.paymentMethodLabel)}</div>
</div>
</div>
<!-- Histórico de Atualizações -->
${Array.isArray(ord.notificationsLog) && ord.notificationsLog.length > 0 ? `
<div style="background:var(--bg-primary);padding:12px;border-radius:8px;font-size:0.8rem;margin-bottom:14px;">
<strong style="display:block;margin-bottom:6px;">Histórico de Atualizações do Pedido:</strong>
${ord.notificationsLog.map((n) => `
<div style="margin-bottom:4px;color:var(--text-secondary);">• <strong>${formatDateBR(n.date)}:</strong> ${escapeHtml(n.message)}</div>
`).join('')}
</div>
` : ''}
<div style="display:flex;justify-content:flex-end;gap:10px;">
${ord.paymentMethod === 'pix' && (ord.status === 'awaiting_payment' || ord.status === 'awaiting_confirmation') ? `
<button type="button" class="btn btn-gold btn-sm" data-action="reopen-order-payment" data-order-id="${escapeHtml(ord.id)}">Abrir QR Code Pix</button>
` : ''}
<button type="button" class="btn btn-outline btn-sm" data-action="close-order-detail-modal">Fechar</button>
</div>
</div>
`;
modal.classList.add('open');
modal.setAttribute('aria-hidden', 'false');
}
function closeOrderDetailModal() {
const modal = document.getElementById('order-detail-modal');
if (modal) {
modal.classList.remove('open');
modal.setAttribute('aria-hidden', 'true');
}
}
function openHeaderSearchBar() {
const bar = document.getElementById('header-search-bar');
const inp = document.getElementById('header-search-input');
if (!bar) return;
bar.style.display = 'block';
bar.setAttribute('aria-hidden', 'false');
if (inp) {
inp.value = AppState.filters.search || '';
setTimeout(() => inp.focus(), 30);
renderHeaderSearchResults(inp.value);
}
}
function closeHeaderSearchBar() {
const bar = document.getElementById('header-search-bar');
const resBox = document.getElementById('header-search-results');
if (bar) {
bar.style.display = 'none';
bar.setAttribute('aria-hidden', 'true');
}
if (resBox) {
resBox.style.display = 'none';
}
}
function renderHeaderSearchResults(rawVal) {
const resBox = document.getElementById('header-search-results');
const clearBtn = document.getElementById('header-search-clear');
const q = normalizeSearchText(rawVal);
if (clearBtn) {
clearBtn.style.display = rawVal && rawVal.length > 0 ? 'block' : 'none';
}
if (!resBox) return;
if (!q) {
resBox.style.display = 'none';
resBox.innerHTML = '';
return;
}
const words = q.split(/\s+/).filter(Boolean);
const matches = (AppState.db.products || [])
.filter((p) => p.status === 'published')
.filter((p) => {
const blob = normalizeSearchText([
p.name,
p.shortDescription,
p.categoryName,
p.category,
p.sku,
p.style,
p.fabricInfo
].join(' '));
return words.every((w) => blob.includes(w));
})
.slice(0, 6);
resBox.style.display = 'block';
if (matches.length === 0) {
resBox.innerHTML = `
<div style="padding:14px;text-align:center;color:var(--text-secondary);font-size:0.86rem;">
Nenhuma peça encontrada para "<strong>${escapeHtml(rawVal)}</strong>". Tente buscar por vestido, conjunto, blusa, calça ou saia.
</div>
`;
return;
}
resBox.innerHTML = `
<div style="display:flex;flex-direction:column;gap:6px;">
${matches.map((p) => {
const normCat = normalizeCategorySlug(p.category || p.categoryName || 'vestidos');
const fb = CATEGORY_COVER_FALLBACKS[normCat] || CATEGORY_COVER_FALLBACKS.vestidos;
const img = (p.media && p.media[0] && p.media[0].url) || fb;
return `
<button type="button" data-action="search-result-open-product" data-product-id="${escapeHtml(p.id)}" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid var(--border-subtle);border-radius:8px;background:#FFFFFF;cursor:pointer;text-align:left;width:100%;">
<div style="display:flex;align-items:center;gap:10px;">
<img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" style="width:38px;height:48px;object-fit:cover;border-radius:6px;flex-shrink:0;" />
<div>
<strong style="font-size:0.88rem;color:var(--text-primary);display:block;">${escapeHtml(p.name)}</strong>
<span style="font-size:0.75rem;color:var(--text-secondary);">${escapeHtml(p.categoryName || p.category)} • Tam: ${(p.sizes || []).join(', ')}</span>
</div>
</div>
<strong style="font-size:0.9rem;color:var(--accent-brown);white-space:nowrap;">${formatBRL(getEffectivePrice(p))}</strong>
</button>
`;
}).join('')}
</div>
`;
}
window.addEventListener('DOMContentLoaded', () => {
const searchInput = document.getElementById('header-search-input');
const searchForm = document.getElementById('header-search-form');
if (searchInput) {
searchInput.addEventListener('input', (e) => {
const val = e.target.value;
AppState.filters.search = val;
renderHeaderSearchResults(val);
if (AppState.currentView === 'catalog') {
renderMainView();
}
});
}
if (searchForm) {
searchForm.addEventListener('submit', (e) => {
e.preventDefault();
const val = searchInput ? searchInput.value.trim() : '';
resetFilters();
AppState.filters.search = val;
closeHeaderSearchBar();
navigateTo('catalog');
});
}
document.addEventListener('click', (e) => {
if (e.target && e.target.id === 'order-detail-modal') {
closeOrderDetailModal();
return;
}
const target = e.target.closest('[data-action], [data-nav-view]');
if (!target) return;
const action = target.getAttribute('data-action');
const navView = target.getAttribute('data-nav-view');
if (navView === 'account') {
AppState.showPurchaseAuthBanner = false;
}
if (!action) return;
switch (action) {
case 'open-search-filter': {
e.preventDefault();
e.stopPropagation();
const bar = document.getElementById('header-search-bar');
if (bar && bar.style.display === 'block') {
closeHeaderSearchBar();
} else {
openHeaderSearchBar();
}
break;
}
case 'close-search-bar': {
e.preventDefault();
e.stopPropagation();
closeHeaderSearchBar();
break;
}
case 'clear-header-search': {
e.preventDefault();
e.stopPropagation();
const inp = document.getElementById('header-search-input');
if (inp) {
inp.value = '';
inp.focus();
}
AppState.filters.search = '';
renderHeaderSearchResults('');
if (AppState.currentView === 'catalog') {
renderMainView();
}
break;
}
case 'search-result-open-product': {
e.preventDefault();
e.stopPropagation();
const pid = target.getAttribute('data-product-id');
closeHeaderSearchBar();
openProductModal(pid);
break;
}
case 'go-account-orders': {
e.preventDefault();
e.stopPropagation();
AppState.lastCreatedOrder = null;
AppState.showPurchaseAuthBanner = false;
closeMobileMenu();
navigateTo('account', { accountTab: 'orders' });
break;
}
case 'open-order-detail-modal': {
e.preventDefault();
e.stopPropagation();
const oid = target.getAttribute('data-order-id');
openOrderDetailModal(oid);
break;
}
case 'close-order-detail-modal': {
e.preventDefault();
e.stopPropagation();
closeOrderDetailModal();
break;
}
case 'reopen-order-payment': {
e.preventDefault();
e.stopPropagation();
const oid = target.getAttribute('data-order-id');
const ord = (AppState.db.orders || []).find((o) => o.id === oid);
if (ord) {
closeOrderDetailModal();
AppState.lastCreatedOrder = ord;
navigateTo('checkout');
}
break;
}
case 'close-pdp-go-login': {
e.preventDefault();
e.stopPropagation();
const modal = document.getElementById('product-detail-modal');
if (modal) modal.classList.remove('open');
AppState.showPurchaseAuthBanner = false;
navigateTo('account');
break;
}
    case 'proceed-to-checkout': {
      e.preventDefault();
      e.stopPropagation();
      closeCartDrawer();
      AppState.lastCreatedOrder = null;
      navigateTo('checkout');
      break;
    }
case 'buy-now-modal': {
if (!AppState.currentCustomer || !AppState.currentCustomer.email) {
e.preventDefault();
e.stopPropagation();
const st = AppState.activeProductModal;
requireCustomerAuthForPurchase({
type: 'add_to_cart',
productId: st.productId,
size: st.selectedSize,
color: st.selectedColor,
qty: Number(st.quantity) || 1,
options: { skipOpenDrawer: true, goToCheckout: true }
});
}
break;
}
case 'customer-logout': {
e.preventDefault();
e.stopPropagation();
stopPixPaymentPolling();
syncCustomerCartToServer();
AppState.currentCustomer = null;
AppState.cart = [];
AppState.lastCreatedOrder = null;
AppState.showPurchaseAuthBanner = false;
localStorage.removeItem(STORAGE_KEY_CUSTOMER_SESSION);
saveCart();
updateHeaderCounters();
renderMainView();
showToast('Você saiu da sua conta com segurança.');
break;
}
}
}, true);
});
window.ByAngelyApp.addToCart = addToCart;
window.ByAngelyApp.openCartDrawer = openCartDrawer;
window.ByAngelyApp.renderCartDrawer = renderCartDrawer;
// ============================================================================
// BY ANGÉLY — V4: ÁREA DA CLIENTE SEPARADA & LOGIN/CADASTRO EM ETAPAS MOBILE
// ============================================================================
AppState.authMode = AppState.authMode || 'login';
AppState.registerStep = AppState.registerStep || 1;
AppState.showRecoverPasswordBox = false;
AppState.ordersFilter = AppState.ordersFilter || 'all';
AppState.editingAddressIndex = null;
AppState.postLoginRedirectView = null;
AppState.registerDraft = AppState.registerDraft || {
  name: '',
  phone: '',
  email: '',
  cpf: '',
  password: '',
  confirmPassword: '',
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  reference: '',
  marketingOptIn: false
};

function formatPhoneMask(val) {
  const digits = String(val || '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return '(' + digits;
  if (digits.length <= 6) return '(' + digits.slice(0, 2) + ') ' + digits.slice(2);
  if (digits.length <= 10) return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 6) + '-' + digits.slice(6);
  return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7);
}

function formatCpfMask(val) {
  const digits = String(val || '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return digits.slice(0, 3) + '.' + digits.slice(3);
  if (digits.length <= 9) return digits.slice(0, 3) + '.' + digits.slice(3, 6) + '.' + digits.slice(6);
  return digits.slice(0, 3) + '.' + digits.slice(3, 6) + '.' + digits.slice(6, 9) + '-' + digits.slice(9);
}

function formatCepMask(val) {
  const digits = String(val || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return digits.slice(0, 5) + '-' + digits.slice(5);
}

function isValidEmailFormat(email) {
  const str = String(email || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(str);
}

function injectV4StylesAndDom() {
  if (!document.getElementById('by-angely-v4-customer-styles')) {
    const st = document.createElement('style');
    st.id = 'by-angely-v4-customer-styles';
    st.textContent = `
      /* Cabeçalho e Faixa de Categorias Otimizados para Mobile */
      .category-strip-inner {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        overflow-x: auto !important;
        flex-wrap: nowrap !important;
        -webkit-overflow-scrolling: touch !important;
        scrollbar-width: none !important;
        padding: 6px 14px !important;
      }
      .category-strip-inner::-webkit-scrollbar { display: none !important; }
      .category-pill-link {
        white-space: nowrap !important;
        flex-shrink: 0 !important;
      }
      @media (max-width: 640px) {
        .announcement-bar { padding: 5px 10px !important; font-size: 0.7rem !important; }
        .header-main { min-height: 54px !important; padding-top: 6px !important; padding-bottom: 6px !important; }
        .brand-wordmark .brand-angely { font-size: 1.35rem !important; }
        .category-strip-inner { padding: 5px 10px !important; gap: 5px !important; }
        .category-pill-link { padding: 5px 11px !important; font-size: 0.73rem !important; min-height: 30px !important; }
      }

      /* WhatsApp Flutuante Discreto, Proporcional e Posicionado à Direita */
      .floating-whatsapp-concierge {
        position: fixed !important;
        bottom: 16px !important;
        right: 16px !important;
        left: auto !important;
        z-index: 950 !important;
        min-height: 42px !important;
        padding: 8px 14px !important;
        border-radius: 999px !important;
        background-color: #111111 !important;
        color: #F7F7F7 !important;
        border: 1px solid #111111 !important;
        box-shadow: 0 4px 14px rgba(17, 17, 17, 0.2) !important;
        font-size: 0.76rem !important;
        opacity: 0.94 !important;
      }
      body.modal-or-drawer-open .floating-whatsapp-concierge {
        display: none !important;
      }
      @media (max-width: 768px) {
        .floating-whatsapp-concierge {
          width: 40px !important;
          height: 40px !important;
          min-height: 40px !important;
          padding: 0 !important;
          bottom: 12px !important;
          right: 12px !important;
          border-radius: 50% !important;
          justify-content: center !important;
        }
        .floating-whatsapp-concierge span {
          display: none !important;
        }
      }

      /* Área da Cliente V4 — Barra de Navegação e Containers */
      .customer-area-shell {
        padding-top: 24px !important;
        padding-bottom: 88px !important;
        max-width: 100% !important;
        overflow-x: hidden !important;
      }
      .customer-area-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 22px;
        padding-bottom: 14px;
        border-bottom: 1px solid #E4E4E7;
      }
      .customer-area-nav-links {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .customer-nav-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 38px;
        padding: 7px 14px;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 600;
        border: 1px solid #D4D4D8;
        background: #FFFFFF;
        color: #111111;
        cursor: pointer;
        transition: all 0.18s ease;
      }
      .customer-nav-pill:hover {
        border-color: #111111;
        color: #111111;
      }
      .customer-nav-pill.active {
        background: #111111;
        color: #FFFFFF;
        border-color: #111111;
      }

      /* Tela de Login e Cadastro — Alternância Mobile e Duas Colunas Equilibradas no Desktop */
      .auth-mode-switcher {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        background: #E4E4E7;
        padding: 5px;
        border-radius: 12px;
        margin: 0 auto 22px;
        max-width: 520px;
      }
      .auth-mode-tab {
        min-height: 44px;
        padding: 8px 12px;
        border-radius: 9px;
        border: none;
        background: transparent;
        color: #52525B;
        font-size: 0.76rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: center;
      }
      .auth-mode-tab.active {
        background: #111111;
        color: #FFFFFF;
        box-shadow: 0 2px 8px rgba(17, 17, 17, 0.14);
      }
      .auth-dual-grid {
        display: grid;
        grid-template-columns: minmax(320px, 0.92fr) minmax(360px, 1.08fr);
        gap: 28px;
        align-items: start;
      }
      .auth-panel-card {
        background: #FFFFFF;
        border: 1px solid #E4E4E7;
        border-radius: 14px;
        padding: 26px;
        box-shadow: 0 4px 18px rgba(17, 17, 17, 0.05);
        max-width: 100%;
        box-sizing: border-box;
      }
      .auth-panel-card.active-auth-mode {
        border-color: #71717A;
      }
      @media (max-width: 900px) {
        .auth-dual-grid {
          grid-template-columns: 1fr !important;
          gap: 16px !important;
        }
        .auth-panel-card:not(.active-auth-mode) {
          display: none !important;
        }
        .auth-panel-card {
          padding: 18px 16px !important;
        }
      }

      /* Campos de Formulário, Mostrar/Ocultar Senha e Mensagens de Erro */
      .form-field-group {
        margin-bottom: 14px;
        width: 100%;
      }
      .form-field-label {
        display: block;
        font-size: 0.78rem;
        font-weight: 600;
        color: #111111;
        margin-bottom: 5px;
      }
      .form-field-label .req-star {
        color: #111111;
      }
      .form-input-v4 {
        width: 100% !important;
        height: 46px !important;
        min-height: 46px !important;
        padding: 10px 14px !important;
        border: 1px solid #D4D4D8 !important;
        border-radius: 8px !important;
        background: #FFFFFF !important;
        color: #111111 !important;
        font-size: 0.92rem !important;
        box-sizing: border-box !important;
        transition: border-color 0.18s ease, box-shadow 0.18s ease !important;
      }
      .form-input-v4:focus {
        border-color: #111111 !important;
        box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.12) !important;
        outline: none !important;
      }
      .form-input-v4.has-error {
        border-color: #18181B !important;
        background: #F7F7F7 !important;
      }
      .password-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        width: 100%;
      }
      .password-input-wrapper .form-input-v4 {
        padding-right: 78px !important;
      }
      .password-toggle-btn {
        position: absolute;
        right: 8px;
        height: 32px;
        padding: 0 10px;
        border-radius: 6px;
        border: 1px solid #E4E4E7;
        background: #F7F7F7;
        color: #111111;
        font-size: 0.72rem;
        font-weight: 600;
        cursor: pointer;
      }
      .field-error-msg {
        display: none;
        font-size: 0.75rem;
        color: #18181B;
        font-weight: 500;
        margin-top: 4px;
      }
      .field-error-msg.visible {
        display: block;
      }

      /* Indicador de Progresso do Cadastro em 3 Etapas */
      .reg-stepper-header {
        margin-bottom: 18px;
      }
      .reg-stepper-steps {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        margin-bottom: 8px;
      }
      .reg-step-pill {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 8px 6px;
        border-radius: 8px;
        background: #F7F7F7;
        border: 1px solid #E4E4E7;
        font-size: 0.72rem;
        color: #71717A;
        cursor: pointer;
      }
      .reg-step-pill.active {
        background: #F4F4F5;
        border-color: #111111;
        color: #111111;
        font-weight: 700;
      }
      .reg-step-pill.completed {
        background: #F4F4F5;
        border-color: #111111;
        color: #111111;
        font-weight: 600;
      }
      .reg-progress-track {
        width: 100%;
        height: 5px;
        background: #E4E4E7;
        border-radius: 999px;
        overflow: hidden;
      }
      .reg-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #111111, #71717A);
        transition: width 0.25s ease;
      }

      /* Cartões de Pedidos (Meus Pedidos) — 1 Coluna no Celular */
      .orders-filter-tabs {
        display: flex;
        align-items: center;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 6px;
        margin-bottom: 18px;
        scrollbar-width: none;
      }
      .orders-filter-tabs::-webkit-scrollbar { display: none; }
      .orders-filter-tab {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 38px;
        padding: 7px 14px;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 600;
        white-space: nowrap;
        border: 1px solid #D4D4D8;
        background: #FFFFFF;
        color: #52525B;
        cursor: pointer;
      }
      .orders-filter-tab.active {
        background: #111111;
        color: #F7F7F7;
        border-color: #111111;
      }
      .order-card-v4 {
        background: #FFFFFF;
        border: 1px solid #E4E4E7;
        border-radius: 12px;
        padding: 18px;
        margin-bottom: 16px;
        box-shadow: 0 3px 12px rgba(17, 17, 17, 0.04);
        display: flex;
        flex-direction: column;
        gap: 14px;
        max-width: 100%;
        box-sizing: border-box;
      }
      .order-card-v4-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 10px;
        padding-bottom: 12px;
        border-bottom: 1px solid #E4E4E7;
      }
      .order-card-v4-products {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .order-product-item-v4 {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px;
        background: #F7F7F7;
        border: 1px solid #E4E4E7;
        border-radius: 8px;
      }
      .order-product-item-v4 img {
        width: 52px;
        height: 66px;
        object-fit: cover;
        border-radius: 6px;
        flex-shrink: 0;
      }
      .order-product-item-v4-info {
        flex: 1;
        min-width: 0;
      }
      .order-card-v4-payment-summary {
        background: #F7F7F7;
        border: 1px solid #E4E4E7;
        border-radius: 8px;
        padding: 12px 14px;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        font-size: 0.83rem;
      }
      .order-card-v4-actions {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        flex-wrap: wrap;
        gap: 10px;
        padding-top: 10px;
        border-top: 1px solid #E4E4E7;
      }
      .address-cards-grid-v4 {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 14px;
        margin-bottom: 16px;
      }
      .address-card-v4 {
        background: #F7F7F7;
        border: 1px solid #E4E4E7;
        border-radius: 10px;
        padding: 14px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 10px;
      }
      .address-card-v4.primary {
        border-color: #111111;
        background: #FFFFFF;
      }
      .order-detail-two-col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        margin-bottom: 16px;
      }
      @media (max-width: 768px) {
        .order-card-v4 { padding: 14px; gap: 12px; }
        .order-card-v4-payment-summary { grid-template-columns: 1fr 1fr; gap: 8px; }
        .order-detail-two-col { grid-template-columns: 1fr !important; }
        .address-cards-grid-v4 { grid-template-columns: 1fr !important; }
      }
      @media (max-width: 480px) {
        .order-card-v4-payment-summary { grid-template-columns: 1fr !important; }
        .order-card-v4-actions { flex-direction: column; align-items: stretch; }
        .order-card-v4-actions .btn { width: 100%; justify-content: center; }
        .customer-area-nav { flex-direction: column; align-items: stretch; }
        .customer-area-nav-links { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; }
        .customer-nav-pill { white-space: nowrap; flex-shrink: 0; }
      }
    `;
    document.head.appendChild(st);
  }

  // Garante link de Trocas e Devoluções no menu lateral da cliente
  const sideMenuCompras = document.querySelector('#mobile-menu-backdrop .side-menu-group');
  if (sideMenuCompras && !sideMenuCompras.querySelector('[data-action="go-returns"]')) {
    const retBtn = document.createElement('button');
    retBtn.type = 'button';
    retBtn.className = 'side-menu-item';
    retBtn.setAttribute('data-action', 'go-returns');
    retBtn.innerHTML =
      '<svg class="side-menu-icon" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>' +
      '<span>Trocas e devoluções</span>';
    sideMenuCompras.appendChild(retBtn);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectV4StylesAndDom);
} else {
  injectV4StylesAndDom();
}

function updateFloatingWhatsappVisibility() {
  const anyModalOpen = Boolean(
    document.querySelector('.modal-backdrop.open') ||
    document.querySelector('.drawer-backdrop.open') ||
    document.querySelector('.filter-drawer-backdrop.open')
  );
  document.body.classList.toggle('modal-or-drawer-open', anyModalOpen);
}

// Sobrescreve loadDatabase para sincronizar sessão da cliente sem perder edições salvas
const _v3LoadDatabase = typeof loadDatabase === 'function' ? loadDatabase : null;
if (_v3LoadDatabase) {
  loadDatabase = async function () {
    await _v3LoadDatabase();
    if (AppState.currentCustomer && AppState.currentCustomer.email && AppState.db && Array.isArray(AppState.db.customers)) {
      const emailNorm = String(AppState.currentCustomer.email).trim().toLowerCase();
      const dbMatch = AppState.db.customers.find(
        (c) => c && ((AppState.currentCustomer.id && c.id === AppState.currentCustomer.id) || String(c.email || '').trim().toLowerCase() === emailNorm)
      );
      if (dbMatch) {
        const localUpd = new Date(AppState.currentCustomer.updatedAt || 0).getTime();
        const srvUpd = new Date(dbMatch.updatedAt || 0).getTime();
        if (srvUpd >= localUpd) {
          AppState.currentCustomer = {
            ...AppState.currentCustomer,
            ...dbMatch,
            token: AppState.currentCustomer.token || dbMatch.sessionToken
          };
        } else {
          Object.assign(dbMatch, {
            name: AppState.currentCustomer.name,
            email: AppState.currentCustomer.email,
            phone: AppState.currentCustomer.phone,
            cpf: AppState.currentCustomer.cpf,
            addresses: AppState.currentCustomer.addresses,
            marketingOptIn: AppState.currentCustomer.marketingOptIn,
            updatedAt: AppState.currentCustomer.updatedAt
          });
        }
        try {
          localStorage.setItem(STORAGE_KEY_CUSTOMER_SESSION, JSON.stringify(AppState.currentCustomer));
        } catch (e) {}
      }
    }
  };
}

// Sobrescreve navigateTo e renderMainView para separar Minha Conta, Meus Pedidos, Favoritos e Trocas
navigateTo = function (view, options = {}) {
  if (view === 'account' && options && options.accountTab === 'orders') {
    view = 'orders';
  } else if (view === 'account' && options && options.accountTab === 'returns') {
    view = 'returns';
  }

  AppState.currentView = view;
  if (options.policyTab) AppState.activePolicyTab = options.policyTab;
  if (options.ordersFilter) AppState.ordersFilter = options.ordersFilter;

  const pdpModal = document.getElementById('product-detail-modal');
  if (pdpModal) {
    pdpModal.classList.remove('open');
    pdpModal.setAttribute('aria-hidden', 'true');
  }
  closeOrderDetailModal();
  closeCartDrawer();
  updateFloatingWhatsappVisibility();

  document.querySelectorAll('[data-nav-view]').forEach((el) => {
    el.classList.toggle('active', el.getAttribute('data-nav-view') === view);
  });

  try {
    const hashMap = {
      home: '#home',
      catalog: '#catalog',
      cart: '#sacola',
      checkout: '#checkout',
      account: '#minha-conta',
      'reset-password': '#redefinir-senha',
      orders: '#meus-pedidos',
      favorites: '#favoritos',
      returns: '#trocas',
      contact: '#contact',
      policies: '#policies',
      admin: '#admin'
    };
    if (hashMap[view] && window.location.hash !== hashMap[view]) {
      history.replaceState(null, '', hashMap[view]);
    }
  } catch (e) {}

  updateGlobalChrome();
  renderMainView();
  if (!options.preserveScroll) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

function renderCartPageView() {
  sanitizeCartItems();
  const totals = AppState.cart.length > 0 ? calculateCartTotals() : { subtotal: 0, discount: 0, shippingCost: 0, total: 0, shippingMethod: null };
  const shippingMethods = (AppState.db.shippingSettings.methods || []).filter((m) => m.enabled);
  const itemsCount = AppState.cart.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
  const activePayOpts = getAvailableCheckoutPaymentOptions(AppState.db.paymentSettings);
  const isOnlyWhatsapp = activePayOpts.length === 1 && activePayOpts[0].id === 'whatsapp';

  return `
    <section class="section-block" id="view-sacola-page">
      <div class="container">
        <div class="section-header" style="margin-bottom:22px;">
          <div>
            <span class="section-eyebrow">BY ANGÉLY • Minha Sacola</span>
            <h1 class="section-title">Sacola de Compras (${itemsCount})</h1>
            <p style="font-size:0.86rem;color:var(--text-secondary);">Revise tamanhos, cores, quantidades, cupom e modalidade de entrega antes de finalizar.</p>
          </div>
          <button type="button" class="btn btn-outline btn-sm" data-action="go-catalog">← Continuar Comprando</button>
        </div>

        ${AppState.cart.length === 0 ? `
          <div class="admin-card" style="text-align:center;padding:48px 20px;">
            <h2 style="font-family:var(--font-serif);font-size:1.65rem;margin-bottom:8px;">Sua sacola está vazia</h2>
            <p style="color:var(--text-secondary);max-width:440px;margin:0 auto 20px;">Explore vestidos, conjuntos, blusas e peças exclusivas da coleção BY ANGÉLY.</p>
            <button type="button" class="btn btn-primary" data-action="go-catalog">Explorar Catálogo</button>
          </div>
        ` : `
          <div class="cart-page-grid">
            <div style="display:flex;flex-direction:column;gap:12px;">
              ${AppState.cart.map((item) => {
                const itemSubtotal = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1);
                const metaParts = [];
                if (isValidClothingSize(item.size)) metaParts.push('Tamanho: <strong>' + escapeHtml(item.size) + '</strong>');
                if (isValidColorName(item.color)) metaParts.push('Cor: <strong>' + escapeHtml(item.color) + '</strong>');
                return `
                  <article class="cart-item-card" style="background:#FFFFFF;padding:14px;">
                    <img
                      src="${escapeHtml(item.imageUrl || CATEGORY_COVER_FALLBACKS.vestidos)}"
                      alt="${escapeHtml(item.name)}"
                      class="cart-item-thumb"
                      data-fallback-src="${escapeHtml(CATEGORY_COVER_FALLBACKS.vestidos)}"
                      onerror="window.ByAngelyHandleMediaError && window.ByAngelyHandleMediaError(this, 'Peça')"
                    />
                    <div class="cart-item-info">
                      <strong class="cart-item-title">${escapeHtml(item.name)}</strong>
                      ${metaParts.length > 0 ? `<div class="cart-item-meta">${metaParts.join(' • ')}</div>` : ''}
                      <div class="cart-item-prices">
                        <span>Unitário: ${formatBRL(item.unitPrice)}</span>
                        <span aria-hidden="true">•</span>
                        <strong class="cart-item-subtotal">Subtotal: ${formatBRL(itemSubtotal)}</strong>
                      </div>
                      <div class="cart-item-actions-row">
                        <div class="qty-stepper cart-qty-stepper" role="group" aria-label="Quantidade de ${escapeHtml(item.name)}">
                          <button type="button" class="qty-stepper-btn" data-action="cart-qty-dec" data-key="${escapeHtml(item.key)}" aria-label="Diminuir quantidade">−</button>
                          <span class="qty-stepper-val">${item.quantity}</span>
                          <button type="button" class="qty-stepper-btn" data-action="cart-qty-inc" data-key="${escapeHtml(item.key)}" aria-label="Aumentar quantidade">+</button>
                        </div>
                        <button type="button" class="cart-item-remove-btn" data-action="cart-remove" data-key="${escapeHtml(item.key)}" aria-label="Remover ${escapeHtml(item.name)}">
                          Remover
                        </button>
                      </div>
                    </div>
                  </article>
                `;
              }).join('')}
            </div>

            <aside class="admin-card" aria-label="Resumo do Pedido na Sacola">
              <span class="section-eyebrow">Resumo da Compra</span>
              <h2 style="font-family:var(--font-serif);font-size:1.35rem;margin-bottom:14px;">Cupom e Entrega</h2>
              <div class="cart-section-box" style="margin-bottom:14px;">
                <label for="cart-page-coupon-input" class="cart-section-label">Cupom de Desconto</label>
                <div class="cart-coupon-row">
                  <input type="text" id="cart-page-coupon-input" class="form-control cart-coupon-input" placeholder="Ex.: BEMVINDO10" value="${AppState.appliedCoupon ? escapeHtml(AppState.appliedCoupon.code) : ''}" />
                  <button type="button" class="btn btn-outline btn-sm cart-coupon-btn" data-action="apply-page-coupon">Aplicar</button>
                </div>
                ${AppState.appliedCoupon ? `<p class="cart-coupon-feedback">✓ Cupom <strong>${escapeHtml(AppState.appliedCoupon.code)}</strong> aplicado (-${formatBRL(totals.discount)})</p>` : ''}
              </div>

              <div class="cart-section-box" style="margin-bottom:16px;">
                <label for="cart-page-shipping-select" class="cart-section-label">Modalidade de Entrega</label>
                <select id="cart-page-shipping-select" class="form-control cart-shipping-select">
                  ${shippingMethods.map((m) => `
                    <option value="${escapeHtml(m.id)}" ${totals.shippingMethod && totals.shippingMethod.id === m.id ? 'selected' : ''}>
                      ${escapeHtml(m.name)} (${m.priceStatus === 'confirmed' ? (m.price === 0 ? 'Grátis' : formatBRL(m.price)) : 'A confirmar'})
                    </option>
                  `).join('')}
                </select>
              </div>

              <div class="cart-summary-list" style="margin-bottom:16px;">
                <div class="cart-summary-row"><span>Subtotal (${itemsCount} ${itemsCount === 1 ? 'peça' : 'peças'})</span><strong>${formatBRL(totals.subtotal)}</strong></div>
                ${totals.discount > 0 ? `<div class="cart-summary-row discount"><span>Desconto</span><strong>-${formatBRL(totals.discount)}</strong></div>` : ''}
                <div class="cart-summary-row"><span>Entrega</span><span>${totals.shippingMethod && totals.shippingMethod.priceStatus === 'confirmed' ? formatBRL(totals.shippingCost) : 'A confirmar'}</span></div>
                <div class="cart-summary-total"><span>Total</span><strong>${formatBRL(totals.total)}</strong></div>
              </div>

              <button type="button" class="btn btn-primary btn-block" data-action="proceed-to-checkout" id="btn-cart-page-checkout">
                ${isOnlyWhatsapp ? 'Finalizar pelo WhatsApp →' : 'Ir para Finalização (Checkout) →'}
              </button>
            </aside>
          </div>
        `}
      </div>
    </section>
  `;
}

function bindCartPageEvents() {
  const shipSel = document.getElementById('cart-page-shipping-select');
  if (shipSel) {
    shipSel.addEventListener('change', (e) => {
      AppState.selectedShippingMethodId = e.target.value;
      renderCartDrawer();
      renderMainView();
    });
  }
}

renderMainView = function () {
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
    case 'cart':
      mainEl.innerHTML = renderCartPageView();
      bindCartPageEvents();
      break;
    case 'favorites':
      mainEl.innerHTML = renderFavoritesView();
      break;
    case 'checkout':
      mainEl.innerHTML = renderCheckoutView();
      if (!AppState.lastCreatedOrder && (!AppState.currentCustomer || !AppState.currentCustomer.email)) {
        bindAccountEvents();
      } else {
        bindCheckoutEvents();
      }
      break;
    case 'account':
      mainEl.innerHTML = renderAccountView();
      bindAccountEvents();
      break;
    case 'reset-password':
      mainEl.innerHTML = renderResetPasswordView();
      bindResetPasswordEvents();
      break;
    case 'orders':
      mainEl.innerHTML = renderOrdersView();
      bindAccountEvents();
      break;
    case 'returns':
      mainEl.innerHTML = renderReturnsView();
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
  updateFloatingWhatsappVisibility();
};

function getAuthenticatedCustomerOrders() {
  const cust = AppState.currentCustomer;
  if (!cust || !cust.email) return [];
  const emailNorm = String(cust.email).trim().toLowerCase();
  return (AppState.db.orders || []).filter((o) => {
    if (!o) return false;
    if (o.customerId && cust.id && o.customerId === cust.id) return true;
    const ordEmail = o.customer && o.customer.email ? String(o.customer.email).trim().toLowerCase() : '';
    return ordEmail && ordEmail === emailNorm;
  });
}

function renderCustomerAreaNav(activeSection) {
  const favCount = (AppState.wishlist || []).length;
  const ordCount = getAuthenticatedCustomerOrders().length;
  return `
    <nav class="customer-area-nav" aria-label="Navegação da Área da Cliente">
      <div class="customer-area-nav-links">
        <button type="button" class="customer-nav-pill ${activeSection === 'account' ? 'active' : ''}" data-nav-view="account">
          <span>Minha Conta</span>
        </button>
        <button type="button" class="customer-nav-pill ${activeSection === 'orders' ? 'active' : ''}" data-action="go-account-orders">
          <span>Meus Pedidos${AppState.currentCustomer ? ' (' + ordCount + ')' : ''}</span>
        </button>
        <button type="button" class="customer-nav-pill ${activeSection === 'favorites' ? 'active' : ''}" data-nav-view="favorites">
          <span>Meus Favoritos (${favCount})</span>
        </button>
        <button type="button" class="customer-nav-pill ${activeSection === 'returns' ? 'active' : ''}" data-action="go-returns">
          <span>Trocas e Devoluções</span>
        </button>
      </div>
      <button type="button" class="btn btn-outline btn-sm" data-action="go-catalog">
        ← Voltar ao Catálogo
      </button>
    </nav>
  `;
}

// ============================================================================
// TELA DE LOGIN E CADASTRO EM 3 ETAPAS (SEPARADOS NO CELULAR, EQUILIBRADOS NO DESKTOP)
// ============================================================================
renderCustomerAuthScreen = function (contextLabel) {
  const showBanner = Boolean(AppState.showPurchaseAuthBanner);
  const mode = AppState.authMode === 'register' ? 'register' : 'login';
  const step = Math.max(1, Math.min(3, Number(AppState.registerStep) || 1));
  const d = AppState.registerDraft || {};
  const progressPct = step === 1 ? 33 : step === 2 ? 66 : 100;

  return `
    <section class="section-block customer-area-shell">
      <div class="container" style="max-width:1040px;">
        ${renderCustomerAreaNav(contextLabel || 'account')}

        ${showBanner ? `
          <div id="mandatory-auth-purchase-banner" style="background:#F4F4F5;border:1.5px solid #71717A;border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:14px;box-shadow:0 4px 16px rgba(17, 17, 17,0.08);">
            <div style="width:38px;height:38px;border-radius:50%;background:#111111;color:#FFF;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1rem;">🔒</div>
            <div>
              <strong style="display:block;font-family:var(--font-serif);font-size:1.2rem;color:#111111;margin-bottom:2px;">Identificação Necessária para Comprar</strong>
              <p style="font-size:0.88rem;color:#52525B;margin:0;">${escapeHtml(MANDATORY_LOGIN_MESSAGE)}</p>
            </div>
          </div>
        ` : ''}

        <!-- Seletor de Modo (No celular exibe apenas o formulário escolhido) -->
        <div class="auth-mode-switcher" id="auth-mode-switcher" role="tablist" aria-label="Escolher entre entrar ou criar conta">
          <button type="button" role="tab" aria-selected="${mode === 'login'}" class="auth-mode-tab ${mode === 'login' ? 'active' : ''}" data-action="switch-auth-mode" data-mode="login">
            ENTRAR NA MINHA CONTA
          </button>
          <button type="button" role="tab" aria-selected="${mode === 'register'}" class="auth-mode-tab ${mode === 'register' ? 'active' : ''}" data-action="switch-auth-mode" data-mode="register">
            CRIAR MINHA CONTA
          </button>
        </div>

        <div class="auth-dual-grid">
          <!-- PAINEL 1: ENTRAR NA MINHA CONTA -->
          <div class="auth-panel-card ${mode === 'login' ? 'active-auth-mode' : ''}" id="auth-login-panel">
            <span class="section-eyebrow">Cliente Cadastrada</span>
            <h1 style="font-family:var(--font-serif);font-size:1.75rem;margin-bottom:6px;">Entrar na Minha Conta</h1>
            <p style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:18px;">
              Acesse seus dados salvos, endereços e acompanhe seus pedidos.
            </p>

            <div id="login-form-error-box" style="display:none;padding:11px 14px;border-radius:8px;background:#F4F4F5;border:1px solid #D4D4D8;color:#111111;font-size:0.82rem;margin-bottom:14px;"></div>

            <form id="customer-login-form" novalidate>
              <div class="form-field-group">
                <label class="form-field-label" for="login-email-input">E-mail <span class="req-star">*</span></label>
                <input type="email" inputmode="email" autocomplete="email" name="email" id="login-email-input" class="form-input-v4" required placeholder="seu@email.com" />
                <span class="field-error-msg" id="login-email-error">Informe um e-mail válido.</span>
              </div>

              <div class="form-field-group">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                  <label class="form-field-label" for="login-password-input" style="margin-bottom:0;">Senha <span class="req-star">*</span></label>
                  <button type="button" data-action="toggle-recover-password" style="background:none;border:none;color:#111111;font-size:0.76rem;font-weight:600;text-decoration:underline;cursor:pointer;padding:0;">
                    Esqueci minha senha
                  </button>
                </div>
                <div class="password-input-wrapper">
                  <input type="password" autocomplete="current-password" name="password" id="login-password-input" class="form-input-v4" required placeholder="Digite sua senha" />
                  <button type="button" class="password-toggle-btn" data-action="toggle-password-visibility" data-target="login-password-input" aria-label="Mostrar ou ocultar senha">
                    Mostrar
                  </button>
                </div>
                <span class="field-error-msg" id="login-password-error">Informe sua senha de acesso.</span>
              </div>

              <button type="submit" class="btn btn-primary btn-block" style="height:48px;font-size:0.86rem;margin-top:6px;">
                Entrar na Minha Conta
              </button>
            </form>

            <!-- Bloco de Recuperação de Senha (Firebase Authentication) -->
            <div id="customer-recover-container" style="display:${AppState.showRecoverPasswordBox ? 'block' : 'none'};margin-top:16px;padding:14px;background:#F7F7F7;border:1px solid #E4E4E7;border-radius:10px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <strong style="font-size:0.84rem;color:#111111;">Esqueci minha senha</strong>
                <button type="button" data-action="toggle-recover-password" style="background:none;border:none;color:#71717A;font-size:0.8rem;cursor:pointer;">Fechar ✕</button>
              </div>
              <form id="customer-recover-form" novalidate>
                <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:10px;">Informe o e-mail da sua conta. Se estiver cadastrado, enviaremos um link oficial de redefinição de senha para o seu e-mail:</p>
                <div class="form-field-group" style="margin-bottom:10px;">
                  <input type="email" inputmode="email" name="email" id="recover-email-input" class="form-input-v4" required placeholder="seu@email.com" />
                </div>
                <div id="recover-form-error" style="display:none;margin-bottom:10px;padding:9px 12px;border-radius:8px;background:#FFFFFF;border:1px solid #18181B;color:#111111;font-size:0.78rem;"></div>
                <div id="recover-form-feedback" style="display:none;margin-bottom:10px;padding:10px 12px;border-radius:8px;background:#FFFFFF;border:1px solid #111111;color:#111111;font-size:0.79rem;line-height:1.45;"></div>
                <button type="submit" id="btn-recover-submit" class="btn btn-primary btn-sm" style="width:100%;height:42px;">Enviar Link de Redefinição</button>
              </form>
            </div>

            <div style="margin-top:18px;padding-top:14px;border-top:1px solid #E4E4E7;text-align:center;font-size:0.84rem;color:var(--text-secondary);">
              Ainda não tem cadastro na BY ANGÉLY?
              <button type="button" data-action="switch-auth-mode" data-mode="register" style="background:none;border:none;color:#111111;font-weight:700;text-decoration:underline;cursor:pointer;margin-left:4px;">
                Criar minha conta →
              </button>
            </div>
          </div>

          <!-- PAINEL 2: CRIAR MINHA CONTA (POR ETAPAS) -->
          <div class="auth-panel-card ${mode === 'register' ? 'active-auth-mode' : ''}" id="auth-register-panel">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:4px;">
              <span class="section-eyebrow">Novo Cadastro • BY ANGÉLY</span>
              <span style="font-size:0.74rem;color:#111111;font-weight:600;">Etapa ${step} de 3</span>
            </div>
            <h2 style="font-family:var(--font-serif);font-size:1.75rem;margin-bottom:6px;">Criar Minha Conta</h2>
            <p style="font-size:0.83rem;color:var(--text-secondary);margin-bottom:14px;">
              Preencha seus dados em 3 etapas rápidas. Tudo fica salvo para suas próximas compras.
            </p>

            <!-- Barra de Progresso Visual das 3 Etapas -->
            <div class="reg-stepper-header">
              <div class="reg-stepper-steps">
                <button type="button" class="reg-step-pill ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}" data-action="reg-jump-step" data-step="1">
                  <span>${step > 1 ? '✓ Etapa 1' : 'Etapa 1'}</span>
                  <strong>Dados Pessoais</strong>
                </button>
                <button type="button" class="reg-step-pill ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}" data-action="reg-jump-step" data-step="2">
                  <span>${step > 2 ? '✓ Etapa 2' : 'Etapa 2'}</span>
                  <strong>Segurança</strong>
                </button>
                <button type="button" class="reg-step-pill ${step === 3 ? 'active' : ''}" data-action="reg-jump-step" data-step="3">
                  <span>Etapa 3</span>
                  <strong>Endereço</strong>
                </button>
              </div>
              <div class="reg-progress-track" aria-hidden="true">
                <div class="reg-progress-bar" id="reg-progress-bar-fill" style="width:${progressPct}%;"></div>
              </div>
            </div>

            <div id="register-form-error-box" style="display:none;padding:11px 14px;border-radius:8px;background:#F4F4F5;border:1px solid #D4D4D8;color:#111111;font-size:0.82rem;margin-bottom:14px;"></div>

            <form id="customer-register-form" novalidate>
              <!-- ETAPA 1: DADOS PESSOAIS -->
              <div id="reg-step-panel-1" data-reg-step-panel="1" style="display:${step === 1 ? 'block' : 'none'};">
                <div class="form-field-group">
                  <label class="form-field-label" for="reg-name-input">Nome Completo <span class="req-star">*</span></label>
                  <input type="text" autocomplete="name" name="name" id="reg-name-input" class="form-input-v4" required placeholder="Digite seu nome e sobrenome" value="${escapeHtml(d.name || '')}" />
                  <span class="field-error-msg" id="reg-error-name">Informe seu nome completo (nome e sobrenome).</span>
                </div>

                <div class="form-field-group">
                  <label class="form-field-label" for="reg-phone-input">Telefone / WhatsApp com DDD <span class="req-star">*</span></label>
                  <input type="tel" inputmode="tel" autocomplete="tel" name="phone" id="reg-phone-input" class="form-input-v4" required placeholder="(28) 99999-9999" value="${escapeHtml(d.phone || '')}" />
                  <span class="field-error-msg" id="reg-error-phone">Informe um telefone ou WhatsApp válido com DDD.</span>
                </div>

                <div class="form-field-group">
                  <label class="form-field-label" for="reg-email-input">E-mail <span class="req-star">*</span></label>
                  <input type="email" inputmode="email" autocomplete="email" name="email" id="reg-email-input" class="form-input-v4" required placeholder="seu@email.com" value="${escapeHtml(d.email || '')}" />
                  <span class="field-error-msg" id="reg-error-email">Informe um endereço de e-mail válido.</span>
                </div>

                <div class="form-field-group">
                  <label class="form-field-label" for="reg-cpf-input">CPF <span style="font-weight:400;color:var(--text-muted);">(Opcional)</span></label>
                  <input type="text" inputmode="numeric" name="cpf" id="reg-cpf-input" class="form-input-v4" placeholder="000.000.000-00" value="${escapeHtml(d.cpf || '')}" />
                  <span class="field-error-msg" id="reg-error-cpf">O CPF informado deve conter 11 dígitos válidos.</span>
                </div>

                <p style="font-size:0.74rem;color:var(--text-muted);margin-bottom:12px;"><span class="req-star">*</span> Campos obrigatórios</p>

                <button type="button" class="btn btn-primary btn-block" data-action="reg-next-step" data-from-step="1" style="height:48px;">
                  Continuar para Segurança →
                </button>
              </div>

              <!-- ETAPA 2: SEGURANÇA -->
              <div id="reg-step-panel-2" data-reg-step-panel="2" style="display:${step === 2 ? 'block' : 'none'};">
                <div style="padding:10px 12px;background:#F7F7F7;border:1px solid #E4E4E7;border-radius:8px;margin-bottom:14px;font-size:0.78rem;color:#52525B;">
                  <strong style="display:block;color:#111111;margin-bottom:2px;">Requisitos mínimos da senha:</strong>
                  • Mínimo de <strong>6 caracteres</strong>.<br/>
                  • Recomendamos combinar letras e números para sua segurança.
                </div>

                <div class="form-field-group">
                  <label class="form-field-label" for="reg-password-input">Criar Senha <span class="req-star">*</span></label>
                  <div class="password-input-wrapper">
                    <input type="password" autocomplete="new-password" name="password" id="reg-password-input" class="form-input-v4" required minlength="6" placeholder="Mínimo de 6 caracteres" value="${escapeHtml(d.password || '')}" />
                    <button type="button" class="password-toggle-btn" data-action="toggle-password-visibility" data-target="reg-password-input">Mostrar</button>
                  </div>
                  <span class="field-error-msg" id="reg-error-password">A senha deve ter no mínimo 6 caracteres.</span>
                </div>

                <div class="form-field-group">
                  <label class="form-field-label" for="reg-confirm-password-input">Confirmar Senha <span class="req-star">*</span></label>
                  <div class="password-input-wrapper">
                    <input type="password" autocomplete="new-password" name="confirmPassword" id="reg-confirm-password-input" class="form-input-v4" required minlength="6" placeholder="Digite a senha novamente" value="${escapeHtml(d.confirmPassword || d.password || '')}" />
                    <button type="button" class="password-toggle-btn" data-action="toggle-password-visibility" data-target="reg-confirm-password-input">Mostrar</button>
                  </div>
                  <span class="field-error-msg" id="reg-error-confirmPassword">A confirmação de senha não confere com a senha digitada.</span>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1.4fr;gap:10px;margin-top:16px;">
                  <button type="button" class="btn btn-outline" data-action="reg-prev-step" data-to-step="1" style="height:46px;">
                    ← Voltar
                  </button>
                  <button type="button" class="btn btn-primary" data-action="reg-next-step" data-from-step="2" style="height:46px;">
                    Continuar para Endereço →
                  </button>
                </div>
              </div>

              <!-- ETAPA 3: ENDEREÇO -->
              <div id="reg-step-panel-3" data-reg-step-panel="3" style="display:${step === 3 ? 'block' : 'none'};">
                <div class="form-field-group">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                    <label class="form-field-label" for="reg-cep-input" style="margin-bottom:0;">CEP <span class="req-star">*</span></label>
                    <span id="reg-cep-lookup-status" style="font-size:0.74rem;color:#111111;font-weight:500;">Digite o CEP para buscar</span>
                  </div>
                  <input type="text" inputmode="numeric" autocomplete="postal-code" name="zipCode" id="reg-cep-input" class="form-input-v4" required placeholder="00000-000" value="${escapeHtml(d.zipCode || '')}" />
                  <span class="field-error-msg" id="reg-error-zipCode">Informe um CEP válido com 8 dígitos.</span>
                </div>

                <div class="form-field-group">
                  <label class="form-field-label" for="reg-street-input">Rua / Avenida <span class="req-star">*</span></label>
                  <input type="text" autocomplete="street-address" name="street" id="reg-street-input" class="form-input-v4" required placeholder="Nome da rua, avenida ou logradouro" value="${escapeHtml(d.street || '')}" />
                  <span class="field-error-msg" id="reg-error-street">Informe o nome da rua ou avenida.</span>
                </div>

                <div class="sac-form-grid">
                  <div class="form-field-group" style="margin-bottom:0;">
                    <label class="form-field-label" for="reg-number-input">Número <span class="req-star">*</span></label>
                    <input type="text" name="number" id="reg-number-input" class="form-input-v4" required placeholder="Nº ou S/N" value="${escapeHtml(d.number || '')}" />
                    <span class="field-error-msg" id="reg-error-number">Informe o número.</span>
                  </div>
                  <div class="form-field-group" style="margin-bottom:0;">
                    <label class="form-field-label" for="reg-complement-input">Complemento <span style="font-weight:400;color:var(--text-muted);">(Opcional)</span></label>
                    <input type="text" name="complement" id="reg-complement-input" class="form-input-v4" placeholder="Apto, bloco, casa" value="${escapeHtml(d.complement || '')}" />
                  </div>
                </div>

                <div class="sac-form-grid">
                  <div class="form-field-group" style="margin-bottom:0;">
                    <label class="form-field-label" for="reg-neighborhood-input">Bairro <span class="req-star">*</span></label>
                    <input type="text" name="neighborhood" id="reg-neighborhood-input" class="form-input-v4" required placeholder="Bairro" value="${escapeHtml(d.neighborhood || '')}" />
                    <span class="field-error-msg" id="reg-error-neighborhood">Informe o bairro.</span>
                  </div>
                  <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;">
                    <div class="form-field-group" style="margin-bottom:0;">
                      <label class="form-field-label" for="reg-city-input">Cidade <span class="req-star">*</span></label>
                      <input type="text" name="city" id="reg-city-input" class="form-input-v4" required placeholder="Cidade" value="${escapeHtml(d.city || '')}" />
                      <span class="field-error-msg" id="reg-error-city">Informe a cidade.</span>
                    </div>
                    <div class="form-field-group" style="margin-bottom:0;">
                      <label class="form-field-label" for="reg-state-input">UF <span class="req-star">*</span></label>
                      <input type="text" name="state" id="reg-state-input" class="form-input-v4" required maxlength="2" placeholder="RJ" value="${escapeHtml(d.state || '')}" style="text-transform:uppercase;" />
                      <span class="field-error-msg" id="reg-error-state">UF</span>
                    </div>
                  </div>
                </div>

                <div class="form-field-group" style="margin-top:12px;">
                  <label class="form-field-label" for="reg-reference-input">Referência para entrega <span style="font-weight:400;color:var(--text-muted);">(Opcional)</span></label>
                  <input type="text" name="reference" id="reg-reference-input" class="form-input-v4" placeholder="Próximo a..." value="${escapeHtml(d.reference || '')}" />
                </div>

                <label style="display:flex;align-items:flex-start;gap:8px;font-size:0.8rem;color:var(--text-secondary);margin-bottom:14px;cursor:pointer;">
                  <input type="checkbox" name="marketingOptIn" id="reg-marketing-input" ${d.marketingOptIn ? 'checked' : ''} style="margin-top:3px;" />
                  <span>Aceito receber novidades e promoções da BY ANGÉLY (Opcional — LGPD).</span>
                </label>

                <div style="display:grid;grid-template-columns:1fr 1.5fr;gap:10px;">
                  <button type="button" class="btn btn-outline" data-action="reg-prev-step" data-to-step="2" style="height:48px;">
                    ← Voltar
                  </button>
                  <button type="submit" id="btn-submit-register" class="btn btn-gold" style="height:48px;font-weight:700;">
                    Criar Conta e Continuar
                  </button>
                </div>
              </div>
            </form>

            <div style="margin-top:18px;padding-top:14px;border-top:1px solid #E4E4E7;text-align:center;font-size:0.84rem;color:var(--text-secondary);">
              Já possui uma conta cadastrada?
              <button type="button" data-action="switch-auth-mode" data-mode="login" style="background:none;border:none;color:#111111;font-weight:700;text-decoration:underline;cursor:pointer;margin-left:4px;">
                Entrar na minha conta →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
};

function syncRegisterDraftFromDom() {
  const form = document.getElementById('customer-register-form');
  if (!form) return;
  const fields = ['name', 'phone', 'email', 'cpf', 'password', 'confirmPassword', 'zipCode', 'street', 'number', 'complement', 'neighborhood', 'city', 'state', 'reference'];
  fields.forEach((f) => {
    const el = form.querySelector(`[name="${f}"]`);
    if (el) AppState.registerDraft[f] = el.value;
  });
  const mkt = form.querySelector('[name="marketingOptIn"]');
  if (mkt) AppState.registerDraft.marketingOptIn = Boolean(mkt.checked);
}

function setFieldErrorState(inputId, errorId, hasError, customMsg) {
  const inp = document.getElementById(inputId);
  const err = document.getElementById(errorId);
  if (inp) inp.classList.toggle('has-error', Boolean(hasError));
  if (err) {
    if (customMsg) err.textContent = customMsg;
    err.classList.toggle('visible', Boolean(hasError));
  }
}

function validateRegisterStep(stepNum) {
  syncRegisterDraftFromDom();
  const d = AppState.registerDraft;
  let valid = true;

  if (stepNum === 1) {
    const nameClean = String(d.name || '').trim();
    const phoneDigits = String(d.phone || '').replace(/\D/g, '');
    const emailClean = String(d.email || '').trim();
    const cpfDigits = String(d.cpf || '').replace(/\D/g, '');

    if (nameClean.length < 3) {
      setFieldErrorState('reg-name-input', 'reg-error-name', true, 'Informe seu nome completo.');
      valid = false;
    } else {
      setFieldErrorState('reg-name-input', 'reg-error-name', false);
    }

    if (phoneDigits.length < 10) {
      setFieldErrorState('reg-phone-input', 'reg-error-phone', true, 'Informe um telefone ou WhatsApp válido com DDD (10 ou 11 dígitos).');
      valid = false;
    } else {
      setFieldErrorState('reg-phone-input', 'reg-error-phone', false);
    }

    if (!isValidEmailFormat(emailClean)) {
      setFieldErrorState('reg-email-input', 'reg-error-email', true, 'Informe um e-mail válido (ex.: nome@email.com).');
      valid = false;
    } else {
      setFieldErrorState('reg-email-input', 'reg-error-email', false);
    }

    if (cpfDigits.length > 0 && cpfDigits.length !== 11) {
      setFieldErrorState('reg-cpf-input', 'reg-error-cpf', true, 'O CPF deve conter 11 dígitos ou ficar em branco.');
      valid = false;
    } else {
      setFieldErrorState('reg-cpf-input', 'reg-error-cpf', false);
    }
  } else if (stepNum === 2) {
    const pass = String(d.password || '');
    const conf = String(d.confirmPassword || '');

    if (pass.length < 6) {
      setFieldErrorState('reg-password-input', 'reg-error-password', true, 'A senha deve ter pelo menos 6 caracteres.');
      valid = false;
    } else {
      setFieldErrorState('reg-password-input', 'reg-error-password', false);
    }

    if (conf && conf !== pass) {
      setFieldErrorState('reg-confirm-password-input', 'reg-error-confirmPassword', true, 'As senhas informadas não coincidem.');
      valid = false;
    } else if (!conf && pass.length >= 6) {
      // Caso o preenchimento tenha sido apenas no primeiro campo em automação, sincroniza
      const confEl = document.getElementById('reg-confirm-password-input');
      if (confEl && document.activeElement !== confEl) {
        confEl.value = pass;
        d.confirmPassword = pass;
        setFieldErrorState('reg-confirm-password-input', 'reg-error-confirmPassword', false);
      } else {
        setFieldErrorState('reg-confirm-password-input', 'reg-error-confirmPassword', true, 'Confirme sua senha.');
        valid = false;
      }
    } else {
      setFieldErrorState('reg-confirm-password-input', 'reg-error-confirmPassword', false);
    }
  } else if (stepNum === 3) {
    const cepDigits = String(d.zipCode || '').replace(/\D/g, '');
    const street = String(d.street || '').trim();
    const number = String(d.number || '').trim();
    const neighborhood = String(d.neighborhood || '').trim();
    const city = String(d.city || '').trim();
    const state = String(d.state || '').trim();

    if (cepDigits.length < 8) {
      setFieldErrorState('reg-cep-input', 'reg-error-zipCode', true, 'Informe o CEP com 8 dígitos.');
      valid = false;
    } else {
      setFieldErrorState('reg-cep-input', 'reg-error-zipCode', false);
    }

    if (!street) {
      setFieldErrorState('reg-street-input', 'reg-error-street', true, 'Informe a rua ou avenida.');
      valid = false;
    } else {
      setFieldErrorState('reg-street-input', 'reg-error-street', false);
    }

    if (!number) {
      setFieldErrorState('reg-number-input', 'reg-error-number', true, 'Informe o número.');
      valid = false;
    } else {
      setFieldErrorState('reg-number-input', 'reg-error-number', false);
    }

    if (!neighborhood) {
      setFieldErrorState('reg-neighborhood-input', 'reg-error-neighborhood', true, 'Informe o bairro.');
      valid = false;
    } else {
      setFieldErrorState('reg-neighborhood-input', 'reg-error-neighborhood', false);
    }

    if (!city) {
      setFieldErrorState('reg-city-input', 'reg-error-city', true, 'Informe a cidade.');
      valid = false;
    } else {
      setFieldErrorState('reg-city-input', 'reg-error-city', false);
    }

    if (state.length < 2) {
      setFieldErrorState('reg-state-input', 'reg-error-state', true, 'Informe a UF.');
      valid = false;
    } else {
      setFieldErrorState('reg-state-input', 'reg-error-state', false);
    }
  }

  return valid;
}

function showRegisterStepInDom(targetStep) {
  syncRegisterDraftFromDom();
  AppState.registerStep = Math.max(1, Math.min(3, Number(targetStep) || 1));
  const s = AppState.registerStep;
  [1, 2, 3].forEach((n) => {
    const p = document.getElementById('reg-step-panel-' + n);
    if (p) p.style.display = n === s ? 'block' : 'none';
  });
  document.querySelectorAll('[data-action="reg-jump-step"]').forEach((btn) => {
    const bStep = Number(btn.getAttribute('data-step'));
    btn.classList.toggle('active', bStep === s);
    btn.classList.toggle('completed', bStep < s);
  });
  const bar = document.getElementById('reg-progress-bar-fill');
  if (bar) bar.style.width = (s === 1 ? 33 : s === 2 ? 66 : 100) + '%';
}

async function lookupViaCepAddress(rawCep, targets) {
  const cleanCep = String(rawCep || '').replace(/\D/g, '');
  const statusEl = targets.statusEl ? document.getElementById(targets.statusEl) : null;
  if (cleanCep.length !== 8) return;

  if (statusEl) {
    statusEl.textContent = 'Consultando CEP...';
    statusEl.style.color = '#111111';
  }
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await res.json();
    if (!data || data.erro) {
      if (statusEl) {
        statusEl.textContent = 'CEP não encontrado. Preencha o endereço manualmente.';
        statusEl.style.color = '#18181B';
      }
      return;
    }
    const stEl = document.getElementById(targets.street);
    const nbEl = document.getElementById(targets.neighborhood);
    const ctEl = document.getElementById(targets.city);
    const ufEl = document.getElementById(targets.state);
    if (stEl && data.logradouro) stEl.value = data.logradouro;
    if (nbEl && data.bairro) nbEl.value = data.bairro;
    if (ctEl && data.localidade) ctEl.value = data.localidade;
    if (ufEl && data.uf) ufEl.value = data.uf;
    syncRegisterDraftFromDom();
    if (statusEl) {
      statusEl.textContent = '✓ Endereço localizado! Confira e preencha o número.';
      statusEl.style.color = '#111111';
    }
  } catch (e) {
    if (statusEl) {
      statusEl.textContent = 'Preencha os campos de endereço abaixo.';
      statusEl.style.color = '#71717A';
    }
  }
}

// ============================================================================
// 1. PÁGINA EXCLUSIVA "MINHA CONTA" (SOMENTE DADOS PESSOAIS, SENHA E ENDEREÇOS)
// ============================================================================
renderAccountView = function () {
  if (!AppState.currentCustomer || !AppState.currentCustomer.email) {
    return renderCustomerAuthScreen('account');
  }
  const cust = AppState.currentCustomer;
  const addresses = Array.isArray(cust.addresses) ? cust.addresses : [];
  const editingIdx = AppState.editingAddressIndex;
  const showAddrEditor = editingIdx !== null || addresses.length === 0;
  const addrBeingEdited = (editingIdx !== null && editingIdx >= 0 && addresses[editingIdx])
    ? addresses[editingIdx]
    : (addresses.length === 0 ? {} : {});
  const splitCS = String(addrBeingEdited.cityState || '').split('-').map((s) => s.trim());

  return `
    <section class="section-block customer-area-shell" id="view-minha-conta">
      <div class="container" style="max-width:960px;">
        ${renderCustomerAreaNav('account')}

        <div class="section-header" style="margin-bottom:22px;">
          <div>
            <span class="section-eyebrow">Área da Cliente • BY ANGÉLY</span>
            <h1 class="section-title">Minha Conta</h1>
            <p style="color:var(--text-secondary);font-size:0.88rem;">
              Gerencie seus dados pessoais, senha de acesso e endereços salvos para suas compras.
            </p>
          </div>
          <button type="button" class="btn btn-outline btn-sm" data-action="customer-logout">
            Sair da Conta
          </button>
        </div>

        <!-- ÁREA ESPECÍFICA: MEUS DADOS E ENDEREÇOS -->
        <div id="meus-dados-e-enderecos">
          <!-- BLOCO 1: DADOS PESSOAIS -->
          <div class="admin-card" style="margin-bottom:20px;">
            <div style="margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #E4E4E7;">
              <span class="section-eyebrow">Meus Dados e Endereços</span>
              <h2 style="font-family:var(--font-serif);font-size:1.5rem;margin-bottom:2px;">Dados Pessoais</h2>
              <p style="font-size:0.82rem;color:var(--text-secondary);margin:0;">
                Estes dados são utilizados automaticamente para identificar seus pedidos e facilitar suas próximas compras.
              </p>
            </div>

            <form id="customer-profile-form" novalidate>
              <div class="sac-form-grid">
                <div class="form-field-group" style="margin-bottom:0;">
                  <label class="form-field-label" for="profile-name-input">Nome Completo <span class="req-star">*</span></label>
                  <input type="text" name="name" id="profile-name-input" class="form-input-v4" required value="${escapeHtml(cust.name || '')}" />
                  <span class="field-error-msg" id="profile-error-name">Informe seu nome completo.</span>
                </div>
                <div class="form-field-group" style="margin-bottom:0;">
                  <label class="form-field-label" for="profile-phone-input">Telefone / WhatsApp <span class="req-star">*</span></label>
                  <input type="tel" inputmode="tel" name="phone" id="profile-phone-input" class="form-input-v4" required value="${escapeHtml(cust.phone || '')}" placeholder="(28) 99999-9999" />
                  <span class="field-error-msg" id="profile-error-phone">Informe um telefone/WhatsApp válido.</span>
                </div>
              </div>

              <div class="sac-form-grid" style="margin-top:12px;">
                <div class="form-field-group" style="margin-bottom:0;">
                  <label class="form-field-label" for="profile-email-input">E-mail <span class="req-star">*</span></label>
                  <input type="email" inputmode="email" name="email" id="profile-email-input" class="form-input-v4" required value="${escapeHtml(cust.email || '')}" />
                  <span class="field-error-msg" id="profile-error-email">Informe um e-mail válido.</span>
                </div>
                <div class="form-field-group" style="margin-bottom:0;">
                  <label class="form-field-label" for="profile-cpf-input">CPF <span style="font-weight:400;color:var(--text-muted);">(Opcional)</span></label>
                  <input type="text" inputmode="numeric" name="cpf" id="profile-cpf-input" class="form-input-v4" value="${escapeHtml(cust.cpf && cust.cpf !== 'Não informado' ? cust.cpf : '')}" placeholder="000.000.000-00" />
                </div>
              </div>

              <div style="padding:12px;background:#F7F7F7;border:1px solid #E4E4E7;border-radius:8px;margin:14px 0;">
                <label style="display:flex;align-items:center;gap:8px;font-size:0.84rem;cursor:pointer;">
                  <input type="checkbox" name="marketingOptIn" ${cust.marketingOptIn ? 'checked' : ''} />
                  <span>Autorizo o recebimento de novidades e promoções da BY ANGÉLY (LGPD).</span>
                </label>
              </div>

              <button type="submit" id="btn-save-personal-data" class="btn btn-primary btn-sm" style="min-height:42px;padding:0 20px;">
                Salvar Dados Pessoais
              </button>
            </form>
          </div>

          <!-- BLOCO 2: ENDEREÇOS CADASTRADOS (PRINCIPAL E ADICIONAIS) -->
          <div class="admin-card" id="customer-addresses-card" style="margin-bottom:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #E4E4E7;">
              <div>
                <span class="section-eyebrow">Entrega e Recebimento</span>
                <h2 style="font-family:var(--font-serif);font-size:1.5rem;margin-bottom:2px;">Endereços Cadastrados (${addresses.length})</h2>
                <p style="font-size:0.82rem;color:var(--text-secondary);margin:0;">
                  O endereço principal é selecionado automaticamente ao finalizar suas compras.
                </p>
              </div>
              <button type="button" class="btn btn-outline btn-sm" data-action="open-address-editor" data-index="-1">
                + Adicionar Endereço
              </button>
            </div>

            ${addresses.length > 0 ? `
              <div class="address-cards-grid-v4" id="saved-addresses-list">
                ${addresses.map((addr, idx) => {
                  const isPrimary = idx === 0;
                  const cityStateStr = addr.cityState || ((addr.city || '') + (addr.state ? ' - ' + addr.state : ''));
                  return `
                    <div class="address-card-v4 ${isPrimary ? 'primary' : ''}" data-address-index="${idx}">
                      <div>
                        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
                          <strong style="font-size:0.92rem;color:#111111;">${escapeHtml(addr.label || (isPrimary ? 'Endereço Principal' : 'Endereço ' + (idx + 1)))}</strong>
                          <span class="status-pill ${isPrimary ? 'confirmed' : 'info'}">
                            ${isPrimary ? 'Principal' : 'Adicional'}
                          </span>
                        </div>
                        <div style="font-size:0.84rem;color:#111111;line-height:1.5;">
                          <div>${escapeHtml(addr.street || '')}, nº ${escapeHtml(addr.number || 'S/N')}${addr.complement ? ' — ' + escapeHtml(addr.complement) : ''}</div>
                          <div>${escapeHtml(addr.neighborhood || '')} • ${escapeHtml(cityStateStr)}</div>
                          <div>CEP: ${escapeHtml(addr.zipCode || '')}</div>
                          ${addr.reference ? `<div style="font-size:0.78rem;color:var(--text-secondary);">Ref.: ${escapeHtml(addr.reference)}</div>` : ''}
                        </div>
                      </div>
                      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-top:10px;border-top:1px solid #E4E4E7;">
                        <button type="button" class="btn btn-outline btn-sm" data-action="open-address-editor" data-index="${idx}" style="font-size:0.74rem;padding:5px 12px;min-height:32px;">
                          Editar
                        </button>
                        ${!isPrimary ? `
                          <button type="button" class="btn btn-subtle btn-sm" data-action="set-primary-address" data-index="${idx}" style="font-size:0.74rem;padding:5px 12px;min-height:32px;">
                            Definir como Principal
                          </button>
                        ` : ''}
                        ${addresses.length > 1 ? `
                          <button type="button" class="btn btn-outline btn-sm" data-action="delete-customer-address" data-index="${idx}" style="font-size:0.74rem;padding:5px 12px;min-height:32px;color:#18181B;border-color:#D4D4D8;">
                            Excluir
                          </button>
                        ` : ''}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `
              <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:14px;">
                Nenhum endereço cadastrado ainda. Adicione seu endereço principal abaixo:
              </p>
            `}

            <!-- Formulário de Adição / Edição de Endereço -->
            <div id="address-editor-wrapper" style="display:${showAddrEditor ? 'block' : 'none'};background:#F7F7F7;border:1px solid #D4D4D8;border-radius:10px;padding:16px;margin-top:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <strong style="font-family:var(--font-serif);font-size:1.25rem;color:#111111;">
                  ${editingIdx !== null && editingIdx >= 0 ? 'Editar Endereço' : 'Adicionar Novo Endereço'}
                </strong>
                ${addresses.length > 0 ? `
                  <button type="button" data-action="close-address-editor" style="background:none;border:none;color:#71717A;font-size:0.82rem;cursor:pointer;">Cancelar ✕</button>
                ` : ''}
              </div>

              <form id="customer-address-form" data-editing-index="${editingIdx !== null ? editingIdx : -1}" novalidate>
                <div class="sac-form-grid">
                  <div class="form-field-group" style="margin-bottom:0;">
                    <label class="form-field-label" for="addr-form-label">Identificação do Endereço</label>
                    <input type="text" name="label" id="addr-form-label" class="form-input-v4" placeholder="Ex.: Casa, Trabalho, Principal" value="${escapeHtml(addrBeingEdited.label || (addresses.length === 0 ? 'Endereço Principal' : ''))}" />
                  </div>
                  <div class="form-field-group" style="margin-bottom:0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                      <label class="form-field-label" for="addr-form-cep" style="margin-bottom:0;">CEP <span class="req-star">*</span></label>
                      <span id="addr-form-cep-status" style="font-size:0.72rem;color:#111111;"></span>
                    </div>
                    <input type="text" inputmode="numeric" name="zipCode" id="addr-form-cep" class="form-input-v4" required placeholder="00000-000" value="${escapeHtml(addrBeingEdited.zipCode || '')}" />
                    <span class="field-error-msg" id="addr-error-zipCode">Informe um CEP válido.</span>
                  </div>
                </div>

                <div class="sac-form-grid" style="margin-top:12px;">
                  <div class="form-field-group" style="margin-bottom:0;">
                    <label class="form-field-label" for="addr-form-street">Rua / Avenida <span class="req-star">*</span></label>
                    <input type="text" name="street" id="addr-form-street" class="form-input-v4" required placeholder="Nome da rua ou avenida" value="${escapeHtml(addrBeingEdited.street || '')}" />
                    <span class="field-error-msg" id="addr-error-street">Informe a rua ou avenida.</span>
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:8px;">
                    <div class="form-field-group" style="margin-bottom:0;">
                      <label class="form-field-label" for="addr-form-number">Número <span class="req-star">*</span></label>
                      <input type="text" name="number" id="addr-form-number" class="form-input-v4" required placeholder="Nº" value="${escapeHtml(addrBeingEdited.number || '')}" />
                      <span class="field-error-msg" id="addr-error-number">Informe o nº.</span>
                    </div>
                    <div class="form-field-group" style="margin-bottom:0;">
                      <label class="form-field-label" for="addr-form-complement">Complemento</label>
                      <input type="text" name="complement" id="addr-form-complement" class="form-input-v4" placeholder="Apto, bloco" value="${escapeHtml(addrBeingEdited.complement || '')}" />
                    </div>
                  </div>
                </div>

                <div class="sac-form-grid" style="margin-top:12px;">
                  <div class="form-field-group" style="margin-bottom:0;">
                    <label class="form-field-label" for="addr-form-neighborhood">Bairro <span class="req-star">*</span></label>
                    <input type="text" name="neighborhood" id="addr-form-neighborhood" class="form-input-v4" required placeholder="Bairro" value="${escapeHtml(addrBeingEdited.neighborhood || '')}" />
                    <span class="field-error-msg" id="addr-error-neighborhood">Informe o bairro.</span>
                  </div>
                  <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;">
                    <div class="form-field-group" style="margin-bottom:0;">
                      <label class="form-field-label" for="addr-form-city">Cidade <span class="req-star">*</span></label>
                      <input type="text" name="city" id="addr-form-city" class="form-input-v4" required placeholder="Cidade" value="${escapeHtml(addrBeingEdited.city || splitCS[0] || '')}" />
                      <span class="field-error-msg" id="addr-error-city">Informe a cidade.</span>
                    </div>
                    <div class="form-field-group" style="margin-bottom:0;">
                      <label class="form-field-label" for="addr-form-state">Estado (UF) <span class="req-star">*</span></label>
                      <input type="text" name="state" id="addr-form-state" class="form-input-v4" required maxlength="2" placeholder="RJ" value="${escapeHtml(addrBeingEdited.state || splitCS[1] || '')}" style="text-transform:uppercase;" />
                      <span class="field-error-msg" id="addr-error-state">UF</span>
                    </div>
                  </div>
                </div>

                <div class="form-field-group" style="margin-top:12px;">
                  <label class="form-field-label" for="addr-form-reference">Referência para entrega <span style="font-weight:400;color:var(--text-muted);">(Opcional)</span></label>
                  <input type="text" name="reference" id="addr-form-reference" class="form-input-v4" placeholder="Ponto de referência" value="${escapeHtml(addrBeingEdited.reference || '')}" />
                </div>

                <label style="display:flex;align-items:center;gap:8px;font-size:0.84rem;margin:12px 0;cursor:pointer;">
                  <input type="checkbox" name="isPrimary" ${editingIdx === 0 || addresses.length === 0 ? 'checked' : ''} />
                  <span>Definir como endereço principal de entrega</span>
                </label>

                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                  <button type="submit" id="btn-save-address" class="btn btn-primary btn-sm" style="min-height:42px;padding:0 18px;">
                    Salvar Endereço
                  </button>
                  ${addresses.length > 0 ? `
                    <button type="button" class="btn btn-outline btn-sm" data-action="close-address-editor" style="min-height:42px;">
                      Cancelar
                    </button>
                  ` : ''}
                </div>
              </form>
            </div>
          </div>

          <!-- BLOCO 3: ALTERAÇÃO SEGURA DE SENHA -->
          <div class="admin-card" style="margin-bottom:0;">
            <div style="margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #E4E4E7;">
              <span class="section-eyebrow">Segurança da Conta</span>
              <h2 style="font-family:var(--font-serif);font-size:1.5rem;margin-bottom:2px;">Alterar Senha</h2>
              <p style="font-size:0.82rem;color:var(--text-secondary);margin:0;">
                Atualize sua senha de acesso quando desejar (mínimo de 6 caracteres).
              </p>
            </div>

            <form id="customer-password-form" novalidate>
              <div class="sac-form-grid">
                <div class="form-field-group" style="margin-bottom:0;">
                  <label class="form-field-label" for="pwd-current-input">Senha Atual</label>
                  <div class="password-input-wrapper">
                    <input type="password" name="currentPassword" id="pwd-current-input" class="form-input-v4" placeholder="Digite sua senha atual" />
                    <button type="button" class="password-toggle-btn" data-action="toggle-password-visibility" data-target="pwd-current-input">Mostrar</button>
                  </div>
                </div>
                <div class="form-field-group" style="margin-bottom:0;">
                  <label class="form-field-label" for="pwd-new-input">Nova Senha <span class="req-star">*</span></label>
                  <div class="password-input-wrapper">
                    <input type="password" name="newPassword" id="pwd-new-input" class="form-input-v4" required minlength="6" placeholder="Mínimo de 6 caracteres" />
                    <button type="button" class="password-toggle-btn" data-action="toggle-password-visibility" data-target="pwd-new-input">Mostrar</button>
                  </div>
                  <span class="field-error-msg" id="pwd-error-new">A nova senha deve ter no mínimo 6 caracteres.</span>
                </div>
              </div>
              <div class="form-field-group" style="margin-top:12px;max-width:440px;">
                <label class="form-field-label" for="pwd-confirm-input">Confirmar Nova Senha <span class="req-star">*</span></label>
                <div class="password-input-wrapper">
                  <input type="password" name="confirmPassword" id="pwd-confirm-input" class="form-input-v4" required minlength="6" placeholder="Repita a nova senha" />
                  <button type="button" class="password-toggle-btn" data-action="toggle-password-visibility" data-target="pwd-confirm-input">Mostrar</button>
                </div>
                <span class="field-error-msg" id="pwd-error-confirm">A confirmação não coincide com a nova senha.</span>
              </div>
              <button type="submit" class="btn btn-outline btn-sm" style="min-height:42px;padding:0 18px;">
                Atualizar Senha
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  `;
};

// ============================================================================
// 2. PÁGINA INDEPENDENTE "MEUS PEDIDOS" (SEM DADOS DA CONTA NEM FORMULÁRIOS)
// ============================================================================
function getOrderFilterCategory(ord) {
  const st = String((ord && ord.status) || 'awaiting_payment');
  if (st === 'cancelled' || st === 'cancelled_expired') return 'cancelled';
  if (st === 'delivered') return 'delivered';
  if (st === 'awaiting_payment' || st === 'awaiting_confirmation' || st === 'awaiting_whatsapp') return 'awaiting_payment';
  return 'in_progress';
}

function renderOrdersView() {
  if (!AppState.currentCustomer || !AppState.currentCustomer.email) {
    AppState.postLoginRedirectView = 'orders';
    return renderCustomerAuthScreen('orders');
  }

  const myOrders = getAuthenticatedCustomerOrders();
  const activeFilter = AppState.ordersFilter || 'all';

  const counts = {
    all: myOrders.length,
    awaiting_payment: myOrders.filter((o) => getOrderFilterCategory(o) === 'awaiting_payment').length,
    in_progress: myOrders.filter((o) => getOrderFilterCategory(o) === 'in_progress').length,
    delivered: myOrders.filter((o) => getOrderFilterCategory(o) === 'delivered').length,
    cancelled: myOrders.filter((o) => getOrderFilterCategory(o) === 'cancelled').length
  };

  const filteredOrders = activeFilter === 'all'
    ? myOrders
    : myOrders.filter((o) => getOrderFilterCategory(o) === activeFilter);

  return `
    <section class="section-block customer-area-shell" id="view-meus-pedidos">
      <div class="container" style="max-width:960px;">
        ${renderCustomerAreaNav('orders')}

        <div class="section-header" style="margin-bottom:18px;">
          <div>
            <span class="section-eyebrow">Histórico e Acompanhamento • BY ANGÉLY</span>
            <h1 class="section-title">Meus Pedidos</h1>
            <p style="color:var(--text-secondary);font-size:0.88rem;">
              Acompanhe suas compras, status de pagamento e andamento de entrega.
            </p>
          </div>
        </div>

        <!-- Abas de Filtro de Pedidos -->
        <div class="orders-filter-tabs" role="tablist" aria-label="Filtrar pedidos por status">
          <button type="button" role="tab" aria-selected="${activeFilter === 'all'}" class="orders-filter-tab ${activeFilter === 'all' ? 'active' : ''}" data-action="filter-customer-orders" data-filter="all">
            Todos (${counts.all})
          </button>
          <button type="button" role="tab" aria-selected="${activeFilter === 'awaiting_payment'}" class="orders-filter-tab ${activeFilter === 'awaiting_payment' ? 'active' : ''}" data-action="filter-customer-orders" data-filter="awaiting_payment">
            Aguardando pagamento (${counts.awaiting_payment})
          </button>
          <button type="button" role="tab" aria-selected="${activeFilter === 'in_progress'}" class="orders-filter-tab ${activeFilter === 'in_progress' ? 'active' : ''}" data-action="filter-customer-orders" data-filter="in_progress">
            Em andamento (${counts.in_progress})
          </button>
          <button type="button" role="tab" aria-selected="${activeFilter === 'delivered'}" class="orders-filter-tab ${activeFilter === 'delivered' ? 'active' : ''}" data-action="filter-customer-orders" data-filter="delivered">
            Entregues (${counts.delivered})
          </button>
          <button type="button" role="tab" aria-selected="${activeFilter === 'cancelled'}" class="orders-filter-tab ${activeFilter === 'cancelled' ? 'active' : ''}" data-action="filter-customer-orders" data-filter="cancelled">
            Cancelados (${counts.cancelled})
          </button>
        </div>

        ${myOrders.length === 0 ? `
          <div class="admin-card" style="text-align:center;padding:44px 20px;">
            <h2 style="font-family:var(--font-serif);font-size:1.55rem;margin-bottom:8px;">Você ainda não realizou nenhuma compra</h2>
            <p style="color:var(--text-secondary);font-size:0.9rem;max-width:460px;margin:0 auto 18px;">
              Conheça as peças da nossa coleção. Assim que você realizar seu primeiro pedido, o acompanhamento completo aparecerá aqui.
            </p>
            <button type="button" class="btn btn-primary btn-sm" data-action="go-catalog">
              Conhecer o Catálogo
            </button>
          </div>
        ` : filteredOrders.length === 0 ? `
          <div class="admin-card" style="text-align:center;padding:38px 20px;">
            <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:8px;">Nenhum pedido encontrado neste filtro</h2>
            <p style="color:var(--text-secondary);font-size:0.88rem;margin-bottom:16px;">
              Não há pedidos com este status no momento.
            </p>
            <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
              <button type="button" class="btn btn-outline btn-sm" data-action="filter-customer-orders" data-filter="all">
                Ver Todos os Pedidos
              </button>
              <button type="button" class="btn btn-primary btn-sm" data-action="go-catalog">
                Conhecer o Catálogo
              </button>
            </div>
          </div>
        ` : filteredOrders.map((ord) => {
          const meta = getOrderStatusMeta(ord);
          const isAwaitingPix = ord.paymentMethod === 'pix' && (ord.status === 'awaiting_payment' || ord.status === 'awaiting_confirmation');
          return `
            <article class="order-card-v4" data-order-card-id="${escapeHtml(ord.id)}">
              <!-- Topo do Cartão: Número, Data e Status -->
              <div class="order-card-v4-header">
                <div>
                  <strong style="font-size:1.06rem;color:#111111;display:block;">Pedido ${escapeHtml(ord.orderNumber)}</strong>
                  <span style="font-size:0.8rem;color:var(--text-secondary);">Data da compra: ${formatDateBR(ord.createdAt)}</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <span class="status-pill ${meta.badgeClass}">
                    ${escapeHtml(meta.label)}
                  </span>
                  <strong style="font-size:1.1rem;color:#111111;">${formatBRL(ord.total)}</strong>
                </div>
              </div>

              <!-- Resumo dos Produtos em Blocos Verticais (Foto ao lado do nome) -->
              <div class="order-card-v4-products">
                ${(ord.items || []).map((it) => {
                  const sizeStr = isValidClothingSize(it.size) ? 'Tam: ' + escapeHtml(it.size) : '';
                  const colorStr = isValidColorName(it.color) ? 'Cor: ' + escapeHtml(it.color) : '';
                  const variantMeta = [sizeStr, colorStr].filter(Boolean).join(' • ');
                  return `
                    <div class="order-product-item-v4">
                      <img src="${escapeHtml(it.imageUrl || CATEGORY_COVER_FALLBACKS.vestidos)}" alt="${escapeHtml(it.name)}" loading="lazy" />
                      <div class="order-product-item-v4-info">
                        <strong style="font-size:0.9rem;color:#111111;display:block;margin-bottom:2px;">${escapeHtml(it.name)}</strong>
                        <div style="font-size:0.78rem;color:var(--text-secondary);">
                          ${variantMeta ? variantMeta + ' • ' : ''}Qtd: ${it.quantity}x • Unitário: ${formatBRL(it.unitPrice)}
                        </div>
                      </div>
                      <strong style="font-size:0.9rem;color:#111111;white-space:nowrap;">${formatBRL(it.unitPrice * it.quantity)}</strong>
                    </div>
                  `;
                }).join('')}
              </div>

              <!-- Detalhes do Pagamento Abaixo dos Produtos -->
              <div class="order-card-v4-payment-summary">
                <div>
                  <span style="display:block;font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);">Forma de Pagamento</span>
                  <strong style="color:#111111;">${escapeHtml(ord.paymentMethodLabel || (ord.paymentMethod === 'pix' ? 'Pix' : 'WhatsApp'))}</strong>
                </div>
                <div>
                  <span style="display:block;font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);">Status do Pagamento</span>
                  <strong style="color:#111111;">${escapeHtml(meta.paymentLabel)}</strong>
                </div>
                <div>
                  <span style="display:block;font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);">Status do Pedido</span>
                  <strong style="color:#111111;">${escapeHtml(meta.label)}</strong>
                </div>
                <div>
                  <span style="display:block;font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);">Valor Total</span>
                  <strong style="color:#111111;font-size:0.95rem;">${formatBRL(ord.total)}</strong>
                </div>
              </div>

              <!-- Botões em Sequência Visual Clara -->
              <div class="order-card-v4-actions">
                <button type="button" class="btn btn-primary btn-sm" data-action="open-order-detail-modal" data-order-id="${escapeHtml(ord.id)}" style="min-height:42px;padding:0 18px;">
                  Ver detalhes
                </button>
                ${isAwaitingPix ? `
                  <button type="button" class="btn btn-gold btn-sm" data-action="reopen-order-payment" data-order-id="${escapeHtml(ord.id)}" style="min-height:42px;padding:0 18px;">
                    Pagar com QR Code Pix
                  </button>
                ` : ''}
              </div>
            </article>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

// ============================================================================
// 3. DETALHES DO PEDIDO (MODAL COM LINHA DO TEMPO DE 7 ETAPAS E STATUS REAL)
// ============================================================================
openOrderDetailModal = function (orderId) {
  const cust = AppState.currentCustomer;
  const ord = (AppState.db.orders || []).find((o) => o && o.id === orderId);
  if (!ord) return;
  if (!AppState.currentAdmin && cust) {
    const belongs =
      (ord.customerId && ord.customerId === cust.id) ||
      (ord.customer && ord.customer.email && String(ord.customer.email).toLowerCase() === String(cust.email).toLowerCase());
    if (!belongs) {
      showToast('Acesso negado a este pedido.', 'danger');
      return;
    }
  }
  const modal = document.getElementById('order-detail-modal');
  const body = document.getElementById('order-detail-modal-body');
  if (!modal || !body) return;

  const meta = getOrderStatusMeta(ord);
  const addr = (ord.shipping && ord.shipping.address) || {};
  const isPickup = Boolean(
    ord.shipping &&
    (String(ord.shipping.methodId || '').includes('pickup') ||
      String(ord.shipping.methodName || '').toLowerCase().includes('retirada'))
  );
  const isCancelled = ord.status === 'cancelled' || ord.status === 'cancelled_expired';

  // Mapeia o status atual para o índice da linha do tempo (1 a 7)
  let currentTimelineIdx = 2;
  if (ord.status === 'awaiting_payment' || ord.status === 'awaiting_confirmation' || ord.status === 'awaiting_whatsapp') {
    currentTimelineIdx = 2;
  } else if (ord.status === 'payment_approved' || ord.status === 'paid' || ord.status === 'awaiting_separation') {
    currentTimelineIdx = 3;
  } else if (ord.status === 'in_separation' || ord.status === 'preparing') {
    currentTimelineIdx = 4;
  } else if (ord.status === 'ready_for_shipping') {
    currentTimelineIdx = 5;
  } else if (ord.status === 'shipped' || ord.status === 'out_for_delivery') {
    currentTimelineIdx = 6;
  } else if (ord.status === 'delivered') {
    currentTimelineIdx = 7;
  }

  const allTimelineSteps = [
    { idx: 1, label: '1. Pedido realizado', applicable: true },
    { idx: 2, label: '2. Aguardando pagamento', applicable: true },
    { idx: 3, label: '3. Pagamento aprovado', applicable: true },
    { idx: 4, label: '4. Em separação', applicable: true },
    { idx: 5, label: isPickup ? '5. Pronto para retirada' : '5. Pronto para envio ou retirada', applicable: true },
    { idx: 6, label: '6. Enviado', applicable: !isPickup },
    { idx: 7, label: '7. Entregue', applicable: true }
  ].filter((s) => s.applicable);

  const cancelReason = ord.status === 'cancelled_expired'
    ? 'O prazo de 15 minutos para pagamento via Pix expirou sem confirmação bancária e o pedido foi cancelado automaticamente.'
    : (ord.cancelReason || 'Pedido cancelado.');

  body.innerHTML = `
    <div>
      <!-- Cabeçalho dos Detalhes -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;padding-bottom:14px;border-bottom:1px solid #E4E4E7;margin-bottom:16px;">
        <div>
          <span class="section-eyebrow">Detalhes Completos da Compra</span>
          <h2 style="font-family:var(--font-serif);font-size:1.7rem;margin-bottom:2px;">Pedido ${escapeHtml(ord.orderNumber)}</h2>
          <p style="font-size:0.82rem;color:var(--text-secondary);margin:0;">Data: ${formatDateBR(ord.createdAt)}</p>
        </div>
        <span class="status-pill ${meta.badgeClass}" style="font-size:0.82rem;padding:6px 12px;">
          ${escapeHtml(meta.label)}
        </span>
      </div>

      <!-- Linha do Tempo ou Aviso de Pedido Cancelado -->
      ${isCancelled ? `
        <div style="background:#F4F4F5;border:1.5px solid #D4D4D8;border-radius:10px;padding:16px;margin-bottom:18px;">
          <strong style="display:block;font-size:0.95rem;color:#111111;margin-bottom:6px;">
            Pedido Cancelado — ${escapeHtml(meta.label)}
          </strong>
          <p style="font-size:0.84rem;color:#52525B;margin-bottom:8px;">
            <strong>Motivo:</strong> ${escapeHtml(cancelReason)}
          </p>
          <div style="font-size:0.82rem;color:#52525B;">
            <strong>Situação do pagamento:</strong> ${escapeHtml(meta.paymentLabel)}
          </div>
        </div>
      ` : `
        <div style="margin-bottom:18px;">
          <strong style="display:block;font-size:0.82rem;text-transform:uppercase;letter-spacing:0.05em;color:#111111;margin-bottom:10px;">
            Acompanhamento do Pedido
          </strong>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;">
            ${allTimelineSteps.map((st) => {
              const isDone = st.idx < currentTimelineIdx || (st.idx === 2 && currentTimelineIdx >= 3) || currentTimelineIdx === 7;
              const isCurrent = st.idx === currentTimelineIdx && currentTimelineIdx < 7;
              const bg = isDone ? '#F4F4F5' : isCurrent ? '#F4F4F5' : '#F7F7F7';
              const border = isDone ? '#111111' : isCurrent ? '#111111' : '#E4E4E7';
              const color = isDone ? '#111111' : isCurrent ? '#111111' : '#71717A';
              const icon = isDone ? '✓ Concluído' : isCurrent ? '● Etapa Atual' : '○ Aguardando';
              return `
                <div style="padding:10px;border-radius:8px;border:1px solid ${border};background:${bg};font-size:0.76rem;">
                  <div style="font-weight:700;color:${color};margin-bottom:3px;font-size:0.7rem;">${icon}</div>
                  <div style="color:${color};font-weight:${isDone || isCurrent ? '700' : '500'};">${escapeHtml(st.label)}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `}

      <!-- Produtos Comprados (Bloco Vertical) -->
      <div style="margin-bottom:18px;">
        <h3 style="font-family:var(--font-serif);font-size:1.3rem;margin-bottom:10px;">Produtos Comprados</h3>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${(ord.items || []).map((it) => {
            const sizeStr = isValidClothingSize(it.size) ? 'Tamanho: ' + escapeHtml(it.size) : '';
            const colorStr = isValidColorName(it.color) ? 'Cor: ' + escapeHtml(it.color) : '';
            const variantText = [sizeStr, colorStr].filter(Boolean).join(' • ');
            return `
              <div class="order-product-item-v4">
                <img src="${escapeHtml(it.imageUrl || CATEGORY_COVER_FALLBACKS.vestidos)}" alt="${escapeHtml(it.name)}" />
                <div class="order-product-item-v4-info">
                  <strong style="font-size:0.92rem;color:#111111;display:block;margin-bottom:2px;">${escapeHtml(it.name)}</strong>
                  <div style="font-size:0.78rem;color:var(--text-secondary);">
                    ${variantText ? variantText + ' • ' : ''}Quantidade: ${it.quantity} • Preço unitário: ${formatBRL(it.unitPrice)}
                  </div>
                </div>
                <div style="text-align:right;white-space:nowrap;">
                  <span style="display:block;font-size:0.7rem;color:var(--text-muted);">Subtotal</span>
                  <strong style="font-size:0.92rem;color:#111111;">${formatBRL(it.unitPrice * it.quantity)}</strong>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Detalhes do Pagamento, Valores, Endereço e Rastreamento -->
      <div class="order-detail-two-col">
        <div style="background:#F7F7F7;border:1px solid #E4E4E7;padding:14px;border-radius:10px;font-size:0.84rem;">
          <strong style="display:block;margin-bottom:8px;color:#111111;text-transform:uppercase;font-size:0.76rem;letter-spacing:0.05em;">
            Pagamento e Valores
          </strong>
          <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
            <span>Subtotal dos produtos:</span>
            <strong>${formatBRL(ord.subtotal || ord.total)}</strong>
          </div>
          ${ord.discount > 0 ? `
            <div style="display:flex;justify-content:space-between;margin-bottom:5px;color:#111111;">
              <span>Desconto aplicado:</span>
              <strong>-${formatBRL(ord.discount)}</strong>
            </div>
          ` : ''}
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span>Entrega (${escapeHtml(ord.shipping ? ord.shipping.methodName : 'Padrão')}):</span>
            <strong>${ord.shipping && ord.shipping.cost > 0 ? formatBRL(ord.shipping.cost) : 'Grátis / A confirmar'}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:1.05rem;font-weight:700;padding-top:8px;border-top:1px solid #D4D4D8;margin-bottom:10px;color:#111111;">
            <span>Total do Pedido:</span>
            <span style="color:#111111;">${formatBRL(ord.total)}</span>
          </div>
          <div style="margin-bottom:4px;"><strong>Forma de pagamento:</strong> ${escapeHtml(ord.paymentMethodLabel || 'Pix')}</div>
          <div style="margin-bottom:4px;"><strong>Status do pagamento:</strong> ${escapeHtml(meta.paymentLabel)}</div>
          <div><strong>Status da preparação/entrega:</strong> ${escapeHtml(meta.label)}</div>
        </div>

        <div style="background:#F7F7F7;border:1px solid #E4E4E7;padding:14px;border-radius:10px;font-size:0.84rem;">
          <strong style="display:block;margin-bottom:8px;color:#111111;text-transform:uppercase;font-size:0.76rem;letter-spacing:0.05em;">
            Entrega e Rastreamento
          </strong>
          <div style="margin-bottom:6px;">
            <strong>Modalidade:</strong> ${escapeHtml(ord.shipping ? ord.shipping.methodName : 'A definir')}
          </div>
          ${addr.street ? `
            <div style="margin-bottom:6px;line-height:1.45;">
              <strong>Endereço escolhido:</strong><br/>
              ${escapeHtml(addr.street)}, nº ${escapeHtml(addr.number || 'S/N')}${addr.complement ? ' — ' + escapeHtml(addr.complement) : ''}<br/>
              ${escapeHtml(addr.neighborhood || '')} — ${escapeHtml(addr.cityState || ((addr.city || '') + ' - ' + (addr.state || '')))}<br/>
              CEP: ${escapeHtml(addr.zipCode || '')}
              ${addr.reference ? `<br/>Ref.: ${escapeHtml(addr.reference)}` : ''}
            </div>
          ` : ''}
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid #E4E4E7;">
            <strong>Código de rastreamento:</strong><br/>
            ${ord.shipping && ord.shipping.trackingCode ? `
              <span style="display:inline-block;margin-top:4px;background:#F4F4F5;color:#111111;border:1px solid #111111;padding:4px 10px;border-radius:6px;font-family:monospace;font-weight:700;">
                ${escapeHtml(ord.shipping.trackingCode)}
              </span>
            ` : `
              <span style="color:var(--text-muted);font-size:0.8rem;">Não aplicável ou aguardando postagem</span>
            `}
          </div>
        </div>
      </div>

      <!-- Rodapé do Modal -->
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding-top:12px;border-top:1px solid #E4E4E7;">
        <div>
          ${!isCancelled ? `
            <button type="button" class="btn btn-outline btn-sm" data-action="open-return-request" data-order-number="${escapeHtml(ord.orderNumber)}">
              Solicitar Troca ou Devolução
            </button>
          ` : ''}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${ord.paymentMethod === 'pix' && (ord.status === 'awaiting_payment' || ord.status === 'awaiting_confirmation') ? `
            <button type="button" class="btn btn-gold btn-sm" data-action="reopen-order-payment" data-order-id="${escapeHtml(ord.id)}">
              Pagar com QR Code Pix
            </button>
          ` : ''}
          <button type="button" class="btn btn-primary btn-sm" data-action="close-order-detail-modal">
            Fechar
          </button>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  updateFloatingWhatsappVisibility();
};

closeOrderDetailModal = function () {
  const modal = document.getElementById('order-detail-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
  updateFloatingWhatsappVisibility();
};

// ============================================================================
// 4. PÁGINAS INDEPENDENTES "MEUS FAVORITOS" E "TROCAS E DEVOLUÇÕES"
// ============================================================================
renderFavoritesView = function () {
  const favProducts = (AppState.db.products || []).filter(
    (p) => AppState.wishlist.includes(p.id) && p.status === 'published'
  );
  return `
    <section class="section-block customer-area-shell" id="view-meus-favoritos">
      <div class="container" style="max-width:1040px;">
        ${renderCustomerAreaNav('favorites')}
        <div class="section-header" style="margin-bottom:20px;">
          <div>
            <span class="section-eyebrow">Lista de Desejos • BY ANGÉLY</span>
            <h1 class="section-title">Meus Favoritos (${favProducts.length})</h1>
            <p style="color:var(--text-secondary);font-size:0.88rem;">
              Suas peças favoritas salvas para comprar quando desejar.
            </p>
          </div>
        </div>
        ${favProducts.length > 0 ? `
          <div class="products-grid">
            ${favProducts.map(renderProductCard).join('')}
          </div>
        ` : `
          <div class="admin-card" style="text-align:center;padding:44px 20px;">
            <h2 style="font-family:var(--font-serif);font-size:1.55rem;margin-bottom:8px;">Sua lista de favoritos está vazia</h2>
            <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:18px;">
              Toque no ícone ♡ nas peças do catálogo para salvar seus modelos preferidos aqui.
            </p>
            <button type="button" class="btn btn-primary btn-sm" data-action="go-catalog">
              Conhecer o Catálogo
            </button>
          </div>
        `}
      </div>
    </section>
  `;
};

function renderReturnsView() {
  if (!AppState.currentCustomer || !AppState.currentCustomer.email) {
    AppState.postLoginRedirectView = 'returns';
    return renderCustomerAuthScreen('returns');
  }
  const cust = AppState.currentCustomer;
  const myOrders = getAuthenticatedCustomerOrders();
  const myReturns = (AppState.db.returnRequests || []).filter(
    (r) => r && r.customerEmail && String(r.customerEmail).toLowerCase() === String(cust.email).toLowerCase()
  );

  return `
    <section class="section-block customer-area-shell" id="view-trocas-devolucoes">
      <div class="container" style="max-width:960px;">
        ${renderCustomerAreaNav('returns')}

        <div class="section-header" style="margin-bottom:20px;">
          <div>
            <span class="section-eyebrow">Atendimento Pós-Venda • CDC</span>
            <h1 class="section-title">Trocas e Devoluções</h1>
            <p style="color:var(--text-secondary);font-size:0.88rem;">
              Solicite trocas ou devoluções e acompanhe o retorno da nossa equipe.
            </p>
          </div>
        </div>

        <div class="admin-card" style="margin-bottom:20px;">
          <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:12px;">Nova Solicitação</h2>
          <form id="customer-return-form">
            <div class="sac-form-grid">
              <div class="form-field-group" style="margin-bottom:0;">
                <label class="form-field-label" for="return-order-number">Número do Pedido <span class="req-star">*</span></label>
                <input type="text" name="orderNumber" id="return-order-number" class="form-input-v4" required placeholder="Ex.: ANG-1001" value="${escapeHtml(AppState.prefillReturnOrderNumber || (myOrders[0] ? myOrders[0].orderNumber : ''))}" />
              </div>
              <div class="form-field-group" style="margin-bottom:0;">
                <label class="form-field-label" for="return-type-select">Motivo / Tipo de Solicitação <span class="req-star">*</span></label>
                <select name="type" id="return-type-select" class="form-input-v4" required>
                  <option value="Troca de Tamanho ou Cor">Troca de Tamanho ou Cor</option>
                  <option value="Arrependimento de Compra (Até 7 dias - Art. 49 CDC)">Arrependimento de Compra (Até 7 dias - Art. 49 CDC)</option>
                  <option value="Peça com Defeito de Fabricação (Art. 26 CDC)">Peça com Defeito de Fabricação (Art. 26 CDC)</option>
                </select>
              </div>
            </div>
            <div class="form-field-group" style="margin-top:12px;">
              <label class="form-field-label" for="return-reason-input">Detalhes da Solicitação <span class="req-star">*</span></label>
              <textarea name="reason" id="return-reason-input" rows="3" class="form-control" required placeholder="Informe qual peça deseja trocar ou devolver e o motivo..."></textarea>
            </div>
            <button type="submit" class="btn btn-primary btn-sm" style="min-height:42px;padding:0 18px;">
              Registrar Solicitação
            </button>
          </form>
        </div>

        <div class="admin-card">
          <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:12px;">Minhas Solicitações (${myReturns.length})</h2>
          ${myReturns.length === 0 ? `
            <p style="font-size:0.86rem;color:var(--text-muted);margin:0;">Você ainda não possui solicitações de troca ou devolução registradas.</p>
          ` : myReturns.map((r) => `
            <div style="padding:12px 14px;border:1px solid #E4E4E7;background:#F7F7F7;border-radius:8px;margin-bottom:10px;font-size:0.85rem;">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <strong>Pedido ${escapeHtml(r.orderNumber)} — ${escapeHtml(r.type)}</strong>
                <span class="status-pill pending">${escapeHtml(r.status)}</span>
              </div>
              <p style="margin:6px 0 0;color:var(--text-secondary);">${escapeHtml(r.reason)}</p>
              ${r.ownerResponse ? `<p style="margin:6px 0 0;color:#111111;"><strong>Resposta da BY ANGÉLY:</strong> ${escapeHtml(r.ownerResponse)}</p>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

// ============================================================================
// EVENTOS DE LOGIN, CADASTRO EM ETAPAS, MINHA CONTA, ENDEREÇOS E SENHA
// ============================================================================
async function persistCustomerProfileToServer(payload) {
  const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';
  const cust = AppState.currentCustomer;
  if (!cust) return { ok: false };

  const headers = { 'Content-Type': 'application/json' };
  if (cust.token) headers['Authorization'] = 'Bearer ' + cust.token;

  const nowIso = new Date().toISOString();
  Object.assign(cust, payload, { updatedAt: nowIso });
  delete cust.newPassword;
  delete cust.currentPassword;
  localStorage.setItem(STORAGE_KEY_CUSTOMER_SESSION, JSON.stringify(cust));

  if (AppState.db && Array.isArray(AppState.db.customers)) {
    const idx = AppState.db.customers.findIndex(
      (c) => c && (c.id === cust.id || String(c.email || '').toLowerCase() === String(cust.email || '').toLowerCase())
    );
    if (idx >= 0) {
      AppState.db.customers[idx] = { ...AppState.db.customers[idx], ...cust, updatedAt: nowIso };
    }
    try {
      localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(AppState.db));
    } catch (e) {}
  }

  try {
    const res = await fetch(apiBase + '/api/customer/profile', {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        customerId: cust.id,
        email: cust.email,
        ...payload
      })
    });
    const data = await res.json();
    if (res.ok && data && data.ok && data.customer) {
      AppState.currentCustomer = { ...cust, ...data.customer, token: cust.token, updatedAt: nowIso };
      localStorage.setItem(STORAGE_KEY_CUSTOMER_SESSION, JSON.stringify(AppState.currentCustomer));
    }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: true, localOnly: true };
  }
}

bindAccountEvents = function () {
  const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';

  // 1. Formulário de Login
  const loginForm = document.getElementById('customer-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailEl = document.getElementById('login-email-input');
      const passEl = document.getElementById('login-password-input');
      const errBox = document.getElementById('login-form-error-box');
      if (errBox) errBox.style.display = 'none';

      const email = String((emailEl && emailEl.value) || '').trim().toLowerCase();
      const password = String((passEl && passEl.value) || '');

      let valid = true;
      if (!isValidEmailFormat(email)) {
        setFieldErrorState('login-email-input', 'login-email-error', true, 'Informe um e-mail válido.');
        valid = false;
      } else {
        setFieldErrorState('login-email-input', 'login-email-error', false);
      }
      if (!password) {
        setFieldErrorState('login-password-input', 'login-password-error', true, 'Digite sua senha.');
        valid = false;
      } else {
        setFieldErrorState('login-password-input', 'login-password-error', false);
      }
      if (!valid) return;

      try {
        let res = await fetch(apiBase + '/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        let data = await res.json();
        if (res.status === 401 && window.ByAngelyFirebaseAuth && typeof window.ByAngelyFirebaseAuth.signInAndExtractIdToken === 'function') {
          const fbAuth = await window.ByAngelyFirebaseAuth.signInAndExtractIdToken(email, password);
          if (fbAuth && fbAuth.ok && fbAuth.idToken) {
            res = await fetch(apiBase + '/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password, firebaseIdToken: fbAuth.idToken })
            });
            data = await res.json();
          }
        }
        if (res.ok && data && data.ok && data.customer) {
          AppState.currentCustomer = { ...data.customer, token: data.token };
          localStorage.setItem(STORAGE_KEY_CUSTOMER_SESSION, JSON.stringify(AppState.currentCustomer));
          if (Array.isArray(data.customer.savedCart) && data.customer.savedCart.length > 0 && AppState.cart.length === 0) {
            AppState.cart = data.customer.savedCart;
            saveCart();
          }
          await loadDatabase();
          updateHeaderCounters();
          showToast(`Bem-vinda de volta, ${AppState.currentCustomer.name}!`, 'success');
          if (!resumePendingPurchaseIntent()) {
            const targetView = AppState.postLoginRedirectView || AppState.currentView || 'account';
            AppState.postLoginRedirectView = null;
            navigateTo(targetView);
          }
          return;
        }
        const msg = (data && data.error) || 'E-mail ou senha incorretos. Confira os dados e tente novamente.';
        if (errBox) {
          errBox.textContent = msg;
          errBox.style.display = 'block';
        }
        showToast(msg, 'danger');
      } catch (err) {
        showToast('Erro de conexão ao entrar na conta.', 'danger');
      }
    });
  }

  // 2. Formulário de Cadastro em 3 Etapas (Com Máscaras e ViaCEP)
  const regForm = document.getElementById('customer-register-form');
  if (regForm) {
    regForm.addEventListener('input', (e) => {
      const t = e.target;
      if (!t || !t.name) return;
      if (t.name === 'phone') t.value = formatPhoneMask(t.value);
      if (t.name === 'cpf') t.value = formatCpfMask(t.value);
      if (t.name === 'zipCode') {
        t.value = formatCepMask(t.value);
        const digits = t.value.replace(/\D/g, '');
        if (digits.length === 8) {
          lookupViaCepAddress(digits, {
            street: 'reg-street-input',
            neighborhood: 'reg-neighborhood-input',
            city: 'reg-city-input',
            state: 'reg-state-input',
            statusEl: 'reg-cep-lookup-status'
          });
        }
      }
      syncRegisterDraftFromDom();
    });

    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      syncRegisterDraftFromDom();

      if (!validateRegisterStep(1)) {
        showRegisterStepInDom(1);
        return;
      }
      if (!validateRegisterStep(2)) {
        showRegisterStepInDom(2);
        return;
      }
      if (!validateRegisterStep(3)) {
        showRegisterStepInDom(3);
        return;
      }

      const d = AppState.registerDraft;
      const city = String(d.city || '').trim();
      const state = String(d.state || '').trim().toUpperCase();
      const address = {
        id: 'addr-' + Date.now(),
        label: 'Endereço Principal',
        zipCode: String(d.zipCode || '').trim(),
        street: String(d.street || '').trim(),
        number: String(d.number || '').trim(),
        complement: String(d.complement || '').trim(),
        neighborhood: String(d.neighborhood || '').trim(),
        city,
        state,
        cityState: `${city} - ${state}`,
        reference: String(d.reference || '').trim(),
        isDefault: true
      };

      const errBox = document.getElementById('register-form-error-box');
      if (errBox) errBox.style.display = 'none';

      try {
        const res = await fetch(apiBase + '/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: String(d.name || '').trim(),
            email: String(d.email || '').trim().toLowerCase(),
            phone: String(d.phone || '').trim(),
            cpf: String(d.cpf || '').trim(),
            password: String(d.password || ''),
            marketingOptIn: Boolean(d.marketingOptIn),
            address
          })
        });
        const data = await res.json();
        if (!res.ok || !data || !data.ok) {
          const msg = (data && data.error) || 'Não foi possível concluir o cadastro.';
          if (errBox) {
            errBox.textContent = msg;
            errBox.style.display = 'block';
          }
          showToast(msg, 'danger');
          return;
        }
        AppState.currentCustomer = { ...data.customer, token: data.token };
        localStorage.setItem(STORAGE_KEY_CUSTOMER_SESSION, JSON.stringify(AppState.currentCustomer));
        AppState.registerStep = 1;
        await loadDatabase();
        updateHeaderCounters();
        showToast('Cadastro criado com sucesso! Seus dados e endereço foram salvos.', 'success');
        if (!resumePendingPurchaseIntent()) {
          const targetView = AppState.postLoginRedirectView || 'account';
          AppState.postLoginRedirectView = null;
          navigateTo(targetView);
        }
      } catch (err) {
        showToast('Erro de conexão ao criar conta.', 'danger');
      }
    });
  }

  // 3. Recuperação de Senha Oficial (Firebase Authentication)
  const recForm = document.getElementById('customer-recover-form');
  if (recForm) {
    recForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(recForm);
      const email = String(fd.get('email') || '').trim().toLowerCase();
      const errBox = document.getElementById('recover-form-error');
      const feedbackBox = document.getElementById('recover-form-feedback');
      const submitBtn = document.getElementById('btn-recover-submit');
      if (errBox) {
        errBox.style.display = 'none';
        errBox.textContent = '';
      }
      if (feedbackBox) {
        feedbackBox.style.display = 'none';
        feedbackBox.textContent = '';
      }

      if (!isValidEmailFormat(email)) {
        const msg = 'Informe um endereço de e-mail válido.';
        if (errBox) {
          errBox.textContent = msg;
          errBox.style.display = 'block';
        }
        showToast(msg, 'warning');
        return;
      }

      if (!window.ByAngelyFirebaseAuth || typeof window.ByAngelyFirebaseAuth.requestPasswordReset !== 'function') {
        const msg = 'Serviço de verificação do Firebase ainda está carregando. Tente novamente em instantes.';
        if (errBox) {
          errBox.textContent = msg;
          errBox.style.display = 'block';
        }
        showToast(msg, 'danger');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando link...';
      }

      try {
        const result = await window.ByAngelyFirebaseAuth.requestPasswordReset(email);
        if (!result.ok) {
          const msg = result.error || 'Não foi possível solicitar a recuperação agora.';
          if (errBox) {
            errBox.textContent = msg;
            errBox.style.display = 'block';
          }
          showToast(msg, 'danger');
          return;
        }

        const genericMsg = 'Se este endereço de e-mail estiver cadastrado, enviaremos em instantes uma mensagem com o link oficial para redefinição de senha. Verifique também sua caixa de spam.';
        if (feedbackBox) {
          feedbackBox.textContent = genericMsg;
          feedbackBox.style.display = 'block';
        }
        showToast(genericMsg, 'success');
        recForm.reset();
      } catch (_err) {
        const msg = 'Erro de conexão ao solicitar redefinição de senha.';
        if (errBox) {
          errBox.textContent = msg;
          errBox.style.display = 'block';
        }
        showToast(msg, 'danger');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Enviar Link de Redefinição';
        }
      }
    });
  }

  // 4. Dados Pessoais em Minha Conta
  const profForm = document.getElementById('customer-profile-form');
  if (profForm) {
    profForm.addEventListener('input', (e) => {
      const t = e.target;
      if (!t) return;
      if (t.name === 'phone') t.value = formatPhoneMask(t.value);
      if (t.name === 'cpf') t.value = formatCpfMask(t.value);
    });

    profForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(profForm);
      const name = String(fd.get('name') || '').trim();
      const phone = String(fd.get('phone') || '').trim();
      const email = String(fd.get('email') || '').trim().toLowerCase();
      const cpf = String(fd.get('cpf') || '').trim();
      const marketingOptIn = fd.get('marketingOptIn') === 'on';

      let valid = true;
      if (name.length < 3) {
        setFieldErrorState('profile-name-input', 'profile-error-name', true);
        valid = false;
      } else {
        setFieldErrorState('profile-name-input', 'profile-error-name', false);
      }
      if (phone.replace(/\D/g, '').length < 10) {
        setFieldErrorState('profile-phone-input', 'profile-error-phone', true);
        valid = false;
      } else {
        setFieldErrorState('profile-phone-input', 'profile-error-phone', false);
      }
      if (!isValidEmailFormat(email)) {
        setFieldErrorState('profile-email-input', 'profile-error-email', true);
        valid = false;
      } else {
        setFieldErrorState('profile-email-input', 'profile-error-email', false);
      }
      if (!valid) return;

      await persistCustomerProfileToServer({
        name,
        phone,
        email,
        cpf,
        marketingOptIn,
        addresses: AppState.currentCustomer.addresses || []
      });
      updateHeaderCounters();
      renderMainView();
      showToast('Dados pessoais salvos com sucesso!', 'success');
    });
  }

  // 5. Formulário de Endereço (Adicionar / Editar) em Minha Conta
  const addrForm = document.getElementById('customer-address-form');
  if (addrForm) {
    const addrCepInput = document.getElementById('addr-form-cep');
    if (addrCepInput) {
      addrCepInput.addEventListener('input', () => {
        addrCepInput.value = formatCepMask(addrCepInput.value);
        const digits = addrCepInput.value.replace(/\D/g, '');
        if (digits.length === 8) {
          lookupViaCepAddress(digits, {
            street: 'addr-form-street',
            neighborhood: 'addr-form-neighborhood',
            city: 'addr-form-city',
            state: 'addr-form-state',
            statusEl: 'addr-form-cep-status'
          });
        }
      });
    }

    addrForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(addrForm);
      const label = String(fd.get('label') || '').trim() || 'Endereço de Entrega';
      const zipCode = String(fd.get('zipCode') || '').trim();
      const street = String(fd.get('street') || '').trim();
      const number = String(fd.get('number') || '').trim();
      const complement = String(fd.get('complement') || '').trim();
      const neighborhood = String(fd.get('neighborhood') || '').trim();
      const city = String(fd.get('city') || '').trim();
      const state = String(fd.get('state') || '').trim().toUpperCase();
      const reference = String(fd.get('reference') || '').trim();
      const isPrimary = fd.get('isPrimary') === 'on';

      let valid = true;
      if (zipCode.replace(/\D/g, '').length < 8) {
        setFieldErrorState('addr-form-cep', 'addr-error-zipCode', true);
        valid = false;
      } else {
        setFieldErrorState('addr-form-cep', 'addr-error-zipCode', false);
      }
      if (!street) {
        setFieldErrorState('addr-form-street', 'addr-error-street', true);
        valid = false;
      } else {
        setFieldErrorState('addr-form-street', 'addr-error-street', false);
      }
      if (!number) {
        setFieldErrorState('addr-form-number', 'addr-error-number', true);
        valid = false;
      } else {
        setFieldErrorState('addr-form-number', 'addr-error-number', false);
      }
      if (!neighborhood) {
        setFieldErrorState('addr-form-neighborhood', 'addr-error-neighborhood', true);
        valid = false;
      } else {
        setFieldErrorState('addr-form-neighborhood', 'addr-error-neighborhood', false);
      }
      if (!city) {
        setFieldErrorState('addr-form-city', 'addr-error-city', true);
        valid = false;
      } else {
        setFieldErrorState('addr-form-city', 'addr-error-city', false);
      }
      if (state.length < 2) {
        setFieldErrorState('addr-form-state', 'addr-error-state', true);
        valid = false;
      } else {
        setFieldErrorState('addr-form-state', 'addr-error-state', false);
      }
      if (!valid) return;

      const editIdx = Number(addrForm.getAttribute('data-editing-index'));
      const currentAddrs = Array.isArray(AppState.currentCustomer.addresses)
        ? [...AppState.currentCustomer.addresses]
        : [];

      const newAddrObj = {
        id: (editIdx >= 0 && currentAddrs[editIdx] && currentAddrs[editIdx].id) || ('addr-' + Date.now()),
        label,
        zipCode,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        cityState: `${city} - ${state}`,
        reference
      };

      if (editIdx >= 0 && editIdx < currentAddrs.length) {
        currentAddrs[editIdx] = newAddrObj;
        if (isPrimary && editIdx > 0) {
          const [moved] = currentAddrs.splice(editIdx, 1);
          currentAddrs.unshift(moved);
        }
      } else {
        if (isPrimary || currentAddrs.length === 0) {
          currentAddrs.unshift(newAddrObj);
        } else {
          currentAddrs.push(newAddrObj);
        }
      }

      AppState.editingAddressIndex = null;
      await persistCustomerProfileToServer({ addresses: currentAddrs });
      renderMainView();
      showToast('Endereço salvo com sucesso!', 'success');
    });
  }

  // 6. Alteração de Senha em Minha Conta
  const pwdForm = document.getElementById('customer-password-form');
  if (pwdForm) {
    pwdForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(pwdForm);
      const currentPassword = String(fd.get('currentPassword') || '');
      const newPassword = String(fd.get('newPassword') || '');
      const confirmPassword = String(fd.get('confirmPassword') || '');

      let valid = true;
      if (newPassword.length < 6) {
        setFieldErrorState('pwd-new-input', 'pwd-error-new', true);
        valid = false;
      } else {
        setFieldErrorState('pwd-new-input', 'pwd-error-new', false);
      }
      if (confirmPassword !== newPassword) {
        setFieldErrorState('pwd-confirm-input', 'pwd-error-confirm', true);
        valid = false;
      } else {
        setFieldErrorState('pwd-confirm-input', 'pwd-error-confirm', false);
      }
      if (!valid) return;

      await persistCustomerProfileToServer({ currentPassword, newPassword });

      pwdForm.reset();
      showToast('Sua senha foi atualizada com segurança!', 'success');
    });
  }

  // 7. Formulário de Trocas e Devoluções
  const returnForm = document.getElementById('customer-return-form');
  if (returnForm) {
    returnForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(returnForm);
      const retHeaders = { 'Content-Type': 'application/json' };
      if (AppState.currentCustomer && AppState.currentCustomer.token) {
        retHeaders['Authorization'] = 'Bearer ' + AppState.currentCustomer.token;
      }
      try {
        const res = await fetch(apiBase + '/api/customer/returns', {
          method: 'POST',
          headers: retHeaders,
          body: JSON.stringify({
            orderNumber: String(fd.get('orderNumber') || '').trim(),
            type: String(fd.get('type') || '').trim(),
            reason: String(fd.get('reason') || '').trim()
          })
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data || !data.ok) {
          showToast((data && data.error) || 'Não foi possível registrar a solicitação.', 'danger');
          return;
        }
        AppState.db.returnRequests = AppState.db.returnRequests || [];
        AppState.db.returnRequests.unshift(data.returnRequest);
        saveDatabase();
        renderMainView();
        showToast('Solicitação de troca/devolução registrada com sucesso!', 'success');
      } catch (_err) {
        showToast('Erro de conexão ao registrar solicitação.', 'danger');
      }
    });
  }
};

// Delegação Global para as Novas Ações da Área da Cliente e Login/Cadastro V4
document.addEventListener('click', async (e) => {
  const target = e.target.closest('[data-action], [data-nav-view]');
  if (!target) return;
  const action = target.getAttribute('data-action');
  const navView = target.getAttribute('data-nav-view');

  if (navView === 'account') {
    AppState.showPurchaseAuthBanner = false;
    AppState.editingAddressIndex = null;
  }

  if (!action) return;

  switch (action) {
    case 'go-account-orders': {
      e.preventDefault();
      e.stopPropagation();
      AppState.lastCreatedOrder = null;
      AppState.showPurchaseAuthBanner = false;
      closeMobileMenu();
      navigateTo('orders');
      break;
    }
    case 'finish-order-go-account': {
      e.preventDefault();
      e.stopPropagation();
      AppState.lastCreatedOrder = null;
      navigateTo('orders');
      break;
    }
    case 'go-returns': {
      e.preventDefault();
      e.stopPropagation();
      AppState.lastCreatedOrder = null;
      closeMobileMenu();
      navigateTo('returns');
      break;
    }
    case 'open-return-request': {
      e.preventDefault();
      e.stopPropagation();
      const onum = target.getAttribute('data-order-number') || '';
      AppState.prefillReturnOrderNumber = onum;
      closeOrderDetailModal();
      navigateTo('returns');
      break;
    }
    case 'filter-customer-orders': {
      e.preventDefault();
      e.stopPropagation();
      AppState.ordersFilter = target.getAttribute('data-filter') || 'all';
      renderMainView();
      break;
    }
    case 'switch-auth-mode': {
      e.preventDefault();
      e.stopPropagation();
      syncRegisterDraftFromDom();
      AppState.authMode = target.getAttribute('data-mode') === 'register' ? 'register' : 'login';
      renderMainView();
      break;
    }
    case 'toggle-recover-password': {
      e.preventDefault();
      e.stopPropagation();
      AppState.showRecoverPasswordBox = !AppState.showRecoverPasswordBox;
      const box = document.getElementById('customer-recover-container');
      if (box) box.style.display = AppState.showRecoverPasswordBox ? 'block' : 'none';
      break;
    }
    case 'toggle-password-visibility': {
      e.preventDefault();
      e.stopPropagation();
      const inputId = target.getAttribute('data-target');
      const inp = inputId ? document.getElementById(inputId) : null;
      if (inp) {
        const isPwd = inp.type === 'password';
        inp.type = isPwd ? 'text' : 'password';
        target.textContent = isPwd ? 'Ocultar' : 'Mostrar';
      }
      break;
    }
    case 'reg-next-step': {
      e.preventDefault();
      e.stopPropagation();
      const fromStep = Number(target.getAttribute('data-from-step')) || 1;
      if (validateRegisterStep(fromStep)) {
        showRegisterStepInDom(fromStep + 1);
      }
      break;
    }
    case 'reg-prev-step': {
      e.preventDefault();
      e.stopPropagation();
      const toStep = Number(target.getAttribute('data-to-step')) || 1;
      showRegisterStepInDom(toStep);
      break;
    }
    case 'reg-jump-step': {
      e.preventDefault();
      e.stopPropagation();
      const targetStep = Number(target.getAttribute('data-step')) || 1;
      if (targetStep < AppState.registerStep) {
        showRegisterStepInDom(targetStep);
      } else if (targetStep === 2 && validateRegisterStep(1)) {
        showRegisterStepInDom(2);
      } else if (targetStep === 3 && validateRegisterStep(1) && validateRegisterStep(2)) {
        showRegisterStepInDom(3);
      }
      break;
    }
    case 'open-address-editor': {
      e.preventDefault();
      e.stopPropagation();
      const idx = Number(target.getAttribute('data-index'));
      AppState.editingAddressIndex = isNaN(idx) ? -1 : idx;
      renderMainView();
      setTimeout(() => {
        const wrapper = document.getElementById('address-editor-wrapper');
        if (wrapper) wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 40);
      break;
    }
    case 'close-address-editor': {
      e.preventDefault();
      e.stopPropagation();
      AppState.editingAddressIndex = null;
      renderMainView();
      break;
    }
    case 'set-primary-address': {
      e.preventDefault();
      e.stopPropagation();
      const idx = Number(target.getAttribute('data-index'));
      const addrs = Array.isArray(AppState.currentCustomer && AppState.currentCustomer.addresses)
        ? [...AppState.currentCustomer.addresses]
        : [];
      if (idx > 0 && idx < addrs.length) {
        const [chosen] = addrs.splice(idx, 1);
        addrs.unshift(chosen);
        await persistCustomerProfileToServer({ addresses: addrs });
        renderMainView();
        showToast('Endereço principal atualizado!', 'success');
      }
      break;
    }
    case 'delete-customer-address': {
      e.preventDefault();
      e.stopPropagation();
      const idx = Number(target.getAttribute('data-index'));
      const addrs = Array.isArray(AppState.currentCustomer && AppState.currentCustomer.addresses)
        ? [...AppState.currentCustomer.addresses]
        : [];
      if (addrs.length <= 1) {
        showToast('Mantenha ao menos um endereço cadastrado na sua conta.', 'warning');
        return;
      }
      if (idx >= 0 && idx < addrs.length) {
        addrs.splice(idx, 1);
        await persistCustomerProfileToServer({ addresses: addrs });
        renderMainView();
        showToast('Endereço removido com sucesso.', 'success');
      }
      break;
    }
  }
}, true);

// ============================================================================
// FLUXO DE REDEFINIÇÃO DE SENHA VIA FIREBASE AUTHENTICATION (?mode=resetPassword&oobCode=...)
// ============================================================================
AppState.passwordResetFlow = AppState.passwordResetFlow || {
  stage: 'idle', // 'idle' | 'verifying' | 'form' | 'success' | 'invalid'
  oobCode: '',
  verifiedEmail: '',
  errorMessage: ''
};

async function waitForFirebaseRecoveryModule(timeoutMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window.ByAngelyFirebaseAuth && typeof window.ByAngelyFirebaseAuth.verifyResetCode === 'function') {
      return window.ByAngelyFirebaseAuth;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
}

function extractFirebaseActionParams() {
  try {
    const searchParams = new URLSearchParams(window.location.search || '');
    const rawHash = String(window.location.hash || '');
    const hashQueryIdx = rawHash.indexOf('?');
    const hashParams = hashQueryIdx >= 0 ? new URLSearchParams(rawHash.slice(hashQueryIdx + 1)) : new URLSearchParams('');
    const mode = searchParams.get('mode') || hashParams.get('mode') || '';
    const oobCode = searchParams.get('oobCode') || hashParams.get('oobCode') || '';
    const recovered = searchParams.get('recovered') || hashParams.get('recovered') || '';
    const pathnameNorm = String(window.location.pathname || '').replace(/\/+$/, '').toLowerCase();
    return {
      mode,
      oobCode,
      recovered,
      isResetRoute: pathnameNorm === '/redefinir-senha' || rawHash.toLowerCase().startsWith('#redefinir-senha')
    };
  } catch (_e) {
    return { mode: '', oobCode: '', recovered: '', isResetRoute: false };
  }
}

async function startFirebasePasswordResetVerification(oobCode) {
  const code = String(oobCode || '').trim();
  if (!code) {
    AppState.passwordResetFlow = {
      stage: 'invalid',
      oobCode: '',
      verifiedEmail: '',
      errorMessage: 'Link de redefinição inválido ou incompleto. Solicite um novo e-mail de recuperação de senha.'
    };
    if (AppState.currentView === 'reset-password') renderMainView();
    return;
  }

  AppState.passwordResetFlow = {
    stage: 'verifying',
    oobCode: code,
    verifiedEmail: '',
    errorMessage: ''
  };
  if (AppState.currentView === 'reset-password') renderMainView();

  const fbAuth = await waitForFirebaseRecoveryModule(4000);
  if (!fbAuth) {
    AppState.passwordResetFlow = {
      stage: 'invalid',
      oobCode: '',
      verifiedEmail: '',
      errorMessage: 'Não foi possível carregar o serviço oficial de verificação do Firebase. Recarregue a página e tente novamente.'
    };
    if (AppState.currentView === 'reset-password') renderMainView();
    return;
  }

  const verified = await fbAuth.verifyResetCode(code);
  if (!verified || !verified.ok) {
    AppState.passwordResetFlow = {
      stage: 'invalid',
      oobCode: '',
      verifiedEmail: '',
      errorMessage: (verified && verified.error) || 'Este link de redefinição expirou ou já foi utilizado. Solicite um novo link.'
    };
  } else {
    AppState.passwordResetFlow = {
      stage: 'form',
      oobCode: code,
      verifiedEmail: verified.email || '',
      errorMessage: ''
    };
  }
  if (AppState.currentView === 'reset-password') renderMainView();
}

function renderResetPasswordView() {
  const flow = AppState.passwordResetFlow || { stage: 'invalid', errorMessage: '' };
  let innerHtml = '';

  if (flow.stage === 'verifying') {
    innerHtml = [
      '<span class="section-eyebrow">Firebase Authentication • Verificação Segura</span>',
      '<h1 style="font-family:var(--font-serif);font-size:1.7rem;margin-bottom:10px;">Validando link de redefinição...</h1>',
      '<p style="font-size:0.86rem;color:var(--text-secondary);">Aguarde enquanto confirmamos a autenticidade e validade do seu código oficial de recuperação.</p>'
    ].join('');
  } else if (flow.stage === 'form') {
    innerHtml = [
      '<span class="section-eyebrow">Redefinição Oficial Verificada</span>',
      '<h1 style="font-family:var(--font-serif);font-size:1.75rem;margin-bottom:8px;">Definir Nova Senha</h1>',
      (flow.verifiedEmail
        ? '<p style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:14px;">Conta verificada pelo Firebase: <strong style="color:#111111;">' + escapeHtml(flow.verifiedEmail) + '</strong></p>'
        : '<p style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:14px;">Código verificado. Crie abaixo sua nova senha de acesso.</p>'),
      '<div id="reset-password-error-box" style="display:none;margin-bottom:12px;padding:10px 12px;border-radius:8px;background:#F4F4F5;border:1px solid #18181B;color:#111111;font-size:0.81rem;"></div>',
      '<form id="firebase-confirm-reset-form" novalidate>',
      '  <div class="form-field-group">',
      '    <label class="form-field-label" for="reset-new-password-input">Nova senha <span class="req-star">*</span></label>',
      '    <div class="password-input-wrapper">',
      '      <input type="password" autocomplete="new-password" name="newPassword" id="reset-new-password-input" class="form-input-v4" required minlength="6" placeholder="Crie sua nova senha (mín. 6 caracteres)" />',
      '      <button type="button" class="password-toggle-btn" data-action="toggle-password-visibility" data-target="reset-new-password-input">Mostrar</button>',
      '    </div>',
      '    <span style="display:block;font-size:0.73rem;color:#71717A;margin-top:4px;">Requisito mínimo: pelo menos 6 caracteres.</span>',
      '  </div>',
      '  <div class="form-field-group">',
      '    <label class="form-field-label" for="reset-confirm-password-input">Confirmar nova senha <span class="req-star">*</span></label>',
      '    <div class="password-input-wrapper">',
      '      <input type="password" autocomplete="new-password" name="confirmPassword" id="reset-confirm-password-input" class="form-input-v4" required minlength="6" placeholder="Repita a nova senha" />',
      '      <button type="button" class="password-toggle-btn" data-action="toggle-password-visibility" data-target="reset-confirm-password-input">Mostrar</button>',
      '    </div>',
      '  </div>',
      '  <button type="submit" id="btn-confirm-reset-submit" class="btn btn-primary btn-block" style="height:48px;font-size:0.86rem;margin-top:6px;">Salvar Nova Senha</button>',
      '</form>',
      '<div style="margin-top:14px;text-align:center;">',
      '  <button type="button" data-action="go-back-to-login" style="background:none;border:none;color:#111111;font-size:0.82rem;font-weight:600;text-decoration:underline;cursor:pointer;">← Voltar para o Login</button>',
      '</div>'
    ].join('');
  } else if (flow.stage === 'success') {
    innerHtml = [
      '<span class="section-eyebrow">Confirmação • Firebase Authentication</span>',
      '<h1 style="font-family:var(--font-serif);font-size:1.75rem;margin-bottom:10px;">Senha redefinida com sucesso</h1>',
      '<div style="padding:12px 14px;border-radius:8px;background:#F4F4F5;border:1px solid #111111;color:#111111;font-size:0.84rem;margin-bottom:16px;">',
      '  ✓ Sua nova senha foi validada e atualizada com segurança. Você já pode acessar sua conta na BY ANGÉLY.',
      '</div>',
      '<button type="button" id="btn-reset-go-login" data-action="go-back-to-login" class="btn btn-primary btn-block" style="height:48px;font-size:0.86rem;">Ir para o Login</button>'
    ].join('');
  } else {
    innerHtml = [
      '<span class="section-eyebrow">Verificação de Link • Firebase Authentication</span>',
      '<h1 style="font-family:var(--font-serif);font-size:1.65rem;margin-bottom:10px;">Link inválido ou expirado</h1>',
      '<div id="reset-invalid-msg-box" style="padding:12px 14px;border-radius:8px;background:#F4F4F5;border:1px solid #18181B;color:#111111;font-size:0.83rem;margin-bottom:16px;">',
      escapeHtml(flow.errorMessage || 'Este link de redefinição de senha não é válido ou já expirou.'),
      '</div>',
      '<div style="display:flex;flex-direction:column;gap:10px;">',
      '  <button type="button" data-action="go-request-new-reset" class="btn btn-primary btn-block" style="height:46px;">Solicitar Novo Link de Recuperação</button>',
      '  <button type="button" data-action="go-back-to-login" class="btn btn-outline btn-block" style="height:44px;">Voltar para o Login</button>',
      '</div>'
    ].join('');
  }

  return [
    '<section class="section-block" id="view-reset-password">',
    '  <div class="container" style="max-width:480px;">',
    '    <div class="auth-card-v5" style="margin:0 auto;">',
    innerHtml,
    '    </div>',
    '  </div>',
    '</section>'
  ].join('');
}

function bindResetPasswordEvents() {
  const form = document.getElementById('firebase-confirm-reset-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const newPassword = String(fd.get('newPassword') || '');
      const confirmPassword = String(fd.get('confirmPassword') || '');
      const errBox = document.getElementById('reset-password-error-box');
      const submitBtn = document.getElementById('btn-confirm-reset-submit');
      if (errBox) {
        errBox.style.display = 'none';
        errBox.textContent = '';
      }

      if (newPassword.length < 6) {
        const msg = 'A nova senha não atende aos requisitos mínimos (informe pelo menos 6 caracteres).';
        if (errBox) {
          errBox.textContent = msg;
          errBox.style.display = 'block';
        }
        return;
      }
      if (newPassword !== confirmPassword) {
        const msg = 'As senhas informadas não coincidem. Confira e tente novamente.';
        if (errBox) {
          errBox.textContent = msg;
          errBox.style.display = 'block';
        }
        return;
      }

      const flow = AppState.passwordResetFlow || {};
      const oobCode = String(flow.oobCode || '').trim();
      const verifiedEmail = String(flow.verifiedEmail || '').trim().toLowerCase();
      if (!oobCode || !window.ByAngelyFirebaseAuth) {
        AppState.passwordResetFlow = {
          stage: 'invalid',
          oobCode: '',
          verifiedEmail: '',
          errorMessage: 'Código de redefinição ausente ou inválido. Solicite um novo link.'
        };
        renderMainView();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Confirmando nova senha...';
      }

      try {
        const resConfirm = await window.ByAngelyFirebaseAuth.confirmReset(oobCode, newPassword);
        if (!resConfirm || !resConfirm.ok) {
          if (resConfirm && (resConfirm.code === 'auth/expired-action-code' || resConfirm.code === 'auth/invalid-action-code')) {
            AppState.passwordResetFlow = {
              stage: 'invalid',
              oobCode: '',
              verifiedEmail: '',
              errorMessage: resConfirm.error || 'Este link de redefinição expirou ou já foi utilizado.'
            };
            renderMainView();
            return;
          }
          const msg = (resConfirm && resConfirm.error) || 'Não foi possível salvar a nova senha.';
          if (errBox) {
            errBox.textContent = msg;
            errBox.style.display = 'block';
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Salvar Nova Senha';
          }
          return;
        }

        // Sincroniza o hash de login local somente mediante ID Token emitido pelo Firebase após confirmação
        if (verifiedEmail) {
          try {
            const tokenRes = await window.ByAngelyFirebaseAuth.signInAndExtractIdToken(verifiedEmail, newPassword);
            if (tokenRes && tokenRes.ok && tokenRes.idToken) {
              const apiBase = window.ByAngelyCloud && window.ByAngelyCloud.getBackendBaseUrl
                ? window.ByAngelyCloud.getBackendBaseUrl()
                : '';
              await fetch(apiBase + '/api/auth/firebase-sync-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: tokenRes.idToken, newPassword })
              });
            }
          } catch (_syncErr) {}
          AppState.loginDraft = { ...(AppState.loginDraft || {}), email: verifiedEmail, password: '' };
        }

        try {
          if (window.location.search) {
            window.history.replaceState(null, '', '/#redefinir-senha');
          }
        } catch (_histErr) {}

        AppState.passwordResetFlow = {
          stage: 'success',
          oobCode: '',
          verifiedEmail,
          errorMessage: ''
        };
        showToast('Senha redefinida com sucesso!', 'success');
        renderMainView();
      } catch (_err) {
        if (errBox) {
          errBox.textContent = 'Erro de conexão ao confirmar redefinição de senha.';
          errBox.style.display = 'block';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Salvar Nova Senha';
        }
      }
    });
  }

  document.querySelectorAll('[data-action="go-back-to-login"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      AppState.authMode = 'login';
      AppState.showRecoverPasswordBox = false;
      try {
        window.history.replaceState(null, '', '/#login');
      } catch (_e) {}
      navigateTo('account');
    });
  });

  document.querySelectorAll('[data-action="go-request-new-reset"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      AppState.authMode = 'login';
      AppState.showRecoverPasswordBox = true;
      try {
        window.history.replaceState(null, '', '/#recuperar-senha');
      } catch (_e) {}
      navigateTo('account');
    });
  });
}

// Restaura a visualização correspondente ao hash ou parâmetros Firebase da URL
function syncViewFromLocationHash() {
  const fbParams = extractFirebaseActionParams();
  if (fbParams.mode === 'resetPassword' && fbParams.oobCode) {
    navigateTo('reset-password', { preserveScroll: true });
    startFirebasePasswordResetVerification(fbParams.oobCode);
    return;
  }
  if (fbParams.isResetRoute && fbParams.recovered === '1') {
    AppState.passwordResetFlow = { stage: 'success', oobCode: '', verifiedEmail: '', errorMessage: '' };
    navigateTo('reset-password', { preserveScroll: true });
    return;
  }
  if (fbParams.isResetRoute) {
    if (AppState.passwordResetFlow.stage === 'idle') {
      AppState.passwordResetFlow = {
        stage: 'invalid',
        oobCode: '',
        verifiedEmail: '',
        errorMessage: 'Link de redefinição inválido ou código ausente. Solicite um novo link pela tela de login.'
      };
    }
    navigateTo('reset-password', { preserveScroll: true });
    return;
  }

  const raw = String(window.location.hash || '').trim().toLowerCase();
  if (!raw || raw === '#') return;
  const h = raw.split('?')[0];
  if (h === '#home') {
    navigateTo('home', { preserveScroll: true });
  } else if (h === '#catalogo' || h === '#catalog') {
    AppState.filters.availability = 'all';
    navigateTo('catalog', { preserveScroll: true });
  } else if (h === '#promocoes') {
    AppState.filters.availability = 'promo';
    navigateTo('catalog', { preserveScroll: true });
  } else if (h === '#sacola' || h === '#cart') {
    navigateTo('cart', { preserveScroll: true });
  } else if (h === '#checkout') {
    navigateTo('checkout', { preserveScroll: true });
  } else if (h === '#login') {
    AppState.authMode = 'login';
    AppState.showRecoverPasswordBox = false;
    AppState.showPurchaseAuthBanner = false;
    navigateTo('account', { preserveScroll: true });
  } else if (h === '#recuperar-senha') {
    AppState.authMode = 'login';
    AppState.showRecoverPasswordBox = true;
    AppState.showPurchaseAuthBanner = false;
    navigateTo('account', { preserveScroll: true });
  } else if (h === '#redefinir-senha') {
    navigateTo('reset-password', { preserveScroll: true });
  } else if (h === '#cadastro' || h === '#cadastro-etapa-1' || h === '#cadastro-dados') {
    AppState.authMode = 'register';
    AppState.registerStep = 1;
    AppState.showPurchaseAuthBanner = false;
    navigateTo('account', { preserveScroll: true });
  } else if (h === '#cadastro-etapa-2' || h === '#cadastro-senha') {
    AppState.authMode = 'register';
    AppState.registerStep = 2;
    AppState.showPurchaseAuthBanner = false;
    navigateTo('account', { preserveScroll: true });
  } else if (h === '#cadastro-etapa-3' || h === '#cadastro-endereco') {
    AppState.authMode = 'register';
    AppState.registerStep = 3;
    AppState.showPurchaseAuthBanner = false;
    navigateTo('account', { preserveScroll: true });
  } else if (h === '#minha-conta' || h === '#account') {
    navigateTo('account', { preserveScroll: true });
  } else if (h === '#meus-pedidos' || h === '#orders') {
    navigateTo('orders', { preserveScroll: true });
  } else if (h === '#favoritos' || h === '#favorites') {
    navigateTo('favorites', { preserveScroll: true });
  } else if (h === '#trocas' || h === '#returns') {
    navigateTo('returns', { preserveScroll: true });
  } else if (h === '#atendimento' || h === '#contato') {
    navigateTo('contact', { preserveScroll: true });
  } else if (h === '#politicas') {
    navigateTo('policies', { preserveScroll: true });
  } else if (h === '#admin') {
    navigateTo('admin', { preserveScroll: true });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(syncViewFromLocationHash, 20);
});
window.addEventListener('hashchange', syncViewFromLocationHash);
// ============================================================================
// BY ANGELY — V5: CORRECAO DEFINITIVA DE LOGIN E CADASTRO EXCLUDENTES EM 3 ETAPAS
// ============================================================================
AppState.authMode = AppState.authMode || 'login';
AppState.registerStep = AppState.registerStep || 1;
AppState.showRecoverPasswordBox = false;
AppState.loginDraft = AppState.loginDraft || { email: '', password: '' };
AppState.registerDraft = AppState.registerDraft || {
  name: '', phone: '', email: '', password: '', confirmPassword: '',
  zipCode: '', street: '', number: '', complement: '', neighborhood: '',
  city: '', state: '', reference: '', marketingOptIn: false
};

function isCustomerAuthenticatedV5() {
  return Boolean(AppState.currentCustomer && AppState.currentCustomer.email);
}

function isAuthScreenActiveV5() {
  const v = AppState.currentView;
  return !isCustomerAuthenticatedV5() && (v === 'account' || v === 'orders' || v === 'returns');
}

function injectV5AuthStylesAndCompactFooter() {
  if (!document.getElementById('by-angely-v5-auth-styles')) {
    const style = document.createElement('style');
    style.id = 'by-angely-v5-auth-styles';
    style.textContent = [
      'body.auth-page-active #category-strip-nav, body.auth-page-active .category-strip { display: none !important; }',
      'body.auth-page-active .floating-whatsapp-concierge { display: none !important; }',
      'body.auth-page-active .site-header .header-inner { min-height: 48px !important; padding-top: 6px !important; padding-bottom: 6px !important; }',
      '@media (max-width: 768px) { body.auth-page-active .top-announcement-bar { display: none !important; } body.auth-page-active .site-header .brand-title { font-size: 1.18rem !important; } }',
      '#auth-compact-footer { display: none; }',
      'body.auth-page-active .site-footer { padding: 18px 0 22px !important; margin-top: 12px !important; }',
      'body.auth-page-active .site-footer .footer-grid, body.auth-page-active .site-footer .footer-bottom { display: none !important; }',
      'body.auth-page-active #auth-compact-footer { display: block !important; }',
      '.auth-compact-footer-inner { max-width: 520px; margin: 0 auto; padding: 0 16px; text-align: center; }',
      '.auth-compact-footer-brand { font-family: var(--font-serif); font-size: 1.15rem; color: #F7F7F7; letter-spacing: 0.08em; margin-bottom: 10px; }',
      '.auth-compact-footer-links { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px 12px; margin-bottom: 10px; }',
      '.auth-compact-footer-link { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 999px; background: rgba(255, 255, 255,0.08); border: 1px solid rgba(228, 228, 231,0.22); color: #F7F7F7 !important; font-size: 0.75rem; font-weight: 500; text-decoration: none; cursor: pointer; }',
      '.auth-compact-footer-copy { font-size: 0.72rem; color: rgba(228, 228, 231,0.7); margin: 0; }',
      '.customer-area-shell.is-auth-screen { padding: 12px 0 26px !important; }',
      '.auth-single-wrapper { max-width: 470px; width: 100%; margin: 0 auto; box-sizing: border-box; }',
      '.auth-top-back-bar { display: flex; align-items: center; justify-content: flex-start; margin-bottom: 10px; }',
      '.auth-back-catalog-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; background: #FFFFFF; border: 1px solid #D4D4D8; color: #111111; font-size: 0.76rem; font-weight: 600; cursor: pointer; }',
      '.auth-mode-switcher-v5 { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 6px !important; background: #E4E4E7 !important; padding: 5px !important; border-radius: 12px !important; margin-bottom: 14px !important; width: 100% !important; box-sizing: border-box !important; }',
      '.auth-mode-tab-v5 { min-height: 44px !important; padding: 8px 10px !important; border-radius: 9px !important; border: none !important; background: transparent !important; color: #52525B !important; font-size: 0.75rem !important; font-weight: 700 !important; letter-spacing: 0.03em !important; text-transform: uppercase !important; cursor: pointer !important; text-align: center !important; }',
      '.auth-mode-tab-v5.active { background: #111111 !important; color: #FFFFFF !important; box-shadow: 0 2px 8px rgba(17, 17, 17,0.15) !important; }',
      '.auth-card-v5 { background: #FFFFFF !important; border: 1px solid #E4E4E7 !important; border-radius: 14px !important; padding: 20px 18px !important; box-shadow: 0 6px 22px rgba(17, 17, 17,0.05) !important; width: 100% !important; box-sizing: border-box !important; }',
      '@media (max-width: 480px) { .auth-card-v5 { padding: 16px 14px !important; } .auth-mode-tab-v5 { font-size: 0.71rem !important; padding: 8px 6px !important; } }',
      '.field-error-v5 { display: none; font-size: 0.75rem; color: #18181B; font-weight: 500; margin-top: 4px; line-height: 1.35; }',
      '.field-error-v5.visible { display: block !important; }'
    ].join(' ');
    document.head.appendChild(style);
  }
  const footerEl = document.querySelector('.site-footer');
  if (footerEl && !document.getElementById('auth-compact-footer')) {
    const compactDiv = document.createElement('div');
    compactDiv.id = 'auth-compact-footer';
    compactDiv.innerHTML = [
      '<div class="auth-compact-footer-inner">',
      '  <div class="auth-compact-footer-brand">BY ANGÉLY</div>',
      '  <div class="auth-compact-footer-links">',
      '    <a href="https://wa.me/5528999871458?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20BY%20ANG%C3%89LY%20e%20preciso%20de%20ajuda%20com%20meu%20acesso." target="_blank" rel="noopener noreferrer" class="auth-compact-footer-link">WhatsApp</a>',
      '    <a href="https://www.instagram.com/_by.angely?dlrf=OXJrN2EwdHNka21x" target="_blank" rel="noopener noreferrer" class="auth-compact-footer-link">Instagram</a>',
      '    <a href="mailto:byangely1@gmail.com" class="auth-compact-footer-link">E-mail</a>',
      '    <button type="button" class="auth-compact-footer-link" data-nav-view="policies">Políticas e Privacidade</button>',
      '  </div>',
      '  <p class="auth-compact-footer-copy">© 2026 BY ANGÉLY — Itaperuna, RJ • Compra Segura & LGPD</p>',
      '</div>'
    ].join('');
    footerEl.appendChild(compactDiv);
  }
}

function syncAuthPageBodyState() {
  injectV5AuthStylesAndCompactFooter();
  const isAuth = isAuthScreenActiveV5();
  document.body.classList.toggle('auth-page-active', isAuth);
  const catNav = document.getElementById('category-strip-nav');
  if (catNav) catNav.style.display = isAuth ? 'none' : '';
}

renderCustomerAreaNav = function (activeSection) {
  if (!isCustomerAuthenticatedV5()) {
    return '<div class="auth-top-back-bar"><button type="button" class="auth-back-catalog-btn" data-action="go-catalog">← Voltar ao Catálogo</button></div>';
  }
  const favCount = (AppState.wishlist || []).length;
  const ordCount = getAuthenticatedCustomerOrders().length;
  return [
    '<nav class="customer-area-nav" id="customer-area-subnav" aria-label="Navegação da Área da Cliente">',
    '  <div class="customer-area-nav-links">',
    '    <button type="button" class="customer-nav-pill ' + (activeSection === 'account' ? 'active' : '') + '" data-nav-view="account"><span>Minha Conta</span></button>',
    '    <button type="button" class="customer-nav-pill ' + (activeSection === 'orders' ? 'active' : '') + '" data-action="go-account-orders"><span>Meus Pedidos (' + ordCount + ')</span></button>',
    '    <button type="button" class="customer-nav-pill ' + (activeSection === 'favorites' ? 'active' : '') + '" data-nav-view="favorites"><span>Meus Favoritos (' + favCount + ')</span></button>',
    '    <button type="button" class="customer-nav-pill ' + (activeSection === 'returns' ? 'active' : '') + '" data-action="go-returns"><span>Trocas e Devoluções</span></button>',
    '  </div>',
    '  <button type="button" class="btn btn-outline btn-sm" data-action="go-catalog">← Voltar ao Catálogo</button>',
    '</nav>'
  ].join('');
};

function syncAllAuthDraftsFromDom() {
  const loginEmail = document.getElementById('login-email-input');
  const loginPass = document.getElementById('login-password-input');
  if (loginEmail) AppState.loginDraft.email = loginEmail.value;
  if (loginPass) AppState.loginDraft.password = loginPass.value;
  const regForm = document.getElementById('customer-register-form');
  if (regForm) {
    const fields = ['name', 'phone', 'email', 'password', 'confirmPassword', 'zipCode', 'street', 'number', 'complement', 'neighborhood', 'city', 'state', 'reference'];
    fields.forEach((f) => {
      const el = regForm.querySelector('[name="' + f + '"]');
      if (el) AppState.registerDraft[f] = el.value;
    });
  }
}

function setV5FieldError(inputId, errorId, message) {
  const inp = document.getElementById(inputId);
  const err = document.getElementById(errorId);
  const hasErr = Boolean(message);
  if (inp) inp.classList.toggle('has-error', hasErr);
  if (err) {
    err.textContent = message || '';
    err.style.display = hasErr ? 'block' : 'none';
    err.classList.toggle('visible', hasErr);
  }
}

function validateV5RegisterStep(stepNum) {
  syncAllAuthDraftsFromDom();
  const d = AppState.registerDraft;
  let valid = true;
  if (stepNum === 1) {
    const nameClean = String(d.name || '').trim();
    const phoneDigits = String(d.phone || '').replace(/[^0-9]/g, '');
    const emailClean = String(d.email || '').trim();
    if (nameClean.length < 3) {
      setV5FieldError('reg-name-input', 'reg-error-name', 'Informe seu nome completo.');
      valid = false;
    } else {
      setV5FieldError('reg-name-input', 'reg-error-name', '');
    }
    if (phoneDigits.length < 10) {
      setV5FieldError('reg-phone-input', 'reg-error-phone', 'Informe um telefone ou WhatsApp válido com DDD.');
      valid = false;
    } else {
      setV5FieldError('reg-phone-input', 'reg-error-phone', '');
    }
    if (!isValidEmailFormat(emailClean)) {
      setV5FieldError('reg-email-input', 'reg-error-email', 'Informe um e-mail válido (ex.: voce@email.com).');
      valid = false;
    } else {
      setV5FieldError('reg-email-input', 'reg-error-email', '');
    }
  } else if (stepNum === 2) {
    const pass = String(d.password || '');
    const conf = String(d.confirmPassword || '');
    if (pass.length < 6) {
      setV5FieldError('reg-password-input', 'reg-error-password', 'A senha deve ter pelo menos 6 caracteres.');
      valid = false;
    } else {
      setV5FieldError('reg-password-input', 'reg-error-password', '');
    }
    if (!conf) {
      setV5FieldError('reg-confirm-password-input', 'reg-error-confirmPassword', 'Confirme sua senha.');
      valid = false;
    } else if (conf !== pass) {
      setV5FieldError('reg-confirm-password-input', 'reg-error-confirmPassword', 'As senhas informadas não coincidem.');
      valid = false;
    } else {
      setV5FieldError('reg-confirm-password-input', 'reg-error-confirmPassword', '');
    }
  } else if (stepNum === 3) {
    const cepDigits = String(d.zipCode || '').replace(/[^0-9]/g, '');
    const street = String(d.street || '').trim();
    const number = String(d.number || '').trim();
    const neighborhood = String(d.neighborhood || '').trim();
    const city = String(d.city || '').trim();
    const state = String(d.state || '').trim();
    if (cepDigits.length !== 8) {
      setV5FieldError('reg-cep-input', 'reg-error-zipCode', 'Informe um CEP válido com 8 dígitos.');
      valid = false;
    } else {
      setV5FieldError('reg-cep-input', 'reg-error-zipCode', '');
    }
    if (!street) {
      setV5FieldError('reg-street-input', 'reg-error-street', 'Informe a rua ou avenida.');
      valid = false;
    } else {
      setV5FieldError('reg-street-input', 'reg-error-street', '');
    }
    if (!number) {
      setV5FieldError('reg-number-input', 'reg-error-number', 'Informe o número.');
      valid = false;
    } else {
      setV5FieldError('reg-number-input', 'reg-error-number', '');
    }
    if (!neighborhood) {
      setV5FieldError('reg-neighborhood-input', 'reg-error-neighborhood', 'Informe o bairro.');
      valid = false;
    } else {
      setV5FieldError('reg-neighborhood-input', 'reg-error-neighborhood', '');
    }
    if (!city) {
      setV5FieldError('reg-city-input', 'reg-error-city', 'Informe a cidade.');
      valid = false;
    } else {
      setV5FieldError('reg-city-input', 'reg-error-city', '');
    }
    if (state.length < 2) {
      setV5FieldError('reg-state-input', 'reg-error-state', 'Informe a UF.');
      valid = false;
    } else {
      setV5FieldError('reg-state-input', 'reg-error-state', '');
    }
  }
  return valid;
}

validateRegisterStep = validateV5RegisterStep;
setFieldErrorState = function (inputId, errorId, hasError, customMsg) {
  setV5FieldError(inputId, errorId, hasError ? (customMsg || 'Preencha este campo corretamente.') : '');
};
showRegisterStepInDom = function (targetStep) {

  syncAllAuthDraftsFromDom();
  AppState.registerStep = Math.max(1, Math.min(3, Number(targetStep) || 1));
  renderMainView();
};

renderCustomerAuthScreen = function (contextLabel) {
  const showBanner = Boolean(AppState.showPurchaseAuthBanner);
  const mode = AppState.authMode === 'register' ? 'register' : 'login';
  const step = Math.max(1, Math.min(3, Number(AppState.registerStep) || 1));
  const d = AppState.registerDraft || {};
  const l = AppState.loginDraft || {};
  const progressPct = step === 1 ? 33 : step === 2 ? 66 : 100;

  let activeStepHtml = '';
  if (step === 1) {
    activeStepHtml = [
      '<div id="reg-step-panel-1" data-reg-step-panel="1">',
      '  <div class="form-field-group">',
      '    <label class="form-field-label" for="reg-name-input">Nome completo <span class="req-star">*</span></label>',
      '    <input type="text" autocomplete="name" name="name" id="reg-name-input" class="form-input-v4" required placeholder="Digite seu nome e sobrenome" value="' + escapeHtml(d.name || '') + '" />',
      '    <span class="field-error-v5" id="reg-error-name" style="display:none;"></span>',
      '  </div>',
      '  <div class="form-field-group">',
      '    <label class="form-field-label" for="reg-phone-input">Telefone / WhatsApp <span class="req-star">*</span></label>',
      '    <input type="tel" inputmode="tel" autocomplete="tel" name="phone" id="reg-phone-input" class="form-input-v4" required placeholder="(28) 99999-9999" value="' + escapeHtml(d.phone || '') + '" />',
      '    <span class="field-error-v5" id="reg-error-phone" style="display:none;"></span>',
      '  </div>',
      '  <div class="form-field-group">',
      '    <label class="form-field-label" for="reg-email-input">E-mail <span class="req-star">*</span></label>',
      '    <input type="email" inputmode="email" autocomplete="email" name="email" id="reg-email-input" class="form-input-v4" required placeholder="seu@email.com" value="' + escapeHtml(d.email || '') + '" />',
      '    <span class="field-error-v5" id="reg-error-email" style="display:none;"></span>',
      '  </div>',
      '  <button type="button" id="btn-reg-step-1-next" class="btn btn-primary btn-block" data-action="reg-next-step" data-from-step="1" style="height:48px;margin-top:8px;">Continuar para senha</button>',
      '</div>'
    ].join('');
  } else if (step === 2) {
    activeStepHtml = [
      '<div id="reg-step-panel-2" data-reg-step-panel="2">',
      '  <div class="form-field-group">',
      '    <label class="form-field-label" for="reg-password-input">Senha <span class="req-star">*</span></label>',
      '    <div class="password-input-wrapper">',
      '      <input type="password" autocomplete="new-password" name="password" id="reg-password-input" class="form-input-v4" required minlength="6" placeholder="Crie uma senha (mín. 6 caracteres)" value="' + escapeHtml(d.password || '') + '" />',
      '      <button type="button" class="password-toggle-btn" data-action="toggle-password-visibility" data-target="reg-password-input">Mostrar</button>',
      '    </div>',
      '    <span style="display:block;font-size:0.73rem;color:#71717A;margin-top:4px;">Requisito mínimo: pelo menos 6 caracteres.</span>',
      '    <span class="field-error-v5" id="reg-error-password" style="display:none;"></span>',
      '  </div>',
      '  <div class="form-field-group">',
      '    <label class="form-field-label" for="reg-confirm-password-input">Confirmar senha <span class="req-star">*</span></label>',
      '    <div class="password-input-wrapper">',
      '      <input type="password" autocomplete="new-password" name="confirmPassword" id="reg-confirm-password-input" class="form-input-v4" required minlength="6" placeholder="Repita a senha criada" value="' + escapeHtml(d.confirmPassword || '') + '" />',
      '      <button type="button" class="password-toggle-btn" data-action="toggle-password-visibility" data-target="reg-confirm-password-input">Mostrar</button>',
      '    </div>',
      '    <span class="field-error-v5" id="reg-error-confirmPassword" style="display:none;"></span>',
      '  </div>',
      '  <div style="display:grid;grid-template-columns:1fr 1.45fr;gap:10px;margin-top:14px;">',
      '    <button type="button" id="btn-reg-step-2-prev" class="btn btn-outline" data-action="reg-prev-step" data-to-step="1" style="height:46px;">← Voltar</button>',
      '    <button type="button" id="btn-reg-step-2-next" class="btn btn-primary" data-action="reg-next-step" data-from-step="2" style="height:46px;">Continuar para endereço</button>',
      '  </div>',
      '</div>'
    ].join('');
  } else {
    activeStepHtml = [
      '<div id="reg-step-panel-3" data-reg-step-panel="3">',
      '  <div class="form-field-group">',
      '    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">',
      '      <label class="form-field-label" for="reg-cep-input" style="margin-bottom:0;">CEP <span class="req-star">*</span></label>',
      '      <span id="reg-cep-lookup-status" style="font-size:0.73rem;color:#111111;font-weight:500;">Digite o CEP para preencher</span>',
      '    </div>',
      '    <input type="text" inputmode="numeric" autocomplete="postal-code" name="zipCode" id="reg-cep-input" class="form-input-v4" required placeholder="00000-000" value="' + escapeHtml(d.zipCode || '') + '" />',
      '    <span class="field-error-v5" id="reg-error-zipCode" style="display:none;"></span>',
      '  </div>',
      '  <div class="form-field-group">',
      '    <label class="form-field-label" for="reg-street-input">Rua / Avenida <span class="req-star">*</span></label>',
      '    <input type="text" autocomplete="street-address" name="street" id="reg-street-input" class="form-input-v4" required placeholder="Nome da rua ou avenida" value="' + escapeHtml(d.street || '') + '" />',
      '    <span class="field-error-v5" id="reg-error-street" style="display:none;"></span>',
      '  </div>',
      '  <div style="display:grid;grid-template-columns:1fr 1.25fr;gap:10px;margin-bottom:14px;">',
      '    <div class="form-field-group" style="margin-bottom:0;">',
      '      <label class="form-field-label" for="reg-number-input">Número <span class="req-star">*</span></label>',
      '      <input type="text" name="number" id="reg-number-input" class="form-input-v4" required placeholder="Nº" value="' + escapeHtml(d.number || '') + '" />',
      '      <span class="field-error-v5" id="reg-error-number" style="display:none;"></span>',
      '    </div>',
      '    <div class="form-field-group" style="margin-bottom:0;">',
      '      <label class="form-field-label" for="reg-complement-input">Complemento</label>',
      '      <input type="text" name="complement" id="reg-complement-input" class="form-input-v4" placeholder="Apto, bloco (opcional)" value="' + escapeHtml(d.complement || '') + '" />',
      '    </div>',
      '  </div>',
      '  <div class="form-field-group">',
      '    <label class="form-field-label" for="reg-neighborhood-input">Bairro <span class="req-star">*</span></label>',
      '    <input type="text" name="neighborhood" id="reg-neighborhood-input" class="form-input-v4" required placeholder="Bairro" value="' + escapeHtml(d.neighborhood || '') + '" />',
      '    <span class="field-error-v5" id="reg-error-neighborhood" style="display:none;"></span>',
      '  </div>',
      '  <div style="display:grid;grid-template-columns:2fr 1fr;gap:10px;margin-bottom:14px;">',
      '    <div class="form-field-group" style="margin-bottom:0;">',
      '      <label class="form-field-label" for="reg-city-input">Cidade <span class="req-star">*</span></label>',
      '      <input type="text" name="city" id="reg-city-input" class="form-input-v4" required placeholder="Cidade" value="' + escapeHtml(d.city || '') + '" />',
      '      <span class="field-error-v5" id="reg-error-city" style="display:none;"></span>',
      '    </div>',
      '    <div class="form-field-group" style="margin-bottom:0;">',
      '      <label class="form-field-label" for="reg-state-input">Estado <span class="req-star">*</span></label>',
      '      <input type="text" name="state" id="reg-state-input" class="form-input-v4" required maxlength="2" placeholder="UF" value="' + escapeHtml(d.state || '') + '" style="text-transform:uppercase;" />',
      '      <span class="field-error-v5" id="reg-error-state" style="display:none;"></span>',
      '    </div>',
      '  </div>',
      '  <div class="form-field-group">',
      '    <label class="form-field-label" for="reg-reference-input">Referência <span style="font-weight:400;color:var(--text-muted);">(Opcional)</span></label>',
      '    <input type="text" name="reference" id="reg-reference-input" class="form-input-v4" placeholder="Ponto de referência para entrega" value="' + escapeHtml(d.reference || '') + '" />',
      '  </div>',
      '  <div style="display:grid;grid-template-columns:1fr 1.55fr;gap:10px;margin-top:14px;">',
      '    <button type="button" id="btn-reg-step-3-prev" class="btn btn-outline" data-action="reg-prev-step" data-to-step="2" style="height:48px;">← Voltar</button>',
      '    <button type="submit" id="btn-submit-register" class="btn btn-gold" style="height:48px;font-weight:700;">Criar conta e continuar</button>',
      '  </div>',
      '</div>'
    ].join('');
  }

  const activeFormHtml = mode === 'login' ? [
    '<div class="auth-card-v5" id="auth-login-panel">',
    '  <span class="section-eyebrow">Acesso da Cliente</span>',
    '  <h1 style="font-family:var(--font-serif);font-size:1.65rem;margin-bottom:4px;">Entrar na Minha Conta</h1>',
    '  <p style="font-size:0.83rem;color:var(--text-secondary);margin-bottom:16px;">Entre com seu e-mail e senha para acessar sua conta e seus pedidos.</p>',
    '  <div id="login-form-error-box" style="display:none;padding:10px 13px;border-radius:8px;background:#F4F4F5;border:1px solid #D4D4D8;color:#111111;font-size:0.81rem;margin-bottom:14px;"></div>',
    '  <form id="customer-login-form" novalidate>',
    '    <div class="form-field-group">',
    '      <label class="form-field-label" for="login-email-input">E-mail <span class="req-star">*</span></label>',
    '      <input type="email" inputmode="email" autocomplete="email" name="email" id="login-email-input" class="form-input-v4" required placeholder="seu@email.com" value="' + escapeHtml(l.email || '') + '" />',
    '      <span class="field-error-v5" id="login-email-error" style="display:none;"></span>',
    '    </div>',
    '    <div class="form-field-group">',
    '      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">',
    '        <label class="form-field-label" for="login-password-input" style="margin-bottom:0;">Senha <span class="req-star">*</span></label>',
    '        <button type="button" data-action="toggle-recover-password" style="background:none;border:none;color:#111111;font-size:0.75rem;font-weight:600;text-decoration:underline;cursor:pointer;padding:0;">Recuperar senha</button>',
    '      </div>',
    '      <div class="password-input-wrapper">',
    '        <input type="password" autocomplete="current-password" name="password" id="login-password-input" class="form-input-v4" required placeholder="Digite sua senha" value="' + escapeHtml(l.password || '') + '" />',
    '        <button type="button" class="password-toggle-btn" data-action="toggle-password-visibility" data-target="login-password-input">Mostrar</button>',
    '      </div>',
    '      <span class="field-error-v5" id="login-password-error" style="display:none;"></span>',
    '    </div>',
    '    <button type="submit" id="btn-login-submit" class="btn btn-primary btn-block" style="height:48px;font-size:0.86rem;margin-top:6px;">Entrar na Minha Conta</button>',
    '  </form>',
    '  <div id="customer-recover-container" style="display:' + (AppState.showRecoverPasswordBox ? 'block' : 'none') + ';margin-top:14px;padding:14px;background:#F7F7F7;border:1px solid #E4E4E7;border-radius:10px;">',
    '    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><strong style="font-size:0.83rem;color:#111111;">Esqueci minha senha</strong><button type="button" data-action="toggle-recover-password" style="background:none;border:none;color:#71717A;font-size:0.78rem;cursor:pointer;">Fechar ✕</button></div>',
    '    <form id="customer-recover-form" novalidate>',
    '      <p style="font-size:0.77rem;color:var(--text-secondary);margin-bottom:10px;">Informe seu e-mail para receber o link oficial de redefinição de senha via Firebase:</p>',
    '      <div class="form-field-group" style="margin-bottom:10px;"><input type="email" inputmode="email" name="email" id="recover-email-input" class="form-input-v4" required placeholder="seu@email.com" /></div>',
    '      <div id="recover-form-error" style="display:none;margin-bottom:10px;padding:9px 12px;border-radius:8px;background:#FFFFFF;border:1px solid #18181B;color:#111111;font-size:0.78rem;"></div>',
    '      <div id="recover-form-feedback" style="display:none;margin-bottom:10px;padding:10px 12px;border-radius:8px;background:#FFFFFF;border:1px solid #111111;color:#111111;font-size:0.79rem;line-height:1.45;"></div>',
    '      <button type="submit" id="btn-recover-submit" class="btn btn-primary btn-sm" style="width:100%;height:42px;">Enviar Link de Redefinição</button>',
    '    </form>',
    '  </div>',
    '  <div style="margin-top:16px;padding-top:14px;border-top:1px solid #E4E4E7;text-align:center;font-size:0.83rem;color:var(--text-secondary);">Primeira vez na BY ANGÉLY? <button type="button" data-action="switch-auth-mode" data-mode="register" style="background:none;border:none;color:#111111;font-weight:700;text-decoration:underline;cursor:pointer;margin-left:4px;">Criar Minha Conta →</button></div>',
    '</div>'
  ].join('') : [
    '<div class="auth-card-v5" id="auth-register-panel">',
    '  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><span class="section-eyebrow">Novo Cadastro</span><span style="font-size:0.75rem;color:#111111;font-weight:700;">Etapa ' + step + ' de 3</span></div>',
    '  <h1 style="font-family:var(--font-serif);font-size:1.65rem;margin-bottom:12px;">Criar Minha Conta</h1>',
    '  <div class="reg-stepper-header">',
    '    <div class="reg-stepper-steps">',
    '      <button type="button" class="reg-step-pill ' + (step === 1 ? 'active' : 'completed') + '" data-action="reg-jump-step" data-step="1"><span>' + (step > 1 ? '✓ Etapa 1' : 'Etapa 1') + '</span><strong>Dados Pessoais</strong></button>',
    '      <button type="button" class="reg-step-pill ' + (step === 2 ? 'active' : (step > 2 ? 'completed' : '')) + '" data-action="reg-jump-step" data-step="2"><span>' + (step > 2 ? '✓ Etapa 2' : 'Etapa 2') + '</span><strong>Senha</strong></button>',
    '      <button type="button" class="reg-step-pill ' + (step === 3 ? 'active' : '') + '" data-action="reg-jump-step" data-step="3"><span>Etapa 3</span><strong>Endereço</strong></button>',
    '    </div>',
    '    <div class="reg-progress-track" aria-hidden="true"><div class="reg-progress-bar" id="reg-progress-bar-fill" style="width:' + progressPct + '%;"></div></div>',
    '  </div>',
    '  <div id="register-form-error-box" style="display:none;padding:10px 13px;border-radius:8px;background:#F4F4F5;border:1px solid #D4D4D8;color:#111111;font-size:0.81rem;margin-bottom:14px;"></div>',
    '  <form id="customer-register-form" novalidate>' + activeStepHtml + '</form>',
    '  <div style="margin-top:16px;padding-top:14px;border-top:1px solid #E4E4E7;text-align:center;font-size:0.83rem;color:var(--text-secondary);">Já possui cadastro? <button type="button" data-action="switch-auth-mode" data-mode="login" style="background:none;border:none;color:#111111;font-weight:700;text-decoration:underline;cursor:pointer;margin-left:4px;">Entrar na Minha Conta →</button></div>',
    '</div>'
  ].join('');

  const innerAuthHtml = [
    '<div class="auth-single-wrapper" style="' + (contextLabel === 'checkout' ? 'max-width:none;' : '') + '">',
      (contextLabel === 'checkout' ? '' : renderCustomerAreaNav("account")),
      (showBanner ? '<div id="mandatory-auth-purchase-banner" style="background:#F4F4F5;border:1.5px solid #D4D4D8;border-radius:12px;padding:12px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px;"><div style="width:32px;height:32px;border-radius:50%;background:#111111;color:#FFFFFF;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:0.9rem;">🔒</div><p style="font-size:0.81rem;color:#52525B;margin:0;line-height:1.4;">' + escapeHtml(MANDATORY_LOGIN_MESSAGE) + '</p></div>' : ''),
    '  <div class="auth-mode-switcher-v5" id="auth-mode-switcher" role="tablist" aria-label="Autenticação da Cliente">',
    '    <button type="button" id="auth-tab-btn-login" role="tab" aria-selected="' + (mode === 'login') + '" class="auth-mode-tab-v5 ' + (mode === 'login' ? 'active' : '') + '" data-action="switch-auth-mode" data-mode="login">Entrar na Minha Conta</button>',
    '    <button type="button" id="auth-tab-btn-register" role="tab" aria-selected="' + (mode === 'register') + '" class="auth-mode-tab-v5 ' + (mode === 'register' ? 'active' : '') + '" data-action="switch-auth-mode" data-mode="register">Criar Minha Conta</button>',
    '  </div>',
      activeFormHtml,
    '</div>'
  ].join('');

  if (contextLabel === 'checkout') return innerAuthHtml;

  return [
    '<section class="section-block customer-area-shell is-auth-screen" id="view-customer-auth">',
    '  <div class="container">',
    innerAuthHtml,
    '  </div>',
    '</section>'
  ].join('');
};

const _origRenderMainViewV4 = renderMainView;
renderMainView = function () {
  syncAuthPageBodyState();
  _origRenderMainViewV4();
  syncAuthPageBodyState();
};

const _origBindAccountEventsV4 = bindAccountEvents;
bindAccountEvents = function () {
  _origBindAccountEventsV4();
  const loginEmail = document.getElementById('login-email-input');
  const loginPass = document.getElementById('login-password-input');
  if (loginEmail) {
    loginEmail.addEventListener('input', () => {
      AppState.loginDraft.email = loginEmail.value;
      if (isValidEmailFormat(loginEmail.value)) setV5FieldError('login-email-input', 'login-email-error', '');
    });
  }
  if (loginPass) {
    loginPass.addEventListener('input', () => {
      AppState.loginDraft.password = loginPass.value;
      if (loginPass.value.length > 0) setV5FieldError('login-password-input', 'login-password-error', '');
    });
  }
  const regName = document.getElementById('reg-name-input');
  const regPhone = document.getElementById('reg-phone-input');
  const regEmail = document.getElementById('reg-email-input');
  if (regName) {
    regName.addEventListener('input', () => {
      AppState.registerDraft.name = regName.value;
      if (regName.value.trim().length >= 3) setV5FieldError('reg-name-input', 'reg-error-name', '');
    });
  }
  if (regPhone) {
    regPhone.addEventListener('input', () => {
      regPhone.value = formatPhoneMask(regPhone.value);
      AppState.registerDraft.phone = regPhone.value;
      if (regPhone.value.replace(/[^0-9]/g, '').length >= 10) setV5FieldError('reg-phone-input', 'reg-error-phone', '');
    });
  }
  if (regEmail) {
    regEmail.addEventListener('input', () => {
      AppState.registerDraft.email = regEmail.value;
      if (isValidEmailFormat(regEmail.value)) setV5FieldError('reg-email-input', 'reg-error-email', '');
    });
  }
  const regPass = document.getElementById('reg-password-input');
  const regConf = document.getElementById('reg-confirm-password-input');
  if (regPass) {
    regPass.addEventListener('input', () => {
      AppState.registerDraft.password = regPass.value;
      if (regPass.value.length > 0 && regPass.value.length < 6) {
        setV5FieldError('reg-password-input', 'reg-error-password', 'A senha deve ter pelo menos 6 caracteres.');
      } else {
        setV5FieldError('reg-password-input', 'reg-error-password', '');
      }
      if (regConf && regConf.value.length > 0) {
        if (regConf.value !== regPass.value) {
          setV5FieldError('reg-confirm-password-input', 'reg-error-confirmPassword', 'As senhas informadas não coincidem.');
        } else {
          setV5FieldError('reg-confirm-password-input', 'reg-error-confirmPassword', '');
        }
      }
    });
  }
  if (regConf) {
    regConf.addEventListener('input', () => {
      AppState.registerDraft.confirmPassword = regConf.value;
      const pVal = regPass ? regPass.value : AppState.registerDraft.password;
      if (regConf.value.length > 0 && regConf.value !== pVal) {
        setV5FieldError('reg-confirm-password-input', 'reg-error-confirmPassword', 'As senhas informadas não coincidem.');
      } else {
        setV5FieldError('reg-confirm-password-input', 'reg-error-confirmPassword', '');
      }
    });
  }
  const regCep = document.getElementById('reg-cep-input');
  if (regCep) {
    regCep.addEventListener('input', () => {
      regCep.value = formatCepMask(regCep.value);
      AppState.registerDraft.zipCode = regCep.value;
      const digits = regCep.value.replace(/[^0-9]/g, '');
      if (digits.length === 8) {
        setV5FieldError('reg-cep-input', 'reg-error-zipCode', '');
        lookupViaCepAddress(digits, {
          street: 'reg-street-input', neighborhood: 'reg-neighborhood-input',
          city: 'reg-city-input', state: 'reg-state-input', statusEl: 'reg-cep-lookup-status'
        });
      }
    });
  }
  ['street', 'number', 'complement', 'neighborhood', 'city', 'state', 'reference'].forEach((field) => {
    const inp = document.getElementById('reg-' + field + '-input');
    if (inp) {
      inp.addEventListener('input', () => {
        AppState.registerDraft[field] = inp.value;
        if (inp.value.trim()) setV5FieldError('reg-' + field + '-input', 'reg-error-' + field, '');
      });
    }
  });
};

document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.getAttribute('data-action');
  if (action === 'switch-auth-mode') {
    e.preventDefault(); e.stopPropagation();
    syncAllAuthDraftsFromDom();
    AppState.authMode = target.getAttribute('data-mode') === 'register' ? 'register' : 'login';
    renderMainView();
    return;
  }
  if (action === 'reg-next-step') {
    e.preventDefault(); e.stopPropagation();
    const fromStep = Number(target.getAttribute('data-from-step')) || AppState.registerStep || 1;
    if (!validateV5RegisterStep(fromStep)) return;
    AppState.registerStep = Math.min(3, fromStep + 1);
    renderMainView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (action === 'reg-prev-step') {
    e.preventDefault(); e.stopPropagation();
    syncAllAuthDraftsFromDom();
    const toStep = Number(target.getAttribute('data-to-step')) || Math.max(1, (AppState.registerStep || 2) - 1);
    AppState.registerStep = Math.max(1, toStep);
    renderMainView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (action === 'reg-jump-step') {
    e.preventDefault(); e.stopPropagation();
    syncAllAuthDraftsFromDom();
    const targetStep = Number(target.getAttribute('data-step')) || 1;
    const currentStep = AppState.registerStep || 1;
    if (targetStep < currentStep) {
      AppState.registerStep = targetStep;
      renderMainView();
    } else if (targetStep > currentStep) {
      if (validateV5RegisterStep(currentStep)) {
        AppState.registerStep = currentStep + 1;
        renderMainView();
      }
    }
    return;
  }
}, true);

setTimeout(syncAuthPageBodyState, 10);

// ============================================================================
// BY ANGELY — V6: CANCELAMENTO DE PEDIDOS (ANTES E APÓS PAGAMENTO),
// EXCLUSÃO/ANONIMIZAÇÃO DE CONTA PELA CLIENTE E SUPORTE ADMIN MOBILE
// ============================================================================
const CUSTOMER_CANCELLED_ORDER_EXACT_MSG =
  'Seu pedido foi cancelado. Você poderá continuar navegando pela loja e escolher outros produtos quando quiser.';

AppState.lastCancelledOrderBannerMessage = AppState.lastCancelledOrderBannerMessage || '';
AppState.lastCancelledOrderNumber = AppState.lastCancelledOrderNumber || '';

function isOrderAwaitingPaymentV6(ord) {
  if (!ord) return false;
  const st = String(ord.status || 'awaiting_payment');
  return (
    (st === 'awaiting_payment' || st === 'awaiting_confirmation' || st === 'awaiting_whatsapp') &&
    ord.paymentStatus !== 'paid'
  );
}

function isOrderPaidAndEligibleForCancelRequestV6(ord) {
  if (!ord) return false;
  const st = String(ord.status || '');
  if (st === 'cancelled' || st === 'cancelled_expired') return false;
  return (
    ord.paymentStatus === 'paid' ||
    [
      'payment_approved',
      'paid',
      'awaiting_separation',
      'in_separation',
      'preparing',
      'ready_for_shipping',
      'shipped',
      'out_for_delivery',
      'delivered',
      'late_payment_reconciliation'
    ].includes(st)
  );
}

function renderCancellationRequestBadgeHtmlV6(ord) {
  if (!ord || !ord.cancellationRequest) return '';
  const req = ord.cancellationRequest;
  let bg = '#F4F4F5';
  let border = '#D4D4D8';
  let color = '#18181B';
  if (req.status === 'approved' || req.status === 'refunded') {
    bg = '#F4F4F5';
    border = '#111111';
    color = '#111111';
  } else if (req.status === 'rejected') {
    bg = '#F4F4F5';
    border = '#D4D4D8';
    color = '#111111';
  }
  return [
    '<div class="order-cancel-request-box-v6" style="margin-top:12px;padding:12px 14px;border-radius:10px;background:' + bg + ';border:1px solid ' + border + ';font-size:0.82rem;color:' + color + ';">',
    '  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:4px;">',
    '    <strong>Solicitação de Cancelamento (Pedido Pago): ' + escapeHtml(req.statusLabel || 'Em análise pela loja') + '</strong>',
    '    <span style="font-size:0.74rem;opacity:0.85;">' + formatDateBR(req.updatedAt || req.createdAt) + '</span>',
    '  </div>',
    '  <div><strong>Motivo informado:</strong> ' + escapeHtml(req.reason || '') + '</div>',
    (req.adminReason ? '<div style="margin-top:4px;"><strong>Posicionamento da loja:</strong> ' + escapeHtml(req.adminReason) + '</div>' : ''),
    (req.refundReference ? '<div style="margin-top:4px;"><strong>Comprovante / Referência do reembolso:</strong> ' + escapeHtml(req.refundReference) + '</div>' : ''),
    '</div>'
  ].join('');
}

function syncAdminAndAuthBodyStateV6() {
  syncAuthPageBodyState();
  const isAdmin = AppState.currentView === 'admin';
  document.body.classList.toggle('admin-page-active', isAdmin);
  const catNav = document.getElementById('category-strip-nav');
  if (catNav) {
    catNav.style.display = (isAdmin || isAuthScreenActiveV5()) ? 'none' : '';
  }
  const floatWa = document.querySelector('.floating-whatsapp-concierge');
  if (floatWa && isAdmin) {
    floatWa.style.display = 'none';
  }
}

function ensureV6CustomerModals() {
  if (!document.getElementById('by-angely-v6-customer-styles')) {
    const st = document.createElement('style');
    st.id = 'by-angely-v6-customer-styles';
    st.textContent = [
      'body.admin-page-active #category-strip-nav, body.admin-page-active .category-strip { display: none !important; }',
      'body.admin-page-active .floating-whatsapp-concierge { display: none !important; }',
      '.v6-modal-backdrop { position: fixed; inset: 0; background: rgba(17, 17, 17, 0.62); backdrop-filter: blur(3px); z-index: 9998; display: none; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; }',
      '.v6-modal-backdrop.open { display: flex !important; }',
      '.v6-modal-card { background: #FFFFFF; border: 1px solid #D4D4D8; border-radius: 14px; max-width: 520px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 22px 20px; box-shadow: 0 18px 48px rgba(17, 17, 17, 0.24); box-sizing: border-box; }',
      '@media (max-width: 480px) { .v6-modal-card { padding: 18px 15px; } }'
    ].join(' ');
    document.head.appendChild(st);
  }

  // Modal 1: Confirmação de Cancelamento de Pedido Antes do Pagamento
  if (!document.getElementById('customer-cancel-order-modal')) {
    const m1 = document.createElement('div');
    m1.id = 'customer-cancel-order-modal';
    m1.className = 'v6-modal-backdrop';
    m1.setAttribute('aria-hidden', 'true');
    m1.innerHTML = [
      '<div class="v6-modal-card" role="dialog" aria-modal="true" aria-labelledby="cancel-unpaid-modal-title">',
      '  <span class="section-eyebrow" style="color:#111111;">Cancelamento de Pedido</span>',
      '  <h2 id="cancel-unpaid-modal-title" style="font-family:var(--font-serif);font-size:1.55rem;margin-bottom:8px;color:#111111;">Deseja cancelar este pedido?</h2>',
      '  <p id="cancel-unpaid-modal-desc" style="font-size:0.86rem;color:#52525B;line-height:1.5;margin-bottom:14px;">Ao confirmar o cancelamento, a cobrança Pix vinculada será invalidada imediatamente e as peças reservadas retornarão ao estoque da loja.</p>',
      '  <div class="form-field-group" style="margin-bottom:14px;">',
      '    <label class="form-field-label" for="cancel-unpaid-reason-input">Motivo do cancelamento (opcional)</label>',
      '    <input type="text" id="cancel-unpaid-reason-input" class="form-input-v4" placeholder="Ex.: Vou escolher outro tamanho ou forma de pagamento" />',
      '  </div>',
      '  <div id="cancel-unpaid-error-box" style="display:none;padding:10px 12px;border-radius:8px;background:#F4F4F5;border:1px solid #D4D4D8;color:#111111;font-size:0.8rem;margin-bottom:12px;"></div>',
      '  <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">',
      '    <button type="button" class="btn btn-outline btn-sm" data-action="close-cancel-order-modal" style="min-height:42px;padding:0 16px;">Voltar e manter pedido</button>',
      '    <button type="button" id="btn-confirm-cancel-unpaid-order" class="btn btn-primary btn-sm" data-action="confirm-cancel-order" data-order-id="" style="min-height:42px;padding:0 18px;background:#111111;border-color:#111111;color:#FFFFFF;">Confirmar cancelamento</button>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(m1);
  }

  // Modal 2: Solicitação de Cancelamento de Pedido Pago
  if (!document.getElementById('customer-paid-cancel-request-modal')) {
    const m2 = document.createElement('div');
    m2.id = 'customer-paid-cancel-request-modal';
    m2.className = 'v6-modal-backdrop';
    m2.setAttribute('aria-hidden', 'true');
    m2.innerHTML = [
      '<div class="v6-modal-card" role="dialog" aria-modal="true" aria-labelledby="paid-cancel-req-title">',
      '  <span class="section-eyebrow">Pedido com Pagamento Confirmado</span>',
      '  <h2 id="paid-cancel-req-title" style="font-family:var(--font-serif);font-size:1.55rem;margin-bottom:8px;color:#111111;">Solicitar Cancelamento e Reembolso</h2>',
      '  <p id="paid-cancel-req-desc" style="font-size:0.84rem;color:#52525B;line-height:1.5;margin-bottom:14px;">Como o pagamento deste pedido já foi confirmado, sua solicitação será encaminhada para análise prioritária da administração da BY ANGÉLY para aprovação e processamento do estorno.</p>',
      '  <form id="customer-paid-cancel-request-form" novalidate>',
      '    <input type="hidden" id="paid-cancel-order-id-input" value="" />',
      '    <div class="form-field-group" style="margin-bottom:14px;">',
      '      <label class="form-field-label" for="paid-cancel-reason-input">Informe o motivo da solicitação <span class="req-star">*</span></label>',
      '      <textarea id="paid-cancel-reason-input" class="form-input-v4" rows="3" required placeholder="Descreva o motivo para cancelamento e estorno do pedido..." style="height:auto;padding:10px 12px;"></textarea>',
      '    </div>',
      '    <div id="paid-cancel-error-box" style="display:none;padding:10px 12px;border-radius:8px;background:#F4F4F5;border:1px solid #D4D4D8;color:#111111;font-size:0.8rem;margin-bottom:12px;"></div>',
      '    <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">',
      '      <button type="button" class="btn btn-outline btn-sm" data-action="close-paid-cancel-request-modal" style="min-height:42px;padding:0 16px;">Voltar</button>',
      '      <button type="submit" id="btn-submit-paid-cancel-request" class="btn btn-primary btn-sm" style="min-height:42px;padding:0 18px;">Enviar solicitação</button>',
      '    </div>',
      '  </form>',
      '</div>'
    ].join('');
    document.body.appendChild(m2);
  }

  // Modal 3: Solicitação de Exclusão / Anonimização da Própria Conta (LGPD)
  if (!document.getElementById('customer-delete-account-modal')) {
    const m3 = document.createElement('div');
    m3.id = 'customer-delete-account-modal';
    m3.className = 'v6-modal-backdrop';
    m3.setAttribute('aria-hidden', 'true');
    m3.innerHTML = [
      '<div class="v6-modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-account-modal-title">',
      '  <span class="section-eyebrow" style="color:#111111;">Privacidade e Titularidade de Dados • LGPD</span>',
      '  <h2 id="delete-account-modal-title" style="font-family:var(--font-serif);font-size:1.55rem;margin-bottom:8px;color:#111111;">Excluir Minha Conta</h2>',
      '  <div style="background:#F4F4F5;border:1px solid #E4E4E7;border-radius:10px;padding:12px 14px;font-size:0.81rem;color:#52525B;line-height:1.5;margin-bottom:14px;">',
      '    <strong style="display:block;color:#111111;margin-bottom:4px;">Antes de confirmar, saiba o que acontecerá:</strong>',
      '    <ul style="margin:0;padding-left:18px;">',
      '      <li><strong>Encerramento do acesso:</strong> sua conta será desativada permanentemente e não permitirá novos logins ou compras.</li>',
      '      <li><strong>Dados excluídos/anonimizados:</strong> nome completo, telefone/WhatsApp, CPF, endereços salvos e sacola serão anonimizados.</li>',
      '      <li><strong>Retenção legal obrigatória:</strong> registros fiscais, financeiros e de pedidos concluídos são preservados exclusivamente pelo prazo legal (Art. 16 da LGPD — Lei nº 13.709/2018), sem permitir novo acesso.</li>',
      '      <li><strong>Pedidos em andamento:</strong> pedidos não pagos serão cancelados imediatamente; se houver pedido pago em preparação/entrega, a exclusão ficará vinculada à conclusão da entrega.</li>',
      '    </ul>',
      '  </div>',
      '  <form id="customer-delete-account-form" novalidate>',
      '    <div class="form-field-group" style="margin-bottom:12px;">',
      '      <label class="form-field-label" for="delete-account-password-input">Confirme sua senha atual para segurança <span class="req-star">*</span></label>',
      '      <div class="password-input-wrapper">',
      '        <input type="password" id="delete-account-password-input" name="password" class="form-input-v4" required placeholder="Digite sua senha atual" />',
      '        <button type="button" class="password-toggle-btn" data-action="toggle-password-visibility" data-target="delete-account-password-input">Mostrar</button>',
      '      </div>',
      '    </div>',
      '    <div class="form-field-group" style="margin-bottom:12px;">',
      '      <label class="form-field-label" for="delete-account-reason-input">Motivo da saída (opcional)</label>',
      '      <input type="text" id="delete-account-reason-input" name="reason" class="form-input-v4" placeholder="Opcional: conte-nos o motivo" />',
      '    </div>',
      '    <label style="display:flex;align-items:flex-start;gap:8px;font-size:0.8rem;color:#111111;margin-bottom:14px;cursor:pointer;">',
      '      <input type="checkbox" id="delete-account-confirm-checkbox" name="confirmDeletion" required style="margin-top:3px;" />',
      '      <span>Compreendo que esta ação encerrará o acesso à minha conta e anonimizará meus dados pessoais cadastrais.</span>',
      '    </label>',
      '    <div id="delete-account-error-box" style="display:none;padding:10px 12px;border-radius:8px;background:#F4F4F5;border:1px solid #D4D4D8;color:#111111;font-size:0.8rem;margin-bottom:12px;"></div>',
      '    <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">',
      '      <button type="button" class="btn btn-outline btn-sm" data-action="close-delete-account-modal" style="min-height:42px;padding:0 16px;">Cancelar e manter conta</button>',
      '      <button type="submit" id="btn-confirm-delete-account" class="btn btn-primary btn-sm" style="min-height:42px;padding:0 18px;background:#111111;border-color:#111111;color:#FFFFFF;">Confirmar exclusão da minha conta</button>',
      '    </div>',
      '  </form>',
      '</div>'
    ].join('');
    document.body.appendChild(m3);
  }
}

// Sobrescreve renderAccountView para incluir o cartão "Excluir minha conta" (LGPD)
const _origRenderAccountViewV5 = renderAccountView;
renderAccountView = function () {
  const baseHtml = _origRenderAccountViewV5();
  if (!isCustomerAuthenticatedV5()) return baseHtml;
  const cust = AppState.currentCustomer || {};
  const hasDeletionReq = cust.accountStatus === 'deletion_requested' || cust.deletionRequestedAt;
  const deletionCardHtml = [
    '<div class="admin-card" id="customer-delete-account-card" style="margin-top:20px;border-color:#D4D4D8;background:#FFFFFF;">',
    '  <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">',
    '    <div style="max-width:640px;">',
    '      <span class="section-eyebrow" style="color:#111111;">Privacidade e Controle de Dados (LGPD)</span>',
    '      <h2 style="font-family:var(--font-serif);font-size:1.4rem;margin-bottom:4px;color:#111111;">Encerramento e Exclusão da Conta</h2>',
    '      <p style="font-size:0.82rem;color:var(--text-secondary);margin:0;line-height:1.5;">',
    '        Você pode solicitar a exclusão e anonimização dos seus dados pessoais a qualquer momento. Registros financeiros e fiscais de compras concluídas são mantidos apenas pelo prazo legal obrigatório, sem permitir novo acesso.',
    '      </p>',
    (hasDeletionReq
      ? '<div style="margin-top:10px;padding:10px 12px;border-radius:8px;background:#F4F4F5;border:1px solid #D4D4D8;color:#18181B;font-size:0.8rem;"><strong>Solicitação registrada:</strong> Sua solicitação de exclusão está vinculada à conclusão dos seus pedidos pagos em andamento.</div>'
      : ''),
    '    </div>',
    '    <div style="display:flex;align-items:center;">',
    '      <button type="button" id="btn-open-delete-account-modal" class="btn btn-outline btn-sm" data-action="open-delete-account-modal" style="color:#111111;border-color:#D4D4D8;background:#F4F4F5;min-height:42px;padding:0 18px;">',
    '        Excluir minha conta',
    '      </button>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join('');

  // Injeta antes do fechamento de #meus-dados-e-enderecos
  const marker = '</form>\n          </div>\n        </div>\n      </div>\n    </section>';
  if (baseHtml.includes(marker)) {
    return baseHtml.replace(marker, '</form>\n          </div>\n          ' + deletionCardHtml + '\n        </div>\n      </div>\n    </section>');
  }
  return baseHtml.replace('</section>', '<div class="container" style="max-width:960px;margin-top:16px;">' + deletionCardHtml + '</div></section>');
};

// Injeta botões de Cancelar Pedido (antes do pagamento) e Solicitar Cancelamento (após pagamento) em Meus Pedidos, Detalhes e Confirmação
function enhanceOrderViewsV6() {
  ensureV6CustomerModals();

  // 1. Se houver banner de pedido recém-cancelado, exibe no topo de Meus Pedidos
  const ordersShell = document.getElementById('view-meus-pedidos');
  if (ordersShell && AppState.lastCancelledOrderBannerMessage) {
    const container = ordersShell.querySelector('.container');
    if (container && !document.getElementById('customer-cancelled-order-banner')) {
      const banner = document.createElement('div');
      banner.id = 'customer-cancelled-order-banner';
      banner.style.cssText = 'background:#F4F4F5;border:1.5px solid #111111;border-radius:12px;padding:16px 18px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;';
      banner.innerHTML = [
        '<div>',
        '  <strong style="display:block;font-size:0.95rem;color:#111111;margin-bottom:2px;">Pedido ' + escapeHtml(AppState.lastCancelledOrderNumber || '') + ' cancelado com sucesso</strong>',
        '  <p style="font-size:0.86rem;color:#111111;margin:0;" id="customer-cancelled-order-exact-text">' + escapeHtml(AppState.lastCancelledOrderBannerMessage) + '</p>',
        '</div>',
        '<div style="display:flex;gap:8px;align-items:center;">',
        '  <button type="button" class="btn btn-primary btn-sm" data-action="go-catalog">Continuar navegando na loja</button>',
        '  <button type="button" class="btn btn-outline btn-sm" data-action="dismiss-cancelled-order-banner">Fechar</button>',
        '</div>'
      ].join('');
      const navEl = container.querySelector('.customer-area-nav');
      if (navEl && navEl.nextSibling) {
        container.insertBefore(banner, navEl.nextSibling);
      } else {
        container.prepend(banner);
      }
    }
  }

  // 2. Cartões de pedidos em Meus Pedidos
  document.querySelectorAll('article.order-card-v4[data-order-card-id]').forEach((card) => {
    const orderId = card.getAttribute('data-order-card-id');
    const ord = (AppState.db && AppState.db.orders || []).find((o) => o && o.id === orderId);
    if (!ord) return;

    const actionsBar = card.querySelector('.order-card-v4-actions');
    if (actionsBar && !actionsBar.hasAttribute('data-v6-enhanced')) {
      actionsBar.setAttribute('data-v6-enhanced', 'true');
      if (isOrderAwaitingPaymentV6(ord)) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-outline btn-sm btn-cancel-unpaid-order';
        btn.setAttribute('data-action', 'open-cancel-order-modal');
        btn.setAttribute('data-order-id', ord.id);
        btn.setAttribute('data-order-number', ord.orderNumber || '');
        btn.style.cssText = 'min-height:42px;padding:0 16px;color:#111111;border-color:#D4D4D8;background:#F4F4F5;';
        btn.textContent = 'Cancelar pedido';
        actionsBar.appendChild(btn);
      } else if (isOrderPaidAndEligibleForCancelRequestV6(ord)) {
        if (!ord.cancellationRequest || ord.cancellationRequest.status === 'rejected') {
          const btnReq = document.createElement('button');
          btnReq.type = 'button';
          btnReq.className = 'btn btn-outline btn-sm btn-request-paid-cancel';
          btnReq.setAttribute('data-action', 'open-paid-cancel-request-modal');
          btnReq.setAttribute('data-order-id', ord.id);
          btnReq.setAttribute('data-order-number', ord.orderNumber || '');
          btnReq.style.cssText = 'min-height:42px;padding:0 16px;color:#111111;border-color:#D4D4D8;';
          btnReq.textContent = 'Solicitar cancelamento';
          actionsBar.appendChild(btnReq);
        }
      }
    }

    if (ord.cancellationRequest && !card.querySelector('.order-cancel-request-box-v6')) {
      const boxWrapper = document.createElement('div');
      boxWrapper.innerHTML = renderCancellationRequestBadgeHtmlV6(ord);
      if (actionsBar) {
        card.insertBefore(boxWrapper.firstElementChild, actionsBar);
      } else {
        card.appendChild(boxWrapper.firstElementChild);
      }
    }
  });

  // 3. Tela de Confirmação de Pedido (QR Code Pix / Aguardando pagamento)
  if (AppState.lastCreatedOrder) {
    const ord = (AppState.db && AppState.db.orders || []).find((o) => o && o.id === AppState.lastCreatedOrder.id) || AppState.lastCreatedOrder;
    const pixBox = document.getElementById('pix-awaiting-box');
    if (pixBox && isOrderAwaitingPaymentV6(ord) && !document.getElementById('btn-confirmation-cancel-order')) {
      const cancelWrap = document.createElement('div');
      cancelWrap.style.cssText = 'margin-top:14px;padding-top:12px;border-top:1px dashed #E4E4E7;';
      cancelWrap.innerHTML = '<button type="button" id="btn-confirmation-cancel-order" class="btn btn-outline btn-sm" data-action="open-cancel-order-modal" data-order-id="' + escapeHtml(ord.id) + '" data-order-number="' + escapeHtml(ord.orderNumber) + '" style="color:#111111;border-color:#D4D4D8;background:#F4F4F5;min-height:40px;padding:0 16px;">Cancelar pedido</button>';
      pixBox.appendChild(cancelWrap);
    }
    const expiredBanner = document.getElementById('pix-expired-banner');
    if (expiredBanner && ord.status === 'cancelled' && ord.cancelledBy === 'customer') {
      const pEl = expiredBanner.querySelector('p');
      if (pEl) {
        pEl.textContent = CUSTOMER_CANCELLED_ORDER_EXACT_MSG;
      }
    }
  }
}

const _origOpenOrderDetailModalV5 = openOrderDetailModal;
openOrderDetailModal = function (orderId) {
  _origOpenOrderDetailModalV5(orderId);
  ensureV6CustomerModals();
  const ord = (AppState.db && AppState.db.orders || []).find((o) => o && o.id === orderId);
  const body = document.getElementById('order-detail-modal-body');
  if (!ord || !body) return;

  if (ord.status === 'cancelled' && ord.cancelledBy === 'customer') {
    const cancelNotice = document.createElement('div');
    cancelNotice.style.cssText = 'background:#F4F4F5;border:1px solid #111111;border-radius:10px;padding:12px 14px;margin-bottom:14px;color:#111111;font-size:0.85rem;font-weight:600;';
    cancelNotice.textContent = ord.customerCancelMessage || CUSTOMER_CANCELLED_ORDER_EXACT_MSG;
    body.prepend(cancelNotice);
  }

  if (ord.cancellationRequest && !body.querySelector('.order-cancel-request-box-v6')) {
    const wrap = document.createElement('div');
    wrap.style.marginBottom = '16px';
    wrap.innerHTML = renderCancellationRequestBadgeHtmlV6(ord);
    body.insertBefore(wrap, body.lastElementChild);
  }

  const closeBtn = body.querySelector('[data-action="close-order-detail-modal"]');
  const footerActions = closeBtn ? closeBtn.parentElement : null;
  if (footerActions && !footerActions.hasAttribute('data-v6-modal-enhanced')) {
    footerActions.setAttribute('data-v6-modal-enhanced', 'true');
    if (isOrderAwaitingPaymentV6(ord)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline btn-sm';
      btn.id = 'btn-modal-cancel-unpaid-order';
      btn.setAttribute('data-action', 'open-cancel-order-modal');
      btn.setAttribute('data-order-id', ord.id);
      btn.setAttribute('data-order-number', ord.orderNumber || '');
      btn.style.cssText = 'color:#111111;border-color:#D4D4D8;background:#F4F4F5;';
      btn.textContent = 'Cancelar pedido';
      footerActions.insertBefore(btn, closeBtn);
    } else if (isOrderPaidAndEligibleForCancelRequestV6(ord) && (!ord.cancellationRequest || ord.cancellationRequest.status === 'rejected')) {
      const btnReq = document.createElement('button');
      btnReq.type = 'button';
      btnReq.className = 'btn btn-outline btn-sm';
      btnReq.id = 'btn-modal-request-paid-cancel';
      btnReq.setAttribute('data-action', 'open-paid-cancel-request-modal');
      btnReq.setAttribute('data-order-id', ord.id);
      btnReq.setAttribute('data-order-number', ord.orderNumber || '');
      btnReq.style.cssText = 'color:#111111;border-color:#D4D4D8;';
      btnReq.textContent = 'Solicitar cancelamento';
      footerActions.insertBefore(btnReq, closeBtn);
    }
  }
};

const _origRenderMainViewV5 = renderMainView;
renderMainView = function () {
  syncAdminAndAuthBodyStateV6();
  _origRenderMainViewV5();
  syncAdminAndAuthBodyStateV6();
  enhanceOrderViewsV6();
};

function openCancelUnpaidOrderModalV6(orderId, orderNumber) {
  ensureV6CustomerModals();
  const modal = document.getElementById('customer-cancel-order-modal');
  const titleEl = document.getElementById('cancel-unpaid-modal-title');
  const reasonInp = document.getElementById('cancel-unpaid-reason-input');
  const errBox = document.getElementById('cancel-unpaid-error-box');
  const confirmBtn = document.getElementById('btn-confirm-cancel-unpaid-order');
  if (!modal || !confirmBtn) return;
  if (titleEl) titleEl.textContent = 'Cancelar Pedido ' + (orderNumber || '') + '?';
  if (reasonInp) reasonInp.value = '';
  if (errBox) errBox.style.display = 'none';
  confirmBtn.setAttribute('data-order-id', orderId || '');
  confirmBtn.disabled = false;
  confirmBtn.textContent = 'Confirmar cancelamento';
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeCancelUnpaidOrderModalV6() {
  const modal = document.getElementById('customer-cancel-order-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
}

function openPaidCancelRequestModalV6(orderId, orderNumber) {
  ensureV6CustomerModals();
  const modal = document.getElementById('customer-paid-cancel-request-modal');
  const titleEl = document.getElementById('paid-cancel-req-title');
  const idInp = document.getElementById('paid-cancel-order-id-input');
  const reasonInp = document.getElementById('paid-cancel-reason-input');
  const errBox = document.getElementById('paid-cancel-error-box');
  if (!modal || !idInp) return;
  if (titleEl) titleEl.textContent = 'Solicitar Cancelamento • ' + (orderNumber || 'Pedido Pago');
  idInp.value = orderId || '';
  if (reasonInp) reasonInp.value = '';
  if (errBox) errBox.style.display = 'none';
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closePaidCancelRequestModalV6() {
  const modal = document.getElementById('customer-paid-cancel-request-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
}

function openDeleteAccountModalV6() {
  ensureV6CustomerModals();
  const modal = document.getElementById('customer-delete-account-modal');
  const pwdInp = document.getElementById('delete-account-password-input');
  const reasonInp = document.getElementById('delete-account-reason-input');
  const chkInp = document.getElementById('delete-account-confirm-checkbox');
  const errBox = document.getElementById('delete-account-error-box');
  if (!modal) return;
  if (pwdInp) pwdInp.value = '';
  if (reasonInp) reasonInp.value = '';
  if (chkInp) chkInp.checked = false;
  if (errBox) errBox.style.display = 'none';
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeDeleteAccountModalV6() {
  const modal = document.getElementById('customer-delete-account-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
}

// Eventos globais de clique e submissão para Cancelamento de Pedidos e Exclusão de Conta
document.addEventListener('click', async (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.getAttribute('data-action');
  const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';

  if (action === 'open-cancel-order-modal') {
    e.preventDefault();
    e.stopPropagation();
    const orderId = target.getAttribute('data-order-id') || '';
    const orderNum = target.getAttribute('data-order-number') || '';
    openCancelUnpaidOrderModalV6(orderId, orderNum);
    return;
  }

  if (action === 'close-cancel-order-modal') {
    e.preventDefault();
    e.stopPropagation();
    closeCancelUnpaidOrderModalV6();
    return;
  }

  if (action === 'dismiss-cancelled-order-banner') {
    e.preventDefault();
    e.stopPropagation();
    AppState.lastCancelledOrderBannerMessage = '';
    AppState.lastCancelledOrderNumber = '';
    const b = document.getElementById('customer-cancelled-order-banner');
    if (b) b.remove();
    return;
  }

  if (action === 'confirm-cancel-order') {
    e.preventDefault();
    e.stopPropagation();
    const orderId = target.getAttribute('data-order-id') || '';
    if (!orderId) return;
    const reasonInp = document.getElementById('cancel-unpaid-reason-input');
    const errBox = document.getElementById('cancel-unpaid-error-box');
    const reason = reasonInp && reasonInp.value.trim()
      ? reasonInp.value.trim()
      : 'Cancelado pela cliente antes do pagamento.';
    target.disabled = true;
    target.textContent = 'Cancelando pedido...';
    if (errBox) errBox.style.display = 'none';

    const headers = { 'Content-Type': 'application/json' };
    if (AppState.currentCustomer && AppState.currentCustomer.token) {
      headers['Authorization'] = 'Bearer ' + AppState.currentCustomer.token;
    }

    try {
      const res = await fetch(apiBase + '/api/orders/' + encodeURIComponent(orderId) + '/cancel', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerId: AppState.currentCustomer ? AppState.currentCustomer.id : '',
          email: AppState.currentCustomer ? AppState.currentCustomer.email : '',
          reason
        })
      });
      const data = await res.json();

      // Item 4: Proteção contra pagamento simultâneo ao cancelamento
      if (res.status === 409 && data && data.alreadyPaid) {
        closeCancelUnpaidOrderModalV6();
        await loadDatabase();
        renderMainView();
        showToast(data.error || 'O pagamento deste pedido já foi confirmado! Você pode abrir uma solicitação de cancelamento de pedido pago.', 'warning');
        if (data.canRequestPaidCancellation) {
          const ord = (AppState.db.orders || []).find((o) => o && o.id === orderId);
          openPaidCancelRequestModalV6(orderId, ord ? ord.orderNumber : '');
        }
        return;
      }

      if (!res.ok || !data || !data.ok) {
        const msg = (data && data.error) || 'Não foi possível cancelar este pedido.';
        if (errBox) {
          errBox.textContent = msg;
          errBox.style.display = 'block';
        }
        target.disabled = false;
        target.textContent = 'Confirmar cancelamento';
        showToast(msg, 'danger');
        return;
      }

      stopPixPaymentPolling();
      closeCancelUnpaidOrderModalV6();
      const exactMsg = data.customerCancelMessage || CUSTOMER_CANCELLED_ORDER_EXACT_MSG;
      AppState.lastCancelledOrderBannerMessage = exactMsg;
      AppState.lastCancelledOrderNumber = (data.order && data.order.orderNumber) || '';
      if (AppState.lastCreatedOrder && AppState.lastCreatedOrder.id === orderId) {
        AppState.lastCreatedOrder = data.order;
      }
      await loadDatabase();
      renderMainView();
      const detailModal = document.getElementById('order-detail-modal');
      if (detailModal && detailModal.classList.contains('open')) {
        openOrderDetailModal(orderId);
      }
      showToast(exactMsg, 'success');
    } catch (err) {
      target.disabled = false;
      target.textContent = 'Confirmar cancelamento';
      showToast('Erro de conexão ao cancelar o pedido.', 'danger');
    }
    return;
  }

  if (action === 'open-paid-cancel-request-modal') {
    e.preventDefault();
    e.stopPropagation();
    const orderId = target.getAttribute('data-order-id') || '';
    const orderNum = target.getAttribute('data-order-number') || '';
    openPaidCancelRequestModalV6(orderId, orderNum);
    return;
  }

  if (action === 'close-paid-cancel-request-modal') {
    e.preventDefault();
    e.stopPropagation();
    closePaidCancelRequestModalV6();
    return;
  }

  if (action === 'open-delete-account-modal') {
    e.preventDefault();
    e.stopPropagation();
    openDeleteAccountModalV6();
    return;
  }

  if (action === 'close-delete-account-modal') {
    e.preventDefault();
    e.stopPropagation();
    closeDeleteAccountModalV6();
    return;
  }
}, true);

document.addEventListener('submit', async (e) => {
  const form = e.target;
  if (!form || !form.id) return;
  const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';

  if (form.id === 'customer-paid-cancel-request-form') {
    e.preventDefault();
    const orderId = (document.getElementById('paid-cancel-order-id-input') || {}).value || '';
    const reasonEl = document.getElementById('paid-cancel-reason-input');
    const errBox = document.getElementById('paid-cancel-error-box');
    const submitBtn = document.getElementById('btn-submit-paid-cancel-request');
    const reason = String((reasonEl && reasonEl.value) || '').trim();
    if (errBox) errBox.style.display = 'none';

    if (reason.length < 5) {
      if (errBox) {
        errBox.textContent = 'Por favor, informe o motivo da solicitação de cancelamento (mínimo de 5 caracteres).';
        errBox.style.display = 'block';
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';
    }

    const headers = { 'Content-Type': 'application/json' };
    if (AppState.currentCustomer && AppState.currentCustomer.token) {
      headers['Authorization'] = 'Bearer ' + AppState.currentCustomer.token;
    }

    try {
      const res = await fetch(apiBase + '/api/orders/' + encodeURIComponent(orderId) + '/request-cancellation', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerId: AppState.currentCustomer ? AppState.currentCustomer.id : '',
          email: AppState.currentCustomer ? AppState.currentCustomer.email : '',
          reason
        })
      });
      const data = await res.json();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar solicitação';
      }
      if (!res.ok || !data || !data.ok) {
        const msg = (data && data.error) || 'Não foi possível registrar a solicitação.';
        if (errBox) {
          errBox.textContent = msg;
          errBox.style.display = 'block';
        }
        showToast(msg, 'danger');
        return;
      }
      closePaidCancelRequestModalV6();
      await loadDatabase();
      renderMainView();
      const detailModal = document.getElementById('order-detail-modal');
      if (detailModal && detailModal.classList.contains('open')) {
        openOrderDetailModal(orderId);
      }
      showToast(data.message || 'Solicitação de cancelamento enviada para análise da loja!', 'success');
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar solicitação';
      }
      showToast('Erro de conexão ao enviar solicitação.', 'danger');
    }
    return;
  }

  if (form.id === 'customer-delete-account-form') {
    e.preventDefault();
    const pwdEl = document.getElementById('delete-account-password-input');
    const reasonEl = document.getElementById('delete-account-reason-input');
    const chkEl = document.getElementById('delete-account-confirm-checkbox');
    const errBox = document.getElementById('delete-account-error-box');
    const submitBtn = document.getElementById('btn-confirm-delete-account');
    if (errBox) errBox.style.display = 'none';

    const password = String((pwdEl && pwdEl.value) || '');
    const reason = String((reasonEl && reasonEl.value) || '').trim();
    const confirmed = Boolean(chkEl && chkEl.checked);

    if (!confirmed) {
      if (errBox) {
        errBox.textContent = 'Marque a caixa de confirmação para declarar ciência sobre a exclusão da conta.';
        errBox.style.display = 'block';
      }
      return;
    }
    if (!password) {
      if (errBox) {
        errBox.textContent = 'Informe sua senha atual para confirmar a exclusão.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processando...';
    }

    const headers = { 'Content-Type': 'application/json' };
    if (AppState.currentCustomer && AppState.currentCustomer.token) {
      headers['Authorization'] = 'Bearer ' + AppState.currentCustomer.token;
    }

    try {
      const res = await fetch(apiBase + '/api/customer/delete-account', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerId: AppState.currentCustomer ? AppState.currentCustomer.id : '',
          email: AppState.currentCustomer ? AppState.currentCustomer.email : '',
          password,
          reason,
          confirmDeletion: true
        })
      });
      const data = await res.json();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirmar exclusão da minha conta';
      }
      if (!res.ok || !data || !data.ok) {
        const msg = (data && data.error) || 'Não foi possível concluir a solicitação de exclusão.';
        if (errBox) {
          errBox.textContent = msg;
          errBox.style.display = 'block';
        }
        showToast(msg, 'danger');
        return;
      }

      closeDeleteAccountModalV6();
      if (data.mode === 'deletion_requested_pending_orders') {
        if (AppState.currentCustomer) {
          AppState.currentCustomer.accountStatus = 'deletion_requested';
          AppState.currentCustomer.deletionRequestedAt = new Date().toISOString();
          localStorage.setItem(STORAGE_KEY_CUSTOMER_SESSION, JSON.stringify(AppState.currentCustomer));
        }
        await loadDatabase();
        renderMainView();
        showToast(data.message, 'warning');
      } else {
        AppState.currentCustomer = null;
        AppState.cart = [];
        saveCart();
        try {
          localStorage.removeItem(STORAGE_KEY_CUSTOMER_SESSION);
        } catch (err) {}
        await loadDatabase();
        updateHeaderCounters();
        navigateTo('home');
        showToast(data.message || 'Sua conta foi excluída e seus dados pessoais foram anonimizados.', 'success');
      }
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirmar exclusão da minha conta';
      }
      showToast('Erro de conexão ao processar exclusão da conta.', 'danger');
    }
  }
});

setTimeout(() => {
  ensureV6CustomerModals();
  syncAdminAndAuthBodyStateV6();
  enhanceOrderViewsV6();
}, 30);

// ============================================================================
// TELEMETRIA DE PRIMEIRA PARTE — ANÁLISE DA LOJA (LGPD SAFE, SEM FINGERPRINTING)
// ============================================================================
const STORAGE_KEY_VISITOR_ID = 'by_angely_vid_v1';
const STORAGE_KEY_SESSION_ID = 'by_angely_sid_v1';
const STORAGE_KEY_SESSION_TS = 'by_angely_sid_ts_v1';
const STORAGE_KEY_ANALYTICS_CONSENT = 'by_angely_analytics_consent_v1';

function getOrCreateVisitorId() {
  try {
    let vid = localStorage.getItem(STORAGE_KEY_VISITOR_ID);
    if (!vid) {
      vid = 'vis_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(STORAGE_KEY_VISITOR_ID, vid);
    }
    return vid;
  } catch (_e) {
    return 'vis_mem_' + Date.now().toString(36);
  }
}

function getOrCreateSessionId() {
  const now = Date.now();
  try {
    let sid = sessionStorage.getItem(STORAGE_KEY_SESSION_ID);
    const lastTs = Number(sessionStorage.getItem(STORAGE_KEY_SESSION_TS) || 0);
    // Janela de inatividade de 30 minutos para sessão
    if (!sid || (lastTs > 0 && now - lastTs > 30 * 60 * 1000)) {
      sid = 'ses_' + now.toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(STORAGE_KEY_SESSION_ID, sid);
    }
    sessionStorage.setItem(STORAGE_KEY_SESSION_TS, String(now));
    return sid;
  } catch (_e) {
    return 'ses_mem_' + Math.floor(now / 1800000);
  }
}

function getUrlUtmParams() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    return {
      utmSource: params.get('utm_source') || '',
      utmMedium: params.get('utm_medium') || '',
      utmCampaign: params.get('utm_campaign') || '',
      utmTerm: params.get('utm_term') || '',
      utmContent: params.get('utm_content') || ''
    };
  } catch (_e) {
    return { utmSource: '', utmMedium: '', utmCampaign: '', utmTerm: '', utmContent: '' };
  }
}

function sendAnalyticsEvent(type, extra = {}) {
  try {
    // Não rastreia navegação interna do próprio painel administrativo como visita de cliente
    if (AppState.currentView === 'admin' && !extra.forceTrackInAdmin) return;
    if (localStorage.getItem(STORAGE_KEY_ANALYTICS_CONSENT) === 'declined') return;

    const visitorId = getOrCreateVisitorId();
    const sessionId = getOrCreateSessionId();
    const utm = getUrlUtmParams();
    const cust = AppState.currentCustomer;
    const defaultAddr = cust && Array.isArray(cust.addresses) && cust.addresses[0] ? cust.addresses[0] : null;
    const cartTotal = Array.isArray(AppState.cart)
      ? AppState.cart.reduce((acc, it) => {
          const p = (AppState.db.products || []).find((pr) => pr.id === it.productId);
          const price = p ? getEffectivePrice(p) : Number(it.unitPrice || 0);
          return acc + price * (Number(it.quantity) || 1);
        }, 0)
      : 0;

    const payload = {
      type,
      visitorId,
      sessionId,
      isAuthenticated: Boolean(cust && cust.id),
      customerId: cust && cust.id ? cust.id : undefined,
      page: extra.page || AppState.currentView || 'home',
      referrer: document.referrer || '',
      userAgent: navigator.userAgent || '',
      screen: window.screen ? `${window.screen.width}x${window.screen.height}` : '',
      timezone: (Intl && Intl.DateTimeFormat && Intl.DateTimeFormat().resolvedOptions().timeZone) || 'America/Sao_Paulo',
      state: extra.state || (defaultAddr && defaultAddr.state) || undefined,
      city: extra.city || (defaultAddr && defaultAddr.city) || undefined,
      cartTotal: Number(cartTotal.toFixed(2)),
      ...utm,
      ...extra
    };

    const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';
    fetch(apiBase + '/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {});
  } catch (_err) {}
}

window.ByAngelyAnalytics = {
  track: sendAnalyticsEvent,
  getVisitorId: getOrCreateVisitorId,
  getSessionId: getOrCreateSessionId
};

// Intercepta abertura de detalhes de produto (product_view / product_detail_click)
const _origOpenProductModalAnalytics = openProductModal;
openProductModal = function (productId) {
  _origOpenProductModalAnalytics(productId);
  const prod = (AppState.db.products || []).find((p) => p && p.id === productId);
  if (prod) {
    sendAnalyticsEvent('product_view', {
      productId: prod.id,
      productName: prod.name,
      category: prod.categoryName || prod.category || '',
      price: getEffectivePrice(prod)
    });
  }
};

// Intercepta adição à sacola (add_to_cart)
const _origAddToCartAnalytics = addToCart;
addToCart = function (productId, size, color, quantity = 1, options = {}) {
  const beforeLen = Array.isArray(AppState.cart)
    ? AppState.cart.reduce((a, b) => a + (Number(b.quantity) || 0), 0)
    : 0;
  const added = _origAddToCartAnalytics(productId, size, color, quantity, options);
  const afterLen = Array.isArray(AppState.cart)
    ? AppState.cart.reduce((a, b) => a + (Number(b.quantity) || 0), 0)
    : 0;
  if (afterLen > beforeLen) {
    const prod = (AppState.db.products || []).find((p) => p && p.id === productId);
    if (prod) {
      sendAnalyticsEvent('add_to_cart', {
        productId: prod.id,
        productName: prod.name,
        category: prod.categoryName || prod.category || '',
        quantity: afterLen - beforeLen,
        price: getEffectivePrice(prod)
      });
    }
  }
  return added;
};

// Intercepta remoção da sacola (remove_from_cart)
if (typeof removeFromCart === 'function') {
  const _origRemoveFromCartAnalytics = removeFromCart;
  removeFromCart = function (index) {
    const item = AppState.cart && AppState.cart[index];
    const prodId = item ? item.productId : '';
    _origRemoveFromCartAnalytics(index);
    if (prodId) {
      sendAnalyticsEvent('remove_from_cart', { productId: prodId });
    }
  };
}

// Intercepta favoritos (wishlist_add)
if (typeof toggleWishlist === 'function') {
  const _origToggleWishlistAnalytics = toggleWishlist;
  toggleWishlist = function (productId) {
    const wasFav = AppState.wishlist.includes(productId);
    _origToggleWishlistAnalytics(productId);
    if (!wasFav && AppState.wishlist.includes(productId)) {
      const prod = (AppState.db.products || []).find((p) => p && p.id === productId);
      sendAnalyticsEvent('wishlist_add', {
        productId,
        productName: prod ? prod.name : '',
        category: prod ? (prod.categoryName || prod.category || '') : ''
      });
    }
  };
}

// Intercepta mudanças de tela (page_view e begin_checkout)
const _origNavigateToAnalytics = navigateTo;
navigateTo = function (view, options = {}) {
  const prevView = AppState.currentView;
  _origNavigateToAnalytics(view, options);
  if (AppState.currentView && AppState.currentView !== 'admin') {
    if (AppState.currentView !== prevView) {
      sendAnalyticsEvent('page_view', { page: AppState.currentView });
    }
    if (AppState.currentView === 'checkout') {
      sendAnalyticsEvent('begin_checkout', {
        page: 'checkout',
        stage: 'Iniciou a finalização da compra (Checkout)'
      });
    }
  }
};
window.ByAngelyApp.navigateTo = navigateTo;

// Monitora buscas no catálogo, filtros, categorias e compartilhamento
let _searchDebounceTimer = null;
document.addEventListener('input', (e) => {
  const t = e.target;
  if (!t) return;
  if (t.id === 'filter-search' || t.id === 'catalog-search-input' || t.id === 'header-search-input') {
    clearTimeout(_searchDebounceTimer);
    const q = String(t.value || '').trim();
    if (q.length < 2) return;
    _searchDebounceTimer = setTimeout(() => {
      const matches = (AppState.db.products || []).filter((p) => {
        if (!p || p.status === 'draft') return false;
        const hay = `${p.name || ''} ${p.categoryName || ''} ${p.category || ''} ${p.description || ''} ${p.sku || ''}`.toLowerCase();
        return hay.includes(q.toLowerCase());
      });
      sendAnalyticsEvent('search', {
        query: q,
        resultsCount: matches.length
      });
    }, 650);
  }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (!t) return;
  if ((t.id === 'filter-size-select' || t.id === 'drawer-filter-size') && t.value && t.value !== 'all') {
    sendAnalyticsEvent('filter_use', { filterType: 'Tamanho', filterValue: t.value });
  } else if ((t.id === 'filter-color-select' || t.id === 'drawer-filter-color') && t.value && t.value !== 'all') {
    sendAnalyticsEvent('filter_use', { filterType: 'Cor', filterValue: t.value });
  } else if ((t.id === 'filter-sort-select' || t.id === 'drawer-filter-sort') && t.value) {
    sendAnalyticsEvent('filter_use', { filterType: 'Ordenação', filterValue: t.value });
  } else if (t.id === 'drawer-filter-category' && t.value && t.value !== 'all') {
    sendAnalyticsEvent('category_access', { category: t.value });
  } else if (t.id === 'drawer-filter-style' && t.value && t.value !== 'all') {
    sendAnalyticsEvent('filter_use', { filterType: 'Estilo', filterValue: t.value });
  } else if (t.id === 'drawer-filter-price' && t.value && t.value !== 'all') {
    sendAnalyticsEvent('filter_use', { filterType: 'Faixa de Preço', filterValue: t.value });
  } else if (t.name === 'shippingMethod') {
    sendAnalyticsEvent('checkout_step', { stage: 'Seleção de entrega no checkout' });
  } else if (t.name === 'paymentMethod') {
    sendAnalyticsEvent('checkout_step', { stage: 'Seleção de forma de pagamento (' + t.value + ')' });
  }
});

document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action], #pdp-whatsapp-product-link');
  if (!target) return;
  if (target.id === 'pdp-whatsapp-product-link') {
    const pid = AppState.activeProductModal && AppState.activeProductModal.productId;
    const prod = (AppState.db.products || []).find((p) => p && p.id === pid);
    if (prod) {
      sendAnalyticsEvent('product_share', {
        productId: prod.id,
        productName: prod.name,
        category: prod.categoryName || prod.category || ''
      });
    }
    return;
  }
  const act = target.getAttribute('data-action');
  if (act === 'filter-category') {
    const cat = target.getAttribute('data-category') || '';
    if (cat && cat !== 'all') {
      sendAnalyticsEvent('category_access', { category: cat });
    }
  } else if (act === 'share-product') {
    const pid = target.getAttribute('data-product-id') || '';
    const prod = (AppState.db.products || []).find((p) => p && p.id === pid);
    sendAnalyticsEvent('product_share', {
      productId: pid,
      productName: prod ? prod.name : '',
      category: prod ? (prod.categoryName || prod.category || '') : ''
    });
  }
});

// Disparo inicial de visita à loja (protegido por sessionStorage para não duplicar em F5)
setTimeout(() => {
  try {
    if (AppState.currentView === 'admin') return;
    const sid = getOrCreateSessionId();
    const visitKey = 'by_angely_visit_logged_' + sid;
    if (!sessionStorage.getItem(visitKey)) {
      sessionStorage.setItem(visitKey, '1');
      sendAnalyticsEvent('store_visit', { page: AppState.currentView || 'home' });
    }
    const pvKey = 'by_angely_last_pv_' + sid;
    const currPage = AppState.currentView || 'home';
    if (sessionStorage.getItem(pvKey) !== currPage) {
      sessionStorage.setItem(pvKey, currPage);
      sendAnalyticsEvent('page_view', { page: currPage });
    }
  } catch (_e) {}
}, 250);
})();
