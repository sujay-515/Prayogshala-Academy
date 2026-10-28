import zlib from 'node:zlib';

const MAX_DECOMPRESS_BYTES = 20 * 1024 * 1024; // 20MB maximum decompressed output per stream to prevent zip bombs

/**
 * Windows-1252 (WinAnsiEncoding) mapping for bytes 0x80 - 0x9F
 */
const WIN_ANSI_80_9F: Record<number, string> = {
  0x80: '\u20AC',
  0x82: '\u201A',
  0x83: '\u0192',
  0x84: '\u201E',
  0x85: '\u2026',
  0x86: '\u2020',
  0x87: '\u2021',
  0x88: '\u02C6',
  0x89: '\u2030',
  0x8a: '\u0160',
  0x8b: '\u2039',
  0x8c: '\u0152',
  0x8e: '\u017D',
  0x91: '\u2018',
  0x92: '\u2019',
  0x93: '\u201C',
  0x94: '\u201D',
  0x95: '\u2022',
  0x96: '\u2013',
  0x97: '\u2014',
  0x98: '\u02DC',
  0x99: '\u2122',
  0x9a: '\u0161',
  0x9b: '\u203A',
  0x9c: '\u0153',
  0x9e: '\u017E',
  0x9f: '\u0178',
};

interface CMapTable {
  map: Map<number, string>;
  isTwoByte: boolean;
}

interface FontEncodingInfo {
  isTwoByte: boolean;
  toUnicodeObjId?: number;
  cmap?: CMapTable;
}

/**
 * Converts a PDF literal string \(, \), \n, \r, \t, \ddd into raw byte values (0-255)
 */
function pdfLiteralToBytes(raw: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i);
    if (ch !== 0x5c) {
      // not backslash
      bytes.push(ch & 0xff);
      continue;
    }
    i++;
    if (i >= raw.length) break;
    const next = raw[i];
    if (next === 'n') bytes.push(10);
    else if (next === 'r') bytes.push(13);
    else if (next === 't') bytes.push(9);
    else if (next === 'b') bytes.push(8);
    else if (next === 'f') bytes.push(12);
    else if (next === '(' || next === ')' || next === '\\') bytes.push(next.charCodeAt(0));
    else if (next === '\r' || next === '\n') {
      if (next === '\r' && raw[i + 1] === '\n') i++;
    } else if (next >= '0' && next <= '7') {
      let octal = next;
      if (raw[i + 1] >= '0' && raw[i + 1] <= '7') octal += raw[++i];
      if (raw[i + 1] >= '0' && raw[i + 1] <= '7') octal += raw[++i];
      bytes.push(parseInt(octal, 8) & 0xff);
    } else {
      bytes.push(next.charCodeAt(0) & 0xff);
    }
  }
  return bytes;
}

/**
 * Converts a PDF hex string <...> into raw byte values (0-255)
 */
function pdfHexToBytes(hex: string): number[] {
  const clean = hex.replace(/[^0-9A-Fa-f]/g, '');
  if (!clean) return [];
  const evenHex = clean.length % 2 === 0 ? clean : clean + '0';
  const bytes: number[] = [];
  for (let i = 0; i < evenHex.length; i += 2) {
    bytes.push(parseInt(evenHex.slice(i, i + 2), 16));
  }
  return bytes;
}

/**
 * Decodes a hex string target in a ToUnicode CMap (UTF-16BE) into a JS string
 */
function decodeCMapTargetHex(hex: string): string {
  const clean = hex.replace(/[^0-9A-Fa-f]/g, '');
  if (!clean) return '';
  if (clean.length <= 2) {
    return String.fromCharCode(parseInt(clean, 16));
  }
  const padded = clean.length % 4 === 0 ? clean : clean.padStart(Math.ceil(clean.length / 4) * 4, '0');
  let out = '';
  for (let i = 0; i < padded.length; i += 4) {
    const unit = parseInt(padded.slice(i, i + 4), 16);
    out += String.fromCharCode(unit);
  }
  return out;
}

/**
 * Parses a ToUnicode CMap stream (begincmap ... endcmap) into a glyphId -> Unicode string map
 */
