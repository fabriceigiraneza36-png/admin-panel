import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Camera, Save, Lock } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import ImageUpload from '@/components/common/ImageUpload';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user } = useAuthStore();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      full_name: user?.full_name || '',
      email: user?.email || '',
    },
  });

  const onSubmit = async (data) => {
    try {
      // TODO: Implement profile update API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleChangePassword = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      // TODO: Implement change password API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Password changed successfully!');
      setShowChangePassword(false);
    } catch (error) {
      toast.error('Failed to change password');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <Breadcrumb items={[{ label: 'Profile', path: '/profile' }]} />

      <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>

      {/* Profile Card */}
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-2xl">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Profile Photo</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={Camera}
              >
                Change Photo
              </Button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="Your full name"
              error={errors.full_name?.message}
              {...register('full_name', { required: 'Full name is required' })}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="your@email.com"
              disabled
              value={user?.email}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <Button
              type="submit"
              icon={Save}
              loading={isSubmitting}
            >
              Save Changes
            </Button>

            <Button
              type="button"
              variant="outline"
              icon={Lock}
              onClick={() => setShowChangePassword(!showChangePassword)}
            >
              Change Password
            </Button>
          </div>
        </form>
      </Card>

      {/* Change Password Section */}
      {showChangePassword && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card title="Change Password" subtitle="Update your password to keep your account secure">
            <form onSubmit={(e) => {
              e.preventDefault();
              // TODO: Implement password change
            }} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                placeholder="••••••••"
              />
              <Input
                label="New Password"
                type="password"
                placeholder="••••••••"
              />
              <Input
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
              />

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <Button variant="secondary" onClick={() => setShowChangePassword(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Password</Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ProfilePage;