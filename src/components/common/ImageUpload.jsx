import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatters } from '@/utils/formatters';

const ImageUpload = ({
  value,
  onChange,
  multiple = false,
  maxFiles = 5,
  maxSize = 5242880, // 5MB
  accept = { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
  className,
}) => {
  const [previews, setPreviews] = useState(value ? (Array.isArray(value) ? value : [value]) : []);

  const onDrop = useCallback((acceptedFiles) => {
    const newPreviews = acceptedFiles.map((file) =>
      Object.assign(file, {
        preview: URL.createObjectURL(file),
      })
    );

    if (multiple) {
      const updated = [...previews, ...newPreviews].slice(0, maxFiles);
      setPreviews(updated);
      onChange(updated);
    } else {
      setPreviews(newPreviews);
      onChange(newPreviews[0]);
    }
  }, [multiple, maxFiles, onChange, previews]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxSize,
    maxFiles,
  });

  const removeImage = (index) => {
    const updated = previews.filter((_, i) => i !== index);
    setPreviews(updated);
    onChange(multiple ? updated : null);
  };

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400'
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center">
          <Upload className="h-12 w-12 text-gray-400 mb-4" />
          
          {isDragActive ? (
            <p className="text-primary-600 font-medium">Drop the files here</p>
          ) : (
            <>
              <p className="text-gray-700 font-medium mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-gray-500">
                PNG, JPG, GIF up to {formatters.fileSize(maxSize)}
              </p>
            </>
          )}
        </div>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {previews.map((file, index) => (
            <div key={index} className="relative group">
              <img
                src={file.preview || file}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;