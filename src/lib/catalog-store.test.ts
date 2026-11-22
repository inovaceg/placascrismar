import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const product = { barcode: '7891234567890', reducedCode: '123', description: 'Arroz', price: '12,50' };

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe('importação do catálogo', () => {
  it('mantém produtos consultáveis na sessão quando o Supabase falha', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);
    const { replaceCatalog, loadCatalog } = await import('./catalog-store');
    await expect(replaceCatalog([product])).rejects.toThrow('Failed to fetch');
    expect(await loadCatalog()).toEqual([product]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('não apaga o catálogo ao importar uma lista vazia', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => 1 });
    vi.stubGlobal('fetch', fetchMock);
    const { replaceCatalog, loadCatalog } = await import('./catalog-store');
    await replaceCatalog([product]);
    await expect(replaceCatalog([])).rejects.toThrow('Nenhum produto encontrado');
    expect(await loadCatalog()).toEqual([product]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('remove códigos duplicados e salva em lotes de 500', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => 500 });
    vi.stubGlobal('fetch', fetchMock);
    const { replaceCatalog, loadCatalog } = await import('./catalog-store');
    const products = Array.from({ length: 501 }, (_, index) => ({ ...product, barcode: String(index) }));
    expect(await replaceCatalog([...products, { ...product, barcode: '0' }])).toBe(501);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const first = JSON.parse(fetchMock.mock.calls[0]![1].body);
    const second = JSON.parse(fetchMock.mock.calls[1]![1].body);
    expect(first.items).toHaveLength(500);
    expect(first.reset).toBe(true);
    expect(second.items).toHaveLength(1);
    expect(second.reset).toBe(false);
    expect(await loadCatalog()).toHaveLength(501);
  });

  it('não substitui uma importação nova por uma consulta antiga', async () => {
    let finishLoad!: (value: unknown) => void;
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => new Promise(resolve => { finishLoad = resolve; }))
      .mockResolvedValue({ ok: true, json: async () => 1 }));
    const { replaceCatalog, loadCatalog } = await import('./catalog-store');
    const pendingLoad = loadCatalog();
    await replaceCatalog([product]);
    finishLoad({ ok: true, json: async () => [] });
    expect(await pendingLoad).toEqual([product]);
  });
});
