import React, { createContext, useContext, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchConversations } from '@/service'
import Toast from '@/app/components/base/toast'
import { APP_ID } from '@/config'

// Define a minimal conversation type
export interface Conversation {
  id: string
  name: string
  inputs: Record<string, any>
  introduction: string
}

interface ConversationContextType {
  conversations: Conversation[]
  currConversationId: string
  setCurrConversationId: (id: string, refresh?: boolean) => void
  newConversationInputs: Record<string, any>
  setNewConversationInputs: (inputs: Record<string, any>) => void
  resetNewConversationInputs: () => void
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined)

export const ConversationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currConversationId, setCurrConvId] = useState<string>('')
  const [newConversationInputs, setNewConversationInputs] = useState<Record<string, any>>({})

  // Use react-query to fetch the conversation list
  const { data, isError, isSuccess } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
    staleTime: 60000,
  })

  useEffect(() => {
    if (isSuccess && data) {
      setConversations(data)
      // start with the first conversation if none is selected
      if (!currConversationId && data.length > 0) {
        setCurrConvId(data[0].id)
      }
    }
    if (isError) {
      Toast.notify({ type: 'error', message: 'Error fetching conversations' })
    }
  }, [isSuccess, data, isError, currConversationId])

  const resetNewConversationInputs = () => setNewConversationInputs({})

  const setCurrConversationId = (id: string, refresh: boolean = false) => {
    setCurrConvId(id)
    // Optionally add logic to refresh data or side effects if refresh is true
  }

  return (
    <ConversationContext.Provider value={{
      conversations,
      currConversationId,
      setCurrConversationId,
      newConversationInputs,
      setNewConversationInputs,
      resetNewConversationInputs,
    }}>
      {children}
    </ConversationContext.Provider>
  )
}

export const useConversationContext = () => {
  const context = useContext(ConversationContext)
  if (!context) {
    throw new Error('useConversationContext must be used within a ConversationProvider')
  }
  return context
} 
