'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { ConversationItem } from '@/types/app'
import { fetchConversations } from '@/service'
import Toast from '@/app/components/base/toast'
import { useQuery } from '@tanstack/react-query'

interface ConversationContextType {
  conversationList: ConversationItem[]
  setConversationList: (list: ConversationItem[]) => void
  fetchUserConversations: () => Promise<ConversationItem[]>
  isLoading: boolean
  isError: boolean
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined)

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [conversationList, setConversationList] = useState<ConversationItem[]>([])

  const fetchUserConversations = async () => {
    const res = await fetchConversations()
    const { data, error } = res as { data: ConversationItem[]; error: string }
    if (error) {
      Toast.notify({ type: 'error', message: error })
      return []
    }
    return data
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchUserConversations,

    staleTime: 60000,
  })

  return (
    <ConversationContext.Provider value={{
      data,
      setConversationList,
      fetchUserConversations,
      isLoading,
      isError,
    }}>
      {children}
    </ConversationContext.Provider>
  )
}

export function useConversationContext() {
  const context = useContext(ConversationContext)
  if (!context) {
    throw new Error('useConversationContext must be used within a ConversationProvider')
  }
  return context
} 