function parseToUnicodeCMap(cmapText: string): CMapTable {
  const map = new Map<number, string>();
  let isTwoByte = false;

  const spaceMatch = cmapText.match(/begincodespacerange([\s\S]*?)endcodespacerange/);
  if (spaceMatch) {
    const hexTokens = spaceMatch[1].match(/<([0-9A-Fa-f]+)>/g);
    if (hexTokens && hexTokens.some((t) => t.length >= 6)) {
      isTwoByte = true;
    }
  }

  // Parse beginbfchar ... endbfchar blocks
  const bfCharRegex = /beginbfchar([\s\S]*?)endbfchar/g;
  let charBlock: RegExpExecArray | null;
  while ((charBlock = bfCharRegex.exec(cmapText)) !== null) {
    const body = charBlock[1];
    const pairRegex = /<([0-9A-Fa-f]+)>\s*(?:<([0-9A-Fa-f]+)>|\((?:\\.|[^\\()])*\))/g;
    let pair: RegExpExecArray | null;
    while ((pair = pairRegex.exec(body)) !== null) {
      const srcHex = pair[1];
      if (srcHex.length >= 4) isTwoByte = true;
      const srcCode = parseInt(srcHex, 16);
      if (pair[2] !== undefined) {
        map.set(srcCode, decodeCMapTargetHex(pair[2]));
      }
    }
  }

  // Parse beginbfrange ... endbfrange blocks
  const bfRangeRegex = /beginbfrange([\s\S]*?)endbfrange/g;
  let rangeBlock: RegExpExecArray | null;
  while ((rangeBlock = bfRangeRegex.exec(cmapText)) !== null) {
    const body = rangeBlock[1];
    const entryRegex = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(?:<([0-9A-Fa-f]+)>|\[([\s\S]*?)\])/g;
    let entry: RegExpExecArray | null;
    while ((entry = entryRegex.exec(body)) !== null) {
      const startHex = entry[1];
      const endHex = entry[2];
      if (startHex.length >= 4 || endHex.length >= 4) isTwoByte = true;
      const startCode = parseInt(startHex, 16);
      const endCode = parseInt(endHex, 16);
      if (endCode < startCode || endCode - startCode > 4096) continue;

      if (entry[3] !== undefined) {
        const baseStr = decodeCMapTargetHex(entry[3]);
        if (baseStr.length === 1) {
          const baseCharCode = baseStr.charCodeAt(0);
          for (let c = startCode; c <= endCode; c++) {
            map.set(c, String.fromCharCode(baseCharCode + (c - startCode)));
          }
        } else if (baseStr.length > 1) {
          const prefix = baseStr.slice(0, -1);
          const lastCode = baseStr.charCodeAt(baseStr.length - 1);
          for (let c = startCode; c <= endCode; c++) {
            map.set(c, prefix + String.fromCharCode(lastCode + (c - startCode)));
          }
        }
      } else if (entry[4] !== undefined) {
        const arrayHexes = entry[4].match(/<([0-9A-Fa-f]+)>/g) || [];
        for (let idx = 0; idx < arrayHexes.length && startCode + idx <= endCode; idx++) {
          const hexVal = arrayHexes[idx].slice(1, -1);
          map.set(startCode + idx, decodeCMapTargetHex(hexVal));
        }
      }
    }
  }

  return { map, isTwoByte };
}

/**
 * Sanitizes decoded characters (strips control chars, Private Use Area bullets, soft hyphens)
 */
function sanitizeDecodedString(str: string): string {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code === 0x7f || (code >= 0x00 && code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d)) {
      continue;
    }
    if (code === 0x00ad) {
      // Soft hyphen -> standard hyphen
      out += '-';
      continue;
    }
    if (code >= 0xe000 && code <= 0xf8ff) {
      // Private Use Area (often Wingdings/Symbol bullets in Word PDFs)
      out += ' ';
      continue;
    }
    out += str[i];
  }
  return out;
}

/**
 * Decodes a sequence of bytes from a PDF string token using the active font's CMap or WinAnsi fallback
 */
