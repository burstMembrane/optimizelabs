'use client'
import type { FC } from 'react'
import React, { useEffect, useRef } from 'react'
import cn from 'classnames'
import { useTranslation } from 'react-i18next'

import { Send } from 'lucide-react'
import Button from '../base/button'
import { ChatInput } from './chat-input'
import Answer from './answer'
import Question from './question'
import type { FeedbackFunc } from './type'
import type { ChatItem, VisionFile, VisionSettings } from '@/types/app'
import { TransferMethod } from '@/types/app'
import Toast from '@/app/components/base/toast'
import { useImageFiles } from '@/app/components/base/image-uploader/hooks'

export type IChatProps = {
  chatList: ChatItem[]
  /**
   * Whether to display the editing area and rating status
   */
  feedbackDisabled?: boolean
  /**
   * Whether to display the input area
   */
  isHideSendInput?: boolean
  onFeedback?: FeedbackFunc
  checkCanSend?: () => boolean
  onSend?: (message: string, files: VisionFile[]) => void
  useCurrentUserAvatar?: boolean
  isResponding?: boolean
  controlClearQuery?: number
  visionConfig?: VisionSettings
}

const Chat: FC<IChatProps> = ({
  chatList,
  feedbackDisabled = false,
  isHideSendInput = false,
  onFeedback,
  checkCanSend,
  onSend = () => { },
  useCurrentUserAvatar,
  isResponding,
  controlClearQuery,

}) => {
  const { t } = useTranslation()
  const { notify } = Toast
  const isUseInputMethod = useRef(false)

  const [query, setQuery] = React.useState('')
  const handleContentChange = (e: any) => {
    const value = e.target.value
    setQuery(value)
  }

  const logError = (message: string) => {
    notify({ type: 'error', message, duration: 3000 })
  }

  const valid = () => {
    if (!query || query.trim() === '') {
      logError('Message cannot be empty')
      return false
    }
    return true
  }

  useEffect(() => {
    if (controlClearQuery)
      setQuery('')
  }, [controlClearQuery])
  const {
    files,
    onUpload,
    onRemove,
    onReUpload,
    onImageLinkLoadError,
    onImageLinkLoadSuccess,
    onClear,
  } = useImageFiles()

  const handleSend = () => {
    if (!valid() || (checkCanSend && !checkCanSend()))
      return
    onSend(query, files.filter(file => file.progress !== -1).map(fileItem => ({
      type: 'image',
      transfer_method: fileItem.type,
      url: fileItem.url,
      upload_file_id: fileItem.fileId,
    })))
    if (!files.find(item => item.type === TransferMethod.local_file && !item.fileId)) {
      if (files.length)
        onClear()
      if (!isResponding)
        setQuery('')
    }
  }

  const handleKeyUp = (e: any) => {
    if (e.code === 'Enter') {
      e.preventDefault()
      // prevent send message when using input method enter
      if (!e.shiftKey && !isUseInputMethod.current)
        handleSend()
    }
  }

  const handleKeyDown = (e: any) => {
    isUseInputMethod.current = e.nativeEvent.isComposing
    if (e.code === 'Enter' && !e.shiftKey) {
      setQuery(query.replace(/\n$/, ''))
      e.preventDefault()
    }
  }

  return (
    <div className={cn(!feedbackDisabled && 'px-3.5', 'h-full')}>
      {/* Chat List */}
      <div className="h-full space-y-[30px]">
        {chatList.map((item) => {
          if (item.isAnswer) {
            const isLast = item.id === chatList[chatList.length - 1].id
            return <Answer
              key={item.id}
              item={item}
              feedbackDisabled={feedbackDisabled}
              onFeedback={onFeedback}
              isResponding={isResponding && isLast}
            />
          }
          return (
            <Question
              key={item.id}
              id={item.id}
              content={item.content}
              useCurrentUserAvatar={useCurrentUserAvatar}
              imgSrcs={(item.message_files && item.message_files?.length > 0) ? item.message_files.map(item => item.url) : []}
            />
          )
        })}
      </div>
      {
        <MessageBox
          isHideSendInput={isHideSendInput}
          t={t}
          feedbackDisabled={feedbackDisabled}
          query={query}
          handleContentChange={handleContentChange}
          handleKeyUp={handleKeyUp}
          handleKeyDown={handleKeyDown}
          handleSend={handleSend}
          isResponding={isResponding}
        />
      }
    </div>
  )
}

function MessageBox({
  isHideSendInput,
  t,
  feedbackDisabled,
  query,
  isResponding = false,
  handleContentChange,
  handleKeyUp,
  handleKeyDown,
  handleSend,
}: {
  t: Function
  isHideSendInput: boolean
  feedbackDisabled: boolean
  query: string
  isResponding?: boolean
  handleContentChange: (e: any) => void
  handleKeyUp: (e: any) => void
  handleKeyDown: (e: any) => void
  handleSend: () => void
}) {
  return (
    <div className='!left-4 !right-4 absolute z-10 bottom-2 bg-none '>
      <div className='max-h-[200px]  shadow-lg relative'>
        <ChatInput
          placeholder={t('app.chat.placeholder.input')}
          className='border-2 h-16 bg-gray-100 rounded-2xl pr-12 outline-none focus:outline-none text-xl'
          value={query}
          onChange={handleContentChange}
          onKeyUp={handleKeyUp}
          onKeyDown={handleKeyDown}
        />
        <div className="absolute inset-y-0 right-1 flex items-center">
          <Button
            className={`${query ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} text-gray-500`}
            onClick={query ? handleSend : undefined}
            disabled={isHideSendInput || feedbackDisabled}
          >
            {/* {isResponding ? <StopCircle className='w-8 h-8' /> : <Send className='w-8 h-8' />} */}
            <Send className='w-8 h-8' />
          </Button>

        </div>
      </div>
    </div>
  )
}

export default React.memo(Chat)
