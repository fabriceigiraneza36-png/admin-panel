import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import Card from '../common/Card';
import Input from '../common/Input';
import Button from '../common/Button';
import Textarea from '../common/Textarea';
import ImageUpload from '../common/ImageUpload';
import toast from 'react-hot-toast';

const GeneralSettings = () => {
  const { register, handleSubmit, formState: { isSubmitting }, setValue, watch } = useForm({
    defaultValues: {
      site_title: 'Altuvera Travel',
      site_description: 'Explore Africa\'s most stunning destinations',
      contact_email: 'contact@altuvera.com',
      contact_phone: '+250788123456',
      whatsapp_number: '+250788123456',
    },
  });

  const onSubmit = async (data) => {
    try {
      // TODO: Implement API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('General settings updated successfully!');
    } catch (error) {
      toast.error('Failed to update general settings');
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
      <Card title="General Settings" subtitle="Update your website's basic information">
        <div className="space-y-4">
          <Input
            label="Site Title"
            placeholder="Altuvera Travel"
            {...register('site_title', { required: 'Site title is required' })}
          />

          <Textarea
            label="Site Description"
            placeholder="Brief description of your travel platform"
            rows={3}
            {...register('site_description')}
          />

          <Input
            label="Contact Email"
            type="email"
            placeholder="contact@example.com"
            {...register('contact_email', { 
              required: 'Contact email is required',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Invalid email format'
              }
            })}
          />

          <Input
            label="Contact Phone"
            placeholder="+250788123456"
            {...register('contact_phone')}
          />

          <Input
            label="WhatsApp Number"
            placeholder="+250788123456"
            {...register('whatsapp_number')}
          />

          <ImageUpload
            label="Logo"
            multiple={false}
            onChange={(file) => setValue('logo_url', file)}
          />

          <Button
            type="submit"
            loading={isSubmitting}
            fullWidth
          >
            Save General Settings
          </Button>
        </div>
      </Card>
    </motion.form>
  );
};

export default GeneralSettings;