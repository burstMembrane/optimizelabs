import React, { createContext, useContext, useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchChatList, sendChatMessage, updateFeedback } from '@/service'
import { ChatItem, Feedbacktype } from '@/types/app'
import Toast from '@/app/components/base/toast'
import produce from 'immer'
import { useConversationContext } from '@/app/contexts/ConversationContext'

interface ChatContextType {
  chatList: ChatItem[]
  sendMessage: (message: string, files?: any[]) => Promise<void>
  handleFeedback: (messageId: string, feedback: Feedbacktype) => Promise<void>
  refetchChatList: () => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currConversationId } = useConversationContext()
  const [chatList, setChatList] = useState<ChatItem[]>([])

  // Query for fetching chat list for the current conversation
  const { data, refetch } = useQuery({
    queryKey: ['chatList', currConversationId],
    queryFn: () => fetchChatList(currConversationId).then((res) => res.data),
    enabled: !!currConversationId,
    staleTime: 60000,
    cacheTime: 300000,
  })

  useEffect(() => {
    if (data) {
      // You may want to add your opening statement logic here as needed.
      setChatList(data)
    }
  }, [data])

  // Mutation for sending chat messages
  const sendMessageMutation = useMutation({
    mutationFn: (payload: { message: string; files?: any[] }) =>
      sendChatMessage({
        query: payload.message,
        // include additional required fields here (e.g. conversation_id, inputs, etc.)
      }),
    onSuccess: (resp, variables) => {
      // Update chat list after successfully sending message.
      // This is placeholder logic. Adapt based on your response structure.
      setChatList((prev) => [
        ...prev,
        {
          id: `${Date.now()}`, // or use resp.messageId
          content: resp.answer,
          isAnswer: true,
          // set additional properties as needed
        },
      ])
      Toast.notify({ type: 'success', message: 'Message sent successfully' })
    },
    onError: () => {
      Toast.notify({ type: 'error', message: 'Error sending message' })
    },
  })

  const sendMessage = async (message: string, files?: any[]) => {
    await sendMessageMutation.mutateAsync({ message, files })
  }

  const handleFeedback = async (messageId: string, feedback: Feedbacktype) => {
    await updateFeedback({ url: `/messages/${messageId}/feedbacks`, body: { rating: feedback.rating } })
    setChatList(
      produce(chatList, (draft) => {
        const index = draft.findIndex((item) => item.id === messageId)
        if (index !== -1) {
          draft[index].feedback = feedback
        }
      })
    )
    Toast.notify({ type: 'success', message: 'Feedback updated successfully' })
  }

  return (
    <ChatContext.Provider value={{ chatList, sendMessage, handleFeedback, refetchChatList: refetch }}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChatContext = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
} 
