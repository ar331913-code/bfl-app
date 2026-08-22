import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Customer, Loan, RepaymentSchedule, Payment, SystemSettings } from '../types';
import { formatCurrency, formatDate, formatGhanaPhone } from '../utils/formatters';
import { format } from 'date-fns';

export function downloadCSV(filename: string, rows: (string | number)[][], headers: string[]): void {
  const csvContent = 'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generate Printable/Downloadable Loan Agreement & Schedule PDF
export function generateLoanStatementPDF(
  customer: Customer,
  loan: Loan,
  schedules: RepaymentSchedule[],
  payments: Payment[],
  settings?: SystemSettings
): void {
  const doc = new jsPDF();
  const businessName = settings?.businessName || 'B-F-L LOAN MANAGEMENT';
  const businessPhone = settings?.businessPhone || '+233 24 412 3456';
  const businessAddress = settings?.businessAddress || 'Accra, Ghana';

  // 1. Header Banner
  doc.setFillColor(6, 78, 59); // Forest Brand Color
  doc.rect(0, 0, 210, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(businessName, 14, 15);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Official Loan Statement & Repayment Schedule | ${businessPhone} | ${businessAddress}`, 14, 23);

  // 2. Customer & Loan Meta Information
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER INFORMATION', 14, 40);
  doc.text('LOAN SUMMARY', 115, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  // Customer Box
  doc.text(`Name: ${customer.fullName}`, 14, 46);
  doc.text(`Customer ID: ${customer.customerId}`, 14, 52);
  doc.text(`Customer Type: ${customer.customerType.toUpperCase()}`, 14, 58);
  doc.text(`Phone: ${formatGhanaPhone(customer.primaryPhone)}`, 14, 64);
  doc.text(`Ghana Card: ${customer.ghanaCardNumber}`, 14, 70);
  doc.text(`Address: ${customer.residentialAddress}`, 14, 76);

  // Loan Box
  doc.text(`Loan ID: ${loan.loanId}`, 115, 46);
  doc.text(`Disbursement Date: ${formatDate(loan.startDate)}`, 115, 52);
  doc.text(`Principal Lent: ${formatCurrency(loan.principalAmount)}`, 115, 58);
  doc.text(`Interest (${loan.interestRate}% ${loan.interestType}): ${formatCurrency(loan.totalInterest)}`, 115, 64);
  doc.text(`Total Repayment Expected: ${formatCurrency(loan.totalRepayment)}`, 115, 70);
  doc.text(`Total Amount Paid: ${formatCurrency(loan.totalPaid)}`, 115, 76);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(loan.outstandingBalance > 0 ? 185 : 5, loan.outstandingBalance > 0 ? 28 : 150, loan.outstandingBalance > 0 ? 28 : 105);
  doc.text(`Outstanding Balance: ${formatCurrency(loan.outstandingBalance)}`, 115, 83);
  doc.setTextColor(30, 41, 59);

  // 3. Repayment Schedule Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('SCHEDULED REPAYMENT INSTALLMENTS', 14, 94);

  const tableData = schedules.map(s => [
    `#${s.installmentNumber}`,
    formatDate(s.dueDate),
    formatCurrency(s.expectedAmount),
    formatCurrency(s.amountPaid),
    formatCurrency(s.remainingBalance),
    s.status.toUpperCase()
  ]);

  autoTable(doc, {
    startY: 98,
    head: [['Inst #', 'Due Date', 'Expected (GH₵)', 'Paid (GH₵)', 'Balance (GH₵)', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  // Footer Note
  const finalY = (doc as any).lastAutoTable.finalY || 240;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on ${format(new Date(), 'dd MMMM yyyy, hh:mm a')} by B-F-L Mobile System. Authorized Operator Signature: _______________________`, 14, Math.min(285, finalY + 15));

  doc.save(`${loan.loanId}_Statement_${customer.fullName.replace(/\s+/g, '_')}.pdf`);
}

// Generate Printable Single Payment Receipt PDF
export function generatePaymentReceiptPDF(
  customer: Customer,
  loan: Loan,
  payment: Payment,
  settings?: SystemSettings
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [100, 150] // Mini thermal receipt layout
  });

  const businessName = settings?.businessName || 'B-F-L MICRO CREDIT';
  const businessPhone = settings?.businessPhone || '+233 24 412 3456';

  // Receipt Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(6, 78, 59);
  doc.text(businessName, 50, 12, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('OFFICIAL PAYMENT RECEIPT', 50, 18, { align: 'center' });
  doc.text(`Tel: ${businessPhone}`, 50, 23, { align: 'center' });

  // Dashed Line
  doc.setLineDashPattern([1, 1], 0);
  doc.line(8, 27, 92, 27);

  // Receipt Body
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  let y = 34;

  const addReceiptLine = (label: string, value: string, isBold = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.text(label, 8, y);
    doc.text(value, 92, y, { align: 'right' });
    y += 6;
  };

  addReceiptLine('Receipt No:', payment.paymentId);
  addReceiptLine('Date & Time:', payment.paymentDate);
  addReceiptLine('Customer:', customer.fullName);
  addReceiptLine('Customer ID:', customer.customerId);
  addReceiptLine('Loan ID:', loan.loanId);
  addReceiptLine('Payment Mode:', payment.paymentMethod.toUpperCase());
  if (payment.referenceNumber) {
    addReceiptLine('Ref/Txn No:', payment.referenceNumber);
  }

  y += 2;
  doc.line(8, y, 92, y);
  y += 6;

  addReceiptLine('AMOUNT PAID:', formatCurrency(payment.amountPaid), true);
  addReceiptLine('New Outstanding:', formatCurrency(loan.outstandingBalance), true);

  y += 6;
  doc.line(8, y, 92, y);
  y += 8;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Thank you for your prompt repayment!', 50, y, { align: 'center' });
  y += 4;
  doc.text('Keep this receipt for your records.', 50, y, { align: 'center' });

  doc.save(`Receipt_${payment.paymentId}.pdf`);
}
