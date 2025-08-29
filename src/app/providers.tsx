"use client"
import { User, UserManagerSettings, WebStorageStateStore } from "oidc-client-ts"
import React, { ReactNode, useEffect, useCallback, createContext, useContext } from "react"
import { AuthProvider, useAuth } from "react-oidc-context"
import { useRouter, usePathname } from "next/navigation"
import { useNotifications } from "@/hooks/useNotifications"
import { useConfirmation } from "@/hooks/useConfirmation"
import { Notification } from "@/components/Notification"
import { ConfirmationModal } from "@/components/ConfirmationModal"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { createQueryClient } from "@/lib/queryClient"

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

// Create notification context
const NotificationContext = createContext<ReturnType<typeof useNotifications> | null>(null);

export const useGlobalNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useGlobalNotifications must be used within NotificationProvider');
  }
  return context;
};

// Create confirmation context
const ConfirmationContext = createContext<ReturnType<typeof useConfirmation> | null>(null);

export const useGlobalConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useGlobalConfirmation must be used within ConfirmationProvider');
  }
  return context;
};

function UIProvider({ children }: { children: ReactNode }) {
  const notifications = useNotifications();
  const confirmation = useConfirmation();

  return (
    <NotificationContext.Provider value={notifications}>
      <ConfirmationContext.Provider value={confirmation}>
        {children}
        {/* Render notifications */}
        {notifications.notifications.map((notification) => (
          <Notification
            key={notification.id}
            {...notification}
            onClose={() => notifications.removeNotification(notification.id)}
          />
        ))}
        {/* Render confirmation modal */}
        <ConfirmationModal {...confirmation.confirmation} />
      </ConfirmationContext.Provider>
    </NotificationContext.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter()
  
  // Create QueryClient instance (only once)
  const [queryClient] = React.useState(() => createQueryClient())

  const onSigninCallback = async (_user: User | void): Promise<void> => {
    window.history.replaceState({}, document.title, window.location.pathname)
    if (_user && _user.url_state) {
      router.push(_user.url_state)
    } else {
      router.push("/")
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <UIProvider>
        <AuthProvider
          {...oidcConfig}
          onSigninCallback={onSigninCallback}
        >
          <MonitorSession />
          {children}
        </AuthProvider>
      </UIProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

function MonitorSession() {
  const auth = useAuth()
  const pathname = usePathname()
  const { showError, showWarning } = useGlobalNotifications()

  const handleSilentLoginError = useCallback(
    (err: Error) => {
      console.error('Session renewal failed:', err)
      
      showWarning(
        "You will be redirected to the sign-in page in 5 seconds.",
        "Session Expired"
      )

      setTimeout(async () => {
        try {
          await auth.signinRedirect({ url_state: pathname })
        } catch (redirectError) {
          console.error('Failed to redirect to sign-in:', redirectError)
          showError('Failed to redirect to sign-in page. Please refresh and try again.')
        }
      }, 5000)
    },
    [auth, pathname, showError, showWarning]
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
    return auth.events.addUserLoaded(() => {
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

// Theme manual override removed — rely on system preference only