function decodeBytesWithFont(
  bytes: number[],
  isHexToken: boolean,
  font?: FontEncodingInfo,
  fallbackCMap?: CMapTable
): string {
  if (bytes.length === 0) return '';

  // Check for explicit UTF-16BE BOM (0xFE 0xFF)
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let str = '';
    for (let i = 2; i + 1 < bytes.length; i += 2) {
      str += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    }
    return sanitizeDecodedString(str);
  }

  const activeCMap = font?.cmap || (isHexToken && font?.isTwoByte ? fallbackCMap : undefined);

  if (activeCMap && activeCMap.map.size > 0) {
    const twoByte = font?.isTwoByte ?? activeCMap.isTwoByte;
    if (twoByte && bytes.length >= 2) {
      let str = '';
      for (let i = 0; i + 1 < bytes.length; i += 2) {
        const cid = (bytes[i] << 8) | bytes[i + 1];
        const mapped = activeCMap.map.get(cid);
        if (mapped !== undefined) {
          str += mapped;
        } else if (cid === 3) {
          // Standard Identity-H space glyph ID in Calibri/Arial/Times when space is omitted from CMap
          str += ' ';
        } else if (cid >= 32 && cid <= 126) {
          str += String.fromCharCode(cid);
        }
      }
      return sanitizeDecodedString(str);
    } else {
      let str = '';
      for (let i = 0; i < bytes.length; i++) {
        const cid = bytes[i];
        const mapped = activeCMap.map.get(cid);
        if (mapped !== undefined) {
          str += mapped;
        } else if (WIN_ANSI_80_9F[cid]) {
          str += WIN_ANSI_80_9F[cid];
        } else {
          str += String.fromCharCode(cid);
        }
      }
      return sanitizeDecodedString(str);
    }
  }

  // If no font CMap was bound, check if this is a 2-byte Identity-H hex string that matches fallbackCMap
  if (isHexToken && bytes.length >= 2 && bytes.length % 2 === 0 && fallbackCMap && fallbackCMap.map.size > 0) {
    let hits = 0;
    const totalPairs = bytes.length / 2;
    for (let i = 0; i + 1 < bytes.length; i += 2) {
      const cid = (bytes[i] << 8) | bytes[i + 1];
      if (fallbackCMap.map.has(cid)) hits++;
    }
    if (hits > 0 && hits >= totalPairs * 0.5) {
      let str = '';
      for (let i = 0; i + 1 < bytes.length; i += 2) {
        const cid = (bytes[i] << 8) | bytes[i + 1];
        str += fallbackCMap.map.get(cid) ?? (cid === 3 ? ' ' : '');
      }
      return sanitizeDecodedString(str);
    }
  }

  // Check if alternating 0x00 bytes (UTF-16BE without BOM)
  const pairs = Math.floor(bytes.length / 2);
  if (pairs >= 2) {
    let zeroEvenCount = 0;
    for (let i = 0; i < pairs * 2; i += 2) {
      if (bytes[i] === 0) zeroEvenCount++;
    }
    if (zeroEvenCount > pairs * 0.7) {
      let str = '';
      for (let i = 0; i + 1 < bytes.length; i += 2) {
        const code = (bytes[i] << 8) | bytes[i + 1];
        str += String.fromCharCode(code);
      }
      return sanitizeDecodedString(str);
    }
  }

  // Standard WinAnsi / Latin1 1-byte decoding
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (WIN_ANSI_80_9F[b]) {
      out += WIN_ANSI_80_9F[b];
    } else {
      out += String.fromCharCode(b);
    }
  }
  return sanitizeDecodedString(out);
}

/**
 * Wraps raw uncompressed 8-bit RGB or Grayscale pixel scanlines into a valid PNG binary buffer
 */
function encodeRawRasterToPng(width: number, height: number, channels: number, rawPixels: Buffer): Buffer {
  const colorType = channels === 1 ? 0 : channels === 3 ? 2 : 6;
  const bytesPerPixel = channels;
  const rowBytes = width * bytesPerPixel;

  const scanlines = Buffer.alloc(height * (rowBytes + 1));
  for (let y = 0; y < height; y++) {
    const scanlineOffset = y * (rowBytes + 1);
    scanlines[scanlineOffset] = 0; // Filter 0 (None)
    const srcStart = y * rowBytes;
    const srcEnd = Math.min(rawPixels.length, (y + 1) * rowBytes);
    if (srcStart < rawPixels.length) {
      rawPixels.copy(scanlines, scanlineOffset + 1, srcStart, srcEnd);
    }
  }

  const compressedData = zlib.deflateSync(scanlines);

  const crcTable: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }

  const crc32 = (buf: Buffer): number => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  };

  const createChunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  };

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', compressedData),
    createChunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Extracts embedded diagnostic image XObjects (/Subtype /Image) from PDF objects as Base64 data URIs.
 * Supports /DCTDecode (JPEG), /JPXDecode (JPEG 2000), and /FlateDecode (PNG / raster).
 */
