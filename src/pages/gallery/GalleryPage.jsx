import { motion } from 'framer-motion';
import Breadcrumb from '@/components/layout/Breadcrumb';

const GalleryPage = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <Breadcrumb items={[{ label: 'Gallery', path: '/gallery' }]} />
      <h1 className="text-3xl font-bold text-gray-900">Gallery</h1>
      <div className="bg-white rounded-xl p-12 text-center">
        <p className="text-gray-600">Gallery management coming soon...</p>
      </div>
    </motion.div>
  );
};

export default GalleryPage;