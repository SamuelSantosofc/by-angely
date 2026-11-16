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
      { id: 'analytics', group: 'OPERAÇÃO', label: 'ANÁLISE DA LOJA', icon: ADMIN_ICONS.dashboard, perm: null },
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
          <span style="font-size:0.65rem;text-transform:uppercase;letter-spacing:0.12em;color:#A1A1AA;display:block;">Painel Administrativo • BY ANGÉLY</span>
          <strong style="font-size:0.95rem;">${app.escapeHtml(activeNavObj.label)}</strong>
        </div>
        <button type="button" class="btn btn-outline btn-sm" id="btn-toggle-admin-sidebar" style="background:rgba(255,255,255,0.1);color:#F7F7F7;border-color:rgba(255,255,255,0.35);min-height:38px;padding:6px 12px;">
          ${ADMIN_ICONS.menu}
          <span>${AdminState.mobileMenuOpen ? 'Fechar Menu' : 'Menu do Painel'}</span>
        </button>
      </div>

      <div class="admin-shell">
        <aside class="admin-sidebar ${AdminState.mobileMenuOpen ? 'mobile-open' : ''}" aria-label="Menu do Painel Administrativo">
          <div style="padding:6px 12px 14px;border-bottom:1px solid rgba(228, 228, 231,0.14);margin-bottom:4px;">
            <span style="font-size:0.68rem;letter-spacing:0.14em;text-transform:uppercase;color:#A1A1AA;display:block;">Gestão de Boutique</span>
            <strong style="font-family:var(--font-serif);font-size:1.45rem;color:#FFF;display:block;margin-top:2px;">BY ANGÉLY</strong>
            <span style="font-size:0.78rem;color:#E4E4E7;display:block;margin-top:4px;">${app.escapeHtml(admin.name)}</span>
            <span style="font-size:0.68rem;background:rgba(255, 255, 255,0.22);color:#F7F7F7;padding:2px 8px;border-radius:4px;display:inline-block;margin-top:4px;">${app.escapeHtml(admin.roleLabel)}</span>
          </div>

          ${sidebarButtonsHtml}

          <div style="margin-top:auto;padding-top:16px;border-top:1px solid rgba(228, 228, 231,0.14);display:flex;flex-direction:column;gap:8px;">
            <button type="button" class="btn btn-outline btn-sm" style="background:rgba(255,255,255,0.08);color:#F7F7F7;border-color:rgba(255,255,255,0.3);" data-action="go-view" data-view="home">
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
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const app = window.ByAngelyApp;
      const db = app.getState().db;
      const fd = new FormData(form);
      const email = String(fd.get('email') || '').trim().toLowerCase();
      const password = String(fd.get('password') || '');
      const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';

      try {
        const res = await fetch(apiBase + '/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok && data && data.ok && data.admin) {
          const safeSessionUser = { ...data.admin, token: data.token };
          app.getState().currentAdmin = safeSessionUser;
          sessionStorage.setItem(STORAGE_KEY_ADMIN_SESSION, JSON.stringify(safeSessionUser));
          if (app.loadDatabase) await app.loadDatabase();
          app.updateGlobalChrome();
          app.showToast(`Bem-vinda ao Painel Administrativo, ${safeSessionUser.name}!`, 'success');
          renderAdminView(containerEl);
          return;
        }
      } catch (err) {}

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
      case 'analytics':
        return renderAnalyticsSection();
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
  // CARTÃO DE LIMPEZA PRÉ-ENTREGA (ZERAR DADOS E HISTÓRICOS DE TESTE)
  // =========================================================================
  function renderPreLaunchCleanupCard(db) {
    const ordersCount = Array.isArray(db.orders) ? db.orders.length : 0;
    const pixCount = Array.isArray(db.pixCharges) ? db.pixCharges.length : 0;
    const eventsCount = Array.isArray(db.financialEvents) ? db.financialEvents.length : 0;
    const stockMovCount = Array.isArray(db.stockMovements) ? db.stockMovements.length : 0;
    const analyticsVisitorsCount = db.analytics && db.analytics.visitors ? Object.keys(db.analytics.visitors).length : 0;
    const analyticsEventsCount = db.analytics && Array.isArray(db.analytics.events) ? db.analytics.events.length : 0;
    const auditLogsCount = Array.isArray(db.auditLog) ? db.auditLog.length : 0;
    const contactCount = Array.isArray(db.contactMessages) ? db.contactMessages.length : 0;
    const returnsCount = Array.isArray(db.returnRequests) ? db.returnRequests.length : 0;
    const customersCount = Array.isArray(db.customers) ? db.customers.length : 0;

    return `
      <div class="admin-card" id="admin-prelaunch-cleanup-card" style="margin-top:20px;border:1.5px solid #18181B;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:12px;">
          <div>
            <span class="section-eyebrow">Preparação para Entrega da Loja</span>
            <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:4px;">Limpar Logs e Históricos de Teste</h2>
            <p style="font-size:0.84rem;color:var(--text-secondary);margin:0;">
              Zere todos os registros gerados durante os testes (pedidos cancelados/pagos/pendentes, Pix de teste, eventos, visitas e logs) preservando produtos, fotos, preços, chaves Pix e configurações da loja.
            </p>
          </div>
          <span class="status-pill pending">Uso antes da inauguração</span>
        </div>

        <form id="admin-prelaunch-cleanup-form" style="display:flex;flex-direction:column;gap:10px;">
          <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--bg-primary);cursor:pointer;">
            <input type="checkbox" name="clearOrdersAndFinance" checked style="margin-top:3px;" />
            <div style="font-size:0.84rem;">
              <strong>Pedidos, Cobranças Pix, Eventos e Devoluções</strong>
              <span style="display:block;font-size:0.78rem;color:var(--text-secondary);">
                Remove ${ordersCount} pedido(s), ${pixCount} cobrança(s) Pix, ${eventsCount} evento(s) financeiros/webhook, ${stockMovCount} movimentação(ões) de estoque e ${returnsCount} devolução(ões), zerando o contador de vendas das peças.
              </span>
            </div>
          </label>

          <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--bg-primary);cursor:pointer;margin-left:18px;">
            <input type="checkbox" name="restoreReservedStock" checked style="margin-top:3px;" />
            <div style="font-size:0.82rem;">
              <strong>Restaurar estoque reservado por pedidos de teste</strong>
              <span style="display:block;font-size:0.76rem;color:var(--text-secondary);">
                Devolve automaticamente às peças do catálogo qualquer unidade reservada ou baixada por pedidos de teste que ainda não estavam cancelados.
              </span>
            </div>
          </label>

          <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--bg-primary);cursor:pointer;">
            <input type="checkbox" name="clearAnalytics" checked style="margin-top:3px;" />
            <div style="font-size:0.84rem;">
              <strong>Visitas, Visitantes e Histórico de Análise da Loja</strong>
              <span style="display:block;font-size:0.78rem;color:var(--text-secondary);">
                Zera ${analyticsVisitorsCount} visitante(s) registrado(s) e ${analyticsEventsCount} evento(s) de navegação/funil acumulados nos testes.
              </span>
            </div>
          </label>

          <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--bg-primary);cursor:pointer;">
            <input type="checkbox" name="clearLogsAndSupport" checked style="margin-top:3px;" />
            <div style="font-size:0.84rem;">
              <strong>Logs de Auditoria, Notificações e Mensagens de Atendimento (SAC)</strong>
              <span style="display:block;font-size:0.78rem;color:var(--text-secondary);">
                Limpa ${auditLogsCount} registro(s) de auditoria administrativa e ${contactCount} mensagem(ns) de atendimento.
              </span>
            </div>
          </label>

          <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid var(--border-subtle);border-radius:8px;background:#FFFFFF;cursor:pointer;">
            <input type="checkbox" name="clearTestCustomers" style="margin-top:3px;" />
            <div style="font-size:0.84rem;">
              <strong>Contas de Clientes Cadastradas (${customersCount} conta(s))</strong>
              <span style="display:block;font-size:0.78rem;color:var(--text-secondary);">
                Marque esta opção somente se desejar remover também todos os cadastros de clientes criados durante os testes (não remove contas da administração).
              </span>
            </div>
          </label>

          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:6px;">
            <span style="font-size:0.76rem;color:var(--text-muted);">
              Ação irreversível: produtos, imagens, cupons, políticas e acesso administrativo permanecem salvos.
            </span>
            <button type="submit" class="btn btn-primary" id="btn-execute-prelaunch-cleanup">
              Zerar Histórico de Teste Selecionado
            </button>
          </div>
        </form>
      </div>
    `;
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
            <button type="button" class="btn btn-outline btn-sm" data-action-admin="go-cleanup-card">
              Limpar Histórico de Testes
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
            <div class="kpi-value" style="color:#111111;">${whatsappOrders.length}</div>
            <span style="font-size:0.76rem;color:var(--text-secondary);">Pedidos iniciados via WhatsApp</span>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Produtos Publicados</div>
            <div class="kpi-value">${publishedProducts.length}</div>
            <span style="font-size:0.76rem;color:var(--text-secondary);">De ${products.length} peça(s) no catálogo</span>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Produtos em Promoção</div>
            <div class="kpi-value" style="color:#111111;">${promoProducts.length}</div>
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

        ${renderPreLaunchCleanupCard(db)}
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
                <span style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#111111;display:block;margin-bottom:10px;">
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
                  <strong style="font-size:0.82rem;text-transform:uppercase;letter-spacing:0.06em;color:#111111;" id="admin-prod-media-count">
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
                    <div style="width:118px;border:${idx === 0 ? '2px solid #111111' : '1px solid var(--border-strong)'};border-radius:6px;overflow:hidden;background:#FFF;position:relative;">
                      ${idx === 0 ? `<span style="position:absolute;top:4px;left:4px;background:#111111;color:#FFF;font-size:0.6rem;font-weight:700;padding:2px 5px;border-radius:3px;z-index:2;">CAPA</span>` : ''}
                      ${m.type === 'video' ? `
                        <div style="height:96px;background:#111111;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:600;">▶ VÍDEO</div>
                      ` : `
                        <img src="${app.escapeHtml(m.url)}" alt="Mídia ${idx + 1}" style="width:100%;height:96px;object-fit:cover;" />
                      `}
                      <div style="display:flex;flex-direction:column;border-top:1px solid var(--border-subtle);">
                        ${idx > 0 ? `
                          <button type="button" data-action-admin="set-primary-media" data-index="${idx}" style="width:100%;font-size:0.68rem;padding:4px;background:#F7F7F7;color:#111111;font-weight:700;border-bottom:1px solid var(--border-subtle);">
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
                <span style="font-size:0.82rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#111111;display:block;margin-bottom:10px;">
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
                <summary style="font-size:0.82rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#111111;cursor:pointer;">
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
                    ${waCustomerUrl ? `<a href="${app.escapeHtml(waCustomerUrl)}" target="_blank" rel="noopener noreferrer" style="margin-left:8px;color:#111111;font-weight:700;text-decoration:underline;">Chamar Cliente no WhatsApp ↗</a>` : ''}
                  </div>
                </div>
                <div style="text-align:right;">
                  <span class="status-pill ${ord.status === 'paid' || ord.status === 'delivered' ? 'confirmed' : ord.status === 'cancelled' ? 'danger' : 'pending'}">
                    ${app.escapeHtml(ord.statusLabel || ord.status)}
                  </span>
                  <div style="font-size:1.15rem;font-weight:700;margin-top:4px;color:#111111;">${app.formatBRL(ord.total)}</div>
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
        <div class="admin-card" id="admin-payment-methods-activation-card">
          <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:12px;">Controles Individuais de Ativação & Diagnóstico</h2>
          <div class="admin-table-responsive-wrap">
            <table class="data-table admin-payment-methods-table">
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
                  <tr class="admin-payment-method-row" data-payment-method-row="${m.key}">
                    <td data-label="Configuração" class="pm-cell-title">
                      <strong class="pm-method-name">${app.escapeHtml(m.name)}</strong>
                      <div class="pm-method-desc">${app.escapeHtml(m.desc)}</div>
                    </td>
                    <td data-label="Estado Atual" class="pm-cell-state">
                      <span class="status-pill ${m.enabled ? 'confirmed' : 'pending'}" id="status-badge-${m.key}">
                        ${m.enabled ? 'ATIVADO' : 'DESATIVADO'}
                      </span>
                    </td>
                    <td data-label="Status da Integração" class="pm-cell-integration">
                      <span class="status-pill ${m.diag.badgeClass}">${app.escapeHtml(m.diag.label)}</span>
                      ${m.diag.detail ? `<div class="pm-integration-detail">${app.escapeHtml(m.diag.detail)}</div>` : ''}
                    </td>
                    <td data-label="Ação" class="pm-cell-action">
                      <button
                        type="button"
                        class="btn ${m.enabled ? 'btn-outline' : 'btn-primary'} btn-sm pm-action-btn"
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
                <span style="font-size:0.76rem;color:var(--text-secondary);">Você pode informar qualquer chave Pix ou apenas um número. Também pode desativar o Pix para vender somente pelo WhatsApp.</span>
              </div>
              <label style="display:inline-flex;align-items:center;gap:8px;font-weight:700;cursor:pointer;">
                <input type="checkbox" name="pixEnabled" id="admin-pix-enabled-checkbox" ${pay.pix && pay.pix.enabled ? 'checked' : ''} />
                <span>Ativar Pix no Checkout</span>
              </label>
            </div>

            <div class="admin-product-split">
              <div>
                <div class="admin-form-grid-2">
                  <div>
                    <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Tipo da Chave Pix *</label>
                    <select name="pixKeyType" id="admin-pix-key-type-select" class="form-control">
                      <option value="telefone" ${pay.pix.keyType === 'telefone' ? 'selected' : ''}>Celular / Telefone (+55...)</option>
                      <option value="numero" ${pay.pix.keyType === 'numero' || pay.pix.keyType === 'direta' ? 'selected' : ''}>Apenas Número / Identificador Direto</option>
                      <option value="cpf" ${pay.pix.keyType === 'cpf' ? 'selected' : ''}>CPF (11 dígitos)</option>
                      <option value="cnpj" ${pay.pix.keyType === 'cnpj' ? 'selected' : ''}>CNPJ (14 dígitos)</option>
                      <option value="email" ${pay.pix.keyType === 'email' ? 'selected' : ''}>E-mail</option>
                      <option value="aleatoria" ${pay.pix.keyType === 'aleatoria' ? 'selected' : ''}>Chave Aleatória (EVP)</option>
                    </select>
                  </div>
                  <div>
                    <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Chave Pix ou Número *</label>
                    <input type="text" name="pixKey" id="admin-pix-key-input" class="form-control" required placeholder="Digite a chave Pix ou apenas o número" value="${app.escapeHtml(pay.pix.pixKey)}" />
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

                <div style="margin-top:14px;padding:12px 14px;background:#F4F4F5;border:1px solid #D4D4D8;border-radius:8px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
                    <strong style="font-size:0.8rem;color:#111111;">Provedor Pix para Valor Travado & Confirmação Automática</strong>
                    <span class="status-pill ${pay.pix && pay.pix.hasBackendSecretConfigured ? 'confirmed' : 'pending'}">
                      ${pay.pix && pay.pix.hasBackendSecretConfigured ? '✓ Provedor Conectado' : '! Modo Chave Direta (Sem PSP)'}
                    </span>
                  </div>
                  <p style="font-size:0.74rem;color:#52525B;margin:0 0 10px;line-height:1.45;">
                    Para o QR Code travar o valor exato em qualquer banco e confirmar o pedido automaticamente via webhook, informe o token do provedor ou defina <code>MERCADOPAGO_ACCESS_TOKEN</code>, <code>ASAAS_API_KEY</code> ou <code>OPENPIX_APP_ID</code> nas variáveis do servidor Render.
                  </p>
                  <div class="admin-form-grid-3" style="margin-bottom:0;">
                    <div>
                      <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Provedor Pix</label>
                      <select name="pixProvider" class="form-control">
                        <option value="mercado_pago" ${(pay.pix.provider === 'mercado_pago' || !pay.pix.provider) ? 'selected' : ''}>Mercado Pago</option>
                        <option value="asaas" ${pay.pix.provider === 'asaas' ? 'selected' : ''}>Asaas</option>
                        <option value="openpix" ${pay.pix.provider === 'openpix' || pay.pix.provider === 'woovi' ? 'selected' : ''}>OpenPix / Woovi</option>
                      </select>
                    </div>
                    <div>
                      <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Ambiente</label>
                      <select name="pixEnvironment" class="form-control">
                        <option value="production" ${pay.pix.environment !== 'sandbox' ? 'selected' : ''}>Produção</option>
                        <option value="sandbox" ${pay.pix.environment === 'sandbox' ? 'selected' : ''}>Sandbox / Testes</option>
                      </select>
                    </div>
                    <div>
                      <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Token / API Key do Provedor</label>
                      <input type="password" name="pixAccessToken" class="form-control" autocomplete="off" placeholder="${pay.pix && pay.pix.hasBackendSecretConfigured ? '•••••••• (Salvo — digite para trocar)' : 'APP_USR-... ou $aact_...'}" />
                    </div>
                  </div>
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

    // Formulário de limpeza pré-entrega (zerar pedidos, Pix, visitas/analytics e logs de teste)
    containerEl.querySelector('#admin-prelaunch-cleanup-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formEl = e.currentTarget;
      const fd = new FormData(formEl);
      const clearOrdersAndFinance = fd.get('clearOrdersAndFinance') === 'on';
      const restoreReservedStock = fd.get('restoreReservedStock') === 'on';
      const clearAnalytics = fd.get('clearAnalytics') === 'on';
      const clearLogsAndSupport = fd.get('clearLogsAndSupport') === 'on';
      const clearTestCustomers = fd.get('clearTestCustomers') === 'on';

      if (!clearOrdersAndFinance && !clearAnalytics && !clearLogsAndSupport && !clearTestCustomers) {
        app.showToast('Selecione ao menos uma categoria para limpar.', 'error');
        return;
      }

      const confirmLines = ['Confirmar limpeza pré-entrega dos registros selecionados?\n'];
      if (clearOrdersAndFinance) confirmLines.push('• Pedidos, cobranças Pix, eventos financeiros e devoluções');
      if (clearOrdersAndFinance && restoreReservedStock) confirmLines.push('• Restaurar estoque reservado por pedidos de teste');
      if (clearAnalytics) confirmLines.push('• Visitas, sessões e funil de Análise da Loja');
      if (clearLogsAndSupport) confirmLines.push('• Logs de auditoria, notificações e mensagens de SAC');
      if (clearTestCustomers) confirmLines.push('• Contas de clientes cadastradas em teste');
      confirmLines.push('\nProdutos, fotos, preços, chaves Pix e contas admin serão mantidos intactos.');

      if (!window.confirm(confirmLines.join('\n'))) return;

      const submitBtn = formEl.querySelector('#btn-execute-prelaunch-cleanup');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Limpando registros...';
      }

      try {
        const apiBase = window.ByAngelyCloud && window.ByAngelyCloud.getBackendBaseUrl
          ? window.ByAngelyCloud.getBackendBaseUrl()
          : '';
        const res = await fetch(apiBase + '/api/admin/clear-test-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAdminHeadersV6(app)
          },
          body: JSON.stringify({
            clearOrdersAndFinance,
            restoreReservedStock,
            clearAnalytics,
            clearLogsAndSupport,
            clearTestCustomers
          })
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data || !data.ok || !data.db) {
          app.showToast((data && data.error) || 'Não foi possível concluir a limpeza no servidor.', 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Zerar Histórico de Teste Selecionado';
          }
          return;
        }

        const st = app.getState();
        st.db = data.db;
        try {
          localStorage.setItem('by_angely_db_v1', JSON.stringify(st.db));
        } catch (_lsErr) {}
        AdminState.analyticsReport = null;
        _lastOrdersFingerprint = computeOrdersAndChargesFingerprint(st.db.orders || [], st.db.pixCharges || []);
        app.updateGlobalChrome();
        app.showToast(
          `Limpeza concluída! (${data.cleared.orders} pedido(s), ${data.cleared.pixCharges} Pix, ${data.cleared.visitors} visitante(s) zerados${data.cleared.restoredStockUnits > 0 ? ', +' + data.cleared.restoredStockUnits + ' un. devolvidas ao estoque' : ''}).`,
          'success'
        );
        renderAdminView(containerEl);
      } catch (err) {
        app.showToast('Erro de conexão ao limpar históricos: ' + err.message, 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Zerar Histórico de Teste Selecionado';
        }
      }
    });

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
        return { name: n || 'Padrão', hex: h || '#111111' };
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
          return { name: n || 'Padrão', hex: h || '#111111' };
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
        <div style="width:118px;border:${idx === 0 ? '2px solid #111111' : '1px solid var(--border-strong)'};border-radius:6px;overflow:hidden;background:#FFF;position:relative;">
          ${idx === 0 ? `<span style="position:absolute;top:4px;left:4px;background:#111111;color:#FFF;font-size:0.6rem;font-weight:700;padding:2px 5px;border-radius:3px;z-index:2;">CAPA</span>` : ''}
          ${m.type === 'video' ? `
            <div style="height:96px;background:#111111;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:600;">▶ VÍDEO</div>
          ` : `
            <img src="${app.escapeHtml(m.url)}" alt="Mídia ${idx + 1}" style="width:100%;height:96px;object-fit:cover;" />
          `}
          <div style="display:flex;flex-direction:column;border-top:1px solid var(--border-subtle);">
            ${idx > 0 ? `
              <button type="button" data-action-admin="set-primary-media" data-index="${idx}" style="width:100%;font-size:0.68rem;padding:4px;background:#F7F7F7;color:#111111;font-weight:700;border-bottom:1px solid var(--border-subtle);">
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
            return { name: n || 'Padrão', hex: h || '#111111' };
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

        if (act === 'go-cleanup-card') {
          if (AdminState.activeSection !== 'overview') {
            AdminState.activeSection = 'overview';
            AdminState.mobileMenuOpen = false;
            renderAdminView(containerEl);
          }
          setTimeout(() => {
            const targetCard = document.getElementById('admin-prelaunch-cleanup-card');
            if (targetCard) targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 60);
          return;
        }

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
            db.paymentSettings.paymentConfigVersion = 4;
            const willEnable = !db.paymentSettings[methodKey].enabled;
            const diag = app.getPaymentIntegrationStatus ? app.getPaymentIntegrationStatus(methodKey, db.paymentSettings, db.storeSettings) : { stateCode: 'configured' };
            if (willEnable && (diag.stateCode === 'pending' || diag.stateCode === 'error')) {
              app.showToast(`Atenção: "${methodKey}" foi marcado como ativo, mas ${diag.detail || 'requer preenchimento dos dados abaixo para aparecer no checkout.'}`, 'warning');
            }
            db.paymentSettings[methodKey].enabled = willEnable;
            const stateStr = willEnable ? 'ATIVADA' : 'DESATIVADA';
            const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';
            const currAdm = app.getState().currentAdmin || {};
            const reqHeaders = {
              'Content-Type': 'application/json',
              'X-Admin-Role': currAdm.role || 'owner',
              'X-Admin-Email': currAdm.email || 'byangely1@gmail.com'
            };
            if (currAdm.token) reqHeaders['X-Admin-Token'] = currAdm.token;
            fetch(apiBase + '/api/admin/payment-settings', {
              method: 'POST',
              headers: reqHeaders,
              body: JSON.stringify({
                paymentSettings: db.paymentSettings,
                actorName: currAdm.name || 'Proprietária BY ANGÉLY',
                actorRole: currAdm.role || 'owner',
                actorEmail: currAdm.email || 'byangely1@gmail.com'
              })
            }).catch(() => {});
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
        db.paymentSettings.paymentConfigVersion = 4;

        db.paymentSettings.whatsapp = db.paymentSettings.whatsapp || {};
        db.paymentSettings.whatsapp.enabled = fd.get('whatsappEnabled') === 'on';
        db.paymentSettings.whatsapp.title = fd.get('whatsappTitle') || 'Atendimento e Finalização pelo WhatsApp';
        db.paymentSettings.whatsapp.instructions = fd.get('whatsappInstructions') || '';

        const pixKeyType = String(fd.get('pixKeyType') || 'telefone').trim().toLowerCase();
        const pixKeyVal = String(fd.get('pixKey') || '').trim();

        db.paymentSettings.pix.enabled = fd.get('pixEnabled') === 'on';
        db.paymentSettings.pix.keyType = pixKeyType;
        db.paymentSettings.pix.pixKey = pixKeyVal;
        db.paymentSettings.pix.recipientName = String(fd.get('pixRecipientName') || 'BY ANGELY').trim();
        db.paymentSettings.pix.recipientCity = String(fd.get('pixRecipientCity') || 'ITAPERUNA').trim();
        db.paymentSettings.pix.txidPrefix = String(fd.get('pixTxidPrefix') || 'BYANGELY').trim();
        db.paymentSettings.pix.instructions = fd.get('pixInstructions');
        db.paymentSettings.pix.provider = String(fd.get('pixProvider') || db.paymentSettings.pix.provider || 'mercado_pago').trim();
        db.paymentSettings.pix.environment = String(fd.get('pixEnvironment') || db.paymentSettings.pix.environment || 'production').trim();

        db.paymentSettings.creditCard.enabled = fd.get('cardEnabled') === 'on';
        db.paymentSettings.creditCard.providerName = String(fd.get('cardProviderName') || '').trim();
        db.paymentSettings.creditCard.externalPaymentLink = String(fd.get('cardExternalLink') || '').trim();
        db.paymentSettings.creditCard.installmentsInfo = fd.get('cardInstallmentsInfo');
        db.paymentSettings.creditCard.instructions = fd.get('cardInstructions');

        const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';
        const currAdm = app.getState().currentAdmin || {};
        const reqHeaders = {
          'Content-Type': 'application/json',
          'X-Admin-Role': currAdm.role || 'owner',
          'X-Admin-Email': currAdm.email || 'byangely1@gmail.com'
        };
        if (currAdm.token) reqHeaders['X-Admin-Token'] = currAdm.token;

        const pixToken = String(fd.get('pixAccessToken') || '').trim();
        const secretToken = String(fd.get('cardSecretToken') || '').trim();
        if (pixToken || secretToken) {
          if (pixToken) db.paymentSettings.pix.hasBackendSecretConfigured = true;
          if (secretToken) db.paymentSettings.creditCard.hasSecretCredentials = true;
          try {
            const credPayload = {};
            if (pixToken) {
              credPayload.pixProvider = db.paymentSettings.pix.provider;
              credPayload.pixEnvironment = db.paymentSettings.pix.environment;
              credPayload.pixAccessToken = pixToken;
            }
            if (secretToken) {
              credPayload.creditCardProvider = db.paymentSettings.creditCard.providerName;
              credPayload.creditCardSecretToken = secretToken;
            }
            await fetch(`${apiBase}/api/admin/payment-credentials`, {
              method: 'POST',
              headers: reqHeaders,
              body: JSON.stringify(credPayload)
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
        try {
          await fetch(apiBase + '/api/admin/payment-settings', {
            method: 'POST',
            headers: reqHeaders,
            body: JSON.stringify({
              paymentSettings: db.paymentSettings,
              actorName: currAdm.name || 'Proprietária BY ANGÉLY',
              actorRole: currAdm.role || 'owner',
              actorEmail: currAdm.email || 'byangely1@gmail.com'
            })
          });
        } catch (err) {}

        await app.saveDatabase('Configurações de venda e pagamento atualizadas pela proprietária (Pix: ' + (db.paymentSettings.pix.enabled ? 'Ativo' : 'Desativado') + ', Chave: ' + db.paymentSettings.pix.pixKey + ').');
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
const _origRenderOrdersSection = typeof renderOrdersSection === 'function' ? renderOrdersSection : null;
const _origRenderPaymentsSection = typeof renderPaymentsSection === 'function' ? renderPaymentsSection : null;
const _origRenderCustomersSection = typeof renderCustomersSection === 'function' ? renderCustomersSection : null;
const _origRenderCategoriesBannersCouponsSection = typeof renderCategoriesBannersCouponsSection === 'function' ? renderCategoriesBannersCouponsSection : null;
const _origBindAdminWorkspaceEvents = typeof bindAdminWorkspaceEvents === 'function' ? bindAdminWorkspaceEvents : null;
const FULL_ORDER_STATUS_OPTIONS = [
{ value: 'awaiting_payment', label: 'Aguardando pagamento' },
{ value: 'awaiting_whatsapp', label: 'Aguardando confirmação pelo WhatsApp' },
{ value: 'payment_approved', label: 'Pagamento aprovado • Aguardando separação' },
{ value: 'awaiting_separation', label: 'Aguardando separação' },
{ value: 'in_separation', label: 'Em separação' },
{ value: 'ready_for_shipping', label: 'Pedido pronto para envio ou retirada' },
{ value: 'shipped', label: 'Enviado' },
{ value: 'out_for_delivery', label: 'Saiu para entrega' },
{ value: 'delivered', label: 'Entregue' },
{ value: 'cancelled_expired', label: 'Cancelado por falta de pagamento' },
{ value: 'cancelled', label: 'Cancelado' },
{ value: 'late_payment_reconciliation', label: 'Pagamento após expiração (Em conciliação)' }
];
renderOrdersSection = function () {
const app = window.ByAngelyApp;
const db = app.getState().db;
const orders = db.orders || [];
const returns = db.returnRequests || [];
const currentAdmin = app.getState().currentAdmin;
const canManageOrders = hasPermission(currentAdmin, 'orders');
const newPaidOrders = orders.filter(
(o) => o.status === 'payment_approved' || o.status === 'awaiting_separation' || o.status === 'paid'
);
const lateOrders = orders.filter((o) => o.status === 'late_payment_reconciliation');
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
<span class="section-eyebrow">Operação de Vendas, Separação e Pós-Venda</span>
<h1 style="font-family:var(--font-serif);font-size:2rem;">Gestão de Pedidos, Separação & Rastreio</h1>
</div>
<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
<input type="search" id="admin-order-search" class="form-control" placeholder="Buscar por código ou cliente..." value="${app.escapeHtml(AdminState.orderSearchTerm)}" style="width:230px;min-height:40px;" />
<select id="admin-order-filter" class="form-control" style="width:auto;min-height:40px;">
<option value="all" ${AdminState.orderFilterStatus === 'all' ? 'selected' : ''}>Todos os Status (${orders.length})</option>
${FULL_ORDER_STATUS_OPTIONS.map((st) => {
const count = orders.filter((o) => o.status === st.value).length;
return `<option value="${st.value}" ${AdminState.orderFilterStatus === st.value ? 'selected' : ''}>${st.label} (${count})</option>`;
}).join('')}
</select>
</div>
</div>
${newPaidOrders.length > 0 ? `
<div class="alert-box alert-info" style="background:#F4F4F5;border-color:#111111;color:#111111;margin-bottom:18px;">
<strong>🔔 NOVOS PEDIDOS PAGOS AGUARDANDO SEPARAÇÃO (${newPaidOrders.length}):</strong>
Os pedidos <strong>${newPaidOrders.map((o) => app.escapeHtml(o.orderNumber)).join(', ')}</strong> tiveram o pagamento confirmado automaticamente via Pix e já podem entrar em separação!
</div>
` : ''}
${lateOrders.length > 0 ? `
<div class="alert-box alert-danger" style="margin-bottom:18px;">
<strong>⚠️ ALERTA DE CONCILIAÇÃO TARDIA (${lateOrders.length}):</strong>
O(s) pedido(s) <strong>${lateOrders.map((o) => app.escapeHtml(o.orderNumber)).join(', ')}</strong> receberam pagamento após a expiração e exigem revisão manual (aprovação ou estorno).
</div>
` : ''}
${filteredOrders.length === 0 ? `
<div class="admin-card" style="text-align:center;padding:36px;">
<p style="color:var(--text-secondary);">Nenhum pedido encontrado para o filtro selecionado.</p>
</div>
` : filteredOrders.map((ord) => {
const waCustomerDigits = String((ord.customer && ord.customer.phone) || '').replace(/\D/g, '');
const waCustomerUrl = waCustomerDigits.length >= 10
? `https://wa.me/${waCustomerDigits.startsWith('55') ? waCustomerDigits : '55' + waCustomerDigits}?text=${encodeURIComponent(`Olá ${ord.customer.name || ''}! Aqui é da BY ANGÉLY sobre o seu pedido ${ord.orderNumber}.` )}`
: '';
const isApproved = ['payment_approved', 'paid', 'awaiting_separation', 'in_separation', 'ready_for_shipping', 'shipped', 'out_for_delivery', 'delivered'].includes(ord.status);
const isCancelled = ord.status === 'cancelled_expired' || ord.status === 'cancelled';
const addr = (ord.shipping && ord.shipping.address) || {};
return `
<div class="admin-card" data-admin-order-card="${app.escapeHtml(ord.id)}">
<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;padding-bottom:12px;border-bottom:1px solid var(--border-subtle);margin-bottom:12px;">
<div>
<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
<strong style="font-size:1.14rem;">Pedido ${app.escapeHtml(ord.orderNumber)}</strong>
<span class="status-pill ${ord.paymentMethod === 'pix' ? 'confirmed' : 'info'}">
${app.escapeHtml(ord.paymentMethodLabel || ord.paymentMethod)}
</span>
<span style="font-size:0.78rem;color:var(--text-secondary);">${app.formatDateBR(ord.createdAt)}</span>
</div>
<div style="font-size:0.85rem;margin-top:4px;">
Cliente: <strong>${app.escapeHtml(ord.customer ? ord.customer.name : '-')}</strong> • Tel: ${app.escapeHtml(ord.customer ? ord.customer.phone : '-')} • E-mail: ${app.escapeHtml(ord.customer ? ord.customer.email : '-')}
${waCustomerUrl ? `<a href="${app.escapeHtml(waCustomerUrl)}" target="_blank" rel="noopener noreferrer" style="margin-left:8px;color:#111111;font-weight:700;text-decoration:underline;">Chamar no WhatsApp ↗</a>` : ''}
</div>
</div>
<div style="text-align:right;">
<span class="status-pill ${isApproved ? 'confirmed' : isCancelled ? 'danger' : 'pending'}">
${app.escapeHtml(ord.statusLabel || ord.status)}
</span>
<div style="font-size:1.18rem;font-weight:700;margin-top:4px;color:#111111;">${app.formatBRL(ord.total)}</div>
</div>
</div>
<div class="admin-form-grid-2" style="font-size:0.85rem;margin-bottom:14px;">
<div>
<strong style="display:block;margin-bottom:6px;">Peças para Separação:</strong>
${(ord.items || []).map((it) => `
<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:6px;background:var(--bg-primary);border-radius:6px;">
${it.imageUrl ? `<img src="${app.escapeHtml(it.imageUrl)}" alt="" style="width:34px;height:42px;object-fit:cover;border-radius:4px;" />` : ''}
<div>
<strong>${it.quantity}x ${app.escapeHtml(it.name)}</strong>
<div style="font-size:0.76rem;color:var(--text-secondary);">Tamanho: <strong>${app.escapeHtml(it.size)}</strong> | Cor: <strong>${app.escapeHtml(it.color)}</strong> — ${app.formatBRL(it.unitPrice * it.quantity)}</div>
</div>
</div>
`).join('')}
${ord.customerNotes ? `<div style="margin-top:6px;color:var(--text-secondary);"><strong>Observações da cliente:</strong> ${app.escapeHtml(ord.customerNotes)}</div>` : ''}
</div>
<div style="background:var(--bg-primary);padding:12px;border-radius:8px;">
<div><strong>Modalidade de Entrega:</strong> ${app.escapeHtml(ord.shipping ? ord.shipping.methodName : '-')}</div>
<div><strong>Endereço Completo:</strong> ${app.escapeHtml(addr.street || '')}, ${app.escapeHtml(addr.number || '')} ${addr.complement ? ' - ' + app.escapeHtml(addr.complement) : ''}</div>
<div><strong>Bairro / Cidade:</strong> ${app.escapeHtml(addr.neighborhood || '')} — ${app.escapeHtml(addr.cityState || ((addr.city || '') + ' - ' + (addr.state || '')))} (CEP ${app.escapeHtml(addr.zipCode || '')})</div>
${addr.reference ? `<div><strong>Referência:</strong> ${app.escapeHtml(addr.reference)}</div>` : ''}
<div style="margin-top:6px;"><strong>Status do Pagamento:</strong> ${ord.paymentStatus === 'paid' ? '<span style="color:#111111;font-weight:700;">✓ Pago e Confirmado</span>' : app.escapeHtml(ord.paymentStatus || 'Pendente')}</div>
${ord.pixData && ord.pixData.chargeId ? `<div style="font-size:0.76rem;color:var(--text-secondary);"><strong>Cobrança Pix:</strong> <code>${app.escapeHtml(ord.pixData.chargeId)}</code> | <strong>TXID:</strong> <code>${app.escapeHtml(ord.pixData.txid)}</code></div>` : ''}
</div>
</div>
${canManageOrders ? `
<!-- Botões Rápidos de Fluxo de Separação e Entrega -->
<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;padding-top:10px;border-top:1px dashed var(--border-subtle);">
<span style="font-size:0.76rem;font-weight:700;text-transform:uppercase;color:var(--text-secondary);align-self:center;margin-right:4px;">Fluxo Rápido:</span>
<button type="button" class="btn btn-outline btn-sm" data-admin-quick-status="in_separation" data-order-id="${app.escapeHtml(ord.id)}">1. Iniciar Separação</button>
<button type="button" class="btn btn-outline btn-sm" data-admin-quick-status="ready_for_shipping" data-order-id="${app.escapeHtml(ord.id)}">2. Pronto p/ Envio ou Retirada</button>
<button type="button" class="btn btn-outline btn-sm" data-admin-quick-status="shipped" data-order-id="${app.escapeHtml(ord.id)}">3. Marcar como Enviado</button>
<button type="button" class="btn btn-outline btn-sm" data-admin-quick-status="out_for_delivery" data-order-id="${app.escapeHtml(ord.id)}">4. Saiu para Entrega</button>
<button type="button" class="btn btn-primary btn-sm" data-admin-quick-status="delivered" data-order-id="${app.escapeHtml(ord.id)}">5. Confirmar Entrega</button>
</div>
<div style="display:grid;grid-template-columns:1.2fr 1.2fr auto;gap:10px;align-items:end;padding-top:10px;border-top:1px solid var(--border-subtle);">
<div>
<label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Status Completo do Pedido</label>
<select class="form-control" id="ord-status-${app.escapeHtml(ord.id)}" style="min-height:38px;">
${FULL_ORDER_STATUS_OPTIONS.map((st) => `
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
<summary style="cursor:pointer;font-weight:600;color:var(--text-secondary);">Histórico Auditado do Pedido (${ord.notificationsLog.length})</summary>
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
<!-- Solicitações de Troca e Devolução -->
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
renderPaymentsSection = function () {
const app = window.ByAngelyApp;
const db = app.getState().db;
const pay = db.paymentSettings || {};
const pixCfg = pay.pix || {};
const charges = db.pixCharges || [];
const finEvents = db.financialEvents || [];
const paidCharges = charges.filter((c) => ['paid', 'approved', 'approved_late', 'paid_late_conflict'].includes(String(c.status || '').toLowerCase()));
const pendingCharges = charges.filter((c) => String(c.status || '').toLowerCase() === 'pending');
const expiredCharges = charges.filter((c) => ['expired', 'cancelled', 'cancelled_expired'].includes(String(c.status || '').toLowerCase()));
const originUrl = (window.location && window.location.origin && window.location.origin.startsWith('http'))
  ? window.location.origin
  : 'https://by-angely.onrender.com';
const officialWebhookUrl = `${originUrl}/api/webhooks/pix`;
const officialWebhookUrlWithSecret = `${originUrl}/api/webhooks/pix?secret=by-angely-pix-webhook-secret-2026`;
const hasPspConnected = Boolean(pixCfg && pixCfg.hasBackendSecretConfigured);
const pixControlCard = `
<div class="admin-card" style="border:1.5px solid #111111;margin-bottom:22px;">
<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
<div>
<span class="section-eyebrow">Motor Financeiro & Conciliação em Tempo Real</span>
<h2 style="font-family:var(--font-serif);font-size:1.55rem;margin-bottom:2px;">Pix Automático, Expiração de 15 Minutos & Webhooks</h2>
</div>
<span class="status-pill ${hasPspConnected ? 'confirmed' : 'pending'}">${hasPspConnected ? '✓ Provedor Conectado • Webhook Automático (/api/webhooks/pix)' : '! Modo Chave Direta (Configure um Provedor PSP abaixo)'}</span>
</div>

<div style="padding:12px 14px;background:#F7F7F7;border:1px solid #D4D4D8;border-radius:8px;margin-bottom:14px;font-size:0.81rem;">
<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px;">
<strong style="color:#111111;">URL Oficial do Webhook para Cadastro no Provedor Pix (BACEN / Mercado Pago / Asaas / OpenPix / Efí / PagBank):</strong>
<button type="button" class="btn btn-outline btn-sm" id="btn-copy-pix-webhook-url" data-webhook-url="${app.escapeHtml(officialWebhookUrlWithSecret)}" style="min-height:32px;padding:4px 10px;font-size:0.75rem;">Copiar URL do Webhook</button>
</div>
<div style="word-break:break-all;font-family:monospace;background:#FFFFFF;padding:8px 10px;border:1px solid #E4E4E7;border-radius:6px;color:#111111;font-weight:600;margin-bottom:6px;">
${app.escapeHtml(officialWebhookUrl)}
</div>
<div style="color:var(--text-secondary);font-size:0.76rem;line-height:1.45;">
• <strong>Autenticação suportada:</strong> Cabeçalho <code>X-Webhook-Secret: by-angely-pix-webhook-secret-2026</code>, <code>Authorization: Bearer</code>, assinatura HMAC <code>X-Signature</code> ou query string direta <code>?secret=by-angely-pix-webhook-secret-2026</code>.<br/>
• <strong>Atualização automática:</strong> Assim que o provedor confirma o recebimento, o pedido muda automaticamente de <em>"Aguardando pagamento"</em> para <em>"Pagamento aprovado • Aguardando separação"</em> sem precisar atualizar a página.
</div>
</div>

<form id="admin-pix-expiration-form" style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;padding:12px;background:var(--bg-primary);border-radius:8px;margin-bottom:16px;">
<div>
<label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Prazo de Expiração do QR Code Pix (minutos)</label>
<input type="number" name="expirationMinutes" min="1" max="120" class="form-control" value="${Number(pixCfg.expirationMinutes) || 15}" style="width:140px;" />
</div>
<button type="submit" class="btn btn-primary btn-sm">Salvar Prazo de Expiração</button>
<span style="font-size:0.8rem;color:var(--text-secondary);">Padrão recomendado: <strong>15 minutos</strong>. Pedidos não pagos dentro do prazo são cancelados automaticamente e liberam o estoque reservado.</span>
</form>
<div class="admin-form-grid-4" style="margin-bottom:16px;">
<div style="padding:12px;background:#F4F4F5;border:1px solid #D4D4D8;border-radius:8px;">
<span style="font-size:0.74rem;text-transform:uppercase;color:#111111;font-weight:700;">Pix Aprovados</span>
<strong style="display:block;font-size:1.4rem;color:#111111;" id="admin-pix-paid-count">${paidCharges.length}</strong>
</div>
<div style="padding:12px;background:#F4F4F5;border:1px solid #D4D4D8;border-radius:8px;">
<span style="font-size:0.74rem;text-transform:uppercase;color:#18181B;font-weight:700;">Aguardando (No Prazo)</span>
<strong style="display:block;font-size:1.4rem;color:#18181B;" id="admin-pix-pending-count">${pendingCharges.length}</strong>
</div>
<div style="padding:12px;background:#F4F4F5;border:1px solid #D4D4D8;border-radius:8px;">
<span style="font-size:0.74rem;text-transform:uppercase;color:#111111;font-weight:700;">Expirados / Cancelados</span>
<strong style="display:block;font-size:1.4rem;color:#111111;" id="admin-pix-expired-count">${expiredCharges.length}</strong>
</div>
<div style="padding:12px;background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;">
<span style="font-size:0.74rem;text-transform:uppercase;color:var(--text-secondary);font-weight:700;">Eventos Financeiros</span>
<strong style="display:block;font-size:1.4rem;color:var(--text-primary);" id="admin-pix-events-count">${finEvents.length}</strong>
</div>
</div>
${charges.length > 0 ? `
<details style="margin-bottom:10px;">
<summary style="cursor:pointer;font-weight:600;font-size:0.86rem;">Ver Cobranças Pix Geradas (${charges.length})</summary>
<div style="overflow-x:auto;margin-top:8px;">
<table class="data-table">
<thead>
<tr>
<th>ID Cobrança / TXID</th>
<th>Pedido</th>
<th>Valor</th>
<th>Vencimento</th>
<th>Status</th>
</tr>
</thead>
<tbody>
${charges.slice(0, 20).map((c) => {
  const stLower = String(c.status || 'pending').toLowerCase();
  const pillClass = (stLower === 'paid' || stLower === 'approved') ? 'confirmed' : stLower === 'expired' ? 'danger' : 'pending';
  return `
<tr>
<td><code>${app.escapeHtml(c.chargeId)}</code><br/><small>${app.escapeHtml(c.txid)}</small></td>
<td><strong>${app.escapeHtml(c.orderNumber)}</strong></td>
<td>${app.formatBRL(c.amount)}</td>
<td style="font-size:0.76rem;">${app.formatDateBR(c.expiresAt)}</td>
<td><span class="status-pill ${pillClass}">${app.escapeHtml(stLower.toUpperCase())}</span></td>
</tr>
`;
}).join('')}
</tbody>
</table>
</div>
</details>
` : ''}
${finEvents.length > 0 ? `
<details>
<summary style="cursor:pointer;font-weight:600;font-size:0.86rem;">Ver Log de Webhooks e Eventos Financeiros (${finEvents.length})</summary>
<div style="overflow-x:auto;margin-top:8px;">
<table class="data-table">
<thead>
<tr>
<th>Data/Hora</th>
<th>Tipo de Evento</th>
<th>Pedido</th>
<th>Valor</th>
<th>Detalhe</th>
</tr>
</thead>
<tbody>
${finEvents.slice(0, 20).map((ev) => `
<tr>
<td style="font-size:0.75rem;">${app.formatDateBR(ev.timestamp)}</td>
<td><code>${app.escapeHtml(ev.type)}</code></td>
<td><strong>${app.escapeHtml(ev.orderNumber || '-')}</strong></td>
<td>${ev.amount !== undefined ? app.formatBRL(ev.amount) : '-'}</td>
<td style="font-size:0.78rem;">${app.escapeHtml(ev.detail || ev.message || '')}</td>
</tr>
`).join('')}
</tbody>
</table>
</div>
</details>
` : ''}
</div>
`;
return pixControlCard + _origRenderPaymentsSection();
}
renderCustomersSection = function () {
const app = window.ByAngelyApp;
const db = app.getState().db;
const reviews = db.reviews || [];
const reviewsCard = `
<div class="admin-card" style="margin-top:20px;">
<h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:8px;">Moderação de Avaliações de Produtos (${reviews.length})</h2>
<p style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:12px;">
Aprove, oculte ou exclua avaliações enviadas pelas clientes nas fichas dos produtos.
</p>
${reviews.length === 0 ? `
<p style="font-size:0.85rem;color:var(--text-muted);">Nenhuma avaliação enviada até o momento.</p>
` : `
<div style="overflow-x:auto;">
<table class="data-table">
<thead>
<tr>
<th>Data</th>
<th>Cliente</th>
<th>Nota</th>
<th>Comentário</th>
<th>Status</th>
<th>Ações</th>
</tr>
</thead>
<tbody>
${reviews.map((r) => `
<tr>
<td style="font-size:0.78rem;">${app.escapeHtml(r.date || '')}</td>
<td><strong>${app.escapeHtml(r.customerName || '')}</strong></td>
<td style="color:var(--accent-gold);font-weight:700;">${'★'.repeat(Number(r.rating) || 5)} (${Number(r.rating) || 5})</td>
<td style="font-size:0.82rem;">${app.escapeHtml(r.comment || '(Sem comentário escrito)')}</td>
<td>
<span class="status-pill ${r.status === 'hidden' ? 'danger' : 'confirmed'}">
${r.status === 'hidden' ? 'Oculta' : 'Publicada'}
</span>
</td>
<td>
<div style="display:flex;gap:6px;">
<button type="button" class="btn btn-outline btn-sm" data-admin-review-action="toggle" data-review-id="${app.escapeHtml(r.id)}">
${r.status === 'hidden' ? 'Aprovar / Exibir' : 'Ocultar'}
</button>
<button type="button" class="btn btn-danger btn-sm" data-admin-review-action="delete" data-review-id="${app.escapeHtml(r.id)}">
Excluir
</button>
</div>
</td>
</tr>
`).join('')}
</tbody>
</table>
</div>
`}
</div>
`;
return _origRenderCustomersSection() + reviewsCard;
}
renderCategoriesBannersCouponsSection = function () {
const app = window.ByAngelyApp;
const db = app.getState().db;
const hs = (db.storeSettings && db.storeSettings.homeSections) || {
hero: true,
featured: true,
newArrivals: true,
promotions: true,
categories: true,
brandStory: true
};
const homeVisibilityCard = `
<div class="admin-card" style="margin-top:20px;">
<h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:6px;">Organização da Página Inicial (Ativar ou Ocultar Seções)</h2>
<p style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:14px;">
Escolha quais seções aparecem na Página Inicial da loja sem precisar editar código:
</p>
<form id="admin-home-sections-form">
<div class="admin-form-grid-3" style="margin-bottom:14px;">
<label style="display:flex;align-items:center;gap:8px;font-size:0.86rem;cursor:pointer;">
<input type="checkbox" name="hero" ${hs.hero !== false ? 'checked' : ''} />
<span>1. Banner Principal / Identidade</span>
</label>
<label style="display:flex;align-items:center;gap:8px;font-size:0.86rem;cursor:pointer;">
<input type="checkbox" name="featured" ${hs.featured !== false ? 'checked' : ''} />
<span>2. Peças em Destaque</span>
</label>
<label style="display:flex;align-items:center;gap:8px;font-size:0.86rem;cursor:pointer;">
<input type="checkbox" name="newArrivals" ${hs.newArrivals !== false ? 'checked' : ''} />
<span>3. Novidades da Coleção</span>
</label>
<label style="display:flex;align-items:center;gap:8px;font-size:0.86rem;cursor:pointer;">
<input type="checkbox" name="promotions" ${hs.promotions !== false ? 'checked' : ''} />
<span>4. Promoções Selecionadas</span>
</label>
<label style="display:flex;align-items:center;gap:8px;font-size:0.86rem;cursor:pointer;">
<input type="checkbox" name="categories" ${hs.categories !== false ? 'checked' : ''} />
<span>5. Explore por Categoria</span>
</label>
<label style="display:flex;align-items:center;gap:8px;font-size:0.86rem;cursor:pointer;">
<input type="checkbox" name="brandStory" ${hs.brandStory !== false ? 'checked' : ''} />
<span>6. Sobre a Marca (A Essência)</span>
</label>
</div>
<button type="submit" class="btn btn-primary btn-sm">Salvar Organização da Página Inicial</button>
</form>
</div>
`;
return _origRenderCategoriesBannersCouponsSection() + homeVisibilityCard;
}
bindAdminWorkspaceEvents = function (containerEl) {
const app = window.ByAngelyApp;
const db = app.getState().db;
if (db && db.paymentSettings) db.paymentSettings.paymentConfigVersion = 4;
_origBindAdminWorkspaceEvents(containerEl);
const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';
async function updateOrderStatusOnServer(orderId, newStatus, trackingCode) {
try {
const res = await fetch(`${apiBase}/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
status: newStatus,
trackingCode,
actorName: app.getState().currentAdmin ? app.getState().currentAdmin.name : 'Proprietária BY ANGÉLY'
})
});
const data = await res.json();
if (res.ok && data && data.ok && data.order) {
const idx = (db.orders || []).findIndex((o) => o.id === orderId);
if (idx >= 0) db.orders[idx] = data.order;
app.saveDatabase(`Pedido ${data.order.orderNumber} atualizado para ${data.order.statusLabel}`);
app.showToast(`Status do pedido ${data.order.orderNumber} atualizado para "${data.order.statusLabel}"!`, 'success');
renderAdminView(containerEl);
return;
}
} catch (e) {}
const ord = (db.orders || []).find((o) => o.id === orderId);
if (ord) {
const opt = FULL_ORDER_STATUS_OPTIONS.find((x) => x.value === newStatus);
ord.status = newStatus;
ord.statusLabel = opt ? opt.label : newStatus;
if (trackingCode !== undefined && ord.shipping) {
ord.shipping.trackingCode = trackingCode;
}
app.saveDatabase(`Pedido ${ord.orderNumber} atualizado para ${ord.statusLabel}`);
app.showToast(`Pedido ${ord.orderNumber} atualizado!`, 'success');
renderAdminView(containerEl);
}
}
containerEl.querySelectorAll('[data-admin-quick-status]').forEach((btn) => {
btn.addEventListener('click', () => {
const oid = btn.getAttribute('data-order-id');
const nextSt = btn.getAttribute('data-admin-quick-status');
const trInp = containerEl.querySelector(`#ord-track-${oid}`);
const trVal = trInp ? trInp.value.trim() : undefined;
updateOrderStatusOnServer(oid, nextSt, trVal);
});
});
containerEl.querySelectorAll('[data-action-admin="save-order-update"]').forEach((btn) => {
btn.addEventListener('click', (e) => {
e.preventDefault();
e.stopImmediatePropagation();
const oid = btn.getAttribute('data-order-id');
const stSel = containerEl.querySelector(`#ord-status-${oid}`);
const trInp = containerEl.querySelector(`#ord-track-${oid}`);
if (oid && stSel) {
updateOrderStatusOnServer(oid, stSel.value, trInp ? trInp.value.trim() : undefined);
}
}, true);
});
const pixExpForm = containerEl.querySelector('#admin-pix-expiration-form');
if (pixExpForm) {
pixExpForm.addEventListener('submit', async (e) => {
e.preventDefault();
const fd = new FormData(pixExpForm);
const mins = Math.max(1, Math.min(120, Number(fd.get('expirationMinutes')) || 15));
db.paymentSettings.pix.expirationMinutes = mins;
await app.saveDatabase(`Prazo de expiração do QR Code Pix ajustado para ${mins} minutos.`);
app.showToast(`Prazo de expiração do Pix salvo (${mins} minutos)!`, 'success');
renderAdminView(containerEl);
});
}
containerEl.querySelectorAll('[data-admin-review-action]').forEach((btn) => {
btn.addEventListener('click', async () => {
const act = btn.getAttribute('data-admin-review-action');
const rid = btn.getAttribute('data-review-id');
const rev = (db.reviews || []).find((r) => r.id === rid);
if (!rev) return;
if (act === 'toggle') {
rev.status = rev.status === 'hidden' ? 'approved' : 'hidden';
await app.saveDatabase(`Avaliação de ${rev.customerName} ${rev.status === 'hidden' ? 'ocultada' : 'aprovada'}.`);
app.showToast('Visibilidade da avaliação atualizada!', 'success');
renderAdminView(containerEl);
} else if (act === 'delete') {
db.reviews = (db.reviews || []).filter((r) => r.id !== rid);
await app.saveDatabase(`Avaliação de ${rev.customerName} removida.`);
app.showToast('Avaliação excluída.');
renderAdminView(containerEl);
}
});
});
const homeSecForm = containerEl.querySelector('#admin-home-sections-form');
if (homeSecForm) {
homeSecForm.addEventListener('submit', async (e) => {
e.preventDefault();
const fd = new FormData(homeSecForm);
db.storeSettings.homeSections = {
hero: fd.get('hero') === 'on',
featured: fd.get('featured') === 'on',
newArrivals: fd.get('newArrivals') === 'on',
promotions: fd.get('promotions') === 'on',
categories: fd.get('categories') === 'on',
brandStory: fd.get('brandStory') === 'on'
};
await app.saveDatabase('Seções visíveis da Página Inicial atualizadas.');
app.showToast('Organização da Página Inicial salva com sucesso!', 'success');
renderAdminView(containerEl);
});
}
}

// ============================================================================
// BY ANGELY — V6: PAINEL ADMINISTRATIVO MOBILE EM CARTÕES, NAVEGAÇÃO PRÓPRIA,
// GESTÃO DE SOLICITAÇÕES DE CANCELAMENTO DE PEDIDOS PAGOS, GERENCIAMENTO DE
// CONTAS DE CLIENTES (BLOQUEIO / DESBLOQUEIO / EXCLUSÃO / ANONIMIZAÇÃO) E AUDITORIA
// ============================================================================
AdminState.customerSearchTerm = AdminState.customerSearchTerm || '';
AdminState.customerStatusFilter = AdminState.customerStatusFilter || 'all';

function getAdminHeadersV6(app) {
  const curr = (app && app.getState && app.getState().currentAdmin) || {};
  const headers = {
    'Content-Type': 'application/json',
    'X-Admin-Role': curr.role || 'owner',
    'X-Admin-Email': curr.email || 'byangely1@gmail.com'
  };
  if (curr.token) {
    headers['X-Admin-Token'] = curr.token;
    headers['Authorization'] = 'Bearer ' + curr.token;
  }
  return headers;
}

function ensureV6AdminStylesAndModals() {
  if (!document.getElementById('by-angely-v6-admin-styles')) {
    const st = document.createElement('style');
    st.id = 'by-angely-v6-admin-styles';
    st.textContent = [
      'body.admin-page-active #category-strip-nav, body.admin-page-active .category-strip { display: none !important; }',
      'body.admin-page-active .floating-whatsapp-concierge { display: none !important; }',
      '.admin-compact-header-v6 { background: #111111; color: #F7F7F7; border-bottom: 1px solid rgba(228, 228, 231,0.18); padding: 10px 16px; position: sticky; top: 0; z-index: 90; }',
      '.admin-compact-header-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; max-width: 1440px; margin: 0 auto 8px; }',
      '.admin-compact-brand { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }',
      '.admin-compact-brand-title { font-family: var(--font-serif); font-size: 1.25rem; color: #F7F7F7; letter-spacing: 0.06em; font-weight: 700; }',
      '.admin-compact-badge { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; padding: 3px 8px; border-radius: 999px; background: rgba(255, 255, 255,0.22); color: #F7F7F7; font-weight: 600; }',
      '.admin-compact-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }',
      '.admin-compact-nav-strip { display: flex; align-items: center; gap: 6px; overflow-x: auto; padding-bottom: 4px; max-width: 1440px; margin: 0 auto; scrollbar-width: thin; -webkit-overflow-scrolling: touch; }',
      '.admin-compact-nav-pill { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 999px; border: 1px solid rgba(228, 228, 231,0.22); background: rgba(255,255,255,0.06); color: #E4E4E7; font-size: 0.76rem; font-weight: 600; white-space: nowrap; cursor: pointer; transition: all 0.18s ease; min-height: 36px; }',
      '.admin-compact-nav-pill:hover { background: rgba(255,255,255,0.14); color: #FFFFFF; }',
      '.admin-compact-nav-pill.active { background: #111111; border-color: #A1A1AA; color: #FFFFFF; box-shadow: 0 2px 8px rgba(0,0,0,0.22); }',
      '.admin-config-subbar-v6 { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 14px; background: #F7F7F7; border: 1px solid #D4D4D8; border-radius: 10px; margin-bottom: 16px; }',
      '.admin-config-subpill { padding: 7px 14px; border-radius: 8px; border: 1px solid #D4D4D8; background: #FFFFFF; color: #52525B; font-size: 0.78rem; font-weight: 600; cursor: pointer; min-height: 36px; }',
      '.admin-config-subpill.active { background: #111111; border-color: #111111; color: #FFFFFF; }',
      '.pm-method-name { display: block; font-size: 0.96rem; color: #111111; margin-bottom: 4px; line-height: 1.35; }',
      '.pm-method-desc { font-size: 0.8rem; color: #52525B; line-height: 1.45; white-space: normal; word-break: normal; overflow-wrap: break-word; }',
      '.pm-integration-detail { font-size: 0.75rem; color: #52525B; margin-top: 4px; line-height: 1.4; white-space: normal; word-break: normal; overflow-wrap: break-word; }',
      '@media (max-width: 768px) {',
      '  .admin-mobile-topbar { display: none !important; }',
      '  .admin-shell { display: block !important; padding: 0 !important; }',
      '  .admin-sidebar { display: none !important; }',
      '  .admin-sidebar.mobile-open { display: flex !important; position: fixed !important; inset: 0 !important; z-index: 9990 !important; width: 100% !important; max-width: 320px !important; overflow-y: auto !important; }',
      '  .admin-main { padding: 14px 12px 36px !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; overflow-x: hidden !important; }',
      '  .admin-card { padding: 16px 14px !important; border-radius: 12px !important; margin-bottom: 16px !important; box-sizing: border-box !important; width: 100% !important; overflow: hidden !important; }',
      '  .admin-main h1 { font-size: 1.48rem !important; line-height: 1.25 !important; }',
      '  .admin-main h2 { font-size: 1.24rem !important; line-height: 1.3 !important; }',
      '  .admin-form-grid-2, .admin-form-grid-3, .admin-form-grid-4, .admin-product-split { display: flex !important; flex-direction: column !important; gap: 12px !important; width: 100% !important; }',
      '  .admin-main .data-table, .admin-main .data-table tbody { display: block !important; width: 100% !important; min-width: 0 !important; }',
      '  .admin-main .data-table thead { display: none !important; }',
      '  .admin-main .data-table tbody tr { display: flex !important; flex-direction: column !important; gap: 10px !important; background: #FFFFFF !important; border: 1px solid #D4D4D8 !important; border-radius: 12px !important; padding: 15px 14px !important; margin-bottom: 12px !important; box-shadow: 0 3px 10px rgba(17, 17, 17,0.05) !important; width: 100% !important; box-sizing: border-box !important; }',
      '  .admin-main .data-table tbody td { display: block !important; width: 100% !important; min-width: 0 !important; max-width: 100% !important; padding: 0 !important; border: none !important; text-align: left !important; white-space: normal !important; word-break: normal !important; overflow-wrap: break-word !important; font-size: 0.86rem !important; line-height: 1.45 !important; box-sizing: border-box !important; }',
      '  .admin-main .data-table tbody td[data-label]::before { content: attr(data-label); display: block; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #111111; margin-bottom: 3px; }',
      '  .admin-main .data-table.admin-payment-methods-table tbody td.pm-cell-title::before { display: none !important; }',
      '  .admin-main .data-table.admin-payment-methods-table .pm-method-name { font-size: 1.04rem !important; font-weight: 700 !important; color: #111111 !important; margin-bottom: 5px !important; }',
      '  .admin-main .data-table.admin-payment-methods-table .pm-method-desc { font-size: 0.85rem !important; color: #52525B !important; line-height: 1.48 !important; }',
      '  .admin-main .data-table.admin-payment-methods-table tbody td.pm-cell-state, .admin-main .data-table.admin-payment-methods-table tbody td.pm-cell-integration { padding-top: 8px !important; border-top: 1px dashed #E4E4E7 !important; }',
      '  .admin-main .data-table.admin-payment-methods-table tbody td.pm-cell-action { padding-top: 8px !important; }',
      '  .admin-main .data-table.admin-payment-methods-table .pm-action-btn, .admin-main .data-table tbody td:last-child .btn { width: 100% !important; min-height: 42px !important; justify-content: center !important; font-size: 0.84rem !important; }',
      '}'
    ].join('\n');
    document.head.appendChild(st);
  }

  // Modal Admin 1: Bloquear Conta de Cliente
  if (!document.getElementById('admin-block-customer-modal')) {
    const mBlock = document.createElement('div');
    mBlock.id = 'admin-block-customer-modal';
    mBlock.className = 'v6-modal-backdrop';
    mBlock.setAttribute('aria-hidden', 'true');
    mBlock.innerHTML = [
      '<div class="v6-modal-card" role="dialog" aria-modal="true" aria-labelledby="admin-block-cust-title">',
      '  <span class="section-eyebrow" style="color:#111111;">Segurança e Gerenciamento de Contas</span>',
      '  <h2 id="admin-block-cust-title" style="font-family:var(--font-serif);font-size:1.5rem;margin-bottom:6px;color:#111111;">Bloquear Conta de Cliente</h2>',
      '  <p id="admin-block-cust-desc" style="font-size:0.84rem;color:#52525B;line-height:1.45;margin-bottom:12px;">A conta bloqueada ficará impedida de realizar login e novas compras. O histórico de pedidos será preservado e você poderá desbloqueá-la quando desejar.</p>',
      '  <form id="admin-block-customer-form" novalidate>',
      '    <input type="hidden" id="admin-block-cust-id-input" value="" />',
      '    <div class="form-field-group" style="margin-bottom:14px;">',
      '      <label class="form-field-label" for="admin-block-cust-reason-input">Motivo do bloqueio (registrado na auditoria) <span class="req-star">*</span></label>',
      '      <textarea id="admin-block-cust-reason-input" class="form-control" rows="2" required placeholder="Informe o motivo administrativo para o bloqueio desta conta..."></textarea>',
      '    </div>',
      '    <div id="admin-block-cust-error" style="display:none;padding:10px 12px;border-radius:8px;background:#F4F4F5;border:1px solid #D4D4D8;color:#111111;font-size:0.8rem;margin-bottom:12px;"></div>',
      '    <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">',
      '      <button type="button" class="btn btn-outline btn-sm" data-action-admin="close-block-customer-modal" style="min-height:40px;">Cancelar</button>',
      '      <button type="submit" id="btn-confirm-block-customer" class="btn btn-danger btn-sm" style="min-height:40px;">Confirmar Bloqueio</button>',
      '    </div>',
      '  </form>',
      '</div>'
    ].join('');
    document.body.appendChild(mBlock);
  }

  // Modal Admin 2: Excluir ou Anonimizar Conta de Cliente (Confirmação Reforçada + Senha Admin)
  if (!document.getElementById('admin-delete-customer-modal')) {
    const mDel = document.createElement('div');
    mDel.id = 'admin-delete-customer-modal';
    mDel.className = 'v6-modal-backdrop';
    mDel.setAttribute('aria-hidden', 'true');
    mDel.innerHTML = [
      '<div class="v6-modal-card" role="dialog" aria-modal="true" aria-labelledby="admin-del-cust-title">',
      '  <span class="section-eyebrow" style="color:#111111;">Ação Irreversível • Confirmação Reforçada</span>',
      '  <h2 id="admin-del-cust-title" style="font-family:var(--font-serif);font-size:1.5rem;margin-bottom:6px;color:#111111;">Excluir ou Anonimizar Conta</h2>',
      '  <div style="background:#F4F4F5;border:1px solid #D4D4D8;border-radius:10px;padding:12px 14px;font-size:0.8rem;color:#6E2828;line-height:1.45;margin-bottom:12px;">',
      '    <strong>Atenção Administradora:</strong>',
      '    <ul style="margin:4px 0 0 18px;">',
      '      <li>Os dados pessoais da cliente (nome, e-mail, telefone, CPF e endereços) serão <strong>anonimizados permanentemente</strong>.</li>',
      '      <li>Pedidos anteriores, registros financeiros e histórico de transações serão <strong>preservados</strong> para integridade contábil e fiscal.</li>',
      '      <li>Pedidos em aberto não pagos serão cancelados e terão seu estoque liberado.</li>',
      '    </ul>',
      '  </div>',
      '  <form id="admin-delete-customer-form" novalidate>',
      '    <input type="hidden" id="admin-del-cust-id-input" value="" />',
      '    <div class="form-field-group" style="margin-bottom:12px;">',
      '      <label class="form-field-label" for="admin-del-cust-reason-input">Motivo da exclusão / anonimização <span class="req-star">*</span></label>',
      '      <input type="text" id="admin-del-cust-reason-input" class="form-control" required placeholder="Ex.: Solicitação titular LGPD / Encerramento administrativo" />',
      '    </div>',
      '    <div class="form-field-group" style="margin-bottom:12px;">',
      '      <label class="form-field-label" for="admin-del-cust-password-input">Reautenticação: Digite sua senha administrativa <span class="req-star">*</span></label>',
      '      <input type="password" id="admin-del-cust-password-input" class="form-control" required placeholder="Sua senha de administradora" />',
      '    </div>',
      '    <label style="display:flex;align-items:flex-start;gap:8px;font-size:0.8rem;color:#111111;margin-bottom:14px;cursor:pointer;">',
      '      <input type="checkbox" id="admin-del-cust-confirm-chk" required style="margin-top:3px;" />',
      '      <span>Confirmo que revisei os dados da conta e autorizo a exclusão/anonimização definitiva desta conta de cliente.</span>',
      '    </label>',
      '    <div id="admin-del-cust-error" style="display:none;padding:10px 12px;border-radius:8px;background:#F4F4F5;border:1px solid #D4D4D8;color:#111111;font-size:0.8rem;margin-bottom:12px;"></div>',
      '    <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">',
      '      <button type="button" class="btn btn-outline btn-sm" data-action-admin="close-delete-customer-modal" style="min-height:40px;">Cancelar</button>',
      '      <button type="submit" id="btn-confirm-admin-delete-customer" class="btn btn-danger btn-sm" style="min-height:40px;">Confirmar Exclusão / Anonimização</button>',
      '    </div>',
      '  </form>',
      '</div>'
    ].join('');
    document.body.appendChild(mDel);
  }
}

// Aplica data-label automaticamente em todas as células de tabelas administrativas para exibição em cartões no celular
function applyMobileCardLabelsToAdminTables(rootEl) {
  if (!rootEl) return;
  rootEl.querySelectorAll('table.data-table').forEach((table) => {
    const headers = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent.trim());
    if (headers.length === 0) return;
    table.querySelectorAll('tbody tr').forEach((tr) => {
      Array.from(tr.children).forEach((td, idx) => {
        if (td.tagName === 'TD' && !td.hasAttribute('data-label') && headers[idx]) {
          td.setAttribute('data-label', headers[idx]);
        }
      });
    });
  });
}

// Renderiza o bloco de Solicitações de Cancelamento de Pedidos Pagos (Item 5)
function renderPaidOrderCancellationRequestsCardV6(orders, app, canManageOrders) {
  const reqOrders = (orders || []).filter((o) => o && o.cancellationRequest);
  if (reqOrders.length === 0) return '';
  return [
    '<div class="admin-card" id="admin-paid-cancellation-requests-card" style="border:1.5px solid #111111;margin-bottom:20px;background:#FFFDF9;">',
    '  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">',
    '    <div>',
    '      <span class="section-eyebrow" style="color:#111111;">Pós-Venda Financeiro • Pedidos Pagos</span>',
    '      <h2 style="font-family:var(--font-serif);font-size:1.5rem;margin-bottom:2px;">Solicitações de Cancelamento e Reembolso (' + reqOrders.length + ')</h2>',
    '      <p style="font-size:0.82rem;color:var(--text-secondary);margin:0;">Analise os pedidos pagos cujo cancelamento foi solicitado pela cliente. O reembolso só é marcado como concluído mediante confirmação real do provedor/comprovante.</p>',
    '    </div>',
    '  </div>',
    '  <div style="display:flex;flex-direction:column;gap:12px;">',
    reqOrders.map((ord) => {
      const req = ord.cancellationRequest || {};
      const badgeClass = (req.status === 'approved' || req.status === 'refunded') ? 'confirmed' : req.status === 'rejected' ? 'danger' : 'pending';
      return [
        '<div class="admin-cancel-request-item" data-cancel-req-order-id="' + app.escapeHtml(ord.id) + '" style="padding:14px;border:1px solid #D4D4D8;border-radius:10px;background:#FFFFFF;">',
        '  <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:8px;">',
        '    <div>',
        '      <strong style="font-size:1rem;color:#111111;">Pedido ' + app.escapeHtml(ord.orderNumber) + ' • ' + app.escapeHtml((ord.customer && ord.customer.name) || 'Cliente') + '</strong>',
        '      <div style="font-size:0.78rem;color:var(--text-secondary);">Valor pago: <strong>' + app.formatBRL(ord.total) + '</strong> • Solicitado em: ' + app.formatDateBR(req.createdAt) + '</div>',
        '    </div>',
        '    <span class="status-pill ' + badgeClass + '">' + app.escapeHtml(req.statusLabel || req.status) + '</span>',
        '  </div>',
        '  <div style="font-size:0.84rem;color:#111111;margin-bottom:10px;padding:8px 10px;background:#F7F7F7;border-radius:6px;">',
        '    <div><strong>Motivo informado pela cliente:</strong> ' + app.escapeHtml(req.reason || '-') + '</div>',
        (req.adminReason ? '<div style="margin-top:4px;"><strong>Justificativa / Nota Administrativa:</strong> ' + app.escapeHtml(req.adminReason) + '</div>' : ''),
        (req.refundReference ? '<div style="margin-top:4px;color:#111111;"><strong>Comprovante / ID do Reembolso:</strong> ' + app.escapeHtml(req.refundReference) + '</div>' : ''),
        '  </div>',
        (canManageOrders ? [
          '  <div class="admin-form-grid-2" style="margin-bottom:10px;">',
          '    <div>',
          '      <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:3px;">Justificativa ou Observação para a Cliente</label>',
          '      <input type="text" class="form-control" id="admin-cancel-req-reason-' + app.escapeHtml(ord.id) + '" placeholder="Justificativa (obrigatória ao recusar)..." value="' + app.escapeHtml(req.adminReason || '') + '" style="min-height:38px;" />',
          '    </div>',
          '    <div>',
          '      <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:3px;">Comprovante / Código de Estorno no Provedor</label>',
          '      <input type="text" class="form-control" id="admin-cancel-req-ref-' + app.escapeHtml(ord.id) + '" placeholder="Ex.: E2E / ID da transação de estorno Pix" value="' + app.escapeHtml(req.refundReference || '') + '" style="min-height:38px;" />',
          '    </div>',
          '  </div>',
          '  <div style="display:flex;gap:8px;flex-wrap:wrap;">',
          '    <button type="button" class="btn btn-primary btn-sm" data-action-admin="paid-cancel-decision" data-decision="approve" data-order-id="' + app.escapeHtml(ord.id) + '">1. Aprovar Solicitação</button>',
          '    <button type="button" class="btn btn-outline btn-sm" data-action-admin="paid-cancel-decision" data-decision="start_refund" data-order-id="' + app.escapeHtml(ord.id) + '">2. Iniciar Reembolso</button>',
          '    <button type="button" class="btn btn-gold btn-sm" data-action-admin="paid-cancel-decision" data-decision="confirm_refund" data-order-id="' + app.escapeHtml(ord.id) + '">3. Confirmar Reembolso no Provedor</button>',
          '    <button type="button" class="btn btn-danger btn-sm" data-action-admin="paid-cancel-decision" data-decision="reject" data-order-id="' + app.escapeHtml(ord.id) + '">Recusar com Justificativa</button>',
          '  </div>'
        ].join('') : ''),
        '</div>'
      ].join('');
    }).join(''),
    '  </div>',
    '</div>'
  ].join('');
}

const _origRenderOrdersSectionV5 = renderOrdersSection;
renderOrdersSection = function () {
  const app = window.ByAngelyApp;
  const db = app.getState().db;
  const orders = db.orders || [];
  const currentAdmin = app.getState().currentAdmin;
  const canManageOrders = hasPermission(currentAdmin, 'orders');
  const cancelRequestsHtml = renderPaidOrderCancellationRequestsCardV6(orders, app, canManageOrders);
  return cancelRequestsHtml + _origRenderOrdersSectionV5();
};

// Renderiza a área completa "CLIENTES E GERENCIAMENTO DE CONTAS" (Item 7)
renderCustomersSection = function () {
  const app = window.ByAngelyApp;
  const db = app.getState().db;
  const customers = db.customers || [];
  const orders = db.orders || [];
  const messages = db.contactMessages || [];
  const reviews = db.reviews || [];
  const currentAdmin = app.getState().currentAdmin;
  const canManageCustomers = hasPermission(currentAdmin, 'customers');

  const q = String(AdminState.customerSearchTerm || '').trim().toLowerCase();
  const stFilter = AdminState.customerStatusFilter || 'all';

  const enrichedCustomers = customers.map((c) => {
    const emailNorm = String(c.email || '').trim().toLowerCase();
    const custOrders = orders.filter((o) => {
      if (!o) return false;
      if (o.customerId && c.id && o.customerId === c.id) return true;
      const oe = o.customer && o.customer.email ? String(o.customer.email).trim().toLowerCase() : '';
      return oe && oe === emailNorm;
    });
    let lastAct = c.lastActivityAt || c.updatedAt || c.createdAt || '';
    custOrders.forEach((o) => {
      if (o.createdAt && (!lastAct || new Date(o.createdAt) > new Date(lastAct))) {
        lastAct = o.createdAt;
      }
    });
    const statusRaw = String(c.accountStatus || 'active');
    let statusLabel = 'Ativa';
    let badgeClass = 'confirmed';
    if (statusRaw === 'blocked') {
      statusLabel = 'Bloqueada';
      badgeClass = 'danger';
    } else if (statusRaw === 'deletion_requested') {
      statusLabel = 'Exclusão solicitada';
      badgeClass = 'pending';
    } else if (statusRaw === 'deleted_anonymized' || c.anonymized) {
      statusLabel = 'Excluída / Anonimizada';
      badgeClass = 'danger';
    }
    return {
      raw: c,
      ordersCount: custOrders.length,
      lastActivityAt: lastAct,
      statusRaw,
      statusLabel,
      badgeClass
    };
  });

  const filteredCustomers = enrichedCustomers.filter((item) => {
    const c = item.raw;
    if (stFilter !== 'all' && item.statusRaw !== stFilter) return false;
    if (!q) return true;
    const idStr = String(c.id || '').toLowerCase();
    const nameStr = String(c.name || '').toLowerCase();
    const emailStr = String(c.email || '').toLowerCase();
    const phoneStr = String(c.phone || '').toLowerCase();
    const phoneDigits = phoneStr.replace(/[^0-9]/g, '');
    const qDigits = q.replace(/[^0-9]/g, '');
    return (
      idStr.includes(q) ||
      nameStr.includes(q) ||
      emailStr.includes(q) ||
      phoneStr.includes(q) ||
      (qDigits.length >= 3 && phoneDigits.includes(qDigits))
    );
  });

  return [
    '<div>',
    '  <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px;">',
    '    <div>',
    '      <span class="section-eyebrow">Relacionamento, Segurança & Conformidade LGPD</span>',
    '      <h1 style="font-family:var(--font-serif);font-size:2rem;margin-bottom:4px;">CLIENTES E GERENCIAMENTO DE CONTAS</h1>',
    '      <p style="font-size:0.86rem;color:var(--text-secondary);margin:0;">Consulte clientes cadastradas, histórico de pedidos, situação da conta e execute ações administrativas auditadas.</p>',
    '    </div>',
    '  </div>',
    '  <div class="admin-card" id="admin-customers-management-card">',
    '    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">',
    '      <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin:0;">Contas Cadastradas (' + filteredCustomers.length + ' de ' + customers.length + ')</h2>',
    '      <div style="display:flex;gap:10px;flex-wrap:wrap;flex:1;max-width:620px;justify-content:flex-end;">',
    '        <input type="search" id="admin-customer-account-search" class="form-control" placeholder="Buscar por nome, e-mail, telefone ou ID da conta..." value="' + app.escapeHtml(AdminState.customerSearchTerm) + '" style="flex:1;min-width:220px;min-height:40px;" />',
    '        <select id="admin-customer-status-filter" class="form-control" style="width:auto;min-height:40px;">',
    '          <option value="all" ' + (stFilter === 'all' ? 'selected' : '') + '>Todas as situações (' + customers.length + ')</option>',
    '          <option value="active" ' + (stFilter === 'active' ? 'selected' : '') + '>Ativas</option>',
    '          <option value="blocked" ' + (stFilter === 'blocked' ? 'selected' : '') + '>Bloqueadas</option>',
    '          <option value="deletion_requested" ' + (stFilter === 'deletion_requested' ? 'selected' : '') + '>Exclusão solicitada</option>',
    '          <option value="deleted_anonymized" ' + (stFilter === 'deleted_anonymized' ? 'selected' : '') + '>Excluídas / Anonimizadas</option>',
    '        </select>',
    '      </div>',
    '    </div>',
    (filteredCustomers.length === 0
      ? '<p style="font-size:0.88rem;color:var(--text-secondary);padding:16px 0;">Nenhuma conta encontrada para os critérios de busca informados.</p>'
      : [
          '<div class="admin-table-responsive-wrap">',
          '  <table class="data-table" id="admin-customers-accounts-table">',
          '    <thead>',
          '      <tr>',
          '        <th>Nome / ID da Conta</th>',
          '        <th>E-mail & Telefone</th>',
          '        <th>Data de Cadastro</th>',
          '        <th>Situação da Conta</th>',
          '        <th>Pedidos</th>',
          '        <th>Última Atividade</th>',
          '        <th>Ações Administrativas</th>',
          '      </tr>',
          '    </thead>',
          '    <tbody>',
          filteredCustomers.map((item) => {
            const c = item.raw;
            const rev = Boolean(AdminState.revealedCustomers[c.id]);
            const isAnon = item.statusRaw === 'deleted_anonymized' || Boolean(c.anonymized);
            const isBlocked = item.statusRaw === 'blocked';
            const isOwnerEmail = String(c.email || '').toLowerCase() === 'byangely1@gmail.com';
            return [
              '<tr data-customer-account-row="' + app.escapeHtml(c.id) + '">',
              '  <td data-label="Nome / ID da Conta">',
              '    <strong style="font-size:0.94rem;color:#111111;display:block;">' + app.escapeHtml(c.name || '-') + '</strong>',
              '    <code style="font-size:0.72rem;color:var(--text-secondary);">ID: ' + app.escapeHtml(c.id || '-') + '</code>',
              '  </td>',
              '  <td data-label="E-mail & Telefone">',
              '    <div>' + app.escapeHtml(rev || isAnon ? (c.email || '-') : maskSensitiveData(c.email, 'email')) + '</div>',
              '    <div style="font-size:0.78rem;color:var(--text-secondary);">Tel: ' + app.escapeHtml(rev || isAnon ? (c.phone || '-') : maskSensitiveData(c.phone, 'phone')) + '</div>',
              '  </td>',
              '  <td data-label="Data de Cadastro" style="font-size:0.8rem;">' + (c.createdAt ? app.formatDateBR(c.createdAt) : '-') + '</td>',
              '  <td data-label="Situação da Conta">',
              '    <span class="status-pill ' + item.badgeClass + '" data-customer-status-badge="' + app.escapeHtml(c.id) + '">' + app.escapeHtml(item.statusLabel) + '</span>',
              (c.blockedReason ? '<div style="font-size:0.73rem;color:#111111;margin-top:3px;">Motivo: ' + app.escapeHtml(c.blockedReason) + '</div>' : ''),
              (c.deletionRequestReason ? '<div style="font-size:0.73rem;color:#18181B;margin-top:3px;">Solicitação: ' + app.escapeHtml(c.deletionRequestReason) + '</div>' : ''),
              '  </td>',
              '  <td data-label="Quantidade de Pedidos"><strong>' + item.ordersCount + ' pedido(s)</strong></td>',
              '  <td data-label="Última Atividade" style="font-size:0.8rem;">' + (item.lastActivityAt ? app.formatDateBR(item.lastActivityAt) : '-') + '</td>',
              '  <td data-label="Ações Administrativas">',
              '    <div style="display:flex;gap:6px;flex-wrap:wrap;">',
              (!isAnon ? '<button type="button" class="btn btn-outline btn-sm" data-action-admin="toggle-reveal-customer" data-cust-id="' + app.escapeHtml(c.id) + '">' + (rev ? 'Ocultar' : 'Revelar Dados') + '</button>' : ''),
              (canManageCustomers && !isOwnerEmail && !isAnon ? (
                isBlocked
                  ? '<button type="button" class="btn btn-primary btn-sm" data-action-admin="unblock-customer-account" data-cust-id="' + app.escapeHtml(c.id) + '" data-cust-name="' + app.escapeHtml(c.name) + '">Desbloquear Conta</button>'
                  : '<button type="button" class="btn btn-outline btn-sm" style="color:#111111;border-color:#D4D4D8;" data-action-admin="open-block-customer-modal" data-cust-id="' + app.escapeHtml(c.id) + '" data-cust-name="' + app.escapeHtml(c.name) + '">Bloquear Conta</button>'
              ) : ''),
              (canManageCustomers && !isOwnerEmail && !isAnon
                ? '<button type="button" class="btn btn-danger btn-sm" data-action-admin="open-delete-customer-modal" data-cust-id="' + app.escapeHtml(c.id) + '" data-cust-name="' + app.escapeHtml(c.name) + '">Excluir / Anonimizar</button>'
                : ''),
              (isAnon ? '<span style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">Dados Anonimizados (LGPD)</span>' : ''),
              '    </div>',
              '  </td>',
              '</tr>'
            ].join('');
          }).join(''),
          '    </tbody>',
          '  </table>',
          '</div>'
        ].join('')),
    '  </div>',
    '  <div class="admin-card">',
    '    <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:12px;">Atendimentos e Dúvidas Recebidas no SAC (' + messages.length + ')</h2>',
    (messages.length === 0
      ? '<p style="font-size:0.86rem;color:var(--text-secondary);">Nenhuma mensagem de atendimento pendente.</p>'
      : messages.map((m) => [
          '<div style="padding:12px;border:1px solid var(--border-subtle);border-radius:6px;margin-bottom:10px;font-size:0.86rem;">',
          '  <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;">',
          '    <strong>' + app.escapeHtml(m.subject) + ' — ' + app.escapeHtml(m.name) + ' (' + app.escapeHtml(m.email) + ')</strong>',
          '    <span class="status-pill ' + (m.status === 'Atendido' ? 'confirmed' : 'pending') + '">' + app.escapeHtml(m.status) + '</span>',
          '  </div>',
          '  <p style="margin:6px 0;color:var(--text-secondary);">' + app.escapeHtml(m.message) + '</p>',
          (m.status !== 'Atendido' ? '<button type="button" class="btn btn-outline btn-sm" data-action-admin="mark-sac-done" data-sac-id="' + app.escapeHtml(m.id) + '">Marcar como Atendido</button>' : ''),
          '</div>'
        ].join('')).join('')),
    '  </div>',
    '  <div class="admin-card" style="margin-top:20px;">',
    '    <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:8px;">Moderação de Avaliações de Produtos (' + reviews.length + ')</h2>',
    (reviews.length === 0
      ? '<p style="font-size:0.85rem;color:var(--text-muted);">Nenhuma avaliação enviada até o momento.</p>'
      : [
          '<div class="admin-table-responsive-wrap">',
          '  <table class="data-table">',
          '    <thead><tr><th>Data</th><th>Cliente</th><th>Nota</th><th>Comentário</th><th>Status</th><th>Ações</th></tr></thead>',
          '    <tbody>',
          reviews.map((r) => [
            '<tr>',
            '  <td data-label="Data">' + app.escapeHtml(r.date || '') + '</td>',
            '  <td data-label="Cliente"><strong>' + app.escapeHtml(r.customerName || '') + '</strong></td>',
            '  <td data-label="Nota" style="color:var(--accent-gold);font-weight:700;">' + '★'.repeat(Number(r.rating) || 5) + ' (' + (Number(r.rating) || 5) + ')</td>',
            '  <td data-label="Comentário">' + app.escapeHtml(r.comment || '(Sem comentário escrito)') + '</td>',
            '  <td data-label="Status"><span class="status-pill ' + (r.status === 'hidden' ? 'danger' : 'confirmed') + '">' + (r.status === 'hidden' ? 'Oculta' : 'Publicada') + '</span></td>',
            '  <td data-label="Ações"><div style="display:flex;gap:6px;flex-wrap:wrap;"><button type="button" class="btn btn-outline btn-sm" data-admin-review-action="toggle" data-review-id="' + app.escapeHtml(r.id) + '">' + (r.status === 'hidden' ? 'Aprovar / Exibir' : 'Ocultar') + '</button><button type="button" class="btn btn-danger btn-sm" data-admin-review-action="delete" data-review-id="' + app.escapeHtml(r.id) + '">Excluir</button></div></td>',
            '</tr>'
          ].join('')).join(''),
          '    </tbody>',
          '  </table>',
          '</div>'
        ].join('')),
    '  </div>',
    '</div>'
  ].join('');
};

// Sobrescreve renderUsersSection para incluir Histórico e Auditoria Administrativa (Item 9)
const _origRenderUsersSectionV5 = renderUsersSection;
renderUsersSection = function () {
  const app = window.ByAngelyApp;
  const db = app.getState().db;
  const logs = Array.isArray(db.auditLog) ? db.auditLog : [];
  const auditCardHtml = [
    '<div class="admin-card" id="admin-audit-log-card" style="margin-top:20px;">',
    '  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">',
    '    <div>',
    '      <span class="section-eyebrow">Rastreabilidade & Governança</span>',
    '      <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:2px;">Histórico e Auditoria de Ações Administrativas (' + logs.length + ')</h2>',
    '      <p style="font-size:0.82rem;color:var(--text-secondary);margin:0;">Registro protegido de bloqueios, desbloqueios, exclusões/anonimizações, cancelamentos, reembolsos e alterações de configuração.</p>',
    '    </div>',
    '    <button type="button" class="btn btn-outline btn-sm" data-action-admin="go-cleanup-card">Limpar Logs e Dados de Teste</button>',
    '  </div>',
    (logs.length === 0
      ? '<p style="font-size:0.85rem;color:var(--text-muted);">Nenhum evento de auditoria registrado até o momento.</p>'
      : [
          '<div class="admin-table-responsive-wrap">',
          '  <table class="data-table" id="admin-audit-log-table">',
          '    <thead>',
          '      <tr>',
          '        <th>Data e Hora</th>',
          '        <th>Administrador Responsável</th>',
          '        <th>Ação Executada</th>',
          '        <th>Conta ou Pedido Afetado</th>',
          '        <th>Motivo / Detalhes</th>',
          '      </tr>',
          '    </thead>',
          '    <tbody>',
          logs.slice(0, 60).map((lg) => [
            '<tr>',
            '  <td data-label="Data e Hora" style="font-size:0.78rem;white-space:nowrap;">' + app.formatDateBR(lg.timestamp) + '</td>',
            '  <td data-label="Administrador Responsável"><strong>' + app.escapeHtml(lg.actor || 'Sistema') + '</strong>' + (lg.actorRole ? ' <span style="font-size:0.72rem;color:var(--text-secondary);">(' + app.escapeHtml(lg.actorRole) + ')</span>' : '') + '</td>',
            '  <td data-label="Ação Executada">' + app.escapeHtml(lg.action || '-') + '</td>',
            '  <td data-label="Conta ou Pedido Afetado"><code>' + app.escapeHtml(lg.target || '-') + '</code></td>',
            '  <td data-label="Motivo / Detalhes" style="font-size:0.8rem;color:var(--text-secondary);">' + app.escapeHtml(lg.reason || '-') + '</td>',
            '</tr>'
          ].join('')).join(''),
          '    </tbody>',
          '  </table>',
          '</div>'
        ].join('')),
    '</div>'
  ].join('');
  return _origRenderUsersSectionV5() + auditCardHtml;
};

// Sobrescreve renderAdminView para adicionar o Cabeçalho Administrativo Compacto com as 8 Áreas Organizadas (Item 2)
const _origRenderAdminViewV5 = renderAdminView;
renderAdminView = function (containerEl) {
  ensureV6AdminStylesAndModals();
  document.body.classList.add('admin-page-active');
  const catNav = document.getElementById('category-strip-nav');
  if (catNav) catNav.style.display = 'none';
  const floatWa = document.querySelector('.floating-whatsapp-concierge');
  if (floatWa) floatWa.style.display = 'none';

  _origRenderAdminViewV5(containerEl);

  const app = window.ByAngelyApp;
  const state = app.getState();
  if (!state.currentAdmin) return;

  const admin = state.currentAdmin;
  const activeSec = AdminState.activeSection;
  const isConfigGroup = activeSec === 'branding' || activeSec === 'categories' || activeSec === 'policies';

  const topAreas = [
    { id: 'dashboard', label: 'Visão geral', perm: null, active: activeSec === 'dashboard' },
    { id: 'analytics', label: 'ANÁLISE DA LOJA', perm: null, active: activeSec === 'analytics' },
    { id: 'orders', label: 'Pedidos', perm: 'orders', active: activeSec === 'orders' },
    { id: 'customers', label: 'Clientes e contas', perm: 'customers', active: activeSec === 'customers' },
    { id: 'products', label: 'Produtos e estoque', perm: 'products', active: activeSec === 'products' },
    { id: 'payments', label: 'Pagamentos', perm: 'payments', active: activeSec === 'payments' },
    { id: 'shipping', label: 'Entregas', perm: 'shipping', active: activeSec === 'shipping' },
    { id: 'branding', label: 'Configurações', perm: 'branding', active: isConfigGroup },
    { id: 'users', label: 'Equipe e permissões', perm: 'users', active: activeSec === 'users' }
  ].filter((a) => !a.perm || hasPermission(admin, a.perm) || (a.id === 'branding' && (hasPermission(admin, 'categories') || hasPermission(admin, 'policies'))));

  const compactHeader = document.createElement('header');
  compactHeader.id = 'admin-compact-header-v6';
  compactHeader.className = 'admin-compact-header-v6';
  compactHeader.setAttribute('aria-label', 'Navegação Administrativa Principal');
  compactHeader.innerHTML = [
    '<div class="admin-compact-header-top">',
    '  <div class="admin-compact-brand">',
    '    <span class="admin-compact-brand-title">BY ANGÉLY</span>',
    '    <span class="admin-compact-badge">Painel Administrativo</span>',
    '    <span style="font-size:0.76rem;color:#E4E4E7;">' + app.escapeHtml(admin.name) + '</span>',
    '  </div>',
    '  <div class="admin-compact-actions">',
    '    <button type="button" class="btn btn-outline btn-sm" data-action="go-view" data-view="home" style="background:rgba(255,255,255,0.08);color:#F7F7F7;border-color:rgba(255,255,255,0.28);min-height:34px;padding:4px 10px;font-size:0.74rem;">Ver Loja ↗</button>',
    '    <button type="button" class="btn btn-danger btn-sm" id="btn-admin-compact-logout" style="min-height:34px;padding:4px 10px;font-size:0.74rem;">Sair</button>',
    '  </div>',
    '</div>',
    '<nav class="admin-compact-nav-strip" role="navigation" aria-label="Áreas do Administrador">',
    topAreas.map((area) => (
      '<button type="button" class="admin-compact-nav-pill ' + (area.active ? 'active' : '') + '" data-admin-top-nav="' + area.id + '">' + app.escapeHtml(area.label) + '</button>'
    )).join(''),
    '</nav>'
  ].join('');

  containerEl.prepend(compactHeader);

  // Se estiver em Configurações (branding / categories / policies), insere barra rápida entre as 3 sub-áreas de configuração
  const workspace = containerEl.querySelector('#admin-section-workspace');
  if (workspace && isConfigGroup) {
    const subBar = document.createElement('div');
    subBar.className = 'admin-config-subbar-v6';
    subBar.innerHTML = [
      '<strong style="font-size:0.76rem;text-transform:uppercase;letter-spacing:0.05em;color:#111111;margin-right:4px;">Configurações da Loja:</strong>',
      '<button type="button" class="admin-config-subpill ' + (activeSec === 'branding' ? 'active' : '') + '" data-admin-top-nav="branding">Identidade & Dados da Loja</button>',
      '<button type="button" class="admin-config-subpill ' + (activeSec === 'categories' ? 'active' : '') + '" data-admin-top-nav="categories">Categorias, Banners, Cupons & Home</button>',
      '<button type="button" class="admin-config-subpill ' + (activeSec === 'policies' ? 'active' : '') + '" data-admin-top-nav="policies">Políticas & Documentos Legais</button>'
    ].join('');
    workspace.prepend(subBar);
  }

  // Aplica rótulos de cartão mobile em todas as tabelas
  applyMobileCardLabelsToAdminTables(workspace || containerEl);

  // Eventos do cabeçalho compacto e das novas funcionalidades V6
  compactHeader.querySelector('#btn-admin-compact-logout')?.addEventListener('click', () => {
    app.getState().currentAdmin = null;
    sessionStorage.removeItem(STORAGE_KEY_ADMIN_SESSION);
    app.updateGlobalChrome();
    app.showToast('Sessão administrativa encerrada.');
    app.navigateTo('home');
  });

  containerEl.querySelectorAll('[data-admin-top-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetSec = btn.getAttribute('data-admin-top-nav');
      if (targetSec) {
        AdminState.activeSection = targetSec;
        AdminState.mobileMenuOpen = false;
        renderAdminView(containerEl);
      }
    });
  });

  // Busca e filtro de contas de clientes
  const custSearchInp = containerEl.querySelector('#admin-customer-account-search');
  if (custSearchInp) {
    custSearchInp.addEventListener('input', (ev) => {
      const pos = ev.target.selectionStart || ev.target.value.length;
      AdminState.customerSearchTerm = ev.target.value;
      renderAdminView(containerEl);
      const newInp = containerEl.querySelector('#admin-customer-account-search');
      if (newInp) {
        newInp.focus();
        try { newInp.setSelectionRange(pos, pos); } catch (e) {}
      }
    });
  }
  const custStatusSel = containerEl.querySelector('#admin-customer-status-filter');
  if (custStatusSel) {
    custStatusSel.addEventListener('change', (ev) => {
      AdminState.customerStatusFilter = ev.target.value;
      renderAdminView(containerEl);
    });
  }

  // Ações de decisão sobre Solicitação de Cancelamento de Pedido Pago (Item 5)
  const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';
  containerEl.querySelectorAll('[data-action-admin="paid-cancel-decision"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const orderId = btn.getAttribute('data-order-id');
      const decision = btn.getAttribute('data-decision');
      const reasonInp = containerEl.querySelector('#admin-cancel-req-reason-' + orderId);
      const refInp = containerEl.querySelector('#admin-cancel-req-ref-' + orderId);
      const adminReason = reasonInp ? reasonInp.value.trim() : '';
      const refundReference = refInp ? refInp.value.trim() : '';

      if (decision === 'reject' && adminReason.length < 3) {
        app.showToast('Informe a justificativa para recusar a solicitação de cancelamento.', 'warning');
        if (reasonInp) reasonInp.focus();
        return;
      }
      if (decision === 'confirm_refund' && refundReference.length < 2) {
        app.showToast('Informe o comprovante ou identificador do estorno no provedor antes de confirmar o reembolso.', 'warning');
        if (refInp) refInp.focus();
        return;
      }

      btn.disabled = true;
      try {
        const res = await fetch(apiBase + '/api/admin/orders/' + encodeURIComponent(orderId) + '/cancellation-decision', {
          method: 'POST',
          headers: getAdminHeadersV6(app),
          body: JSON.stringify({
            decision,
            adminReason,
            refundReference,
            actorName: admin.name,
            actorRole: admin.role,
            actorEmail: admin.email
          })
        });
        const data = await res.json();
        btn.disabled = false;
        if (!res.ok || !data || !data.ok) {
          app.showToast((data && data.error) || 'Não foi possível processar a decisão.', 'danger');
          return;
        }
        if (app.loadDatabase) await app.loadDatabase();
        app.showToast(data.message || 'Decisão registrada com sucesso!', 'success');
        renderAdminView(containerEl);
      } catch (err) {
        btn.disabled = false;
        app.showToast('Erro de conexão ao registrar decisão.', 'danger');
      }
    });
  });

  // Abrir Modal de Bloqueio de Conta
  containerEl.querySelectorAll('[data-action-admin="open-block-customer-modal"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cid = btn.getAttribute('data-cust-id') || '';
      const cname = btn.getAttribute('data-cust-name') || '';
      const modal = document.getElementById('admin-block-customer-modal');
      const idInp = document.getElementById('admin-block-cust-id-input');
      const titleEl = document.getElementById('admin-block-cust-title');
      const reasonInp = document.getElementById('admin-block-cust-reason-input');
      const errBox = document.getElementById('admin-block-cust-error');
      if (!modal || !idInp) return;
      idInp.value = cid;
      if (titleEl) titleEl.textContent = 'Bloquear Conta: ' + cname;
      if (reasonInp) reasonInp.value = '';
      if (errBox) errBox.style.display = 'none';
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    });
  });

  // Desbloquear Conta Diretamente
  containerEl.querySelectorAll('[data-action-admin="unblock-customer-account"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const cid = btn.getAttribute('data-cust-id') || '';
      if (!cid) return;
      btn.disabled = true;
      try {
        const res = await fetch(apiBase + '/api/admin/customers/' + encodeURIComponent(cid) + '/unblock', {
          method: 'POST',
          headers: getAdminHeadersV6(app),
          body: JSON.stringify({
            reason: 'Conta desbloqueada pela administração.',
            actorName: admin.name,
            actorRole: admin.role,
            actorEmail: admin.email
          })
        });
        const data = await res.json();
        btn.disabled = false;
        if (!res.ok || !data || !data.ok) {
          app.showToast((data && data.error) || 'Não foi possível desbloquear a conta.', 'danger');
          return;
        }
        if (app.loadDatabase) await app.loadDatabase();
        app.showToast(data.message || 'Conta desbloqueada com sucesso!', 'success');
        renderAdminView(containerEl);
      } catch (err) {
        btn.disabled = false;
        app.showToast('Erro ao desbloquear conta.', 'danger');
      }
    });
  });

  // Abrir Modal de Exclusão / Anonimização de Conta
  containerEl.querySelectorAll('[data-action-admin="open-delete-customer-modal"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cid = btn.getAttribute('data-cust-id') || '';
      const cname = btn.getAttribute('data-cust-name') || '';
      const modal = document.getElementById('admin-delete-customer-modal');
      const idInp = document.getElementById('admin-del-cust-id-input');
      const titleEl = document.getElementById('admin-del-cust-title');
      const reasonInp = document.getElementById('admin-del-cust-reason-input');
      const pwdInp = document.getElementById('admin-del-cust-password-input');
      const chkInp = document.getElementById('admin-del-cust-confirm-chk');
      const errBox = document.getElementById('admin-del-cust-error');
      if (!modal || !idInp) return;
      idInp.value = cid;
      if (titleEl) titleEl.textContent = 'Excluir / Anonimizar: ' + cname;
      if (reasonInp) reasonInp.value = '';
      if (pwdInp) pwdInp.value = '';
      if (chkInp) chkInp.checked = false;
      if (errBox) errBox.style.display = 'none';
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    });
  });
};

