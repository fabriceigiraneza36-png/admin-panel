import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Facebook, Twitter, Instagram, Linkedin, Youtube } from 'lucide-react';
import Card from '../common/Card';
import Input from '../common/Input';
import Button from '../common/Button';
import toast from 'react-hot-toast';

const SocialSettings = () => {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      social_facebook: 'https://facebook.com/altuvera',
      social_twitter: 'https://twitter.com/altuvera',
      social_instagram: 'https://instagram.com/altuvera',
      social_linkedin: 'https://linkedin.com/company/altuvera',
      social_youtube: 'https://youtube.com/@altuvera',
    },
  });

  const onSubmit = async (data) => {
    try {
      // TODO: Implement API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Social media links updated successfully!');
    } catch (error) {
      toast.error('Failed to update social media links');
    }
  };

  const socials = [
    { icon: Facebook, label: 'Facebook', name: 'social_facebook', color: 'text-blue-600' },
    { icon: Twitter, label: 'Twitter', name: 'social_twitter', color: 'text-blue-400' },
    { icon: Instagram, label: 'Instagram', name: 'social_instagram', color: 'text-pink-600' },
    { icon: Linkedin, label: 'LinkedIn', name: 'social_linkedin', color: 'text-blue-700' },
    { icon: Youtube, label: 'YouTube', name: 'social_youtube', color: 'text-red-600' },
  ];

  return (
    <motion.form
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
      <Card title="Social Media" subtitle="Update your social media profiles and links">
        <div className="space-y-4">
          {socials.map(social => {
            const Icon = social.icon;
            return (
              <div key={social.name} className="flex items-center gap-3">
                <div className={`p-3 bg-gray-100 rounded-lg ${social.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <Input
                  placeholder={`${social.label} Profile URL`}
                  type="url"
                  {...register(social.name, {
                    pattern: {
                      value: /^(https?:\/\/)?.+/,
                      message: 'Please enter a valid URL'
                    }
                  })}
                />
              </div>
            );
          })}

          <Button
            type="submit"
            loading={isSubmitting}
            fullWidth
          >
            Update Social Media Links
          </Button>
        </div>
      </Card>
    </motion.form>
  );
};

export default SocialSettings;