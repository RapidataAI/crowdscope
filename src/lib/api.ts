import { useAuth } from "react-oidc-context";

export interface ApiOptions extends RequestInit {
  headers?: HeadersInit;
}

export function useAuthenticatedApi() {
  const auth = useAuth();
  
  const authenticatedFetch = async (url: string, options: ApiOptions = {}) => {
    if (auth.isLoading) {
      throw new Error('Authentication is still loading');
    }
    
    if (!auth.user) {
      throw new Error('User is not authenticated');
    }
    
    if (!auth.user.access_token) {
      throw new Error('No access token available');
    }

    // Check if token is expired or about to expire (within 1 minute)
    const tokenExpiresAt = auth.user.expires_at;
    const now = Math.floor(Date.now() / 1000);
    
    if (tokenExpiresAt && tokenExpiresAt - now < 60) {
      console.log('Access token is about to expire, attempting renewal');
      try {
        await auth.signinSilent();
      } catch (error) {
        console.error('Failed to renew token silently:', error);
        throw new Error('Session expired. Please sign in again.');
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.user.access_token}`,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 unauthorized - token might be invalid
    if (response.status === 401) {
      console.log('Received 401, attempting token refresh');
      try {
        await auth.signinSilent();
        // Retry the request with the new token
        const newHeaders = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.user.access_token}`,
          ...options.headers,
        };
        
        return fetch(url, {
          ...options,
          headers: newHeaders,
        });
      } catch (error) {
        console.error('Failed to refresh token after 401:', error);
        throw new Error('Authentication failed. Please sign in again.');
      }
    }

    return response;
  };

  return { authenticatedFetch };
}