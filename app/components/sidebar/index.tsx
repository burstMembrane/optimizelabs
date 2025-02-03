import React from 'react'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

// import chat buttons from lucide-react
import { Trash } from 'lucide-react'
import type { ConversationItem } from '@/types/app'

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}

const MAX_CONVERSATION_LENGTH = 20

export interface ISidebarProps {
  copyRight: string
  currentId: string
  onCurrentIdChange: (id: string) => void
  deleteConversation: (id: string) => Promise<void>
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
      className="h-full flex flex-col overflow-y-auto bg-white w-[244px] border-r border-gray-200 tablet:h-[calc(100vh_-_3rem)] mobile:h-screen"
    >
      <nav className="mt-4 flex-1 space-y-1 bg-white p-4 !pt-0">
        <p className="text-gray-400 text-xs px-2 font-normal">{t('conversations')}</p>
        {list.slice(0, MAX_CONVERSATION_LENGTH).map((item, index) => {
          const isCurrent = item.id === currentId
          const isFirstConversation = index === 0

          return (
            <div
              onClick={() => onCurrentIdChange(item.id)}
              key={item.id}
              className={classNames(
                isCurrent
                  ? 'bg-gray-200 text-primary-600 font-bold'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-700',
                'group select-none flex items-center px-2 py-2 text-sm font-medium cursor-pointer truncate',
              )}
            >
              <span className="truncate">{item.name}</span>

              {!isFirstConversation && (
                <Trash className="w-4 h-4 ml-auto text-gray-50 hover:text-gray-700" onClick={() => deleteConversation(item.id)} />
              )}
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
