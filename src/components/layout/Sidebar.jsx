import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Globe,
  MapPin,
  Calendar,
  FileText,
  Mail,
  Users,
  Image,
  Briefcase,
  HelpCircle,
  Lightbulb,
  UserPlus,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/store/uiStore';
import { ROUTES } from '@/utils/constants';

const Sidebar = () => {
  const location = useLocation();
  const { sidebarOpen, sidebarCollapsed, toggleSidebarCollapse } = useUIStore();

  const menuItems = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: ROUTES.DASHBOARD,
    },
    {
      label: 'Countries',
      icon: Globe,
      path: ROUTES.COUNTRIES,
    },
    {
      label: 'Destinations',
      icon: MapPin,
      path: ROUTES.DESTINATIONS,
    },
    {
      label: 'Bookings',
      icon: Calendar,
      path: ROUTES.BOOKINGS,
      badge: 'new',
    },
    {
      label: 'Blog Posts',
      icon: FileText,
      path: ROUTES.POSTS,
    },
    {
      label: 'Messages',
      icon: Mail,
      path: ROUTES.CONTACT,
      badge: 'urgent',
    },
    {
      label: 'Team',
      icon: Users,
      path: ROUTES.TEAM,
    },
    {
      label: 'Gallery',
      icon: Image,
      path: ROUTES.GALLERY,
    },
    {
      label: 'Services',
      icon: Briefcase,
      path: ROUTES.SERVICES,
    },
    {
      label: 'FAQs',
      icon: HelpCircle,
      path: ROUTES.FAQS,
    },
    {
      label: 'Tips',
      icon: Lightbulb,
      path: ROUTES.TIPS,
    },
    {
      label: 'Subscribers',
      icon: UserPlus,
      path: ROUTES.SUBSCRIBERS,
    },
    {
      label: 'Settings',
      icon: Settings,
      path: ROUTES.SETTINGS,
    },
  ];

  if (!sidebarOpen) return null;

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 80 : 280 }}
      className="fixed left-0 top-0 h-screen bg-white border-r border-gray-200 z-40 flex flex-col"
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
        <AnimatePresence mode="wait">
          {!sidebarCollapsed ? (
            <motion.div
              key="logo-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Altuvera</span>
            </motion.div>
          ) : (
            <motion.div
              key="logo-collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center mx-auto"
            >
              <span className="text-white font-bold text-lg">A</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0 transition-colors',
                      isActive ? 'text-primary-600' : 'text-gray-500 group-hover:text-gray-700'
                    )}
                  />
                  
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="font-medium whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {item.badge && !sidebarCollapsed && (
                    <span className="ml-auto">
                      <span className="flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                      </span>
                    </span>
                  )}

                  {/* Tooltip for collapsed state */}
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                      {item.label}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                    </div>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={toggleSidebarCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5 text-gray-600" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;