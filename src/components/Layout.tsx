import React from "react"
import Sidebar from "./Sidebar"
import TopBar from "./TopBar"
import GuidedOverlay from "./GuidedOverlay"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1">
        <TopBar />
        <main className="p-6 max-w-[1400px] mx-auto">
          {children}
        </main>
      </div>

      <GuidedOverlay />
    </div>
  )
}
