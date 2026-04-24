import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Button from '@/components/common/Button';
import PostForm from '@/components/posts/PostForm';

const CreatePost = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Posts', path: '/posts' },
        { label: 'Create', path: '/posts/create' },
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Create Post</h1>
        <Button
          variant="secondary"
          icon={ArrowLeft}
          onClick={() => navigate('/posts')}
        >
          Back
        </Button>
      </div>

      <PostForm onSuccess={() => navigate('/posts')} />
    </div>
  );
};

export default CreatePost;