import React, { createContext, useContext, ReactNode } from 'react'

const NotificationsContext = createContext({})

export function NotificationsProvider({ children }: { children: ReactNode }) {
  return (
    <NotificationsContext.Provider value={{}}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationsContext)
}
