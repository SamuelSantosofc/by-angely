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

  // Ícones SVG Oficiais (Instagram, WhatsApp, E-mail)
  const OFFICIAL_ICONS = {
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
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
      const rec = String(pay.pix.recipientName || '').trim();
      if (key.length < 3 || key.toLowerCase().includes('a confirmar') || rec.length < 2 || rec.toLowerCase().includes('a confirmar')) {
        return false;
      }
      const kType = String(pay.pix.keyType || 'telefone').toLowerCase();
      const digits = key.replace(/\D/g, '');
      if (kType === 'cnpj' && digits.length !== 14) return false;
      if (kType === 'cpf' && digits.length !== 11) return false;
      if (kType === 'email' && !key.includes('@')) return false;
      if (kType === 'telefone' && (digits.length < 10 || digits.length > 14)) return false;
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
      const rec = String(pay.pix.recipientName || '').trim();
      const kType = String(pay.pix.keyType || 'telefone').toLowerCase();
      const digits = key.replace(/\D/g, '');
      if (!key || key.toLowerCase().includes('a confirmar') || !rec || rec.toLowerCase().includes('a confirmar')) {
        return { stateCode: 'pending', badgeClass: 'pending', label: 'Aguardando configuração', detail: 'Preencha a chave Pix e o nome do recebedor.' };
      }
      if (
        (kType === 'cnpj' && digits.length !== 14) ||
        (kType === 'cpf' && digits.length !== 11) ||
        (kType === 'email' && !key.includes('@')) ||
        (kType === 'telefone' && (digits.length < 10 || digits.length > 14))
      ) {
        return {
          stateCode: 'error',
          badgeClass: 'danger',
          label: 'Erro na integração (Tipo de chave incompatível)',
          detail: `O tipo selecionado é "${kType.toUpperCase()}", mas o valor informado ("${key}") não corresponde a esse formato.`
        };
      }
      if (pay.pix.pspWebhookConfigured) {
        return { stateCode: 'validated', badgeClass: 'confirmed', label: 'Integração validada', detail: 'QR Code EMV + Webhook automático ativo.' };
      }
      return {
        stateCode: 'configured',
        badgeClass: 'info',
        label: 'Configurado (Conferência manual)',
        detail: `Chave ${kType.toUpperCase()} válida no padrão EMV Banco Central.`
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
    if (type === 'success') item.style.borderLeftColor = '#2E6F52';
    if (type === 'warning') item.style.borderLeftColor = '#C47A2C';
    if (type === 'danger') item.style.borderLeftColor = '#B83A3A';
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
      const validVariations = Array.isArray(p.variations) && p.variations.length > 0 && getTotalProductStock(p) > 0
        ? p.variations
        : (seedMatch && seedMatch.variations ? JSON.parse(JSON.stringify(seedMatch.variations)) : [{ size: 'M', color: 'Padrão', stock: 4 }]);
      const validSizes = Array.isArray(p.sizes) && p.sizes.length > 0
        ? p.sizes
        : (seedMatch && seedMatch.sizes ? [...seedMatch.sizes] : ['P', 'M', 'G']);
      const validColors = Array.isArray(p.colors) && p.colors.length > 0
        ? p.colors
        : (seedMatch && seedMatch.colors ? JSON.parse(JSON.stringify(seedMatch.colors)) : [{ name: 'Padrão', hex: '#806044' }]);

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

    // Normaliza configurações de venda e pagamento preservando escolhas salvas pela proprietária (paymentConfigVersion === 2)
    const seedPay = seed.paymentSettings || {};
    const rawPay = db.paymentSettings || {};
    const isMigratedV2 = rawPay.paymentConfigVersion === 2;

    const rawPixKey = (rawPay.pix && rawPay.pix.pixKey && !String(rawPay.pix.pixKey).toLowerCase().includes('a confirmar'))
      ? rawPay.pix.pixKey
      : '+5528999871458';
    let normalizedPixKeyType = (rawPay.pix && rawPay.pix.keyType) || 'telefone';
    if (String(rawPixKey).includes('5528999871458') && normalizedPixKeyType === 'cnpj') {
      normalizedPixKeyType = 'telefone';
    }

    const rawCreditLink = (rawPay.creditCard && rawPay.creditCard.externalPaymentLink) || '';
    const rawDebitLink = (rawPay.debitCard && rawPay.debitCard.externalPaymentLink) || '';

    db.paymentSettings = {
      paymentConfigVersion: 2,
      whatsapp: {
        ...(seedPay.whatsapp || {}),
        ...(rawPay.whatsapp || {}),
        enabled: isMigratedV2 && rawPay.whatsapp && typeof rawPay.whatsapp.enabled === 'boolean'
          ? rawPay.whatsapp.enabled
          : true
      },
      pix: {
        ...(seedPay.pix || {}),
        ...(rawPay.pix || {}),
        keyType: normalizedPixKeyType,
        pixKey: rawPixKey,
        recipientName: (rawPay.pix && rawPay.pix.recipientName && !String(rawPay.pix.recipientName).toLowerCase().includes('a confirmar'))
          ? rawPay.pix.recipientName
          : 'BY ANGELY',
        enabled: isMigratedV2 && rawPay.pix && typeof rawPay.pix.enabled === 'boolean'
          ? rawPay.pix.enabled
          : false
      },
      creditCard: {
        ...(seedPay.creditCard || {}),
        ...(rawPay.creditCard || {}),
        providerName: (rawPay.creditCard && rawPay.creditCard.providerName && !String(rawPay.creditCard.providerName).toLowerCase().includes('a confirmar'))
          ? rawPay.creditCard.providerName
          : '',
        externalPaymentLink: rawCreditLink === 'https://wa.me/5528999871458' ? '' : rawCreditLink,
        enabled: isMigratedV2 && rawPay.creditCard && typeof rawPay.creditCard.enabled === 'boolean'
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
        enabled: isMigratedV2 && rawPay.debitCard && typeof rawPay.debitCard.enabled === 'boolean'
          ? rawPay.debitCard.enabled
          : false
      },
      payOnPickup: {
        ...(seedPay.payOnPickup || {}),
        ...(rawPay.payOnPickup || {}),
        enabled: isMigratedV2 && rawPay.payOnPickup && typeof rawPay.payOnPickup.enabled === 'boolean'
          ? rawPay.payOnPickup.enabled
          : false
      }
    };

    return db;
  }

  // =========================================================================
  // PERSISTÊNCIA E SINCRONIZAÇÃO (SUPABASE + RENDER BACKEND + LOCALSTORAGE)
  // =========================================================================
  async function loadDatabase() {
    const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';
    let supaState = null;
    let serverState = null;
    let localState = null;

    try {
      const saved = localStorage.getItem(STORAGE_KEY_DB);
      if (saved) localState = JSON.parse(saved);
    } catch (e) {}

    // Busca em paralelo do Supabase e da API do servidor para escolher o estado mais recente e íntegro
    const tasks = [];
    if (window.ByAngelyCloud && window.ByAngelyCloud.fetchStateFromSupabase) {
      tasks.push(
        window.ByAngelyCloud.fetchStateFromSupabase()
          .then((st) => { supaState = st; })
          .catch(() => {})
      );
    }
    tasks.push(
      fetch(apiBase + '/api/state', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((st) => { serverState = st; })
        .catch(() => {})
    );

    await Promise.allSettled(tasks);

    // Determina a melhor base combinando produtos reais cadastrados pela proprietária
    const candidates = [serverState, supaState, localState].filter((c) => c && c.storeSettings);
    let chosen = null;
    if (candidates.length > 0) {
      candidates.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      chosen = candidates[0];

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
    const neededV3Repair = Boolean(supaState && !supaState.catalogDataRepairV3);

    AppState.db = normalizeAndRepairDatabase(chosen);

    try {
      localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(AppState.db));
    } catch (e) {}

    // Se o estado na nuvem estava com categorias sem imagem, dados fake ou produtos sem reparo V3, sincroniza imediatamente
    if (hadMissingCatImages || hadFakeOrders || neededV3Repair || !supaState) {
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

    const syncPromises = [];
    if (window.ByAngelyCloud && window.ByAngelyCloud.saveStateToSupabase) {
      syncPromises.push(window.ByAngelyCloud.saveStateToSupabase(AppState.db).catch(() => {}));
    }
    const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';
    syncPromises.push(
      fetch(apiBase + '/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(AppState.db)
      }).catch(() => {})
    );

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
        <button type="button" class="category-pill-link ${AppState.currentView === 'catalog' && AppState.filters.availability === 'promo' ? 'active' : ''}" data-action="filter-promo" style="color: var(--accent-gold);">
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
        <p style="font-size:0.83rem;color:#C4BCB0;margin-bottom:10px;">${escapeHtml(settings.city)} - ${escapeHtml(settings.state)}, Brasil</p>
        ${isAdminLogged ? `
          <div style="padding:8px 10px;background:rgba(255,255,255,0.06);border-radius:6px;margin-bottom:10px;font-size:0.76rem;color:#D6CFC5;">
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
    const firstImage = (product.media && product.media.find((m) => m.type === 'image' && m.url)) || (product.media && product.media[0]) || {
      url: fallbackUrl,
      alt: product.name
    };
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
          <img src="${escapeHtml(firstImage.url)}" alt="${escapeHtml(firstImage.alt || product.name)}" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(fallbackUrl)}';" />
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
                <button type="button" data-action="go-policies" data-tab="references" style="color:#E5DACB;text-decoration:underline;font-size:0.7rem;">Ver Licença</button>
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
                  <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#292522;color:#FFF;font-size:0.72rem;font-weight:700;">▶ VÍDEO</div>
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

    const available = getVariationStock(product, size, color);
    if (available <= 0) {
      showToast('Esta variação de tamanho e cor está sem estoque.', 'danger');
      return false;
    }

    const key = `${productId}__${size}__${color}`;
    const existing = AppState.cart.find((item) => item.key === key);

    if (existing) {
      if (existing.quantity + qty > available) {
        showToast(`Estoque máximo atingido (${available} un. disponíveis para ${size} / ${color}).`, 'warning');
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
      <div>
        ${AppState.cart.map((item) => {
          const itemSubtotal = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1);
          return `
            <div class="cart-item-card">
              <img src="${escapeHtml(item.imageUrl || CATEGORY_COVER_FALLBACKS.vestidos)}" alt="${escapeHtml(item.name)}" class="cart-item-thumb" onerror="this.onerror=null;this.src='${escapeHtml(CATEGORY_COVER_FALLBACKS.vestidos)}';" />
              <div style="min-width:0;">
                <strong style="font-size:0.88rem;display:block;line-height:1.28;color:var(--text-primary);">${escapeHtml(item.name)}</strong>
                <span style="font-size:0.76rem;color:var(--text-secondary);display:block;margin:3px 0;">
                  Tam: <strong>${escapeHtml(item.size)}</strong> • Cor: <strong>${escapeHtml(item.color)}</strong>
                </span>
                <div style="font-size:0.76rem;color:var(--text-muted);margin-bottom:6px;">
                  Unitário: ${formatBRL(item.unitPrice)} • <strong style="color:var(--accent-brown);">Subtotal: ${formatBRL(itemSubtotal)}</strong>
                </div>
                <div class="qty-stepper" style="height:32px;">
                  <button type="button" style="width:30px;height:30px;font-size:0.9rem;" data-action="cart-qty-dec" data-key="${escapeHtml(item.key)}" aria-label="Diminuir quantidade">−</button>
                  <span style="min-width:26px;font-size:0.82rem;">${item.quantity}</span>
                  <button type="button" style="width:30px;height:30px;font-size:0.9rem;" data-action="cart-qty-inc" data-key="${escapeHtml(item.key)}" aria-label="Aumentar quantidade">+</button>
                </div>
              </div>
              <button type="button" class="btn btn-subtle btn-sm" style="min-height:32px;padding:4px 8px;" data-action="cart-remove" data-key="${escapeHtml(item.key)}" aria-label="Remover item" title="Remover item">✕</button>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Cupom de Desconto -->
      <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border-subtle);">
        <label for="cart-coupon-input" style="display:block;font-size:0.74rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Cupom de Desconto</label>
        <div style="display:flex;gap:8px;">
          <input type="text" id="cart-coupon-input" class="form-control" placeholder="Ex.: BEMVINDA10" value="${AppState.appliedCoupon ? escapeHtml(AppState.appliedCoupon.code) : ''}" style="min-height:40px;" />
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
        <label for="cart-shipping-select" style="display:block;font-size:0.74rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Modalidade de Entrega / Retirada</label>
        <select id="cart-shipping-select" class="form-control" style="min-height:40px;">
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

    const activePayOpts = getAvailableCheckoutPaymentOptions(AppState.db.paymentSettings);
    const isOnlyWhatsapp = activePayOpts.length === 1 && activePayOpts[0].id === 'whatsapp';

    footerEl.innerHTML = `
      <div style="font-size:0.86rem;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span>Subtotal dos itens:</span>
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
        <div style="display:flex;justify-content:space-between;font-size:1.1rem;font-weight:700;padding-top:8px;border-top:1px solid var(--border-subtle);color:var(--text-primary);">
          <span>Total do Pedido:</span>
          <span>${formatBRL(totals.total)}</span>
        </div>
      </div>
      <button type="button" class="btn btn-primary btn-block" data-action="proceed-to-checkout" id="btn-cart-proceed-checkout">
        ${isOnlyWhatsapp ? `${OFFICIAL_ICONS.whatsapp} <span>Finalizar Pedido pelo WhatsApp</span>` : 'Finalizar Compra com Segurança'}
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
                  ${AppState.cart.map((item) => `
                    <div style="display:flex;justify-content:space-between;font-size:0.84rem;padding-bottom:8px;border-bottom:1px solid var(--border-subtle);">
                      <div>
                        <strong>${escapeHtml(item.name)}</strong>
                        <div style="font-size:0.75rem;color:var(--text-secondary);">Tam: ${escapeHtml(item.size)} | Cor: ${escapeHtml(item.color)} | Qtd: ${item.quantity}x (${formatBRL(item.unitPrice)})</div>
                      </div>
                      <span style="font-weight:600;white-space:nowrap;">${formatBRL(item.unitPrice * item.quantity)}</span>
                    </div>
                  `).join('')}
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

                <button type="submit" id="btn-submit-checkout" class="btn btn-primary btn-block" ${activePaymentOptions.length === 0 ? 'disabled' : ''}>
                  ${isWhatsappSelected
                    ? `${OFFICIAL_ICONS.whatsapp} <span>FINALIZAR PEDIDO PELO WHATSAPP</span>`
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

  
// =========================================================================
  // PATCH DE REESTRUTURAÇÃO DA SACOLA MOBILE E SANITIZAÇÃO DE TAMANHOS (V3.1)
  // =========================================================================
  Object.assign(OFFICIAL_ICONS, {
    instagram: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="width:18px;height:18px;flex-shrink:0;" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="width:18px;height:18px;flex-shrink:0;" aria-hidden="true"><path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.124.553 4.195 1.604 6.018L.099 23.541l5.631-1.477a11.986 11.986 0 006.301 1.787h.005c6.645 0 12.03-5.385 12.03-12.031 0-3.214-1.252-6.236-3.524-8.508C18.268 1.039 15.245 0 12.031 0zm6.564 17.243c-.277.781-1.613 1.491-2.238 1.588-.578.088-1.309.125-2.115-.131-.491-.156-1.119-.366-1.922-.712-3.379-1.459-5.586-4.863-5.755-5.088-.168-.225-1.375-1.829-1.375-3.489 0-1.66 0.869-2.476 1.178-2.813.309-.338.675-.422.9-.422.225 0 .45.003.647.012.208.01.486-.079.76.579.281.675.956 2.334 1.041 2.503.084.169.141.366.028.591-.113.225-.169.366-.338.563-.169.197-.355.441-.506.591-.169.169-.345.352-.148.69.197.338.874 1.442 1.877 2.337 1.29 1.15 2.378 1.506 2.716 1.675.338.169.534.141.731-.084.197-.225.844-.984 1.069-1.322.225-.338.45-.281.759-.169.309.113 1.969.928 2.306 1.097.338.169.563.253.647.394.084.141.084.816-.193 1.597z"/></svg>',
    email: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="width:18px;height:18px;flex-shrink:0;" aria-hidden="true"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>'
  });

  function isValidClothingSize(sz) {
    if (sz === null || sz === undefined) return false;
    const s = String(sz).trim();
    if (!s) return false;
    return !['0', '00', 'null', 'undefined', 'nan', '-', 'nenhum', 'n/a'].includes(s.toLowerCase());
  }

  function isValidColorName(clr) {
    if (clr === null || clr === undefined) return false;
    const s = String(clr).trim();
    if (!s) return false;
    return !['0', '00', 'null', 'undefined', 'nan', '-'].includes(s.toLowerCase());
  }

  function sanitizeCartItems() {
    if (AppState.db && Array.isArray(AppState.db.products)) {
      AppState.db.products.forEach((p) => {
        if (!p) return;
        const cleaned = Array.isArray(p.sizes) ? p.sizes.filter(isValidClothingSize) : [];
        p.sizes = cleaned.length > 0 ? cleaned : ['P', 'M', 'G'];
        if (Array.isArray(p.variations)) {
          p.variations.forEach((v) => {
            if (v && !isValidClothingSize(v.size)) v.size = p.sizes[0] || 'M';
            if (v && !isValidColorName(v.color)) v.color = (p.colors && p.colors[0] && p.colors[0].name) || 'Padrão';
          });
        }
      });
    }
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
      const newKey = item.productId + '__' + cleanSize + '__' + cleanColor;
      if (cleanSize !== item.size || cleanColor !== item.color || newKey !== item.key) {
        changed = true;
        return { ...item, size: cleanSize, color: cleanColor, key: newKey };
      }
      return item;
    });
    if (changed) saveCart();
  }

  function addToCart(productId, size, color, quantity = 1) {
    sanitizeCartItems();
    const qty = Math.max(1, Number(quantity) || 1);
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
    const key = productId + '__' + cleanSize + '__' + cleanColor;
    const existing = AppState.cart.find((item) => item.key === key);
    if (existing) {
      if (existing.quantity + qty > available) {
        showToast('Estoque máximo atingido (' + available + ' un. disponíveis).', 'warning');
        return false;
      }
      existing.quantity += qty;
    } else {
      const firstImg = (product.media || []).find((m) => m.type === 'image') || { url: '' };
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
        quantity: Math.min(qty, available)
      });
    }
    saveCart();
    updateGlobalChrome();
    renderCartDrawer();
    showToast('"' + product.name + '" adicionado à sacola!', 'success');
    return true;
  }

  function renderCartDrawer() {
    const bodyEl = document.getElementById('cart-drawer-body');
    const footerEl = document.getElementById('cart-drawer-footer');
    if (!bodyEl || !footerEl) return;
    sanitizeCartItems();
    if (AppState.cart.length === 0) {
      bodyEl.innerHTML = '<div class="cart-empty-state"><p class="cart-empty-title">Sua sacola está vazia</p><p class="cart-empty-sub">Adicione peças da coleção BY ANGÉLY para iniciar seu pedido.</p><button type="button" class="btn btn-primary btn-sm" data-action="close-cart-go-catalog">Explorar Peças</button></div>';
      footerEl.innerHTML = '';
      return;
    }
    const totals = calculateCartTotals();
    const shippingMethods = (AppState.db.shippingSettings.methods || []).filter((m) => m.enabled);
    bodyEl.innerHTML = '<div class="cart-items-list">' + AppState.cart.map((item) => {
      const itemSubtotal = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1);
      const metaParts = [];
      if (isValidClothingSize(item.size)) metaParts.push('Tamanho: <strong>' + escapeHtml(item.size) + '</strong>');
      if (isValidColorName(item.color)) metaParts.push('Cor: <strong>' + escapeHtml(item.color) + '</strong>');
      const metaHtml = metaParts.length > 0 ? '<div class="cart-item-meta">' + metaParts.join(' <span aria-hidden="true">•</span> ') + '</div>' : '';
      const imgUrl = escapeHtml(item.imageUrl || CATEGORY_COVER_FALLBACKS.vestidos);
      const fallbackUrl = escapeHtml(CATEGORY_COVER_FALLBACKS.vestidos);
      return '<article class="cart-item-card">' +
        '<img src="' + imgUrl + '" alt="' + escapeHtml(item.name) + '" class="cart-item-thumb" onerror="this.onerror=null;this.src=\'' + fallbackUrl + '\';" />' +
        '<div class="cart-item-info">' +
          '<strong class="cart-item-title">' + escapeHtml(item.name) + '</strong>' +
          metaHtml +
          '<div class="cart-item-prices"><span>Unitário: ' + formatBRL(item.unitPrice) + '</span><span aria-hidden="true">•</span><strong class="cart-item-subtotal">Subtotal: ' + formatBRL(itemSubtotal) + '</strong></div>' +
          '<div class="cart-item-actions-row">' +
            '<div class="qty-stepper cart-qty-stepper" role="group" aria-label="Quantidade de ' + escapeHtml(item.name) + '">' +
              '<button type="button" class="qty-stepper-btn" data-action="cart-qty-dec" data-key="' + escapeHtml(item.key) + '" aria-label="Diminuir quantidade">−</button>' +
              '<span class="qty-stepper-val">' + item.quantity + '</span>' +
              '<button type="button" class="qty-stepper-btn" data-action="cart-qty-inc" data-key="' + escapeHtml(item.key) + '" aria-label="Aumentar quantidade">+</button>' +
            '</div>' +
            '<button type="button" class="cart-item-remove-btn" data-action="cart-remove" data-key="' + escapeHtml(item.key) + '" aria-label="Remover ' + escapeHtml(item.name) + ' da sacola" title="Remover produto">' +
              '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
              '<span>Remover</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('') + '</div>' +
    '<div class="cart-section-box">' +
      '<label for="cart-coupon-input" class="cart-section-label">Cupom de Desconto</label>' +
      '<div class="cart-coupon-row">' +
        '<input type="text" id="cart-coupon-input" class="form-control cart-coupon-input" placeholder="Ex.: BEMVINDO10" value="' + (AppState.appliedCoupon ? escapeHtml(AppState.appliedCoupon.code) : '') + '" />' +
        '<button type="button" class="btn btn-outline btn-sm cart-coupon-btn" data-action="apply-coupon">Aplicar</button>' +
      '</div>' +
      (AppState.appliedCoupon ? '<p class="cart-coupon-feedback">✓ Cupom <strong>' + escapeHtml(AppState.appliedCoupon.code) + '</strong> aplicado (-' + formatBRL(totals.discount) + ')</p>' : '') +
    '</div>' +
    '<div class="cart-section-box">' +
      '<label for="cart-shipping-select" class="cart-section-label">Modalidade de Entrega / Retirada</label>' +
      '<select id="cart-shipping-select" class="form-control cart-shipping-select">' +
        shippingMethods.map((m) => '<option value="' + escapeHtml(m.id) + '" ' + (totals.shippingMethod && totals.shippingMethod.id === m.id ? 'selected' : '') + '>' + escapeHtml(m.name) + ' (' + (m.priceStatus === 'confirmed' ? (m.price === 0 ? 'Grátis' : formatBRL(m.price)) : 'A confirmar') + ')</option>').join('') +
      '</select>' +
      (totals.shippingMethod ? '<div class="cart-shipping-note"><span><strong>Status do frete:</strong> ' + (totals.shippingMethod.priceStatus === 'confirmed' ? (totals.shippingMethod.price === 0 ? 'Grátis' : formatBRL(totals.shippingMethod.price)) : 'Valor a confirmar') + '</span><span>' + escapeHtml(totals.shippingMethod.estimatedDays) + '</span></div>' : '') +
    '</div>';

    const activePayOpts = getAvailableCheckoutPaymentOptions();
    const isOnlyWhatsapp = activePayOpts.length === 1 && activePayOpts[0].id === 'whatsapp';
    footerEl.innerHTML =
      '<div class="cart-summary-list">' +
        '<div class="cart-summary-row"><span>Subtotal dos itens</span><strong>' + formatBRL(totals.subtotal) + '</strong></div>' +
        (totals.discount > 0 && AppState.appliedCoupon ? '<div class="cart-summary-row discount"><span>Desconto (' + escapeHtml(AppState.appliedCoupon.code) + ')</span><strong>-' + formatBRL(totals.discount) + '</strong></div>' : '') +
        '<div class="cart-summary-row"><span>Entrega</span><span>' + (totals.shippingMethod ? (totals.shippingMethod.priceStatus === 'confirmed' ? formatBRL(totals.shippingCost) : 'A confirmar pela proprietária') : 'A confirmar') + '</span></div>' +
        '<div class="cart-summary-total"><span>Total do Pedido</span><strong>' + formatBRL(totals.total) + '</strong></div>' +
      '</div>' +
      '<button type="button" class="btn btn-primary btn-block ' + (isOnlyWhatsapp ? 'btn-cart-whatsapp' : '') + '" data-action="proceed-to-checkout" id="btn-cart-proceed-checkout">' +
        (isOnlyWhatsapp ? OFFICIAL_ICONS.whatsapp + '<span>FINALIZAR PEDIDO PELO WHATSAPP</span>' : '<span>FINALIZAR COMPRA COM SEGURANÇA</span>') +
      '</button>';

    document.getElementById('cart-shipping-select')?.addEventListener('change', (e) => {
      AppState.selectedShippingMethodId = e.target.value;
      renderCartDrawer();
    });
  }

  window.ByAngelyApp.openCartDrawer = openCartDrawer;
  window.ByAngelyApp.renderCartDrawer = renderCartDrawer;
  window.ByAngelyApp.addToCart = addToCart;
  window.addEventListener('DOMContentLoaded', () => {
    sanitizeCartItems();
    setTimeout(sanitizeCartItems, 1200);

                          
const _origNormalizeAndRepairDatabase = typeof normalizeAndRepairDatabase === 'function' ? normalizeAndRepairDatabase : null;
if (_origNormalizeAndRepairDatabase) {
normalizeAndRepairDatabase = function (rawDb) {
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
const isPayV3 = repaired.paymentSettings.paymentConfigVersion >= 3;
repaired.paymentSettings.paymentConfigVersion = 3;
repaired.paymentSettings.pix = {
...(repaired.paymentSettings.pix || {}),
enabled: isPayV3 && typeof (repaired.paymentSettings.pix && repaired.paymentSettings.pix.enabled) === 'boolean'
? repaired.paymentSettings.pix.enabled
: true,
keyType: 'telefone',
pixKey: '+5528999871458',
recipientName: 'BY ANGELY',
recipientCity: 'ITAPERUNA',
txidPrefix: 'BYANGELY',
expirationMinutes: Math.max(1, Number(repaired.paymentSettings.pix && repaired.paymentSettings.pix.expirationMinutes) || 15),
confirmationMode: 'webhook_auto',
pspWebhookConfigured: true
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
searchBar.style.cssText = 'display:none;background:#F8F5F0;border-top:1px solid #E9DFD4;padding:12px 0;box-shadow:0 8px 20px rgba(41,37,34,0.06);';
searchBar.innerHTML =
'<div class="container" style="display:flex;align-items:center;gap:8px;max-width:740px;">' +
'<form id="header-search-form" style="display:flex;align-items:center;gap:8px;flex:1;margin:0;" onsubmit="return false;">' +
'<div style="position:relative;flex:1;display:flex;align-items:center;">' +
'<input type="search" id="header-search-input" class="form-control" placeholder="Buscar por vestido, conjunto, blusa, calça, cor ou código..." aria-label="Buscar produtos na loja" style="width:100%;height:42px;padding:0 36px 0 14px;border-radius:999px;border:1px solid #D5C7B8;background:#FFFFFF;font-size:0.9rem;color:#292522;" autocomplete="off" />' +
'<button type="button" id="header-search-clear" data-action="clear-header-search" aria-label="Limpar busca" title="Limpar texto" style="display:none;position:absolute;right:10px;background:none;border:none;color:#806044;font-size:1.1rem;cursor:pointer;padding:4px;line-height:1;">&times;</button>' +
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
<img src="${escapeHtml(hero.imageUrl || CATEGORY_COVER_FALLBACKS.vestidos)}" alt="${escapeHtml(hero.imageAlt || 'Coleção By Angély')}" onerror="this.onerror=null;this.src='${escapeHtml(CATEGORY_COVER_FALLBACKS.vestidos)}';" />
</div>
</div>
</section>
` : ''}
${vis.featured !== false ? `
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
<img src="${escapeHtml(imgUrl)}" alt="Categoria ${escapeHtml(cat.name)}" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(fbImg)}';" />
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
<section class="section-block bg-surface" aria-labelledby="sec-story-title">
<div class="container">
<div class="hero-grid" style="min-height:auto;">
<div class="hero-media-wrapper" style="aspect-ratio: 4 / 3.2;">
<img src="${escapeHtml(story.imageUrl || CATEGORY_COVER_FALLBACKS.conjuntos)}" alt="By Angély — Itaperuna, RJ" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(CATEGORY_COVER_FALLBACKS.conjuntos)}';" />
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
<img src="${escapeHtml(activeMedia.url)}" alt="${escapeHtml(activeMedia.alt || product.name)}" id="pdp-active-img" onerror="this.onerror=null;this.src='${escapeHtml(fallbackUrl)}';" />
<button type="button" class="pdp-zoom-btn" data-action="zoom-image" data-url="${escapeHtml(activeMedia.url)}" data-alt="${escapeHtml(activeMedia.alt || product.name)}">
Ampliar Imagem
</button>
`}
</div>
<div class="pdp-thumbs" role="tablist" aria-label="Galeria de fotos e vídeos do produto">
${mediaList.map((m, idx) => `
<button type="button" class="pdp-thumb-btn ${idx === state.mediaIndex ? 'active' : ''}" data-action="select-pdp-media" data-index="${idx}" aria-label="${m.type === 'video' ? 'Reproduzir vídeo' : 'Ver foto ' + (idx + 1)}">
${m.type === 'video' ? `
<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#292522;color:#FFF;font-size:0.72rem;font-weight:700;">▶ VÍDEO</div>
` : `
<img src="${escapeHtml(m.url)}" alt="Miniatura ${idx + 1}" onerror="this.onerror=null;this.src='${escapeHtml(fallbackUrl)}';" />
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
reviewForm.addEventListener('submit', (e) => {
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
AppState.db.reviews = AppState.db.reviews || [];
AppState.db.reviews.unshift({
id: 'rev-' + Date.now(),
productId: product.id,
productName: product.name,
customerId: AppState.currentCustomer.id,
customerName: AppState.currentCustomer.name,
customerEmail: AppState.currentCustomer.email,
rating: ratingNum,
comment: commentText,
status: 'approved',
date: new Date().toLocaleDateString('pt-BR'),
createdAt: new Date().toISOString(),
isDemo: false
});
saveDatabase('Nova avaliação (' + ratingNum + '★) enviada para ' + product.name);
renderProductModalContent();
showToast('Avaliação registrada com sucesso!', 'success');
});
}
}
function renderCheckoutView() {
if (AppState.lastCreatedOrder) {createdOrder.whatsappOrderUrl = getOrderWhatsappUrl(createdOrder);
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
const res = await fetch(`${apiBase}/api/orders/${encodeURIComponent(orderId)}/payment-status`, {
cache: 'no-store'
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
<div id="pix-approved-banner" style="background:#EDF7F1;border:1.5px solid #2E6F52;border-radius:12px;padding:22px;margin-bottom:22px;text-align:center;">
<div style="width:48px;height:48px;border-radius:50%;background:#2E6F52;color:#FFFFFF;display:inline-flex;align-items:center;justify-content:center;font-size:1.4rem;margin-bottom:10px;">✓</div>
<h2 style="font-family:var(--font-serif);font-size:1.65rem;color:#1E4D38;margin-bottom:8px;">
Pagamento confirmado! Seu pedido foi recebido pela BY ANGÉLY e está aguardando separação.
</h2>
<p style="font-size:0.9rem;color:#2E6F52;margin-bottom:0;">
O pagamento de <strong>${formatBRL(order.total)}</strong> foi reconhecido automaticamente. Não é necessário enviar comprovante.
</p>
</div>
` : ''}
<!-- Status Expirado / Cancelado Após 15 Minutos -->
${isExpiredOrCancelled ? `
<div id="pix-expired-banner" style="background:#FDF2F2;border:1.5px solid #B83A3A;border-radius:12px;padding:22px;margin-bottom:22px;text-align:center;">
<h2 style="font-family:var(--font-serif);font-size:1.55rem;color:#8E2626;margin-bottom:8px;">
${escapeHtml(meta.label)}
</h2>
<p style="font-size:0.9rem;color:#6E2828;margin-bottom:14px;">
${escapeHtml(meta.customerMessage)} As peças reservadas voltaram para o estoque disponível da loja.
</p>
<button type="button" class="btn btn-primary btn-sm" data-action="finish-order-go-catalog">Fazer Novo Pedido</button>
</div>
` : ''}
<!-- Pagamento via Pix Aguardando Confirmação (Com Cronômetro de 15 Minutos) -->
${isAwaitingPix && order.pixData ? `
<div id="pix-awaiting-box" style="background:var(--bg-primary);border:1px solid var(--border-strong);border-radius:12px;padding:22px;margin-bottom:22px;text-align:center;">
<div style="display:inline-flex;align-items:center;gap:10px;background:#FFF8EB;border:1px solid #E2B96B;color:#7A5211;padding:8px 16px;border-radius:999px;font-size:0.86rem;font-weight:600;margin-bottom:14px;">
<span>⏱️ Tempo restante para pagar:</span>
<strong data-pix-timer-for="${escapeHtml(order.id)}" id="pix-countdown-timer" style="font-family:monospace;font-size:1.1rem;color:#806044;">${formatCountdownMMSS(initialRemainingSec)}</strong>
<span style="font-size:0.76rem;opacity:0.85;">(Vence em ${formatDateBR(order.expiresAt)})</span>
</div>
<h2 style="font-family:var(--font-serif);font-size:1.65rem;margin-bottom:6px;">Escaneie o QR Code Pix (${formatBRL(order.total)})</h2>
<p style="font-size:0.86rem;color:var(--text-secondary);max-width:560px;margin:0 auto 14px;">
Abra o aplicativo do seu banco, escolha pagar via <strong>QR Code</strong> ou <strong>Pix Copia e Cola</strong>. A confirmação é <strong>100% automática</strong> nesta tela em poucos segundos após o pagamento!
</p>
<div class="pix-qr-box" style="margin:0 auto 14px;">
${qrSvg}
</div>
<div style="max-width:520px;margin:0 auto 16px;">
<label style="display:block;font-size:0.76rem;font-weight:700;text-transform:uppercase;margin-bottom:6px;">Código Pix Copia e Cola:</label>
<div style="display:flex;gap:8px;">
<input type="text" id="pix-copia-cola-input" class="form-control" readonly value="${escapeHtml(order.pixData.payload)}" style="font-family:monospace;font-size:0.78rem;" />
<button type="button" class="btn btn-primary btn-sm" data-action="copy-pix-code">Copiar Código</button>
</div>
</div>
<div style="max-width:520px;margin:0 auto 14px;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:8px;padding:12px;text-align:left;font-size:0.82rem;">
<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span><strong>Pedido:</strong> ${escapeHtml(order.orderNumber)}</span><span><strong>Valor Exato:</strong> ${formatBRL(order.total)}</span></div>
<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span><strong>Recebedor:</strong> ${escapeHtml(order.pixData.recipientName)}</span><span><strong>Chave:</strong> ${escapeHtml(order.pixData.pixKey)}</span></div>
<div><strong>Identificador da Cobrança:</strong> <code style="font-size:0.76rem;">${escapeHtml(order.pixData.chargeId || order.pixData.txid)}</code></div>
</div>
<div style="display:inline-flex;align-items:center;gap:8px;font-size:0.82rem;color:var(--accent-brown);font-weight:600;padding:8px 14px;background:rgba(128,96,68,0.08);border-radius:999px;">
<span>🔄 Aguardando confirmação automática do banco...</span>
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
<img src="${escapeHtml(it.imageUrl || CATEGORY_COVER_FALLBACKS.vestidos)}" alt="${escapeHtml(it.name)}" style="width:40px;height:50px;object-fit:cover;border-radius:6px;" />
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
<div id="mandatory-auth-purchase-banner" style="background:#FFF8F3;border:1.5px solid #C99D91;border-radius:12px;padding:18px 22px;margin-bottom:24px;display:flex;align-items:center;gap:14px;box-shadow:0 6px 20px rgba(128,96,68,0.08);">
<div style="width:40px;height:40px;border-radius:50%;background:#806044;color:#FFF;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.1rem;">🔒</div>
<div>
<strong style="display:block;font-family:var(--font-serif);font-size:1.25rem;color:#292522;margin-bottom:2px;">Identificação Necessária para Comprar</strong>
<p style="font-size:0.92rem;color:#5C5346;margin:0;">${escapeHtml(MANDATORY_LOGIN_MESSAGE)}</p>
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
<p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:8px;">Informe seu e-mail cadastrado e defina uma nova senha:</p>
<input type="email" name="email" class="form-control" required placeholder="E-mail da conta" style="margin-bottom:8px;" />
<input type="password" name="newPassword" class="form-control" required placeholder="Nova senha (mín. 6 caracteres)" minlength="6" style="margin-bottom:8px;" />
<button type="submit" class="btn btn-outline btn-sm">Redefinir Senha</button>
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
<div style="padding:10px 14px;border-radius:8px;margin-bottom:14px;font-size:0.85rem;background:${meta.badgeClass === 'confirmed' ? '#EDF7F1' : meta.badgeClass === 'danger' ? '#FDF2F2' : '#FFF8EB'};color:${meta.badgeClass === 'confirmed' ? '#1E4D38' : meta.badgeClass === 'danger' ? '#8E2626' : '#7A5211'};border:1px solid ${meta.badgeClass === 'confirmed' ? '#B8E0C8' : meta.badgeClass === 'danger' ? '#F2B8B5' : '#E2B96B'};">
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
try {
const res = await fetch(apiBase + '/api/auth/recover', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
email: fd.get('email'),
newPassword: fd.get('newPassword')
})
});
const data = await res.json();
if (!res.ok || !data.ok) {
showToast((data && data.error) || 'E-mail não localizado.', 'danger');
return;
}
showToast('Senha redefinida com sucesso! Você já pode entrar.', 'success');
recForm.reset();
} catch (err) {
showToast('Erro ao redefinir senha.', 'danger');
}
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
<div style="padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:0.88rem;background:${meta.badgeClass === 'confirmed' ? '#EDF7F1' : meta.badgeClass === 'danger' ? '#FDF2F2' : '#FFF8EB'};color:${meta.badgeClass === 'confirmed' ? '#1E4D38' : meta.badgeClass === 'danger' ? '#8E2626' : '#7A5211'};border:1px solid ${meta.badgeClass === 'confirmed' ? '#B8E0C8' : meta.badgeClass === 'danger' ? '#F2B8B5' : '#E2B96B'};">
<strong>${escapeHtml(meta.customerMessage)}</strong>
</div>
` : ''}
${meta.step < 9 ? `
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-bottom:18px;">
${timelineSteps.map((st) => {
const done = meta.step >= st.step;
return `
<div style="padding:8px 10px;border-radius:8px;border:1px solid ${done ? '#2E6F52' : 'var(--border-subtle)'};background:${done ? '#EDF7F1' : 'var(--bg-primary)'};font-size:0.75rem;text-align:center;">
<div style="font-weight:700;color:${done ? '#1E4D38' : 'var(--text-muted)'};margin-bottom:2px;">${done ? '✓' : '○'}</div>
<div style="color:${done ? '#1E4D38' : 'var(--text-secondary)'};font-weight:${done ? '600' : '400'};">${escapeHtml(st.label)}</div>
</div>
`;
}).join('')}
</div>
` : ''}
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
if (!AppState.currentCustomer || !AppState.currentCustomer.email) {
e.preventDefault();
e.stopPropagation();
requireCustomerAuthForPurchase({ type: 'checkout' });
}
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
})();
