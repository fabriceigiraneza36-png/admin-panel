import { useState } from 'react';
import { cn } from '@/utils/cn';
import { motion } from 'framer-motion';

const Tabs = ({ tabs, defaultTab = 0, onChange, className }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (index) => {
    setActiveTab(index);
    onChange?.(index);
  };

  return (
    <div className={className}>
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => handleTabChange(index)}
              className={cn(
                'relative px-4 py-2 font-medium transition-colors',
                activeTab === index
                  ? 'text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {tab.label}
              {activeTab === index && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {tabs[activeTab]?.content}
      </div>
    </div>
  );
};

export default Tabs;