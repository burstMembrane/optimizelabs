import { FC } from 'react';
import { SquarePen } from 'lucide-react';

const NewChatButton: FC<{ handleNewChat: () => void }> = ({ handleNewChat }) => {
  return (
    <div
    >
      <SquarePen
        onClick={handleNewChat}
        className="h-6 w-6 text-gray-500 cursor-pointer" />
    </div>
  )
}

export { NewChatButton }
