import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import Button from '../common/Button';
import Input from '../common/Input';
import Textarea from '../common/Textarea';
import Select from '../common/Select';
import RichTextEditor from '../common/RichTextEditor';
import ImageUpload from '../common/ImageUpload';
import Card from '../common/Card';
import Tabs from '../common/Tabs';
import toast from 'react-hot-toast';
import { POST_CATEGORIES } from '@/utils/constants';

const PostForm = ({ post = null, onSuccess }) => {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: post || {
      title: '',
      slug: '',
      category: '',
      excerpt: '',
      content: '',
      author_name: '',
      is_published: false,
      is_featured: false,
    },
  });

  const onSubmit = (data) => {
    try {
      console.log('Post Data:', data);
      toast.success(post ? 'Post updated!' : 'Post created!');
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to save post');
    }
  };

  const tabs = [
    {
      label: 'Content',
      content: (
        <div className="space-y-4">
          <Input
            label="Post Title"
            placeholder="e.g., Gorilla Trekking in Rwanda"
            error={errors.title?.message}
            {...register('title', { required: 'Title is required' })}
          />

          <Textarea
            label="Excerpt"
            placeholder="Short summary for preview"
            rows={3}
            error={errors.excerpt?.message}
            {...register('excerpt')}
          />

          <RichTextEditor
            label="Content"
            value={watch('content')}
            onChange={(value) => setValue('content', value)}
          />
        </div>
      ),
    },
    {
      label: 'Details',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Category"
              options={POST_CATEGORIES.map(c => ({ label: c, value: c }))}
              error={errors.category?.message}
              {...register('category', { required: 'Category is required' })}
            />

            <Input
              label="Author"
              placeholder="Author name"
              error={errors.author_name?.message}
              {...register('author_name')}
            />
          </div>

          <ImageUpload
            label="Featured Image"
            multiple={false}
            onChange={(file) => setValue('image_url', file)}
          />
        </div>
      ),
    },
  ];

  return (
    <motion.form
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
      <Card>
        <Tabs tabs={tabs} />
      </Card>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary">Cancel</Button>
        <Button type="submit">
          {post ? 'Update Post' : 'Create Post'}
        </Button>
      </div>
    </motion.form>
  );
};

export default PostForm;