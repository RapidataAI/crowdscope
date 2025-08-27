"use client"
import { User, UserManagerSettings, WebStorageStateStore } from "oidc-client-ts"
import React, { ReactNode, useEffect, useCallback } from "react"
import { AuthProvider, useAuth } from "react-oidc-context"
import { useRouter, usePathname } from "next/navigation"

export const oidcConfig: UserManagerSettings = {
  authority: "https://auth.rapidata.ai",
  client_id: "rapidata-crowdscope",
  redirect_uri:
    typeof window !== "undefined"
      ? window.location.origin + "/authentication/callback"
      : "https://crowdscope.rapidata.ai/authentication/callback",
  post_logout_redirect_uri:
    typeof window !== "undefined"
      ? window.location.origin
      : "https://crowdscope.rapidata.ai",
  scope: "openid profile email roles offline_access",
  loadUserInfo: true,
  automaticSilentRenew: true,
  includeIdTokenInSilentRenew: true,
  silent_redirect_uri:
    typeof window !== "undefined"
      ? window.location.origin + "/authentication/callback"
      : "https://crowdscope.rapidata.ai/authentication/callback",
  accessTokenExpiringNotificationTimeInSeconds: 300, // 5 minutes before expiry
  userStore:
    typeof window !== "undefined"
      ? new WebStorageStateStore({ store: window.localStorage })
      : undefined,
}

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter()

  const onSigninCallback = async (_user: User | void): Promise<void> => {
    window.history.replaceState({}, document.title, window.location.pathname)
    if (_user && _user.url_state) {
      router.push(_user.url_state)
    } else {
      router.push("/")
    }
  }

  return (
    <AuthProvider
      {...oidcConfig}
      onSigninCallback={onSigninCallback}
    >
      <MonitorSession />
      {children}
    </AuthProvider>
  )
}

function MonitorSession() {
  const auth = useAuth()
  const pathname = usePathname()

  const handleSilentLoginError = useCallback(
    (err: Error) => {
      console.error('Session renewal failed:', err)
      
      // Show user notification about session timeout
      const timeoutMessage = "Your session has timed out. You will be redirected to the sign-in page in 5 seconds."
      
      // You can replace this with your preferred notification method
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(timeoutMessage)
      }

      setTimeout(async () => {
        try {
          await auth.signinRedirect({ url_state: pathname })
        } catch (redirectError) {
          console.error('Failed to redirect to sign-in:', redirectError)
        }
      }, 5000)
    },
    [auth, pathname]
  )

  // Handle access token expiring (before it expires)
  useEffect(() => {
    return auth.events.addAccessTokenExpiring(() => {
      console.log('Access token expiring soon, attempting silent renewal')
      auth.signinSilent().catch(handleSilentLoginError)
    })
  }, [auth, handleSilentLoginError])

  // Handle access token expiry (after it's expired)
  useEffect(() => {
    return auth.events.addAccessTokenExpired(() => {
      console.log('Access token expired, attempting silent renewal')
      auth.signinSilent().catch(handleSilentLoginError)
    })
  }, [auth, handleSilentLoginError])

  // Handle silent renew errors
  useEffect(() => {
    return auth.events.addSilentRenewError(handleSilentLoginError)
  }, [auth.events, handleSilentLoginError])

  // Handle successful silent renew
  useEffect(() => {
    return auth.events.addUserLoaded((user) => {
      console.log('User loaded/renewed successfully')
    })
  }, [auth.events])

  // Handle user unloaded (sign out)
  useEffect(() => {
    return auth.events.addUserUnloaded(() => {
      console.log('User unloaded/signed out')
    })
  }, [auth.events])

  return null
}