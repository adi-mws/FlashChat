import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../components/marketing/Header'

export default function MarketingLayout() {
  return (
    <div className='MarketingLayout w-full'>
      <Header />
      <Outlet />
    </div>
  )
}
