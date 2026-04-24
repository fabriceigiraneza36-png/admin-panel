import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import Card from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';
import toast from 'react-hot-toast';
import { Shield, AlertTriangle, Key, Lock, Download } from 'lucide-react';

const SecuritySettings = () => {
  const { handleSubmit, formState: { isSubmitting } } = useForm();
  const [backupLoading, setBackupLoading] = useState(false);
  const [show2FAForm, setShow2FAForm] = useState(false);

  const onSubmit = async () => {
    try {
      // TODO: Implement API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Security settings updated!');
    } catch (error) {
      toast.error('Failed to update security settings');
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      // TODO: Implement backup API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Database backup created successfully!');
    } catch (error) {
      toast.error('Backup failed');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      setBackupLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Backup downloaded!');
    } catch (error) {
      toast.error('Download failed');
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
      {/* Two-Factor Authentication */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Shield className="h-6 w-6 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900">
                  Two-Factor Authentication (2FA)
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Add an extra layer of security to your admin account
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShow2FAForm(!show2FAForm)}
            >
              {show2FAForm ? 'Cancel' : 'Setup'}
            </Button>
          </div>

          {show2FAForm && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-t border-gray-200 pt-4 mt-4"
            >
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator)
                  </p>
                </div>
                <div className="flex justify-center">
                  <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500 text-sm">QR Code</span>
                  </div>
                </div>
                <Input
                  label="Verification Code"
                  placeholder="Enter 6-digit code from your authenticator"
                  maxLength="6"
                />
                <Button type="button" fullWidth>
                  Verify & Enable 2FA
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </Card>

      {/* Session Management */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Lock className="h-6 w-6 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                Active Sessions
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Manage your logged-in sessions across devices
              </p>
            </div>
          </div>

          <div className="space-y-2 border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 text-sm">Current Session</p>
                <p className="text-xs text-gray-500">Chrome on Windows • Now</p>
              </div>
              <span className="text-xs font-semibold text-green-600">Active</span>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            fullWidth
          >
            Sign Out All Other Sessions
          </Button>
        </div>
      </Card>

      {/* Database Backup */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Download className="h-6 w-6 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                Database Backup
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Create and manage backups of your database
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">Last backup</p>
              <p className="text-sm text-gray-600 mt-1">
                2 hours ago • 2024-01-15 14:30:00
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleBackup}
                loading={backupLoading}
                fullWidth
              >
                Create Backup Now
              </Button>
              <Button
                type="button"
                variant="outline"
                icon={Download}
                onClick={handleExportBackup}
                loading={backupLoading}
                fullWidth
              >
                Download
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card>
        <div className="border-l-4 border-red-500 pl-4 space-y-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900">Danger Zone</h3>
              <p className="text-sm text-gray-600">
                Irreversible and destructive actions
              </p>
            </div>
          </div>

          <div className="space-y-2 border-t border-red-200 pt-4">
            <Button
              type="button"
              variant="danger"
              fullWidth
            >
              Reset All Settings
            </Button>
            <Button
              type="button"
              variant="danger"
              fullWidth
            >
              Delete All Data
            </Button>
          </div>
        </div>
      </Card>
    </motion.form>
  );
};

export default SecuritySettings;