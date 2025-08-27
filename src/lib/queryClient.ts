'use client';

import { QueryClient } from '@tanstack/react-query';
import { User } from 'oidc-client-ts';

// Default query function that handles authentication
export const createAuthenticatedQueryFn = (getUser: () => User | null, signinSilent: () => Promise<User | void>) => {
  return async ({ queryKey, signal }: { queryKey: readonly unknown[], signal?: AbortSignal }) => {
    const user = getUser();
    
    if (!user?.access_token) {
      throw new Error('No access token available');
    }

    const url = Array.isArray(queryKey) ? queryKey.join('/') : String(queryKey);
    
    // Check if token is expired or about to expire (within 1 minute)
    const tokenExpiresAt = user.expires_at;
    const now = Math.floor(Date.now() / 1000);
    
    if (tokenExpiresAt && tokenExpiresAt - now < 60) {
      console.log('Access token is about to expire, attempting renewal');
      try {
        await signinSilent();
      } catch (error) {
        console.error('Failed to renew token silently:', error);
        throw new Error('Session expired. Please sign in again.');
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.access_token}`,
    };

    const response = await fetch(url as string, { 
      headers, 
      signal,
    });

    // Handle 401 unauthorized - token might be invalid
    if (response.status === 401) {
      console.log('Received 401, attempting token refresh');
      try {
        const refreshedUser = await signinSilent();
        if (refreshedUser?.access_token) {
          // Retry the request with the new token
          const newHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshedUser.access_token}`,
          };
          
          const retryResponse = await fetch(url as string, {
            headers: newHeaders,
            signal,
          });
          
          if (!retryResponse.ok) {
            throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }
          
          return retryResponse.json();
        }
      } catch (error) {
        console.error('Failed to refresh token after 401:', error);
        throw new Error('Authentication failed. Please sign in again.');
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  };
};

// Authenticated mutation function
export const createAuthenticatedMutationFn = (getUser: () => User | null, signinSilent: () => Promise<User | void>) => {
  return async ({ 
    url, 
    method = 'POST', 
    body, 
    signal 
  }: { 
    url: string; 
    method?: string; 
    body?: any; 
    signal?: AbortSignal;
  }) => {
    const user = getUser();
    
    if (!user?.access_token) {
      throw new Error('No access token available');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.access_token}`,
    };

    const options: RequestInit = {
      method,
      headers,
      signal,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    // Handle 401 with retry logic (similar to query function)
    if (response.status === 401) {
      console.log('Received 401 in mutation, attempting token refresh');
      try {
        const refreshedUser = await signinSilent();
        if (refreshedUser?.access_token) {
          const newHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshedUser.access_token}`,
          };
          
          const retryResponse = await fetch(url, {
            ...options,
            headers: newHeaders,
          });
          
          if (!retryResponse.ok) {
            throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }
          
          // Handle empty responses (like DELETE operations)
          const contentType = retryResponse.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            return retryResponse.json();
          }
          return null;
        }
      } catch (error) {
        console.error('Failed to refresh token after 401 in mutation:', error);
        throw new Error('Authentication failed. Please sign in again.');
      }
    }

    if (!response.ok) {
      // Try to get error message from response
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      } catch {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    // Handle empty responses (like DELETE operations)
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    return null;
  };
};

// Create and configure the query client
export const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time - how long data is considered fresh
        staleTime: 5 * 60 * 1000, // 5 minutes
        // Cache time - how long data stays in cache when not being observed
        gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
        // Retry logic
        retry: (failureCount, error) => {
          // Don't retry on auth errors
          if (error.message.includes('Authentication failed')) {
            return false;
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        // Refetch on window focus (keep data fresh)
        refetchOnWindowFocus: true,
        // Refetch on reconnect
        refetchOnReconnect: true,
      },
      mutations: {
        // Retry mutations once
        retry: 1,
      },
    },
  });
};