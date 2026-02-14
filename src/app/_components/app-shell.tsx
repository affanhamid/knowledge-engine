"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen">
      {collapsed ? (
        <div className="sticky top-0 flex shrink-0 flex-col border-r border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
          <button
            onClick={() => setCollapsed(false)}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            title="Open sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="sticky top-0 shrink-0">
          <Sidebar onCollapse={() => setCollapsed(true)} />
        </div>
      )}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
