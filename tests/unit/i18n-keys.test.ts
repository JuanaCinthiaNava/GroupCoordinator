import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Verifies that the next-intl message catalogs for es/en/pt share an identical
// key shape, and that a handful of anchor keys exist exactly where the UI-SPEC
// promises them. D-20 says en + pt are stubbed clones of es in Phase 1; this
// guarantees a missing key in one locale never sneaks past CI.

const MESSAGES_DIR = path.resolve(__dirname, '..', '..', 'src', 'lib', 'i18n', 'messages');

function load(locale: string): Record<string, unknown> {
  const raw = fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), 'utf8');
  return JSON.parse(raw);
}

function collectKeyPaths(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return prefix ? [prefix] : [];
  const out: string[] = [];
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    out.push(...collectKeyPaths(value, prefix ? `${prefix}.${key}` : key));
  }
  return out.sort();
}

function readLeaf(obj: unknown, dotted: string): unknown {
  return dotted
    .split('.')
    .reduce<unknown>((acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined), obj);
}

describe('i18n message catalog parity', () => {
  const es = load('es');
  const en = load('en');
  const pt = load('pt');

  it('exposes identical key paths across es / en / pt', () => {
    const esKeys = collectKeyPaths(es);
    expect(collectKeyPaths(en)).toEqual(esKeys);
    expect(collectKeyPaths(pt)).toEqual(esKeys);
  });

  it('contains the anchor keys promised by UI-SPEC', () => {
    expect(readLeaf(es, 'plan.view.empty_heading')).toBe(
      '{Creator} sigue agregando detalles. Vuelve pronto.'
    );
    expect(readLeaf(es, 'plan.share_dialog.title')).toBe('¡Plan creado! Compártelo con el grupo');
    expect(readLeaf(es, 'auth.google_button')).toBe('Continuar con Google');
    expect(readLeaf(es, 'errors.token_revoked')).toBeTruthy();
  });

  it('uses {Creator} (capital C) verbatim per D-08', () => {
    expect(readLeaf(es, 'plan.view.empty_heading')).toMatch(/\{Creator\}/);
  });
});
