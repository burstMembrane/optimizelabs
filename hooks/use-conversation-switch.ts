import { useEffect } from 'react'
import { fetchChatList } from '@/service'
import type { ChatItem } from '@/types/app'
import { addFileInfos, sortAgentSorts } from '@/utils/tools'
import { useQuery } from '@tanstack/react-query'

interface UseConversationSwitchProps {
    initialized: boolean
    isNewConversation: boolean
    conversationIdChanged: boolean
    isResponding: boolean
    currConversationId: string
    conversationList: any[]
    setCurrInputs: (inputs: any) => void
    setExistConversationInfo: (info: { name: string; introduction: string }) => void
    newConversationInputs: any
    generateNewChatListWithOpenStatement: (introduction: string, inputs: Record<string, any>) => ChatItem[]
    setChatList: (list: ChatItem[]) => void
}

export const useConversationSwitch = ({
    initialized,
    isNewConversation,
    conversationIdChanged,
    isResponding,
    currConversationId,
    conversationList,
    setCurrInputs,
    setExistConversationInfo,
    newConversationInputs,
    generateNewChatListWithOpenStatement,
    setChatList,
}: UseConversationSwitchProps) => {
    const { data: chatListData } = useQuery({
        queryKey: ['chatList', currConversationId],
        queryFn: () => fetchChatList(currConversationId),
        enabled: initialized && !isNewConversation && !conversationIdChanged && !isResponding,
        staleTime: 10000,
        refetchInterval: 10000,

    })

    useEffect(() => {
        if (!initialized)
            return

        // update inputs of current conversation
        let notSyncToStateIntroduction = ''
        let notSyncToStateInputs: Record<string, any> | undefined | null = {}

        if (!isNewConversation) {
            const item = conversationList.find(item => item.id === currConversationId)
            notSyncToStateInputs = item?.inputs || {}
            setCurrInputs(notSyncToStateInputs as any)
            notSyncToStateIntroduction = item?.introduction || ''
            setExistConversationInfo({
                name: item?.name || '',
                introduction: notSyncToStateIntroduction,
            })
        }
        else {
            notSyncToStateInputs = newConversationInputs
            setCurrInputs(notSyncToStateInputs)
        }

        // Process chat list data when available
        if (chatListData) {
            const { data } = chatListData
            const newChatList: ChatItem[] = generateNewChatListWithOpenStatement(notSyncToStateIntroduction, notSyncToStateInputs || {})

            // Clear the current chat list
            setChatList([])

            data.forEach((item: any) => {
                newChatList.push({
                    id: `question-${item.id}`,
                    content: item.query,
                    isAnswer: false,
                    message_files: item.message_files?.filter((file: any) => file.belongs_to === 'user') || [],
                })
                newChatList.push({
                    id: item.id,
                    content: item.answer,
                    agent_thoughts: addFileInfos(item.agent_thoughts ? sortAgentSorts(item.agent_thoughts) : item.agent_thoughts, item.message_files),
                    feedback: item.feedback,
                    isAnswer: true,
                    message_files: item.message_files?.filter((file: any) => file.belongs_to === 'assistant') || [],
                })
            })
            setChatList(newChatList)
        }
    }, [currConversationId, initialized, chatListData])
} 