window.ByAngelyAdmin.renderAdminView = renderAdminView;

// Eventos globais para os modais administrativos de Bloqueio e Exclusão/Anonimização de Conta
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action-admin]');
  if (!target) return;
  const act = target.getAttribute('data-action-admin');
  if (act === 'close-block-customer-modal') {
    const m = document.getElementById('admin-block-customer-modal');
    if (m) { m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); }
  }
  if (act === 'close-delete-customer-modal') {
    const m = document.getElementById('admin-delete-customer-modal');
    if (m) { m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); }
  }
});

document.addEventListener('submit', async (e) => {
  const form = e.target;
  if (!form || !form.id) return;
  const app = window.ByAngelyApp;
  const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';
  const mainEl = document.getElementById('app-main-content');

  if (form.id === 'admin-block-customer-form') {
    e.preventDefault();
    const cid = (document.getElementById('admin-block-cust-id-input') || {}).value || '';
    const reasonEl = document.getElementById('admin-block-cust-reason-input');
    const errBox = document.getElementById('admin-block-cust-error');
    const btn = document.getElementById('btn-confirm-block-customer');
    const reason = String((reasonEl && reasonEl.value) || '').trim();
    if (errBox) errBox.style.display = 'none';
    if (reason.length < 3) {
      if (errBox) {
        errBox.textContent = 'Informe o motivo do bloqueio (mínimo de 3 caracteres).';
        errBox.style.display = 'block';
      }
      return;
    }
    if (btn) btn.disabled = true;
    const admin = (app && app.getState().currentAdmin) || {};
    try {
      const res = await fetch(apiBase + '/api/admin/customers/' + encodeURIComponent(cid) + '/block', {
        method: 'POST',
        headers: getAdminHeadersV6(app),
        body: JSON.stringify({
          reason,
          actorName: admin.name || 'Proprietária BY ANGÉLY',
          actorRole: admin.role || 'owner',
          actorEmail: admin.email || 'byangely1@gmail.com'
        })
      });
      const data = await res.json();
      if (btn) btn.disabled = false;
      if (!res.ok || !data || !data.ok) {
        if (errBox) {
          errBox.textContent = (data && data.error) || 'Não foi possível bloquear a conta.';
          errBox.style.display = 'block';
        }
        return;
      }
      const m = document.getElementById('admin-block-customer-modal');
      if (m) { m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); }
      if (app.loadDatabase) await app.loadDatabase();
      app.showToast(data.message || 'Conta bloqueada com sucesso!', 'success');
      if (mainEl) renderAdminView(mainEl);
    } catch (err) {
      if (btn) btn.disabled = false;
      if (errBox) {
        errBox.textContent = 'Erro de conexão ao bloquear a conta.';
        errBox.style.display = 'block';
      }
    }
    return;
  }

  if (form.id === 'admin-delete-customer-form') {
    e.preventDefault();
    const cid = (document.getElementById('admin-del-cust-id-input') || {}).value || '';
    const reasonEl = document.getElementById('admin-del-cust-reason-input');
    const pwdEl = document.getElementById('admin-del-cust-password-input');
    const chkEl = document.getElementById('admin-del-cust-confirm-chk');
    const errBox = document.getElementById('admin-del-cust-error');
    const btn = document.getElementById('btn-confirm-admin-delete-customer');
    if (errBox) errBox.style.display = 'none';

    const reason = String((reasonEl && reasonEl.value) || '').trim();
    const adminPassword = String((pwdEl && pwdEl.value) || '');
    const confirmed = Boolean(chkEl && chkEl.checked);

    if (!confirmed) {
      if (errBox) {
        errBox.textContent = 'Marque a confirmação explícita antes de excluir ou anonimizar a conta.';
        errBox.style.display = 'block';
      }
      return;
    }
    if (reason.length < 3) {
      if (errBox) {
        errBox.textContent = 'Informe o motivo administrativo da exclusão/anonimização.';
        errBox.style.display = 'block';
      }
      return;
    }
    if (!adminPassword) {
      if (errBox) {
        errBox.textContent = 'Digite sua senha administrativa para confirmar esta operação sensível.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (btn) btn.disabled = true;
    const admin = (app && app.getState().currentAdmin) || {};
    try {
      const res = await fetch(apiBase + '/api/admin/customers/' + encodeURIComponent(cid) + '/delete', {
        method: 'POST',
        headers: getAdminHeadersV6(app),
        body: JSON.stringify({
          reason,
          adminPassword,
          confirmDeletion: true,
          actorName: admin.name || 'Proprietária BY ANGÉLY',
          actorRole: admin.role || 'owner',
          actorEmail: admin.email || 'byangely1@gmail.com'
        })
      });
      const data = await res.json();
      if (btn) btn.disabled = false;
      if (!res.ok || !data || !data.ok) {
        if (errBox) {
          errBox.textContent = (data && data.error) || 'Não foi possível excluir/anonimizar a conta.';
          errBox.style.display = 'block';
        }
        return;
      }
      const m = document.getElementById('admin-delete-customer-modal');
      if (m) { m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); }
      if (app.loadDatabase) await app.loadDatabase();
      app.showToast(data.message || 'Conta excluída e anonimizada com sucesso!', 'success');
      if (mainEl) renderAdminView(mainEl);
    } catch (err) {
      if (btn) btn.disabled = false;
      if (errBox) {
        errBox.textContent = 'Erro de conexão ao excluir/anonimizar conta.';
        errBox.style.display = 'block';
      }
    }
  }
});

