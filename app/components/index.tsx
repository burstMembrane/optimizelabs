/* eslint-disable @typescript-eslint/no-use-before-define */
'use client'
import type { FC } from 'react'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import produce, { setAutoFreeze } from 'immer'
import { useBoolean, useGetState } from 'ahooks'
import useConversation from '@/hooks/use-conversation'
import Toast from '@/app/components/base/toast'
import Sidebar from '@/app/components/sidebar'
import Header from '@/app/components/header'
import { fetchAppParams, fetchChatList, fetchConversations, generateConversationName, sendChatMessage, updateFeedback } from '@/service'
import type { ChatItem, ConversationItem, Feedbacktype, PromptConfig, VisionFile, VisionSettings } from '@/types/app'
import { Resolution, TransferMethod, WorkflowRunningStatus } from '@/types/app'
import Chat from '@/app/components/chat'
import { setLocaleOnClient } from '@/i18n/client'
import useBreakpoints, { MediaType } from '@/hooks/use-breakpoints'
import Loading from '@/app/components/base/loading'
import { replaceVarWithValues, userInputsFormToPromptVariables } from '@/utils/prompt'
import AppUnavailable from '@/app/components/app-unavailable'
import { API_KEY, APP_ID, APP_INFO, isShowPrompt, promptTemplate } from '@/config'
import type { Annotation as AnnotationType } from '@/types/log'

import { useQuery } from '@tanstack/react-query'
import { useConversationSwitch } from '@/hooks/use-conversation-switch'

export type IMainProps = {
  params: any
}

