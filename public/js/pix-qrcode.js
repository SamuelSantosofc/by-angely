/**
 * By Angély — Módulo Oficial de Pagamento Pix (Padrão EMV® QRCPS-MPM / BR Code Banco Central)
 * e Gerador Nativo de QR Code SVG (ISO/IEC 18004)
 *
 * Referência Técnica:
 * - Banco Central do Brasil: Manual de Padrões para Iniciação do Pix (BR Code)
 * - EMV® QR Code Specification for Payment Systems (EMV QRCPS) — Merchant-Presented Mode
 * - Polinômio CRC16-CCITT: 0x1021 (Valor inicial: 0xFFFF)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ByAngelyPix = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Remove acentos e caracteres especiais conforme exigido pelo padrão EMV do BCB
   */
  function normalizeEmvText(str, maxLength) {
    if (!str) return '';
    var cleaned = String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 $%*+\-./:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
    return maxLength ? cleaned.slice(0, maxLength) : cleaned;
  }

  /**
   * Formata um campo TLV (Tag-Length-Value) do padrão EMV
   */
  function formatEmvField(id, value) {
    var valStr = String(value || '');
    var len = valStr.length.toString().padStart(2, '0');
    return id + len + valStr;
  }

  /**
   * Calcula o checksum CRC16-CCITT (0x1021, init 0xFFFF) oficial do BR Code Pix
   */
  function computeCRC16(payload) {
    var crc = 0xffff;
    var polynomial = 0x1021;
    for (var i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (var bit = 0; bit < 8; bit++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ polynomial) & 0xffff;
        } else {
          crc = (crc << 1) & 0xffff;
        }
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  /**
   * Normaliza a chave Pix segundo o tipo (CPF, CNPJ, Telefone, E-mail ou Chave Aleatória)
   */
  function normalizePixKey(key, keyType) {
    if (!key) return '';
    var raw = String(key).trim();
    var type = (keyType || '').toLowerCase();
    if (type === 'cpf' || type === 'cnpj') {
      return raw.replace(/\D/g, '');
    }
    if (type === 'phone' || type === 'telefone' || type === 'celular') {
      var digits = raw.replace(/\D/g, '');
      if (digits.startsWith('55') && digits.length >= 12) {
        return '+' + digits;
      }
      return '+55' + digits;
    }
    if (type === 'email' || type === 'e-mail') {
      return raw.toLowerCase();
    }
    return raw;
  }

  /**
   * Gera o payload completo do Pix Copia e Cola (BR Code EMV)
   * @param {Object} params
   * @param {string} params.pixKey - Chave Pix configurada pela proprietária
   * @param {string} [params.keyType] - Tipo da chave (cnpj, cpf, email, telefone, aleatoria)
   * @param {string} params.merchantName - Nome do recebedor (até 25 caracteres)
   * @param {string} [params.merchantCity='ITAPERUNA'] - Cidade do recebedor (até 15 caracteres)
   * @param {number} [params.amount] - Valor exato do pedido em BRL
   * @param {string} [params.txid='***'] - Identificador único da transação (até 25 caracteres alfanuméricos)
   * @param {string} [params.description] - Identificação complementar da loja/pedido
   */
  function generatePixPayload(params) {
    var pixKey = normalizePixKey(params.pixKey, params.keyType);
    if (!pixKey) {
      throw new Error('Chave Pix não configurada.');
    }

    var merchantName = normalizeEmvText(params.merchantName || 'BY ANGELY', 25) || 'BY ANGELY';
    var merchantCity = normalizeEmvText(params.merchantCity || 'ITAPERUNA', 15) || 'ITAPERUNA';
    var txidRaw = String(params.txid || '***').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***';
    var description = normalizeEmvText(params.description || '', 25);

    // Subcampos do Merchant Account Information (ID 26)
    var guiField = formatEmvField('00', 'br.gov.bcb.pix');
    var keyField = formatEmvField('01', pixKey);
    var descField = description ? formatEmvField('02', description) : '';
    var merchantAccountInfo = formatEmvField('26', guiField + keyField + descField);

    // Valor da transação (ID 54)
    var amountField = '';
    if (typeof params.amount === 'number' && !isNaN(params.amount) && params.amount > 0) {
      amountField = formatEmvField('54', params.amount.toFixed(2));
    }

    // Campo adicional TXID (ID 62 -> subcampo 05)
    var additionalData = formatEmvField('62', formatEmvField('05', txidRaw));

    var basePayload =
      formatEmvField('00', '01') + // Payload Format Indicator
      merchantAccountInfo +        // Merchant Account Info (Pix)
      formatEmvField('52', '0000') + // Merchant Category Code
      formatEmvField('53', '986') +  // Moeda BRL (986)
      amountField +                  // Valor exato do pedido
      formatEmvField('58', 'BR') +   // País BR
      formatEmvField('59', merchantName) + // Nome do recebedor
      formatEmvField('60', merchantCity) + // Cidade do recebedor
      additionalData +               // TXID
      '6304';                        // ID e tamanho do CRC16

    var crc = computeCRC16(basePayload);
    return basePayload + crc;
  }

  // =========================================================================
  // GERADOR NATIVO DE QR CODE (ISO/IEC 18004 - Byte Mode, Nível L, Versões 1 a 10)
  // Permite renderizar o QR Code em SVG nítido sem depender de servidores externos.
  // =========================================================================

  // Capacidades de dados (bytes) e blocos de correção de erro (Nível L) para versões 1..10
  var QR_VERSIONS_L = [
    null,
    { totalCodewords: 26, ecCodewordsPerBlock: 7, blocks: [1, 19] },     // V1
    { totalCodewords: 44, ecCodewordsPerBlock: 10, blocks: [1, 34] },    // V2
    { totalCodewords: 70, ecCodewordsPerBlock: 15, blocks: [1, 55] },    // V3
    { totalCodewords: 100, ecCodewordsPerBlock: 20, blocks: [1, 80] },   // V4
    { totalCodewords: 134, ecCodewordsPerBlock: 26, blocks: [1, 108] },  // V5
    { totalCodewords: 172, ecCodewordsPerBlock: 18, blocks: [2, 68] },   // V6
    { totalCodewords: 196, ecCodewordsPerBlock: 20, blocks: [2, 78] },   // V7
    { totalCodewords: 242, ecCodewordsPerBlock: 24, blocks: [2, 97] },   // V8
    { totalCodewords: 292, ecCodewordsPerBlock: 30, blocks: [2, 116] },  // V9
    { totalCodewords: 346, ecCodewordsPerBlock: 18, blocks: [2, 68, 2, 69] } // V10
  ];

  var ALIGNMENT_PATTERNS = [
    null,
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50]
  ];

  // Tabelas de corpo finito GF(256) com polinômio primitivo 0x11D
  var GF_EXP = new Array(512);
  var GF_LOG = new Array(256);
  (function initGaloisField() {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) {
      GF_EXP[j] = GF_EXP[j - 255];
    }
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  function rsGeneratorPoly(degree) {
    var poly = [1];
    for (var i = 0; i < degree; i++) {
      var next = new Array(poly.length + 1).fill(0);
      var root = GF_EXP[i];
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], root);
      }
      poly = next;
    }
    return poly;
  }

  function rsEncode(data, ecLen) {
    var gen = rsGeneratorPoly(ecLen);
    var msg = data.slice();
    for (var i = 0; i < ecLen; i++) msg.push(0);
    for (var j = 0; j < data.length; j++) {
      var coef = msg[j];
      if (coef !== 0) {
        for (var k = 0; k < gen.length; k++) {
          msg[j + k] ^= gfMul(gen[k], coef);
        }
      }
    }
    return msg.slice(data.length);
  }

  function encodeUtf8Bytes(str) {
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) {
        bytes.push(c);
      } else if (c < 0x800) {
        bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      } else {
        bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      }
    }
    return bytes;
  }

  function selectVersion(byteLength) {
    for (var v = 1; v <= 10; v++) {
      var info = QR_VERSIONS_L[v];
      var numBlocks = info.blocks[0] + (info.blocks[2] || 0);
      var dataCapacity = info.totalCodewords - numBlocks * info.ecCodewordsPerBlock;
      var headerBits = v <= 9 ? 4 + 8 : 4 + 16;
      var maxBytes = Math.floor((dataCapacity * 8 - headerBits) / 8);
      if (byteLength <= maxBytes) return v;
    }
    return 10;
  }

  function buildDataCodewords(bytes, version) {
    var info = QR_VERSIONS_L[version];
    var numBlocks = info.blocks[0] + (info.blocks[2] || 0);
    var totalDataCodewords = info.totalCodewords - numBlocks * info.ecCodewordsPerBlock;

    var bits = [];
    function pushBits(val, len) {
      for (var i = len - 1; i >= 0; i--) {
        bits.push((val >> i) & 1);
      }
    }

    // Mode indicator: Byte mode (0100)
    pushBits(0x4, 4);
    // Character count indicator (8 bits for V1-9, 16 bits for V10)
    pushBits(bytes.length, version <= 9 ? 8 : 16);
    for (var b = 0; b < bytes.length; b++) {
      pushBits(bytes[b], 8);
    }

    // Terminator (up to 4 zeros)
    var maxBits = totalDataCodewords * 8;
    var term = Math.min(4, maxBits - bits.length);
    pushBits(0, term);

    while (bits.length % 8 !== 0) bits.push(0);

    var codewords = [];
    for (var i = 0; i < bits.length; i += 8) {
      var byteVal = 0;
      for (var j = 0; j < 8; j++) byteVal = (byteVal << 1) | bits[i + j];
      codewords.push(byteVal);
    }

    var padBytes = [0xec, 0x11];
    var padIdx = 0;
    while (codewords.length < totalDataCodewords) {
      codewords.push(padBytes[padIdx % 2]);
      padIdx++;
    }

    // Split into blocks and compute Reed-Solomon EC
    var dataBlocks = [];
    var ecBlocks = [];
    var offset = 0;
    var groups = [
      { count: info.blocks[0], dataLen: info.blocks[1] }
    ];
    if (info.blocks.length > 2) {
      groups.push({ count: info.blocks[2], dataLen: info.blocks[3] });
    }

    for (var g = 0; g < groups.length; g++) {
      for (var c = 0; c < groups[g].count; c++) {
        var blockData = codewords.slice(offset, offset + groups[g].dataLen);
        offset += groups[g].dataLen;
        dataBlocks.push(blockData);
        ecBlocks.push(rsEncode(blockData, info.ecCodewordsPerBlock));
      }
    }

    // Interleave data codewords
    var interleaved = [];
    var maxDataLen = Math.max.apply(
      null,
      dataBlocks.map(function (bl) { return bl.length; })
    );
    for (var col = 0; col < maxDataLen; col++) {
      for (var r = 0; r < dataBlocks.length; r++) {
        if (col < dataBlocks[r].length) interleaved.push(dataBlocks[r][col]);
      }
    }
    // Interleave EC codewords
    for (var ecCol = 0; ecCol < info.ecCodewordsPerBlock; ecCol++) {
      for (var ecRow = 0; ecRow < ecBlocks.length; ecRow++) {
        interleaved.push(ecBlocks[ecRow][ecCol]);
      }
    }

    return interleaved;
  }

  function createMatrix(text) {
    var bytes = encodeUtf8Bytes(text);
    var version = selectVersion(bytes.length);
    var size = version * 4 + 17;
    var matrix = [];
    var reserved = [];
    for (var r = 0; r < size; r++) {
      matrix.push(new Array(size).fill(0));
      reserved.push(new Array(size).fill(false));
    }

    function setModule(row, col, val, isFunc) {
      if (row >= 0 && row < size && col >= 0 && col < size) {
        matrix[row][col] = val ? 1 : 0;
        if (isFunc) reserved[row][col] = true;
      }
    }

    function placeFinderPattern(row, col) {
      for (var dr = -1; dr <= 7; dr++) {
        for (var dc = -1; dc <= 7; dc++) {
          var rr = row + dr;
          var cc = col + dc;
          if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
          var inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
          var isBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
          var isCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
          setModule(rr, cc, inOuter && (isBorder || isCenter), true);
        }
      }
    }

    placeFinderPattern(0, 0);
    placeFinderPattern(0, size - 7);
    placeFinderPattern(size - 7, 0);

    // Alignment patterns
    var alignCoords = ALIGNMENT_PATTERNS[version];
    for (var i = 0; i < alignCoords.length; i++) {
      for (var j = 0; j < alignCoords.length; j++) {
        var ar = alignCoords[i];
        var ac = alignCoords[j];
        if (reserved[ar][ac]) continue;
        for (var dr = -2; dr <= 2; dr++) {
          for (var dc = -2; dc <= 2; dc++) {
            var isDark = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
            setModule(ar + dr, ac + dc, isDark, true);
          }
        }
      }
    }

    // Timing patterns
    for (var t = 8; t < size - 8; t++) {
      if (!reserved[6][t]) setModule(6, t, t % 2 === 0, true);
      if (!reserved[t][6]) setModule(t, 6, t % 2 === 0, true);
    }

    // Dark module & reserve format info areas
    setModule(size - 8, 8, 1, true);
    for (var f = 0; f < 9; f++) {
      if (!reserved[8][f]) reserved[8][f] = true;
      if (!reserved[f][8]) reserved[f][8] = true;
    }
    for (var f2 = 0; f2 < 8; f2++) {
      reserved[8][size - 1 - f2] = true;
      reserved[size - 1 - f2][8] = true;
    }

    // Version info for V7+
    if (version >= 7) {
      var vInfo = version;
      for (var vi = 0; vi < 12; vi++) {
        vInfo = (vInfo << 1) ^ ((vInfo >> 11) * 0x1f25);
      }
      var vBits = (version << 12) | (vInfo & 0xfff);
      for (var vb = 0; vb < 18; vb++) {
        var bit = (vBits >> vb) & 1;
        var br = Math.floor(vb / 3);
        var bc = size - 11 + (vb % 3);
        setModule(br, bc, bit, true);
        setModule(bc, br, bit, true);
      }
    }

    // Place data bits
    var codewords = buildDataCodewords(bytes, version);
    var dataBits = [];
    for (var cw = 0; cw < codewords.length; cw++) {
      for (var b = 7; b >= 0; b--) {
        dataBits.push((codewords[cw] >> b) & 1);
      }
    }

    var bitIdx = 0;
    var upward = true;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        var rPos = upward ? size - 1 - vert : vert;
        for (var lr = 0; lr < 2; lr++) {
          var cPos = right - lr;
          if (!reserved[rPos][cPos]) {
            var bitVal = bitIdx < dataBits.length ? dataBits[bitIdx++] : 0;
            // Mask pattern 0: (row + col) % 2 === 0
            if ((rPos + cPos) % 2 === 0) bitVal ^= 1;
            matrix[rPos][cPos] = bitVal;
          }
        }
      }
      upward = !upward;
    }

    // Format information for Level L (01) and Mask 0 (000) -> 01000 -> BCH & XOR mask 0x5412 = 0x77C4
    var formatBits = 0x77c4;
    var formatCoords1 = [
      [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
      [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
    ];
    var formatCoords2 = [
      [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8],
      [size - 5, 8], [size - 6, 8], [size - 7, 8],
      [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5],
      [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1]
    ];
    for (var fi = 0; fi < 15; fi++) {
      var fBit = (formatBits >> fi) & 1;
      matrix[formatCoords1[fi][0]][formatCoords1[fi][1]] = fBit;
      matrix[formatCoords2[fi][0]][formatCoords2[fi][1]] = fBit;
    }

    return matrix;
  }

  /**
   * Renderiza um QR Code em SVG vetorial de alta definição
   */
  function renderQrSvg(payload, options) {
    var opts = options || {};
    var margin = typeof opts.margin === 'number' ? opts.margin : 3;
    var darkColor = opts.darkColor || '#181715';
    var lightColor = opts.lightColor || '#FFFFFF';
    var matrix = createMatrix(payload);
    var n = matrix.length;
    var viewSize = n + margin * 2;

    var paths = [];
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (matrix[r][c]) {
          paths.push('M' + (c + margin) + ',' + (r + margin) + 'h1v1h-1z');
        }
      }
    }

    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
      viewSize + ' ' + viewSize +
      '" role="img" aria-label="QR Code Pix oficial no padrão EMV BR Code" shape-rendering="crispEdges" style="width:100%;height:100%;display:block;border-radius:8px;">' +
      '<rect width="100%" height="100%" fill="' + lightColor + '"/>' +
      '<path d="' + paths.join('') + '" fill="' + darkColor + '"/>' +
      '</svg>'
    );
  }

  return {
    normalizeEmvText: normalizeEmvText,
    computeCRC16: computeCRC16,
    normalizePixKey: normalizePixKey,
    generatePixPayload: generatePixPayload,
    renderQrSvg: renderQrSvg
  };
});
