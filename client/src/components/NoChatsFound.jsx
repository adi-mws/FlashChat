import React from 'react'

export default function NoChatsFound() {
  return (
    <div className='selectChat w-100 h-60 gap-4 px-10 bg-gray-100 dark:bg-gray-900 rounded-lg flex flex-col items-center justify-center'>
      <p className="dark:text-primary font-bold text-1xl">No Chats Found</p>
      <p className="dark:text-gray-500 text-sm text-center">Search People to chat with them using username</p>
      <button className="dark:text-gray-500 text-sm text-center text-primary underline">Add People</button>

    </div>
  )
}


