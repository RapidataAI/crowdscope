'use client';

import { useAuth } from "react-oidc-context";
import { useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const auth = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!auth.isLoading && !auth.user) {
      // Redirect to login if not authenticated
      auth.signinRedirect({ url_state: pathname });
    }
  }, [auth.isLoading, auth.user, auth, pathname]);

  if (auth.isLoading) {
    return (
      fallback || (
        <div className="min-h-screen bg-background flex items-center justify-center"></div>
      )
    );
  }

  if (!auth.user) {
    return (
      fallback || (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-500 dark:text-gray-400">Redirecting to login...</div>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}
