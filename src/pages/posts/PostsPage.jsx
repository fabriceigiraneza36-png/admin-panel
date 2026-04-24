import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePosts } from '@/hooks/usePosts';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';

const PostsPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { posts, isLoading } = usePosts({ page, limit: 12 });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <Breadcrumb items={[{ label: 'Blog Posts', path: '/posts' }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blog Posts</h1>
          <p className="text-gray-500 mt-1">Create and manage blog content</p>
        </div>
        <Button
          icon={Plus}
          onClick={() => navigate('/posts/create')}
        >
          New Post
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner fullScreen />
      ) : posts.length === 0 ? (
        <EmptyState
          title="No posts yet"
          description="Start creating blog posts to engage your audience"
          action={() => navigate('/posts/create')}
          actionLabel="Create Post"
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/posts/${post.id}/edit`)}
            >
              <h3 className="text-lg font-semibold text-gray-900">{post.title}</h3>
              <p className="text-gray-600 mt-2 line-clamp-2">{post.excerpt}</p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-500">{post.category}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${post.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {post.is_published ? 'Published' : 'Draft'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default PostsPage;