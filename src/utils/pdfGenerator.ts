import { jsPDF } from 'jspdf';
import { Customer, Loan, Payment } from '../types';
import { formatCurrency, formatDate } from './formatters';

export function generatePaymentReceiptPDF(customer: Customer, loan: Loan, payment: Payment): void {
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 160] // Standard 80mm thermal receipt size
  });

  // Business Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('B-F-L', 40, 12, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('OFFICIAL PAYMENT RECEIPT', 40, 17, { align: 'center' });
  doc.text('----------------------------------------------------', 40, 21, { align: 'center' });

  // Receipt Meta
  doc.setFontSize(8);
  doc.text(`Receipt No: ${payment.paymentId}`, 6, 26);
  doc.text(`Date: ${formatDate(payment.paymentDate)}`, 6, 31);
  doc.text(`Borrower: ${customer.fullName}`, 6, 36);
  doc.text(`Phone: ${customer.primaryPhone}`, 6, 41);
  doc.text(`Loan ID: ${payment.loanId}`, 6, 46);

  doc.text('----------------------------------------------------', 40, 50, { align: 'center' });

  // Payment Breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`AMOUNT PAID: ${formatCurrency(payment.amountPaid)}`, 6, 57);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Payment Mode: ${payment.paymentMethod.toUpperCase()}`, 6, 63);
  if (payment.referenceNumber) {
    doc.text(`Ref / MoMo ID: ${payment.referenceNumber}`, 6, 68);
  }

  doc.text('----------------------------------------------------', 40, 73, { align: 'center' });

  // Loan Balance Status
  const isSettled = loan.status === 'completed' || loan.outstandingBalance <= 0.01;
  doc.setFont('helvetica', 'bold');
  if (isSettled) {
    doc.setTextColor(0, 150, 0);
    doc.text('STATUS: 100% FULLY PAID OFF! 🎉', 6, 80);
    doc.setTextColor(0, 0, 0);
    doc.text('Remaining Balance: GH₵0.00', 6, 86);
  } else {
    doc.text(`Remaining Balance: ${formatCurrency(loan.outstandingBalance)}`, 6, 80);
    doc.text(`Total Repaid to Date: ${formatCurrency(loan.totalPaid)}`, 6, 86);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('----------------------------------------------------', 40, 93, { align: 'center' });
  doc.text('Thank you for doing business with B-F-L!', 40, 98, { align: 'center' });
  doc.text('Keep this receipt safe for your records.', 40, 103, { align: 'center' });

  doc.save(`BFL_Receipt_${payment.paymentId}.pdf`);
}
