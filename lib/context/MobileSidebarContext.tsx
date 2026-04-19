'use client'

import { createContext, useContext } from 'react'

interface MobileSidebarContextValue {
  open: () => void
}

export const MobileSidebarContext = createContext<MobileSidebarContextValue>({ open: () => {} })
export const useMobileSidebar = () => useContext(MobileSidebarContext)
