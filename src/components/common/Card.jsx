import { cn } from '@/utils/cn';
import { motion } from 'framer-motion';

const Card = ({
  children,
  title,
  subtitle,
  actions,
  hoverable = false,
  className,
  headerClassName,
  bodyClassName,
}) => {
  return (
    <motion.div
      whileHover={hoverable ? { y: -4 } : {}}
      className={cn(
        'bg-white rounded-xl shadow-sm border border-gray-100',
        hoverable && 'transition-shadow hover:shadow-md',
        className
      )}
    >
      {(title || subtitle || actions) && (
        <div
          className={cn(
            'px-6 py-4 border-b border-gray-100',
            headerClassName
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-gray-900">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
            {actions && <div>{actions}</div>}
          </div>
        </div>
      )}

      <div className={cn('p-6', bodyClassName)}>{children}</div>
    </motion.div>
  );
};

export default Card;