function extractPdfImageObjects(rawLatin1: string): Map<number, string> {
  const imagesByObjId = new Map<number, string>();
  const objRegex = /(\d+)\s+\d+\s+obj\b([\s\S]*?)endobj/g;
  let m: RegExpExecArray | null;

  while ((m = objRegex.exec(rawLatin1)) !== null) {
    const objId = parseInt(m[1], 10);
    const body = m[2];
    if (/\/Subtype\s*\/Image\b/i.test(body)) {
      const sm = body.match(/^([\s\S]*?)\bstream[ \t]*\r?\n([\s\S]*?)(?:\r?\n)?endstream/);
      if (sm) {
        const dictText = sm[1];
        const rawStream = sm[2];
        const wMatch = dictText.match(/\/Width\s+(\d+)/);
        const hMatch = dictText.match(/\/Height\s+(\d+)/);
        const width = wMatch ? parseInt(wMatch[1], 10) : 0;
        const height = hMatch ? parseInt(hMatch[1], 10) : 0;

        // Ignore tiny icon / bullet decorations
        if (width >= 40 && height >= 40 && rawStream.length >= 300) {
          const streamBuf = Buffer.from(rawStream, 'latin1');
          const isJpeg =
            /\/DCTDecode\b|\/DCT\b/i.test(dictText) ||
            (streamBuf.length >= 3 && streamBuf[0] === 0xff && streamBuf[1] === 0xd8 && streamBuf[2] === 0xff);

          if (isJpeg) {
            imagesByObjId.set(objId, `data:image/jpeg;base64,${streamBuf.toString('base64')}`);
          } else if (/\/JPXDecode\b/i.test(dictText)) {
            imagesByObjId.set(objId, `data:image/jp2;base64,${streamBuf.toString('base64')}`);
          } else if (/\/FlateDecode\b|\/Fl\b/i.test(dictText)) {
            try {
              let decompressed: Buffer;
              try {
                decompressed = zlib.inflateSync(streamBuf, { maxOutputLength: MAX_DECOMPRESS_BYTES });
              } catch {
                decompressed = zlib.inflateRawSync(streamBuf, { maxOutputLength: MAX_DECOMPRESS_BYTES });
              }

              if (decompressed.length >= 3 && decompressed[0] === 0xff && decompressed[1] === 0xd8 && decompressed[2] === 0xff) {
                imagesByObjId.set(objId, `data:image/jpeg;base64,${decompressed.toString('base64')}`);
              } else if (decompressed.length >= 8 && decompressed[0] === 0x89 && decompressed[1] === 0x50 && decompressed[2] === 0x4e && decompressed[3] === 0x47) {
                imagesByObjId.set(objId, `data:image/png;base64,${decompressed.toString('base64')}`);
              } else {
                const isGray = /\/ColorSpace\s*\/DeviceGray\b/i.test(dictText);
                const channels = isGray ? 1 : 3;
                if (decompressed.length >= width * height * channels) {
                  const pngBuf = encodeRawRasterToPng(width, height, channels, decompressed);
                  imagesByObjId.set(objId, `data:image/png;base64,${pngBuf.toString('base64')}`);
                }
              }
            } catch {
              // Ignore corrupt raster streams
            }
          }
        }
      }
    }
  }

  return imagesByObjId;
}

/**
 * Extracts text tokens from a decompressed PDF page content stream containing BT ... ET blocks,
 * honoring font switches (/F1 11 Tf), text matrices (Tm), relative offsets (Td/TD), ToUnicode CMaps,
 * and embedded image XObject invocations (/ImageName Do).
 */
