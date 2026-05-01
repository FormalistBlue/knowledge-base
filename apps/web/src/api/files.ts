import { http, type ApiResponse } from './http';
import type { UploadedFile } from '@/types/files';

const upload = async (url: string, file: File): Promise<UploadedFile> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await http.post<unknown, ApiResponse<{ file: UploadedFile }>>(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120_000,
  });
  return response.data.file;
};

export const filesApi = {
  uploadImage(file: File) {
    return upload('/files/images', file);
  },

  uploadAttachment(file: File) {
    return upload('/files/attachments', file);
  },

  async previewBlob(id: string): Promise<Blob> {
    return http.get<unknown, Blob>(`/files/${id}/preview`, { responseType: 'blob' });
  },

  async downloadBlob(id: string): Promise<Blob> {
    return http.get<unknown, Blob>(`/files/${id}/download`, { responseType: 'blob' });
  },
};
