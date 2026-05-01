import { http, type ApiResponse } from './http';
import type { CategoryNode, CategoryPayload, TagItem, TagPayload } from '@/types/taxonomy';

export const taxonomyApi = {
  async getCategories(): Promise<CategoryNode[]> {
    const response = await http.get<unknown, ApiResponse<{ categories: CategoryNode[] }>>('/categories');
    return response.data.categories;
  },

  async createCategory(payload: CategoryPayload): Promise<CategoryNode> {
    const response = await http.post<unknown, ApiResponse<{ category: CategoryNode }>>('/admin/categories', payload);
    return response.data.category;
  },

  async updateCategory(id: string, payload: CategoryPayload): Promise<CategoryNode> {
    const response = await http.put<unknown, ApiResponse<{ category: CategoryNode }>>(`/admin/categories/${id}`, payload);
    return response.data.category;
  },

  async deleteCategory(id: string): Promise<void> {
    await http.delete<unknown, ApiResponse<{ id: string }>>(`/admin/categories/${id}`);
  },

  async getTags(): Promise<TagItem[]> {
    const response = await http.get<unknown, ApiResponse<{ tags: TagItem[] }>>('/tags');
    return response.data.tags;
  },

  async createTag(payload: TagPayload): Promise<TagItem> {
    const response = await http.post<unknown, ApiResponse<{ tag: TagItem }>>('/tags', payload);
    return response.data.tag;
  },

  async updateTag(id: string, payload: TagPayload): Promise<TagItem> {
    const response = await http.put<unknown, ApiResponse<{ tag: TagItem }>>(`/admin/tags/${id}`, payload);
    return response.data.tag;
  },

  async deleteTag(id: string): Promise<void> {
    await http.delete<unknown, ApiResponse<{ id: string }>>(`/admin/tags/${id}`);
  },
};