function extractTextFromContentStream(
  streamContent: string,
  pageFonts: Map<string, FontEncodingInfo>,
  fallbackCMap?: CMapTable,
  pageImages?: Map<string, string>
): string {
  const lines: string[] = [];
  let currentLine = '';
  let lastY: number | null = null;
  let currentFont: FontEncodingInfo | undefined;

  const flushLine = () => {
    const trimmed = currentLine.replace(/[ \t]+/g, ' ').trim();
    if (trimmed) {
      lines.push(trimmed);
    }
    currentLine = '';
  };

  const blockRegex = /\bBT\b([\s\S]*?)\bET\b|\/([A-Za-z0-9_.+-]+)\s+Do\b/g;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockRegex.exec(streamContent)) !== null) {
    if (blockMatch[2] !== undefined) {
      // /ImageName Do operator
      const imgKey = blockMatch[2];
      const imgUri = pageImages?.get(imgKey);
      if (imgUri) {
        flushLine();
        lines.push(`[ATTACHED_FIGURE: ${imgUri}]`);
      }
      continue;
    }

    const block = blockMatch[1];
    let blockY: number | null = lastY;

    // Tokenize font switches (Tf), text matrices (Tm), line movements (Td, TD, T*, ', ") and text operators (Tj, TJ)
    const tokenRegex =
      /\/([A-Za-z0-9_.+-]+)\s+-?\d+(?:\.\d+)?\s+Tf\b|(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Tm\b|(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+T[dD]\b|\bT\*\b|(\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]*>)\s*(Tj|')|\[([\s\S]*?)\]\s*TJ/g;

    let tok: RegExpExecArray | null;
    while ((tok = tokenRegex.exec(block)) !== null) {
      if (tok[1] !== undefined) {
        // /FontName size Tf
        currentFont = pageFonts.get(tok[1]);
      } else if (tok[6] !== undefined && tok[7] !== undefined) {
        // a b c d e f Tm (f = tok[7] is Y coordinate)
        const newY = parseFloat(tok[7]);
        if (lastY !== null && Math.abs(newY - lastY) > 2.5) {
          flushLine();
        }
        blockY = newY;
        lastY = newY;
      } else if (tok[8] !== undefined && tok[9] !== undefined) {
        // tx ty Td or TD
        const dy = parseFloat(tok[9]);
        const dx = parseFloat(tok[8]);
        if (Math.abs(dy) > 1.5) {
          flushLine();
          if (blockY !== null) {
            blockY += dy;
            lastY = blockY;
          }
        } else if (dx > 10 && currentLine && !currentLine.endsWith(' ')) {
          currentLine += ' ';
        }
      } else if (tok[0] === 'T*') {
        flushLine();
      } else if (tok[10] !== undefined && tok[11] !== undefined) {
        // Single string Tj or '
        if (tok[11] === "'") {
          flushLine();
        }
        const strToken = tok[10];
        const isHex = strToken.startsWith('<');
        const bytes = isHex ? pdfHexToBytes(strToken.slice(1, -1)) : pdfLiteralToBytes(strToken.slice(1, -1));
        currentLine += decodeBytesWithFont(bytes, isHex, currentFont, fallbackCMap);
      } else if (tok[12] !== undefined) {
        // TJ array: [(Hello) -220 (World)] or [<0001> 5 <0002>]
        const arrayContent = tok[12];
        const itemRegex = /\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]*>|-?\d+(?:\.\d+)?/g;
        let itemMatch: RegExpExecArray | null;
        while ((itemMatch = itemRegex.exec(arrayContent)) !== null) {
          const item = itemMatch[0];
          if (item.startsWith('(')) {
            const bytes = pdfLiteralToBytes(item.slice(1, -1));
            currentLine += decodeBytesWithFont(bytes, false, currentFont, fallbackCMap);
          } else if (item.startsWith('<')) {
            const bytes = pdfHexToBytes(item.slice(1, -1));
            currentLine += decodeBytesWithFont(bytes, true, currentFont, fallbackCMap);
          } else {
            const kerning = parseFloat(item);
            if (kerning < -120 && currentLine && !currentLine.endsWith(' ')) {
              currentLine += ' ';
            }
          }
        }
      }
    }
  }

  flushLine();
  return lines.join('\n');
}

/**
 * Attempts to decompress a raw PDF stream buffer using FlateDecode / inflateRaw
 */
