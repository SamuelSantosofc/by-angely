/**
 * By Angély — Módulo do Painel Administrativo da Proprietária
 * Protegido por Login e Controle de Permissões (RBAC)
 * Itaperuna, Rio de Janeiro — Brasil
 */
(function () {
  'use strict';

  const STORAGE_KEY_ADMIN_SESSION = 'by_angely_admin_session_v1';

  const AdminState = {
    activeSection: 'dashboard', // 'dashboard' | 'products' | 'categories' | 'orders' | 'customers' | 'payments' | 'shipping' | 'branding' | 'policies' | 'users'
    editingProductId: null,
    orderFilterStatus: 'all',
    revealedCustomers: {}, // controla mascaramento LGPD de dados pessoais
    tempProductMedia: [],
    pixPreviewAmount: 289.90
  };

  function maskSensitiveData(str, type) {
    if (!str || str.toLowerCase().includes('não informado')) return str || '-';
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
    if (!adminUser) return false;
    if (adminUser.role === 'owner') return true;
    return Array.isArray(adminUser.permissions) && adminUser.permissions.includes(perm);
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
      { id: 'dashboard', label: '📊 Resumo & Checklist', perm: null },
      { id: 'products', label: '👗 Produtos, Fotos & Estoque', perm: 'products' },
      { id: 'categories', label: '🏷️ Categorias, Banners & Cupons', perm: 'categories' },
      { id: 'orders', label: '📦 Pedidos, Rastreio & Trocas', perm: 'orders' },
      { id: 'customers', label: '👩‍💼 Clientes, SAC & LGPD', perm: 'customers' },
      { id: 'payments', label: '💳 Pagamentos (Pix & Cartão)', perm: 'payments' },
      { id: 'shipping', label: '🚚 Entrega & Notificações', perm: 'shipping' },
      { id: 'branding', label: '✨ Logotipo & Dados da Loja', perm: 'branding' },
      { id: 'policies', label: '⚖️ Políticas & Termos Legais', perm: 'policies' },
      { id: 'users', label: '🔐 Equipe & Permissões', perm: 'users' }
    ].filter((item) => !item.perm || hasPermission(admin, item.perm));

    if (!navItems.some((i) => i.id === AdminState.activeSection)) {
      AdminState.activeSection = navItems[0].id;
    }

    containerEl.innerHTML = `
      <div class="admin-shell">
        <aside class="admin-sidebar" aria-label="Menu do Painel Administrativo">
          <div style="padding:8px 12px 16px;border-bottom:1px solid rgba(255,255,255,0.12);margin-bottom:8px;">
            <span style="font-size:0.7rem;letter-spacing:0.14em;text-transform:uppercase;color:#C8B8A2;display:block;">Painel da Proprietária</span>
            <strong style="font-family:var(--font-serif);font-size:1.35rem;color:#FFF;display:block;margin-top:2px;">By Angély</strong>
            <span style="font-size:0.76rem;color:#B0A699;display:block;margin-top:4px;">${app.escapeHtml(admin.name)}</span>
            <span style="font-size:0.68rem;background:rgba(255,255,255,0.12);color:#E5DACB;padding:2px 7px;border-radius:4px;display:inline-block;margin-top:4px;">${app.escapeHtml(admin.roleLabel)}</span>
          </div>

          ${navItems.map((item) => `
            <button type="button" class="admin-nav-btn ${AdminState.activeSection === item.id ? 'active' : ''}" data-admin-section="${item.id}">
              <span>${item.label}</span>
            </button>
          `).join('')}

          <div style="margin-top:auto;padding-top:16px;border-top:1px solid rgba(255,255,255,0.12);display:flex;flex-direction:column;gap:8px;">
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
        <div class="container" style="max-width:520px;">
          <div class="admin-card">
            <span class="section-eyebrow">Área Restrita • Somente Pessoas Autorizadas</span>
            <h1 style="font-family:var(--font-serif);font-size:2rem;margin-bottom:8px;">Painel Administrativo By Angély</h1>
            <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:18px;">
              Acesso exclusivo para a proprietária e colaboradoras autorizadas. Não há cadastro aberto nem anúncios de terceiros.
            </p>

            <div class="alert-box alert-info" style="font-size:0.8rem;">
              <strong>Credenciais Iniciais de Demonstração (Alteráveis no Painel):</strong>
              <div style="margin-top:4px;">• <strong>Proprietária (Acesso Total):</strong> <code>proprietaria@byangely.local</code> | Senha: <code>Angely@2026</code></div>
              <div style="margin-top:2px;">• <strong>Equipe (Pedidos & SAC):</strong> <code>equipe@byangely.local</code> | Senha: <code>Equipe@2026</code></div>
            </div>

            <form id="admin-login-form">
              <div style="margin-bottom:12px;">
                <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">E-mail Autorizado *</label>
                <input type="email" name="email" id="admin-login-email" class="form-control" required value="proprietaria@byangely.local" />
              </div>
              <div style="margin-bottom:16px;">
                <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">Senha de Acesso *</label>
                <input type="password" name="password" id="admin-login-password" class="form-control" required value="Angely@2026" />
              </div>
              <button type="submit" class="btn btn-primary btn-block">Entrar no Painel Administrativo</button>
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

      const user = (db.adminUsers || []).find((u) => u.email.toLowerCase() === email && u.active);
      const validPass =
        (user && user.customPassword && user.customPassword === password) ||
        (user && !user.customPassword && user.role === 'owner' && password === 'Angely@2026') ||
        (user && !user.customPassword && user.role !== 'owner' && password === 'Equipe@2026');

      if (!user || !validPass) {
        app.showToast('Credenciais administrativas inválidas.', 'danger');
        return;
      }

      app.getState().currentAdmin = user;
      sessionStorage.setItem(STORAGE_KEY_ADMIN_SESSION, JSON.stringify(user));
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
  // SEÇÃO 1: DASHBOARD, RESUMO DE VENDAS E CHECKLIST DE LANÇAMENTO
  // =========================================================================
  function renderDashboardSection() {
    const app = window.ByAngelyApp;
    const db = app.getState().db;
    const orders = db.orders || [];
    const products = db.products || [];

    const confirmedOrders = orders.filter((o) => ['paid', 'preparing', 'shipped', 'ready_pickup', 'delivered'].includes(o.status));
    const pendingOrders = orders.filter((o) => o.status === 'awaiting_confirmation');
    const confirmedRevenue = confirmedOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const pendingRevenue = pendingOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);

    // Produtos com estoque baixo (<= 3 unidades totais)
    const lowStockProducts = products.filter((p) => app.getTotalProductStock(p) <= 3);
    const bestSellers = [...products].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0)).slice(0, 5);
    const demoProductsCount = products.filter((p) => p.isDemo).length;

    // Checklist de pendências da proprietária antes de publicar
    const st = db.storeSettings;
    const pay = db.paymentSettings;
    const checklist = [
      {
        label: 'Dados Empresariais e Contato (CNPJ, Razão Social, Endereço e WhatsApp em Itaperuna - RJ)',
        done: !st.cnpj.toLowerCase().includes('a confirmar') && !st.whatsapp.toLowerCase().includes('a confirmar'),
        targetSection: 'branding'
      },
      {
        label: 'Logotipo Oficial (Opcional — mantendo apresentação tipográfica elegante By Angély por padrão)',
        done: st.logoMode === 'image' && !!st.logoUrl,
        targetSection: 'branding'
      },
      {
        label: 'Chave Pix e Nome do Recebedor Oficial configurados',
        done: !pay.pix.pixKey.toLowerCase().includes('a confirmar') && !pay.pix.recipientName.toLowerCase().includes('a confirmar'),
        targetSection: 'payments'
      },
      {
        label: 'Link de Pagamento Externo ou Provedor de Cartão configurado',
        done: !!pay.creditCard.externalPaymentLink || pay.creditCard.pspApiConfigured,
        targetSection: 'payments'
      },
      {
        label: 'Valores e Prazos de Entrega / Retirada em Itaperuna confirmados',
        done: (db.shippingSettings.methods || []).some((m) => m.priceStatus === 'confirmed'),
        targetSection: 'shipping'
      },
      {
        label: 'Substituição ou remoção dos Produtos Demonstrativos (' + demoProductsCount + ' ativos)',
        done: demoProductsCount === 0,
        targetSection: 'products'
      },
      {
        label: 'Revisão e confirmação das Políticas de Privacidade (LGPD), Termos, Entrega e Trocas',
        done: !db.policies.privacy.needsOwnerConfirmation && !db.policies.returnsPolicy.needsOwnerConfirmation,
        targetSection: 'policies'
      }
    ];

    return `
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
          <div>
            <span class="section-eyebrow">Visão Geral da Operação</span>
            <h1 style="font-family:var(--font-serif);font-size:2rem;">Resumo de Vendas & Estoque</h1>
          </div>
          ${demoProductsCount > 0 ? `
            <button type="button" class="btn btn-danger btn-sm" id="btn-quick-remove-demos">
              🗑️ Remover Todos os Produtos Demonstrativos (${demoProductsCount})
            </button>
          ` : ''}
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Receita Confirmada</div>
            <div class="kpi-value" style="color:var(--status-success-text);">${app.formatBRL(confirmedRevenue)}</div>
            <span style="font-size:0.76rem;color:var(--text-secondary);">${confirmedOrders.length} pedido(s) confirmado(s)</span>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Aguardando Confirmação</div>
            <div class="kpi-value" style="color:var(--status-warning-text);">${app.formatBRL(pendingRevenue)}</div>
            <span style="font-size:0.76rem;color:var(--text-secondary);">${pendingOrders.length} pedido(s) pendente(s)</span>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Peças Publicadas</div>
            <div class="kpi-value">${products.filter((p) => p.status === 'published').length}</div>
            <span style="font-size:0.76rem;color:var(--text-secondary);">${demoProductsCount} demonstrativa(s)</span>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Alerta de Estoque Baixo</div>
            <div class="kpi-value" style="color:${lowStockProducts.length > 0 ? 'var(--status-danger-text)' : 'var(--text-primary)'};">${lowStockProducts.length}</div>
            <span style="font-size:0.76rem;color:var(--text-secondary);">Peças com ≤ 3 unidades</span>
          </div>
        </div>

        <!-- Checklist de Confirmação da Proprietária -->
        <div class="admin-card">
          <h2 style="font-family:var(--font-serif);font-size:1.5rem;margin-bottom:6px;">Checklist da Proprietária Antes do Site Entrar no Ar</h2>
          <p style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:14px;">
            Como nenhum dado empresarial, bancário ou comercial foi inventado, revise os itens abaixo antes de divulgar a loja oficialmente:
          </p>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${checklist.map((item) => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border:1px solid var(--border-subtle);border-radius:6px;background:${item.done ? 'var(--status-success-bg)' : 'var(--bg-primary)'};gap:12px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:10px;font-size:0.86rem;">
                  <span>${item.done ? '✅' : '⏳'}</span>
                  <strong>${app.escapeHtml(item.label)}</strong>
                </div>
                <button type="button" class="btn btn-outline btn-sm" data-admin-section="${item.targetSection}">
                  ${item.done ? 'Revisar' : 'Configurar Agora →'}
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <!-- Produtos Mais Vendidos -->
          <div class="admin-card">
            <h3 style="font-family:var(--font-serif);font-size:1.35rem;margin-bottom:12px;">Produtos Mais Procurados / Vendidos</h3>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Vendas</th>
                  <th>Estoque Total</th>
                </tr>
              </thead>
              <tbody>
                ${bestSellers.map((p) => `
                  <tr>
                    <td><strong>${app.escapeHtml(p.name)}</strong></td>
                    <td>${p.salesCount || 0} un.</td>
                    <td>${app.getTotalProductStock(p)} un.</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Alerta de Estoque Baixo -->
          <div class="admin-card">
            <h3 style="font-family:var(--font-serif);font-size:1.35rem;margin-bottom:12px;">Itens com Estoque Baixo (≤ 3 un.)</h3>
            ${lowStockProducts.length === 0 ? `
              <p style="font-size:0.86rem;color:var(--text-secondary);">Todas as peças possuem estoque confortável no momento.</p>
            ` : `
              <table class="data-table">
                <thead>
                  <tr>
                    <th>SKU / Peça</th>
                    <th>Estoque Restante</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  ${lowStockProducts.map((p) => `
                    <tr>
                      <td><strong>${app.escapeHtml(p.sku)}</strong> — ${app.escapeHtml(p.name)}</td>
                      <td><span class="status-pill danger">${app.getTotalProductStock(p)} un.</span></td>
                      <td><button type="button" class="btn btn-outline btn-sm" data-action-admin="edit-product" data-product-id="${app.escapeHtml(p.id)}">Repor</button></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // SEÇÃO 2: PRODUTOS, FOTOS, VÍDEOS, MEDIDAS E ESTOQUE
  // =========================================================================
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

    return `
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
          <div>
            <span class="section-eyebrow">Gestão de Catálogo</span>
            <h1 style="font-family:var(--font-serif);font-size:2rem;">Produtos, Fotos, Vídeos & Estoque</h1>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button type="button" class="btn btn-primary btn-sm" id="btn-new-product-form">+ Novo Produto</button>
            ${products.some((p) => p.isDemo) ? `
              <button type="button" class="btn btn-danger btn-sm" id="btn-remove-all-demos">
                Remover Produtos de Demonstração
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Formulário de Cadastro / Edição de Produto -->
        <div class="admin-card" id="admin-product-form-card">
          <h2 style="font-family:var(--font-serif);font-size:1.5rem;margin-bottom:14px;">
            ${editingProd ? 'Editando: ' + app.escapeHtml(editingProd.name) : 'Cadastrar Novo Produto da Loja'}
          </h2>
          <form id="admin-product-form">
            <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:12px;margin-bottom:12px;">
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Nome da Peça *</label>
                <input type="text" name="name" class="form-control" required value="${editingProd ? app.escapeHtml(editingProd.name) : ''}" placeholder="Ex.: Vestido Midi Seda Angély" />
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Código SKU *</label>
                <input type="text" name="sku" class="form-control" required value="${editingProd ? app.escapeHtml(editingProd.sku) : 'ANG-' + Math.floor(100 + Math.random() * 900)}" />
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Categoria *</label>
                <select name="category" class="form-control" required>
                  ${db.categories.map((c) => `
                    <option value="${app.escapeHtml(c.slug)}" ${editingProd && editingProd.category === c.slug ? 'selected' : ''}>${app.escapeHtml(c.name)}</option>
                  `).join('')}
                </select>
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Estilo / Ocasião</label>
                <input type="text" name="style" class="form-control" value="${editingProd ? app.escapeHtml(editingProd.style) : 'Alfaiataria'}" placeholder="Ex.: Alfaiataria, Festa..." />
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:12px;">
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Preço Normal (R$) *</label>
                <input type="number" step="0.01" name="price" class="form-control" required value="${editingProd ? editingProd.price : '299.90'}" />
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Preço Promocional (R$)</label>
                <input type="number" step="0.01" name="promoPrice" class="form-control" value="${editingProd && editingProd.promoPrice ? editingProd.promoPrice : ''}" placeholder="Opcional" />
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Tamanhos (separados por vírgula)</label>
                <input type="text" name="sizes" class="form-control" required value="${editingProd ? app.escapeHtml((editingProd.sizes || []).join(', ')) : 'P, M, G'}" />
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Status de Publicação</label>
                <select name="status" class="form-control">
                  <option value="published" ${!editingProd || editingProd.status === 'published' ? 'selected' : ''}>Publicado (Visível na Loja)</option>
                  <option value="paused" ${editingProd && editingProd.status === 'paused' ? 'selected' : ''}>Pausado (Oculto)</option>
                </select>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Cores (Nome:Hex separados por vírgula)</label>
                <input type="text" name="colorsRaw" class="form-control" value="${editingProd ? app.escapeHtml((editingProd.colors || []).map((c) => c.name + ':' + c.hex).join(', ')) : 'Off-White:#F7F5F0, Preto:#1B1B1B'}" />
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Estoque Inicial por Variação (Unidades)</label>
                <input type="number" name="defaultStockPerVariation" class="form-control" value="${editingProd && editingProd.variations && editingProd.variations[0] ? editingProd.variations[0].stock : 4}" min="0" />
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Resumo Curto *</label>
                <input type="text" name="shortDescription" class="form-control" required value="${editingProd ? app.escapeHtml(editingProd.shortDescription) : ''}" placeholder="Resumo elegante da modelagem e tecido" />
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Composição do Tecido</label>
                <input type="text" name="fabricInfo" class="form-control" value="${editingProd ? app.escapeHtml(editingProd.fabricInfo) : ''}" placeholder="Ex.: 100% Linho / Viscose" />
              </div>
            </div>

            <div style="margin-bottom:12px;">
              <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Descrição Completa e Caimento</label>
              <textarea name="description" rows="2" class="form-control">${editingProd ? app.escapeHtml(editingProd.description) : ''}</textarea>
            </div>

            <!-- Upload e Gestão de Fotos e Vídeos do Produto -->
            <div style="background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:6px;padding:14px;margin-bottom:14px;">
              <strong style="display:block;font-size:0.84rem;margin-bottom:8px;">📸 Fotos e Vídeos do Produto (${AdminState.tempProductMedia.length} adicionados)</strong>
              <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;align-items:center;">
                <label class="btn btn-outline btn-sm" style="cursor:pointer;">
                  📂 Enviar Foto/Vídeo do Dispositivo
                  <input type="file" id="admin-prod-file-upload" accept="image/*,video/mp4,video/webm" multiple style="display:none;" />
                </label>
                <input type="url" id="admin-prod-media-url" class="form-control" placeholder="Ou cole a URL de uma foto ou vídeo (.jpg, .png, .mp4)" style="max-width:340px;min-height:36px;" />
                <select id="admin-prod-media-type" class="form-control" style="width:auto;min-height:36px;">
                  <option value="image">Foto</option>
                  <option value="video">Vídeo</option>
                </select>
                <button type="button" class="btn btn-subtle btn-sm" id="btn-add-media-url">Adicionar Mídia</button>
              </div>

              <div style="display:flex;gap:10px;flex-wrap:wrap;">
                ${AdminState.tempProductMedia.map((m, idx) => `
                  <div style="width:96px;border:1px solid var(--border-strong);border-radius:4px;overflow:hidden;background:#FFF;position:relative;">
                    ${m.type === 'video' ? `
                      <div style="height:88px;background:#161514;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:0.7rem;">▶ VÍDEO</div>
                    ` : `
                      <img src="${app.escapeHtml(m.url)}" alt="Mídia ${idx + 1}" style="width:100%;height:88px;object-fit:cover;" />
                    `}
                    <button type="button" data-action-admin="remove-temp-media" data-index="${idx}" style="width:100%;font-size:0.7rem;padding:3px;background:var(--status-danger-bg);color:var(--status-danger-text);font-weight:700;">
                      Remover
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>

            <div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:16px;font-size:0.84rem;">
              <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
                <input type="checkbox" name="isFeatured" ${!editingProd || editingProd.isFeatured ? 'checked' : ''} />
                <span>Destacar na Página Inicial</span>
              </label>
              <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
                <input type="checkbox" name="isNew" ${!editingProd || editingProd.isNew ? 'checked' : ''} />
                <span>Marcar como Novidade</span>
              </label>
              <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
                <input type="checkbox" name="isPromo" ${editingProd && editingProd.isPromo ? 'checked' : ''} />
                <span>Ativar Promoção</span>
              </label>
              <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
                <input type="checkbox" name="isDemo" ${editingProd ? (editingProd.isDemo ? 'checked' : '') : ''} />
                <span>Identificar como Produto Demonstrativo (Imagem Ilustrativa)</span>
              </label>
            </div>

            <div style="display:flex;gap:10px;">
              <button type="submit" class="btn btn-primary btn-sm">
                ${editingProd ? 'Salvar Alterações do Produto' : 'Cadastrar e Publicar Produto'}
              </button>
              ${editingProd ? `
                <button type="button" class="btn btn-outline btn-sm" id="btn-cancel-edit-product">Cancelar Edição</button>
              ` : ''}
            </div>
          </form>
        </div>

        <!-- Tabela de Produtos Cadastrados -->
        <div class="admin-card">
          <h3 style="font-family:var(--font-serif);font-size:1.4rem;margin-bottom:12px;">Catálogo Cadastrado (${products.length} peças)</h3>
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>SKU / Produto</th>
                  <th>Categoria</th>
                  <th>Preço</th>
                  <th>Estoque</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                ${products.map((p) => {
                  const firstImg = (p.media && p.media[0]) || { url: '' };
                  const stock = app.getTotalProductStock(p);
                  return `
                    <tr>
                      <td><img src="${app.escapeHtml(firstImg.url)}" alt="${app.escapeHtml(p.name)}" style="width:46px;height:58px;object-fit:cover;border-radius:4px;" /></td>
                      <td>
                        <strong>${app.escapeHtml(p.name)}</strong>
                        <div style="font-size:0.75rem;color:var(--text-secondary);">${app.escapeHtml(p.sku)} ${p.isDemo ? '• <span style="color:var(--status-warning-text);font-weight:600;">[Demonstração]</span>' : ''}</div>
                      </td>
                      <td>${app.escapeHtml(p.categoryName || p.category)}</td>
                      <td>
                        ${p.isPromo && p.promoPrice ? `<strong>${app.formatBRL(p.promoPrice)}</strong> <s style="font-size:0.75rem;color:var(--text-muted);">${app.formatBRL(p.price)}</s>` : app.formatBRL(p.price)}
                      </td>
                      <td><span class="status-pill ${stock <= 3 ? 'danger' : 'confirmed'}">${stock} un.</span></td>
                      <td>
                        <span class="status-pill ${p.status === 'published' ? 'confirmed' : 'pending'}">
                          ${p.status === 'published' ? 'Publicado' : 'Pausado'}
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

    return `
      <div>
        <span class="section-eyebrow">Organização e Campanhas</span>
        <h1 style="font-family:var(--font-serif);font-size:2rem;margin-bottom:20px;">Categorias, Banner Principal & Cupons</h1>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <!-- Categorias -->
          <div class="admin-card">
            <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:12px;">Categorias da Loja (${db.categories.length})</h2>
            <form id="admin-add-category-form" style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin-bottom:16px;">
              <input type="text" name="name" class="form-control" required placeholder="Nome (Ex.: Macacões)" />
              <input type="url" name="imageUrl" class="form-control" placeholder="URL da foto de capa" />
              <button type="submit" class="btn btn-primary btn-sm">+ Criar</button>
            </form>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Slug</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                ${db.categories.map((c) => `
                  <tr>
                    <td><strong>${app.escapeHtml(c.name)}</strong></td>
                    <td><code>${app.escapeHtml(c.slug)}</code></td>
                    <td>
                      <button type="button" class="btn btn-danger btn-sm" data-action-admin="delete-category" data-cat-id="${app.escapeHtml(c.id)}">Remover</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Cupons de Desconto -->
          <div class="admin-card">
            <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:12px;">Cupons de Desconto (${db.coupons.length})</h2>
            <form id="admin-add-coupon-form" style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr auto;gap:8px;margin-bottom:16px;">
              <input type="text" name="code" class="form-control" required placeholder="CÓDIGO" />
              <select name="type" class="form-control">
                <option value="percent">% Desconto</option>
                <option value="fixed">R$ Fixo</option>
              </select>
              <input type="number" name="value" class="form-control" required placeholder="Valor" />
              <input type="number" name="minOrderAmount" class="form-control" placeholder="Mín R$" value="100" />
              <button type="submit" class="btn btn-primary btn-sm">+ Criar</button>
            </form>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Regra</th>
                  <th>Status</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                ${db.coupons.map((cp) => `
                  <tr>
                    <td><strong>${app.escapeHtml(cp.code)}</strong></td>
                    <td>${cp.type === 'percent' ? cp.value + '%' : app.formatBRL(cp.value)} (Mín. ${app.formatBRL(cp.minOrderAmount)})</td>
                    <td><span class="status-pill ${cp.active ? 'confirmed' : 'danger'}">${cp.active ? 'Ativo' : 'Inativo'}</span></td>
                    <td>
                      <button type="button" class="btn btn-outline btn-sm" data-action-admin="toggle-coupon" data-coupon-id="${app.escapeHtml(cp.id)}">${cp.active ? 'Desativar' : 'Ativar'}</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Edição do Banner Principal -->
        <div class="admin-card">
          <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:12px;">Banner Principal da Página Inicial (Hero)</h2>
          <form id="admin-hero-banner-form">
            <div style="display:grid;grid-template-columns:1fr 2fr;gap:12px;margin-bottom:12px;">
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
            <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:12px;">
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">URL da Imagem do Banner (ou envie abaixo)</label>
                <input type="text" name="imageUrl" id="admin-hero-img-url" class="form-control" value="${app.escapeHtml(hero.imageUrl || '')}" />
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Enviar Nova Imagem do Dispositivo</label>
                <input type="file" id="admin-hero-file-input" accept="image/*" class="form-control" />
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-sm">Salvar Banner da Página Inicial</button>
          </form>
        </div>
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

    const filteredOrders = AdminState.orderFilterStatus === 'all'
      ? orders
      : orders.filter((o) => o.status === AdminState.orderFilterStatus);

    const statusOptions = [
      { value: 'awaiting_confirmation', label: 'Aguardando confirmação de pagamento' },
      { value: 'paid', label: 'Pagamento confirmado' },
      { value: 'preparing', label: 'Em separação' },
      { value: 'shipped', label: 'Enviado (em trânsito)' },
      { value: 'ready_pickup', label: 'Pronto para retirada em Itaperuna' },
      { value: 'delivered', label: 'Entregue / Concluído' },
      { value: 'cancelled', label: 'Cancelado' }
    ];

    return `
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
          <div>
            <span class="section-eyebrow">Operação de Vendas e Pós-Venda</span>
            <h1 style="font-family:var(--font-serif);font-size:2rem;">Pedidos, Rastreio & Solicitações de Troca</h1>
          </div>
          <select id="admin-order-filter" class="form-control" style="width:auto;">
            <option value="all" ${AdminState.orderFilterStatus === 'all' ? 'selected' : ''}>Todos os Pedidos (${orders.length})</option>
            ${statusOptions.map((st) => `
              <option value="${st.value}" ${AdminState.orderFilterStatus === st.value ? 'selected' : ''}>${st.label}</option>
            `).join('')}
          </select>
        </div>

        ${filteredOrders.length === 0 ? `
          <div class="admin-card" style="text-align:center;padding:36px;">
            <p style="color:var(--text-secondary);">Nenhum pedido encontrado neste filtro.</p>
          </div>
        ` : filteredOrders.map((ord) => `
          <div class="admin-card">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding-bottom:12px;border-bottom:1px solid var(--border-subtle);margin-bottom:12px;">
              <div>
                <strong style="font-size:1.1rem;">Pedido ${app.escapeHtml(ord.orderNumber)}</strong>
                <span style="font-size:0.8rem;color:var(--text-secondary);margin-left:8px;">${app.formatDateBR(ord.createdAt)}</span>
                <div style="font-size:0.84rem;margin-top:2px;">
                  Cliente: <strong>${app.escapeHtml(ord.customer.name)}</strong> (${app.escapeHtml(ord.customer.email)} • ${app.escapeHtml(ord.customer.phone)})
                </div>
              </div>
              <div style="text-align:right;">
                <span class="status-pill ${ord.status === 'paid' || ord.status === 'delivered' ? 'confirmed' : ord.status === 'cancelled' ? 'danger' : 'pending'}">
                  ${app.escapeHtml(ord.statusLabel)}
                </span>
                <div style="font-size:1.1rem;font-weight:700;margin-top:4px;">${app.formatBRL(ord.total)}</div>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:0.85rem;margin-bottom:14px;">
              <div>
                <strong>Itens Comprados:</strong>
                ${(ord.items || []).map((it) => `
                  <div>• ${it.quantity}x ${app.escapeHtml(it.name)} (${app.escapeHtml(it.size)} / ${app.escapeHtml(it.color)}) — ${app.formatBRL(it.unitPrice * it.quantity)}</div>
                `).join('')}
                ${ord.customerPaymentNote ? `
                  <div class="alert-box alert-info" style="margin-top:8px;padding:8px 10px;">
                    <strong>Aviso de pagamento enviado pela cliente:</strong> ${app.escapeHtml(ord.customerPaymentNote)}
                  </div>
                ` : ''}
              </div>
              <div>
                <div><strong>Pagamento:</strong> ${app.escapeHtml(ord.paymentMethodLabel)}</div>
                <div><strong>Entrega:</strong> ${app.escapeHtml(ord.shipping.methodName)}</div>
                <div><strong>Endereço:</strong> ${app.escapeHtml(ord.shipping.address.street)}, ${app.escapeHtml(ord.shipping.address.number)} — ${app.escapeHtml(ord.shipping.address.neighborhood)}, ${app.escapeHtml(ord.shipping.address.cityState)} (CEP ${app.escapeHtml(ord.shipping.address.zipCode)})</div>
              </div>
            </div>

            <!-- Controles de Atualização de Status e Código de Rastreio -->
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
                <input type="text" class="form-control" id="ord-track-${app.escapeHtml(ord.id)}" value="${app.escapeHtml(ord.shipping.trackingCode || '')}" placeholder="Ex.: BR123456789BR" style="min-height:38px;" />
              </div>
              <button type="button" class="btn btn-primary btn-sm" data-action-admin="save-order-update" data-order-id="${app.escapeHtml(ord.id)}">
                Salvar & Notificar Cliente
              </button>
            </div>
          </div>
        `).join('')}

        <!-- Solicitações de Troca, Devolução e Direito de Arrependimento -->
        <div class="admin-card" style="margin-top:24px;">
          <h2 style="font-family:var(--font-serif);font-size:1.5rem;margin-bottom:12px;">Solicitações de Troca e Devolução (${returns.length})</h2>
          ${returns.length === 0 ? `
            <p style="font-size:0.86rem;color:var(--text-secondary);">Nenhuma solicitação de troca ou devolução registrada.</p>
          ` : returns.map((r) => `
            <div style="padding:12px;border:1px solid var(--border-subtle);border-radius:6px;margin-bottom:10px;font-size:0.86rem;">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                <strong>Pedido ${app.escapeHtml(r.orderNumber)} • ${app.escapeHtml(r.customerName)} (${app.escapeHtml(r.type)})</strong>
                <span class="status-pill pending">${app.escapeHtml(r.status)}</span>
              </div>
              <p style="color:var(--text-secondary);margin-bottom:8px;">Motivo informado: ${app.escapeHtml(r.reason)}</p>
              <div style="display:flex;gap:8px;">
                <input type="text" class="form-control" id="ret-resp-${app.escapeHtml(r.id)}" placeholder="Instruções de devolução/estorno para a cliente..." value="${app.escapeHtml(r.ownerResponse || '')}" style="min-height:36px;" />
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
          <strong>Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018):</strong> Por segurança e minimização de exposição, CPF, telefone e e-mail das clientes são exibidos mascarados por padrão. Clique em <em>"Revelar Dados"</em> apenas quando estritamente necessário para faturamento ou despacho.
        </div>

        <div class="admin-card">
          <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:12px;">Clientes Cadastradas (${customers.length})</h2>
          ${customers.length === 0 ? `
            <p style="font-size:0.86rem;color:var(--text-secondary);">Nenhuma cliente cadastrada até o momento.</p>
          ` : `
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
                          ${rev ? 'Ocultar Dados' : '🔓 Revelar Dados'}
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>

        <!-- Mensagens do Formulário de Contato (SAC) -->
        <div class="admin-card">
          <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:12px;">Atendimentos e Dúvidas Recebidas no SAC (${messages.length})</h2>
          ${messages.length === 0 ? `
            <p style="font-size:0.86rem;color:var(--text-secondary);">Nenhuma mensagem de atendimento pendente.</p>
          ` : messages.map((m) => `
            <div style="padding:12px;border:1px solid var(--border-subtle);border-radius:6px;margin-bottom:10px;font-size:0.86rem;">
              <div style="display:flex;justify-content:space-between;">
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
  // SEÇÃO 6: FORMAS DE PAGAMENTO CONFIGURÁVEIS (PIX EMV, CARTÃO, RETIRADA)
  // =========================================================================
  function renderPaymentsSection() {
    const app = window.ByAngelyApp;
    const pay = app.getState().db.paymentSettings;

    // Gera preview de QR Code Pix em tempo real para a proprietária testar
    const previewKey = (pay.pix.pixKey && !pay.pix.pixKey.toLowerCase().includes('a confirmar'))
      ? pay.pix.pixKey
      : 'financeiro@byangely.com.br';
    const previewName = (pay.pix.recipientName && !pay.pix.recipientName.toLowerCase().includes('a confirmar'))
      ? pay.pix.recipientName
      : 'BY ANGELY';
    const samplePayload = window.ByAngelyPix.generatePixPayload({
      pixKey: previewKey,
      keyType: pay.pix.keyType,
      merchantName: previewName,
      merchantCity: pay.pix.recipientCity || 'ITAPERUNA',
      amount: Number(AdminState.pixPreviewAmount) || 289.90,
      txid: (pay.pix.txidPrefix || 'BYANGELY') + 'TESTE'
    });
    const sampleSvg = window.ByAngelyPix.renderQrSvg(samplePayload);

    return `
      <div>
        <span class="section-eyebrow">Meios de Pagamento</span>
        <h1 style="font-family:var(--font-serif);font-size:2rem;margin-bottom:8px;">Configuração de Pagamentos (Pix, Cartão e Retirada)</h1>
        <p style="font-size:0.88rem;color:var(--text-secondary);margin-bottom:20px;">
          Escolha quais formas de pagamento deseja aceitar, configure seus dados e ative ou desative cada opção. A loja exibe às clientes <strong>somente as opções ativas</strong> e nunca simula aprovações automáticas.
        </p>

        <form id="admin-payments-form">
          <!-- 1. PIX -->
          <div class="admin-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
              <h2 style="font-family:var(--font-serif);font-size:1.55rem;">1. Pix (QR Code EMV Oficial e Copia e Cola)</h2>
              <label style="display:inline-flex;align-items:center;gap:8px;font-weight:700;cursor:pointer;">
                <input type="checkbox" name="pixEnabled" ${pay.pix.enabled ? 'checked' : ''} />
                <span>Ativar Pix no Checkout</span>
              </label>
            </div>

            <div style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:24px;align-items:start;">
              <div>
                <div style="display:grid;grid-template-columns:1fr 2fr;gap:12px;margin-bottom:12px;">
                  <div>
                    <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Tipo da Chave Pix</label>
                    <select name="pixKeyType" class="form-control">
                      <option value="cnpj" ${pay.pix.keyType === 'cnpj' ? 'selected' : ''}>CNPJ</option>
                      <option value="cpf" ${pay.pix.keyType === 'cpf' ? 'selected' : ''}>CPF</option>
                      <option value="email" ${pay.pix.keyType === 'email' ? 'selected' : ''}>E-mail</option>
                      <option value="telefone" ${pay.pix.keyType === 'telefone' ? 'selected' : ''}>Celular / Telefone</option>
                      <option value="aleatoria" ${pay.pix.keyType === 'aleatoria' ? 'selected' : ''}>Chave Aleatória (EVP)</option>
                    </select>
                  </div>
                  <div>
                    <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Chave Pix da Loja *</label>
                    <input type="text" name="pixKey" class="form-control" required value="${app.escapeHtml(pay.pix.pixKey)}" />
                  </div>
                </div>

                <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:12px;margin-bottom:12px;">
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

                <div style="margin-bottom:12px;">
                  <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Instruções Exibidas à Cliente antes do Pagamento</label>
                  <textarea name="pixInstructions" rows="2" class="form-control">${app.escapeHtml(pay.pix.instructions)}</textarea>
                </div>
              </div>

              <!-- Preview do QR Code Pix no Painel -->
              <div style="background:var(--bg-primary);border:1px solid var(--border-subtle);border-radius:8px;padding:14px;text-align:center;">
                <strong style="font-size:0.78rem;text-transform:uppercase;display:block;margin-bottom:6px;">Simulador de QR Code Pix EMV</strong>
                <div style="width:150px;margin:0 auto 8px;background:#FFF;padding:8px;border:1px solid var(--border-strong);border-radius:6px;">
                  ${sampleSvg}
                </div>
                <p style="font-size:0.72rem;color:var(--text-secondary);word-break:break-all;font-family:monospace;background:#FFF;padding:6px;border-radius:4px;border:1px solid var(--border-subtle);">
                  ${app.escapeHtml(samplePayload.slice(0, 64))}...
                </p>
              </div>
            </div>
          </div>

          <!-- 2. CARTÃO DE CRÉDITO -->
          <div class="admin-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
              <h2 style="font-family:var(--font-serif);font-size:1.55rem;">2. Cartão de Crédito (Link Externo ou Provedor Seguro)</h2>
              <label style="display:inline-flex;align-items:center;gap:8px;font-weight:700;cursor:pointer;">
                <input type="checkbox" name="cardEnabled" ${pay.creditCard.enabled ? 'checked' : ''} />
                <span>Ativar Cartão no Checkout</span>
              </label>
            </div>

            <div class="alert-box alert-warning">
              <strong>Importante sobre Links Externos vs. Integração API:</strong> Um link de pagamento genérico (ex.: link aberto de maquininha/carteira digital) <strong>não identifica sozinho o valor de cada pedido nem aprova o status automaticamente</strong>. Nesse modo, o cliente é redirecionado com segurança ao provedor e o pedido aguarda confirmação no painel. Para gerar cobrança individual automática com atualização de status via Webhook, conecte a API de um gateway certificado (Mercado Pago, InfinitePay, PagBank, Pagar.me ou Asaas). Nenhum dado completo de cartão é armazenado na loja.
            </div>

            <div style="display:grid;grid-template-columns:1fr 1.5fr;gap:12px;margin-bottom:12px;">
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Nome do Serviço / Provedor de Cartão</label>
                <input type="text" name="cardProviderName" class="form-control" value="${app.escapeHtml(pay.creditCard.providerName)}" placeholder="Ex.: InfinitePay / Mercado Pago / PagBank" />
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">URL Segura do Link de Pagamento Externo (HTTPS)</label>
                <input type="url" name="cardExternalLink" class="form-control" value="${app.escapeHtml(pay.creditCard.externalPaymentLink || '')}" placeholder="https://..." />
              </div>
            </div>

            <div style="margin-bottom:12px;">
              <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Instruções de Conclusão e Retorno para a Cliente</label>
              <textarea name="cardInstructions" rows="2" class="form-control">${app.escapeHtml(pay.creditCard.instructions)}</textarea>
            </div>
          </div>

          <!-- 3. PAGAMENTO NA RETIRADA -->
          <div class="admin-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
              <h2 style="font-family:var(--font-serif);font-size:1.55rem;">3. Pagamento na Retirada (Itaperuna - RJ)</h2>
              <label style="display:inline-flex;align-items:center;gap:8px;font-weight:700;cursor:pointer;">
                <input type="checkbox" name="pickupPayEnabled" ${pay.payOnPickup.enabled ? 'checked' : ''} />
                <span>Ativar Pagamento na Retirada</span>
              </label>
            </div>
            <div>
              <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Regras e Instruções para Pagamento Presencial</label>
              <textarea name="pickupPayInstructions" rows="2" class="form-control">${app.escapeHtml(pay.payOnPickup.instructions)}</textarea>
            </div>
          </div>

          <button type="submit" class="btn btn-primary">Salvar Configurações de Pagamento</button>
        </form>
      </div>
    `;
  }

  // =========================================================================
  // SEÇÃO 7: ENTREGA, FRETE E COMUNICAÇÃO TRANSACIONAL
  // =========================================================================
  function renderShippingSection() {
    const app = window.ByAngelyApp;
    const ship = app.getState().db.shippingSettings;

    return `
      <div>
        <span class="section-eyebrow">Logística & Comunicação</span>
        <h1 style="font-family:var(--font-serif);font-size:2rem;margin-bottom:16px;">Opções de Entrega, Retirada & Notificações</h1>

        <form id="admin-shipping-form">
          <div class="admin-card">
            <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:12px;">Modalidades de Envio e Retirada</h2>
            <p style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:16px;">
              Defina quais modalidades estão ativas, o valor do frete e se o valor já está confirmado pela proprietária ou se deve exibir <em>"A confirmar pela proprietária"</em>.
            </p>

            ${(ship.methods || []).map((m, idx) => `
              <div style="padding:14px;border:1px solid var(--border-subtle);border-radius:6px;margin-bottom:12px;background:var(--bg-primary);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                  <strong>${app.escapeHtml(m.name)}</strong>
                  <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;font-size:0.84rem;">
                    <input type="checkbox" name="method_enabled_${idx}" ${m.enabled ? 'checked' : ''} />
                    <span>Modalidade Ativa</span>
                  </label>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 2fr;gap:10px;">
                  <div>
                    <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Status do Valor</label>
                    <select name="method_status_${idx}" class="form-control">
                      <option value="to_confirm" ${m.priceStatus === 'to_confirm' ? 'selected' : ''}>A confirmar pela proprietária</option>
                      <option value="confirmed" ${m.priceStatus === 'confirmed' ? 'selected' : ''}>Valor Confirmado (Exibir R$)</option>
                    </select>
                  </div>
                  <div>
                    <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Valor Fixo (R$)</label>
                    <input type="number" step="0.01" name="method_price_${idx}" class="form-control" value="${m.price}" />
                  </div>
                  <div>
                    <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Prazo Estimado / Condição Exibida</label>
                    <input type="text" name="method_days_${idx}" class="form-control" value="${app.escapeHtml(m.estimatedDays)}" />
                  </div>
                </div>
              </div>
            `).join('')}

            <button type="submit" class="btn btn-primary btn-sm">Salvar Modalidades de Entrega</button>
          </div>
        </form>

        <div class="admin-card">
          <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:8px;">Status das Integrações Externas de E-mail e WhatsApp</h2>
          <div class="alert-box alert-warning">
            <strong>Transparência Técnica:</strong> Nenhuma integração externa de disparo automático (SMTP/API de E-mail ou API WhatsApp Business) é declarada como ativa antes que a proprietária insira e valide suas credenciais de serviço. Enquanto não configuradas, todas as confirmações ficam salvas em tempo real na Área da Cliente e no Histórico do Pedido.
          </div>
          <p style="font-size:0.86rem;"><strong>E-mail Transacional:</strong> ${app.escapeHtml(ship.notifications.emailProviderName)}</p>
          <p style="font-size:0.86rem;margin-top:4px;"><strong>WhatsApp Transacional:</strong> ${app.escapeHtml(ship.notifications.whatsappProviderName)}</p>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // SEÇÃO 8: LOGOTIPO OFICIAL, IDENTIDADE DA MARCA E DADOS DA LOJA
  // =========================================================================
  function renderBrandingSection() {
    const app = window.ByAngelyApp;
    const st = app.getState().db.storeSettings;

    return `
      <div>
        <span class="section-eyebrow">Identidade Visual & Dados Oficiais</span>
        <h1 style="font-family:var(--font-serif);font-size:2rem;margin-bottom:16px;">Logotipo, Marca & Dados da Loja (Itaperuna - RJ)</h1>

        <form id="admin-branding-form">
          <!-- Envio do Logotipo Oficial -->
          <div class="admin-card">
            <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:10px;">Apresentação da Marca By Angély (Logotipo ou Tipografia)</h2>
            <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:14px;">
              Por padrão, o site utiliza a apresentação tipográfica elegante <strong>BY ANGÉLY</strong>. Você pode enviar o arquivo do logotipo oficial da loja abaixo quando desejar.
            </p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:12px;align-items:center;">
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Modo de Exibição no Topo e Rodapé</label>
                <select name="logoMode" class="form-control" style="margin-bottom:10px;">
                  <option value="typography" ${st.logoMode === 'typography' ? 'selected' : ''}>Apresentação Tipográfica Elegante (BY ANGÉLY)</option>
                  <option value="image" ${st.logoMode === 'image' ? 'selected' : ''}>Logotipo Oficial Enviado (Imagem)</option>
                </select>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Enviar Arquivo de Logotipo (PNG, SVG, WebP)</label>
                <input type="file" id="admin-logo-upload" accept="image/*" class="form-control" />
              </div>
              <div style="background:var(--bg-primary);border:1px solid var(--border-subtle);padding:20px;border-radius:8px;text-align:center;">
                <span style="font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);display:block;margin-bottom:10px;">Pré-visualização Atual</span>
                ${st.logoMode === 'image' && st.logoUrl ? `
                  <img src="${app.escapeHtml(st.logoUrl)}" alt="Logotipo By Angély" style="max-height:60px;margin:0 auto;" />
                ` : `
                  <span class="brand-wordmark"><span class="brand-by">BY</span><span class="brand-angely">ANGÉLY</span></span>
                `}
              </div>
            </div>
          </div>

          <!-- Dados Oficiais da Empresa -->
          <div class="admin-card">
            <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:12px;">Dados Cadastrais, Endereço e Canais de Contato</h2>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Razão Social / Nome Empresarial</label>
                <input type="text" name="legalName" class="form-control" value="${app.escapeHtml(st.legalName)}" />
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">CNPJ</label>
                <input type="text" name="cnpj" class="form-control" value="${app.escapeHtml(st.cnpj)}" />
              </div>
            </div>
            <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:12px;">
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Endereço Físico / Atendimento (Itaperuna - RJ)</label>
                <input type="text" name="addressLine" class="form-control" value="${app.escapeHtml(st.addressLine)}" />
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Horário de Atendimento</label>
                <input type="text" name="businessHours" class="form-control" value="${app.escapeHtml(st.businessHours)}" />
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;">
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">WhatsApp / Telefone</label>
                <input type="text" name="whatsapp" class="form-control" value="${app.escapeHtml(st.whatsapp)}" />
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">E-mail de Atendimento (SAC)</label>
                <input type="text" name="email" class="form-control" value="${app.escapeHtml(st.email)}" />
              </div>
              <div>
                <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Instagram (@usuario)</label>
                <input type="text" name="instagramHandle" class="form-control" value="${app.escapeHtml(st.instagramHandle)}" />
              </div>
            </div>
            <div style="margin-bottom:12px;">
              <label style="display:block;font-size:0.76rem;font-weight:600;margin-bottom:4px;">Texto da Barra Superior de Avisos</label>
              <input type="text" name="announcementBar" class="form-control" value="${app.escapeHtml(st.announcementBar)}" />
            </div>
            <button type="submit" class="btn btn-primary">Salvar Identidade e Dados da Loja</button>
          </div>
        </form>
      </div>
    `;
  }

  // =========================================================================
  // SEÇÃO 9: EDITOR DE POLÍTICAS LEGAIS E CONDIÇÕES COMERCIAIS
  // =========================================================================
  function renderPoliciesEditorSection() {
    const app = window.ByAngelyApp;
    const pol = app.getState().db.policies;

    const sections = [
      { key: 'privacy', obj: pol.privacy },
      { key: 'terms', obj: pol.terms },
      { key: 'shippingPolicy', obj: pol.shippingPolicy },
      { key: 'returnsPolicy', obj: pol.returnsPolicy }
    ];

    return `
      <div>
        <span class="section-eyebrow">Conformidade Legal</span>
        <h1 style="font-family:var(--font-serif);font-size:2rem;margin-bottom:12px;">Revisão e Confirmação das Políticas da Loja</h1>
        <div class="alert-box alert-warning">
          ${app.escapeHtml(pol.legalDisclaimer)}
        </div>

        <form id="admin-policies-form">
          ${sections.map((s) => `
            <div class="admin-card">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <h2 style="font-family:var(--font-serif);font-size:1.45rem;">${app.escapeHtml(s.obj.title)}</h2>
                <label style="display:inline-flex;align-items:center;gap:8px;font-weight:600;font-size:0.84rem;cursor:pointer;">
                  <input type="checkbox" name="confirmed_${s.key}" ${!s.obj.needsOwnerConfirmation ? 'checked' : ''} />
                  <span>Marcar como Revisada e Confirmada pela Proprietária</span>
                </label>
              </div>
              ${(s.obj.content || []).map((block, bIdx) => `
                <div style="margin-bottom:10px;">
                  <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:4px;">${app.escapeHtml(block.heading)}</label>
                  <textarea name="policy_${s.key}_${bIdx}" rows="2" class="form-control">${app.escapeHtml(block.body)}</textarea>
                </div>
              `).join('')}
            </div>
          `).join('')}
          <button type="submit" class="btn btn-primary">Salvar e Atualizar Políticas da Loja</button>
        </form>
      </div>
    `;
  }

  // =========================================================================
  // SEÇÃO 10: EQUIPE AUTORIZADA E PERMISSÕES (RBAC)
  // =========================================================================
  function renderUsersSection() {
    const app = window.ByAngelyApp;
    const users = app.getState().db.adminUsers || [];

    return `
      <div>
        <span class="section-eyebrow">Segurança e Controle de Acesso</span>
        <h1 style="font-family:var(--font-serif);font-size:2rem;margin-bottom:16px;">Usuários Autorizados do Painel</h1>

        <div class="admin-card">
          <h2 style="font-family:var(--font-serif);font-size:1.45rem;margin-bottom:12px;">Autorizar Nova Colaboradora</h2>
          <form id="admin-add-user-form" style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr auto;gap:10px;align-items:end;margin-bottom:20px;">
            <div>
              <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Nome *</label>
              <input type="text" name="name" class="form-control" required placeholder="Nome da colaboradora" />
            </div>
            <div>
              <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">E-mail de Login *</label>
              <input type="email" name="email" class="form-control" required placeholder="colaboradora@byangely.local" />
            </div>
            <div>
              <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Senha *</label>
              <input type="password" name="password" class="form-control" required minlength="6" placeholder="Senha forte" />
            </div>
            <div>
              <label style="display:block;font-size:0.74rem;font-weight:600;margin-bottom:4px;">Nível de Permissão</label>
              <select name="role" class="form-control">
                <option value="order_operator">Atendimento e Pedidos</option>
                <option value="catalog_manager">Catálogo, Produtos e Pedidos</option>
                <option value="owner">Proprietária / Administradora Geral</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary btn-sm">+ Autorizar</button>
          </form>

          <table class="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil de Acesso</th>
                <th>Permissões Ativas</th>
              </tr>
            </thead>
            <tbody>
              ${users.map((u) => `
                <tr>
                  <td><strong>${app.escapeHtml(u.name)}</strong></td>
                  <td><code>${app.escapeHtml(u.email)}</code></td>
                  <td>${app.escapeHtml(u.roleLabel)}</td>
                  <td>${(u.permissions || []).join(', ')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // EVENTOS DO PAINEL ADMINISTRATIVO
  // =========================================================================
  function bindAdminWorkspaceEvents(containerEl) {
    const app = window.ByAngelyApp;
    const db = app.getState().db;

    // Navegação lateral do Admin
    containerEl.querySelectorAll('[data-admin-section]').forEach((btn) => {
      btn.addEventListener('click', () => {
        AdminState.activeSection = btn.getAttribute('data-admin-section');
        AdminState.editingProductId = null;
        AdminState.tempProductMedia = [];
        renderAdminView(containerEl);
      });
    });

    // Logout Admin
    const logoutBtn = containerEl.querySelector('#btn-admin-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        app.getState().currentAdmin = null;
        sessionStorage.removeItem(STORAGE_KEY_ADMIN_SESSION);
        app.showToast('Sessão administrativa encerrada.');
        renderAdminView(containerEl);
      });
    }

    // Remover todos os produtos demonstrativos
    const removeDemosHandler = () => {
      db.products = db.products.filter((p) => !p.isDemo);
      app.saveDatabase('Todos os produtos demonstrativos foram removidos pela proprietária.');
      app.updateGlobalChrome();
      app.showToast('Produtos demonstrativos removidos! O catálogo está pronto para suas peças reais.', 'success');
      renderAdminView(containerEl);
    };
    containerEl.querySelector('#btn-quick-remove-demos')?.addEventListener('click', removeDemosHandler);
    containerEl.querySelector('#btn-remove-all-demos')?.addEventListener('click', removeDemosHandler);

    // Upload de fotos/vídeos de produto via arquivo local (com integração Supabase Storage bucket `products`)
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
              credit: 'Supabase Storage CDN • Acervo By Angély'
            });
            renderAdminView(containerEl);
            return;
          }
          const reader = new FileReader();
          reader.onload = (ev) => {
            AdminState.tempProductMedia.push({
              type: isVideo ? 'video' : 'image',
              url: ev.target.result,
              alt: file.name,
              credit: 'Acervo Próprio By Angély'
            });
            renderAdminView(containerEl);
          };
          reader.readAsDataURL(file);
        });
      });
    }

    // Adicionar mídia por URL
    const addMediaUrlBtn = containerEl.querySelector('#btn-add-media-url');
    if (addMediaUrlBtn) {
      addMediaUrlBtn.addEventListener('click', () => {
        const urlInp = containerEl.querySelector('#admin-prod-media-url');
        const typeSel = containerEl.querySelector('#admin-prod-media-type');
        if (urlInp && urlInp.value.trim()) {
          AdminState.tempProductMedia.push({
            type: typeSel ? typeSel.value : 'image',
            url: urlInp.value.trim(),
            alt: 'Mídia do produto By Angély',
            credit: 'Cadastrado pela administração'
          });
          renderAdminView(containerEl);
        }
      });
    }

    // Salvar Produto (Novo ou Editado)
    const prodForm = containerEl.querySelector('#admin-product-form');
    if (prodForm) {
      prodForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(prodForm);
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
            return { name: n || 'Padrão', hex: h || '#1B1B1B' };
          });
        const defStock = Number(fd.get('defaultStockPerVariation')) || 0;
        const variations = [];
        sizes.forEach((sz) => {
          colors.forEach((cl) => {
            variations.push({ size: sz, color: cl.name, stock: defStock });
          });
        });

        const mediaToSave = AdminState.tempProductMedia.length > 0
          ? JSON.parse(JSON.stringify(AdminState.tempProductMedia))
          : [{ type: 'image', url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80', alt: fd.get('name') }];

        const prodPayload = {
          id: AdminState.editingProductId || 'prod-' + Date.now(),
          sku: fd.get('sku'),
          name: fd.get('name'),
          category: catSlug,
          categoryName: catObj ? catObj.name : catSlug,
          style: fd.get('style'),
          price: Number(fd.get('price')) || 0,
          promoPrice: fd.get('promoPrice') ? Number(fd.get('promoPrice')) : null,
          isPromo: fd.get('isPromo') === 'on',
          isFeatured: fd.get('isFeatured') === 'on',
          isNew: fd.get('isNew') === 'on',
          isDemo: fd.get('isDemo') === 'on',
          status: fd.get('status') || 'published',
          shortDescription: fd.get('shortDescription'),
          description: fd.get('description'),
          fabricInfo: fd.get('fabricInfo'),
          careInfo: 'Seguir instruções da etiqueta interna.',
          sizes,
          colors,
          variations,
          media: mediaToSave,
          sizeChart: window.ByAngelySeed.DEFAULT_SIZE_CHART,
          createdAt: new Date().toISOString()
        };

        if (AdminState.editingProductId) {
          const idx = db.products.findIndex((p) => p.id === AdminState.editingProductId);
          if (idx >= 0) db.products[idx] = { ...db.products[idx], ...prodPayload };
        } else {
          db.products.unshift(prodPayload);
        }

        AdminState.editingProductId = null;
        AdminState.tempProductMedia = [];
        app.saveDatabase('Produto salvo no catálogo: ' + prodPayload.name);
        app.updateGlobalChrome();
        app.showToast('Produto salvo com sucesso!', 'success');
        renderAdminView(containerEl);
      });
    }

    containerEl.querySelector('#btn-cancel-edit-product')?.addEventListener('click', () => {
      AdminState.editingProductId = null;
      AdminState.tempProductMedia = [];
      renderAdminView(containerEl);
    });

    // Ações delegadas da tabela de produtos, pedidos, clientes e categorias
    containerEl.querySelectorAll('[data-action-admin]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.getAttribute('data-action-admin');

        if (act === 'remove-temp-media') {
          const idx = Number(btn.getAttribute('data-index'));
          AdminState.tempProductMedia.splice(idx, 1);
          renderAdminView(containerEl);
        }
        if (act === 'edit-product') {
          const pid = btn.getAttribute('data-product-id');
          const p = db.products.find((x) => x.id === pid);
          if (p) {
            AdminState.activeSection = 'products';
            AdminState.editingProductId = p.id;
            AdminState.tempProductMedia = JSON.parse(JSON.stringify(p.media || []));
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
            app.showToast('Status do produto atualizado!');
            renderAdminView(containerEl);
          }
        }
        if (act === 'delete-product') {
          const pid = btn.getAttribute('data-product-id');
          db.products = db.products.filter((x) => x.id !== pid);
          app.saveDatabase('Produto removido do catálogo.');
          app.updateGlobalChrome();
          app.showToast('Produto excluído.');
          renderAdminView(containerEl);
        }
        if (act === 'delete-category') {
          const cid = btn.getAttribute('data-cat-id');
          db.categories = db.categories.filter((c) => c.id !== cid);
          app.saveDatabase('Categoria removida.');
          app.updateGlobalChrome();
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
        if (act === 'save-order-update') {
          const oid = btn.getAttribute('data-order-id');
          const ord = db.orders.find((o) => o.id === oid);
          const stSel = containerEl.querySelector(`#ord-status-${oid}`);
          const trInp = containerEl.querySelector(`#ord-track-${oid}`);
          if (ord && stSel) {
            ord.status = stSel.value;
            ord.statusLabel = stSel.options[stSel.selectedIndex].text;
            if (trInp) ord.shipping.trackingCode = trInp.value.trim();
            ord.notificationsLog = ord.notificationsLog || [];
            ord.notificationsLog.push({
              date: new Date().toISOString(),
              channel: 'Painel Administrativo',
              message: `Status atualizado para "${ord.statusLabel}"${ord.shipping.trackingCode ? ' | Rastreio: ' + ord.shipping.trackingCode : ''}`
            });
            app.saveDatabase(`Pedido ${ord.orderNumber} atualizado para ${ord.statusLabel}`);
            app.showToast(`Pedido ${ord.orderNumber} atualizado e notificação registrada para a cliente!`, 'success');
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
            app.showToast('Resposta enviada para a Área da Cliente!', 'success');
            renderAdminView(containerEl);
          }
        }
        if (act === 'toggle-reveal-customer') {
          const cid = btn.getAttribute('data-cust-id');
          AdminState.revealedCustomers[cid] = !AdminState.revealedCustomers[cid];
          if (AdminState.revealedCustomers[cid]) {
            app.saveDatabase(`Acesso auditado LGPD: dados pessoais da cliente ${cid} visualizados no painel.`);
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
      });
    });

    // Filtro de pedidos
    const ordFilter = containerEl.querySelector('#admin-order-filter');
    if (ordFilter) {
      ordFilter.addEventListener('change', (e) => {
        AdminState.orderFilterStatus = e.target.value;
        renderAdminView(containerEl);
      });
    }

    // Criar Categoria
    const addCatForm = containerEl.querySelector('#admin-add-category-form');
    if (addCatForm) {
      addCatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(addCatForm);
        const name = fd.get('name').trim();
        const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
        db.categories.push({
          id: 'cat-' + Date.now(),
          slug,
          name,
          imageUrl: fd.get('imageUrl') || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80',
          order: db.categories.length + 1
        });
        app.saveDatabase('Nova categoria criada: ' + name);
        app.updateGlobalChrome();
        app.showToast('Categoria criada com sucesso!', 'success');
        renderAdminView(containerEl);
      });
    }

    // Criar Cupom
    const addCouponForm = containerEl.querySelector('#admin-add-coupon-form');
    if (addCouponForm) {
      addCouponForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(addCouponForm);
        db.coupons.push({
          id: 'coup-' + Date.now(),
          code: String(fd.get('code') || '').trim().toUpperCase(),
          type: fd.get('type'),
          value: Number(fd.get('value')) || 10,
          minOrderAmount: Number(fd.get('minOrderAmount')) || 0,
          active: true
        });
        app.saveDatabase('Novo cupom criado: ' + fd.get('code'));
        app.showToast('Cupom criado!', 'success');
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
          db.storeSettings.heroBanner.isDemoImage = false;
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
          imageUrl: fd.get('imageUrl')
        };
        app.saveDatabase('Banner principal da Home atualizado.');
        app.showToast('Banner atualizado com sucesso!', 'success');
      });
    }

    // Salvar Configurações de Pagamento
    const payForm = containerEl.querySelector('#admin-payments-form');
    if (payForm) {
      payForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(payForm);
        db.paymentSettings.pix.enabled = fd.get('pixEnabled') === 'on';
        db.paymentSettings.pix.keyType = fd.get('pixKeyType');
        db.paymentSettings.pix.pixKey = fd.get('pixKey');
        db.paymentSettings.pix.recipientName = fd.get('pixRecipientName');
        db.paymentSettings.pix.recipientCity = fd.get('pixRecipientCity') || 'ITAPERUNA';
        db.paymentSettings.pix.txidPrefix = fd.get('pixTxidPrefix') || 'BYANGELY';
        db.paymentSettings.pix.instructions = fd.get('pixInstructions');

        db.paymentSettings.creditCard.enabled = fd.get('cardEnabled') === 'on';
        db.paymentSettings.creditCard.providerName = fd.get('cardProviderName');
        db.paymentSettings.creditCard.externalPaymentLink = fd.get('cardExternalLink');
        db.paymentSettings.creditCard.instructions = fd.get('cardInstructions');

        db.paymentSettings.payOnPickup.enabled = fd.get('pickupPayEnabled') === 'on';
        db.paymentSettings.payOnPickup.instructions = fd.get('pickupPayInstructions');

        app.saveDatabase('Configurações de pagamento (Pix, Cartão e Retirada) atualizadas.');
        app.showToast('Formas de pagamento salvas e atualizadas no checkout!', 'success');
        renderAdminView(containerEl);
      });
    }

    // Salvar Configurações de Entrega
    const shipForm = containerEl.querySelector('#admin-shipping-form');
    if (shipForm) {
      shipForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(shipForm);
        (db.shippingSettings.methods || []).forEach((m, idx) => {
          m.enabled = fd.get(`method_enabled_${idx}`) === 'on';
          m.priceStatus = fd.get(`method_status_${idx}`);
          m.price = Number(fd.get(`method_price_${idx}`)) || 0;
          m.estimatedDays = fd.get(`method_days_${idx}`);
        });
        app.saveDatabase('Configurações de entrega e frete atualizadas.');
        app.showToast('Modalidades de entrega salvas!', 'success');
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
        db.storeSettings.logoMode = fd.get('logoMode');
        db.storeSettings.legalName = fd.get('legalName');
        db.storeSettings.cnpj = fd.get('cnpj');
        db.storeSettings.addressLine = fd.get('addressLine');
        db.storeSettings.businessHours = fd.get('businessHours');
        db.storeSettings.whatsapp = fd.get('whatsapp');
        db.storeSettings.email = fd.get('email');
        db.storeSettings.instagramHandle = fd.get('instagramHandle');
        db.storeSettings.announcementBar = fd.get('announcementBar');

        app.saveDatabase('Dados oficiais da marca By Angély atualizados.');
        app.updateGlobalChrome();
        app.showToast('Dados da loja atualizados em todo o site!', 'success');
        renderAdminView(containerEl);
      });
    }

    // Salvar Políticas Legais
    const polForm = containerEl.querySelector('#admin-policies-form');
    if (polForm) {
      polForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(polForm);
        ['privacy', 'terms', 'shippingPolicy', 'returnsPolicy'].forEach((key) => {
          const pObj = db.policies[key];
          if (pObj) {
            pObj.needsOwnerConfirmation = fd.get(`confirmed_${key}`) !== 'on';
            (pObj.content || []).forEach((block, bIdx) => {
              const val = fd.get(`policy_${key}_${bIdx}`);
              if (val !== null) block.body = val;
            });
          }
        });
        app.saveDatabase('Políticas legais e condições comerciais atualizadas.');
        app.showToast('Políticas salvas com sucesso!', 'success');
        renderAdminView(containerEl);
      });
    }

    // Adicionar Nova Colaboradora Autorizada
    const userForm = containerEl.querySelector('#admin-add-user-form');
    if (userForm) {
      userForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(userForm);
        const role = fd.get('role');
        const perms =
          role === 'owner'
            ? ['products', 'categories', 'orders', 'customers', 'payments', 'shipping', 'branding', 'policies', 'users']
            : role === 'catalog_manager'
            ? ['products', 'categories', 'orders', 'customers']
            : ['orders', 'customers'];

        db.adminUsers.push({
          id: 'adm-' + Date.now(),
          name: fd.get('name'),
          email: fd.get('email'),
          customPassword: fd.get('password'),
          role,
          roleLabel:
            role === 'owner'
              ? 'Proprietária / Administradora Geral'
              : role === 'catalog_manager'
              ? 'Gerente de Catálogo e Pedidos'
              : 'Atendimento e Pedidos',
          permissions: perms,
          active: true
        });
        app.saveDatabase('Novo usuário autorizado cadastrado no painel: ' + fd.get('email'));
        app.showToast('Colaboradora autorizada com sucesso!', 'success');
        renderAdminView(containerEl);
      });
    }
  }

  window.ByAngelyAdmin = {
    renderAdminView
  };
})();
