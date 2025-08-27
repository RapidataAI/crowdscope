import { useAuth } from "react-oidc-context";

export interface ApiOptions extends RequestInit {
  headers?: HeadersInit;
}

export function useAuthenticatedApi() {
  const auth = useAuth();
  
  const authenticatedFetch = async (url: string, options: ApiOptions = {}) => {
    if (!auth.user?.access_token) {
      throw new Error('No access token available');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.user.access_token}`,
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  };

  return { authenticatedFetch };
}