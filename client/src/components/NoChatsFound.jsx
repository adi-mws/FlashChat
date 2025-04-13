import React from 'react'

export default function NoChatsFound({ setShowSearchUsers, children }) {
  return (
    <div className="nochatsfound-wrapper bg-zinc-300 grid place-items-center dark:bg-zinc-900 w-full">
      <div className='selectChat w-100 h-60 gap-4 px-10 dark:border-zinc-800 border-1 rounded-lg flex flex-col items-center justify-center'>
        <p className="dark:text-white font-bold text-1xl">No Chats Found</p>
        {children}
        <p className="dark:text-zinc-300 text-sm text-center">Search People to chat with them using username</p>
        <button className="dark:text-zinc-300 text-sm text-center text-zinc-300 underline" onClick={() => { setShowSearchUsers(true) }}>Add People</button>

      </div>
    </div>

  )
}


