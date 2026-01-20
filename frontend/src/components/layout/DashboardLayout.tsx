import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { Bell, LogOut } from "lucide-react";
import { useNotifications } from "../../hooks/useNotifications";
import { Sidebar } from "./Sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1">
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <h1 className="text-2xl font-bold text-blue-600">PropertyFlow</h1>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <button className="p-2 text-gray-600 hover:text-gray-900 rounded-lg">
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {user?.role.toLowerCase()}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {user?.firstName.charAt(0)}
                    {user?.lastName.charAt(0)}
                  </div>
                  <button
                    onClick={logout}
                    className="text-gray-600 hover:text-red-600"
                    title="Logout"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};
