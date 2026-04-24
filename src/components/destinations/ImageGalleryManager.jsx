import { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Trash2, GripVertical, Star } from 'lucide-react';
import Button from '../common/Button';
import ImageUpload from '../common/ImageUpload';
import Card from '../common/Card';
import toast from 'react-hot-toast';

const ImageGalleryManager = ({ images = [], onSave }) => {
  const [imageList, setImageList] = useState(images);

  const addImages = (files) => {
    const newImages = Array.isArray(files) ? files : [files];
    setImageList([...imageList, ...newImages.slice(0, 10 - imageList.length)]);
  };

  const removeImage = (index) => {
    setImageList(imageList.filter((_, i) => i !== index));
    toast.success('Image removed');
  };

  const setPrimary = (index) => {
    const updated = imageList.map((img, i) => ({
      ...img,
      is_primary: i === index
    }));
    setImageList(updated);
    toast.success('Primary image updated');
  };

  const handleSave = () => {
    if (imageList.length === 0) {
      toast.error('Add at least one image');
      return;
    }
    onSave(imageList);
    toast.success('Gallery saved!');
  };

  return (
    <Card title="Image Gallery" subtitle="Upload and organize destination images">
      <div className="space-y-6">
        {imageList.length < 10 && (
          <ImageUpload
            multiple={true}
            maxFiles={10 - imageList.length}
            onChange={addImages}
          />
        )}

        {imageList.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              Images ({imageList.length}/10)
            </h4>
            <Reorder.Group
              axis="y"
              values={imageList}
              onReorder={setImageList}
              className="space-y-2"
            >
              <AnimatePresence>
                {imageList.map((image, index) => (
                  <Reorder.Item
                    key={index}
                    value={image}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
                    <img
                      src={typeof image === 'string' ? image : image.preview}
                      alt={`Gallery ${index}`}
                      className="w-16 h-16 rounded object-cover"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Image {index + 1}
                      </p>
                      {image.is_primary && (
                        <span className="text-xs text-primary-600 font-medium">
                          Primary Image
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setPrimary(index)}
                      className={`p-2 rounded transition-colors ${image.is_primary ? 'bg-yellow-100 text-yellow-600' : 'hover:bg-gray-200 text-gray-400'}`}
                      title="Set as primary"
                    >
                      <Star className="h-5 w-5" fill="currentColor" />
                    </button>
                    <button
                      onClick={() => removeImage(index)}
                      className="p-2 rounded hover:bg-red-50 text-red-600 transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          </div>
        )}

        <Button
          type="button"
          onClick={handleSave}
          fullWidth
          disabled={imageList.length === 0}
        >
          Save Gallery
        </Button>
      </div>
    </Card>
  );
};

export default ImageGalleryManager;