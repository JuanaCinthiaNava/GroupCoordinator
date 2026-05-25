// Geist Sans font loader for next/og.
//
// CHOSEN PATH: fetch TTF binaries via the Google Fonts CSS API. We resolve
// the CSS endpoint for "Geist:wght@400;600;700" once, parse out the TTF URLs
// from the @font-face declarations, then fetch each TTF and cache the
// ArrayBuffer in module-scope memory.
//
// Why TTF specifically: @vercel/og's font parser (next/og's underlying
// satori) accepts TTF and OTF only — WOFF2 is rejected with
// "Unsupported OpenType signature wOF2". Google Fonts can serve TTF when
// requested with a user-agent that doesn't advertise WOFF2 support; we
// override the UA in our fetch.
//
// Why not bundle a local geist npm package: it doesn't ship TTF (only WOFF2)
// and bundling fonts inflates the route's cold start; fetch-once-and-cache
// gives us the same behavior with no package addition.
//
// Fallback contract: if any step fails (Google Fonts unreachable, parse
// fails, etc.), loadGeistSans returns three zero-byte ArrayBuffers and the
// caller skips the `fonts` option — the resulting ImageResponse falls back
// to next/og's bundled system font, which still produces a readable PNG.

interface GeistSansFonts {
  regular: ArrayBuffer;
  semibold: ArrayBuffer;
  bold: ArrayBuffer;
}

let cached: GeistSansFonts | null = null;

const GOOGLE_FONTS_CSS =
  'https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&display=swap';
// User-agent string that ONLY advertises TTF support (no WOFF2). Google Fonts
// then serves TTF format1.4 URLs in the @font-face declarations.
const TTF_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.6; rv:2.0.1) Gecko/20100101 Firefox/4.0.1';

async function fetchCssFontUrls(weights: ReadonlyArray<number>): Promise<Record<number, string>> {
  const res = await fetch(GOOGLE_FONTS_CSS, { headers: { 'User-Agent': TTF_UA } });
  if (!res.ok) throw new Error(`google fonts css fetch failed: ${res.status}`);
  const css = await res.text();
  const out: Record<number, string> = {};
  // The CSS contains repeated @font-face blocks. Each block has
  // font-weight: NNN; ... src: url(...) format('truetype'); — we pluck pairs.
  const blocks = css.split('@font-face').slice(1);
  for (const block of blocks) {
    const weightMatch = block.match(/font-weight:\s*(\d+)/);
    const urlMatch = block.match(/src:\s*url\(([^)]+)\)/);
    if (!weightMatch || !urlMatch) continue;
    const weight = Number(weightMatch[1]);
    if (weights.includes(weight) && !out[weight]) {
      out[weight] = (urlMatch[1] ?? '').replace(/^['"]|['"]$/g, '');
    }
  }
  return out;
}

async function fetchBinary(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`font fetch failed: ${url} -> ${res.status}`);
  return await res.arrayBuffer();
}

export async function loadGeistSans(): Promise<GeistSansFonts> {
  if (cached) return cached;
  try {
    const urls = await fetchCssFontUrls([400, 600, 700]);
    const regularUrl = urls[400];
    const semiboldUrl = urls[600];
    const boldUrl = urls[700];
    if (!regularUrl || !semiboldUrl || !boldUrl) {
      throw new Error('missing weight urls');
    }
    const [regular, semibold, bold] = await Promise.all([
      fetchBinary(regularUrl),
      fetchBinary(semiboldUrl),
      fetchBinary(boldUrl),
    ]);
    cached = { regular, semibold, bold };
    return cached;
  } catch {
    // Fallback: empty buffers so ImageResponse falls back to its bundled font.
    const empty = new ArrayBuffer(0);
    return { regular: empty, semibold: empty, bold: empty };
  }
}

export function clearGeistSansCache(): void {
  cached = null;
}