// ============================================================================
// SEÇÃO COMPLETA: ANÁLISE DA LOJA (VISITANTES, COMPORTAMENTO, FUNIL E VENDAS)
// ============================================================================
AdminState.analyticsPeriod = AdminState.analyticsPeriod || '30d';
AdminState.analyticsCustomStart = AdminState.analyticsCustomStart || '';
AdminState.analyticsCustomEnd = AdminState.analyticsCustomEnd || '';
AdminState.analyticsProductRankingTab = AdminState.analyticsProductRankingTab || 'mostViewed';
AdminState.analyticsReport = AdminState.analyticsReport || null;
AdminState.analyticsLoading = false;

async function fetchAdminAnalyticsReport(forceRefresh = false) {
  const app = window.ByAngelyApp;
  if (!app) return null;
  if (AdminState.analyticsLoading && !forceRefresh) return AdminState.analyticsReport;
  AdminState.analyticsLoading = true;
  try {
    const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';
    const qs = new URLSearchParams({
      period: AdminState.analyticsPeriod || '30d'
    });
    if (AdminState.analyticsPeriod === 'custom') {
      if (AdminState.analyticsCustomStart) qs.set('startDate', AdminState.analyticsCustomStart);
      if (AdminState.analyticsCustomEnd) qs.set('endDate', AdminState.analyticsCustomEnd);
    }
    const res = await fetch(apiBase + '/api/admin/analytics?' + qs.toString(), {
      method: 'GET',
      headers: getAdminHeadersV6(app)
    });
    const data = await res.json();
    AdminState.analyticsLoading = false;
    if (res.ok && data && data.ok) {
      AdminState.analyticsReport = data;
      const mainEl = document.getElementById('app-main-content');
      if (mainEl && AdminState.activeSection === 'analytics') {
        const ws = mainEl.querySelector('#admin-section-workspace');
        if (ws) {
          ws.innerHTML = renderAnalyticsSection();
          applyMobileCardLabelsToAdminTables(ws);
        }
      }
      return data;
    }
  } catch (_err) {
    AdminState.analyticsLoading = false;
  }
  return AdminState.analyticsReport;
}

