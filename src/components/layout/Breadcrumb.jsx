import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/utils/cn';

const Breadcrumb = ({ items, className }) => {
  const location = useLocation();

  // Auto-generate breadcrumbs from path if items not provided
  const breadcrumbItems = items || location.pathname
    .split('/')
    .filter(Boolean)
    .map((segment, index, array) => ({
      label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
      path: '/' + array.slice(0, index + 1).join('/'),
    }));

  return (
    <nav className={cn('flex items-center space-x-2 text-sm', className)}>
      <Link
        to="/dashboard"
        className="text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;

        return (
          <div key={item.path} className="flex items-center">
            <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />
            {isLast ? (
              <span className="text-gray-900 font-medium">{item.label}</span>
            ) : (
              <Link
                to={item.path}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;