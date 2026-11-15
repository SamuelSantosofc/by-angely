/**
 * By Angély — Sistema Profissional de Gestão de Boutique Feminina (Painel Administrativo)
 * Protegido por Autenticação e Controle de Permissões Baseado em Perfis (RBAC)
 * Itaperuna, Rio de Janeiro — Brasil
 */
(function () {
  'use strict';

  const STORAGE_KEY_ADMIN_SESSION = 'by_angely_admin_session_v1';

  const AdminState = {
    activeSection: 'dashboard', // 'dashboard' | 'products' | 'categories' | 'orders' | 'customers' | 'payments' | 'shipping' | 'branding' | 'policies' | 'users'
    mobileMenuOpen: false,
    editingProductId: null,
    editingCategoryId: null,
    editingCouponId: null,
    categoriesSubTab: 'all', // 'all' | 'categories' | 'coupons' | 'banner'
    policiesSubTab: 'all', // 'all' | 'privacy' | 'terms' | 'shippingPolicy' | 'returnsPolicy'
    orderFilterStatus: 'all',
    orderSearchTerm: '',
    revealedCustomers: {}, // controla mascaramento LGPD de dados pessoais
    tempProductMedia: [],
    tempProductVariations: [],
    pixPreviewAmount: 289.90
  };

  // Ícones Vetoriais Monocromáticos (Padrão Lucide 18x18, stroke 1.75)
  const ADMIN_ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1"></rect><rect x="14" y="3" width="7" height="5" rx="1"></rect><rect x="14" y="12" width="7" height="9" rx="1"></rect><rect x="3" y="16" width="7" height="5" rx="1"></rect></svg>',
    products: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path></svg>',
    categories: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>',
    orders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
    customers: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    payments: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>',
    shipping: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>',
    branding: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>',
    policies: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>',
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    menu: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>'
  };

  const ROLE_DEFINITIONS = {
    owner: {
      roleLabel: 'Proprietária (Acesso Total)',
      permissions: ['products', 'categories', 'orders', 'customers', 'payments', 'shipping', 'branding', 'policies', 'users']
    },
    admin: {
      roleLabel: 'Administração (Gestão Operacional)',
      permissions: ['products', 'categories', 'orders', 'customers', 'shipping', 'branding']
    },
    support: {
      roleLabel: 'Atendimento (Pedidos, Rastreio e SAC)',
      permissions: ['orders', 'customers']
    },
    collaborator: {
      roleLabel: 'Colaboradora (Catálogo, Fotos e Estoque)',
      permissions: ['products', 'categories']
    },
    catalog_manager: {
      roleLabel: 'Gerente de Catálogo e Pedidos',
      permissions: ['products', 'categories', 'orders', 'customers']
    },
    order_operator: {
      roleLabel: 'Atendimento e Pedidos',
      permissions: ['orders', 'customers']
    }
  };

  function maskSensitiveData(str, type) {
    if (!str || String(str).toLowerCase().includes('não informado')) return str || '-';
    const s = String(str);
    if (type === 'cpf') {
      return '***.***.***-' + s.slice(-2);
    }
    if (type === 'phone') {
      return '(**) *****-' + s.slice(-4);
    }
    if (type === 'email') {
      const parts = s.split('@');
      if (parts.length < 2) return '***';
      return parts[0].slice(0, 2) + '***@' + parts[1];
    }
    return s;
  }

  function hasPermission(adminUser, perm) {
    if (!adminUser || adminUser.active === false) return false;
    if (adminUser.role === 'owner') return true;
    return Array.isArray(adminUser.permissions) && adminUser.permissions.includes(perm);
  }

  function isPendingConfirmationText(val) {
    if (!val) return true;
    const lower = String(val).toLowerCase();
    return lower.includes('a confirmar') || lower.includes('[a confirmar');
  }

  function countPolicyPlaceholders(policyObj) {
    if (!policyObj || !Array.isArray(policyObj.content)) return 0;
    let count = 0;
    policyObj.content.forEach((sec) => {
      const matches = String(sec.body || '').match(/\[A CONFIRMAR[^\]]*\]|a confirmar pela proprietária/gi);
      if (matches) count += matches.length;
    });
    return count;
  }

  function syncOrderStockAndSales(db, ord, previousStatus, newStatus) {
    const confirmedStates = ['paid', 'preparing', 'ready_pickup', 'shipped', 'delivered'];
    const wasConfirmed = confirmedStates.includes(previousStatus) || Boolean(ord.stockDeducted);
    const isNowConfirmed = confirmedStates.includes(newStatus);

    if (!wasConfirmed && isNowConfirmed) {
      (ord.items || []).forEach((it) => {
        const prod = (db.products || []).find((p) => p.id === it.productId || p.sku === it.sku);
        if (prod) {
          const qty = Number(it.quantity) || 1;
          prod.salesCount = (Number(prod.salesCount) || 0) + qty;
          if (Array.isArray(prod.variations)) {
            const v = prod.variations.find((vr) => vr.size === it.size && vr.color === it.color);
            if (v) {
              v.stock = Math.max(0, (Number(v.stock) || 0) - qty);
            }
          }
        }
      });
      ord.stockDeducted = true;
    } else if (wasConfirmed && newStatus === 'cancelled') {
      (ord.items || []).forEach((it) => {
        const prod = (db.products || []).find((p) => p.id === it.productId || p.sku === it.sku);
        if (prod) {
          const qty = Number(it.quantity) || 1;
          prod.salesCount = Math.max(0, (Number(prod.salesCount) || 0) - qty);
          if (Array.isArray(prod.variations)) {
            const v = prod.variations.find((vr) => vr.size === it.size && vr.color === it.color);
            if (v) {
              v.stock = (Number(v.stock) || 0) + qty;
            }
          }
        }
      });
      ord.stockDeducted = false;
    }
  }

  function renderAdminView(containerEl) {
    const app = window.ByAngelyApp;
    const state = app.getState();

    if (!state.currentAdmin) {
      containerEl.innerHTML = renderAdminLoginScreen();
      bindAdminLoginEvents(containerEl);
      return;
    }

    const admin = state.currentAdmin;
    const navItems = [
      { id: 'dashboard', group: 'OPERAÇÃO', label: 'Dashboard & Resumo', icon: ADMIN_ICONS.dashboard, perm: null },
      { id: 'orders', group: 'OPERAÇÃO', label: 'Pedidos, Rastreio & Trocas', icon: ADMIN_ICONS.orders, perm: 'orders' },
      { id: 'customers', group: 'OPERAÇÃO', label: 'Clientes, SAC & LGPD', icon: ADMIN_ICONS.customers, perm: 'customers' },
      { id: 'products', group: 'CATÁLOGO & VITRINE', label: 'Produtos, Fotos & Estoque', icon: ADMIN_ICONS.products, perm: 'products' },
      { id: 'categories', group: 'CATÁLOGO & VITRINE', label: 'Categorias, Banners & Cupons', icon: ADMIN_ICONS.categories, perm: 'categories' },
      { id: 'payments', group: 'VENDA & LOGÍSTICA', label: 'Configurações de Venda e Pagamento', icon: ADMIN_ICONS.payments, perm: 'payments' },
      { id: 'shipping', group: 'VENDA & LOGÍSTICA', label: 'Entrega, Retirada & Notificações', icon: ADMIN_ICONS.shipping, perm: 'shipping' },
      { id: 'branding', group: 'MARCA & CONFORMIDADE', label: 'Identidade & Dados da Loja', icon: ADMIN_ICONS.branding, perm: 'branding' },
      { id: 'policies', group: 'MARCA & CONFORMIDADE', label: 'Políticas & Documentos', icon: ADMIN_ICONS.policies, perm: 'policies' },
      { id: 'users', group: 'MARCA & CONFORMIDADE', label: 'Equipe & Permissões', icon: ADMIN_ICONS.users, perm: 'users' }
    ].filter((item) => !item.perm || hasPermission(admin, item.perm));

    if (!navItems.some((i) => i.id === AdminState.activeSection)) {
      AdminState.activeSection = navItems[0].id;
    }

    const activeNavObj = navItems.find((i) => i.id === AdminState.activeSection) || navItems[0];

    let lastGroup = '';
    const sidebarButtonsHtml = navItems.map((item) => {
      let groupHeader = '';
      if (item.group !== lastGroup) {
        lastGroup = item.group;
        groupHeader = `<span class="admin-nav-group-label">${app.escapeHtml(item.group)}</span>`;
      }
      return `
        ${groupHeader}
        <button type="button" class="admin-nav-btn ${AdminState.activeSection === item.id ? 'active' : ''}" data-admin-section="${item.id}">
          ${item.icon}
          <span>${app.escapeHtml(item.label)}</span>
        </button>
      `;
    }).join('');

    containerEl.innerHTML = `
      <div class="admin-mobile-topbar">
        <div>
          <span style="font-size:0.65rem;text-transform:uppercase;letter-spacing:0.12em;color:#C99D91;display:block;">Painel Administrativo • BY ANGÉLY</span>
          <strong style="font-size:0.95rem;">${app.escapeHtml(activeNavObj.label)}</strong>
        </div>
        <button type="button" class="btn btn-outline btn-sm" id="btn-toggle-admin-sidebar" style="color:#FFF;border-color:rgba(255,255,255,0.35);min-height:38px;padding:6px 12px;">
          ${ADMIN_ICONS.menu}
          <span>${AdminState.mobileMenuOpen ? 'Fechar Menu' : 'Menu do Painel'}</span>
        </button>
      </div>

      <div class="admin-shell">
        <aside class="admin-sidebar ${AdminState.mobileMenuOpen ? 'mobile-open' : ''}" aria-label="Menu do Painel Administrativo">
          <div style="padding:6px 12px 14px;border-bottom:1px solid rgba(233,223,212,0.14);margin-bottom:4px;">
            <span style="font-size:0.68rem;letter-spacing:0.14em;text-transform:uppercase;color:#C99D91;display:block;">Gestão de Boutique</span>
            <strong style="font-family:var(--font-serif);font-size:1.45rem;color:#FFF;display:block;margin-top:2px;">BY ANGÉLY</strong>
            <span style="font-size:0.78rem;color:#E9DFD4;display:block;margin-top:4px;">${app.escapeHtml(admin.name)}</span>
            <span style="font-size:0.68rem;background:rgba(201,157,145,0.22);color:#F8F5F0;padding:2px 8px;border-radius:4px;display:inline-block;margin-top:4px;">${app.escapeHtml(admin.roleLabel)}</span>
          </div>

          ${sidebarButtonsHtml}

          <div style="margin-top:auto;padding-top:16px;border-top:1px solid rgba(233,223,212,0.14);display:flex;flex-direction:column;gap:8px;">
            <button type="button" class="btn btn-outline btn-sm" style="color:#FFF;border-color:rgba(255,255,255,0.3);" data-action="go-view" data-view="home">
              Ver Loja como Cliente ↗
            </button>
            <button type="button" class="btn btn-danger btn-sm" id="btn-admin-logout">
              Encerrar Sessão Admin
            </button>
          </div>
        </aside>

        <div class="admin-main" id="admin-section-workspace">
          ${renderActiveAdminSection()}
        </div>
      </div>
    `;

    bindAdminWorkspaceEvents(containerEl);
  }

  function renderAdminLoginScreen() {
    return `
      <section class="section-block">
        <div class="container" style="max-width:460px;">
          <div class="admin-card">
            <span class="section-eyebrow">Acesso Restrito • Administração</span>
            <h1 style="font-family:var(--font-serif);font-size:2rem;margin-bottom:8px;">Painel BY ANGÉLY</h1>
            <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:20px;">
              Sistema exclusivo de gestão da boutique BY ANGÉLY. Informe suas credenciais autorizadas para continuar.
            </p>

            <form id="admin-login-form" autocomplete="off">
              <div style="margin-bottom:14px;">
                <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">E-mail Administrativo *</label>
                <input type="email" name="email" id="admin-login-email" class="form-control" required placeholder="Digite seu e-mail administrativo" value="" />
              </div>
              <div style="margin-bottom:18px;">
                <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Senha *</label>
                <input type="password" name="password" id="admin-login-password" class="form-control" required placeholder="••••••••" value="" />
              </div>
              <button type="submit" class="btn btn-primary btn-block">Entrar no Painel</button>
            </form>
          </div>
        </div>
      </section>
    `;
  }

  function bindAdminLoginEvents(containerEl) {
    const form = containerEl.querySelector('#admin-login-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const app = window.ByAngelyApp;
      const db = app.getState().db;
      const fd = new FormData(form);
      const email = String(fd.get('email') || '').trim().toLowerCase();
      const password = String(fd.get('password') || '');

      db.adminUsers = (db.adminUsers || []).filter(
        (u) => u && u.email !== 'proprietaria@byangely.local' && u.email !== 'equipe@byangely.local'
      );
      if (!db.adminUsers.some((u) => u.email.toLowerCase() === 'byangely1@gmail.com')) {
        db.adminUsers.unshift({
          id: 'admin-owner-official',
          name: 'Proprietária BY ANGÉLY',
          email: 'byangely1@gmail.com',
          role: 'owner',
          roleLabel: 'Proprietária (Acesso Total)',
          permissions: ROLE_DEFINITIONS.owner.permissions,
          active: true
        });
      }

      const user = (db.adminUsers || []).find((u) => u.email.toLowerCase() === email && u.active !== false);
      const validPass =
        (user && user.customPassword && user.customPassword === password) ||
        (user && !user.customPassword && user.role === 'owner' && password === 'Angely@2026') ||
        (user && !user.customPassword && user.role !== 'owner' && password === 'Equipe@2026');

      if (!user || !validPass) {
        app.showToast('Credenciais administrativas inválidas ou acesso revogado.', 'danger');
        return;
      }

      const safeSessionUser = { ...user };
      delete safeSessionUser.customPassword;
      delete safeSessionUser.passwordHash;

      app.getState().currentAdmin = safeSessionUser;
      sessionStorage.setItem(STORAGE_KEY_ADMIN_SESSION, JSON.stringify(safeSessionUser));
      app.updateGlobalChrome();
      app.saveDatabase(`Login administrativo realizado por ${user.name}`);
      app.showToast(`Bem-vinda ao Painel Administrativo, ${user.name}!`, 'success');
      renderAdminView(containerEl);
    });
  }

  function renderActiveAdminSection() {
    switch (AdminState.activeSection) {
      case 'dashboard':
        return renderDashboardSection();
      case 'products':
        return renderProductsSection();
      case 'categories':
        return renderCategoriesBannersCouponsSection();
      case 'orders':
        return renderOrdersSection();
      case 'customers':
        return renderCustomersSection();
      case 'payments':
        return renderPaymentsSection();
      case 'shipping':
        return renderShippingSection();
      case 'branding':
        return renderBrandingSection();
      case 'policies':
        return renderPoliciesEditorSection();
      case 'users':
        return renderUsersSection();
      default:
        return renderDashboardSection();
    }
  }

  // =========================================================================
  // SEÇÃO 1: DASHBOARD INTELIGENTE (INDICADORES REAIS, ALERTAS E ATALHOS)
  // =========================================================================
  function renderDashboardSection() {
    const app = window.ByAngelyApp;
    const db = app.getState().db;
    const orders = db.orders || [];
    const products = db.products || [];
    const returns = db.returnRequests || [];
    const sacMessages = (db.contactMessages || []).filter((m) => m.status !== 'Atendido');

    const confirmedOrders = orders.filter((o) => ['paid', 'preparing', 'shipped', 'ready_pickup', 'delivered'].includes(o.status));
    const pendingPaymentOrders = orders.filter((o) => o.status === 'awaiting_confirmation');
    const whatsappOrders = orders.filter((o) => o.status === 'awaiting_whatsapp' || o.paymentMethod === 'whatsapp');
    const confirmedRevenue = confirmedOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const pendingRevenue = orders
      .filter((o) => o.status === 'awaiting_confirmation' || o.status === 'awaiting_whatsapp')
      .reduce((s, o) => s + (Number(o.total) || 0), 0);

    const publishedProducts = products.filter((p) => p.status === 'published');
    const promoProducts = products.filter((p) => p.isPromo && p.status === 'published');
    const outOfStockProducts = products.filter((p) => app.getTotalProductStock(p) === 0);
    const lowStockProducts = products.filter((p) => {
      const st = app.getTotalProductStock(p);
      return st > 0 && st <= 3;
    });
    const criticalStockProducts = products.filter((p) => app.getTotalProductStock(p) <= 3);
    const bestSellers = [...products].sort((a, b) => (Number(b.salesCount) || 0) - (Number(a.salesCount) || 0)).slice(0, 5);
    const recentOrders = orders.slice(0, 5);
    const demoProductsCount = products.filter((p) => p.isDemo).length;
    const activePayOpts = app.getAvailableCheckoutPaymentOptions ? app.getAvailableCheckoutPaymentOptions(db.paymentSettings) : [];

    // Checklist de pendências reais da proprietária
    const st = db.storeSettings;
    const pay = db.paymentSettings;
    const pixDiag = app.getPaymentIntegrationStatus ? app.getPaymentIntegrationStatus('pix', pay, st) : { stateCode: 'configured' };
    const totalPolicyPending =
      countPolicyPlaceholders(db.policies.privacy) +
      countPolicyPlaceholders(db.policies.terms) +
      countPolicyPlaceholders(db.policies.shippingPolicy) +
      countPolicyPlaceholders(db.policies.returnsPolicy);

    const checklist = [
      {
        label: 'Atendimento e Finalização pelo WhatsApp Oficial (+55 28 99987-1458)',
        done: Boolean(pay.whatsapp && pay.whatsapp.enabled),
        statusText: pay.whatsapp && pay.whatsapp.enabled ? 'Ativado e Validado' : 'Desativado',
        targetSection: 'payments'
      },
      {
        label: 'Dados Empresariais (CNPJ, Razão Social e Endereço físico em Itaperuna - RJ)',
        done: !isPendingConfirmationText(st.cnpj) && !isPendingConfirmationText(st.legalName) && !isPendingConfirmationText(st.addressLine),
        statusText: !isPendingConfirmationText(st.cnpj) ? 'Confirmado' : 'Pendente de preenchimento pela proprietária',
        targetSection: 'branding'
      },
      {
        label: 'Modalidades de Entrega, Frete e Prazo (Retirada, Entrega Local, PAC e SEDEX)',
        done: (db.shippingSettings.methods || []).some((m) => m.enabled && m.priceStatus === 'confirmed'),
        statusText: (db.shippingSettings.methods || []).some((m) => m.enabled && m.priceStatus === 'confirmed')
          ? 'Valores confirmados'
          : 'Pendente confirmar valores e prazos de envio',
        targetSection: 'shipping'
      },
      {
        label: 'Revisão dos Textos Jurídicos (LGPD, Termos, Entrega e Trocas)',
        done: !db.policies.privacy.needsOwnerConfirmation && !db.policies.returnsPolicy.needsOwnerConfirmation && totalPolicyPending === 0,
        statusText: totalPolicyPending > 0 ? `${totalPolicyPending} campo(s) [A CONFIRMAR] nos documentos` : 'Revisado',
        targetSection: 'policies'
      },
      {
        label: 'Catálogo e Banner Principal (Substituição de fotos demonstrativas quando desejar)',
        done: demoProductsCount === 0 && !(st.heroBanner && st.heroBanner.isDemoImage),
        statusText: `${demoProductsCount} peça(s) demonstrativa(s) • Banner: ${st.heroBanner && st.heroBanner.isDemoImage ? 'Imagem demonstrativa' : 'Imagem própria'}`,
        targetSection: 'products'
      }
    ];

    return `
      <div>
        ${activePayOpts.length === 0 ? `
          <div class="alert-box alert-danger" style="margin-bottom:18px;">
            <strong>Atenção Proprietária — Finalização Bloqueada:</strong> Todas as formas de venda e pagamento estão desativadas no momento. As clientes não conseguirão finalizar pedidos até que você ative pelo menos uma opção em <button type="button" data-admin-section="payments" style="text-decoration:underline;font-weight:700;">Configurações de Venda e Pagamento</button>.
          </div>
        ` : ''}

        ${pixDiag.stateCode === 'error' ? `
          <div class="alert-box alert-warning" style="margin-bottom:18px;">
            <strong>Alerta de Configuração Pix:</strong> ${app.escapeHtml(pixDiag.detail)} Revise em <button type="button" data-admin-section="payments" style="text-decoration:underline;font-weight:700;">Configurações de Venda e Pagamento</button>.
          </div>
        ` : ''}

        <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px;margin-bottom:18px;">
          <div>
            <span class="section-eyebrow">Painel de Gestão • Dados Reais em Tempo Real</span>
            <h1 style="font-family:var(--font-serif);font-size:2rem;">Dashboard Operacional BY ANGÉLY</h1>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn btn-primary btn-sm" data-admin-section="products">
              + Cadastrar Nova Peça
            </button>
            ${demoProductsCount > 0 ? `
              <button type="button" class="btn btn-outline btn-sm" id="btn-quick-remove-demos">
                Ocultar/Remover Peças Demonstrativas (${demoProductsCount})
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Atalhos Rápidos para as Principais Tarefas -->
        <div class="admin-quick-actions" role="navigation" aria-label="Atalhos rápidos da proprietária">
          <button type="button" class="admin-quick-btn" data-admin-section="products">
            ${ADMIN_ICONS.products}
            <span>Cadastrar / Editar Peças</span>
          </button>
          <button type="button" class="admin-quick-btn" data-admin-section="orders">
            ${ADMIN_ICONS.orders}
            <span>Pedidos & Rastreio (${orders.length})</span>
          </button>
          <button type="button" class="admin-quick-btn" data-admin-section="payments">
            ${ADMIN_ICONS.payments}
            <span> Formas de Pagamento (${activePayOpts.length} ativa${activePayOpts.length === 1 ? '' : 's'})</span>
          </button>
          <button type="button" class="admin-quick-btn" data-admin-section="shipping">
            ${ADMIN_ICONS.shipping}
            <span>Entrega, Retirada & Frete</span>
          </button>
          <button type="button" class="admin-quick-btn" data-admin-section="categories">
            ${ADMIN_ICONS.categories}
            <span>Categorias, Banner & Cupons</span>
          </button>
          <button type="button" class="admin-quick-btn" data-admin-section="branding">
            ${ADMIN_ICONS.branding}
            <span>Logotipo & Dados da Loja</span>
          </button>
        </div>

        <!-- 8 Indicadores Reais da Operação -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Vendas Confirmadas</div>
            <div class="kpi-value" style="color:var(--status-success-text);">${app.formatBRL(confirmedRevenue)}</div>
            <span style="font-size:0.76rem;color:var(--text-secondary);">${confirmedOrders.length} pedido(s) pago(s)/confirmado(s)</span>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Aguardando Confirmação</div>
            <div class="kpi-value" style="color:var(--status-warning-text);">${app.formatBRL(pendingRevenue)}</div>
            <span style="font-size:0.76rem;color:var(--text-secondary);">${pendingPaymentOrders.length + whatsappOrders.filter((o) => o.status === 'awaiting_whatsapp').length} pedido(s) pendente(s)</span>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Solicitações pelo WhatsApp</div>
            <div class="kpi-value" style="color:#806044;">${whatsappOrders.length}</div>
            <span style="font-size:0.76rem;color:var(--text-secondary);">Pedidos iniciados via WhatsApp</span>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Produtos Publicados</div>
            <div class="kpi-value">${publishedProducts.length}</div>
            <span style="font-size:0.76rem;color:var(--text-secondary);">De ${products.length} peça(s) no catálogo</span>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Produtos em Promoção</div>
            <div class="kpi-value" style="color:#806044;">${promoProducts.length}</div>
            <span style="font-size:0.76rem;color:var(--text-secondary);">Com preço promocional ativo</span>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Estoque Baixo (1 a 3 un.)</div>
            <div class="kpi-value" style="color:${lowStockProducts.length > 0 ? 'var(--status-warning-text)' : 'var(--text-primary)'};">${lowStockProducts.length}</div>
            <span style="font-size:0.76rem;color:var(--text-secondary);">Peças próximas de esgotar</span>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Produtos Sem Estoque</div>
            <div class="kpi-value" style="color:${outOfStockProducts.length > 0 ? 'var(--status-danger-text)' : 'var(--text-primary)'};">${outOfStockProducts.length}</div>
            <span style="font-size:0.76rem;color:var(--text-secondary);">Peças com 0 unidades</span>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">SAC & Trocas Pendentes</div>
            <div class="kpi-value">${sacMessages.length + returns.filter((r) => r.status !== 'Atendida pela Loja').length}</div>
            <span style="font-size:0.76rem;color:var(--text-secondary);">${sacMessages.length} SAC • ${returns.length} troca(s)</span>
          </div>
        </div>

        <!-- Pedidos Recentes & Alertas de Estoque -->
        <div class="admin-form-grid-2">
          <div class="admin-card" style="margin-bottom:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <h2 style="font-family:var(--font-serif);font-size:1.35rem;">Pedidos Recentes (${orders.length})</h2>
              <button type="button" class="btn btn-outline btn-sm" data-admin-section="orders">Ver Todos</button>
            </div>
            ${recentOrders.length === 0 ? `
              <p style="font-size:0.85rem;color:var(--text-secondary);padding:12px 0;">
                Nenhum pedido registrado ainda. Quando uma cliente finalizar pelo WhatsApp ou pelo site, o pedido aparecerá aqui em tempo real.
              </p>
            ` : `
              <div style="overflow-x:auto;">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Cliente</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${recentOrders.map((o) => `
                      <tr>
                        <td><strong>${app.escapeHtml(o.orderNumber)}</strong></td>
                        <td>${app.escapeHtml(o.customer ? o.customer.name : '-')}</td>
                        <td>${app.formatBRL(o.total)}</td>
                        <td><span class="status-pill ${o.status === 'paid' || o.status === 'delivered' ? 'confirmed' : o.status === 'cancelled' ? 'danger' : 'pending'}">${app.escapeHtml(o.statusLabel || o.status)}</span></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>

          <div class="admin-card" style="margin-bottom:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <h2 style="font-family:var(--font-serif);font-size:1.35rem;">Alertas de Estoque (≤ 3 un.)</h2>
              <button type="button" class="btn btn-outline btn-sm" data-admin-section="products">Gerenciar Estoque</button>
            </div>
            ${criticalStockProducts.length === 0 ? `
              <p style="font-size:0.85rem;color:var(--status-success-text);padding:12px 0;">
                ✓ Todas as ${products.length} peças cadastradas possuem estoque confortável (> 3 unidades).
              </p>
            ` : `
              <div style="overflow-x:auto;">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>SKU / Peça</th>
                      <th>Saldo</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${criticalStockProducts.map((p) => {
                      const stCount = app.getTotalProductStock(p);
                      return `
                        <tr>
                          <td><strong>${app.escapeHtml(p.sku)}</strong> — ${app.escapeHtml(p.name)}</td>
                          <td><span class="status-pill ${stCount === 0 ? 'danger' : 'pending'}">${stCount === 0 ? 'Sem estoque (0)' : stCount + ' un.'}</span></td>
                          <td><button type="button" class="btn btn-outline btn-sm" data-action-admin="edit-product" data-product-id="${app.escapeHtml(p.id)}">Repor</button></td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </div>

        <!-- Produtos Mais Vendidos & Checklist de Configuração -->
        <div class="admin-form-grid-2" style="margin-top:20px;">
          <div class="admin-card" style="margin-bottom:0;">
            <h2 style="font-family:var(--font-serif);font-size:1.35rem;margin-bottom:12px;">Produtos Mais Vendidos (Dados Reais)</h2>
            <div style="overflow-x:auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Peça</th>
                    <th>Preço Atual</th>
                    <th>Vendas Confirmadas</th>
                    <th>Estoque Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${bestSellers.map((p) => `
                    <tr>
                      <td><strong>${app.escapeHtml(p.name)}</strong> <small style="color:var(--text-muted);">(${app.escapeHtml(p.sku)})</small></td>
                      <td>${app.formatBRL(p.isPromo && p.promoPrice ? p.promoPrice : p.price)}</td>
                      <td><strong>${Number(p.salesCount) || 0} un.</strong></td>
                      <td><span class="status-pill ${app.getTotalProductStock(p) <= 3 ? 'pending' : 'confirmed'}">${app.getTotalProductStock(p)} un.</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="admin-card" style="margin-bottom:0;">
            <h2 style="font-family:var(--font-serif);font-size:1.35rem;margin-bottom:6px;">Diagnóstico & Pendências de Configuração</h2>
            <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:12px;">
              Nenhum dado comercial ou jurídico é inventado. Confira o status real de cada módulo:
            </p>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${checklist.map((item) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid var(--border-subtle);border-radius:8px;background:${item.done ? 'var(--status-success-bg)' : 'var(--bg-primary)'};gap:10px;flex-wrap:wrap;">
                  <div style="flex:1;min-width:190px;">
                    <strong style="font-size:0.83rem;display:block;">${app.escapeHtml(item.label)}</strong>
                    <span style="font-size:0.75rem;color:var(--text-secondary);">${app.escapeHtml(item.statusText)}</span>
                  </div>
                  <button type="button" class="btn btn-outline btn-sm" data-admin-section="${item.targetSection}">
                    ${item.done ? 'Revisar' : 'Configurar'}
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // SEÇÃO 2: PRODUTOS, FOTOS, ESTOQUE POR VARIAÇÃO E PRÉ-VISUALIZAÇÃO
  // =========================================================================
  function buildDefaultVariationMatrix(sizes, colors, existingVariations, defaultStock) {
    const fallbackStock = defaultStock !== undefined ? Number(defaultStock) : 4;
    const matrix = [];
    sizes.forEach((sz) => {
      colors.forEach((cl) => {
        const cName = typeof cl === 'string' ? cl : cl.name;
        const found = (existingVariations || []).find((v) => v.size === sz && v.color === cName);
        matrix.push({
          size: sz,
          color: cName,
          stock: found !== undefined ? Number(found.stock) || 0 : fallbackStock
        });
      });
    });
    return matrix;
  }

  function renderProductsSection() {
    const app = window.ByAngelyApp;
    const db = app.getState().db;
    const products = db.products || [];
    const editingProd = AdminState.editingProductId
      ? products.find((p) => p.id === AdminState.editingProductId)
      : null;

    if (editingProd && AdminState.tempProductMedia.length === 0 && editingProd.media) {
      AdminState.tempProductMedia = JSON.parse(JSON.stringify(editingProd.media));
    }
    if (editingProd && AdminState.tempProductVariations.length === 0 && editingProd.variations) {
      AdminState.tempProductVariations = JSON.parse(JSON.stringify(editingProd.variations));
    }
    if (!editingProd && AdminState.tempProductVariations.length === 0) {
      AdminState.tempProductVariations = buildDefaultVariationMatrix(
        ['P', 'M', 'G'],
        [{ name: 'Off-White', hex: '#F7F5F0' }, { name: 'Preto', hex: '#1B1B1B' }],
        [],
        4
      );
    }

    const previewProd = {
      id: editingProd ? editingProd.id : 'preview-temp',
      sku: editingProd ? editingProd.sku : 'ANG-NOVO',
      name: editingProd ? editingProd.name : 'Nova Peça BY ANGÉLY',
      category: editingProd ? editingProd.category : 'vestidos',
      categoryName: editingProd ? editingProd.categoryName : 'Vestidos',
      style: editingProd ? editingProd.style : 'Alfaiataria',
      price: editingProd ? Number(editingProd.price) : 299.90,
      promoPrice: editingProd && editingProd.promoPrice ? Number(editingProd.promoPrice) : null,
      isPromo: Boolean(editingProd && editingProd.isPromo),
      isFeatured: editingProd ? Boolean(editingProd.isFeatured) : true,
      isNew: editingProd ? Boolean(editingProd.isNew) : true,
      isDemo: Boolean(editingProd && editingProd.isDemo),
      status: editingProd ? editingProd.status : 'published',
      sizes: editingProd ? editingProd.sizes : ['P', 'M', 'G'],
      colors: editingProd ? editingProd.colors : [{ name: 'Off-White', hex: '#F7F5F0' }, { name: 'Preto', hex: '#1B1B1B' }],
      variations: AdminState.tempProductVariations,
      media: AdminState.tempProductMedia.length > 0
        ? AdminState.tempProductMedia
        : [{ type: 'image', url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=85', alt: 'Pré-visualização' }]
    };

    const totalMatrixStock = AdminState.tempProductVariations.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);

    return `
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
          <div>
            <span class="section-eyebrow">Gestão de Catálogo & Estoque</span>
            <h1 style="font-family:var(--font-serif);font-size:2rem;">Produtos, Fotos & Controle de Estoque</h1>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button type="button" class="btn btn-primary btn-sm" id="btn-new-product-form">+ Cadastrar Novo Produto</button>
            ${products.some((p) => p.isDemo) ? `
              <button type="button" class="btn btn-outline btn-sm" id="btn-remove-all-demos">
                Remover Produtos Demonstrativos
              </button>
            ` : ''}
          </div>
        </div>

        <div class="admin-product-split">
          <!-- Coluna Esquerda: Formulário Organizado por Etapas -->
          <div class="admin-card" id="admin-product-form-card">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border-subtle);">
              <h2 style="font-family:var(--font-serif);font-size:1.5rem;">
                ${editingProd ? 'Editando Peça: ' + app.escapeHtml(editingProd.name) : 'Cadastrar Nova Peça da Boutique'}
              </h2>
              <span class="status-pill info">Estoque Total: <strong id="admin-matrix-total-badge" style="margin-left:4px;">${totalMatrixStock} un.</strong></span>
            </div>

            <form id="admin-product-form">
              <!-- ETAPA 1: IDENTIFICAÇÃO E PREÇO -->
              <div style="margin-bottom:18px;">
                <span style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#806044;display:block;margin-bottom:10px;">
                  1. Identificação, Categoria e Valores
                </span>
                <div class="admin-form-grid-4">
                  <div style="grid-column: span 2;">
                    <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Nome da Peça *</label>
                    <input type="text" name="name" id="admin-prod-inp-name" class="form-control" required value="${editingProd ? app.escapeHtml(editingProd.name) : ''}" placeholder="Ex.: Vestido Midi Linho Atelier" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Código do Produto (SKU) *</label>
                    <input type="text" name="sku" id="admin-prod-inp-sku" class="form-control" required value="${editingProd ? app.escapeHtml(editingProd.sku) : 'ANG-' + Math.floor(100 + Math.random() * 900)}" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Categoria *</label>
                    <select name="category" id="admin-prod-inp-category" class="form-control" required>
                      ${db.categories.map((c) => `
                        <option value="${app.escapeHtml(c.slug)}" ${editingProd && editingProd.category === c.slug ? 'selected' : ''}>${app.escapeHtml(c.name)}</option>
                      `).join('')}
                    </select>
                  </div>
                </div>

                <div class="admin-form-grid-4">
                  <div>
                    <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Preço Normal (R$) *</label>
                    <input type="number" step="0.01" min="0.01" name="price" id="admin-prod-inp-price" class="form-control" required value="${editingProd ? editingProd.price : '299.90'}" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Preço Promocional (R$)</label>
                    <input type="number" step="0.01" min="0" name="promoPrice" id="admin-prod-inp-promo" class="form-control" value="${editingProd && editingProd.promoPrice ? editingProd.promoPrice : ''}" placeholder="Opcional" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Estilo / Ocasião</label>
                    <input type="text" name="style" class="form-control" value="${editingProd ? app.escapeHtml(editingProd.style || '') : 'Alfaiataria'}" placeholder="Ex.: Alfaiataria, Festa..." />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Status de Publicação</label>
                    <select name="status" class="form-control">
                      <option value="published" ${!editingProd || editingProd.status === 'published' ? 'selected' : ''}>Publicado (Visível na Loja)</option>
                      <option value="draft" ${editingProd && editingProd.status === 'draft' ? 'selected' : ''}>Rascunho (Em preparo)</option>
                      <option value="paused" ${editingProd && editingProd.status === 'paused' ? 'selected' : ''}>Pausado (Oculto)</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- ETAPA 2: GALERIA DE IMAGENS E IMAGEM PRINCIPAL -->
              <div style="background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;padding:14px;margin-bottom:18px;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
                  <strong style="font-size:0.82rem;text-transform:uppercase;letter-spacing:0.06em;color:#806044;" id="admin-prod-media-count">
                    2. Galeria de Fotos & Vídeo (${AdminState.tempProductMedia.length} adicionada${AdminState.tempProductMedia.length === 1 ? '' : 's'})
                  </strong>
                  <span style="font-size:0.74rem;color:var(--text-secondary);">A 1ª foto é exibida como Capa Principal na vitrine.</span>
                </div>

                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;align-items:center;">
                  <label class="btn btn-primary btn-sm" style="cursor:pointer;">
                    Enviar Foto/Vídeo do Aparelho
                    <input type="file" id="admin-prod-file-upload" accept="image/*,video/mp4,video/webm" multiple style="display:none;" />
                  </label>
                  <input type="url" id="admin-prod-media-url" class="form-control" placeholder="Ou cole a URL de uma foto ou vídeo (.jpg, .png, .mp4)" style="max-width:300px;min-height:38px;" />
                  <select id="admin-prod-media-type" class="form-control" style="width:auto;min-height:38px;">
                    <option value="image">Foto</option>
                    <option value="video">Vídeo</option>
                  </select>
                  <button type="button" class="btn btn-outline btn-sm" id="btn-add-media-url">Adicionar URL</button>
                </div>

                <div style="display:flex;gap:10px;flex-wrap:wrap;" id="admin-prod-media-preview-container">
                  ${AdminState.tempProductMedia.map((m, idx) => `
                    <div style="width:118px;border:${idx === 0 ? '2px solid #806044' : '1px solid var(--border-strong)'};border-radius:6px;overflow:hidden;background:#FFF;position:relative;">
                      ${idx === 0 ? `<span style="position:absolute;top:4px;left:4px;background:#806044;color:#FFF;font-size:0.6rem;font-weight:700;padding:2px 5px;border-radius:3px;z-index:2;">CAPA</span>` : ''}
                      ${m.type === 'video' ? `
                        <div style="height:96px;background:#292522;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:600;">▶ VÍDEO</div>
                      ` : `
                        <img src="${app.escapeHtml(m.url)}" alt="Mídia ${idx + 1}" style="width:100%;height:96px;object-fit:cover;" />
                      `}
                      <div style="display:flex;flex-direction:column;border-top:1px solid var(--border-subtle);">
                        ${idx > 0 ? `
                          <button type="button" data-action-admin="set-primary-media" data-index="${idx}" style="width:100%;font-size:0.68rem;padding:4px;background:#F8F5F0;color:#806044;font-weight:700;border-bottom:1px solid var(--border-subtle);">
                            Definir como Capa
                          </button>
                        ` : ''}
                        <button type="button" data-action-admin="remove-temp-media" data-index="${idx}" style="width:100%;font-size:0.68rem;padding:4px;background:var(--status-danger-bg);color:var(--status-danger-text);font-weight:700;">
                          Remover
                        </button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- ETAPA 3: TAMANHOS, CORES E ESTOQUE POR VARIAÇÃO -->
              <div style="background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;padding:14px;margin-bottom:18px;">
                <span style="font-size:0.82rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#806044;display:block;margin-bottom:10px;">
                  3. Tamanhos, Cores & Estoque Individual por Variação
                </span>

                <div class="admin-form-grid-3">
                  <div>
                    <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Tamanhos (separados por vírgula)</label>
                    <input type="text" name="sizes" id="admin-prod-inp-sizes" class="form-control" required value="${editingProd ? app.escapeHtml((editingProd.sizes || []).join(', ')) : 'P, M, G'}" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Cores (Nome:Hex ou apenas Nome)</label>
                    <input type="text" name="colorsRaw" id="admin-prod-inp-colors" class="form-control" value="${editingProd ? app.escapeHtml((editingProd.colors || []).map((c) => c.name + ':' + c.hex).join(', ')) : 'Off-White:#F7F5F0, Preto:#1B1B1B'}" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Estoque Padrão p/ Novas Variações</label>
                    <div style="display:flex;gap:6px;">
                      <input type="number" name="defaultStockPerVariation" id="admin-prod-inp-defstock" class="form-control" value="${editingProd && editingProd.variations && editingProd.variations[0] ? editingProd.variations[0].stock : 4}" min="0" />
                      <button type="button" class="btn btn-outline btn-sm" id="btn-rebuild-variations" title="Atualizar grade de tamanhos e cores">Gerar Grade</button>
                    </div>
                  </div>
                </div>

                <div style="overflow-x:auto;margin-top:8px;">
                  <table class="admin-variation-matrix" id="admin-variation-matrix-table">
                    <thead>
                      <tr>
                        <th>Tamanho</th>
                        <th>Cor</th>
                        <th>Quantidade em Estoque (Unidades)</th>
                        <th>Disponibilidade</th>
                      </tr>
                    </thead>
                    <tbody id="admin-variation-matrix-body">
                      ${AdminState.tempProductVariations.map((v, vIdx) => `
                        <tr>
                          <td><strong>${app.escapeHtml(v.size)}</strong></td>
                          <td>${app.escapeHtml(v.color)}</td>
                          <td style="max-width:140px;">
                            <input type="number" min="0" class="form-control admin-var-stock-input" data-var-index="${vIdx}" value="${Number(v.stock) || 0}" style="min-height:34px;padding:4px 8px;" />
                          </td>
                          <td>
                            <span class="status-pill ${Number(v.stock) <= 0 ? 'danger' : Number(v.stock) <= 3 ? 'pending' : 'confirmed'}">
                              ${Number(v.stock) <= 0 ? 'Indisponível (0)' : Number(v.stock) <= 3 ? 'Estoque baixo' : 'Disponível'}
                            </span>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- ETAPA 4: DESCRIÇÃO E DETALHES (OPCIONAIS PARA CADASTRO RÁPIDO) -->
              <details style="background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;padding:14px;margin-bottom:18px;" open>
                <summary style="font-size:0.82rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#806044;cursor:pointer;">
                  4. Descrição da Peça, Tecido e Destaques na Vitrine
                </summary>
                <div style="padding-top:12px;">
                  <div class="admin-form-grid-2">
                    <div>
                      <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Resumo Curto (Exibido na ficha)</label>
                      <input type="text" name="shortDescription" class="form-control" value="${editingProd ? app.escapeHtml(editingProd.shortDescription || '') : ''}" placeholder="Ex.: Modelagem fluida com ótimo caimento" />
                    </div>
                    <div>
                      <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Composição do Tecido (Opcional)</label>
                      <input type="text" name="fabricInfo" class="form-control" value="${editingProd ? app.escapeHtml(editingProd.fabricInfo || '') : ''}" placeholder="Ex.: Linho misto com viscose" />
                    </div>
                  </div>
                  <div style="margin-bottom:12px;">
                    <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Descrição Completa e Caimento (Opcional)</label>
                    <textarea name="description" rows="2" class="form-control" placeholder="Detalhes adicionais sobre corte, forro, fechamento e ocasiões de uso...">${editingProd ? app.escapeHtml(editingProd.description || '') : ''}</textarea>
                  </div>
                  <div style="display:flex;gap:18px;flex-wrap:wrap;font-size:0.84rem;">
                    <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
                      <input type="checkbox" name="isFeatured" ${!editingProd || editingProd.isFeatured ? 'checked' : ''} />
                      <span>Destacar na Página Inicial</span>
                    </label>
                    <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
                      <input type="checkbox" name="isNew" ${!editingProd || editingProd.isNew ? 'checked' : ''} />
                      <span>Selo de Lançamento / Novidade</span>
                    </label>
                    <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
                      <input type="checkbox" name="isPromo" id="admin-prod-inp-ispromo" ${editingProd && editingProd.isPromo ? 'checked' : ''} />
                      <span>Ativar Promoção</span>
                    </label>
                    <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
                      <input type="checkbox" name="isDemo" ${editingProd && editingProd.isDemo ? 'checked' : ''} />
                      <span>Marcar como Peça Demonstrativa</span>
                    </label>
                  </div>
                </div>
              </details>

              <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button type="submit" class="btn btn-primary">
                  ${editingProd ? 'Salvar Alterações da Peça' : 'Publicar Peça na Vitrine'}
                </button>
                ${editingProd ? `
                  <button type="button" class="btn btn-outline" id="btn-cancel-edit-product">Cancelar Edição</button>
                ` : ''}
              </div>
            </form>
          </div>

          <!-- Coluna Direita: Pré-visualização ao Vivo de como ficará na Loja -->
          <div class="admin-card" style="position:sticky;top:90px;">
            <span class="section-eyebrow">Simulação em Tempo Real</span>
            <h3 style="font-family:var(--font-serif);font-size:1.35rem;margin-bottom:10px;">Pré-visualização na Loja</h3>
            <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:14px;">
              Veja exatamente como a cliente visualizará este cartão na vitrine da BY ANGÉLY:
            </p>
            <div id="admin-live-product-preview" style="max-width:290px;margin:0 auto;">
              ${app.renderProductCard ? app.renderProductCard(previewProd) : ''}
            </div>
          </div>
        </div>

        <!-- Tabela de Produtos Cadastrados -->
        <div class="admin-card">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
            <h3 style="font-family:var(--font-serif);font-size:1.45rem;">Catálogo Cadastrado (${products.length} peças)</h3>
          </div>
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Capa</th>
                  <th>SKU / Peça</th>
                  <th>Categoria</th>
                  <th>Preço</th>
                  <th>Estoque Total</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                ${products.map((p) => {
                  const firstImg = (p.media && p.media[0]) || { url: '' };
                  const stock = app.getTotalProductStock(p);
                  const statusLabel = p.status === 'published' ? 'Publicado' : p.status === 'draft' ? 'Rascunho' : 'Pausado';
                  return `
                    <tr>
                      <td><img src="${app.escapeHtml(firstImg.url)}" alt="${app.escapeHtml(p.name)}" style="width:48px;height:62px;object-fit:cover;border-radius:6px;border:1px solid var(--border-subtle);" /></td>
                      <td>
                        <strong>${app.escapeHtml(p.name)}</strong>
                        <div style="font-size:0.75rem;color:var(--text-secondary);">${app.escapeHtml(p.sku)} • ${(p.sizes || []).join(', ')} ${p.isDemo ? '• <span style="color:var(--status-warning-text);font-weight:600;">[Demonstração]</span>' : ''}</div>
                      </td>
                      <td>${app.escapeHtml(p.categoryName || p.category)}</td>
                      <td>
                        ${p.isPromo && p.promoPrice ? `<strong>${app.formatBRL(p.promoPrice)}</strong> <s style="font-size:0.75rem;color:var(--text-muted);">${app.formatBRL(p.price)}</s>` : `<strong>${app.formatBRL(p.price)}</strong>`}
                      </td>
                      <td><span class="status-pill ${stock === 0 ? 'danger' : stock <= 3 ? 'pending' : 'confirmed'}">${stock} un.</span></td>
                      <td>
                        <span class="status-pill ${p.status === 'published' ? 'confirmed' : 'pending'}">
                          ${statusLabel}
                        </span>
                      </td>
                      <td>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                          <button type="button" class="btn btn-outline btn-sm" data-action-admin="edit-product" data-product-id="${app.escapeHtml(p.id)}">Editar</button>
                          <button type="button" class="btn btn-subtle btn-sm" data-action-admin="toggle-product-status" data-product-id="${app.escapeHtml(p.id)}">
                            ${p.status === 'published' ? 'Pausar' : 'Publicar'}
                          </button>
                          <button type="button" class="btn btn-danger btn-sm" data-action-admin="delete-product" data-product-id="${app.escapeHtml(p.id)}">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // SEÇÃO 3: CATEGORIAS, BANNERS E CUPONS DE DESCONTO
  // =========================================================================
  function renderCategoriesBannersCouponsSection() {
    const app = window.ByAngelyApp;
    const db = app.getState().db;
    const hero = db.storeSettings.heroBanner || {};
    const sortedCats = [...(db.categories || [])].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    const editingCat = AdminState.editingCategoryId
      ? db.categories.find((c) => c.id === AdminState.editingCategoryId)
      : null;
    const editingCoupon = AdminState.editingCouponId
      ? db.coupons.find((cp) => cp.id === AdminState.editingCouponId)
      : null;
    const subTab = AdminState.categoriesSubTab || 'all';

    return `
      <div>
        <span class="section-eyebrow">Organização de Vitrine e Campanhas</span>
        <h1 style="font-family:var(--font-serif);font-size:2rem;margin-bottom:14px;">Categorias, Banner Principal & Cupons</h1>

        <div class="admin-tabs-bar" role="tablist">
          <button type="button" class="admin-tab-btn ${subTab === 'all' ? 'active' : ''}" data-action-admin="set-cat-subtab" data-subtab="all">Visão Completa</button>
          <button type="button" class="admin-tab-btn ${subTab === 'categories' ? 'active' : ''}" data-action-admin="set-cat-subtab" data-subtab="categories">Categorias & Ordem (${sortedCats.length})</button>
          <button type="button" class="admin-tab-btn ${subTab === 'coupons' ? 'active' : ''}" data-action-admin="set-cat-subtab" data-subtab="coupons">Cupons de Desconto (${(db.coupons || []).length})</button>
          <button type="button" class="admin-tab-btn ${subTab === 'banner' ? 'active' : ''}" data-action-admin="set-cat-subtab" data-subtab="banner">Banner Principal (Hero)</button>
        </div>

        ${(subTab === 'all' || subTab === 'categories') ? `
          <!-- GESTÃO DE CATEGORIAS E ORDEM DE EXIBIÇÃO -->
          <div class="admin-card">
            <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:6px;">
              ${editingCat ? 'Editando Categoria: ' + app.escapeHtml(editingCat.name) : 'Categorias da Loja & Ordem de Apresentação'}
            </h2>
            <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:14px;">
              Organize as categorias, personalize a foto de capa e defina a ordem em que aparecem no topo e na página inicial.
            </p>

            <form id="admin-add-category-form" class="admin-form-grid-4" style="align-items:end;">
              <div>
                <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Nome da Categoria *</label>
                <input type="text" name="name" class="form-control" required placeholder="Ex.: Macacões" value="${editingCat ? app.escapeHtml(editingCat.name) : ''}" />
              </div>
              <div>
                <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">URL da Foto de Capa</label>
                <input type="url" name="imageUrl" class="form-control" placeholder="https://..." value="${editingCat ? app.escapeHtml(editingCat.imageUrl || '') : ''}" />
              </div>
              <div>
                <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Ordem de Exibição</label>
                <input type="number" name="order" min="1" class="form-control" value="${editingCat ? (editingCat.order || 1) : sortedCats.length + 1}" />
              </div>
              <div style="display:flex;gap:6px;">
                <button type="submit" class="btn btn-primary btn-sm" style="flex:1;">${editingCat ? 'Salvar Categoria' : '+ Criar Categoria'}</button>
                ${editingCat ? `<button type="button" class="btn btn-outline btn-sm" id="btn-cancel-edit-cat">Cancelar</button>` : ''}
              </div>
            </form>

            <div style="overflow-x:auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Ordem</th>
                    <th>Capa</th>
                    <th>Categoria</th>
                    <th>Slug</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${sortedCats.map((c, idx) => `
                    <tr>
                      <td><strong>#${idx + 1}</strong></td>
                      <td><img src="${app.escapeHtml(c.imageUrl || '')}" alt="${app.escapeHtml(c.name)}" style="width:44px;height:52px;object-fit:cover;border-radius:6px;border:1px solid var(--border-subtle);" /></td>
                      <td><strong>${app.escapeHtml(c.name)}</strong></td>
                      <td><code>${app.escapeHtml(c.slug)}</code></td>
                      <td>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                          <button type="button" class="btn btn-subtle btn-sm" data-action-admin="move-cat-up" data-cat-id="${app.escapeHtml(c.id)}" ${idx === 0 ? 'disabled' : ''} title="Subir posição">↑</button>
                          <button type="button" class="btn btn-subtle btn-sm" data-action-admin="move-cat-down" data-cat-id="${app.escapeHtml(c.id)}" ${idx === sortedCats.length - 1 ? 'disabled' : ''} title="Descer posição">↓</button>
                          <button type="button" class="btn btn-outline btn-sm" data-action-admin="edit-category" data-cat-id="${app.escapeHtml(c.id)}">Editar</button>
                          <button type="button" class="btn btn-danger btn-sm" data-action-admin="delete-category" data-cat-id="${app.escapeHtml(c.id)}">Remover</button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        ${(subTab === 'all' || subTab === 'coupons') ? `
          <!-- GESTÃO COMPLETA DE CUPONS DE DESCONTO -->
          <div class="admin-card">
            <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:6px;">
              ${editingCoupon ? 'Editando Cupom: ' + app.escapeHtml(editingCoupon.code) : 'Cupons de Desconto & Regras Promocionais'}
            </h2>
            <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:14px;">
              Configure código, percentual ou valor fixo, pedido mínimo, período de validade e limite de usos.
            </p>

            <form id="admin-add-coupon-form">
              <div class="admin-form-grid-4">
                <div>
                  <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Código do Cupom *</label>
                  <input type="text" name="code" class="form-control" required placeholder="Ex.: BEMVINDO10" value="${editingCoupon ? app.escapeHtml(editingCoupon.code) : ''}" style="text-transform:uppercase;" />
                </div>
                <div>
                  <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Tipo de Desconto *</label>
                  <select name="type" class="form-control">
                    <option value="percent" ${!editingCoupon || editingCoupon.type === 'percent' ? 'selected' : ''}>Percentual (%)</option>
                    <option value="fixed" ${editingCoupon && editingCoupon.type === 'fixed' ? 'selected' : ''}>Valor Fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Valor do Desconto *</label>
                  <input type="number" step="0.01" min="1" name="value" class="form-control" required placeholder="Ex.: 10" value="${editingCoupon ? editingCoupon.value : ''}" />
                </div>
                <div>
                  <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Pedido Mínimo (R$)</label>
                  <input type="number" step="0.01" min="0" name="minOrderAmount" class="form-control" value="${editingCoupon ? (editingCoupon.minOrderAmount || 0) : 150}" />
                </div>
              </div>

              <div class="admin-form-grid-4" style="align-items:end;">
                <div>
                  <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Validade Inicial</label>
                  <input type="date" name="startDate" class="form-control" value="${editingCoupon ? app.escapeHtml(editingCoupon.startDate || '2026-01-01') : '2026-01-01'}" />
                </div>
                <div>
                  <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Validade Final</label>
                  <input type="date" name="endDate" class="form-control" value="${editingCoupon ? app.escapeHtml(editingCoupon.endDate || '2026-12-31') : '2026-12-31'}" />
                </div>
                <div>
                  <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Limite de Utilizações</label>
                  <input type="number" min="1" name="usageLimit" class="form-control" value="${editingCoupon ? (editingCoupon.usageLimit || 100) : 100}" />
                </div>
                <div style="display:flex;gap:6px;">
                  <button type="submit" class="btn btn-primary btn-sm" style="flex:1;">${editingCoupon ? 'Salvar Cupom' : '+ Criar Cupom'}</button>
                  ${editingCoupon ? `<button type="button" class="btn btn-outline btn-sm" id="btn-cancel-edit-coupon">Cancelar</button>` : ''}
                </div>
              </div>
            </form>

            <div style="overflow-x:auto;margin-top:12px;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Desconto & Mínimo</th>
                    <th>Validade</th>
                    <th>Utilizações</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${(db.coupons || []).map((cp) => `
                    <tr>
                      <td>
                        <strong>${app.escapeHtml(cp.code)}</strong>
                        ${cp.description ? `<div style="font-size:0.74rem;color:var(--text-secondary);">${app.escapeHtml(cp.description)}</div>` : ''}
                      </td>
                      <td>
                        <strong>${cp.type === 'percent' ? cp.value + '% OFF' : app.formatBRL(cp.value) + ' OFF'}</strong>
                        <div style="font-size:0.74rem;color:var(--text-secondary);">Mínimo: ${app.formatBRL(cp.minOrderAmount || 0)}</div>
                      </td>
                      <td style="font-size:0.78rem;">${app.escapeHtml(cp.startDate || '2026-01-01')} até ${app.escapeHtml(cp.endDate || '2026-12-31')}</td>
                      <td style="font-size:0.78rem;">${Number(cp.usedCount) || 0} / ${Number(cp.usageLimit) || 100}</td>
                      <td><span class="status-pill ${cp.active ? 'confirmed' : 'danger'}">${cp.active ? 'Ativo' : 'Desativado'}</span></td>
                      <td>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                          <button type="button" class="btn btn-outline btn-sm" data-action-admin="edit-coupon" data-coupon-id="${app.escapeHtml(cp.id)}">Editar</button>
                          <button type="button" class="btn btn-subtle btn-sm" data-action-admin="toggle-coupon" data-coupon-id="${app.escapeHtml(cp.id)}">${cp.active ? 'Desativar' : 'Ativar'}</button>
                          <button type="button" class="btn btn-danger btn-sm" data-action-admin="delete-coupon" data-coupon-id="${app.escapeHtml(cp.id)}">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        ${(subTab === 'all' || subTab === 'banner') ? `
          <!-- EDIÇÃO DO BANNER PRINCIPAL (HERO) -->
          <div class="admin-card">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
              <h2 style="font-family:var(--font-serif);font-size:1.45rem;">Banner Principal da Página Inicial (Hero)</h2>
              <span class="status-pill ${hero.isDemoImage ? 'pending' : 'confirmed'}">
                ${hero.isDemoImage ? 'Imagem Demonstrativa (Substituível)' : 'Imagem Oficial da Loja'}
              </span>
            </div>
            <form id="admin-hero-banner-form">
              <div class="admin-form-grid-2">
                <div>
                  <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Subtítulo Superior (Eyebrow)</label>
                  <input type="text" name="eyebrow" class="form-control" value="${app.escapeHtml(hero.eyebrow || '')}" />
                </div>
                <div>
                  <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Título Principal</label>
                  <input type="text" name="title" class="form-control" value="${app.escapeHtml(hero.title || '')}" />
                </div>
              </div>
              <div style="margin-bottom:12px;">
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Texto de Apresentação</label>
                <textarea name="subtitle" rows="2" class="form-control">${app.escapeHtml(hero.subtitle || '')}</textarea>
              </div>
              <div class="admin-form-grid-2">
                <div>
                  <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">URL da Imagem do Banner</label>
                  <input type="text" name="imageUrl" id="admin-hero-img-url" class="form-control" value="${app.escapeHtml(hero.imageUrl || '')}" />
                </div>
                <div>
                  <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Enviar Nova Foto do Dispositivo</label>
                  <input type="file" id="admin-hero-file-input" accept="image/*" class="form-control" />
                </div>
              </div>
              <div style="margin-bottom:14px;">
                <label style="display:inline-flex;align-items:center;gap:6px;font-size:0.84rem;cursor:pointer;">
                  <input type="checkbox" name="isDemoImage" ${hero.isDemoImage ? 'checked' : ''} />
                  <span>Identificar imagem atual como demonstrativa (desmarque ao enviar foto oficial da BY ANGÉLY)</span>
                </label>
              </div>
              <button type="submit" class="btn btn-primary btn-sm">Salvar Banner da Página Inicial</button>
            </form>
          </div>
        ` : ''}
      </div>
    `;
  }

  // =========================================================================
  // SEÇÃO 4: PEDIDOS, STATUS, CÓDIGO DE RASTREIO E TROCAS/DEVOLUÇÕES
  // =========================================================================
  function renderOrdersSection() {
    const app = window.ByAngelyApp;
    const db = app.getState().db;
    const orders = db.orders || [];
    const returns = db.returnRequests || [];
    const currentAdmin = app.getState().currentAdmin;
    const canManageOrders = hasPermission(currentAdmin, 'orders');

    const statusOptions = [
      { value: 'awaiting_whatsapp', label: 'Aguardando confirmação pelo WhatsApp' },
      { value: 'awaiting_confirmation', label: 'Aguardando pagamento' },
      { value: 'paid', label: 'Pagamento confirmado' },
      { value: 'preparing', label: 'Em preparação' },
      { value: 'ready_pickup', label: 'Pronto para retirada' },
      { value: 'shipped', label: 'Enviado' },
      { value: 'delivered', label: 'Concluído' },
      { value: 'cancelled', label: 'Cancelado' }
    ];

    const filteredOrders = orders.filter((o) => {
      if (AdminState.orderFilterStatus !== 'all' && o.status !== AdminState.orderFilterStatus) {
        return false;
      }
      if (AdminState.orderSearchTerm) {
        const q = AdminState.orderSearchTerm.toLowerCase();
        const num = String(o.orderNumber || '').toLowerCase();
        const cName = String((o.customer && o.customer.name) || '').toLowerCase();
        const cPhone = String((o.customer && o.customer.phone) || '').toLowerCase();
        return num.includes(q) || cName.includes(q) || cPhone.includes(q);
      }
      return true;
    });

    return `
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:18px;">
          <div>
            <span class="section-eyebrow">Operação de Vendas e Pós-Venda</span>
            <h1 style="font-family:var(--font-serif);font-size:2rem;">Pedidos, Rastreio & Trocas</h1>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            <input type="search" id="admin-order-search" class="form-control" placeholder="Buscar por código ou cliente..." value="${app.escapeHtml(AdminState.orderSearchTerm)}" style="width:230px;min-height:40px;" />
            <select id="admin-order-filter" class="form-control" style="width:auto;min-height:40px;">
              <option value="all" ${AdminState.orderFilterStatus === 'all' ? 'selected' : ''}>Todos os Status (${orders.length})</option>
              ${statusOptions.map((st) => {
                const count = orders.filter((o) => o.status === st.value).length;
                return `<option value="${st.value}" ${AdminState.orderFilterStatus === st.value ? 'selected' : ''}>${st.label} (${count})</option>`;
              }).join('')}
            </select>
          </div>
        </div>

        <div class="alert-box alert-info" style="margin-bottom:18px;">
          <strong>Regra de Integridade Financeira e de Estoque:</strong> Pedidos recebidos pelo WhatsApp iniciam como <em>"Aguardando confirmação pelo WhatsApp"</em> e nunca são marcados como pagos automaticamente. Ao alterar o status para <strong>"Pagamento confirmado"</strong>, o sistema atualiza automaticamente o estoque das variações vendidas.
        </div>

        ${filteredOrders.length === 0 ? `
          <div class="admin-card" style="text-align:center;padding:36px;">
            <p style="color:var(--text-secondary);">Nenhum pedido encontrado para o filtro selecionado.</p>
          </div>
        ` : filteredOrders.map((ord) => {
          const waCustomerDigits = String((ord.customer && ord.customer.phone) || '').replace(/\D/g, '');
          const waCustomerUrl = waCustomerDigits.length >= 10
            ? `https://wa.me/${waCustomerDigits.startsWith('55') ? waCustomerDigits : '55' + waCustomerDigits}?text=${encodeURIComponent(`Olá ${ord.customer.name || ''}! Aqui é da BY ANGÉLY sobre o seu pedido ${ord.orderNumber}.`)}`
            : '';
          return `
            <div class="admin-card">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;padding-bottom:12px;border-bottom:1px solid var(--border-subtle);margin-bottom:12px;">
                <div>
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <strong style="font-size:1.12rem;">Pedido ${app.escapeHtml(ord.orderNumber)}</strong>
                    <span class="status-pill ${ord.paymentMethod === 'whatsapp' ? 'info' : 'pending'}">
                      ${ord.paymentMethod === 'whatsapp' ? 'Solicitação via WhatsApp' : app.escapeHtml(ord.paymentMethodLabel || ord.paymentMethod)}
                    </span>
                    <span style="font-size:0.78rem;color:var(--text-secondary);">${app.formatDateBR(ord.createdAt)}</span>
                  </div>
                  <div style="font-size:0.85rem;margin-top:4px;">
                    Cliente: <strong>${app.escapeHtml(ord.customer ? ord.customer.name : '-')}</strong> • Tel: ${app.escapeHtml(ord.customer ? ord.customer.phone : '-')} • E-mail: ${app.escapeHtml(ord.customer ? ord.customer.email : '-')}
                    ${waCustomerUrl ? `<a href="${app.escapeHtml(waCustomerUrl)}" target="_blank" rel="noopener noreferrer" style="margin-left:8px;color:#806044;font-weight:700;text-decoration:underline;">Chamar Cliente no WhatsApp ↗</a>` : ''}
                  </div>
                </div>
                <div style="text-align:right;">
                  <span class="status-pill ${ord.status === 'paid' || ord.status === 'delivered' ? 'confirmed' : ord.status === 'cancelled' ? 'danger' : 'pending'}">
                    ${app.escapeHtml(ord.statusLabel || ord.status)}
                  </span>
                  <div style="font-size:1.15rem;font-weight:700;margin-top:4px;color:#806044;">${app.formatBRL(ord.total)}</div>
                </div>
              </div>

              <div class="admin-form-grid-2" style="font-size:0.85rem;margin-bottom:14px;">
                <div>
                  <strong style="display:block;margin-bottom:4px;">Produtos do Pedido:</strong>
                  ${(ord.items || []).map((it) => `
                    <div style="margin-bottom:3px;">• ${it.quantity}x <strong>${app.escapeHtml(it.name)}</strong> (Tam: ${app.escapeHtml(it.size)} | Cor: ${app.escapeHtml(it.color)}) — ${app.formatBRL(it.unitPrice * it.quantity)}</div>
                  `).join('')}
                  ${ord.customerNotes ? `<div style="margin-top:6px;color:var(--text-secondary);"><strong>Observações da cliente:</strong> ${app.escapeHtml(ord.customerNotes)}</div>` : ''}
                  ${ord.customerPaymentNote ? `
                    <div class="alert-box alert-info" style="margin-top:8px;padding:8px 10px;">
                      <strong>Comprovante / Aviso da cliente:</strong> ${app.escapeHtml(ord.customerPaymentNote)}
                    </div>
                  ` : ''}
                </div>
                <div>
                  <div><strong>Forma de Entrega:</strong> ${app.escapeHtml(ord.shipping ? ord.shipping.methodName : '-')}</div>
                  ${ord.shipping && ord.shipping.address ? `
                    <div><strong>Endereço:</strong> ${app.escapeHtml(ord.shipping.address.street || '')}, ${app.escapeHtml(ord.shipping.address.number || '')} — ${app.escapeHtml(ord.shipping.address.neighborhood || '')}, ${app.escapeHtml(ord.shipping.address.cityState || '')} (CEP ${app.escapeHtml(ord.shipping.address.zipCode || '')})</div>
                  ` : ''}
                  <div><strong>Subtotal:</strong> ${app.formatBRL(ord.subtotal || ord.total)} ${ord.discount ? `| <strong>Desconto:</strong> -${app.formatBRL(ord.discount)}` : ''}</div>
                </div>
              </div>

              ${canManageOrders ? `
                <div style="display:grid;grid-template-columns:1.2fr 1.2fr auto;gap:10px;align-items:end;padding-top:12px;border-top:1px solid var(--border-subtle);">
                  <div>
                    <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Atualizar Status do Pedido</label>
                    <select class="form-control" id="ord-status-${app.escapeHtml(ord.id)}" style="min-height:38px;">
                      ${statusOptions.map((st) => `
                        <option value="${st.value}" ${ord.status === st.value ? 'selected' : ''}>${st.label}</option>
                      `).join('')}
                    </select>
                  </div>
                  <div>
                    <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Código de Rastreio (Correios / Transportadora)</label>
                    <input type="text" class="form-control" id="ord-track-${app.escapeHtml(ord.id)}" value="${app.escapeHtml((ord.shipping && ord.shipping.trackingCode) || '')}" placeholder="Ex.: BR123456789BR" style="min-height:38px;" />
                  </div>
                  <button type="button" class="btn btn-primary btn-sm" data-action-admin="save-order-update" data-order-id="${app.escapeHtml(ord.id)}">
                    Salvar Status & Rastreio
                  </button>
                </div>
              ` : ''}

              ${Array.isArray(ord.notificationsLog) && ord.notificationsLog.length > 0 ? `
                <details style="margin-top:10px;padding-top:8px;border-top:1px dashed var(--border-subtle);font-size:0.78rem;">
                  <summary style="cursor:pointer;font-weight:600;color:var(--text-secondary);">Histórico do Pedido (${ord.notificationsLog.length} registro${ord.notificationsLog.length === 1 ? '' : 's'})</summary>
                  <div style="margin-top:6px;display:flex;flex-direction:column;gap:4px;">
                    ${ord.notificationsLog.map((lg) => `
                      <div style="color:var(--text-secondary);">• [${app.formatDateBR(lg.date)}] <strong>${app.escapeHtml(lg.channel)}:</strong> ${app.escapeHtml(lg.message)}</div>
                    `).join('')}
                  </div>
                </details>
              ` : ''}
            </div>
          `;
        }).join('')}

        <!-- Solicitações de Troca, Devolução e Direito de Arrependimento -->
        <div class="admin-card" style="margin-top:24px;">
          <h2 style="font-family:var(--font-serif);font-size:1.5rem;margin-bottom:12px;">Solicitações de Troca e Devolução (${returns.length})</h2>
          ${returns.length === 0 ? `
            <p style="font-size:0.86rem;color:var(--text-secondary);">Nenhuma solicitação de troca ou devolução registrada.</p>
          ` : returns.map((r) => `
            <div style="padding:12px;border:1px solid var(--border-subtle);border-radius:6px;margin-bottom:10px;font-size:0.86rem;">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:6px;">
                <strong>Pedido ${app.escapeHtml(r.orderNumber)} • ${app.escapeHtml(r.customerName)} (${app.escapeHtml(r.type)})</strong>
                <span class="status-pill ${r.status === 'Atendida pela Loja' ? 'confirmed' : 'pending'}">${app.escapeHtml(r.status)}</span>
              </div>
              <p style="color:var(--text-secondary);margin-bottom:8px;">Motivo informado: ${app.escapeHtml(r.reason)}</p>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <input type="text" class="form-control" id="ret-resp-${app.escapeHtml(r.id)}" placeholder="Instruções de devolução/troca para a cliente..." value="${app.escapeHtml(r.ownerResponse || '')}" style="flex:1;min-height:36px;" />
                <button type="button" class="btn btn-primary btn-sm" data-action-admin="respond-return" data-return-id="${app.escapeHtml(r.id)}">Aprovar / Responder</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // SEÇÃO 5: CLIENTES, SAC E PROTEÇÃO DE DADOS PESSOAIS (LGPD)
  // =========================================================================
  function renderCustomersSection() {
    const app = window.ByAngelyApp;
    const db = app.getState().db;
    const customers = db.customers || [];
    const messages = db.contactMessages || [];

    return `
      <div>
        <span class="section-eyebrow">Relacionamento & Privacidade</span>
        <h1 style="font-family:var(--font-serif);font-size:2rem;margin-bottom:16px;">Clientes, Histórico de Compras & SAC (LGPD)</h1>

        <div class="alert-box alert-info">
          <strong>Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018):</strong> Por segurança e minimização de exposição, CPF, telefone e e-mail das clientes são exibidos mascarados por padrão. Clique em <em>"Revelar Dados"</em> apenas quando necessário para faturamento ou despacho.
        </div>

        <div class="admin-card">
          <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:12px;">Clientes Cadastradas (${customers.length})</h2>
          ${customers.length === 0 ? `
            <p style="font-size:0.86rem;color:var(--text-secondary);">Nenhuma cliente cadastrada até o momento.</p>
          ` : `
            <div style="overflow-x:auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Telefone / WhatsApp</th>
                    <th>CPF</th>
                    <th>Marketing (Opt-in)</th>
                    <th>Privacidade</th>
                  </tr>
                </thead>
                <tbody>
                  ${customers.map((c) => {
                    const rev = !!AdminState.revealedCustomers[c.id];
                    return `
                      <tr>
                        <td><strong>${app.escapeHtml(c.name)}</strong></td>
                        <td>${app.escapeHtml(rev ? c.email : maskSensitiveData(c.email, 'email'))}</td>
                        <td>${app.escapeHtml(rev ? c.phone : maskSensitiveData(c.phone, 'phone'))}</td>
                        <td>${app.escapeHtml(rev ? (c.cpf || 'Não informado') : maskSensitiveData(c.cpf || 'Não informado', 'cpf'))}</td>
                        <td>
                          <span class="status-pill ${c.marketingOptIn ? 'confirmed' : 'pending'}">
                            ${c.marketingOptIn ? 'Autorizado (Opt-in)' : 'Não autorizado'}
                          </span>
                        </td>
                        <td>
                          <button type="button" class="btn btn-outline btn-sm" data-action-admin="toggle-reveal-customer" data-cust-id="${app.escapeHtml(c.id)}">
                            ${rev ? 'Ocultar Dados' : 'Revelar Dados'}
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <div class="admin-card">
          <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:12px;">Atendimentos e Dúvidas Recebidas no SAC (${messages.length})</h2>
          ${messages.length === 0 ? `
            <p style="font-size:0.86rem;color:var(--text-secondary);">Nenhuma mensagem de atendimento pendente.</p>
          ` : messages.map((m) => `
            <div style="padding:12px;border:1px solid var(--border-subtle);border-radius:6px;margin-bottom:10px;font-size:0.86rem;">
              <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;">
                <strong>${app.escapeHtml(m.subject)} — ${app.escapeHtml(m.name)} (${app.escapeHtml(m.email)})</strong>
                <span class="status-pill ${m.status === 'Atendido' ? 'confirmed' : 'pending'}">${app.escapeHtml(m.status)}</span>
              </div>
              <p style="margin:6px 0;color:var(--text-secondary);">${app.escapeHtml(m.message)}</p>
              ${m.status !== 'Atendido' ? `
                <button type="button" class="btn btn-outline btn-sm" data-action-admin="mark-sac-done" data-sac-id="${app.escapeHtml(m.id)}">Marcar como Atendido</button>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // SEÇÃO 6: CONFIGURAÇÕES DE VENDA E PAGAMENTO (WHATSAPP, PIX, CARTÃO, RETIRADA)
  // =========================================================================
  function renderPaymentsSection() {
    const app = window.ByAngelyApp;
    const db = app.getState().db;
    const pay = db.paymentSettings;
    const st = db.storeSettings;
    const activePayOpts = app.getAvailableCheckoutPaymentOptions ? app.getAvailableCheckoutPaymentOptions(pay) : [];

    // Gera preview de QR Code Pix em tempo real para a proprietária testar
    const previewKey = (pay.pix.pixKey && !pay.pix.pixKey.toLowerCase().includes('a confirmar'))
      ? pay.pix.pixKey
      : '+5528999871458';
    const previewName = (pay.pix.recipientName && !pay.pix.recipientName.toLowerCase().includes('a confirmar'))
      ? pay.pix.recipientName
      : 'BY ANGELY';
    const samplePayload = window.ByAngelyPix.generatePixPayload({
      pixKey: previewKey,
      keyType: pay.pix.keyType,
      merchantName: previewName,
      merchantCity: pay.pix.recipientCity || 'ITAPERUNA',
      amount: Number(AdminState.pixPreviewAmount) || 289.90,
      txid: (pay.pix.txidPrefix || 'BYANGELY') + 'SIMULADOR'
    });
    const sampleSvg = window.ByAngelyPix.renderQrSvg(samplePayload);

    const methodsOverview = [
      {
        key: 'whatsapp',
        name: 'Atendimento e finalização pelo WhatsApp',
        enabled: !!(pay.whatsapp && pay.whatsapp.enabled),
        diag: app.getPaymentIntegrationStatus ? app.getPaymentIntegrationStatus('whatsapp', pay, st) : { label: 'Integração validada', badgeClass: 'confirmed', detail: '' },
        desc: 'Envia o pedido completo para o WhatsApp oficial (+55 28 99987-1458) e registra como "Aguardando confirmação pelo WhatsApp".'
      },
      {
        key: 'pix',
        name: 'Pix pelo site (QR Code EMV e Copia e Cola)',
        enabled: !!(pay.pix && pay.pix.enabled),
        diag: app.getPaymentIntegrationStatus ? app.getPaymentIntegrationStatus('pix', pay, st) : { label: 'Configurado', badgeClass: 'info', detail: '' },
        desc: 'Gera QR Code EMV oficial no site com o valor exato do pedido.'
      },
      {
        key: 'creditCard',
        name: 'Cartão de crédito pelo site',
        enabled: !!(pay.creditCard && pay.creditCard.enabled),
        diag: app.getPaymentIntegrationStatus ? app.getPaymentIntegrationStatus('creditCard', pay, st) : { label: 'Aguardando configuração', badgeClass: 'pending', detail: '' },
        desc: 'Direciona para o link HTTPS seguro ou provedor de cartão de crédito configurado.'
      },
      {
        key: 'debitCard',
        name: 'Cartão de débito pelo site',
        enabled: !!(pay.debitCard && pay.debitCard.enabled),
        diag: app.getPaymentIntegrationStatus ? app.getPaymentIntegrationStatus('debitCard', pay, st) : { label: 'Aguardando configuração', badgeClass: 'pending', detail: '' },
        desc: 'Direciona para o ambiente HTTPS seguro de cartão de débito configurado.'
      },
      {
        key: 'payOnPickup',
        name: 'Pagamento na retirada (Itaperuna - RJ)',
        enabled: !!(pay.payOnPickup && pay.payOnPickup.enabled),
        diag: app.getPaymentIntegrationStatus ? app.getPaymentIntegrationStatus('payOnPickup', pay, st) : { label: 'Aguardando configuração', badgeClass: 'pending', detail: '' },
        desc: 'Permite pagamento presencial no momento da retirada em Itaperuna - RJ.'
      }
    ];

    return `
      <div>
        <span class="section-eyebrow">Controle de Checkout e Meios de Recebimento</span>
        <h1 style="font-family:var(--font-serif);font-size:2rem;margin-bottom:8px;">CONFIGURAÇÕES DE VENDA E PAGAMENTO</h1>
        <p style="font-size:0.88rem;color:var(--text-secondary);margin-bottom:20px;">
          Escolha individualmente quais formas de pagamento estarão disponíveis para as clientes. <strong>Opções desativadas ou pendentes de configuração não aparecem na tela de finalização da compra.</strong>
        </p>

        ${activePayOpts.length === 0 ? `
          <div class="alert-box alert-danger" id="admin-all-payments-disabled-alert" style="margin-bottom:20px;">
            <strong>ATENÇÃO PROPRIETÁRIA — NENHUMA FORMA DE PAGAMENTO ATIVA:</strong><br/>
            Todas as opções de pagamento estão desativadas ou sem configuração válida no momento. Enquanto nenhuma opção estiver ativa, a finalização de compras na loja ficará bloqueada para as clientes. Ative pelo menos uma opção abaixo (por exemplo, <em>Atendimento e finalização pelo WhatsApp</em>).
          </div>
        ` : `
          <div class="alert-box alert-info" style="margin-bottom:20px;">
            <strong>Resumo atual do Checkout:</strong> As clientes estão visualizando <strong>${activePayOpts.length}</strong> opção(ões) ativa(s): <strong>${activePayOpts.map((o) => app.escapeHtml(o.label)).join(' • ')}</strong>.
            ${activePayOpts.length === 1 && activePayOpts[0].id === 'whatsapp' ? '<br/><em>Modo exclusivo WhatsApp ativo: a etapa de seleção de pagamento online fica oculta e a cliente finaliza diretamente pelo botão "FINALIZAR PEDIDO PELO WHATSAPP".</em>' : ''}
          </div>
        `}

        <!-- Painel de Ativação/Desativação Individual e Status Real da Integração -->
        <div class="admin-card">
          <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:12px;">Controles Individuais de Ativação & Diagnóstico</h2>
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Forma de Venda / Pagamento</th>
                  <th>Estado no Checkout</th>
                  <th>Status da Configuração / Integração</th>
                  <th>Ação Individual</th>
                </tr>
              </thead>
              <tbody>
                ${methodsOverview.map((m) => `
                  <tr>
                    <td>
                      <strong>${app.escapeHtml(m.name)}</strong>
                      <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px;">${app.escapeHtml(m.desc)}</div>
                    </td>
                    <td>
                      <span class="status-pill ${m.enabled ? 'confirmed' : 'pending'}" id="status-badge-${m.key}">
                        ${m.enabled ? 'ATIVADO' : 'DESATIVADO'}
                      </span>
                    </td>
                    <td>
                      <span class="status-pill ${m.diag.badgeClass}">${app.escapeHtml(m.diag.label)}</span>
                      ${m.diag.detail ? `<div style="font-size:0.72rem;color:var(--text-secondary);margin-top:3px;">${app.escapeHtml(m.diag.detail)}</div>` : ''}
                    </td>
                    <td>
                      <button
                        type="button"
                        class="btn ${m.enabled ? 'btn-outline' : 'btn-primary'} btn-sm"
                        data-action-admin="toggle-payment-method"
                        data-method="${m.key}"
                        id="btn-toggle-method-${m.key}"
                      >
                        ${m.enabled ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <form id="admin-payments-form">
          <!-- 1. ATENDIMENTO E FINALIZAÇÃO PELO WHATSAPP -->
          <div class="admin-card">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
              <div>
                <h2 style="font-family:var(--font-serif);font-size:1.45rem;">1. Atendimento e Finalização pelo WhatsApp</h2>
                <span style="font-size:0.76rem;color:var(--status-success-text);font-weight:600;">✓ Integração validada (+55 28 99987-1458) • Preserva também o botão individual na ficha de cada peça</span>
              </div>
              <label style="display:inline-flex;align-items:center;gap:8px;font-weight:700;cursor:pointer;">
                <input type="checkbox" name="whatsappEnabled" ${pay.whatsapp && pay.whatsapp.enabled ? 'checked' : ''} />
                <span>Ativar Finalização pelo WhatsApp</span>
              </label>
            </div>
            <div class="admin-form-grid-2">
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Título Exibido na Finalização</label>
                <input type="text" name="whatsappTitle" class="form-control" value="${app.escapeHtml((pay.whatsapp && pay.whatsapp.title) || 'Atendimento e Finalização pelo WhatsApp')}" />
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Número Oficial Conectado</label>
                <input type="text" class="form-control" readonly value="+55 28 99987-1458 (https://wa.me/5528999871458)" style="background:var(--bg-primary);" />
              </div>
            </div>
            <div>
              <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Instruções Exibidas à Cliente</label>
              <textarea name="whatsappInstructions" rows="2" class="form-control">${app.escapeHtml((pay.whatsapp && pay.whatsapp.instructions) || '')}</textarea>
            </div>
          </div>

          <!-- 2. PIX PELO SITE -->
          <div class="admin-card">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
              <div>
                <h2 style="font-family:var(--font-serif);font-size:1.45rem;">2. Pix pelo Site (QR Code EMV e Copia e Cola)</h2>
                <span style="font-size:0.76rem;color:var(--text-secondary);">Verifique se o Tipo da Chave selecionado corresponde exatamente à chave informada.</span>
              </div>
              <label style="display:inline-flex;align-items:center;gap:8px;font-weight:700;cursor:pointer;">
                <input type="checkbox" name="pixEnabled" ${pay.pix && pay.pix.enabled ? 'checked' : ''} />
                <span>Ativar Pix no Checkout</span>
              </label>
            </div>

            <div class="admin-product-split">
              <div>
                <div class="admin-form-grid-2">
                  <div>
                    <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Tipo da Chave Pix *</label>
                    <select name="pixKeyType" class="form-control">
                      <option value="telefone" ${pay.pix.keyType === 'telefone' ? 'selected' : ''}>Celular / Telefone (+55...)</option>
                      <option value="cnpj" ${pay.pix.keyType === 'cnpj' ? 'selected' : ''}>CNPJ (14 dígitos)</option>
                      <option value="cpf" ${pay.pix.keyType === 'cpf' ? 'selected' : ''}>CPF (11 dígitos)</option>
                      <option value="email" ${pay.pix.keyType === 'email' ? 'selected' : ''}>E-mail</option>
                      <option value="aleatoria" ${pay.pix.keyType === 'aleatoria' ? 'selected' : ''}>Chave Aleatória (EVP)</option>
                    </select>
                  </div>
                  <div>
                    <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Chave Pix da Loja *</label>
                    <input type="text" name="pixKey" class="form-control" required value="${app.escapeHtml(pay.pix.pixKey)}" />
                  </div>
                </div>

                <div class="admin-form-grid-3">
                  <div>
                    <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Nome do Recebedor (Até 25 caract.) *</label>
                    <input type="text" name="pixRecipientName" maxlength="25" class="form-control" required value="${app.escapeHtml(pay.pix.recipientName)}" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Cidade (Padrão EMV)</label>
                    <input type="text" name="pixRecipientCity" maxlength="15" class="form-control" required value="${app.escapeHtml(pay.pix.recipientCity || 'ITAPERUNA')}" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Prefixo Identificador (TXID)</label>
                    <input type="text" name="pixTxidPrefix" maxlength="12" class="form-control" value="${app.escapeHtml(pay.pix.txidPrefix || 'BYANGELY')}" />
                  </div>
                </div>

                <div>
                  <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Instruções Exibidas à Cliente antes do Pagamento</label>
                  <textarea name="pixInstructions" rows="2" class="form-control">${app.escapeHtml(pay.pix.instructions)}</textarea>
                </div>
              </div>

              <!-- Preview Demonstrativo do QR Code Pix no Painel -->
              <div style="background:var(--bg-primary);border:1px dashed var(--border-strong);border-radius:8px;padding:14px;text-align:center;">
                <span class="status-pill pending" style="margin-bottom:6px;">APENAS TESTE VISUAL DO PAINEL</span>
                <strong style="font-size:0.76rem;text-transform:uppercase;display:block;margin-bottom:6px;">Simulador Demonstrativo BR Code</strong>
                <div style="width:140px;margin:0 auto 8px;background:#FFF;padding:8px;border:1px solid var(--border-strong);border-radius:6px;">
                  ${sampleSvg}
                </div>
                <p style="font-size:0.7rem;color:var(--text-secondary);margin-bottom:6px;">
                  Simulação de teste (R$ 289,90 • TXID SIMULADOR). No checkout real da cliente, o QR Code é gerado com o valor exato e código único do pedido.
                </p>
              </div>
            </div>
          </div>

          <!-- 3. CARTÃO DE CRÉDITO PELO SITE -->
          <div class="admin-card">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
              <div>
                <h2 style="font-family:var(--font-serif);font-size:1.45rem;">3. Cartão de Crédito pelo Site</h2>
                <span style="font-size:0.76rem;color:var(--text-secondary);">Requer URL HTTPS real do provedor de pagamento ou chave privada da API antes de ser exibido às clientes.</span>
              </div>
              <label style="display:inline-flex;align-items:center;gap:8px;font-weight:700;cursor:pointer;">
                <input type="checkbox" name="cardEnabled" ${pay.creditCard && pay.creditCard.enabled ? 'checked' : ''} />
                <span>Ativar Cartão de Crédito no Checkout</span>
              </label>
            </div>

            <div class="admin-form-grid-2">
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Nome do Provedor / Gateway de Cartão</label>
                <input type="text" name="cardProviderName" class="form-control" value="${app.escapeHtml(pay.creditCard.providerName || '')}" placeholder="Ex.: InfinitePay, Mercado Pago, PagBank, Stripe" />
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">URL Segura de Checkout Externo (HTTPS)</label>
                <input type="url" name="cardExternalLink" class="form-control" value="${app.escapeHtml(pay.creditCard.externalPaymentLink || '')}" placeholder="https://checkout.seuprovedor.com.br/..." />
              </div>
            </div>

            <div class="admin-form-grid-2">
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Token Secreto da API (Armazenado exclusivamente no Backend)</label>
                <input type="password" name="cardSecretToken" class="form-control" value="" autocomplete="new-password" placeholder="${pay.creditCard.hasSecretCredentials ? '•••••••• (Credencial já salva no servidor)' : 'Opcional: Token privado do gateway'}" />
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Condições de Parcelamento Exibidas</label>
                <input type="text" name="cardInstallmentsInfo" class="form-control" value="${app.escapeHtml(pay.creditCard.installmentsInfo || '')}" />
              </div>
            </div>

            <div>
              <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Instruções para a Cliente</label>
              <textarea name="cardInstructions" rows="2" class="form-control">${app.escapeHtml(pay.creditCard.instructions || '')}</textarea>
            </div>
          </div>

          <!-- 4. CARTÃO DE DÉBITO PELO SITE -->
          <div class="admin-card">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
              <div>
                <h2 style="font-family:var(--font-serif);font-size:1.45rem;">4. Cartão de Débito pelo Site</h2>
                <span style="font-size:0.76rem;color:var(--text-secondary);">Requer URL HTTPS real do provedor de débito antes de ser exibido às clientes.</span>
              </div>
              <label style="display:inline-flex;align-items:center;gap:8px;font-weight:700;cursor:pointer;">
                <input type="checkbox" name="debitEnabled" ${pay.debitCard && pay.debitCard.enabled ? 'checked' : ''} />
                <span>Ativar Cartão de Débito no Checkout</span>
              </label>
            </div>

            <div class="admin-form-grid-2">
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Provedor de Cartão de Débito</label>
                <input type="text" name="debitProviderName" class="form-control" value="${app.escapeHtml((pay.debitCard && pay.debitCard.providerName) || '')}" placeholder="Ex.: Mercado Pago / PagBank" />
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">URL Segura de Pagamento Débito (HTTPS)</label>
                <input type="url" name="debitExternalLink" class="form-control" value="${app.escapeHtml((pay.debitCard && pay.debitCard.externalPaymentLink) || '')}" placeholder="https://..." />
              </div>
            </div>
            <div>
              <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Instruções para a Cliente</label>
              <textarea name="debitInstructions" rows="2" class="form-control">${app.escapeHtml((pay.debitCard && pay.debitCard.instructions) || '')}</textarea>
            </div>
          </div>

          <!-- 5. PAGAMENTO NA RETIRADA -->
          <div class="admin-card">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
              <h2 style="font-family:var(--font-serif);font-size:1.45rem;">5. Pagamento na Retirada (Itaperuna - RJ)</h2>
              <label style="display:inline-flex;align-items:center;gap:8px;font-weight:700;cursor:pointer;">
                <input type="checkbox" name="pickupPayEnabled" ${pay.payOnPickup && pay.payOnPickup.enabled ? 'checked' : ''} />
                <span>Ativar Pagamento na Retirada</span>
              </label>
            </div>
            <div>
              <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Regras e Instruções para Pagamento Presencial</label>
              <textarea name="pickupPayInstructions" rows="2" class="form-control">${app.escapeHtml(pay.payOnPickup.instructions || '')}</textarea>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" id="btn-save-payments-settings">Salvar Configurações de Venda e Pagamento</button>
        </form>
      </div>
    `;
  }

  // =========================================================================
  // SEÇÃO 7: ENTREGA, RETIRADA E NOTIFICAÇÕES TRANSACIONAIS
  // =========================================================================
  function renderShippingSection() {
    const app = window.ByAngelyApp;
    const ship = app.getState().db.shippingSettings;
    const notif = ship.notifications || {};

    return `
      <div>
        <span class="section-eyebrow">Logística & Comunicação</span>
        <h1 style="font-family:var(--font-serif);font-size:2rem;margin-bottom:16px;">Entrega, Retirada & Notificações</h1>

        <div class="alert-box alert-info" style="margin-bottom:18px;">
          <strong>Transparência de Frete e Prazo:</strong> Nenhuma modalidade exibe "Frete Grátis" ou valor/prazo confirmado para a cliente enquanto o <em>Status do Valor</em> estiver marcado como <strong>"Pendente de configuração (A confirmar pela proprietária)"</strong>.
        </div>

        <form id="admin-shipping-form">
          <div class="admin-card">
            <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:12px;">Modalidades de Entrega e Retirada</h2>

            ${(ship.methods || []).map((m, idx) => {
              const isConfirmed = m.priceStatus === 'confirmed';
              return `
                <div style="padding:16px;border:1px solid var(--border-subtle);border-radius:8px;margin-bottom:14px;background:var(--bg-primary);">
                  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                      <strong style="font-size:1rem;">${app.escapeHtml(m.name)}</strong>
                      <span class="status-pill ${m.enabled ? 'confirmed' : 'danger'}">${m.enabled ? 'Ativado' : 'Desativado'}</span>
                      <span class="status-pill ${isConfirmed ? 'info' : 'pending'}">
                        ${isConfirmed ? 'Configurado (Valor: ' + app.formatBRL(m.price) + ')' : 'Pendente de confirmação de valor/prazo'}
                      </span>
                    </div>
                    <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-weight:700;font-size:0.84rem;">
                      <input type="checkbox" name="method_enabled_${idx}" ${m.enabled ? 'checked' : ''} />
                      <span>Disponível no Checkout</span>
                    </label>
                  </div>

                  <div class="admin-form-grid-4">
                    <div>
                      <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Status do Valor e Prazo</label>
                      <select name="method_status_${idx}" class="form-control">
                        <option value="to_confirm" ${m.priceStatus === 'to_confirm' ? 'selected' : ''}>A confirmar pela proprietária</option>
                        <option value="confirmed" ${m.priceStatus === 'confirmed' ? 'selected' : ''}>Confirmado (Exibir R$ e prazo)</option>
                      </select>
                    </div>
                    <div>
                      <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Valor do Frete / Taxa (R$)</label>
                      <input type="number" step="0.01" min="0" name="method_price_${idx}" class="form-control" value="${Number(m.price) || 0}" />
                    </div>
                    <div>
                      <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Região Atendida</label>
                      <input type="text" name="method_region_${idx}" class="form-control" value="${app.escapeHtml(m.region || 'Itaperuna, RJ')}" />
                    </div>
                    <div>
                      <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Prazo Estimado</label>
                      <input type="text" name="method_days_${idx}" class="form-control" value="${app.escapeHtml(m.estimatedDays || '')}" />
                    </div>
                  </div>
                  <div>
                    <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Condições e Observações para a Cliente</label>
                    <input type="text" name="method_desc_${idx}" class="form-control" value="${app.escapeHtml(m.description || '')}" />
                  </div>
                </div>
              `;
            }).join('')}

            <!-- Integrações de Notificações Transacionais -->
            <div style="margin-top:20px;padding-top:18px;border-top:1px solid var(--border-subtle);">
              <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:8px;">Integrações de Notificações Transacionais</h2>
              <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:14px;">
                O sistema nunca afirma que um e-mail automático ou mensagem via API externa foi disparado sem que o serviço esteja configurado e validado. O atendimento direto por clique no WhatsApp (+55 28 99987-1458) e o painel da cliente funcionam independentemente de APIs pagas.
              </p>

              <div class="admin-form-grid-2">
                <div style="padding:14px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--bg-primary);">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <strong>E-mail Transacional (SMTP / API)</strong>
                    <span class="status-pill ${notif.emailServiceConfigured ? 'confirmed' : 'pending'}">
                      ${notif.emailServiceConfigured ? 'Configurado' : 'Pendente de configuração'}
                    </span>
                  </div>
                  <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Provedor / Serviço de E-mail</label>
                  <input type="text" name="emailProviderName" class="form-control" value="${app.escapeHtml(notif.emailProviderName || '')}" placeholder="Ex.: Resend, SendGrid, SMTP Próprio" style="margin-bottom:8px;" />
                  <label style="display:inline-flex;align-items:center;gap:6px;font-size:0.8rem;cursor:pointer;">
                    <input type="checkbox" name="emailServiceConfigured" ${notif.emailServiceConfigured ? 'checked' : ''} />
                    <span>Marcar integração de e-mail como configurada no servidor</span>
                  </label>
                </div>

                <div style="padding:14px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--bg-primary);">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <strong>API WhatsApp Transacional (Disparo Automático)</strong>
                    <span class="status-pill ${notif.whatsappServiceConfigured ? 'confirmed' : 'pending'}">
                      ${notif.whatsappServiceConfigured ? 'Configurado' : 'Indisponível / Pendente (Usando Link Direto wa.me)'}
                    </span>
                  </div>
                  <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Provedor de API (Opcional)</label>
                  <input type="text" name="whatsappProviderName" class="form-control" value="${app.escapeHtml(notif.whatsappProviderName || '')}" placeholder="Opcional — Link direto wa.me já ativo gratuitamente" style="margin-bottom:8px;" />
                  <label style="display:inline-flex;align-items:center;gap:6px;font-size:0.8rem;cursor:pointer;">
                    <input type="checkbox" name="whatsappServiceConfigured" ${notif.whatsappServiceConfigured ? 'checked' : ''} />
                    <span>Marcar API de disparo automático como configurada</span>
                  </label>
                </div>
              </div>
            </div>

            <button type="submit" class="btn btn-primary" style="margin-top:14px;">Salvar Entrega, Retirada e Notificações</button>
          </div>
        </form>
      </div>
    `;
  }

  // =========================================================================
  // SEÇÃO 8: IDENTIDADE VISUAL, LOGOTIPO E DADOS DA LOJA
  // =========================================================================
  function renderBrandingSection() {
    const app = window.ByAngelyApp;
    const st = app.getState().db.storeSettings;
    const pendingLegal = isPendingConfirmationText(st.legalName);
    const pendingCnpj = isPendingConfirmationText(st.cnpj);
    const pendingAddress = isPendingConfirmationText(st.addressLine);

    return `
      <div>
        <span class="section-eyebrow">Identidade Visual & Dados Oficiais</span>
        <h1 style="font-family:var(--font-serif);font-size:2rem;margin-bottom:16px;">Logotipo, Marca & Dados da Loja</h1>

        ${(pendingLegal || pendingCnpj || pendingAddress) ? `
          <div class="alert-box alert-warning" style="margin-bottom:18px;">
            <strong>Campos Empresariais Pendentes de Preenchimento:</strong>
            ${pendingLegal ? ' • Razão Social' : ''}
            ${pendingCnpj ? ' • CNPJ' : ''}
            ${pendingAddress ? ' • Endereço completo de retirada em Itaperuna' : ''}.
            Preencha abaixo quando desejar; o sistema nunca inventa dados empresariais.
          </div>
        ` : ''}

        <form id="admin-branding-form">
          <div class="admin-card">
            <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:10px;">Apresentação da Marca BY ANGÉLY (Cabeçalho e Rodapé)</h2>
            <div class="admin-form-grid-2" style="align-items:center;">
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Modo de Exibição do Logotipo</label>
                <select name="logoMode" id="admin-brand-logomode" class="form-control" style="margin-bottom:10px;">
                  <option value="typography" ${st.logoMode === 'typography' ? 'selected' : ''}>Tipografia Editorial Elegante (BY ANGÉLY)</option>
                  <option value="image" ${st.logoMode === 'image' ? 'selected' : ''}>Arquivo de Logotipo Enviado (Imagem)</option>
                </select>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Enviar Logotipo Oficial (PNG, SVG, WebP)</label>
                <input type="file" id="admin-logo-upload" accept="image/*" class="form-control" />
              </div>
              <div style="background:var(--bg-primary);border:1px solid var(--border-subtle);padding:20px;border-radius:8px;text-align:center;">
                <span style="font-size:0.7rem;text-transform:uppercase;color:var(--text-muted);display:block;margin-bottom:8px;">Pré-visualização no Cabeçalho</span>
                <div id="admin-brand-live-header-preview" style="padding:12px;background:#FFF;border:1px solid var(--border-subtle);border-radius:6px;">
                  ${st.logoMode === 'image' && st.logoUrl ? `
                    <img src="${app.escapeHtml(st.logoUrl)}" alt="Logotipo By Angély" style="max-height:54px;margin:0 auto;" />
                  ` : `
                    <span class="brand-wordmark"><span class="brand-by">BY</span><span class="brand-angely">ANGÉLY</span></span>
                  `}
                </div>
              </div>
            </div>
          </div>

          <div class="admin-card">
            <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:12px;">Dados Empresariais, Endereço e Contatos Oficiais</h2>
            <div class="admin-form-grid-3">
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Nome da Loja</label>
                <input type="text" name="brandName" class="form-control" value="${app.escapeHtml(st.brandName || 'BY ANGÉLY')}" />
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">
                  Razão Social ${pendingLegal ? '<span class="status-pill pending" style="font-size:0.65rem;padding:1px 6px;">Pendente</span>' : ''}
                </label>
                <input type="text" name="legalName" class="form-control" value="${app.escapeHtml(st.legalName || '')}" />
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">
                  CNPJ ${pendingCnpj ? '<span class="status-pill pending" style="font-size:0.65rem;padding:1px 6px;">Pendente</span>' : ''}
                </label>
                <input type="text" name="cnpj" class="form-control" value="${app.escapeHtml(st.cnpj || '')}" />
              </div>
            </div>

            <div class="admin-form-grid-2">
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">
                  Endereço Físico / Retirada (Itaperuna - RJ) ${pendingAddress ? '<span class="status-pill pending" style="font-size:0.65rem;padding:1px 6px;">Pendente</span>' : ''}
                </label>
                <input type="text" name="addressLine" class="form-control" value="${app.escapeHtml(st.addressLine || '')}" />
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Horário de Atendimento</label>
                <input type="text" name="businessHours" class="form-control" value="${app.escapeHtml(st.businessHours || '')}" />
              </div>
            </div>

            <div class="admin-form-grid-3">
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">WhatsApp Oficial</label>
                <input type="text" name="whatsapp" class="form-control" value="${app.escapeHtml(st.whatsapp || '+55 28 99987-1458')}" />
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">E-mail Comercial (SAC)</label>
                <input type="email" name="email" class="form-control" value="${app.escapeHtml(st.email || 'byangely1@gmail.com')}" />
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Instagram Oficial</label>
                <input type="text" name="instagramHandle" class="form-control" value="${app.escapeHtml(st.instagramHandle || '@_by.angely')}" />
              </div>
            </div>

            <div style="margin-bottom:14px;">
              <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Texto da Barra Superior de Avisos</label>
              <input type="text" name="announcementBar" class="form-control" value="${app.escapeHtml(st.announcementBar || '')}" />
            </div>

            <button type="submit" class="btn btn-primary">Salvar Identidade e Dados da Loja</button>
          </div>
        </form>
      </div>
    `;
  }

  // =========================================================================
  // SEÇÃO 9: POLÍTICAS E DOCUMENTOS LEGAIS (COM DETECTOR DE PENDÊNCIAS)
  // =========================================================================
  function renderPoliciesEditorSection() {
    const app = window.ByAngelyApp;
    const pol = app.getState().db.policies;
    const subTab = AdminState.policiesSubTab || 'all';

    const sections = [
      { key: 'privacy', label: 'Privacidade e LGPD', obj: pol.privacy },
      { key: 'terms', label: 'Termos de Uso', obj: pol.terms },
      { key: 'shippingPolicy', label: 'Entrega e Retirada', obj: pol.shippingPolicy },
      { key: 'returnsPolicy', label: 'Trocas e Devoluções', obj: pol.returnsPolicy }
    ];

    const visibleSections = subTab === 'all' ? sections : sections.filter((s) => s.key === subTab);

    return `
      <div>
        <span class="section-eyebrow">Conformidade Legal & Transparência</span>
        <h1 style="font-family:var(--font-serif);font-size:2rem;margin-bottom:12px;">Políticas, Termos & Pendências Jurídicas</h1>

        <div class="alert-box alert-warning">
          ${app.escapeHtml(pol.legalDisclaimer)}
        </div>

        <div class="admin-tabs-bar" role="tablist">
          <button type="button" class="admin-tab-btn ${subTab === 'all' ? 'active' : ''}" data-action-admin="set-pol-subtab" data-subtab="all">Todos os Documentos</button>
          ${sections.map((s) => {
            const pendCount = countPolicyPlaceholders(s.obj);
            return `
              <button type="button" class="admin-tab-btn ${subTab === s.key ? 'active' : ''}" data-action-admin="set-pol-subtab" data-subtab="${s.key}">
                <span>${app.escapeHtml(s.label)}</span>
                ${pendCount > 0 ? `<span class="status-pill pending" style="font-size:0.65rem;padding:1px 6px;">${pendCount} pendente(s)</span>` : ''}
              </button>
            `;
          }).join('')}
        </div>

        <form id="admin-policies-form">
          ${visibleSections.map((s) => {
            const pendCount = countPolicyPlaceholders(s.obj);
            return `
              <div class="admin-card">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
                  <div>
                    <h2 style="font-family:var(--font-serif);font-size:1.45rem;">${app.escapeHtml(s.obj.title)}</h2>
                    <span class="status-pill ${!s.obj.needsOwnerConfirmation && pendCount === 0 ? 'confirmed' : 'pending'}">
                      ${!s.obj.needsOwnerConfirmation && pendCount === 0 ? 'Revisada e Confirmada' : `Requer revisão (${pendCount} trecho(s) [A CONFIRMAR] no texto)`}
                    </span>
                  </div>
                  <label style="display:inline-flex;align-items:center;gap:8px;font-weight:600;font-size:0.84rem;cursor:pointer;">
                    <input type="checkbox" name="confirmed_${s.key}" ${!s.obj.needsOwnerConfirmation ? 'checked' : ''} />
                    <span>Marcar como Revisada pela Proprietária</span>
                  </label>
                </div>

                ${Array.isArray(s.obj.pendingFields) && s.obj.pendingFields.length > 0 && s.obj.needsOwnerConfirmation ? `
                  <div style="background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:0.8rem;">
                    <strong>Checklist de campos a preencher neste documento:</strong>
                    <ul style="margin:4px 0 0 18px;color:var(--text-secondary);">
                      ${s.obj.pendingFields.map((pf) => `<li>${app.escapeHtml(pf)}</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}

                ${(s.obj.content || []).map((block, bIdx) => `
                  <div style="margin-bottom:10px;">
                    <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">${app.escapeHtml(block.heading)}</label>
                    <textarea name="policy_${s.key}_${bIdx}" rows="3" class="form-control">${app.escapeHtml(block.body)}</textarea>
                  </div>
                `).join('')}
              </div>
            `;
          }).join('')}
          <button type="submit" class="btn btn-primary">Salvar e Atualizar Políticas da Loja</button>
        </form>
      </div>
    `;
  }

  // =========================================================================
  // SEÇÃO 10: EQUIPE AUTORIZADA E PERMISSÕES (RBAC — MENOR PRIVILÉGIO)
  // =========================================================================
  function renderUsersSection() {
    const app = window.ByAngelyApp;
    const currentAdmin = app.getState().currentAdmin || {};
    const users = (app.getState().db.adminUsers || []).filter(
      (u) => u && u.email !== 'proprietaria@byangely.local' && u.email !== 'equipe@byangely.local'
    );

    return `
      <div>
        <span class="section-eyebrow">Segurança, Perfis & Menor Privilégio</span>
        <h1 style="font-family:var(--font-serif);font-size:2rem;margin-bottom:16px;">Equipe, Permissões & Senha de Acesso</h1>

        <div class="alert-box alert-info" style="margin-bottom:18px;">
          <strong>Política de Segurança e Menor Privilégio:</strong> Senhas e hashes criptográficos nunca são exibidos em tabelas ou relatórios. Separe o acesso entre <em>Proprietária</em>, <em>Administração</em>, <em>Atendimento</em> e <em>Colaboradora</em> conforme a função de cada pessoa.
        </div>

        <!-- Alterar Senha da Conta Atual -->
        <div class="admin-card">
          <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:8px;">Alterar Senha da Minha Conta (${app.escapeHtml(currentAdmin.email || '')})</h2>
          <p style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:14px;">
            Defina abaixo sua nova senha pessoal de acesso ao Painel Administrativo.
          </p>
          <form id="admin-change-own-password-form" class="admin-form-grid-3" style="align-items:end;margin-bottom:0;">
            <div>
              <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Nova Senha *</label>
              <input type="password" name="newPassword" class="form-control" required minlength="6" autocomplete="new-password" placeholder="Mínimo de 6 caracteres" />
            </div>
            <div>
              <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Confirmar Nova Senha *</label>
              <input type="password" name="confirmPassword" class="form-control" required minlength="6" autocomplete="new-password" placeholder="Repita a nova senha" />
            </div>
            <button type="submit" class="btn btn-primary btn-sm">Atualizar Minha Senha</button>
          </form>
        </div>

        <!-- Cadastrar e Gerenciar Equipe -->
        <div class="admin-card">
          <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:12px;">Autorizar Membro da Equipe</h2>
          <form id="admin-add-user-form" class="admin-form-grid-4" style="align-items:end;margin-bottom:20px;">
            <div>
              <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Nome Completo *</label>
              <input type="text" name="name" class="form-control" required placeholder="Nome da colaboradora" />
            </div>
            <div>
              <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">E-mail de Login *</label>
              <input type="email" name="email" class="form-control" required placeholder="nome@email.com" />
            </div>
            <div>
              <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Senha Inicial *</label>
              <input type="password" name="password" class="form-control" required minlength="6" autocomplete="new-password" placeholder="Mín. 6 caracteres" />
            </div>
            <div>
              <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Perfil de Acesso (RBAC)</label>
              <div style="display:flex;gap:6px;">
                <select name="role" class="form-control">
                  <option value="support">Atendimento (Pedidos e Clientes)</option>
                  <option value="collaborator">Colaboradora (Produtos e Estoque)</option>
                  <option value="admin">Administração (Operação Geral)</option>
                  <option value="owner">Proprietária (Acesso Total)</option>
                </select>
                <button type="submit" class="btn btn-primary btn-sm">+ Autorizar</button>
              </div>
            </div>
          </form>

          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil de Acesso</th>
                  <th>Módulos Permitidos</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                ${users.map((u) => {
                  const isMainOwner = u.email && u.email.toLowerCase() === 'byangely1@gmail.com';
                  const isActive = u.active !== false;
                  return `
                    <tr>
                      <td><strong>${app.escapeHtml(u.name)}</strong></td>
                      <td><code>${app.escapeHtml(u.email)}</code></td>
                      <td>${app.escapeHtml(u.roleLabel || u.role)}</td>
                      <td style="font-size:0.76rem;color:var(--text-secondary);">${(u.permissions || []).join(', ')}</td>
                      <td>
                        <span class="status-pill ${isActive ? 'confirmed' : 'danger'}">
                          ${isActive ? 'Ativo' : 'Acesso Revogado'}
                        </span>
                      </td>
                      <td>
                        ${isMainOwner ? `
                          <span style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">Conta Principal Protegida</span>
                        ` : `
                          <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            <button type="button" class="btn btn-outline btn-sm" data-action-admin="toggle-user-active" data-user-id="${app.escapeHtml(u.id)}">
                              ${isActive ? 'Revogar Acesso' : 'Reativar'}
                            </button>
                            <button type="button" class="btn btn-danger btn-sm" data-action-admin="delete-user" data-user-id="${app.escapeHtml(u.id)}">
                              Remover
                            </button>
                          </div>
                        `}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // EVENTOS E AÇÕES DO PAINEL ADMINISTRATIVO
  // =========================================================================
  function bindAdminWorkspaceEvents(containerEl) {
    const app = window.ByAngelyApp;
    const db = app.getState().db;

    // Botão Mobile de abrir/fechar menu lateral do Admin
    containerEl.querySelector('#btn-toggle-admin-sidebar')?.addEventListener('click', () => {
      AdminState.mobileMenuOpen = !AdminState.mobileMenuOpen;
      renderAdminView(containerEl);
    });

    // Navegação lateral e atalhos rápidos do Admin
    containerEl.querySelectorAll('[data-admin-section]').forEach((btn) => {
      btn.addEventListener('click', () => {
        AdminState.activeSection = btn.getAttribute('data-admin-section');
        AdminState.mobileMenuOpen = false;
        AdminState.editingProductId = null;
        AdminState.editingCategoryId = null;
        AdminState.editingCouponId = null;
        AdminState.tempProductMedia = [];
        AdminState.tempProductVariations = [];
        renderAdminView(containerEl);
      });
    });

    // Logout Admin
    containerEl.querySelector('#btn-admin-logout')?.addEventListener('click', () => {
      app.getState().currentAdmin = null;
      sessionStorage.removeItem(STORAGE_KEY_ADMIN_SESSION);
      app.updateGlobalChrome();
      app.showToast('Sessão administrativa encerrada.');
      app.navigateTo('home');
    });

    // Remover todos os produtos demonstrativos com confirmação
    const removeDemosHandler = () => {
      if (!window.confirm('Deseja realmente remover os produtos demonstrativos do catálogo? Seus produtos próprios serão preservados.')) {
        return;
      }
      db.products = db.products.filter((p) => !p.isDemo);
      app.saveDatabase('Produtos demonstrativos removidos pela proprietária.');
      app.updateGlobalChrome();
      app.showToast('Produtos demonstrativos removidos!', 'success');
      renderAdminView(containerEl);
    };
    containerEl.querySelector('#btn-quick-remove-demos')?.addEventListener('click', removeDemosHandler);
    containerEl.querySelector('#btn-remove-all-demos')?.addEventListener('click', removeDemosHandler);

    // Atualiza a Pré-visualização ao Vivo do Produto enquanto a proprietária preenche o formulário
    function updateLiveProductPreview() {
      const previewBox = containerEl.querySelector('#admin-live-product-preview');
      if (!previewBox || !app.renderProductCard) return;
      const nameVal = containerEl.querySelector('#admin-prod-inp-name')?.value || 'Nova Peça BY ANGÉLY';
      const skuVal = containerEl.querySelector('#admin-prod-inp-sku')?.value || 'ANG-NOVO';
      const catSel = containerEl.querySelector('#admin-prod-inp-category');
      const catSlug = catSel ? catSel.value : 'vestidos';
      const catName = catSel && catSel.options[catSel.selectedIndex] ? catSel.options[catSel.selectedIndex].text : 'Vestidos';
      const priceVal = Number(containerEl.querySelector('#admin-prod-inp-price')?.value) || 299.90;
      const promoVal = Number(containerEl.querySelector('#admin-prod-inp-promo')?.value) || null;
      const isPromoVal = Boolean(containerEl.querySelector('#admin-prod-inp-ispromo')?.checked || (promoVal && promoVal < priceVal));
      const sizesRaw = containerEl.querySelector('#admin-prod-inp-sizes')?.value || 'P, M, G';
      const colorsRaw = containerEl.querySelector('#admin-prod-inp-colors')?.value || 'Off-White:#F7F5F0';

      const sizes = sizesRaw.split(',').map((s) => s.trim()).filter(Boolean);
      const colors = colorsRaw.split(',').map((pair) => {
        const [n, h] = pair.split(':').map((x) => x.trim());
        return { name: n || 'Padrão', hex: h || '#806044' };
      });

      const previewObj = {
        id: AdminState.editingProductId || 'preview-temp',
        sku: skuVal,
        name: nameVal,
        category: catSlug,
        categoryName: catName,
        price: priceVal,
        promoPrice: promoVal,
        isPromo: isPromoVal,
        isFeatured: true,
        isNew: true,
        isDemo: false,
        status: 'published',
        sizes,
        colors,
        variations: AdminState.tempProductVariations,
        media: AdminState.tempProductMedia.length > 0
          ? AdminState.tempProductMedia
          : [{ type: 'image', url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=85', alt: nameVal }]
      };
      previewBox.innerHTML = app.renderProductCard(previewObj);
    }

    ['#admin-prod-inp-name', '#admin-prod-inp-sku', '#admin-prod-inp-category', '#admin-prod-inp-price', '#admin-prod-inp-promo', '#admin-prod-inp-sizes', '#admin-prod-inp-colors', '#admin-prod-inp-ispromo'].forEach((sel) => {
      const el = containerEl.querySelector(sel);
      if (el) {
        el.addEventListener('input', updateLiveProductPreview);
        el.addEventListener('change', updateLiveProductPreview);
      }
    });

    // Bind eventos da matriz de estoque por variação
    function bindVariationMatrixInputs() {
      const totalBadge = containerEl.querySelector('#admin-matrix-total-badge');
      containerEl.querySelectorAll('.admin-var-stock-input').forEach((inp) => {
        inp.addEventListener('input', () => {
          const idx = Number(inp.getAttribute('data-var-index'));
          if (AdminState.tempProductVariations[idx]) {
            AdminState.tempProductVariations[idx].stock = Math.max(0, Number(inp.value) || 0);
          }
          const sum = AdminState.tempProductVariations.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
          if (totalBadge) totalBadge.textContent = `${sum} un.`;
          updateLiveProductPreview();
        });
      });
    }
    bindVariationMatrixInputs();

    // Botão "Gerar Grade" reconstrói a matriz de Tamanhos × Cores preservando estoques já digitados
    containerEl.querySelector('#btn-rebuild-variations')?.addEventListener('click', () => {
      const sizes = String(containerEl.querySelector('#admin-prod-inp-sizes')?.value || 'P, M, G')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const colors = String(containerEl.querySelector('#admin-prod-inp-colors')?.value || 'Off-White:#F7F5F0')
        .split(',')
        .map((pair) => {
          const [n, h] = pair.split(':').map((x) => x.trim());
          return { name: n || 'Padrão', hex: h || '#806044' };
        });
      const defStock = Number(containerEl.querySelector('#admin-prod-inp-defstock')?.value) || 0;
      AdminState.tempProductVariations = buildDefaultVariationMatrix(sizes, colors, AdminState.tempProductVariations, defStock);

      const tbody = containerEl.querySelector('#admin-variation-matrix-body');
      if (tbody) {
        tbody.innerHTML = AdminState.tempProductVariations.map((v, vIdx) => `
          <tr>
            <td><strong>${app.escapeHtml(v.size)}</strong></td>
            <td>${app.escapeHtml(v.color)}</td>
            <td style="max-width:140px;">
              <input type="number" min="0" class="form-control admin-var-stock-input" data-var-index="${vIdx}" value="${Number(v.stock) || 0}" style="min-height:34px;padding:4px 8px;" />
            </td>
            <td>
              <span class="status-pill ${Number(v.stock) <= 0 ? 'danger' : Number(v.stock) <= 3 ? 'pending' : 'confirmed'}">
                ${Number(v.stock) <= 0 ? 'Indisponível (0)' : Number(v.stock) <= 3 ? 'Estoque baixo' : 'Disponível'}
              </span>
            </td>
          </tr>
        `).join('');
        bindVariationMatrixInputs();
        updateLiveProductPreview();
      }
      app.showToast('Grade de variações (Tamanho × Cor) atualizada!', 'success');
    });

    // Atualiza galeria de mídia sem perder dados digitados no formulário
    function refreshTempMediaPreview() {
      const countEl = containerEl.querySelector('#admin-prod-media-count');
      if (countEl) {
        countEl.textContent = `2. Galeria de Fotos & Vídeo (${AdminState.tempProductMedia.length} adicionada${AdminState.tempProductMedia.length === 1 ? '' : 's'})`;
      }
      const previewEl = containerEl.querySelector('#admin-prod-media-preview-container');
      if (!previewEl) return;
      previewEl.innerHTML = AdminState.tempProductMedia.map((m, idx) => `
        <div style="width:118px;border:${idx === 0 ? '2px solid #806044' : '1px solid var(--border-strong)'};border-radius:6px;overflow:hidden;background:#FFF;position:relative;">
          ${idx === 0 ? `<span style="position:absolute;top:4px;left:4px;background:#806044;color:#FFF;font-size:0.6rem;font-weight:700;padding:2px 5px;border-radius:3px;z-index:2;">CAPA</span>` : ''}
          ${m.type === 'video' ? `
            <div style="height:96px;background:#292522;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:600;">▶ VÍDEO</div>
          ` : `
            <img src="${app.escapeHtml(m.url)}" alt="Mídia ${idx + 1}" style="width:100%;height:96px;object-fit:cover;" />
          `}
          <div style="display:flex;flex-direction:column;border-top:1px solid var(--border-subtle);">
            ${idx > 0 ? `
              <button type="button" data-action-admin="set-primary-media" data-index="${idx}" style="width:100%;font-size:0.68rem;padding:4px;background:#F8F5F0;color:#806044;font-weight:700;border-bottom:1px solid var(--border-subtle);">
                Definir como Capa
              </button>
            ` : ''}
            <button type="button" data-action-admin="remove-temp-media" data-index="${idx}" style="width:100%;font-size:0.68rem;padding:4px;background:var(--status-danger-bg);color:var(--status-danger-text);font-weight:700;">
              Remover
            </button>
          </div>
        </div>
      `).join('');

      previewEl.querySelectorAll('[data-action-admin="set-primary-media"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-index'));
          if (idx > 0 && AdminState.tempProductMedia[idx]) {
            const chosen = AdminState.tempProductMedia.splice(idx, 1)[0];
            AdminState.tempProductMedia.unshift(chosen);
            refreshTempMediaPreview();
            updateLiveProductPreview();
          }
        });
      });

      previewEl.querySelectorAll('[data-action-admin="remove-temp-media"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-index'));
          AdminState.tempProductMedia.splice(idx, 1);
          refreshTempMediaPreview();
          updateLiveProductPreview();
        });
      });
      updateLiveProductPreview();
    }

    // Upload de fotos/vídeos de produto via arquivo local
    const prodFileInput = containerEl.querySelector('#admin-prod-file-upload');
    if (prodFileInput) {
      prodFileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        files.forEach(async (file) => {
          const isVideo = file.type.startsWith('video/');
          let cloudUrl = null;
          if (window.ByAngelyCloud && window.ByAngelyCloud.uploadMediaToSupabaseStorage) {
            cloudUrl = await window.ByAngelyCloud.uploadMediaToSupabaseStorage(file);
          }
          if (cloudUrl) {
            AdminState.tempProductMedia.push({
              type: isVideo ? 'video' : 'image',
              url: cloudUrl,
              alt: file.name,
              credit: 'Acervo Oficial BY ANGÉLY'
            });
            refreshTempMediaPreview();
            app.showToast('Mídia carregada com sucesso!', 'success');
            return;
          }
          if (!isVideo && window.ByAngelyCloud && window.ByAngelyCloud.compressImageFileToDataUrl) {
            const compressedUrl = await window.ByAngelyCloud.compressImageFileToDataUrl(file, 960, 0.82);
            if (compressedUrl) {
              AdminState.tempProductMedia.push({
                type: 'image',
                url: compressedUrl,
                alt: file.name,
                credit: 'Acervo Oficial BY ANGÉLY'
              });
              refreshTempMediaPreview();
              app.showToast('Foto adicionada ao produto!', 'success');
              return;
            }
          }
          const reader = new FileReader();
          reader.onload = (ev) => {
            AdminState.tempProductMedia.push({
              type: isVideo ? 'video' : 'image',
              url: ev.target.result,
              alt: file.name,
              credit: 'Acervo Oficial BY ANGÉLY'
            });
            refreshTempMediaPreview();
            app.showToast('Mídia adicionada ao produto!', 'success');
          };
          reader.readAsDataURL(file);
        });
      });
    }

    // Adicionar mídia por URL
    containerEl.querySelector('#btn-add-media-url')?.addEventListener('click', () => {
      const urlInp = containerEl.querySelector('#admin-prod-media-url');
      const typeSel = containerEl.querySelector('#admin-prod-media-type');
      if (urlInp && urlInp.value.trim()) {
        AdminState.tempProductMedia.push({
          type: typeSel ? typeSel.value : 'image',
          url: urlInp.value.trim(),
          alt: 'Mídia do produto BY ANGÉLY',
          credit: 'Cadastrado pela administração'
        });
        urlInp.value = '';
        refreshTempMediaPreview();
        app.showToast('Mídia adicionada à galeria!', 'success');
      }
    });

    // Botão "+ Cadastrar Novo Produto"
    containerEl.querySelector('#btn-new-product-form')?.addEventListener('click', () => {
      AdminState.editingProductId = null;
      AdminState.tempProductMedia = [];
      AdminState.tempProductVariations = [];
      renderAdminView(containerEl);
      containerEl.querySelector('input[name="name"]')?.focus();
    });

    // Salvar Produto (Novo ou Editado)
    const prodForm = containerEl.querySelector('#admin-product-form');
    if (prodForm) {
      prodForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(prodForm);

        const pendingUrlInp = containerEl.querySelector('#admin-prod-media-url');
        const pendingTypeSel = containerEl.querySelector('#admin-prod-media-type');
        if (pendingUrlInp && pendingUrlInp.value && pendingUrlInp.value.trim()) {
          AdminState.tempProductMedia.push({
            type: pendingTypeSel ? pendingTypeSel.value : 'image',
            url: pendingUrlInp.value.trim(),
            alt: fd.get('name') || 'Peça BY ANGÉLY',
            credit: 'Acervo BY ANGÉLY'
          });
          pendingUrlInp.value = '';
        }

        const catSlug = fd.get('category');
        const catObj = db.categories.find((c) => c.slug === catSlug);
        const sizes = String(fd.get('sizes') || 'P, M, G')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const colors = String(fd.get('colorsRaw') || 'Preto:#1B1B1B')
          .split(',')
          .map((pair) => {
            const [n, h] = pair.split(':').map((x) => x.trim());
            return { name: n || 'Padrão', hex: h || '#806044' };
          });
        const defStock = Number(fd.get('defaultStockPerVariation')) || 0;
        const variations = buildDefaultVariationMatrix(sizes, colors, AdminState.tempProductVariations, defStock);

        const mediaToSave = AdminState.tempProductMedia.length > 0
          ? JSON.parse(JSON.stringify(AdminState.tempProductMedia))
          : [{ type: 'image', url: (catObj && catObj.imageUrl) || 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80', alt: fd.get('name') }];

        const normalPrice = Math.max(0.01, Number(fd.get('price')) || 299.90);
        const promoPriceVal = fd.get('promoPrice') && Number(fd.get('promoPrice')) > 0 ? Number(fd.get('promoPrice')) : null;
        const isPromoChecked = fd.get('isPromo') === 'on' || Boolean(promoPriceVal && promoPriceVal < normalPrice);

        const prodPayload = {
          id: AdminState.editingProductId || 'prod-' + Date.now(),
          sku: String(fd.get('sku') || '').trim(),
          name: String(fd.get('name') || '').trim(),
          category: catSlug,
          categoryName: catObj ? catObj.name : catSlug,
          style: fd.get('style') || 'Alfaiataria',
          price: normalPrice,
          promoPrice: promoPriceVal,
          isPromo: isPromoChecked,
          isFeatured: fd.get('isFeatured') === 'on',
          isNew: fd.get('isNew') === 'on',
          isDemo: fd.get('isDemo') === 'on',
          status: fd.get('status') || 'published',
          shortDescription: fd.get('shortDescription') || fd.get('name'),
          description: fd.get('description') || '',
          fabricInfo: fd.get('fabricInfo') || '',
          careInfo: 'Seguir instruções da etiqueta interna.',
          sizes,
          colors,
          variations,
          media: mediaToSave,
          sizeChart: window.ByAngelySeed.DEFAULT_SIZE_CHART,
          salesCount: AdminState.editingProductId
            ? Number((db.products.find((x) => x.id === AdminState.editingProductId) || {}).salesCount) || 0
            : 0,
          createdAt: new Date().toISOString()
        };

        if (!prodPayload.isDemo && catObj && mediaToSave[0] && mediaToSave[0].type === 'image' && mediaToSave[0].url) {
          catObj.imageUrl = mediaToSave[0].url;
        }

        if (AdminState.editingProductId) {
          const idx = db.products.findIndex((p) => p.id === AdminState.editingProductId);
          if (idx >= 0) db.products[idx] = { ...db.products[idx], ...prodPayload };
        } else {
          db.products.unshift(prodPayload);
        }

        AdminState.editingProductId = null;
        AdminState.tempProductMedia = [];
        AdminState.tempProductVariations = [];
        await app.saveDatabase('Produto salvo no catálogo: ' + prodPayload.name);
        app.updateGlobalChrome();
        app.showToast(`"${prodPayload.name}" salvo com sucesso!`, 'success');
        renderAdminView(containerEl);
      });
    }

    containerEl.querySelector('#btn-cancel-edit-product')?.addEventListener('click', () => {
      AdminState.editingProductId = null;
      AdminState.tempProductMedia = [];
      AdminState.tempProductVariations = [];
      renderAdminView(containerEl);
    });

    containerEl.querySelector('#btn-cancel-edit-cat')?.addEventListener('click', () => {
      AdminState.editingCategoryId = null;
      renderAdminView(containerEl);
    });

    containerEl.querySelector('#btn-cancel-edit-coupon')?.addEventListener('click', () => {
      AdminState.editingCouponId = null;
      renderAdminView(containerEl);
    });

    // Ações delegadas do Admin
    containerEl.querySelectorAll('[data-action-admin]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.getAttribute('data-action-admin');

        if (act === 'set-cat-subtab') {
          AdminState.categoriesSubTab = btn.getAttribute('data-subtab') || 'all';
          renderAdminView(containerEl);
        }
        if (act === 'set-pol-subtab') {
          AdminState.policiesSubTab = btn.getAttribute('data-subtab') || 'all';
          renderAdminView(containerEl);
        }
        if (act === 'set-primary-media') {
          const idx = Number(btn.getAttribute('data-index'));
          if (idx > 0 && AdminState.tempProductMedia[idx]) {
            const item = AdminState.tempProductMedia.splice(idx, 1)[0];
            AdminState.tempProductMedia.unshift(item);
            refreshTempMediaPreview();
          }
        }
        if (act === 'remove-temp-media') {
          const idx = Number(btn.getAttribute('data-index'));
          AdminState.tempProductMedia.splice(idx, 1);
          refreshTempMediaPreview();
        }
        if (act === 'edit-product') {
          const pid = btn.getAttribute('data-product-id');
          const p = db.products.find((x) => x.id === pid);
          if (p) {
            AdminState.activeSection = 'products';
            AdminState.editingProductId = p.id;
            AdminState.tempProductMedia = JSON.parse(JSON.stringify(p.media || []));
            AdminState.tempProductVariations = JSON.parse(JSON.stringify(p.variations || []));
            renderAdminView(containerEl);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
        if (act === 'toggle-product-status') {
          const pid = btn.getAttribute('data-product-id');
          const p = db.products.find((x) => x.id === pid);
          if (p) {
            p.status = p.status === 'published' ? 'paused' : 'published';
            app.saveDatabase(`Status do produto ${p.name} alterado para ${p.status}`);
            app.showToast('Status de publicação atualizado!', 'success');
            renderAdminView(containerEl);
          }
        }
        if (act === 'delete-product') {
          const pid = btn.getAttribute('data-product-id');
          const p = db.products.find((x) => x.id === pid);
          if (p && window.confirm(`Confirmar exclusão da peça "${p.name}"?`)) {
            db.products = db.products.filter((x) => x.id !== pid);
            app.saveDatabase('Produto removido do catálogo: ' + p.name);
            app.updateGlobalChrome();
            app.showToast('Peça excluída do catálogo.');
            renderAdminView(containerEl);
          }
        }
        if (act === 'edit-category') {
          AdminState.editingCategoryId = btn.getAttribute('data-cat-id');
          renderAdminView(containerEl);
        }
        if (act === 'move-cat-up' || act === 'move-cat-down') {
          const cid = btn.getAttribute('data-cat-id');
          db.categories.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
          const idx = db.categories.findIndex((c) => c.id === cid);
          const swapIdx = act === 'move-cat-up' ? idx - 1 : idx + 1;
          if (idx >= 0 && swapIdx >= 0 && swapIdx < db.categories.length) {
            const temp = db.categories[idx];
            db.categories[idx] = db.categories[swapIdx];
            db.categories[swapIdx] = temp;
            db.categories.forEach((c, i) => { c.order = i + 1; });
            app.saveDatabase('Ordem de apresentação das categorias atualizada.');
            app.updateGlobalChrome();
            renderAdminView(containerEl);
          }
        }
        if (act === 'delete-category') {
          const cid = btn.getAttribute('data-cat-id');
          if (window.confirm('Deseja remover esta categoria?')) {
            db.categories = db.categories.filter((c) => c.id !== cid);
            app.saveDatabase('Categoria removida.');
            app.updateGlobalChrome();
            renderAdminView(containerEl);
          }
        }
        if (act === 'edit-coupon') {
          AdminState.editingCouponId = btn.getAttribute('data-coupon-id');
          renderAdminView(containerEl);
        }
        if (act === 'toggle-coupon') {
          const cpid = btn.getAttribute('data-coupon-id');
          const cp = db.coupons.find((c) => c.id === cpid);
          if (cp) {
            cp.active = !cp.active;
            app.saveDatabase(`Cupom ${cp.code} ${cp.active ? 'ativado' : 'desativado'}`);
            renderAdminView(containerEl);
          }
        }
        if (act === 'delete-coupon') {
          const cpid = btn.getAttribute('data-coupon-id');
          if (window.confirm('Deseja excluir este cupom de desconto?')) {
            db.coupons = db.coupons.filter((c) => c.id !== cpid);
            app.saveDatabase('Cupom removido.');
            renderAdminView(containerEl);
          }
        }
        if (act === 'save-order-update') {
          const oid = btn.getAttribute('data-order-id');
          const ord = db.orders.find((o) => o.id === oid);
          const stSel = containerEl.querySelector(`#ord-status-${oid}`);
          const trInp = containerEl.querySelector(`#ord-track-${oid}`);
          if (ord && stSel) {
            const prevStatus = ord.status;
            const newStatus = stSel.value;
            ord.status = newStatus;
            ord.statusLabel = stSel.options[stSel.selectedIndex].text;
            if (trInp && ord.shipping) ord.shipping.trackingCode = trInp.value.trim();

            syncOrderStockAndSales(db, ord, prevStatus, newStatus);

            ord.notificationsLog = ord.notificationsLog || [];
            ord.notificationsLog.push({
              date: new Date().toISOString(),
              channel: 'Painel Administrativo (' + (app.getState().currentAdmin ? app.getState().currentAdmin.name : 'Admin') + ')',
              message: `Status atualizado para "${ord.statusLabel}"${ord.shipping && ord.shipping.trackingCode ? ' | Rastreio: ' + ord.shipping.trackingCode : ''}`
            });
            app.saveDatabase(`Pedido ${ord.orderNumber} atualizado para ${ord.statusLabel}`);
            app.showToast(`Pedido ${ord.orderNumber} atualizado com sucesso!`, 'success');
            renderAdminView(containerEl);
          }
        }
        if (act === 'respond-return') {
          const rid = btn.getAttribute('data-return-id');
          const ret = db.returnRequests.find((r) => r.id === rid);
          const inp = containerEl.querySelector(`#ret-resp-${rid}`);
          if (ret && inp) {
            ret.ownerResponse = inp.value.trim() || 'Solicitação aprovada. Confira as instruções enviadas.';
            ret.status = 'Atendida pela Loja';
            app.saveDatabase(`Solicitação de troca/devolução do pedido ${ret.orderNumber} respondida.`);
            app.showToast('Resposta registrada na Área da Cliente!', 'success');
            renderAdminView(containerEl);
          }
        }
        if (act === 'toggle-reveal-customer') {
          const cid = btn.getAttribute('data-cust-id');
          AdminState.revealedCustomers[cid] = !AdminState.revealedCustomers[cid];
          if (AdminState.revealedCustomers[cid]) {
            app.saveDatabase(`Acesso auditado LGPD: dados da cliente ${cid} consultados no painel.`);
          }
          renderAdminView(containerEl);
        }
        if (act === 'mark-sac-done') {
          const sid = btn.getAttribute('data-sac-id');
          const msg = db.contactMessages.find((m) => m.id === sid);
          if (msg) {
            msg.status = 'Atendido';
            app.saveDatabase('Mensagem de SAC marcada como atendida.');
            renderAdminView(containerEl);
          }
        }
        if (act === 'toggle-payment-method') {
          const methodKey = btn.getAttribute('data-method');
          if (methodKey && db.paymentSettings && db.paymentSettings[methodKey]) {
            db.paymentSettings.paymentConfigVersion = 2;
            const willEnable = !db.paymentSettings[methodKey].enabled;
            const diag = app.getPaymentIntegrationStatus ? app.getPaymentIntegrationStatus(methodKey, db.paymentSettings, db.storeSettings) : { stateCode: 'configured' };
            if (willEnable && (diag.stateCode === 'pending' || diag.stateCode === 'error')) {
              app.showToast(`Atenção: "${methodKey}" foi marcado como ativo, mas ${diag.detail || 'requer preenchimento dos dados abaixo para aparecer no checkout.'}`, 'warning');
            }
            db.paymentSettings[methodKey].enabled = willEnable;
            const stateStr = willEnable ? 'ATIVADA' : 'DESATIVADA';
            app.saveDatabase(`Forma de pagamento "${methodKey}" ${stateStr} pela proprietária.`);
            if (!willEnable || (diag.stateCode !== 'pending' && diag.stateCode !== 'error')) {
              app.showToast(`Forma de pagamento ${stateStr.toLowerCase()} com sucesso!`, 'success');
            }
            renderAdminView(containerEl);
          }
        }
        if (act === 'toggle-user-active') {
          const uid = btn.getAttribute('data-user-id');
          const u = (db.adminUsers || []).find((x) => x.id === uid);
          if (u && u.email.toLowerCase() !== 'byangely1@gmail.com') {
            u.active = u.active === false ? true : false;
            app.saveDatabase(`Acesso do usuário ${u.email} ${u.active ? 'reativado' : 'revogado'}.`);
            app.showToast(`Acesso de ${u.name} ${u.active ? 'reativado' : 'revogado'}.`, 'info');
            renderAdminView(containerEl);
          }
        }
        if (act === 'delete-user') {
          const uid = btn.getAttribute('data-user-id');
          const u = (db.adminUsers || []).find((x) => x.id === uid);
          if (u && u.email.toLowerCase() !== 'byangely1@gmail.com' && window.confirm(`Remover a conta administrativa de ${u.name} (${u.email})?`)) {
            db.adminUsers = db.adminUsers.filter((x) => x.id !== uid);
            app.saveDatabase(`Usuário administrativo removido: ${u.email}`);
            app.showToast('Conta administrativa removida.');
            renderAdminView(containerEl);
          }
        }
      });
    });

    // Filtro e busca de pedidos
    containerEl.querySelector('#admin-order-filter')?.addEventListener('change', (e) => {
      AdminState.orderFilterStatus = e.target.value;
      renderAdminView(containerEl);
    });
    containerEl.querySelector('#admin-order-search')?.addEventListener('input', (e) => {
      AdminState.orderSearchTerm = e.target.value;
      renderAdminView(containerEl);
    });

    // Criar ou Editar Categoria
    const addCatForm = containerEl.querySelector('#admin-add-category-form');
    if (addCatForm) {
      addCatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(addCatForm);
        const name = String(fd.get('name') || '').trim();
        const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
        const imageUrl = String(fd.get('imageUrl') || '').trim() || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80';
        const order = Number(fd.get('order')) || db.categories.length + 1;

        if (AdminState.editingCategoryId) {
          const cat = db.categories.find((c) => c.id === AdminState.editingCategoryId);
          if (cat) {
            cat.name = name;
            cat.imageUrl = imageUrl;
            cat.order = order;
          }
          AdminState.editingCategoryId = null;
          app.saveDatabase('Categoria atualizada: ' + name);
          app.showToast('Categoria atualizada!', 'success');
        } else {
          db.categories.push({
            id: 'cat-' + Date.now(),
            slug,
            name,
            imageUrl,
            order
          });
          app.saveDatabase('Nova categoria criada: ' + name);
          app.showToast('Categoria criada com sucesso!', 'success');
        }
        app.updateGlobalChrome();
        renderAdminView(containerEl);
      });
    }

    // Criar ou Editar Cupom
    const addCouponForm = containerEl.querySelector('#admin-add-coupon-form');
    if (addCouponForm) {
      addCouponForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(addCouponForm);
        const code = String(fd.get('code') || '').trim().toUpperCase();
        const type = fd.get('type') || 'percent';
        const value = Number(fd.get('value')) || 10;
        const minOrderAmount = Number(fd.get('minOrderAmount')) || 0;
        const startDate = fd.get('startDate') || '2026-01-01';
        const endDate = fd.get('endDate') || '2026-12-31';
        const usageLimit = Number(fd.get('usageLimit')) || 100;

        if (AdminState.editingCouponId) {
          const cp = db.coupons.find((c) => c.id === AdminState.editingCouponId);
          if (cp) {
            cp.code = code;
            cp.type = type;
            cp.value = value;
            cp.minOrderAmount = minOrderAmount;
            cp.startDate = startDate;
            cp.endDate = endDate;
            cp.usageLimit = usageLimit;
          }
          AdminState.editingCouponId = null;
          app.saveDatabase('Cupom atualizado: ' + code);
          app.showToast('Cupom atualizado com sucesso!', 'success');
        } else {
          db.coupons.push({
            id: 'coup-' + Date.now(),
            code,
            type,
            value,
            minOrderAmount,
            startDate,
            endDate,
            usageLimit,
            usedCount: 0,
            active: true
          });
          app.saveDatabase('Novo cupom criado: ' + code);
          app.showToast('Cupom criado com sucesso!', 'success');
        }
        renderAdminView(containerEl);
      });
    }

    // Upload de imagem do Hero Banner
    const heroFile = containerEl.querySelector('#admin-hero-file-input');
    if (heroFile) {
      heroFile.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const urlInput = containerEl.querySelector('#admin-hero-img-url');
          if (urlInput) urlInput.value = ev.target.result;
          const demoChk = containerEl.querySelector('input[name="isDemoImage"]');
          if (demoChk) demoChk.checked = false;
        };
        reader.readAsDataURL(file);
      });
    }

    // Salvar Hero Banner
    const heroForm = containerEl.querySelector('#admin-hero-banner-form');
    if (heroForm) {
      heroForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(heroForm);
        db.storeSettings.heroBanner = {
          ...db.storeSettings.heroBanner,
          eyebrow: fd.get('eyebrow'),
          title: fd.get('title'),
          subtitle: fd.get('subtitle'),
          imageUrl: fd.get('imageUrl'),
          isDemoImage: fd.get('isDemoImage') === 'on'
        };
        app.saveDatabase('Banner principal da Home atualizado.');
        app.showToast('Banner principal atualizado com sucesso!', 'success');
        renderAdminView(containerEl);
      });
    }

    // Salvar Configurações de Venda e Pagamento
    const payForm = containerEl.querySelector('#admin-payments-form');
    if (payForm) {
      payForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(payForm);
        db.paymentSettings.paymentConfigVersion = 2;

        db.paymentSettings.whatsapp = db.paymentSettings.whatsapp || {};
        db.paymentSettings.whatsapp.enabled = fd.get('whatsappEnabled') === 'on';
        db.paymentSettings.whatsapp.title = fd.get('whatsappTitle') || 'Atendimento e Finalização pelo WhatsApp';
        db.paymentSettings.whatsapp.instructions = fd.get('whatsappInstructions') || '';

        let pixKeyType = fd.get('pixKeyType') || 'telefone';
        const pixKeyVal = String(fd.get('pixKey') || '').trim();
        if (pixKeyVal.startsWith('+55') && pixKeyType === 'cnpj') {
          pixKeyType = 'telefone';
        }

        db.paymentSettings.pix.enabled = fd.get('pixEnabled') === 'on';
        db.paymentSettings.pix.keyType = pixKeyType;
        db.paymentSettings.pix.pixKey = pixKeyVal;
        db.paymentSettings.pix.recipientName = fd.get('pixRecipientName');
        db.paymentSettings.pix.recipientCity = fd.get('pixRecipientCity') || 'ITAPERUNA';
        db.paymentSettings.pix.txidPrefix = fd.get('pixTxidPrefix') || 'BYANGELY';
        db.paymentSettings.pix.instructions = fd.get('pixInstructions');

        db.paymentSettings.creditCard.enabled = fd.get('cardEnabled') === 'on';
        db.paymentSettings.creditCard.providerName = String(fd.get('cardProviderName') || '').trim();
        db.paymentSettings.creditCard.externalPaymentLink = String(fd.get('cardExternalLink') || '').trim();
        db.paymentSettings.creditCard.installmentsInfo = fd.get('cardInstallmentsInfo');
        db.paymentSettings.creditCard.instructions = fd.get('cardInstructions');

        const secretToken = String(fd.get('cardSecretToken') || '').trim();
        if (secretToken) {
          db.paymentSettings.creditCard.hasSecretCredentials = true;
          try {
            const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';
            await fetch(`${apiBase}/api/admin/payment-credentials`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                creditCardProvider: db.paymentSettings.creditCard.providerName,
                creditCardSecretToken: secretToken
              })
            });
          } catch (err) {}
        }

        db.paymentSettings.debitCard = db.paymentSettings.debitCard || {};
        db.paymentSettings.debitCard.enabled = fd.get('debitEnabled') === 'on';
        db.paymentSettings.debitCard.providerName = String(fd.get('debitProviderName') || '').trim();
        db.paymentSettings.debitCard.externalPaymentLink = String(fd.get('debitExternalLink') || '').trim();
        db.paymentSettings.debitCard.instructions = fd.get('debitInstructions');

        db.paymentSettings.payOnPickup.enabled = fd.get('pickupPayEnabled') === 'on';
        db.paymentSettings.payOnPickup.instructions = fd.get('pickupPayInstructions');

        await app.saveDatabase('Configurações de venda e pagamento atualizadas pela proprietária.');
        app.showToast('Configurações de Venda e Pagamento salvas com sucesso!', 'success');
        renderAdminView(containerEl);
      });
    }

    // Salvar Configurações de Entrega e Notificações
    const shipForm = containerEl.querySelector('#admin-shipping-form');
    if (shipForm) {
      shipForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(shipForm);
        (db.shippingSettings.methods || []).forEach((m, idx) => {
          m.enabled = fd.get(`method_enabled_${idx}`) === 'on';
          m.priceStatus = fd.get(`method_status_${idx}`);
          m.price = Number(fd.get(`method_price_${idx}`)) || 0;
          m.region = fd.get(`method_region_${idx}`) || m.region;
          m.estimatedDays = fd.get(`method_days_${idx}`);
          m.description = fd.get(`method_desc_${idx}`) || m.description;
        });
        db.shippingSettings.notifications = db.shippingSettings.notifications || {};
        db.shippingSettings.notifications.emailProviderName = fd.get('emailProviderName') || '';
        db.shippingSettings.notifications.emailServiceConfigured = fd.get('emailServiceConfigured') === 'on';
        db.shippingSettings.notifications.whatsappProviderName = fd.get('whatsappProviderName') || '';
        db.shippingSettings.notifications.whatsappServiceConfigured = fd.get('whatsappServiceConfigured') === 'on';

        app.saveDatabase('Configurações de entrega, retirada e notificações atualizadas.');
        app.showToast('Configurações de entrega e notificações salvas!', 'success');
        renderAdminView(containerEl);
      });
    }

    // Upload do Logotipo Oficial da Loja
    const logoUpload = containerEl.querySelector('#admin-logo-upload');
    if (logoUpload) {
      logoUpload.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          db.storeSettings.logoUrl = ev.target.result;
          db.storeSettings.logoMode = 'image';
          app.saveDatabase('Logotipo oficial enviado pela proprietária.');
          app.updateGlobalChrome();
          app.showToast('Logotipo oficial carregado e aplicado!', 'success');
          renderAdminView(containerEl);
        };
        reader.readAsDataURL(file);
      });
    }

    // Salvar Identidade e Dados da Loja
    const brandForm = containerEl.querySelector('#admin-branding-form');
    if (brandForm) {
      brandForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(brandForm);
        db.storeSettings.brandName = fd.get('brandName') || 'BY ANGÉLY';
        db.storeSettings.logoMode = fd.get('logoMode');
        db.storeSettings.legalName = fd.get('legalName');
        db.storeSettings.cnpj = fd.get('cnpj');
        db.storeSettings.addressLine = fd.get('addressLine');
        db.storeSettings.businessHours = fd.get('businessHours');
        db.storeSettings.whatsapp = fd.get('whatsapp');
        db.storeSettings.email = fd.get('email');
        db.storeSettings.instagramHandle = fd.get('instagramHandle');
        db.storeSettings.announcementBar = fd.get('announcementBar');

        app.saveDatabase('Dados oficiais da marca BY ANGÉLY atualizados.');
        app.updateGlobalChrome();
        app.showToast('Dados da loja atualizados em todo o site!', 'success');
        renderAdminView(containerEl);
      });
    }

    // Salvar Políticas Legais (com validação de placeholders pendentes)
    const polForm = containerEl.querySelector('#admin-policies-form');
    if (polForm) {
      polForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(polForm);
        let warnedPlaceholders = false;
        ['privacy', 'terms', 'shippingPolicy', 'returnsPolicy'].forEach((key) => {
          const pObj = db.policies[key];
          if (pObj) {
            (pObj.content || []).forEach((block, bIdx) => {
              const val = fd.get(`policy_${key}_${bIdx}`);
              if (val !== null) block.body = val;
            });
            const remainingPlaceholders = countPolicyPlaceholders(pObj);
            const wantsConfirmed = fd.get(`confirmed_${key}`) === 'on';
            if (wantsConfirmed && remainingPlaceholders > 0) {
              warnedPlaceholders = true;
              pObj.needsOwnerConfirmation = true;
            } else if (fd.has(`confirmed_${key}`) || AdminState.policiesSubTab === 'all' || AdminState.policiesSubTab === key) {
              pObj.needsOwnerConfirmation = !wantsConfirmed;
            }
          }
        });
        app.saveDatabase('Políticas legais e condições comerciais atualizadas.');
        if (warnedPlaceholders) {
          app.showToast('Textos salvos! Atenção: ainda existem campos [A CONFIRMAR PELA PROPRIETÁRIA] que precisam ser preenchidos antes de marcar como revisado.', 'warning');
        } else {
          app.showToast('Políticas salvas com sucesso!', 'success');
        }
        renderAdminView(containerEl);
      });
    }

    // Alterar senha da própria conta administrativa
    const changeOwnPassForm = containerEl.querySelector('#admin-change-own-password-form');
    if (changeOwnPassForm) {
      changeOwnPassForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(changeOwnPassForm);
        const p1 = String(fd.get('newPassword') || '');
        const p2 = String(fd.get('confirmPassword') || '');
        if (p1.length < 6) {
          app.showToast('A nova senha deve ter pelo menos 6 caracteres.', 'warning');
          return;
        }
        if (p1 !== p2) {
          app.showToast('As senhas digitadas não coincidem.', 'danger');
          return;
        }
        const curr = app.getState().currentAdmin;
        const found = (db.adminUsers || []).find((u) => u.email.toLowerCase() === curr.email.toLowerCase());
        if (found) {
          found.customPassword = p1;
          app.saveDatabase('Senha administrativa atualizada (' + found.email + ').');
          app.showToast('Sua senha administrativa foi atualizada com sucesso!', 'success');
          changeOwnPassForm.reset();
        }
      });
    }

    // Adicionar Novo Membro da Equipe Autorizado
    const userForm = containerEl.querySelector('#admin-add-user-form');
    if (userForm) {
      userForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(userForm);
        const email = String(fd.get('email') || '').trim().toLowerCase();
        if ((db.adminUsers || []).some((u) => u.email && u.email.toLowerCase() === email)) {
          app.showToast('Já existe um usuário administrativo cadastrado com este e-mail.', 'warning');
          return;
        }
        const role = fd.get('role') || 'support';
        const roleDef = ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS.support;

        db.adminUsers.push({
          id: 'adm-' + Date.now(),
          name: String(fd.get('name') || '').trim(),
          email,
          customPassword: fd.get('password'),
          role,
          roleLabel: roleDef.roleLabel,
          permissions: [...roleDef.permissions],
          active: true
        });
        app.saveDatabase('Novo membro da equipe autorizado no painel: ' + email);
        app.showToast('Membro da equipe autorizado com sucesso!', 'success');
        renderAdminView(containerEl);
      });
    }
  }

  window.ByAngelyAdmin = {
    renderAdminView
  };
})();