function decompressStream(streamBodyLatin1: string, dictText: string): string {
  // Skip binary non-text/non-cmap streams (images, embedded TrueType font programs, ICC profiles)
  if (
    /\/Subtype\s*\/Image\b/i.test(dictText) ||
    /\/FontFile[23]?\b/i.test(dictText) ||
    /\/Subtype\s*\/XML\b/i.test(dictText) ||
    /\/Type\s*\/Metadata\b/i.test(dictText)
  ) {
    return '';
  }

  const streamBuf = Buffer.from(streamBodyLatin1, 'latin1');
  if (!/\/FlateDecode\b|\/Fl\b/.test(dictText)) {
    return streamBodyLatin1;
  }

  try {
    return zlib.inflateSync(streamBuf, { maxOutputLength: MAX_DECOMPRESS_BYTES }).toString('latin1');
  } catch {
    try {
      return zlib.inflateRawSync(streamBuf, { maxOutputLength: MAX_DECOMPRESS_BYTES }).toString('latin1');
    } catch (err) {
      console.warn('[PDF Stream Decompress Warning] Stream decompress skipped or exceeded 20MB limit:', (err as any)?.message || err);
      return streamBodyLatin1;
    }
  }
}

/**
 * Extracts readable Unicode text from a binary PDF Buffer without external dependencies.
 * Supports /FlateDecode compressed streams, /ToUnicode CMap tables (CIDFont/Identity-H),
 * WinAnsiEncoding, page /Resources font bindings, and Tm/Td line reconstruction.
 */
