import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../components/Header'

export default function WebsiteLayout() {
  return (
    <div className='WebsiteLayout grid grid-rows-[60px_calc(100%-60px)'>
        <Header />
        <Outlet />
    </div>
  )
}
