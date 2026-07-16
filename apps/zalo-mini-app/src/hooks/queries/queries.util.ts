import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../utils/api';
import type { IProduct, IProductCategory, INotification } from '../../App.type';

export function useInfiniteProducts(limit = 10) {
  return useInfiniteQuery({
    queryKey: ['products'],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await apiRequest<any>(`/products?page=${pageParam}&limit=${limit}`);
      return res;
    },
    getNextPageParam: (lastPage: any) => {
      const meta = lastPage?.meta;
      if (meta && meta.page < meta.totalPages) {
        return meta.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiRequest<IProductCategory[]>('/categories');
      return res.map((cat) => ({ ...cat, icon: undefined }));
    },
  });
}

export function useBanners() {
  return useQuery({
    queryKey: ['banners'],
    queryFn: () => apiRequest<any[]>('/banners'),
  });
}

export function useNotifications(zaloUserId?: string) {
  return useQuery({
    queryKey: ['notifications', zaloUserId || 'guest'],
    queryFn: () => apiRequest<INotification[]>('/notifications'),
    refetchInterval: zaloUserId ? 5000 : false, // Only poll if logged in
    enabled: !!zaloUserId, // Only run the query if a user is logged in
  });
}

export function useAllProducts() {
  return useQuery({
    queryKey: ['allProducts'],
    queryFn: async () => {
      const res = await apiRequest<any>('/products?page=1&limit=200');
      return (res.data || res) as IProduct[];
    },
  });
}
