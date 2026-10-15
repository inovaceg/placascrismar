import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paymentMethods, type PaymentMethod, type PosPayment } from '@/lib/pos-store';

export type PosReceiptData = {
  saleNumber: number;
  createdAt: string;
  items: { barcode: string; description: string; quantity: number; unitPrice: number }[];
  payments: PosPayment[];
  total: number;
};

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function paymentLabel(method: PaymentMethod) {
  return paymentMethods.find(item => item.value === method)?.label ?? method;
}

export function PosReceipt({ receipt, onClose }: { receipt: PosReceiptData; onClose: () => void }) {
  return <div className="pos-receipt-backdrop">
    <section className="pos-receipt-dialog" role="dialog" aria-modal="true" aria-labelledby="pos-receipt-title">
      <div className="pos-receipt-actions"><strong>Cupom pronto para impressão</strong><Button variant="ghost" size="icon" aria-label="Fechar comprovante" onClick={onClose}><X /></Button></div>
      <article className="pos-receipt">
        <header><h2 id="pos-receipt-title">COMPROVANTE DE VENDA</h2><p>DOCUMENTO NÃO FISCAL</p><p>Cupom nº {receipt.saleNumber}</p><p>{new Date(receipt.createdAt).toLocaleString('pt-BR')}</p></header>
        <div className="pos-receipt-rule" />
        <div className="pos-receipt-items">{receipt.items.map((item, index) => <div className="pos-receipt-item" key={`${item.barcode}-${index}`}><strong>{item.description || item.barcode}</strong><div><span>{item.quantity} × {currency.format(item.unitPrice)}</span><b>{currency.format(item.quantity * item.unitPrice)}</b></div></div>)}</div>
        <div className="pos-receipt-rule" />
        <div className="pos-receipt-total"><span>TOTAL</span><strong>{currency.format(receipt.total)}</strong></div>
        <div className="pos-receipt-payments"><strong>FORMA DE PAGAMENTO</strong>{receipt.payments.map((payment, index) => <div key={`${payment.method}-${index}`}><span>{paymentLabel(payment.method)}</span><b>{currency.format(payment.amount)}</b></div>)}</div>
        <div className="pos-receipt-rule" />
        <footer>Obrigado pela preferência!</footer>
      </article>
      <div className="pos-receipt-actions"><Button variant="outline" onClick={onClose}>Fechar</Button><Button onClick={() => window.print()}><Printer />Imprimir cupom</Button></div>
    </section>
  </div>;
}
