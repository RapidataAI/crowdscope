'use client';

import { useAuth } from "react-oidc-context";

export function useRequireAuth() {
  const auth = useAuth();

  return {
    user: auth.user,
    isLoading: auth.isLoading,
    isAuthenticated: !!auth.user && !auth.isLoading,
    signOut: () => auth.signoutRedirect(),
    // Helper to get user display name
    displayName: auth.user?.profile?.name || auth.user?.profile?.email || 'User',
    // Helper to check if user has access token
    hasValidToken: !!auth.user?.access_token,
  };
}