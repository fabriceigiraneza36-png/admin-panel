import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PostForm from '@/components/posts/PostForm';

const EditPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // TODO: Fetch post data
    setIsLoading(false);
  }, [id]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Posts', path: '/posts' },
        { label: post?.title || 'Loading...', path: `/posts/${id}/edit` },
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Edit Post</h1>
        <Button
          variant="secondary"
          icon={ArrowLeft}
          onClick={() => navigate('/posts')}
        >
          Back
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner fullScreen />
      ) : (
        <PostForm
          post={post}
          onSuccess={() => navigate('/posts')}
        />
      )}
    </div>
  );
};

export default EditPost;