"use client"
import { User, UserManagerSettings, WebStorageStateStore } from "oidc-client-ts"
import React, { ReactNode, useEffect } from "react"
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
  scope: "openid profile email roles",
  loadUserInfo: true,
  automaticSilentRenew: true,
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

  useEffect(() => {
    return auth.events.addAccessTokenExpired(() => {
      auth.signinSilent().catch(() => {
        auth.signinRedirect({ url_state: pathname })
      })
    })
  }, [auth, pathname])

  return null
}