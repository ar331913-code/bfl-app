import { format, parseISO, isValid } from 'date-fns';

// Format Ghana Cedi currency
export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'GH₵0.00';
  }
  return `GH₵${amount.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

// Format Phone Number to Ghanaian Standard
export function formatGhanaPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('233') && cleaned.length === 12) {
    return `+233 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  
  return phone;
}

// Auto-format Ghana Card string (GHA-XXXXXXXXX-X)
export function formatGhanaCardInput(input: string): string {
  if (!input) return 'GHA-';
  let cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  if (cleaned.startsWith('GHA')) {
    cleaned = cleaned.slice(3);
  }
  
  if (cleaned.length === 0) return 'GHA-';
  if (cleaned.length <= 9) return `GHA-${cleaned}`;
  return `GHA-${cleaned.slice(0, 9)}-${cleaned.slice(9, 10)}`;
}

// Validate Ghana Card (Format: GHA-XXXXXXXXX-X or relaxed valid length)
export function isValidGhanaCard(cardNo: string): boolean {
  if (!cardNo) return false;
  const trimmed = cardNo.trim().toUpperCase();
  const strictRegex = /^GHA-\d{9}-\d$/i;
  if (strictRegex.test(trimmed)) return true;
  // Relaxed format: allows GHA followed by 8-10 digits or characters
  const relaxedRegex = /^GHA-[A-Z0-9]{8,11}-[A-Z0-9]$/i;
  return relaxedRegex.test(trimmed) || trimmed.length >= 10;
}

// Mask Ghana Card for privacy (e.g. GHA-••••••••1-9)
export function maskGhanaCard(cardNo: string, showFull = false): string {
  if (!cardNo) return '';
  if (showFull) return cardNo;
  if (cardNo.length < 8) return cardNo;
  const parts = cardNo.split('-');
  if (parts.length === 3) {
    const middle = parts[1];
    const maskedMiddle = '••••••' + middle.slice(-3);
    return `${parts[0]}-${maskedMiddle}-${parts[2]}`;
  }
  return cardNo.slice(0, 4) + '••••••••' + cardNo.slice(-3);
}

// Format Dates nicely
export function formatDate(dateStr: string | undefined | null, formatPattern = 'dd MMM yyyy'): string {
  if (!dateStr) return '—';
  try {
    const parsed = typeof dateStr === 'string' && (dateStr.includes('T') || dateStr.includes('-'))
      ? parseISO(dateStr) 
      : new Date(dateStr);
      
    if (!isValid(parsed)) return dateStr;
    return format(parsed, formatPattern);
  } catch {
    return dateStr || '—';
  }
}

// Format Date and Time
export function formatDateTime(dateStr: string | undefined | null): string {
  return formatDate(dateStr, 'dd MMM yyyy, hh:mm a');
}
