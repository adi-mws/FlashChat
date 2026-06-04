import React from 'react'
import AppHeader from '../components/layout/AppHeader'
import { Outlet } from 'react-router-dom'

export default function DetailsLayout({title, headerActions, children}) {
  return (
    <>
    <AppHeader title={title}>
        {headerActions}
    </AppHeader>
    <div className='w-full h-full dark:bg-zinc-950'>
        {children}
        <Outlet />
    </div>
    </>
  )
}
