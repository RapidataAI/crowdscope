"use client"
import { useAuth } from "react-oidc-context"
import { useEffect } from "react"

export default function AuthCallback() {
  const auth = useAuth()

  useEffect(() => {
    if (auth.isLoading) return

    // The AuthProvider handles the callback automatically
    // This page just needs to exist for the redirect
  }, [auth.isLoading])

  if (auth.isLoading) {
    return <div>Loading...</div>
  }

  return <div>Authentication complete...</div>
}