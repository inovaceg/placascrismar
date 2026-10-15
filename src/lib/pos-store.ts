export type PaymentMethod = 'cash' | 'pix' | 'debit' | 'credit' | 'food_voucher' | 'employee_voucher';
export const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'debit', label: 'Cartão de débito' },
  { value: 'credit', label: 'Cartão de crédito' },
  { value: 'food_voucher', label: 'Alimentação' },
  { value: 'employee_voucher', label: 'Vale funcionário' },
];

export type PosSaleItem = { barcode: string; reducedCode: string; description: string; quantity: number; unitPrice: number; lineTotal: number };
export type PosPayment = { method: PaymentMethod; amount: number };
export type PosSale = { id: string; saleNumber: number; createdAt: string; subtotal: number; discount: number; total: number; items: PosSaleItem[]; payments: PosPayment[] };
export type PosDayClosure = { closedAt: string; total: number; couponCount: number; paymentTotals: Record<string, number> };
export type PosDailyReport = { businessDate: string; total: number; couponCount: number; paymentTotals: Record<string, number>; sales: PosSale[]; closure: PosDayClosure | null };

const endpoint = 'https://wiaqzkueanlwcoyzuupl.supabase.co/rest/v1/rpc';
const apiKey = 'sb_publishable_pnuhuR44AzUo_WxbUgmRuA_lPDNgty5';

async function callFunction<T>(name: string, body: unknown): Promise<T> {
  const response = await fetch(`${endpoint}/${name}`, {
    method: 'POST',
    headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(bodyText || 'Não foi possível acessar os dados do caixa.');
  }
  return await response.json() as T;
}

export function savePosSale(businessDate: string, items: Omit<PosSaleItem, 'lineTotal'>[], payments: PosPayment[], discount: number) {
  return callFunction<{ id: string; saleNumber: number; businessDate: string; subtotal: number; discount: number; total: number }>('create_pos_sale', {
    p_business_date: businessDate,
    p_items: items,
    p_payments: payments,
    p_discount: discount,
  });
}

export function loadDailyReport(businessDate: string) {
  return callFunction<PosDailyReport>('get_pos_daily_report', { p_business_date: businessDate });
}

export function closePosDay(businessDate: string) {
  return callFunction<{ businessDate: string; closedAt: string; total: number; couponCount: number; paymentTotals: Record<string, number> }>('close_pos_day', { p_business_date: businessDate });
}
