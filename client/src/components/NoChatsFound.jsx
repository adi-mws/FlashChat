import React from 'react'

export default function NoChatsFound({ setShowSearchUsers, children }) {
  return (
    <div className='selectChat w-100 h-60 gap-4 px-10 bg-gray-100 dark:bg-zinc-900 rounded-lg flex flex-col items-center justify-center'>
      <p className="dark:text-white font-bold text-1xl">No Chats Found</p>
      {children}
      <p className="dark:text-zinc-500 text-sm text-center">Search People to chat with them using username</p>
      <button className="dark:text-zinc-500 text-sm text-center text-zinc-700 underline" onClick={() => { setShowSearchUsers(true) }}>Add People</button>

    </div>
  )
}


