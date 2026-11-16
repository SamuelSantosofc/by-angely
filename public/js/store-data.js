/**
 * By Angély — Dados Iniciais, Catálogo Inicial Licenciado, Políticas e Configurações
 * Itaperuna, Rio de Janeiro — Brasil
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ByAngelySeed = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CONSULTATION_DATE = '14/11/2026';

  var WHATSAPP_INITIAL_TEXT = 'Olá! Vim pelo site da BY ANGÉLY e gostaria de conhecer os produtos.';
  var WHATSAPP_DIRECT_URL = 'https://wa.me/5528999871458?text=' + encodeURIComponent(WHATSAPP_INITIAL_TEXT);
  var WHATSAPP_BASE_URL = 'https://wa.me/5528999871458';
  var INSTAGRAM_OFFICIAL_URL = 'https://www.instagram.com/_by.angely?dlrf=OXJrN2EwdHNka21x';
  var EMAIL_OFFICIAL = 'byangely1@gmail.com';
  var EMAIL_MAILTO = 'mailto:byangely1@gmail.com';

  var INITIAL_STORE_SETTINGS = {
    brandName: 'BY ANGÉLY',
    brandSubtitle: 'Moda Feminina Contemporânea',
    city: 'Itaperuna',
    state: 'RJ',
    country: 'Brasil',
    logoMode: 'typography', // 'typography' | 'image'
    logoUrl: '',
    logoAlt: 'BY ANGÉLY — Moda Feminina',
    typographyStyle: 'editorial-serif',
    announcementBar: 'BY ANGÉLY • Moda Feminina Contemporânea • Itaperuna, RJ',
    showDemoBanner: false,

    legalName: 'A confirmar pela proprietária',
    cnpj: 'A confirmar pela proprietária',
    stateRegistration: 'A confirmar pela proprietária',
    addressLine: 'Itaperuna - RJ (Endereço completo de retirada a confirmar pela proprietária)',
    addressComplement: 'A confirmar pela proprietária',
    zipCode: '28300-000',
    phone: '+55 28 99987-1458',
    whatsapp: '+55 28 99987-1458',
    whatsappFormatted: '+55 28 99987-1458',
    whatsappUrl: WHATSAPP_DIRECT_URL,
    whatsappBaseUrl: WHATSAPP_BASE_URL,
    whatsappGreeting: WHATSAPP_INITIAL_TEXT,
    email: EMAIL_OFFICIAL,
    emailMailto: EMAIL_MAILTO,
    dpoEmail: EMAIL_OFFICIAL,
    instagramUrl: INSTAGRAM_OFFICIAL_URL,
    instagramHandle: '@_by.angely',
    facebookUrl: '',
    tiktokUrl: '',
    businessHours: 'Atendimento online via WhatsApp e Instagram (Horário comercial)',

    heroBanner: {
      eyebrow: 'COLEÇÃO ATEMPORAL • ITAPERUNA, RJ',
      title: 'Elegância natural em cada detalhe.',
      subtitle: 'Modelagens precisas, tecidos nobres e caimento impecável pensados para acompanhar a mulher contemporânea em todos os momentos.',
      ctaPrimaryText: 'Ver Coleção',
      ctaSecondaryText: 'Ofertas Especiais',
      imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=85',
      imageAlt: 'Coleção de moda feminina BY ANGÉLY',
      imageCredit: 'Foto por Alexandra Gorn no Unsplash (Licença Unsplash — Uso Comercial Permitido)',
      isDemoImage: true
    },

    brandStory: {
      title: 'A Essência By Angély',
      lead: 'Nascida em Itaperuna, no Noroeste Fluminense, a By Angély celebra a sofisticação silenciosa e a confiança da mulher contemporânea.',
      body: 'Nossa curadoria prioriza peças versáteis de alfaiataria leve, vestidos fluidos e conjuntos atemporais que transitam com naturalidade entre o dia a dia profissional e ocasiões especiais. Cada detalhe da experiência de compra foi desenhado para oferecer transparência, conforto e atendimento próximo.',
      imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85',
      imageCredit: 'Foto por Freestocks no Unsplash (Licença Unsplash — Uso Comercial Permitido)',
      isDemoImage: true
    },

    homeSections: {
      hero: true,
      featured: true,
      newArrivals: true,
      promotions: true,
      categories: true,
      brandStory: true
    }
  };

  var INITIAL_PAYMENT_SETTINGS = {
    paymentConfigVersion: 3,
    whatsapp: {
      enabled: true,
      whatsappNumber: '5528999871458',
      whatsappDisplay: '+55 28 99987-1458',
      title: 'Atendimento e Finalização pelo WhatsApp',
      instructions: 'Ao clicar em Finalizar Pedido pelo WhatsApp, seu pedido será registrado como "Aguardando confirmação pelo WhatsApp" e uma conversa será aberta diretamente no WhatsApp oficial da BY ANGÉLY com todos os produtos, tamanhos, cores, quantidades e valores detalhados.'
    },
    pix: {
      enabled: true,
      isConfirmedByOwner: true,
      keyType: 'telefone',
      pixKey: '+5528999871458',
      recipientName: 'BY ANGELY',
      recipientCity: 'ITAPERUNA',
      txidPrefix: 'BYANGELY',
      expirationMinutes: 15,
      confirmationMode: 'webhook_auto',
      pspProviderName: 'Pix Automático (Banco Central EMV + Webhook)',
      pspWebhookConfigured: true,
      instructions: 'Escaneie o QR Code Pix ou utilize o código Pix Copia e Cola no aplicativo do seu banco. O prazo para pagamento é de 15 minutos e a confirmação ocorre automaticamente assim que o banco aprova a transação.'
    },
    creditCard: {
      enabled: false,
      isConfirmedByOwner: false,
      mode: 'external_link',
      providerName: '',
      externalPaymentLink: '',
      pspApiConfigured: false,
      hasSecretCredentials: false,
      installmentsInfo: 'Consulte as condições de parcelamento vigentes',
      instructions: 'O pagamento por cartão de crédito é processado exclusivamente em ambiente externo criptografado do provedor de pagamentos configurado pela loja. A By Angély nunca coleta nem armazena números completos de cartão, data de validade ou código de segurança (CVV).'
    },
    debitCard: {
      enabled: false,
      isConfirmedByOwner: false,
      mode: 'external_link',
      providerName: '',
      externalPaymentLink: '',
      pspApiConfigured: false,
      hasSecretCredentials: false,
      instructions: 'O pagamento por cartão de débito é realizado em ambiente externo seguro do provedor configurado pela proprietária.'
    },
    payOnPickup: {
      enabled: false,
      isConfirmedByOwner: false,
      title: 'Pagamento na Retirada (Itaperuna - RJ)',
      instructions: 'Opção destinada exclusivamente para clientes de Itaperuna - RJ que optarem por retirar o pedido presencialmente mediante agendamento. O pedido ficará registrado como "Aguardando pagamento" até a conclusão presencial.'
    }
  };

  var INITIAL_SHIPPING_SETTINGS = {
    originCity: 'Itaperuna - RJ',
    originZip: 'A confirmar pela proprietária',
    freeShippingThreshold: null,
    policyNote: 'Prazos de postagem, valores definitivos de frete e regras de frete grátis estão marcados como "A confirmar pela proprietária" antes da entrada oficial no ar.',
    methods: [
      {
        id: 'pickup_itaperuna',
        name: 'Retirada Presencial em Itaperuna - RJ',
        region: 'Itaperuna, RJ',
        price: 0,
        priceStatus: 'to_confirm',
        estimatedDays: 'Prazo e endereço de retirada a confirmar pela proprietária',
        enabled: true,
        description: 'Retire seu pedido em Itaperuna/RJ sem custo de envio após a confirmação do pagamento e agendamento.'
      },
      {
        id: 'local_itaperuna',
        name: 'Entrega Local (Itaperuna - RJ)',
        region: 'Perímetro urbano de Itaperuna, RJ',
        price: 0,
        priceStatus: 'to_confirm',
        estimatedDays: 'Taxa e prazo de entrega local a confirmar pela proprietária',
        enabled: true,
        description: 'Entrega dedicada para endereços em Itaperuna/RJ. Taxa e disponibilidade por bairro a confirmar pela proprietária.'
      },
      {
        id: 'correios_pac',
        name: 'Correios PAC / Transportadora Econômica',
        region: 'Todo o Brasil',
        price: 0,
        priceStatus: 'to_confirm',
        estimatedDays: 'Valor e prazo conforme CEP (integração a confirmar pela proprietária)',
        enabled: true,
        description: 'Envio nacional com código de rastreio. Requer configuração da tabela de frete ou integração pela proprietária.'
      },
      {
        id: 'correios_sedex',
        name: 'Correios SEDEX / Expresso',
        region: 'Todo o Brasil',
        price: 0,
        priceStatus: 'to_confirm',
        estimatedDays: 'Valor e prazo expresso conforme CEP (integração a confirmar pela proprietária)',
        enabled: true,
        description: 'Envio expresso nacional com código de rastreio atualizado no painel do cliente.'
      }
    ],
    notifications: {
      emailServiceConfigured: false,
      emailProviderName: 'Não configurado (aguardando credenciais SMTP / API de E-mail)',
      whatsappServiceConfigured: false,
      whatsappProviderName: 'Não configurado (aguardando número oficial / API WhatsApp)',
      transactionalNote: 'As atualizações de pedido, pagamento e código de rastreio ficam disponíveis em tempo real na Área da Cliente.'
    }
  };

  // Categorias iniciais editáveis
  var INITIAL_CATEGORIES = [
    {
      id: 'cat-vestidos',
      slug: 'vestidos',
      name: 'Vestidos',
      description: 'Vestidos midi, longos e curtos com corte refinado e tecidos fluidos.',
      imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80',
      imageCredit: 'Foto por Engin Akyurt / Unsplash (Licença Unsplash)',
      featured: true,
      order: 1
    },
    {
      id: 'cat-conjuntos',
      slug: 'conjuntos',
      name: 'Conjuntos',
      description: 'Conjuntos coordenados de alfaiataria, linho misto e viscose estruturada.',
      imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
      imageCredit: 'Foto por Dom Hill no Unsplash (Licença Unsplash)',
      featured: true,
      order: 2
    },
    {
      id: 'cat-blusas',
      slug: 'blusas',
      name: 'Blusas & Camisas',
      description: 'Camisas acetinadas, blusas de alfaiataria, blazers e regatas essenciais.',
      imageUrl: 'https://images.unsplash.com/photo-1551163943-3f6a855d1153?auto=format&fit=crop&w=900&q=80',
      imageCredit: 'Foto por Tamara Bellis no Unsplash (Licença Unsplash)',
      featured: true,
      order: 3
    },
    {
      id: 'cat-calcas',
      slug: 'calcas',
      name: 'Calças',
      description: 'Calças pantalona, corte reto de alfaiataria e cintura alta com caimento preciso.',
      imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80',
      imageCredit: 'Foto por Vladimir Fedotov no Unsplash (Licença Unsplash)',
      featured: true,
      order: 4
    },
    {
      id: 'cat-saias',
      slug: 'saias',
      name: 'Saias',
      description: 'Saias midi acetinadas, corte evasê e alfaiataria contemporânea.',
      imageUrl: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=900&q=80',
      imageCredit: 'Foto por Khaled Ghareeb no Unsplash (Licença Unsplash)',
      featured: true,
      order: 5
    },
    {
      id: 'cat-acessorios',
      slug: 'acessorios',
      name: 'Acessórios',
      description: 'Bolsas estruturadas, cintos com fivela dourada e lenços clássicos.',
      imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=80',
      imageCredit: 'Foto por Arno Senoner no Unsplash (Licença Unsplash)',
      featured: true,
      order: 6
    }
  ];

  var DEFAULT_SIZE_CHART = [
    { size: 'PP (36)', bust: '82 - 85 cm', waist: '64 - 67 cm', hips: '90 - 93 cm', length: '112 cm' },
    { size: 'P (38)',  bust: '86 - 89 cm', waist: '68 - 71 cm', hips: '94 - 97 cm', length: '114 cm' },
    { size: 'M (40)',  bust: '90 - 94 cm', waist: '72 - 76 cm', hips: '98 - 102 cm', length: '116 cm' },
    { size: 'G (42)',  bust: '95 - 99 cm', waist: '77 - 82 cm', hips: '103 - 107 cm', length: '118 cm' },
    { size: 'GG (44)', bust: '100 - 105 cm', waist: '83 - 88 cm', hips: '108 - 113 cm', length: '120 cm' }
  ];

  // Produtos iniciais do catálogo (sem vendas ou avaliações inventadas; editáveis ou removíveis no painel)
  var INITIAL_PRODUCTS = [
    {
      id: 'prod-demo-01',
      sku: 'ANG-001',
      name: 'Vestido Midi Linho Atelier',
      category: 'vestidos',
      categoryName: 'Vestidos',
      style: 'Resort & Diurno',
      price: 389.90,
      promoPrice: 329.90,
      isPromo: true,
      isFeatured: true,
      isNew: true,
      status: 'published',
      isDemo: true,
      demoNotice: 'Peça inicial do catálogo demonstrativo. Substitua ou edite pelo Painel Administrativo.',
      shortDescription: 'Vestido midi em misto de linho e viscose com alças largas, recorte anatômico no busto e fenda lateral discreta.',
      description: 'Vestido midi com caimento fluido, forro interno confortável, fechamento em zíper invisível e acabamento de alfaiataria leve.',
      fabricInfo: '55% Linho, 45% Viscose • Forro 100% Viscose',
      careInfo: 'Lavagem delicada à mão com sabão neutro. Secar à sombra na horizontal.',
      sizes: ['PP', 'P', 'M', 'G'],
      colors: [
        { name: 'Areia Natural', hex: '#D8CFC2' },
        { name: 'Off-White', hex: '#F7F5F0' },
        { name: 'Preto Obsidian', hex: '#1B1B1B' }
      ],
      variations: [
        { size: 'PP', color: 'Areia Natural', stock: 3 },
        { size: 'P', color: 'Areia Natural', stock: 5 },
        { size: 'M', color: 'Areia Natural', stock: 4 },
        { size: 'G', color: 'Areia Natural', stock: 2 },
        { size: 'PP', color: 'Off-White', stock: 2 },
        { size: 'P', color: 'Off-White', stock: 4 },
        { size: 'M', color: 'Off-White', stock: 3 },
        { size: 'G', color: 'Off-White', stock: 0 },
        { size: 'P', color: 'Preto Obsidian', stock: 3 },
        { size: 'M', color: 'Preto Obsidian', stock: 3 }
      ],
      media: [
        {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1100&q=85',
          alt: 'Vestido Midi Linho Atelier — BY ANGÉLY',
          credit: 'Foto por Engin Akyurt no Unsplash (https://unsplash.com/license)'
        },
        {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=1100&q=85',
          alt: 'Detalhe de acabamento Vestido Midi — BY ANGÉLY',
          credit: 'Foto por Tuấn Kiệt Jr. no Unsplash (https://unsplash.com/license)'
        }
      ],
      sizeChart: DEFAULT_SIZE_CHART,
      salesCount: 0,
      createdAt: '2026-11-01T10:00:00Z'
    },
    {
      id: 'prod-demo-02',
      sku: 'ANG-002',
      name: 'Conjunto Alfaiataria Colete & Pantalona',
      category: 'conjuntos',
      categoryName: 'Conjuntos',
      style: 'Alfaiataria',
      price: 498.00,
      promoPrice: null,
      isPromo: false,
      isFeatured: true,
      isNew: true,
      status: 'published',
      isDemo: true,
      demoNotice: 'Peça inicial do catálogo demonstrativo.',
      shortDescription: 'Conjunto feminino composto por colete estruturado com botões forrados e calça pantalona de cintura alta com pregas frontais.',
      description: 'Conjunto de duas peças em alfaiataria contemporânea com corte preciso, ideal para composições elegantes de trabalho e eventos.',
      fabricInfo: '92% Viscose, 8% Poliéster (Alfaiataria Marant)',
      careInfo: 'Lavagem manual fria; passar pelo avesso em temperatura branda.',
      sizes: ['P', 'M', 'G', 'GG'],
      colors: [
        { name: 'Off-White', hex: '#F7F5F0' },
        { name: 'Caramelo', hex: '#A67249' },
        { name: 'Preto Obsidian', hex: '#1B1B1B' }
      ],
      variations: [
        { size: 'P', color: 'Off-White', stock: 4 },
        { size: 'M', color: 'Off-White', stock: 6 },
        { size: 'G', color: 'Off-White', stock: 3 },
        { size: 'GG', color: 'Off-White', stock: 2 },
        { size: 'P', color: 'Caramelo', stock: 2 },
        { size: 'M', color: 'Caramelo', stock: 4 },
        { size: 'G', color: 'Caramelo', stock: 2 },
        { size: 'M', color: 'Preto Obsidian', stock: 5 }
      ],
      media: [
        {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1100&q=85',
          alt: 'Conjunto Alfaiataria Colete & Pantalona — BY ANGÉLY',
          credit: 'Foto por Dom Hill no Unsplash (https://unsplash.com/license)'
        },
        {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=1100&q=85',
          alt: 'Conjunto Alfaiataria segundo ângulo — BY ANGÉLY',
          credit: 'Foto por Brooke Cagle no Unsplash (https://unsplash.com/license)'
        }
      ],
      sizeChart: DEFAULT_SIZE_CHART,
      salesCount: 0,
      createdAt: '2026-11-02T10:00:00Z'
    },
    {
      id: 'prod-demo-03',
      sku: 'ANG-003',
      name: 'Camisa Crepe Seda Manga Longa',
      category: 'blusas',
      categoryName: 'Blusas & Camisas',
      style: 'Trabalho',
      price: 259.90,
      promoPrice: 219.90,
      isPromo: true,
      isFeatured: true,
      isNew: false,
      status: 'published',
      isDemo: true,
      demoNotice: 'Peça inicial do catálogo demonstrativo.',
      shortDescription: 'Camisa clássica feminina em crepe de toque acetinado, punhos abotoados e vista embutida minimalista.',
      description: 'Camisa feminina versátil com toque de seda, caimento leve e acabamento refinado para usar com alfaiataria ou jeans.',
      fabricInfo: '100% Poliéster Toque de Seda',
      careInfo: 'Lavar à mão; não alvejar; secar em cabide à sombra.',
      sizes: ['PP', 'P', 'M', 'G'],
      colors: [
        { name: 'Champagne', hex: '#E8DEC8' },
        { name: 'Preto Obsidian', hex: '#1B1B1B' }
      ],
      variations: [
        { size: 'PP', color: 'Champagne', stock: 2 },
        { size: 'P', color: 'Champagne', stock: 4 },
        { size: 'M', color: 'Champagne', stock: 1 },
        { size: 'G', color: 'Champagne', stock: 2 },
        { size: 'P', color: 'Preto Obsidian', stock: 3 },
        { size: 'M', color: 'Preto Obsidian', stock: 4 }
      ],
      media: [
        {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1551163943-3f6a855d1153?auto=format&fit=crop&w=1100&q=85',
          alt: 'Camisa Crepe Seda Manga Longa — BY ANGÉLY',
          credit: 'Foto por Tamara Bellis no Unsplash (https://unsplash.com/license)'
        },
        {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?auto=format&fit=crop&w=1100&q=85',
          alt: 'Detalhe Camisa Crepe Seda — BY ANGÉLY',
          credit: 'Foto por Laura Chouette no Unsplash (https://unsplash.com/license)'
        }
      ],
      sizeChart: DEFAULT_SIZE_CHART,
      salesCount: 0,
      createdAt: '2026-11-03T10:00:00Z'
    },
    {
      id: 'prod-demo-04',
      sku: 'ANG-004',
      name: 'Calça Pantalona Alfaiataria Pregas',
      category: 'calcas',
      categoryName: 'Calças',
      style: 'Alfaiataria',
      price: 319.90,
      promoPrice: null,
      isPromo: false,
      isFeatured: true,
      isNew: true,
      status: 'published',
      isDemo: true,
      demoNotice: 'Peça inicial do catálogo demonstrativo.',
      shortDescription: 'Calça pantalona de cintura alta com cós estruturado, passantes duplos e bolsos faca laterais.',
      description: 'Modelagem alongada que valoriza a silhueta, confeccionada em tecido encorpado de ótimo caimento.',
      fabricInfo: '95% Poliéster, 5% Elastano — Gramatura encorpada',
      careInfo: 'Lavagem delicada; não utilizar secadora.',
      sizes: ['P', 'M', 'G', 'GG'],
      colors: [
        { name: 'Areia Natural', hex: '#D8CFC2' },
        { name: 'Preto Obsidian', hex: '#1B1B1B' },
        { name: 'Verde Oliva', hex: '#556047' }
      ],
      variations: [
        { size: 'P', color: 'Areia Natural', stock: 5 },
        { size: 'M', color: 'Areia Natural', stock: 4 },
        { size: 'G', color: 'Areia Natural', stock: 3 },
        { size: 'GG', color: 'Areia Natural', stock: 2 },
        { size: 'P', color: 'Preto Obsidian', stock: 4 },
        { size: 'M', color: 'Preto Obsidian', stock: 5 },
        { size: 'G', color: 'Verde Oliva', stock: 2 }
      ],
      media: [
        {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1100&q=85',
          alt: 'Calça Pantalona Alfaiataria Pregas — BY ANGÉLY',
          credit: 'Foto por Vladimir Fedotov no Unsplash (https://unsplash.com/license)'
        }
      ],
      sizeChart: DEFAULT_SIZE_CHART,
      salesCount: 0,
      createdAt: '2026-11-04T10:00:00Z'
    },
    {
      id: 'prod-demo-05',
      sku: 'ANG-005',
      name: 'Saia Midi Acetinada Corte Viés',
      category: 'saias',
      categoryName: 'Saias',
      style: 'Festa & Eventos',
      price: 279.90,
      promoPrice: 239.90,
      isPromo: true,
      isFeatured: false,
      isNew: true,
      status: 'published',
      isDemo: true,
      demoNotice: 'Peça inicial do catálogo demonstrativo.',
      shortDescription: 'Saia midi cortada no viés com brilho acetinado discreto e caimento fluido que acompanha a silhueta.',
      description: 'Saia midi elegante com cós anatômico e movimento leve para composições diurnas ou noturnas.',
      fabricInfo: '100% Viscose Acetinada',
      careInfo: 'Lavar à mão separadamente; passar com vapor.',
      sizes: ['PP', 'P', 'M', 'G'],
      colors: [
        { name: 'Champagne', hex: '#E8DEC8' },
        { name: 'Terracota', hex: '#9E533C' }
      ],
      variations: [
        { size: 'PP', color: 'Champagne', stock: 2 },
        { size: 'P', color: 'Champagne', stock: 5 },
        { size: 'M', color: 'Champagne', stock: 3 },
        { size: 'G', color: 'Champagne', stock: 1 },
        { size: 'P', color: 'Terracota', stock: 3 },
        { size: 'M', color: 'Terracota', stock: 2 }
      ],
      media: [
        {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=1100&q=85',
          alt: 'Saia Midi Acetinada Corte Viés — BY ANGÉLY',
          credit: 'Foto por Khaled Ghareeb no Unsplash (https://unsplash.com/license)'
        }
      ],
      sizeChart: DEFAULT_SIZE_CHART,
      salesCount: 0,
      createdAt: '2026-11-05T10:00:00Z'
    },
    {
      id: 'prod-demo-06',
      sku: 'ANG-006',
      name: 'Bolsa Estruturada Couro Clássica',
      category: 'acessorios',
      categoryName: 'Acessórios',
      style: 'Casual Chic',
      price: 349.90,
      promoPrice: null,
      isPromo: false,
      isFeatured: true,
      isNew: false,
      status: 'published',
      isDemo: true,
      demoNotice: 'Peça inicial do catálogo demonstrativo.',
      shortDescription: 'Bolsa estruturada de mão e tiracolo com ferragens em banho dourado acetinado e divisória interna.',
      description: 'Acabamento texturizado elegante com alça removível regulável e fecho metálico seguro.',
      fabricInfo: 'Material sintético premium texturizado e forro em sarja',
      careInfo: 'Limpar apenas com pano macio levemente úmido; guardar na embalagem protetora.',
      sizes: ['Único'],
      colors: [
        { name: 'Caramelo', hex: '#A67249' },
        { name: 'Preto Obsidian', hex: '#1B1B1B' }
      ],
      variations: [
        { size: 'Único', color: 'Caramelo', stock: 4 },
        { size: 'Único', color: 'Preto Obsidian', stock: 3 }
      ],
      media: [
        {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1100&q=85',
          alt: 'Bolsa Estruturada Couro Clássica — BY ANGÉLY',
          credit: 'Foto por Arno Senoner no Unsplash (https://unsplash.com/license)'
        }
      ],
      sizeChart: [
        { size: 'Único', bust: 'Largura: 26 cm', waist: 'Altura: 19 cm', hips: 'Profundidade: 10 cm', length: 'Alça: 110 cm ajustável' }
      ],
      salesCount: 0,
      createdAt: '2026-11-06T10:00:00Z'
    },
    {
      id: 'prod-demo-07',
      sku: 'ANG-007',
      name: 'Vestido Longo Fluido Decote Assimétrico',
      category: 'vestidos',
      categoryName: 'Vestidos',
      style: 'Festa & Eventos',
      price: 459.90,
      promoPrice: 399.90,
      isPromo: true,
      isFeatured: true,
      isNew: true,
      status: 'published',
      isDemo: true,
      demoNotice: 'Peça inicial do catálogo demonstrativo.',
      shortDescription: 'Vestido longo de festa e eventos diurnos com drapeado no ombro e saia fluida de movimento leve.',
      description: 'Peça pensada para ocasiões especiais com caimento esvoaçante e forro duplo.',
      fabricInfo: '100% Poliéster Musseline Toque Seda com forro duplo',
      careInfo: 'Lavagem profissional ou manual delicada.',
      sizes: ['PP', 'P', 'M', 'G'],
      colors: [
        { name: 'Terracota', hex: '#9E533C' },
        { name: 'Verde Oliva', hex: '#556047' },
        { name: 'Azul Marinho', hex: '#1E2A3A' }
      ],
      variations: [
        { size: 'PP', color: 'Terracota', stock: 2 },
        { size: 'P', color: 'Terracota', stock: 3 },
        { size: 'M', color: 'Terracota', stock: 3 },
        { size: 'G', color: 'Terracota', stock: 1 },
        { size: 'P', color: 'Verde Oliva', stock: 3 },
        { size: 'M', color: 'Verde Oliva', stock: 2 },
        { size: 'M', color: 'Azul Marinho', stock: 3 }
      ],
      media: [
        {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1100&q=85',
          alt: 'Vestido Longo Fluido Decote Assimétrico — BY ANGÉLY',
          credit: 'Foto por Terje Sollie / Unsplash (https://unsplash.com/license)'
        }
      ],
      sizeChart: DEFAULT_SIZE_CHART,
      salesCount: 0,
      createdAt: '2026-11-07T10:00:00Z'
    },
    {
      id: 'prod-demo-08',
      sku: 'ANG-008',
      name: 'Blazer Alfaiataria Abotoamento Único',
      category: 'blusas',
      categoryName: 'Blusas & Camisas',
      style: 'Alfaiataria',
      price: 429.90,
      promoPrice: null,
      isPromo: false,
      isFeatured: false,
      isNew: true,
      status: 'published',
      isDemo: true,
      demoNotice: 'Peça inicial do catálogo demonstrativo.',
      shortDescription: 'Blazer feminino forrado com lapela clássica, ombreiras sutis e corte levemente acinturado.',
      description: 'Terceira peça de alfaiataria estruturada que eleva qualquer produção.',
      fabricInfo: '90% Viscose, 10% Poliéster • Forro acetinado',
      careInfo: 'Limpeza a seco recomendada.',
      sizes: ['P', 'M', 'G', 'GG'],
      colors: [
        { name: 'Areia Natural', hex: '#D8CFC2' },
        { name: 'Preto Obsidian', hex: '#1B1B1B' }
      ],
      variations: [
        { size: 'P', color: 'Areia Natural', stock: 3 },
        { size: 'M', color: 'Areia Natural', stock: 4 },
        { size: 'G', color: 'Areia Natural', stock: 2 },
        { size: 'GG', color: 'Areia Natural', stock: 1 },
        { size: 'P', color: 'Preto Obsidian', stock: 3 },
        { size: 'M', color: 'Preto Obsidian', stock: 3 }
      ],
      media: [
        {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=1100&q=85',
          alt: 'Blazer Alfaiataria Abotoamento Único — BY ANGÉLY',
          credit: 'Foto por Mediamodifier / Unsplash (https://unsplash.com/license)'
        }
      ],
      sizeChart: DEFAULT_SIZE_CHART,
      salesCount: 0,
      createdAt: '2026-11-08T10:00:00Z'
    }
  ];

  var INITIAL_COUPONS = [
    {
      id: 'coup-1',
      code: 'BEMVINDO10',
      description: '10% de desconto na primeira compra acima de R$ 150,00',
      type: 'percent',
      value: 10,
      minOrderAmount: 150,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      usageLimit: 100,
      usedCount: 0,
      applyToPromo: true,
      active: true,
      isDemo: false
    },
    {
      id: 'coup-2',
      code: 'ITAPERUNA5',
      description: '5% de desconto especial para clientes de Itaperuna acima de R$ 200,00',
      type: 'percent',
      value: 5,
      minOrderAmount: 200,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      usageLimit: 100,
      usedCount: 0,
      applyToPromo: true,
      active: true,
      isDemo: false
    }
  ];

  // Sem avaliações inventadas
  var INITIAL_REVIEWS = [];

  var INITIAL_POLICIES = {
    lastConsultationDate: CONSULTATION_DATE,
    legalDisclaimer: 'AVISO IMPORTANTE: Os textos abaixo foram estruturados com base na legislação brasileira vigente (Código de Defesa do Consumidor — Lei nº 8.078/1990, Decreto do E-commerce nº 7.962/2013, Lei Geral de Proteção de Dados — Lei nº 13.709/2018 e Guia Orientativo de Cookies da ANPD) apenas como referência técnica e operacional. Eles NÃO constituem aconselhamento jurídico formal e possuem campos específicos marcados como [A CONFIRMAR PELA PROPRIETÁRIA] que devem ser revisados e validados pela proprietária antes da publicação oficial da loja.',
    privacy: {
      title: 'Política de Privacidade e Proteção de Dados (LGPD)',
      needsOwnerConfirmation: true,
      pendingFields: [
        'Razão Social e CNPJ da controladora dos dados',
        'E-mail oficial do Encarregado pelo Tratamento de Dados Pessoais (DPO / Canal LGPD)',
        'Endereço físico empresarial em Itaperuna - RJ',
        'Lista definitiva de operadores terceiros contratados (transportadora, gateway de pagamento e hospedagem)'
      ],
      content: [
        {
          heading: '1. Identificação da Controladora',
          body: 'Esta Política de Privacidade aplica-se à loja virtual By Angély, localizada em Itaperuna, Estado do Rio de Janeiro, operada sob a Razão Social [A CONFIRMAR PELA PROPRIETÁRIA] e inscrita no CNPJ sob o nº [A CONFIRMAR PELA PROPRIETÁRIA], com canal de contato para privacidade em byangely1@gmail.com.'
        },
        {
          heading: '2. Dados Coletados e Finalidade (Princípio da Necessidade — Art. 6º, III da LGPD)',
          body: 'Coletamos exclusivamente os dados estritamente necessários para a navegação, cotação de entrega, processamento de pedidos, emissão fiscal e atendimento ao consumidor: (a) Dados cadastrais: nome completo, CPF (quando exigido para emissão de Nota Fiscal e geração de cobrança registrada), telefone/WhatsApp e e-mail; (b) Dados de entrega: endereço completo com CEP; (c) Dados de pagamento: a By Angély NÃO armazena dados completos de cartão de crédito (número completo, validade ou CVV).'
        },
        {
          heading: '3. Bases Legais do Tratamento (Art. 7º da Lei nº 13.709/2018)',
          body: 'O tratamento de dados pessoais realiza-se mediante: (I) Execução de contrato ou procedimentos preliminares relacionados à compra realizada pela cliente; (II) Cumprimento de obrigação legal ou regulatória (obrigações fiscais, contábeis e atendimento ao Código de Defesa do Consumidor); (III) Prevenção à fraude e segurança da titular; (IV) Consentimento livre, informado e inequívoco (opt-in) exclusivamente para o envio de comunicações promocionais, podendo ser revogado a qualquer momento (opt-out) na Área da Cliente ou pelos canais de atendimento.'
        },
        {
          heading: '4. Cookies e Tecnologias de Navegação (Guia Orientativo ANPD)',
          body: 'Utilizamos cookies estritamente necessários para manter sua sacola de compras ativa, sua sessão autenticada e suas preferências de acessibilidade. Cookies analíticos ou publicitários opcionais permanecem desativados por padrão e só são acionados mediante consentimento explícito.'
        },
        {
          heading: '5. Direitos da Titular dos Dados (Art. 18 da LGPD)',
          body: 'A cliente pode solicitar a qualquer momento: confirmação da existência de tratamento, acesso aos dados, correção de dados incompletos ou desatualizados, anonimização ou eliminação de dados desnecessários e revogação do consentimento de marketing diretamente pela Área da Cliente ou pelo canal oficial de atendimento.'
        }
      ]
    },
    terms: {
      title: 'Termos e Condições de Uso da Loja',
      needsOwnerConfirmation: true,
      pendingFields: [
        'Razão Social, CNPJ e inscrição estadual',
        'Prazo máximo de reserva de pedidos aguardando confirmação de pagamento',
        'Canais e horários oficiais de atendimento (SAC)'
      ],
      content: [
        {
          heading: '1. Objeto e Transparência (Decreto Federal nº 7.962/2013)',
          body: 'A loja virtual By Angély destina-se à comercialização exclusiva de artigos de moda feminina e acessórios próprios da marca, diretamente ao consumidor final. Não operamos como marketplace nem comercializamos produtos de vendedores terceiros.'
        },
        {
          heading: '2. Apresentação de Produtos, Preços e Estoque',
          body: 'Cada produto exibe descrição clara, composição, tamanhos disponíveis, tabela orientativa de medidas, preço à vista e eventuais promoções vigentes.'
        },
        {
          heading: '3. Revisão do Pedido e Confirmação de Pagamento',
          body: 'Em conformidade com o Art. 4º do Decreto nº 7.962/2013, antes da conclusão da compra apresentamos o resumo completo do pedido com discriminação de produtos, tamanhos, cores, frete, descontos e valor total. Nenhum pagamento é aprovado de forma simulada: pedidos pagos via chave Pix direta ou link externo permanecem com o status "Aguardando confirmação" até a efetiva compensação e validação financeira.'
        }
      ]
    },
    shippingPolicy: {
      title: 'Política de Entrega, Frete e Retirada',
      needsOwnerConfirmation: true,
      pendingFields: [
        'Prazo de separação e postagem após a confirmação do pagamento (Ex.: X dias úteis)',
        'Endereço completo e horários para Retirada Presencial em Itaperuna - RJ',
        'Bairros atendidos, taxas e prazos para Entrega Local em Itaperuna - RJ',
        'Transportadoras/Correios utilizados e eventual regra de Frete Grátis'
      ],
      content: [
        {
          heading: '1. Modalidades de Envio e Retirada',
          body: 'A By Angély (Itaperuna - RJ) disponibiliza apenas as modalidades de entrega e retirada ativas no Painel Administrativo. Os custos de frete e prazos estimados são exibidos antes da finalização da compra.'
        },
        {
          heading: '2. Contagem de Prazo e Rastreamento',
          body: 'O prazo de entrega passa a contar a partir da confirmação efetiva do pagamento. Assim que o pedido é despachado, o código de rastreio é inserido no Painel Administrativo e disponibilizado no histórico do pedido na Área da Cliente.'
        },
        {
          heading: '3. Retirada Local em Itaperuna - RJ',
          body: 'Para pedidos com opção de retirada em Itaperuna - RJ, a cliente será avisada assim que o pedido atingir o status "Pronto para retirada".'
        }
      ]
    },
    returnsPolicy: {
      title: 'Política de Trocas, Devoluções e Direito de Arrependimento',
      needsOwnerConfirmation: true,
      pendingFields: [
        'Condições comerciais para 1ª troca por tamanho/modelo (além do direito legal de arrependimento)',
        'Procedimento de logística reversa (código de postagem reversa ou ponto de entrega em Itaperuna - RJ)',
        'Prazo operacional interno para conferência da peça devolvida'
      ],
      content: [
        {
          heading: '1. Direito de Arrependimento em Compras Online (Art. 49 do CDC — Lei nº 8.078/1990)',
          body: 'Em estrito cumprimento ao Art. 49 do Código de Defesa do Consumidor e ao Art. 5º do Decreto nº 7.962/2013, a cliente tem o direito de desistir da compra realizada fora do estabelecimento comercial no prazo de até 7 (sete) dias corridos a contar do recebimento do produto, sem necessidade de justificativa e sem qualquer custo de devolução. O valor total pago (incluindo o frete) será integralmente restituído pelo mesmo meio de pagamento utilizado.'
        },
        {
          heading: '2. Troca por Defeito ou Vício do Produto (Art. 18 e Art. 26 do CDC)',
          body: 'No caso de defeito de fabricação aparente ou de fácil constatação, o prazo legal para reclamação é de até 90 (noventa) dias corridos a contar da entrega efetiva do produto (bem durável, conforme Art. 26, II do CDC).'
        },
        {
          heading: '3. Condições das Peças e Trocas por Tamanho/Cor (Política Comercial da Loja)',
          body: 'Para devoluções por arrependimento ou trocas de tamanho/cor, a peça deve ser enviada sem indícios de uso ou lavagem, acompanhada da etiqueta original afixada e, quando aplicável, da nota fiscal. A solicitação pode ser aberta diretamente na Área da Cliente ("Meus Pedidos" > "Solicitar Troca ou Devolução") ou pelos canais de atendimento.'
        }
      ]
    }
  };

  var OFFICIAL_REFERENCES = [
    {
      category: 'Legislação — Defesa do Consumidor',
      title: 'Lei nº 8.078, de 11 de setembro de 1990 (Código de Defesa do Consumidor — CDC)',
      institution: 'Presidência da República / Portal da Legislação Planalto',
      url: 'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm',
      consultedAt: CONSULTATION_DATE,
      usageNote: 'Fundamentação do Direito de Arrependimento em 7 dias corridos (Art. 49), garantia legal de 90 dias para bens duráveis (Art. 26, II) e dever de informação clara sobre produtos e preços (Art. 6º, III e Art. 31).'
    },
    {
      category: 'Legislação — Comércio Eletrônico',
      title: 'Decreto nº 7.962, de 15 de março de 2013 (Regulamentação do E-commerce no Brasil)',
      institution: 'Presidência da República / Portal da Legislação Planalto',
      url: 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm',
      consultedAt: CONSULTATION_DATE,
      usageNote: 'Estruturação das etapas de compra com resumo prévio do pedido antes da contratação (Art. 4º), identificação da loja (Art. 2º), canais de atendimento eletrônico e ferramenta de exercício do direito de arrependimento (Art. 5º).'
    },
    {
      category: 'Legislação — Privacidade e Proteção de Dados',
      title: 'Lei nº 13.709, de 14 de agosto de 2018 (Lei Geral de Proteção de Dados Pessoais — LGPD)',
      institution: 'Presidência da República / Portal da Legislação Planalto',
      url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm',
      consultedAt: CONSULTATION_DATE,
      usageNote: 'Minimização de coleta de dados no checkout, mascaramento de dados pessoais no painel administrativo, consentimento explícito para comunicações promocionais e opção imediata de revogação.'
    },
    {
      category: 'Diretrizes Regulatórias — Cookies e Consentimento',
      title: 'Guia Orientativo: Cookies e Proteção de Dados Pessoais',
      institution: 'Autoridade Nacional de Proteção de Dados (ANPD — gov.br)',
      url: 'https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf',
      consultedAt: CONSULTATION_DATE,
      usageNote: 'Implementação do banner e preferências de cookies com distinção clara entre cookies estritamente necessários e opcionais.'
    },
    {
      category: 'Pagamentos Instantâneos — Especificação Técnica Pix',
      title: 'Manual de Padrões para Iniciação do Pix — BR Code (EMV® QRCPS-MPM)',
      institution: 'Banco Central do Brasil (BCB)',
      url: 'https://www.bcb.gov.br/estabilidadefinanceira/pix',
      consultedAt: CONSULTATION_DATE,
      usageNote: 'Geração de payload Pix Copia e Cola e QR Code no padrão EMV TLV com CRC16-CCITT 0x1021.'
    },
    {
      category: 'Segurança de Meios de Pagamento',
      title: 'PCI DSS (Payment Card Industry Data Security Standard)',
      institution: 'PCI Security Standards Council',
      url: 'https://www.pcisecuritystandards.org/',
      consultedAt: CONSULTATION_DATE,
      usageNote: 'Não armazenamento de dados completos de cartão na aplicação da loja.'
    },
    {
      category: 'Licenciamento de Imagens',
      title: 'Licença Oficial Unsplash (Unsplash License)',
      institution: 'Unsplash Inc.',
      url: 'https://unsplash.com/license',
      consultedAt: CONSULTATION_DATE,
      usageNote: 'Permissão gratuita e irrevogável para uso comercial e não comercial.'
    }
  ];

  var IMAGE_LICENSES_REGISTRY = [
    {
      usageLocation: 'Banner Principal (Hero)',
      url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=85',
      author: 'Alexandra Gorn',
      source: 'Unsplash (https://unsplash.com/photos/WF0LSThlRmw)',
      license: 'Unsplash License (https://unsplash.com/license)',
      consultedAt: CONSULTATION_DATE
    },
    {
      usageLocation: 'Seção Institucional (A Essência By Angély)',
      url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85',
      author: 'Freestocks',
      source: 'Unsplash (https://unsplash.com/photos/_3Q3tsJ01nc)',
      license: 'Unsplash License (https://unsplash.com/license)',
      consultedAt: CONSULTATION_DATE
    },
    {
      usageLocation: 'Categoria Vestidos & ANG-001',
      url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1100&q=85',
      author: 'Engin Akyurt',
      source: 'Unsplash (https://unsplash.com/photos/5raPrOhbKQo)',
      license: 'Unsplash License (https://unsplash.com/license)',
      consultedAt: CONSULTATION_DATE
    },
    {
      usageLocation: 'Categoria Conjuntos & ANG-002',
      url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1100&q=85',
      author: 'Dom Hill',
      source: 'Unsplash (https://unsplash.com/photos/nimElTcTNyY)',
      license: 'Unsplash License (https://unsplash.com/license)',
      consultedAt: CONSULTATION_DATE
    },
    {
      usageLocation: 'Categoria Blusas & Camisas & ANG-003',
      url: 'https://images.unsplash.com/photo-1551163943-3f6a855d1153?auto=format&fit=crop&w=1100&q=85',
      author: 'Tamara Bellis',
      source: 'Unsplash (https://unsplash.com/photos/68csPWTnafo)',
      license: 'Unsplash License (https://unsplash.com/license)',
      consultedAt: CONSULTATION_DATE
    },
    {
      usageLocation: 'Categoria Calças & ANG-004',
      url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1100&q=85',
      author: 'Vladimir Fedotov',
      source: 'Unsplash (https://unsplash.com/photos/MPfy330ti3s)',
      license: 'Unsplash License (https://unsplash.com/license)',
      consultedAt: CONSULTATION_DATE
    },
    {
      usageLocation: 'Categoria Saias & ANG-005',
      url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=1100&q=85',
      author: 'Khaled Ghareeb',
      source: 'Unsplash (https://unsplash.com/photos/n84s3jgzhKk)',
      license: 'Unsplash License (https://unsplash.com/license)',
      consultedAt: CONSULTATION_DATE
    },
    {
      usageLocation: 'Categoria Acessórios & ANG-006',
      url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1100&q=85',
      author: 'Arno Senoner',
      source: 'Unsplash (https://unsplash.com/photos/oCXVxwTFwqE)',
      license: 'Unsplash License (https://unsplash.com/license)',
      consultedAt: CONSULTATION_DATE
    }
  ];

  var INITIAL_ADMIN_USERS = [
    {
      id: 'admin-owner-official',
      name: 'Proprietária BY ANGÉLY',
      email: 'byangely1@gmail.com',
      role: 'owner',
      roleLabel: 'Proprietária (Acesso Total)',
      permissions: ['products', 'categories', 'orders', 'customers', 'payments', 'shipping', 'branding', 'policies', 'users'],
      active: true
    }
  ];

  function createInitialDatabase() {
    return {
      version: '1.1.0',
      updatedAt: new Date().toISOString(),
      storeSettings: JSON.parse(JSON.stringify(INITIAL_STORE_SETTINGS)),
      paymentSettings: JSON.parse(JSON.stringify(INITIAL_PAYMENT_SETTINGS)),
      shippingSettings: JSON.parse(JSON.stringify(INITIAL_SHIPPING_SETTINGS)),
      categories: JSON.parse(JSON.stringify(INITIAL_CATEGORIES)),
      products: JSON.parse(JSON.stringify(INITIAL_PRODUCTS)),
      coupons: JSON.parse(JSON.stringify(INITIAL_COUPONS)),
      reviews: JSON.parse(JSON.stringify(INITIAL_REVIEWS)),
      policies: JSON.parse(JSON.stringify(INITIAL_POLICIES)),
      officialReferences: JSON.parse(JSON.stringify(OFFICIAL_REFERENCES)),
      imageLicenses: JSON.parse(JSON.stringify(IMAGE_LICENSES_REGISTRY)),
      adminUsers: JSON.parse(JSON.stringify(INITIAL_ADMIN_USERS)),
      customers: [],
      orders: [],
      returnRequests: [],
      contactMessages: [],
      auditLog: [
        {
          id: 'log-init',
          timestamp: new Date().toISOString(),
          actor: 'Sistema',
          action: 'Loja BY ANGÉLY inicializada.'
        }
      ]
    };
  }

  return {
    CONSULTATION_DATE: CONSULTATION_DATE,
    DEFAULT_SIZE_CHART: DEFAULT_SIZE_CHART,
    WHATSAPP_INITIAL_TEXT: WHATSAPP_INITIAL_TEXT,
    WHATSAPP_DIRECT_URL: WHATSAPP_DIRECT_URL,
    WHATSAPP_BASE_URL: WHATSAPP_BASE_URL,
    INSTAGRAM_OFFICIAL_URL: INSTAGRAM_OFFICIAL_URL,
    EMAIL_OFFICIAL: EMAIL_OFFICIAL,
    EMAIL_MAILTO: EMAIL_MAILTO,
    INITIAL_CATEGORIES: INITIAL_CATEGORIES,
    createInitialDatabase: createInitialDatabase
  };
});
