"use client"
import { useAuth } from "react-oidc-context"
import { useEffect, ReactNode } from "react"

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const auth = useAuth()

  useEffect(() => {
    if (!auth.isLoading && !auth.user) {
      // Redirect to login if not authenticated
      auth.signinRedirect({ url_state: window.location.pathname })
    }
  }, [auth.isLoading, auth.user, auth])

  if (auth.isLoading) {
    return <div>Loading...</div>
  }

  if (!auth.user) {
    return <div>Redirecting to login...</div>
  }

  return <>{children}</>
}