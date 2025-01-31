import type { FC } from 'react'
import React from 'react'
import { Bars3Icon } from '@heroicons/react/24/solid'
import { Cog, PanelLeft, SquarePen } from 'lucide-react'

// Types
type HeaderProps = {
  title: string
  isMobile?: boolean
  onShowSideBar?: () => void
  onCreateNewChat?: () => void
}

type MobileSidebarButtonProps = {
  buttonClassName: string
  iconClassName: string
  onShowSideBar?: () => void
}

// Constants
const STYLE = {
  icon: 'text-gray-500',
  mobileButton: 'flex items-center justify-center h-8 w-8 cursor-pointer',
  header: 'shrink-0 flex items-center justify-between h-12 px-3  bg-transparent border-gray-200 border-b-1 ',
  appInfo: {
    wrapper: 'flex items-center space-x-2 absolute left-1/2 -translate-x-1/2',
    title: 'text-xl text-gray-800 font-bold',
  },
} as const

// Component for mobile sidebar toggle button
const MobileSidebarButton: FC<MobileSidebarButtonProps> = ({
  buttonClassName,
  iconClassName,
  onShowSideBar,
}) => (
  <div
    className={buttonClassName}
    onClick={() => onShowSideBar?.()}
  >
    <Bars3Icon className={`h-4 w-4 ${iconClassName}`} />
  </div>
)

const Header: FC<HeaderProps> = ({
  title,
  isMobile,
  onShowSideBar,
  onCreateNewChat,
}) => {
  const SidebarButton = () => {
    if (isMobile) {
      return (
        <MobileSidebarButton
          buttonClassName={STYLE.mobileButton}
          iconClassName={STYLE.icon}
          onShowSideBar={onShowSideBar}
        />
      )
    }

    return (
      <div>
        <PanelLeft
          onClick={() => onShowSideBar?.()}
          className={`h-6 w-6 ${STYLE.icon} cursor-pointer`}
        />
      </div>
    )
  }

  const AppInfo = () => (
    <div className={STYLE.appInfo.wrapper}>
      <Cog className={`h-6 w-6 ${STYLE.icon}`} />
      <div className={STYLE.appInfo.title}>
        {title}
      </div>
    </div>
  )

  const NewChatButton = () => {
    if (!isMobile)
      return null

    return (
      <div
        className={STYLE.mobileButton}
        onClick={() => onCreateNewChat?.()}
      >
        <SquarePen className={`h-4 w-4 ${STYLE.icon}`} />
      </div>
    )
  }

  return (
    <div className={STYLE.header}>
      {SidebarButton()}
      {AppInfo()}
      {NewChatButton()}
    </div>
  )
}

export default React.memo(Header)