export function extractTextFromPdfBuffer(pdfBuffer: Buffer): string {
  if (!pdfBuffer || pdfBuffer.length === 0) return '';

  const rawLatin1 = pdfBuffer.toString('latin1');

  // If the buffer is actually plain text (not a %PDF binary), return it directly
  if (!rawLatin1.startsWith('%PDF-')) {
    return pdfBuffer.toString('utf8').trim();
  }

  // 1. Parse all indirect objects: `<id> <gen> obj ... endobj`
  const objects = new Map<number, { dictText: string; decodedStream: string }>();
  const objRegex = /(\d+)\s+\d+\s+obj\b([\s\S]*?)endobj/g;
  let objMatch: RegExpExecArray | null;

  while ((objMatch = objRegex.exec(rawLatin1)) !== null) {
    const objId = parseInt(objMatch[1], 10);
    const fullBody = objMatch[2];
    const streamMatch = fullBody.match(/^([\s\S]*?)\bstream[ \t]*\r?\n([\s\S]*?)(?:\r?\n)?endstream/);
    if (streamMatch) {
      const dictText = streamMatch[1];
      const streamBody = streamMatch[2];
      const decodedStream = decompressStream(streamBody, dictText);
      objects.set(objId, { dictText, decodedStream });

      // Expand PDF 1.5+ /Type /ObjStm compressed object streams if present
      if (/\/Type\s*\/ObjStm\b/.test(dictText) && decodedStream) {
        const firstMatch = dictText.match(/\/First\s+(\d+)/);
        const nMatch = dictText.match(/\/N\s+(\d+)/);
        if (firstMatch && nMatch) {
          const firstOffset = parseInt(firstMatch[1], 10);
          const count = parseInt(nMatch[1], 10);
          const headerPart = decodedStream.slice(0, firstOffset).trim().split(/\s+/);
          const contentPart = decodedStream.slice(firstOffset);
          const pairs: { id: number; offset: number }[] = [];
          for (let i = 0; i + 1 < headerPart.length && pairs.length < count; i += 2) {
            pairs.push({ id: parseInt(headerPart[i], 10), offset: parseInt(headerPart[i + 1], 10) });
          }
          for (let i = 0; i < pairs.length; i++) {
            const start = pairs[i].offset;
            const end = i + 1 < pairs.length ? pairs[i + 1].offset : contentPart.length;
            if (!objects.has(pairs[i].id)) {
              objects.set(pairs[i].id, { dictText: contentPart.slice(start, end), decodedStream: '' });
            }
          }
        }
      }
    } else {
      objects.set(objId, { dictText: fullBody, decodedStream: '' });
    }
  }

  // 2. Parse all ToUnicode CMap streams
  const cmapsByObjId = new Map<number, CMapTable>();
  const mergedFallbackMap = new Map<number, string>();
  let fallbackIsTwoByte = false;

  for (const [objId, obj] of objects.entries()) {
    if (obj.decodedStream && obj.decodedStream.includes('begincmap')) {
      const cmap = parseToUnicodeCMap(obj.decodedStream);
      if (cmap.map.size > 0) {
        cmapsByObjId.set(objId, cmap);
        if (cmap.isTwoByte) fallbackIsTwoByte = true;
        for (const [k, v] of cmap.map.entries()) {
          if (!mergedFallbackMap.has(k)) {
            mergedFallbackMap.set(k, v);
          }
        }
      }
    }
  }

  const fallbackCMap: CMapTable | undefined =
    mergedFallbackMap.size > 0 ? { map: mergedFallbackMap, isTwoByte: fallbackIsTwoByte } : undefined;

  // 3. Extract diagnostic image XObjects (/Subtype /Image)
  const imagesByObjId = extractPdfImageObjects(rawLatin1);

  // 4. Parse Font objects (/Type /Font)
  const fontsByObjId = new Map<number, FontEncodingInfo>();
  for (const [objId, obj] of objects.entries()) {
    if (/\/Type\s*\/Font\b/.test(obj.dictText) && !/\/Type\s*\/FontDescriptor\b/.test(obj.dictText)) {
      const isTwoByte = /\/Subtype\s*\/Type0\b|\/Identity-H\b/.test(obj.dictText);
      const toUnicodeMatch = obj.dictText.match(/\/ToUnicode\s+(\d+)\s+\d+\s+R/);
      const toUnicodeObjId = toUnicodeMatch ? parseInt(toUnicodeMatch[1], 10) : undefined;
      fontsByObjId.set(objId, {
        isTwoByte,
        toUnicodeObjId,
        cmap: toUnicodeObjId ? cmapsByObjId.get(toUnicodeObjId) : undefined,
      });
    }
  }

  // Helper to extract /Font << /F1 5 0 R ... >> bindings from a dictionary or indirect /Resources object
  const resolvePageFonts = (dictText: string): Map<string, FontEncodingInfo> => {
    const pageFonts = new Map<string, FontEncodingInfo>();
    let resourcesText = dictText;

    const indirectRes = dictText.match(/\/Resources\s+(\d+)\s+\d+\s+R/);
    if (indirectRes) {
      const resObj = objects.get(parseInt(indirectRes[1], 10));
      if (resObj) resourcesText += '\n' + resObj.dictText;
    }

    const indirectFontDict = resourcesText.match(/\/Font\s+(\d+)\s+\d+\s+R/);
    if (indirectFontDict) {
      const fontDictObj = objects.get(parseInt(indirectFontDict[1], 10));
      if (fontDictObj) resourcesText += '\n' + fontDictObj.dictText;
    }

    const fontRefRegex = /\/([A-Za-z0-9_.+-]+)\s+(\d+)\s+\d+\s+R/g;
    let m: RegExpExecArray | null;
    while ((m = fontRefRegex.exec(resourcesText)) !== null) {
      const fontKey = m[1];
      const targetId = parseInt(m[2], 10);
      const fontInfo = fontsByObjId.get(targetId);
      if (fontInfo) {
        pageFonts.set(fontKey, fontInfo);
      }
    }
    return pageFonts;
  };

  // Helper to extract /XObject << /Image23 23 0 R ... >> bindings from a dictionary or indirect /Resources object
  const resolvePageImages = (dictText: string): Map<string, string> => {
    const pageImages = new Map<string, string>();
    let resourcesText = dictText;

    const indirectRes = dictText.match(/\/Resources\s+(\d+)\s+\d+\s+R/);
    if (indirectRes) {
      const resObj = objects.get(parseInt(indirectRes[1], 10));
      if (resObj) resourcesText += '\n' + resObj.dictText;
    }

    const indirectXObjDict = resourcesText.match(/\/XObject\s+(\d+)\s+\d+\s+R/);
    if (indirectXObjDict) {
      const xobjObj = objects.get(parseInt(indirectXObjDict[1], 10));
      if (xobjObj) resourcesText += '\n' + xobjObj.dictText;
    }

    const xobjRefRegex = /\/([A-Za-z0-9_.+-]+)\s+(\d+)\s+\d+\s+R/g;
    let m: RegExpExecArray | null;
    while ((m = xobjRefRegex.exec(resourcesText)) !== null) {
      const imgKey = m[1];
      const targetId = parseInt(m[2], 10);
      const imgUri = imagesByObjId.get(targetId);
      if (imgUri) {
        pageImages.set(imgKey, imgUri);
      }
    }
    return pageImages;
  };

  // 5. Extract text page-by-page using /Type /Page objects
  const pageChunks: string[] = [];
  for (const [, obj] of objects.entries()) {
    if (/\/Type\s*\/Page\b(?!s)/.test(obj.dictText)) {
      const pageFonts = resolvePageFonts(obj.dictText);
      const pageImages = resolvePageImages(obj.dictText);
      const contentObjIds: number[] = [];

      const arrayContents = obj.dictText.match(/\/Contents\s*\[([\s\S]*?)\]/);
      if (arrayContents) {
        const refRegex = /(\d+)\s+\d+\s+R/g;
        let r: RegExpExecArray | null;
        while ((r = refRegex.exec(arrayContents[1])) !== null) {
          contentObjIds.push(parseInt(r[1], 10));
        }
      } else {
        const singleContents = obj.dictText.match(/\/Contents\s+(\d+)\s+\d+\s+R/);
        if (singleContents) {
          contentObjIds.push(parseInt(singleContents[1], 10));
        }
      }

      if (contentObjIds.length > 0) {
        const combinedStream = contentObjIds
          .map((id) => objects.get(id)?.decodedStream || '')
          .filter(Boolean)
          .join('\n');
        if (combinedStream.includes('BT') && combinedStream.includes('ET')) {
          let pageText = extractTextFromContentStream(combinedStream, pageFonts, fallbackCMap, pageImages);

          // If this page has images, but the Do operator was not inline or was inside a form XObject:
          // Check if any question stem on this page explicitly refers to an image/figure
          if (pageImages.size > 0 && !pageText.includes('[ATTACHED_FIGURE:')) {
            const firstImg = pageImages.values().next().value;
            if (
              firstImg &&
              /\b(?:figure\s+below|image\s+below|shown\s+in\s+the\s+(?:figure|image|photograph|micrograph)|blood\s+smear\s+shown|reference\s+kinetic\s+pattern|in\s+the\s+graph|curve\s+shown)\b/i.test(
                pageText
              )
            ) {
              pageText = pageText.replace(
                /(\b(?:figure\s+below|image\s+below|shown\s+in\s+the\s+(?:figure|image|photograph|micrograph)|blood\s+smear\s+shown|reference\s+kinetic\s+pattern[^\n.]*|in\s+the\s+graph[^\n.]*|curve\s+shown)[^\n]*)/i,
                `$1\n[ATTACHED_FIGURE: ${firstImg}]`
              );
            }
          }

          if (pageText.trim()) {
            pageChunks.push(pageText.trim());
          }
        }
      }
    }
  }

  // 5. Fallback for synthetic/minimal PDFs without /Type /Page dictionaries
  if (pageChunks.length === 0) {
    const emptyFontMap = new Map<string, FontEncodingInfo>();
    if (objects.size > 0) {
      for (const [, obj] of objects.entries()) {
        if (
          obj.decodedStream &&
          !obj.decodedStream.includes('begincmap') &&
          /\bBT\b/.test(obj.decodedStream) &&
          /\bET\b/.test(obj.decodedStream)
        ) {
          const text = extractTextFromContentStream(obj.decodedStream, emptyFontMap, fallbackCMap);
          if (text.trim()) {
            pageChunks.push(text.trim());
          }
        }
      }
    } else {
      const streamRegex = /stream[ \t]*\r?\n([\s\S]*?)(?:\r?\n)?endstream/g;
      let match: RegExpExecArray | null;
      while ((match = streamRegex.exec(rawLatin1)) !== null) {
        const decodedStream = decompressStream(match[1], '/FlateDecode');
        if (/\bBT\b/.test(decodedStream) && /\bET\b/.test(decodedStream)) {
          const text = extractTextFromContentStream(decodedStream, emptyFontMap, fallbackCMap);
          if (text.trim()) {
            pageChunks.push(text.trim());
          }
        }
      }
    }
  }

  return pageChunks
    .join('\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
