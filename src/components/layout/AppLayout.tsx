import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
