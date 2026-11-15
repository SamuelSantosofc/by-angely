# Documentação de Pesquisa Legal, Boas Práticas e Licenciamento de Imagens — By Angély

**Data da Consulta e Verificação:** 14 de novembro de 2026 (`14/11/2026`)  
**Nota Legal:** As referências legais abaixo foram consultadas em fontes públicas oficiais para estruturar as funcionalidades, etapas de compra e minutas de políticas da loja **By Angély (Itaperuna - RJ)** como referência técnica operacional, não substituindo consultoria ou aconselhamento jurídico formal.

---

## 1. Fontes Oficiais e Regulatórias Consultadas

| Tema | Documento / Norma Oficial | Órgão / Fonte Oficial | Link Oficial | Data da Consulta | Aplicação no Projeto |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Defesa do Consumidor** | **Lei nº 8.078, de 11 de setembro de 1990** (Código de Defesa do Consumidor — CDC) | Presidência da República (Planalto) | https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm | 14/11/2026 | Direito de Arrependimento em até 7 dias corridos com reembolso integral inclusive de frete (Art. 49); prazo legal de 90 dias para reclamação de vícios em bens duráveis (Art. 26, II); clareza ostensiva de preços e características (Art. 6º e Art. 31). |
| **Comércio Eletrônico** | **Decreto nº 7.962, de 15 de março de 2013** (Regulamentação do CDC para E-commerce) | Presidência da República (Planalto) | https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm | 14/11/2026 | Exibição de dados de identificação no rodapé (Art. 2º); apresentação de resumo completo do pedido antes da finalização para revisão de itens, endereço e custos (Art. 4º); canal eletrônico de atendimento e ferramenta digital para solicitação de arrependimento/troca (Art. 5º). |
| **Proteção de Dados Pessoais** | **Lei nº 13.709, de 14 de agosto de 2018** (Lei Geral de Proteção de Dados — LGPD) | Presidência da República (Planalto) | https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm | 14/11/2026 | Coleta mínima de dados necessários para execução do pedido (Art. 6º, III); mascaramento de dados pessoais no painel administrativo com registro em log de auditoria; opt-in desmarcado por padrão para mensagens publicitárias e botão de revogação (opt-out) na Área da Cliente (Art. 8º, § 5º e Art. 18). |
| **Governança de Cookies** | **Guia Orientativo: Cookies e Proteção de Dados Pessoais** | Autoridade Nacional de Proteção de Dados (ANPD — gov.br) | https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf | 14/11/2026 | Banner de cookies em língua portuguesa com botões de mesmo destaque visual ("Aceitar Apenas Necessários" e "Aceitar Todos") e desativação por padrão de cookies não essenciais. |
| **Arranjo de Pagamentos Pix** | **Manual de Padrões para Iniciação do Pix — Especificação EMV® QRCPS-MPM (BR Code)** | Banco Central do Brasil (BCB) | https://www.bcb.gov.br/estabilidadefinanceira/pix | 14/11/2026 | Geração de payload Pix Copia e Cola e QR Code em estrutura TLV (`00` Payload Format Indicator, `26` GUI `br.gov.bcb.pix`, `53` moeda `986`, `54` valor exato do pedido, `58` país `BR`, `59` nome do recebedor, `60` cidade `ITAPERUNA`, `62` TXID e `63` checksum CRC16-CCITT polinômio `0x1021`). |
| **Segurança de Cartões** | **PCI DSS (Payment Card Industry Data Security Standard)** | PCI Security Standards Council | https://www.pcisecuritystandards.org/ | 14/11/2026 | Proibição de armazenamento de número completo de cartão (PAN), validade ou código CVV no banco de dados da loja; uso exclusivo de redirecionamento seguro HTTPS para o provedor de pagamento escolhido. |
| **Acessibilidade Web** | **WCAG 2.1 (Web Content Accessibility Guidelines) / eMAG** | W3C / Governo Digital (gov.br) | https://www.w3.org/Translations/WCAG21-pt-BR/ | 14/11/2026 | Navegação por teclado (`:focus-visible`, `skip-link`, fechamento por `Escape`), respeito a `prefers-reduced-motion: reduce`, textos alternativos (`alt`), contraste AA/AAA e painel de acessibilidade integrado. |

