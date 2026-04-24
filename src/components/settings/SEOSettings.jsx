import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import Card from '../common/Card';
import Input from '../common/Input';
import Textarea from '../common/Textarea';
import Button from '../common/Button';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';

const SEOSettings = () => {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      meta_default_title: 'Altuvera Travel - Explore African Destinations',
      meta_default_description: 'Discover the best travel experiences across Africa with Altuvera Travel',
      google_analytics_id: 'UA-XXXXXXXXX-X',
      google_search_console: '',
      sitemap_url: 'https://altuvera.com/sitemap.xml',
      robots_txt: 'User-agent: *\nAllow: /',
    },
  });

  const onSubmit = async (data) => {
    try {
      // TODO: Implement API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('SEO settings updated successfully!');
    } catch (error) {
      toast.error('Failed to update SEO settings');
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
      <Card title="SEO Settings" subtitle="Configure search engine optimization for better visibility">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex gap-3">
              <Search className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 text-sm">SEO Tips</h4>
                <p className="text-sm text-blue-800 mt-1">
                  Keep your meta titles under 60 characters and descriptions under 160 characters for optimal display in search results.
                </p>
              </div>
            </div>
          </div>

          <Input
            label="Default Meta Title"
            placeholder="Altuvera Travel - Explore African Destinations"
            helperText="Recommended: 50-60 characters"
            {...register('meta_default_title', { 
              required: 'Meta title is required',
              maxLength: { value: 60, message: 'Must be 60 characters or less' }
            })}
          />

          <Textarea
            label="Default Meta Description"
            placeholder="Describe your website in 1-2 sentences"
            rows={3}
            helperText="Recommended: 150-160 characters"
            {...register('meta_default_description', {
              maxLength: { value: 160, message: 'Must be 160 characters or less' }
            })}
          />

          <Input
            label="Google Analytics ID"
            placeholder="UA-XXXXXXXXX-X or G-XXXXXXXXXX"
            {...register('google_analytics_id')}
          />

          <Input
            label="Google Search Console Verification"
            placeholder="Your verification code"
            {...register('google_search_console')}
          />

          <Input
            label="Sitemap URL"
            placeholder="https://altuvera.com/sitemap.xml"
            type="url"
            {...register('sitemap_url')}
          />

          <Textarea
            label="Robots.txt"
            rows={4}
            placeholder="Configure your robots.txt"
            {...register('robots_txt')}
          />

          <Button
            type="submit"
            loading={isSubmitting}
            fullWidth
          >
            Update SEO Settings
          </Button>
        </div>
      </Card>
    </motion.form>
  );
};

export default SEOSettings;