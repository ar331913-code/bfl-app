import { db } from '../db';
import { Customer, Loan, Payment, RepaymentSchedule } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

export class GoogleDriveBackupService {
  /**
   * Generates a complete Cloud & Google Drive Export Package containing:
   * 1. All Customers with full contact & Ghana Card info
   * 2. All Customer Profile Photos and Ghana Card images
   * 3. All Loans, Repayment Schedules, and Payments
   */
  static async generateCompleteBackupPackage(): Promise<{
    jsonData: string;
    blob: Blob;
    filename: string;
    customerCount: number;
    photosCount: number;
  }> {
    const customers = await db.customers.toArray();
    const loans = await db.loans.toArray();
    const schedules = await db.repaymentSchedules.toArray();
    const payments = await db.payments.toArray();
    const settings = await db.settings.toArray();
    const auditLogs = await db.auditLogs.toArray();

    // Count photos
    let photosCount = 0;
    customers.forEach(c => {
      if (c.photoUrl) photosCount++;
      if (c.ghanaCardFrontUrl) photosCount++;
      if (c.ghanaCardBackUrl) photosCount++;
    });

    const exportObject = {
      system: 'B-F-L Mobile Loan Management System',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      summary: {
        totalCustomers: customers.length,
        totalLoans: loans.length,
        totalPhotos: photosCount,
        businessName: settings[0]?.businessName || 'B-F-L Micro Credit'
      },
      customers,
      loans,
      repaymentSchedules: schedules,
      payments,
      settings: settings[0] || {},
      auditLogs
    };

    const jsonData = JSON.stringify(exportObject, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const filename = `BFL_GoogleDrive_Backup_${new Date().toISOString().slice(0, 10)}.json`;

    return {
      jsonData,
      blob,
      filename,
      customerCount: customers.length,
      photosCount
    };
  }

  /**
   * Transport backup directly to Google Drive via native Web Share sheet (Mobile/Desktop)
   * or direct download to save into Google Drive folder
   */
  static async exportToGoogleDrive(): Promise<{ success: boolean; message: string }> {
    try {
      const { blob, filename, customerCount, photosCount } = await this.generateCompleteBackupPackage();

      // Check if Web Share API with files is supported (iOS Safari / Android Chrome)
      const file = new File([blob], filename, { type: 'application/json' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'B-F-L Customer & Loan Database Backup',
          text: `Backup containing ${customerCount} registered customer(s) and ${photosCount} customer photo(s). Save to Google Drive or Cloud Storage.`,
          files: [file]
        });
        return { 
          success: true, 
          message: `Backup of ${customerCount} client(s) with photos successfully shared! Select 'Save to Google Drive' in the menu.` 
        };
      }

      // Fallback: Direct download so the operator can drop it into Google Drive
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      // Open Google Drive upload page in a new tab for convenience
      const openDrive = window.confirm(
        `Backup file '${filename}' downloaded!\n\nContaining ${customerCount} registered clients and ${photosCount} photos.\n\nWould you like to open Google Drive in a new tab to upload it now?`
      );

      if (openDrive) {
        window.open('https://drive.google.com/', '_blank');
      }

      return { 
        success: true, 
        message: `Database and pictures packaged (${customerCount} clients, ${photosCount} photos). Ready for Google Drive upload!` 
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: true, message: 'Share canceled.' };
      }
      return { success: false, message: err.message || 'Failed to export to Google Drive.' };
    }
  }
}
