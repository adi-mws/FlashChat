import React from 'react'

export default function SelectChat() {
  return (
    <div className='selectChat w-100 h-60 border-1  gap-4 px-10 bg-gray-100 dark:bg-gray-900 rounded-lg flex flex-col items-center justify-center'>
        <p className="dark:text-primary font-bold text-1xl">Select Chat to View Messages</p>
        <p className="dark:text-gray-500 text-sm text-center">Select one of the chats from the chat list to View Messages</p>

    </div>
  )
}