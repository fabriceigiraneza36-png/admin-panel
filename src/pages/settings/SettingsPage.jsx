import { useState } from 'react';
import { motion } from 'framer-motion';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Tabs from '@/components/common/Tabs';
import GeneralSettings from '@/components/settings/GeneralSettings';
import SocialSettings from '@/components/settings/SocialSettings';
import SEOSettings from '@/components/settings/SEOSettings';
import SecuritySettings from '@/components/settings/SecuritySettings';

const SettingsPage = () => {
  const tabs = [
    {
      label: 'General',
      content: <GeneralSettings />,
    },
    {
      label: 'Social Media',
      content: <SocialSettings />,
    },
    {
      label: 'SEO',
      content: <SEOSettings />,
    },
    {
      label: 'Security',
      content: <SecuritySettings />,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <Breadcrumb items={[{ label: 'Settings', path: '/settings' }]} />

      <h1 className="text-3xl font-bold text-gray-900">Settings</h1>

      <Tabs tabs={tabs} />
    </motion.div>
  );
};

export default SettingsPage;