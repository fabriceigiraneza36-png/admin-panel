import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Send, Paperclip } from 'lucide-react';
import Card from '../common/Card';
import Input from '../common/Input';
import Button from '../common/Button';
import RichTextEditor from '../common/RichTextEditor';
import toast from 'react-hot-toast';

const ReplyForm = ({ messageId, onSend }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch } =
    useForm({
      defaultValues: {
        subject: 'Re: ',
        body: '',
      },
    });

  const [attachments, setAttachments] = useState([]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        messageId,
        ...data,
        attachments,
      };
      await onSend(payload);
      reset();
      setAttachments([]);
      toast.success('Reply sent successfully!');
    } catch (error) {
      toast.error('Failed to send reply');
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setAttachments([...attachments, ...files]);
    toast.success(`${files.length} file(s) added`);
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
    toast.success('File removed');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card title="Send Reply" subtitle="Respond to this customer message">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Subject"
            placeholder="Re: Customer Inquiry"
            error={errors.subject?.message}
            {...register('subject', { required: 'Subject is required' })}
          />

          <RichTextEditor
            label="Message"
            value={watch('body')}
            onChange={(value) => setValue('body', value)}
          />

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments
            </label>
            {attachments.length > 0 && (
              <div className="mb-3 space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 transition-colors cursor-pointer">
              <Paperclip className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                Click to attach files
              </span>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              icon={Send}
              loading={isSubmitting}
              fullWidth
            >
              Send Reply
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
};

export default ReplyForm;