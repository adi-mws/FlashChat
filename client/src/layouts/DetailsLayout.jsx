import React from 'react'
import AppHeader from '../components/layout/AppHeader'
import { Outlet } from 'react-router-dom'

export default function DetailsLayout({title, headerActions, children}) {
  return (
    <div className='w-full h-screen flex flex-col dark:bg-zinc-950 overflow-hidden'>
      {title && (
          <AppHeader title={title}>
              {headerActions}
          </AppHeader>
      )}
      <div className='flex-1 w-full overflow-hidden min-h-0 relative'>
          {children}
          <Outlet />
      </div>
    </div>
  )
}