const Main: FC<IMainProps> = () => {
  // todo: move these to a hook
  const { t } = useTranslation()
  const media = useBreakpoints()
  const isMobile = media === MediaType.mobile
  const hasSetAppConfig = APP_ID && API_KEY

  /*
  * app info
  */
  const [appUnavailable, setAppUnavailable] = useState<boolean>(false)
  const [isUnknownReason, setIsUnknownReason] = useState<boolean>(false)
  const [promptConfig, setPromptConfig] = useState<PromptConfig | null>(null)
  const [initialized, setInitialized] = useState<boolean>(false)
  // show sidebar by click button
  const [isShowSidebar, { setTrue: showSidebar, setFalse: hideSidebar }] = useBoolean(true)
  const [visionConfig, setVisionConfig] = useState<VisionSettings | undefined>({
    enabled: false,
    number_limits: 2,
    detail: Resolution.low,
    transfer_methods: [TransferMethod.local_file],
  })

  // Add these near the other state declarations
  const [messageCounter, setMessageCounter] = useState<number>(0)
  const MESSAGES_BEFORE_RENAME = 3 // You can adjust this number as needed

  useEffect(() => {
    if (APP_INFO?.title)
      document.title = `${APP_INFO.title}`
  }, [])

  // onData change thought (the produce obj). https://github.com/immerjs/immer/issues/576
  useEffect(() => {
    setAutoFreeze(false)
    return () => {
      setAutoFreeze(true)
    }
  }, [])

  /*
  * conversation info
  */
  const {
    conversationList,
    setConversationList,
    currConversationId,
    getCurrConversationId,
    setCurrConversationId,
    getConversationIdFromStorage,
    isNewConversation,
    currConversationInfo,
    currInputs,
    newConversationInputs,
    resetNewConversationInputs,
    setCurrInputs,
    setNewConversationInfo,
    setExistConversationInfo,
  } = useConversation()

  const [conversationIdChanged, setConversationIdChanged, isNewConversationIdChanged] = useGetState(false)
  const [isChatStarted, { setTrue: setChatStarted, setFalse: setChatNotStarted }] = useBoolean(true)

  const conversationIntroduction = currConversationInfo?.introduction || ''


  const handleConversationIdChange = (id: string) => {
    if (id === '-1') {
      createNewChat();
      // Immediately clear UI and set opening statement for new conversation
      setChatList(generateNewChatListWithOpenStatement(conversationIntroduction, newConversationInputs || {}));
    }
    setCurrConversationId(id, APP_ID);
  };

  /*
  * chat info. chat is under conversation.
  */
  const [chatList, setChatList, getChatList] = useGetState<ChatItem[]>([])
  const chatListDomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // scroll to bottom
    if (chatListDomRef.current)
      chatListDomRef.current.scrollTop = chatListDomRef.current.scrollHeight
  }, [chatList, currConversationId])
  // user can not edit inputs if user had send message
  const createNewChat = () => {
    // if new chat is already exist, do not create new chat
    if (conversationList.some(item => item.id === '-1'))
      return

    setConversationList(produce(conversationList, (draft) => {
      draft.unshift({
        id: '-1',
        name: t('app.chat.newChatDefaultName'),
        inputs: newConversationInputs,
        introduction: conversationIntroduction,
      })
    }))
  }

  const generateNewChatListWithOpenStatement = (introduction: string, inputs: Record<string, any>) => {
    let calculatedIntroduction = introduction || conversationIntroduction || '';
    const calculatedPromptVariables = inputs || currInputs || null;

    if (calculatedIntroduction && calculatedPromptVariables)
      calculatedIntroduction = replaceVarWithValues(calculatedIntroduction, promptConfig?.prompt_variables || [], calculatedPromptVariables);

    // Add a default AI greeting message
    const aiGreetingMessage = {
      id: `greeting-${Date.now()}`,
      content: t('app.chat.greeting'),
      isAnswer: true,
      feedbackDisabled: true,
      isOpeningStatement: true,
      belongsTo: 'assistant' // Ensure the message is marked as an assistant response
    };

    const openingStatement = {
      id: `${Date.now()}`,
      content: calculatedIntroduction,
      isAnswer: true,
      feedbackDisabled: true,
      isOpeningStatement: isShowPrompt,
      belongsTo: 'assistant' // Mark as assistant response as well
    };

    // Ensure AI greeting is always first
    return [aiGreetingMessage, ...(calculatedIntroduction ? [openingStatement] : [])];
  };

  const fetchUserConversations = async () => {
    const res = await fetchConversations();
    const { data, error } = res as { data: ConversationItem[]; error: string };
    if (error) {
      Toast.notify({ type: 'error', message: error });
      return [];
    }
    return data;
  };

  const fetchAppParameters = async () => {
    const res = await fetchAppParams();
    if (res.error) {
      throw new Error('Error fetching app params');
    }
    return res;
  };

  // Use useQuery for fetching user conversations
  const { data: conversations, isError: isConversationsError, isSuccess: isConversationsSuccess } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchUserConversations,
    staleTime: 60000,
  });

  // Use useQuery for fetching app parameters
  const { data: appParams, isError: isAppParamsError, isSuccess: isAppParamsSuccess } = useQuery({
    queryKey: ['appParams'],
    queryFn: fetchAppParameters,
    staleTime: 60000,
  });

  // Handle success and error states
  useEffect(() => {
    if (isConversationsSuccess && conversations) {
      setConversationList(conversations);
      if (conversations.length === 0) {
        setTimeout(() => { handleConversationIdChange('-1') }, 0);
      } else {
        const _conversationId = getConversationIdFromStorage(APP_ID);
        if (conversations.some(item => item.id === _conversationId))
          setCurrConversationId(_conversationId, APP_ID, false);
      }
    }
  }, [isConversationsSuccess, conversations]);

  useEffect(() => {
    if (isAppParamsSuccess && appParams) {
      const { user_input_form, opening_statement, file_upload, system_parameters } = appParams;
      setLocaleOnClient(APP_INFO.default_language, true);
      setNewConversationInfo({ name: t('app.chat.newChatDefaultName'), introduction: opening_statement });
      const prompt_variables = userInputsFormToPromptVariables(user_input_form);
      setPromptConfig({ prompt_template: promptTemplate, prompt_variables });
      setVisionConfig({
        ...file_upload?.image,
        image_file_size_limit: system_parameters?.system_parameters || 0,
      });
      setInitialized(true);
    }
  }, [isAppParamsSuccess, appParams]);



  useEffect(() => {
    if (isAppParamsError) {
      console.error('Error fetching app params');
      setIsUnknownReason(true);
      setAppUnavailable(true);
    }
  }, [isAppParamsError]);

  const [isResponding, { setTrue: enableResponding, setFalse: setRespondingFalse }] = useBoolean(false)
  const [_abortController, setAbortController] = useState<AbortController | null>(null)
  const { notify } = Toast
  const logError = (message: string) => {
    notify({ type: 'error', message })
  }


  useConversationSwitch({
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
  })

  const checkCanSend = () => {
    if (currConversationId !== '-1')
      return true

    if (!currInputs || !promptConfig?.prompt_variables)
      return true

    const inputLens = Object.values(currInputs).length
    const promptVariablesLens = promptConfig.prompt_variables.length

    const emptyInput = inputLens < promptVariablesLens || Object.values(currInputs).find(v => !v)
    if (emptyInput) {
      logError(t('app.errorMessage.valueOfVarRequired'))
      return false
    }
    return true
  }

  const messageTaskIdRef = useRef('')
  // TODO: implement this
  const [_hasStopResponded, _setHasStopResponded, _getHasStopResponded] = useGetState(false)
  const [_isRespondingConIsCurrCon, setIsRespondingInCurrentConversation, _getIsRespondingConIsCurrCon] = useGetState(true)

  const updateCurrentQA = ({
    responseItem,
    questionId,
    placeholderAnswerId,
    questionItem,
  }: {
    responseItem: ChatItem
    questionId: string
    placeholderAnswerId: string
    questionItem: ChatItem
  }) => {
    // closesure new list is outdated.
    const newListWithAnswer = produce(
      getChatList().filter(item => item.id !== responseItem.id && item.id !== placeholderAnswerId),
      (draft) => {
        if (!draft.find(item => item.id === questionId))
          draft.push({ ...questionItem })

        draft.push({ ...responseItem })
      })
    setChatList(newListWithAnswer)
  }

  const handleSend = async (message: string, files?: VisionFile[]) => {
    if (isResponding) {
      notify({ type: 'info', message: t('app.errorMessage.waitForResponse') })
      return
    }
    const data: Record<string, any> = {
      inputs: currInputs,
      query: message,
      conversation_id: isNewConversation ? null : currConversationId,
    }

    if (visionConfig?.enabled && files && files?.length > 0) {
      data.files = files.map((item) => {
        if (item.transfer_method === TransferMethod.local_file) {
          return {
            ...item,
            url: '',
          }
        }
        return item
      })
    }

    // question
    const questionId = `question-${Date.now()}`
    const questionItem = {
      id: questionId,
      content: message,
      isAnswer: false,
      message_files: files,
    }

    const placeholderAnswerId = `answer-placeholder-${Date.now()}`
    const placeholderAnswerItem = {
      id: placeholderAnswerId,
      content: '',
      isAnswer: true,
    }

    const newList = [...getChatList(), questionItem, placeholderAnswerItem]
    setChatList(newList)

    let isAgentMode = false

    // answer
    const responseItem: ChatItem = {
      id: `${Date.now()}`,
      content: '',
      agent_thoughts: [],
      message_files: [],
      isAnswer: true,
    }
    let hasSetResponseId = false

    const prevTempNewConversationId = getCurrConversationId() || '-1'
    let tempNewConversationId = ''

    enableResponding()
    sendChatMessage(data, {
      getAbortController: (abortController) => {
        setAbortController(abortController)
      },
      onData: (message: string, isFirstMessage: boolean, { conversationId: newConversationId, messageId, taskId }: any) => {
        if (!isAgentMode) {
          responseItem.content = responseItem.content + message
        }
        else {
          const lastThought = responseItem.agent_thoughts?.[responseItem.agent_thoughts?.length - 1]
          if (lastThought)
            lastThought.thought = lastThought.thought + message // need immer setAutoFreeze
        }
        if (messageId && !hasSetResponseId) {
          responseItem.id = messageId
          hasSetResponseId = true
        }

        if (isFirstMessage && newConversationId)
          tempNewConversationId = newConversationId

        messageTaskIdRef.current = taskId
        // has switched to other conversation
        if (prevTempNewConversationId !== getCurrConversationId()) {
          setIsRespondingInCurrentConversation(false)
          return
        }
        updateCurrentQA({
          responseItem,
          questionId,
          placeholderAnswerId,
          questionItem,
        })
      },
      async onCompleted(hasError?: boolean) {
        if (hasError)
          return

        // Update message counter and check if we should generate new name
        const newMessageCount = messageCounter + 1
        setMessageCounter(newMessageCount)

        if (newMessageCount >= MESSAGES_BEFORE_RENAME) {
          console.log("Updating conversation list")
          const { data: allConversations }: any = await fetchConversations()

          // Extract conversation content from chatList
          const conversationSummary = chatList
            .filter(msg => !msg.isOpeningStatement) // Skip opening statements
            .map(msg => ({
              role: msg.isAnswer ? 'assistant' : 'user',
              content: msg.content || (msg.agent_thoughts?.[0]?.thought || '')
            }))
            .filter(msg => msg.content) // Remove empty messages
            .slice(-MESSAGES_BEFORE_RENAME) // Take last 6 messages for context
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n')

          // Create prompt for name generation
          const prompt = `Based on this conversation about a business, generate a brief, relevant conversation name (max 40 chars):

${conversationSummary}`

          const newItem: any = await generateConversationName(allConversations[0].id, prompt)
          const updatedConversations = produce(allConversations, (draft: any) => {
            draft[0].name = newItem.name
          })
          setConversationList(updatedConversations as any)
        }
        setConversationIdChanged(false)
        resetNewConversationInputs()
        setChatNotStarted()
        setCurrConversationId(tempNewConversationId, APP_ID, true)
        setRespondingFalse()
      },
      onFile(file) {
        const lastThought = responseItem.agent_thoughts?.[responseItem.agent_thoughts?.length - 1]
        if (lastThought)
          lastThought.message_files = [...(lastThought as any).message_files, { ...file }]

        updateCurrentQA({
          responseItem,
          questionId,
          placeholderAnswerId,
          questionItem,
        })
      },
      onThought(thought) {
        isAgentMode = true
        const response = responseItem as any
        if (thought.message_id && !hasSetResponseId) {
          response.id = thought.message_id
          hasSetResponseId = true
        }
        // responseItem.id = thought.message_id;
        if (response.agent_thoughts.length === 0) {
          response.agent_thoughts.push(thought)
        }
        else {
          const lastThought = response.agent_thoughts[response.agent_thoughts.length - 1]
          // thought changed but still the same thought, so update.
          if (lastThought.id === thought.id) {
            thought.thought = lastThought.thought
            thought.message_files = lastThought.message_files
            responseItem.agent_thoughts![response.agent_thoughts.length - 1] = thought
          }
          else {
            responseItem.agent_thoughts!.push(thought)
          }
        }
        // has switched to other conversation
        if (prevTempNewConversationId !== getCurrConversationId()) {
          setIsRespondingInCurrentConversation(false)
          return false
        }

        updateCurrentQA({
          responseItem,
          questionId,
          placeholderAnswerId,
          questionItem,
        })
      },
      onMessageEnd: (messageEnd) => {
        if (messageEnd.metadata?.annotation_reply) {
          responseItem.id = messageEnd.id
          responseItem.annotation = ({
            id: messageEnd.metadata.annotation_reply.id,
            authorName: messageEnd.metadata.annotation_reply.account.name,
          } as AnnotationType)
          const newListWithAnswer = produce(
            getChatList().filter(item => item.id !== responseItem.id && item.id !== placeholderAnswerId),
            (draft) => {
              if (!draft.find(item => item.id === questionId))
                draft.push({ ...questionItem })

              draft.push({
                ...responseItem,
              })
            })
          setChatList(newListWithAnswer)
          return
        }
        // not support show citation
        const citation = messageEnd.metadata.retriever_resources
        console.log("responseItem.citation", citation)
        const newListWithAnswer = produce(
          getChatList().filter(item => item.id !== responseItem.id && item.id !== placeholderAnswerId),
          (draft) => {
            if (!draft.find(item => item.id === questionId))
              draft.push({ ...questionItem })

            draft.push({ ...responseItem })
          })
        setChatList(newListWithAnswer)
      },
      onMessageReplace: (messageReplace) => {
        setChatList(produce(
          getChatList(),
          (draft) => {
            const current = draft.find(item => item.id === messageReplace.id)

            if (current)
              current.content = messageReplace.answer
          },
        ))
      },
      onError() {
        setRespondingFalse()
        // role back placeholder answer
        setChatList(produce(getChatList(), (draft) => {
          draft.splice(draft.findIndex(item => item.id === placeholderAnswerId), 1)
        }))
      },
      onWorkflowStarted: ({ workflow_run_id, task_id }) => {
        // taskIdRef.current = task_id
        responseItem.workflow_run_id = workflow_run_id
        responseItem.workflowProcess = {
          status: WorkflowRunningStatus.Running,
          tracing: [],
        }
        setChatList(produce(getChatList(), (draft) => {
          const currentIndex = draft.findIndex(item => item.id === responseItem.id)
          draft[currentIndex] = {
            ...draft[currentIndex],
            ...responseItem,
          }
        }))
      },
      onWorkflowFinished: ({ data }) => {
        responseItem.workflowProcess!.status = data.status as WorkflowRunningStatus
        setChatList(produce(getChatList(), (draft) => {
          const currentIndex = draft.findIndex(item => item.id === responseItem.id)
          draft[currentIndex] = {
            ...draft[currentIndex],
            ...responseItem,
          }
        }))
      },
      onNodeStarted: ({ data }) => {
        responseItem.workflowProcess!.tracing!.push(data as any)
        setChatList(produce(getChatList(), (draft) => {
          const currentIndex = draft.findIndex(item => item.id === responseItem.id)
          draft[currentIndex] = {
            ...draft[currentIndex],
            ...responseItem,
          }
        }))
      },
      onNodeFinished: ({ data }) => {
        const currentIndex = responseItem.workflowProcess!.tracing!.findIndex(item => item.node_id === data.node_id)
        responseItem.workflowProcess!.tracing[currentIndex] = data as any
        setChatList(produce(getChatList(), (draft) => {
          const currentIndex = draft.findIndex(item => item.id === responseItem.id)
          draft[currentIndex] = {
            ...draft[currentIndex],
            ...responseItem,
          }
        }))
      },
    })
  }
  async function handleDeleteConversation(conversationId: string) {
    try {
      // get the last conversation, the one before the current one
      const currentConversationIndex = conversationList.findIndex(item => item.id === currConversationId);
      const lastConversation = conversationList[currentConversationIndex - 1];
      setCurrConversationId(lastConversation.id, APP_ID);

      const response = await fetch(`/api/conversations/${conversationId}/delete`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error("Failed to delete conversation");
      }

      // Create new list before modifying state
      const newConversationList = conversationList.filter(item => item.id !== conversationId);
      setConversationList(newConversationList);

      notify({ type: 'success', message: t('common.api.delete') });

      // If deleted current conversation, handle switching
      if (conversationId === currConversationId) {
        if (newConversationList.length === 0) {
          // If no conversations left, create new chat
          handleConversationIdChange('-1');
        } else {
          // Switch to first available conversation
          setCurrConversationId(newConversationList[0].id, APP_ID);
        }
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      notify({ type: 'error', message: t('common.api.error') });
    }
  }
  const handleFeedback = async (messageId: string, feedback: Feedbacktype) => {
    await updateFeedback({ url: `/messages/${messageId}/feedbacks`, body: { rating: feedback.rating } })
    const newChatList = chatList.map((item) => {
      if (item.id === messageId) {
        return {
          ...item,
          feedback,
        }
      }
      return item
    })
    setChatList(newChatList)
    notify({ type: 'success', message: t('common.api.success') })
  }
  function toggleSidebar() {
    console.log(`toggleSidebar: isShowSidebar: ${isShowSidebar}`)
    isShowSidebar ? hideSidebar() : showSidebar()
  }
  const renderSidebar = () => {
    if (!APP_ID || !APP_INFO || !promptConfig)
      return null
    return (
      <div className={`slide-out-to-left duration-300 ease-in-out ${isShowSidebar ? 'translate-x-0' : '-translate-x-full hidden  '} shadow-lg`}>
        <Sidebar
          list={conversationList}
          onCurrentIdChange={handleConversationIdChange}
          currentId={currConversationId}
          copyRight={APP_INFO.copyright || APP_INFO.title}
          deleteConversation={(id) => handleDeleteConversation(id)}
        />
      </div>
    )
  }

  // Add this to reset message counter when conversation changes
  useEffect(() => {
    setMessageCounter(0)
  }, [currConversationId])

  if (appUnavailable)
    return <AppUnavailable isUnknownReason={isUnknownReason} errMessage={!hasSetAppConfig ? 'Please set APP_ID and API_KEY in config/index.tsx' : ''} />

  if (!APP_ID || !APP_INFO || !promptConfig)
    return <Loading type='app' />

  return (
    <div className='bg-transparent '>
      <Header
        title={APP_INFO.title}
        isMobile={isMobile}
        onShowSideBar={toggleSidebar}
        onCreateNewChat={() => handleConversationIdChange('-1')}
      />
      <div className="flex rounded-2xl bg-white overflow-hidden">
        {/* sidebar */}
        {!isMobile && renderSidebar()}
        {isMobile && isShowSidebar && (
          <div className='fixed inset-0 z-50'
            style={{ backgroundColor: 'rgba(35, 56, 118, 0.2)' }}
            onClick={hideSidebar}
          >
            <div className='inline-block' onClick={e => e.stopPropagation()}>
              {renderSidebar()}
            </div>
          </div>
        )}
        {/* main */}
        <div className='flex-grow flex flex-col h-[calc(100vh_-_3rem)] overflow-y-auto w-100vw'>
          <div className='relative w-full max-w-[1200px] flex-1 mobile:w-full pb-[66px] mx-auto mb-3.5 overflow-y-auto'>
            <div className='h-full overflow-y-auto' ref={chatListDomRef}>
              <Chat
                chatList={chatList}
                onSend={handleSend}
                onFeedback={handleFeedback}
                isResponding={isResponding}
                checkCanSend={checkCanSend}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default React.memo(Main)
