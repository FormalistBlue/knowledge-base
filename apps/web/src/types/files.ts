export type AttachmentUsageType = 'IMAGE' | 'ATTACHMENT';
export type AttachmentStatus = 'TEMP' | 'BOUND';

export type UploadedFile = {
  id: string;
  url: string;
  downloadUrl: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  usageType: AttachmentUsageType;
  status: AttachmentStatus;
  extension: string;
  createdAt: string;
  boundAt: string | null;
};
