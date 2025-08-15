import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query keys for consistent caching
export const queryKeys = {
  // Auth
  auth: {
    user: ['auth', 'user'] as const,
    profile: (userId: string) => ['auth', 'profile', userId] as const,
  },
  
  // Restaurants
  restaurants: {
    all: ['restaurants'] as const,
    byId: (id: string) => ['restaurants', id] as const,
    menu: (id: string) => ['restaurants', id, 'menu'] as const,
  },
  
  // Orders
  orders: {
    all: ['orders'] as const,
    byId: (id: string) => ['orders', id] as const,
    byRestaurant: (restaurantId: string) => ['orders', 'restaurant', restaurantId] as const,
    byUser: (userId: string) => ['orders', 'user', userId] as const,
  },
  
  // Delivery
  delivery: {
    jobs: (restaurantId: string) => ['delivery', 'jobs', restaurantId] as const,
    job: (jobId: string) => ['delivery', 'job', jobId] as const,
    stops: (jobId: string) => ['delivery', 'stops', jobId] as const,
  },
} as const;
