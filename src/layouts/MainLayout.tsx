import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useWebSocket } from "../context/WebSocketContext";
import { useCoreHook } from "../context/CoreContext";

export default function MainLayout(): React.JSX.Element {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const { isConnected, disconnectedSince } = useWebSocket();
    const { isAllSites } = useCoreHook();

    return (
        <div className="min-h-screen flex bg-background dark:bg-dark-gradient bg-fixed text-slate-900 dark:text-slate-200 transition-colors duration-300">
            <Sidebar
                isCollapsed={isSidebarCollapsed}
                onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
            />
            <div
                className={`flex-1 flex flex-col transition-all duration-200 min-w-0 overflow-x-hidden pb-20 lg:pb-0 ${
                    isSidebarCollapsed ? "lg:ml-20" : "lg:ml-56"
                }`}
            >
                {!isAllSites && !isConnected && disconnectedSince && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Connection lost — reconnecting. Data may be outdated.
                    </div>
                )}
                <div className="flex-1 p-3 md:p-4 lg:p-5">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