function formatDeltaBadgeHtml(deltaVal) {
  const d = Number(deltaVal) || 0;
  if (d > 0) {
    return `<span style="display:inline-block;padding:2px 7px;border-radius:999px;font-size:0.72rem;font-weight:700;background:#111111;color:#FFFFFF;">▲ +${d}% vs. período anterior</span>`;
  }
  if (d < 0) {
    return `<span style="display:inline-block;padding:2px 7px;border-radius:999px;font-size:0.72rem;font-weight:700;background:#F4F4F5;border:1px solid #18181B;color:#111111;">▼ ${d}% vs. período anterior</span>`;
  }
  return `<span style="display:inline-block;padding:2px 7px;border-radius:999px;font-size:0.72rem;font-weight:600;background:#F4F4F5;color:#52525B;">= 0% vs. período anterior</span>`;
}

function renderHorizontalBarListHtml(items, app, labelKey = 'name', countKey = 'count', shareKey = 'share', emptyMsg = 'Sem registros no período.') {
  if (!Array.isArray(items) || items.length === 0 || items.every((i) => (Number(i[countKey]) || 0) === 0)) {
    return `<p style="font-size:0.83rem;color:var(--text-secondary);margin:6px 0;">${app.escapeHtml(emptyMsg)}</p>`;
  }
  const maxVal = Math.max(1, ...items.map((i) => Number(i[countKey]) || 0));
  return items.map((it) => {
    const val = Number(it[countKey]) || 0;
    const pct = it[shareKey] !== undefined ? Number(it[shareKey]) : Math.round((val / maxVal) * 100);
    const barW = Math.max(val > 0 ? 6 : 0, Math.min(100, Math.round((val / maxVal) * 100)));
    return `
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.82rem;margin-bottom:4px;gap:8px;">
          <strong style="color:#111111;word-break:break-word;">${app.escapeHtml(String(it[labelKey] || '-'))}</strong>
          <span style="color:var(--text-secondary);white-space:nowrap;font-weight:600;">${val} (${pct}%)</span>
        </div>
        <div style="width:100%;height:8px;background:#E4E4E7;border-radius:999px;overflow:hidden;">
          <div style="width:${barW}%;height:100%;background:linear-gradient(90deg,#111111,#A1A1AA);border-radius:999px;"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderAnalyticsSection() {
  const app = window.ByAngelyApp;
  const admin = app.getState().currentAdmin;
  if (!admin) {
    return '<div class="admin-card"><p>Acesso restrito a administradores autenticados.</p></div>';
  }

  if (!AdminState.analyticsReport && !AdminState.analyticsLoading) {
    fetchAdminAnalyticsReport(true);
  }

  const rep = AdminState.analyticsReport;
  const periodVal = AdminState.analyticsPeriod || '30d';

  if (!rep) {
    return `
      <div class="admin-card" id="admin-analytics-loading-card">
        <span class="section-eyebrow">Inteligência Comercial • BY ANGÉLY</span>
        <h1 style="font-family:var(--font-serif);font-size:2rem;margin-bottom:8px;">ANÁLISE DA LOJA</h1>
        <p style="font-size:0.9rem;color:var(--text-secondary);">Carregando indicadores em tempo real de visitantes, funil de compras e desempenho de vendas...</p>
      </div>
    `;
  }

  const cur = rep.overview.current;
  const prv = rep.overview.previous;
  const dlt = rep.overview.deltas;
  const priv = rep.privacyAndReliability || {};
  const fb = (rep.salesAndRevenue && rep.salesAndRevenue.financialBuckets) || {};
  const rankTab = AdminState.analyticsProductRankingTab || 'mostViewed';
  const activeRankList = (rep.productsRankings && rep.productsRankings[rankTab]) || (rep.productsRankings && rep.productsRankings.mostViewed) || [];

  const kpiCards = [
    { key: 'uniqueVisitors', label: 'Visitantes Únicos (Estimados)', value: cur.uniqueVisitors, prev: prv.uniqueVisitors, sub: `Contas autenticadas identificadas: ${cur.identifiedAccounts}` },
    { key: 'totalVisits', label: 'Total de Visitas', value: cur.totalVisits, prev: prv.totalVisits, sub: 'Acessos distintos à loja no período' },
    { key: 'sessionsStarted', label: 'Sessões Iniciadas', value: cur.sessionsStarted, prev: prv.sessionsStarted, sub: 'Janela de 30 min (protegido contra F5)' },
    { key: 'newVisitors', label: 'Visitantes Novos', value: cur.newVisitors, prev: prv.newVisitors, sub: 'Primeira visita registrada' },
    { key: 'returningVisitors', label: 'Visitantes Recorrentes', value: cur.returningVisitors, prev: prv.returningVisitors, sub: 'Retornaram em mais de uma sessão' },
    { key: 'pageViews', label: 'Visualizações de Páginas', value: cur.pageViews, prev: prv.pageViews, sub: 'Telas abertas (Início, Catálogo, etc.)' },
    { key: 'productViews', label: 'Visualizações de Produtos', value: cur.productViews, prev: prv.productViews, sub: 'Aberturas de detalhes de peças' },
    { key: 'addedToCart', label: 'Produtos Adicionados à Sacola', value: cur.addedToCart, prev: prv.addedToCart, sub: 'Unidades adicionadas à sacola' },
    { key: 'abandonedCarts', label: 'Sacolas Abandonadas', value: cur.abandonedCarts, prev: prv.abandonedCarts, sub: 'Sessões com sacola sem concluir pedido' },
    { key: 'checkoutsStarted', label: 'Checkouts Iniciados', value: cur.checkoutsStarted, prev: prv.checkoutsStarted, sub: 'Clientes que avançaram para finalização' },
    { key: 'ordersCreated', label: 'Pedidos Realizados', value: cur.ordersCreated, prev: prv.ordersCreated, sub: 'Total de pedidos gerados no período' },
    { key: 'ordersPaid', label: 'Pedidos Pagos', value: cur.ordersPaid, prev: prv.ordersPaid, sub: 'Somente pagamentos efetivamente confirmados' },
    { key: 'ordersCancelled', label: 'Pedidos Cancelados / Expirados', value: cur.ordersCancelled, prev: prv.ordersCancelled, sub: 'Cancelados pela cliente ou expirados' },
    { key: 'conversionRate', label: 'Taxa de Conversão', value: cur.conversionRate + '%', prev: prv.conversionRate + '%', sub: 'Pedidos pagos ÷ visitantes/sessões' },
    { key: 'confirmedRevenue', label: 'Faturamento Confirmado', value: app.formatBRL(cur.confirmedRevenue), prev: app.formatBRL(prv.confirmedRevenue), sub: 'Exclusivo de pedidos pagos (líquido)' }
  ];

  const rankingTabDefs = [
    { id: 'mostViewed', label: '1. Mais Visualizados' },
    { id: 'mostAddedToCart', label: '2. Mais Adicionados à Sacola' },
    { id: 'mostPurchased', label: '3. Mais Comprados (Pagos)' },
    { id: 'highestRevenue', label: '4. Maior Faturamento' },
    { id: 'highViewsLowSales', label: '5. Mais Visualizados e Menos Vendidos' },
    { id: 'highCartLowPurchase', label: '6. Na Sacola com Poucas Compras' }
  ];

  // Série diária recente para gráfico de evolução
  const dailyRecent = Array.isArray(rep.salesAndRevenue && rep.salesAndRevenue.dailySeries)
    ? rep.salesAndRevenue.dailySeries.slice(-14)
    : [];
  const maxDailyVisits = Math.max(1, ...dailyRecent.map((d) => Number(d.visits) || 0));
  const maxDailyRev = Math.max(1, ...dailyRecent.map((d) => Number(d.revenuePaid) || 0));

  return `
    <div id="admin-analytics-section-root">
      <!-- CABEÇALHO E FILTRO DE PERÍODO -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;margin-bottom:16px;">
        <div>
          <span class="section-eyebrow">Inteligência Comercial, Comportamento & Conversão</span>
          <h1 style="font-family:var(--font-serif);font-size:2.05rem;margin-bottom:4px;">ANÁLISE DA LOJA</h1>
          <p style="font-size:0.86rem;color:var(--text-secondary);margin:0;">
            Acompanhe visitantes reais, origem de tráfego, produtos mais desejados, funil de compras, sacolas abandonadas e oportunidades para aumentar o faturamento.
          </p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <button type="button" class="btn btn-outline btn-sm" id="btn-refresh-analytics-report">↻ Atualizar Dados</button>
          <button type="button" class="btn btn-primary btn-sm" id="btn-export-analytics-csv-all">⬇ Exportar Relatório CSV</button>
        </div>
      </div>

      <!-- AVISO DE INÍCIO DE COLETA E CONFORMIDADE LGPD (ITENS 13 E 14) -->
      <div style="background:#F7F7F7;border:1px solid #E3D8CC;border-left:4px solid #111111;border-radius:8px;padding:12px 14px;margin-bottom:18px;font-size:0.82rem;color:#111111;">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center;">
          <div>
            <strong>Transparência da Coleta & Conformidade LGPD:</strong>
            ${app.escapeHtml(priv.historicalNotice || '')}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <span class="status-pill confirmed">Retenção: ${Number(priv.retentionDays || 180)} dias</span>
            <span class="status-pill pending">Bots filtrados: ${Number(priv.botsFilteredCount || 0)}</span>
            <span class="status-pill pending">F5 duplicados ignorados: ${Number(priv.duplicateRefreshesIgnored || 0)}</span>
          </div>
        </div>
      </div>

      <!-- SELETOR DE PERÍODO E DATAS PERSONALIZADAS -->
      <div class="admin-card" style="margin-bottom:18px;padding:14px 16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <label for="admin-analytics-period-select" style="font-size:0.82rem;font-weight:700;color:#111111;">Período de Análise:</label>
            <select id="admin-analytics-period-select" class="form-control" style="width:auto;min-width:200px;min-height:40px;">
              <option value="today" ${periodVal === 'today' ? 'selected' : ''}>Hoje</option>
              <option value="yesterday" ${periodVal === 'yesterday' ? 'selected' : ''}>Ontem</option>
              <option value="7d" ${periodVal === '7d' ? 'selected' : ''}>Últimos 7 dias</option>
              <option value="30d" ${periodVal === '30d' ? 'selected' : ''}>Últimos 30 dias</option>
              <option value="90d" ${periodVal === '90d' ? 'selected' : ''}>Últimos 90 dias</option>
              <option value="this_month" ${periodVal === 'this_month' ? 'selected' : ''}>Este mês</option>
              <option value="last_month" ${periodVal === 'last_month' ? 'selected' : ''}>Mês anterior</option>
              <option value="custom" ${periodVal === 'custom' ? 'selected' : ''}>Período personalizado</option>
            </select>
            ${periodVal === 'custom' ? `
              <input type="date" id="admin-analytics-start-date" class="form-control" value="${app.escapeHtml(AdminState.analyticsCustomStart)}" style="width:auto;min-height:40px;" aria-label="Data inicial" />
              <span style="font-size:0.8rem;">até</span>
              <input type="date" id="admin-analytics-end-date" class="form-control" value="${app.escapeHtml(AdminState.analyticsCustomEnd)}" style="width:auto;min-height:40px;" aria-label="Data final" />
              <button type="button" class="btn btn-primary btn-sm" id="btn-apply-custom-analytics-period">Aplicar</button>
            ` : ''}
          </div>
          <div style="font-size:0.8rem;color:var(--text-secondary);">
            Exibindo: <strong>${app.escapeHtml(rep.period.label)}</strong> (comparado ao período anterior equivalente)
          </div>
        </div>
      </div>

      <!-- 1. VISÃO GERAL — DESEMPENHO DA LOJA (15 INDICADORES + GLOSSÁRIO) -->
      <div class="admin-card" id="analytics-block-overview">
        <span class="section-eyebrow">1. Visão Geral — Desempenho da Loja</span>
        <h2 style="font-family:var(--font-serif);font-size:1.5rem;margin-bottom:14px;">Indicadores Principais & Comparação com Período Anterior</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-bottom:16px;">
          ${kpiCards.map((k) => `
            <div style="background:#F7F7F7;border:1px solid #E4E4E7;border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;justify-content:space-between;gap:6px;" data-analytics-kpi="${k.key}">
              <span style="font-size:0.74rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#111111;">${app.escapeHtml(k.label)}</span>
              <strong style="font-size:1.45rem;color:#111111;line-height:1.15;">${app.escapeHtml(String(k.value))}</strong>
              <div>${formatDeltaBadgeHtml(dlt[k.key])}</div>
              <span style="font-size:0.74rem;color:var(--text-secondary);">Período anterior: <strong>${app.escapeHtml(String(k.prev))}</strong> • ${app.escapeHtml(k.sub)}</span>
            </div>
          `).join('')}
        </div>

        <details style="background:#F7F7F7;border:1px solid #E4E4E7;border-radius:8px;padding:10px 14px;">
          <summary style="font-weight:700;font-size:0.84rem;cursor:pointer;color:#111111;">Definições Oficiais dos Indicadores (Visitantes vs. Sessões vs. Visualizações vs. Pagamento Confirmado)</summary>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-top:10px;font-size:0.8rem;color:var(--text-secondary);">
            ${(rep.overview.definitions || []).map((d) => `
              <div style="background:#FFF;padding:8px 10px;border-radius:6px;border:1px solid #EAE2D8;">
                <strong style="color:#111111;display:block;margin-bottom:3px;">${app.escapeHtml(d.term)}</strong>
                <span>${app.escapeHtml(d.definition)}</span>
              </div>
            `).join('')}
          </div>
        </details>
      </div>

      <!-- 2. ORIGEM DOS VISITANTES E 3. DISPOSITIVOS E NAVEGADORES -->
      <div class="admin-form-grid-2" style="margin-bottom:20px;">
        <!-- 2. Origem dos Visitantes -->
        <div class="admin-card" id="analytics-block-origins" style="margin-bottom:0;">
          <span class="section-eyebrow">2. De Onde Vêm os Visitantes</span>
          <h2 style="font-family:var(--font-serif);font-size:1.4rem;margin-bottom:10px;">Origem dos Visitantes & Canais</h2>
          <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:12px;">
            Localização geográfica aproximada (País, Estado e Cidade/Região), preservando a privacidade e a LGPD.
          </p>
          <h3 style="font-size:0.84rem;text-transform:uppercase;color:#111111;margin-bottom:8px;">Canais de Aquisição</h3>
          ${renderHorizontalBarListHtml(rep.origins.byChannel, app, 'name', 'count', 'share', 'Nenhuma visita registrada no período.')}

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;padding-top:12px;border-top:1px solid var(--border-subtle);">
            <div>
              <h4 style="font-size:0.78rem;text-transform:uppercase;color:#111111;margin-bottom:6px;">País & Estado (UF)</h4>
              ${renderHorizontalBarListHtml(rep.origins.byState.slice(0, 5), app, 'name', 'count', 'share', 'Sem dados de UF.')}
            </div>
            <div>
              <h4 style="font-size:0.78rem;text-transform:uppercase;color:#111111;margin-bottom:6px;">Cidade / Região Aproximada</h4>
              ${renderHorizontalBarListHtml(rep.origins.byCity.slice(0, 5), app, 'name', 'count', 'share', 'Sem dados regionais.')}
            </div>
          </div>

          <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-subtle);">
            <h4 style="font-size:0.78rem;text-transform:uppercase;color:#111111;margin-bottom:6px;">Campanhas e Links com Parâmetros UTM</h4>
            ${(rep.origins.utmCampaigns || []).length === 0
              ? '<p style="font-size:0.8rem;color:var(--text-secondary);margin:0;">Nenhuma visita com parâmetros UTM (ex.: ?utm_source=instagram&utm_campaign=colecao) registrada neste período.</p>'
              : `<div class="admin-table-responsive-wrap"><table class="data-table"><thead><tr><th>Origem / Mídia / Campanha</th><th>Sessões</th><th>Pedidos Pagos</th></tr></thead><tbody>${rep.origins.utmCampaigns.slice(0, 6).map((u) => `<tr><td data-label="Campanha UTM"><strong>${app.escapeHtml(u.utmKey)}</strong></td><td data-label="Sessões">${u.sessions}</td><td data-label="Pedidos Pagos">${u.paidOrders}</td></tr>`).join('')}</tbody></table></div>`
            }
          </div>
        </div>

        <!-- 3. Dispositivos e Navegadores -->
        <div class="admin-card" id="analytics-block-devices" style="margin-bottom:0;">
          <span class="section-eyebrow">3. Dispositivos e Navegadores</span>
          <h2 style="font-family:var(--font-serif);font-size:1.4rem;margin-bottom:10px;">Celulares, Computadores, Android vs. iPhone</h2>
          <div style="background:#F4F4F5;border-left:4px solid #111111;padding:10px 12px;border-radius:6px;font-size:0.82rem;color:#111111;margin-bottom:12px;">
            <strong>Diagnóstico de Plataforma:</strong> ${app.escapeHtml(rep.devices.prioritySummary || '')}
          </div>
          <h3 style="font-size:0.84rem;text-transform:uppercase;color:#111111;margin-bottom:8px;">Tipo de Dispositivo</h3>
          ${renderHorizontalBarListHtml(rep.devices.byDeviceType, app, 'name', 'count', 'share')}

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;padding-top:12px;border-top:1px solid var(--border-subtle);">
            <div>
              <h4 style="font-size:0.78rem;text-transform:uppercase;color:#111111;margin-bottom:6px;">Sistemas Operacionais</h4>
              ${renderHorizontalBarListHtml(rep.devices.byOs.slice(0, 5), app, 'name', 'count', 'share')}
            </div>
            <div>
              <h4 style="font-size:0.78rem;text-transform:uppercase;color:#111111;margin-bottom:6px;">Navegadores & Telas</h4>
              ${renderHorizontalBarListHtml(rep.devices.byBrowser.slice(0, 5), app, 'name', 'count', 'share')}
            </div>
          </div>
        </div>
      </div>

      <!-- 6. FUNIL DE COMPRAS (7 ETAPAS OFICIAIS) -->
      <div class="admin-card" id="analytics-block-funnel">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
          <div>
            <span class="section-eyebrow">6. Jornada de Conversão Passo a Passo</span>
            <h2 style="font-family:var(--font-serif);font-size:1.5rem;margin-bottom:4px;">Funil de Compras (7 Etapas)</h2>
            <p style="font-size:0.82rem;color:var(--text-secondary);margin:0;">${app.escapeHtml(rep.funnel.note || '')}</p>
          </div>
          ${rep.funnel.biggestDropStage ? `
            <div style="background:#F4F4F5;border:1px solid #D4D4D8;color:#111111;padding:8px 12px;border-radius:8px;font-size:0.8rem;max-width:440px;">
              <strong>Maior perda de clientes identificada:</strong><br/>
              De <em>${app.escapeHtml(rep.funnel.biggestDropStage.fromStage)}</em> para <em>${app.escapeHtml(rep.funnel.biggestDropStage.toStage)}</em>
              (<strong>${rep.funnel.biggestDropStage.droppedCount} desistência(s)</strong> • queda de ${rep.funnel.biggestDropStage.dropRateFromPrevious}%).
            </div>
          ` : ''}
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;">
          ${(rep.funnel.stages || []).map((st) => {
            const barWidth = Math.max(st.count > 0 ? 8 : 0, Math.min(100, Math.round(st.conversionFromStart)));
            return `
              <div style="background:#F7F7F7;border:1px solid #E4E4E7;border-radius:8px;padding:10px 14px;" data-funnel-step="${st.stepNumber}">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px;">
                  <strong style="font-size:0.9rem;color:#111111;">${app.escapeHtml(st.label)}</strong>
                  <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:0.8rem;">
                    <span class="status-pill confirmed">Avançaram: ${st.count}</span>
                    ${st.stepNumber > 1 ? `<span class="status-pill ${st.droppedCount > 0 ? 'danger' : 'pending'}">Desistiram: ${st.droppedCount} (${st.dropRateFromPrevious}%)</span>` : ''}
                    <span style="color:var(--text-secondary);font-weight:600;">Taxa da etapa: ${st.conversionFromPrevious}% • Acumulado: ${st.conversionFromStart}%</span>
                  </div>
                </div>
                <div style="width:100%;height:10px;background:#E4E4E7;border-radius:999px;overflow:hidden;">
                  <div style="width:${barWidth}%;height:100%;background:linear-gradient(90deg,#111111,#111111);border-radius:999px;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- 4. PRODUTOS MAIS VISUALIZADOS E 6 RANKINGS -->
      <div class="admin-card" id="analytics-block-products">
        <span class="section-eyebrow">4. Desempenho Individual do Catálogo</span>
        <h2 style="font-family:var(--font-serif);font-size:1.5rem;margin-bottom:8px;">Produtos Mais Visualizados, Desejados e Comprados</h2>
        <p style="font-size:0.83rem;color:var(--text-secondary);margin-bottom:12px;">
          Alterne entre os 6 rankings para identificar as peças campeãs de vendas e aquelas que recebem muitas visitas ou adições à sacola mas ainda convertem pouco.
        </p>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
          ${rankingTabDefs.map((tb) => `
            <button type="button" class="btn ${rankTab === tb.id ? 'btn-primary' : 'btn-outline'} btn-sm" data-analytics-rank-tab="${tb.id}">
              ${app.escapeHtml(tb.label)}
            </button>
          `).join('')}
        </div>

        <div class="admin-table-responsive-wrap">
          <table class="data-table" id="admin-analytics-products-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Visualizações / Visitantes</th>
                <th>Cliques em Detalhes</th>
                <th>Adições à Sacola</th>
                <th>Pedidos Criados</th>
                <th>Vendas Pagas</th>
                <th>Receita Paga</th>
                <th>Conversão</th>
              </tr>
            </thead>
            <tbody>
              ${activeRankList.slice(0, 15).map((p) => `
                <tr>
                  <td data-label="Produto">
                    <div style="display:flex;align-items:center;gap:10px;">
                      ${p.photo ? `<img src="${app.escapeHtml(p.photo)}" alt="${app.escapeHtml(p.name)}" style="width:42px;height:52px;object-fit:cover;border-radius:6px;border:1px solid #E4E4E7;flex-shrink:0;" />` : ''}
                      <div>
                        <strong style="font-size:0.88rem;color:#111111;display:block;">${app.escapeHtml(p.name)}</strong>
                        <span style="font-size:0.74rem;color:var(--text-secondary);">SKU: ${app.escapeHtml(p.sku)} • Estoque: ${p.stock} un.</span>
                      </div>
                    </div>
                  </td>
                  <td data-label="Categoria">${app.escapeHtml(p.categoryName)}</td>
                  <td data-label="Visualizações / Visitantes"><strong>${p.views}</strong> vis. (${p.uniqueViewers} visitante(s))</td>
                  <td data-label="Cliques em Detalhes">${p.detailClicks}</td>
                  <td data-label="Adições à Sacola"><strong>${p.cartAdditions}</strong></td>
                  <td data-label="Pedidos Criados">${p.ordersCount}</td>
                  <td data-label="Vendas Pagas"><span class="status-pill ${p.paidUnits > 0 ? 'confirmed' : 'pending'}">${p.paidUnits} un. (${p.paidOrdersCount} ped.)</span></td>
                  <td data-label="Receita Paga"><strong>${app.formatBRL(p.paidRevenue)}</strong></td>
                  <td data-label="Conversão"><strong>${p.conversionRate}%</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 5. ANÁLISE POR CATEGORIA -->
      <div class="admin-card" id="analytics-block-categories">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
          <div>
            <span class="section-eyebrow">5. Desempenho por Linha de Peças</span>
            <h2 style="font-family:var(--font-serif);font-size:1.5rem;margin-bottom:4px;">Análise por Categoria</h2>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${rep.categoriesAnalysis.mostInterestCategory ? `<span class="status-pill pending">Maior interesse: ${app.escapeHtml(rep.categoriesAnalysis.mostInterestCategory.name)}</span>` : ''}
            ${rep.categoriesAnalysis.highestRevenueCategory ? `<span class="status-pill confirmed">Maior receita: ${app.escapeHtml(rep.categoriesAnalysis.highestRevenueCategory.name)} (${app.formatBRL(rep.categoriesAnalysis.highestRevenueCategory.paidRevenue)})</span>` : ''}
          </div>
        </div>

        <div class="admin-table-responsive-wrap">
          <table class="data-table" id="admin-analytics-categories-table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Visualizações</th>
                <th>Adições à Sacola</th>
                <th>Pedidos Realizados</th>
                <th>Vendas Pagas</th>
                <th>Faturamento Confirmado</th>
                <th>Taxa de Conversão</th>
              </tr>
            </thead>
            <tbody>
              ${(rep.categoriesAnalysis.categories || []).map((c) => `
                <tr>
                  <td data-label="Categoria"><strong>${app.escapeHtml(c.name)}</strong></td>
                  <td data-label="Visualizações">${c.views}</td>
                  <td data-label="Adições à Sacola">${c.cartAdditions}</td>
                  <td data-label="Pedidos Realizados">${c.ordersCount}</td>
                  <td data-label="Vendas Pagas">${c.paidSalesCount} pedido(s) (${c.paidUnits} un.)</td>
                  <td data-label="Faturamento Confirmado"><strong>${app.formatBRL(c.paidRevenue)}</strong></td>
                  <td data-label="Taxa de Conversão">${c.conversionRate}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 7. SACOLAS ABANDONADAS & 8. ANÁLISE DE BUSCAS E INTERESSES -->
      <div class="admin-form-grid-2" style="margin-bottom:20px;">
        <!-- 7. Sacolas Abandonadas -->
        <div class="admin-card" id="analytics-block-abandoned" style="margin-bottom:0;">
          <span class="section-eyebrow">7. Retenção & Desistências</span>
          <h2 style="font-family:var(--font-serif);font-size:1.4rem;margin-bottom:10px;">Sacolas Abandonadas</h2>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
            <div style="background:#F7F7F7;border:1px solid #E4E4E7;border-radius:8px;padding:10px;">
              <span style="font-size:0.72rem;text-transform:uppercase;color:#111111;display:block;">Sacolas Abandonadas</span>
              <strong style="font-size:1.35rem;color:#111111;">${rep.abandonedCarts.abandonedCount}</strong>
              <span style="font-size:0.74rem;color:var(--text-secondary);display:block;">Frequência: ${rep.abandonedCarts.abandonmentFrequencyRate}%</span>
            </div>
            <div style="background:#F7F7F7;border:1px solid #E4E4E7;border-radius:8px;padding:10px;">
              <span style="font-size:0.72rem;text-transform:uppercase;color:#111111;display:block;">Valor Estimado Abandonado</span>
              <strong style="font-size:1.35rem;color:#111111;">${app.formatBRL(rep.abandonedCarts.estimatedTotalValue)}</strong>
              <span style="font-size:0.74rem;color:var(--text-secondary);display:block;">Taxa de recuperação: ${rep.abandonedCarts.recoveryRate}% (${rep.abandonedCarts.recoveredCount})</span>
            </div>
          </div>

          <h4 style="font-size:0.78rem;text-transform:uppercase;color:#111111;margin-bottom:6px;">Etapa em que a Cliente Desistiu</h4>
          ${renderHorizontalBarListHtml(rep.abandonedCarts.dropByStage, app, 'stage', 'count', undefined, 'Nenhuma desistência de sacola registrada no período.')}

          <h4 style="font-size:0.78rem;text-transform:uppercase;color:#111111;margin:12px 0 6px;">Produtos Mais Abandonados na Sacola</h4>
          ${(rep.abandonedCarts.mostAbandonedProducts || []).length === 0
            ? '<p style="font-size:0.8rem;color:var(--text-secondary);margin:0;">Nenhum produto abandonado na sacola neste período.</p>'
            : `<ul style="margin:0;padding-left:18px;font-size:0.82rem;color:#111111;">${rep.abandonedCarts.mostAbandonedProducts.slice(0, 5).map((p) => `<li style="margin-bottom:4px;"><strong>${app.escapeHtml(p.name)}</strong> — ${p.abandonedCount} un. abandonada(s) (${app.formatBRL(p.price)}/un.)</li>`).join('')}</ul>`
          }
        </div>

        <!-- 8. Análise de Buscas e Interesses -->
        <div class="admin-card" id="analytics-block-searches" style="margin-bottom:0;">
          <span class="section-eyebrow">8. O que as Clientes Procuram</span>
          <h2 style="font-family:var(--font-serif);font-size:1.4rem;margin-bottom:10px;">Análise de Buscas e Interesses</h2>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <h4 style="font-size:0.78rem;text-transform:uppercase;color:#111111;margin-bottom:6px;">Termos Mais Pesquisados</h4>
              ${renderHorizontalBarListHtml(rep.searchesAndInterests.topSearchTerms.slice(0, 6), app, 'term', 'count', undefined, 'Nenhuma pesquisa realizada no período.')}
            </div>
            <div>
              <h4 style="font-size:0.78rem;text-transform:uppercase;color:#111111;margin-bottom:6px;">Pesquisas Sem Resultados</h4>
              ${renderHorizontalBarListHtml(rep.searchesAndInterests.zeroResultSearches.slice(0, 6), app, 'term', 'count', undefined, 'Nenhuma pesquisa sem resultado.')}
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border-subtle);">
            <div>
              <h4 style="font-size:0.78rem;text-transform:uppercase;color:#111111;margin-bottom:6px;">Filtros Mais Utilizados</h4>
              ${renderHorizontalBarListHtml(rep.searchesAndInterests.mostUsedFilters.slice(0, 5), app, 'label', 'count', undefined, 'Sem uso de filtros registrado.')}
            </div>
            <div>
              <h4 style="font-size:0.78rem;text-transform:uppercase;color:#111111;margin-bottom:6px;">Favoritados & Compartilhados</h4>
              <p style="font-size:0.8rem;color:var(--text-secondary);margin:0 0 6px;">
                <strong>Mais Favoritados:</strong> ${(rep.searchesAndInterests.mostWishlistedProducts || []).slice(0, 3).map((p) => `${app.escapeHtml(p.name)} (${p.wishlistedCount})`).join(', ') || 'Sem novos favoritos no período'}
              </p>
              <p style="font-size:0.8rem;color:var(--text-secondary);margin:0;">
                <strong>Mais Compartilhados:</strong> ${(rep.searchesAndInterests.mostSharedProducts || []).slice(0, 3).map((p) => `${app.escapeHtml(p.name)} (${p.sharedCount})`).join(', ') || 'Sem compartilhamentos no período'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 9. ANÁLISE DE VENDAS E FATURAMENTO (SEPARAÇÃO ESTRITA DOS 5 VALORES) -->
      <div class="admin-card" id="analytics-block-sales">
        <span class="section-eyebrow">9. Resultado Comercial & Financeiro</span>
        <h2 style="font-family:var(--font-serif);font-size:1.5rem;margin-bottom:6px;">Análise de Vendas, Faturamento Confirmado e Cupons</h2>
        <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:14px;">
          Pedidos aguardando pagamento ou cancelados nunca são somados ao Faturamento Confirmado.
        </p>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(195px,1fr));gap:12px;margin-bottom:18px;">
          <div style="background:#F7F7F7;border:1px solid #E4E4E7;border-radius:8px;padding:12px;">
            <span style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:#52525B;">1. Valor de Pedidos Criados</span>
            <strong style="font-size:1.3rem;color:#111111;display:block;margin-top:4px;">${app.formatBRL(fb.createdOrdersValue || 0)}</strong>
            <span style="font-size:0.74rem;color:var(--text-secondary);">${rep.salesAndRevenue.ordersCreatedCount} pedido(s) criado(s)</span>
          </div>
          <div style="background:#F4F4F5;border:1px dashed #71717A;border-radius:8px;padding:12px;">
            <span style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:#18181B;">2. Aguardando Pagamento</span>
            <strong style="font-size:1.3rem;color:#18181B;display:block;margin-top:4px;">${app.formatBRL(fb.awaitingPaymentValue || 0)}</strong>
            <span style="font-size:0.74rem;color:#18181B;">${rep.salesAndRevenue.ordersAwaitingPaymentCount} pedido(s) pendente(s)</span>
          </div>
          <div style="background:#111111;border:1px solid #111111;border-radius:8px;padding:12px;color:#FFFFFF;">
            <span style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:#E4E4E7;">3. ✓ Faturamento Efetivamente Pago</span>
            <strong style="font-size:1.35rem;color:#FFFFFF;display:block;margin-top:4px;">${app.formatBRL(fb.paidConfirmedValue || 0)}</strong>
            <span style="font-size:0.74rem;color:#D4D4D8;">${rep.salesAndRevenue.ordersPaidCount} pago(s) • Ticket médio: ${app.formatBRL(rep.salesAndRevenue.averageTicket || 0)}</span>
          </div>
          <div style="background:#F4F4F5;border:1px solid #D4D4D8;border-radius:8px;padding:12px;">
            <span style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:#111111;">4. Valor Cancelado / Expirado</span>
            <strong style="font-size:1.3rem;color:#111111;display:block;margin-top:4px;">${app.formatBRL(fb.cancelledOrdersValue || 0)}</strong>
            <span style="font-size:0.74rem;color:#111111;">${rep.salesAndRevenue.ordersCancelledCount} cancelado(s)/expirado(s)</span>
          </div>
          <div style="background:#F4F4F5;border:1px solid #D4D4D8;border-radius:8px;padding:12px;">
            <span style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:#52525B;">5. Reembolsos Realizados</span>
            <strong style="font-size:1.3rem;color:#52525B;display:block;margin-top:4px;">${app.formatBRL(fb.refundedValue || 0)}</strong>
            <span style="font-size:0.74rem;color:var(--text-secondary);">${rep.salesAndRevenue.refundedOrdersCount || 0} reembolso(s) concluído(s)</span>
          </div>
        </div>

        <!-- Evolução Diária de Visitas e Vendas -->
        <h3 style="font-size:0.86rem;text-transform:uppercase;color:#111111;margin-bottom:8px;">Evolução Diária de Visitas, Vendas Pagas e Conversão (Últimos Dias do Período)</h3>
        <div class="admin-table-responsive-wrap" style="margin-bottom:16px;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Visitas</th>
                <th>Pedidos Criados</th>
                <th>Pedidos Pagos</th>
                <th>Faturamento Pago</th>
                <th>Conversão</th>
              </tr>
            </thead>
            <tbody>
              ${dailyRecent.filter((d) => d.visits > 0 || d.ordersCreated > 0 || d.ordersPaid > 0).slice(-10).map((d) => `
                <tr>
                  <td data-label="Data"><strong>${app.escapeHtml(d.date.split('-').reverse().join('/'))}</strong></td>
                  <td data-label="Visitas">${d.visits}</td>
                  <td data-label="Pedidos Criados">${d.ordersCreated}</td>
                  <td data-label="Pedidos Pagos"><span class="status-pill ${d.ordersPaid > 0 ? 'confirmed' : 'pending'}">${d.ordersPaid}</span></td>
                  <td data-label="Faturamento Pago"><strong>${app.formatBRL(d.revenuePaid)}</strong></td>
                  <td data-label="Conversão">${d.conversionRate}%</td>
                </tr>
              `).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);">Sem movimentação diária registrada nos últimos dias deste filtro.</td></tr>`}
            </tbody>
          </table>
        </div>

        <!-- Cupons Utilizados -->
        <h3 style="font-size:0.86rem;text-transform:uppercase;color:#111111;margin-bottom:8px;">Desempenho de Cupons de Desconto</h3>
        <div class="admin-table-responsive-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Código do Cupom</th>
                <th>Descrição</th>
                <th>Pedidos Aplicados</th>
                <th>Pedidos Pagos</th>
                <th>Total de Desconto Concedido</th>
                <th>Faturamento Pago Gerado</th>
              </tr>
            </thead>
            <tbody>
              ${(rep.salesAndRevenue.couponsUsed || []).map((cp) => `
                <tr>
                  <td data-label="Código do Cupom"><strong>${app.escapeHtml(cp.code)}</strong></td>
                  <td data-label="Descrição">${app.escapeHtml(cp.description || '-')}</td>
                  <td data-label="Pedidos Aplicados">${cp.ordersCount}</td>
                  <td data-label="Pedidos Pagos">${cp.paidOrdersCount}</td>
                  <td data-label="Total de Desconto">${app.formatBRL(cp.discountTotal)}</td>
                  <td data-label="Faturamento Pago Gerado"><strong>${app.formatBRL(cp.paidRevenueGenerated)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 10. HORÁRIOS E DIAS DE MAIOR MOVIMENTO -->
      <div class="admin-card" id="analytics-block-peak-times">
        <span class="section-eyebrow">10. Comportamento Temporal</span>
        <h2 style="font-family:var(--font-serif);font-size:1.5rem;margin-bottom:10px;">Horários e Dias de Maior Movimento</h2>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:16px;">
          <div style="background:#F7F7F7;border:1px solid #E4E4E7;border-radius:8px;padding:10px;">
            <span style="font-size:0.72rem;text-transform:uppercase;color:#111111;display:block;">Horário com Mais Visitas</span>
            <strong style="font-size:1.02rem;color:#111111;">${app.escapeHtml(rep.peakTimesAndDays.highlights.peakVisitHour)}</strong>
          </div>
          <div style="background:#F7F7F7;border:1px solid #E4E4E7;border-radius:8px;padding:10px;">
            <span style="font-size:0.72rem;text-transform:uppercase;color:#111111;display:block;">Horário de Maior Conversão</span>
            <strong style="font-size:1.02rem;color:#111111;">${app.escapeHtml(rep.peakTimesAndDays.highlights.peakConversionHour)}</strong>
          </div>
          <div style="background:#F7F7F7;border:1px solid #E4E4E7;border-radius:8px;padding:10px;">
            <span style="font-size:0.72rem;text-transform:uppercase;color:#111111;display:block;">Dia com Mais Acessos</span>
            <strong style="font-size:1.02rem;color:#111111;">${app.escapeHtml(rep.peakTimesAndDays.highlights.peakVisitDay)}</strong>
          </div>
          <div style="background:#F7F7F7;border:1px solid #E4E4E7;border-radius:8px;padding:10px;">
            <span style="font-size:0.72rem;text-transform:uppercase;color:#111111;display:block;">Dia com Mais Vendas Pagas</span>
            <strong style="font-size:1.02rem;color:#111111;">${app.escapeHtml(rep.peakTimesAndDays.highlights.peakSalesDay)}</strong>
          </div>
          <div style="background:#F7F7F7;border:1px solid #E4E4E7;border-radius:8px;padding:10px;">
            <span style="font-size:0.72rem;text-transform:uppercase;color:#111111;display:block;">Período de Maior Abandono</span>
            <strong style="font-size:1.02rem;color:#111111;">${app.escapeHtml(rep.peakTimesAndDays.highlights.peakAbandonHour)}</strong>
          </div>
        </div>

        <div class="admin-form-grid-2">
          <div>
            <h4 style="font-size:0.8rem;text-transform:uppercase;color:#111111;margin-bottom:8px;">Movimento por Dia da Semana</h4>
            ${renderHorizontalBarListHtml(rep.peakTimesAndDays.byDayOfWeek, app, 'name', 'visits', undefined)}
          </div>
          <div>
            <h4 style="font-size:0.8rem;text-transform:uppercase;color:#111111;margin-bottom:8px;">Horários de Maior Acesso</h4>
            ${renderHorizontalBarListHtml(
              [...rep.peakTimesAndDays.byHour].filter((h) => h.visits > 0 || h.paidOrders > 0).sort((a, b) => b.visits - a.visits).slice(0, 7),
              app,
              'label',
              'visits',
              undefined,
              'Aguardando acessos por faixa de horário no período.'
            )}
          </div>
        </div>
      </div>

      <!-- 11. OPORTUNIDADES E RECOMENDAÇÕES -->
      <div class="admin-card" id="analytics-block-recommendations">
        <span class="section-eyebrow">11. Diagnóstico Comercial Baseado em Dados Reais</span>
        <h2 style="font-family:var(--font-serif);font-size:1.55rem;margin-bottom:6px;">OPORTUNIDADES E RECOMENDAÇÕES</h2>
        <p style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:16px;">
          Sugestões práticas geradas a partir dos números reais do catálogo, funil de compras e comportamento das visitantes (sem conclusões inventadas).
        </p>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;">
          ${(rep.recommendations || []).map((rec) => `
            <div style="background:#F7F7F7;border:1px solid #E3D8CC;border-top:4px solid #111111;border-radius:10px;padding:14px 16px;" data-recommendation-card="${app.escapeHtml(rec.id)}">
              <span style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#111111;display:block;margin-bottom:4px;">${app.escapeHtml(rec.category)}</span>
              <h3 style="font-family:var(--font-serif);font-size:1.15rem;color:#111111;margin-bottom:10px;">${app.escapeHtml(rec.title)}</h3>
              <div style="font-size:0.81rem;color:#111111;display:flex;flex-direction:column;gap:8px;">
                <div><strong>1. O que foi observado:</strong> ${app.escapeHtml(rec.observed)}</div>
                <div><strong>2. Qual dado sustenta a observação:</strong> <span style="color:#52525B;">${app.escapeHtml(rec.supportingData)}</span></div>
                <div><strong>3. Qual ação pode ser tomada:</strong> ${app.escapeHtml(rec.recommendedAction)}</div>
                <div><strong>4. Qual resultado acompanhar depois:</strong> <span style="color:#111111;">${app.escapeHtml(rec.metricToTrack)}</span></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// Eventos delegados da seção ANÁLISE DA LOJA
document.addEventListener('change', (e) => {
  const t = e.target;
  if (!t) return;
  if (t.id === 'admin-analytics-period-select') {
    AdminState.analyticsPeriod = t.value;
    if (t.value !== 'custom') {
      fetchAdminAnalyticsReport(true);
    } else {
      const mainEl = document.getElementById('app-main-content');
      if (mainEl) renderAdminView(mainEl);
    }
  }
});

document.addEventListener('click', async (e) => {
  const rankBtn = e.target.closest('[data-analytics-rank-tab]');
  if (rankBtn) {
    AdminState.analyticsProductRankingTab = rankBtn.getAttribute('data-analytics-rank-tab') || 'mostViewed';
    const mainEl = document.getElementById('app-main-content');
    if (mainEl) renderAdminView(mainEl);
    return;
  }

  const refreshBtn = e.target.closest('#btn-refresh-analytics-report');
  if (refreshBtn) {
    refreshBtn.disabled = true;
    await fetchAdminAnalyticsReport(true);
    if (window.ByAngelyApp) window.ByAngelyApp.showToast('Indicadores de Análise da Loja atualizados!', 'success');
    return;
  }

  const applyCustomBtn = e.target.closest('#btn-apply-custom-analytics-period');
  if (applyCustomBtn) {
    const sEl = document.getElementById('admin-analytics-start-date');
    const eEl = document.getElementById('admin-analytics-end-date');
    AdminState.analyticsCustomStart = sEl ? sEl.value : '';
    AdminState.analyticsCustomEnd = eEl ? eEl.value : '';
    await fetchAdminAnalyticsReport(true);
    return;
  }

  const exportCsvBtn = e.target.closest('#btn-export-analytics-csv-all');
  if (exportCsvBtn) {
    const app = window.ByAngelyApp;
    if (!app) return;
    try {
      const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';
      const qs = new URLSearchParams({
        period: AdminState.analyticsPeriod || '30d',
        section: 'all'
      });
      if (AdminState.analyticsPeriod === 'custom') {
        if (AdminState.analyticsCustomStart) qs.set('startDate', AdminState.analyticsCustomStart);
        if (AdminState.analyticsCustomEnd) qs.set('endDate', AdminState.analyticsCustomEnd);
      }
      const res = await fetch(apiBase + '/api/admin/analytics/export-csv?' + qs.toString(), {
        method: 'GET',
        headers: getAdminHeadersV6(app)
      });
      if (!res.ok) {
        app.showToast('Não foi possível exportar o relatório CSV.', 'danger');
        return;
      }
      const csvText = await res.text();
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `by-angely-analise-loja-${AdminState.analyticsPeriod || '30d'}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      app.showToast('Relatório CSV exportado com sucesso!', 'success');
    } catch (_err) {
      app.showToast('Erro ao exportar relatório CSV.', 'danger');
    }
    return;
  }

  const copyWhBtn = e.target.closest('#btn-copy-pix-webhook-url');
  if (copyWhBtn) {
    const whUrl = copyWhBtn.getAttribute('data-webhook-url') || (window.location.origin + '/api/webhooks/pix');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(whUrl);
      }
      if (window.ByAngelyApp) {
        window.ByAngelyApp.showToast('URL oficial do Webhook Pix copiada para a área de transferência!', 'success');
      }
    } catch (_e) {}
  }
});

// ============================================================================
// ATUALIZAÇÃO AUTOMÁTICA EM TEMPO REAL DO PAINEL ADMINISTRATIVO (POLLING PIX)
// Atualiza automaticamente os pedidos e indicadores quando um Pix é aprovado
// pelo provedor sem exigir que a proprietária recarregue ou altere manualmente.
// ============================================================================
let _adminPixSyncInterval = null;
let _lastOrdersFingerprint = '';
let _syncInFlight = false;

function computeOrdersAndChargesFingerprint(orders, charges) {
  const ordPart = (orders || [])
    .map((o) => `${o.id}:${o.status}:${o.paymentStatus || o.payment_status || ''}:${o.paidAt || ''}:${(o.cancellationRequest && o.cancellationRequest.status) || ''}`)
    .join('|');
  const chgPart = (charges || [])
    .map((c) => `${c.chargeId || c.txid}:${String(c.status || '').toLowerCase()}`)
    .join('|');
  return `${ordPart}##${chgPart}`;
}

async function runAdminRealtimePixSyncTick() {
  if (_syncInFlight) return;
  const app = window.ByAngelyApp;
  if (!app || typeof app.getState !== 'function') return;
  const state = app.getState();
  if (!state || !state.currentAdmin || !state.db) return;

  // Só executa enquanto o painel administrativo estiver aberto
  const isAdminViewActive =
    state.currentView === 'admin' ||
    String(window.location.hash || '').startsWith('#admin') ||
    document.body.classList.contains('admin-page-active');
  if (!isAdminViewActive) return;

  _syncInFlight = true;
  try {
    const apiBase = window.ByAngelyCloud ? window.ByAngelyCloud.getApiBaseUrl() : '';
    const prevOrders = Array.isArray(state.db.orders) ? state.db.orders : [];
    const prevCharges = Array.isArray(state.db.pixCharges) ? state.db.pixCharges : [];
    if (!_lastOrdersFingerprint) {
      _lastOrdersFingerprint = computeOrdersAndChargesFingerprint(prevOrders, prevCharges);
    }

    const prevPaidMap = new Map(
      prevOrders.map((o) => [
        o.id,
        o.paymentStatus === 'paid' || o.payment_status === 'paid' || o.paymentStatus === 'approved'
      ])
    );

    const res = await fetch(apiBase + '/api/admin/pix-sync', {
      method: 'GET',
      headers: getAdminHeadersV6(app),
      cache: 'no-store'
    });
    if (!res.ok) {
      _syncInFlight = false;
      return;
    }
    const data = await res.json();
    if (!data || !data.ok || !Array.isArray(data.orders)) {
      _syncInFlight = false;
      return;
    }

    const newFp = computeOrdersAndChargesFingerprint(data.orders, data.pixCharges || []);
    if (state.db.paymentSettings && state.db.paymentSettings.pix && typeof data.hasExternalPspConfigured === 'boolean') {
      state.db.paymentSettings.pix.hasBackendSecretConfigured = data.hasExternalPspConfigured;
    }
    if (newFp !== _lastOrdersFingerprint) {
      // Verifica se algum pedido acabou de ter o Pix confirmado automaticamente
      const newlyPaidOrders = data.orders.filter((o) => {
        const isNowPaid = o && (o.paymentStatus === 'paid' || o.payment_status === 'paid' || o.paymentStatus === 'approved');
        const wasPaid = prevPaidMap.get(o.id);
        return isNowPaid && !wasPaid;
      });

      state.db.orders = data.orders;
      if (Array.isArray(data.pixCharges)) state.db.pixCharges = data.pixCharges;
      if (Array.isArray(data.financialEvents)) state.db.financialEvents = data.financialEvents;
      if (Array.isArray(data.adminNotifications)) state.db.adminNotifications = data.adminNotifications;
      if (Array.isArray(data.auditLog)) state.db.auditLog = data.auditLog;
      _lastOrdersFingerprint = newFp;

      newlyPaidOrders.forEach((ord) => {
        if (app.showToast) {
          app.showToast(
            `⚡ Pagamento Pix confirmado automaticamente! Pedido ${ord.orderNumber} atualizado para "${ord.statusLabel || 'Pagamento aprovado • Aguardando separação'}".`,
            'success'
          );
        }
      });

      // Se a seção Análise da Loja estiver aberta, atualiza também o relatório analítico
      if (AdminState.activeSection === 'analytics' && typeof fetchAdminAnalyticsReport === 'function') {
        await fetchAdminAnalyticsReport(true);
      } else {
        // Verifica se a proprietária está digitando em algum campo de texto para não perder o foco
        const activeEl = document.activeElement;
        const isTyping =
          activeEl &&
          (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT') &&
          activeEl.id !== 'admin-order-search';

        const mainEl = document.getElementById('app-main-content');
        if (mainEl && !isTyping) {
          renderAdminView(mainEl);
        }
      }
    }
  } catch (_err) {
    // Silencioso em caso de oscilação momentânea de rede
  } finally {
    _syncInFlight = false;
  }
}

function startAdminRealtimePixSync() {
  if (_adminPixSyncInterval) clearInterval(_adminPixSyncInterval);
  _adminPixSyncInterval = setInterval(runAdminRealtimePixSyncTick, 3500);
}

startAdminRealtimePixSync();
})();
