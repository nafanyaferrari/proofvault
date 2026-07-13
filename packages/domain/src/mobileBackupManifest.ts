export type MobileBackupAttachmentScope = 'inventory-item' | 'incident-item';

export interface MobileBackupAttachmentRow {
  id: string;
  scope: MobileBackupAttachmentScope;
  attachmentType: string;
  localUri: string;
  mimeType?: string;
  originalName?: string;
  inventoryItemId?: string;
  inventoryItemName?: string;
  incidentId?: string;
  incidentTitle?: string;
  createdAt: string;
}

export interface MobileBackupManifest {
  format: 'proofvault-mobile-attachment-manifest';
  version: 1;
  generatedAt: string;
  summary: {
    totalAttachments: number;
    inventoryAttachments: number;
    incidentAttachments: number;
  };
  instructions: string[];
  attachments: MobileBackupAttachmentRow[];
}

export function createMobileBackupManifest(attachments: MobileBackupAttachmentRow[], generatedAt = new Date().toISOString()): MobileBackupManifest {
  const inventoryAttachments = attachments.filter(attachment => attachment.scope === 'inventory-item').length;
  const incidentAttachments = attachments.filter(attachment => attachment.scope === 'incident-item').length;
  return {
    format: 'proofvault-mobile-attachment-manifest',
    version: 1,
    generatedAt,
    summary: { totalAttachments: attachments.length, inventoryAttachments, incidentAttachments },
    instructions: [
      'Export this manifest with the SQLite database backup when preparing a device migration.',
      'The current database backup preserves attachment records and local file references, but it does not embed app-private photo or document binaries.',
      'A future portable backup should copy each localUri listed here into an encrypted archive and restore files before replacing database references.'
    ],
    attachments: [...attachments].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
  };
}
