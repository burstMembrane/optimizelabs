import type { FC } from 'react'
import React from 'react'
import { Bars3Icon } from '@heroicons/react/24/solid'
import { Cog, PanelLeft, SquarePen } from 'lucide-react'
import Image from 'next/image'

import { NewChatButton } from '@/app/components/new-chat-button'
import { on } from 'events'
import Logo from '@/app/components/base/logo/logo.svg'

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
  header: 'shrink-0 flex items-center justify-between h-12 px-3 bg-transparent border-gray-300 border-b-1 shadow-lg shadow-bottom',
  appInfo: {
    wrapper: 'flex items-center space-x-2 absolute left-1/2 -translate-x-1/2',
    title: 'text-xl text-gray-800 font-bold select-none',
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
  onCreateNewChat = () => { },
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
      <div className='flex items-center space-x-2'>
        <PanelLeft
          onClick={onShowSideBar}
          className={`h-6 w-6 ${STYLE.icon} cursor-pointer`}
        />
        <NewChatButton handleNewChat={onCreateNewChat} />

      </div>
    )
  }

  const AppInfo = () => (
    <div className={STYLE.appInfo.wrapper}>
      <Image src={Logo} alt="Logo" className="h-8 w-auto" />
    </div>
  )

  return (
    <div className={STYLE.header}>
      {SidebarButton()}
      {AppInfo()}
    </div>
  )
}

export default React.memo(Header)
