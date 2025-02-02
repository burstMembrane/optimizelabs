import React from 'react'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

// import chat buttons from lucide-react
import { MessageCircle, MessageCircleDashed, Trash } from 'lucide-react'
import type { ConversationItem } from '@/types/app'

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}

const MAX_CONVERSATION_LENGTH = 20

export type ISidebarProps = {
  copyRight: string
  currentId: string
  onCurrentIdChange: (id: string) => void
  deleteConversation: (id: string) => void
  list: ConversationItem[]
}

const Sidebar: FC<ISidebarProps> = ({
  copyRight,
  currentId,
  onCurrentIdChange,
  deleteConversation,
  list,
}) => {
  const { t } = useTranslation()
  return (
    <div
      className="h-full flex flex-col overflow-y-auto bg-white pc:w-[244px] tablet:w-[192px] mobile:w-[240px]  border-r border-gray-200 tablet:h-[calc(100vh_-_3rem)] mobile:h-screen"
    >
      {list.length < MAX_CONVERSATION_LENGTH && (
        <div className="flex flex-shrink-0 p-4 !pb-0">

        </div>
      )}

      <nav className="mt-4 flex-1 space-y-1 bg-white p-4 !pt-0">
        <p className="text-gray-400 text-xs px-2 font-normal">{t('conversations')}</p>
        {list.map((item) => {
          const isCurrent = item.id === currentId
          const ItemIcon
            = isCurrent ? MessageCircle : MessageCircleDashed
          return (
            <div
              onClick={() => onCurrentIdChange(item.id)}
              key={item.id}
              className={classNames(
                isCurrent
                  ? 'bg-gray-200 text-primary-600'
                  : 'text-gray-700 hover:text-gray-700 hover:bg-gray-200',
                'group flex items-center rounded-md px-2 py-2 text-sm font-medium cursor-pointer',
              )}
            > <p className='text-ellipsis'>{item.name}</p>
              <Trash
                onClick={(e) => {
                  e.stopPropagation()
                  deleteConversation(item.id)
                }}
                className={classNames(
                  'text-gray-200 ml-auto h-4 w-4 hidden group-hover:block group-hover:text-gray-400 hover:text-gray-800'
                )}
                aria-hidden="true" />
            </div>
          )
        })}
      </nav>

      <div className="flex flex-shrink-0 pr-4 pb-4 pl-4">
        <div className="text-gray-400 font-normal text-xs">© {copyRight} {(new Date()).getFullYear()}</div>
      </div>
    </div>
  )
}

export default React.memo(Sidebar)