---

## 2. Registro de Fontes e Licenças das Imagens Demonstrativas

Nenhuma foto ou vídeo das imagens de referência enviadas ou do Instagram da **By Angély** foi copiado ou reutilizado. Todas as fotografias ilustrativas de moda feminina adulta abaixo provêm do **Unsplash** sob a **Licença Unsplash (`https://unsplash.com/license`)**, que permite uso gratuito comercial e não comercial sem exigência de atribuição (embora tenhamos registrado todos os créditos abaixo e na interface da loja por transparência).

Todas as peças iniciais estão marcadas no sistema como **`DEMONSTRAÇÃO • IMAGEM ILUSTRATIVA`** e podem ser substituídas ou removidas com um clique pela proprietária no Painel Administrativo.

| Local de Utilização | Fotógrafo / Autor | URL da Imagem / Fonte | Licença e Condições | Data de Consulta |
| :--- | :--- | :--- | :--- | :--- |
| **Banner Principal (Hero)** | Alexandra Gorn | https://images.unsplash.com/photo-1490481651871-ab68de25d43d | Unsplash License (https://unsplash.com/license) — Uso comercial permitido | 14/11/2026 |
| **Seção Institucional (Sobre a Marca)** | Freestocks | https://images.unsplash.com/photo-1483985988355-763728e1935b | Unsplash License (https://unsplash.com/license) — Uso comercial permitido | 14/11/2026 |
| **Categoria Vestidos & DEMO-ANG-001 (Foto 1)** | Engin Akyurt | https://images.unsplash.com/photo-1595777457583-95e059d581b8 | Unsplash License (https://unsplash.com/license) — Uso comercial permitido | 14/11/2026 |
| **Produto DEMO-ANG-001 (Foto 2)** | Tuấn Kiệt Jr. | https://images.unsplash.com/photo-1539008835657-9e8e9680c956 | Unsplash License (https://unsplash.com/license) — Uso comercial permitido | 14/11/2026 |
| **Categoria Conjuntos & DEMO-ANG-002 (Foto 1)** | Dom Hill | https://images.unsplash.com/photo-1515886657613-9f3515b0c78f | Unsplash License (https://unsplash.com/license) — Uso comercial permitido | 14/11/2026 |
| **Produto DEMO-ANG-002 (Foto 2)** | Brooke Cagle | https://images.unsplash.com/photo-1487222477894-8943e31ef7b2 | Unsplash License (https://unsplash.com/license) — Uso comercial permitido | 14/11/2026 |
| **Categoria Blusas & DEMO-ANG-003 (Foto 1)** | Tamara Bellis | https://images.unsplash.com/photo-1551163943-3f6a855d1153 | Unsplash License (https://unsplash.com/license) — Uso comercial permitido | 14/11/2026 |
| **Produto DEMO-ANG-003 (Foto 2)** | Laura Chouette | https://images.unsplash.com/photo-1564257631407-4deb1f99d992 | Unsplash License (https://unsplash.com/license) — Uso comercial permitido | 14/11/2026 |
| **Categoria Calças & DEMO-ANG-004** | Vladimir Fedotov | https://images.unsplash.com/photo-1509631179647-0177331693ae | Unsplash License (https://unsplash.com/license) — Uso comercial permitido | 14/11/2026 |
| **Categoria Saias & DEMO-ANG-005** | Khaled Ghareeb | https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa | Unsplash License (https://unsplash.com/license) — Uso comercial permitido | 14/11/2026 |
| **Categoria Acessórios & DEMO-ANG-006** | Arno Senoner | https://images.unsplash.com/photo-1548036328-c9fa89d128fa | Unsplash License (https://unsplash.com/license) — Uso comercial permitido | 14/11/2026 |
| **Produto DEMO-ANG-007 (Vestido Longo)** | Terje Sollie | https://images.unsplash.com/photo-1566174053879-31528523f8ae | Unsplash License (https://unsplash.com/license) — Uso comercial permitido | 14/11/2026 |
| **Produto DEMO-ANG-008 (Blazer Alfaiataria)** | Mediamodifier | https://images.unsplash.com/photo-1591047139829-d91aecb6caea | Unsplash License (https://unsplash.com/license) — Uso comercial permitido | 14/11/2026 |
