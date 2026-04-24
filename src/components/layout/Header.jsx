import { Menu, Bell, Search, Grid, List } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useNotificationStore } from '@/store/notificationStore';
import UserMenu from './UserMenu';
import NotificationPanel from './NotificationPanel';
import SearchBar from '../common/SearchBar';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Header = () => {
  const { sidebarOpen, sidebarCollapsed, toggleSidebar, viewMode, toggleViewMode } = useUIStore();
  const { unreadCount } = useNotificationStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const getLeftMargin = () => {
    if (!sidebarOpen) return 'ml-0';
    if (sidebarCollapsed) return 'ml-20';
    return 'ml-[280px]';
  };

  return (
    <>
      <header className={`fixed top-0 right-0 h-16 bg-white border-b border-gray-200 z-30 transition-all duration-300 ${getLeftMargin()}`}>
        <div className="h-full px-6 flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="h-6 w-6 text-gray-600" />
            </button>

            {/* Desktop Search */}
            <div className="hidden md:block w-96">
              <SearchBar
                placeholder="Search anything..."
                onSearch={(value) => console.log('Search:', value)}
              />
            </div>

            {/* Mobile Search Toggle */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Search className="h-6 w-6 text-gray-600" />
            </button>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <button
              onClick={toggleViewMode}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
            >
              {viewMode === 'grid' ? (
                <List className="h-5 w-5 text-gray-600" />
              ) : (
                <Grid className="h-5 w-5 text-gray-600" />
              )}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
              >
                <Bell className="h-6 w-6 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <NotificationPanel
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
              />
            </div>

            {/* User Menu */}
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-0 right-0 bg-white border-b border-gray-200 p-4 z-20 md:hidden"
          >
            <SearchBar
              placeholder="Search anything..."
              onSearch={(value) => console.log('Search:', value)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;