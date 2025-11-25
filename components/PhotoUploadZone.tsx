
import React, { useCallback, useState } from 'react';
import { Upload, X, Video as VideoIcon, Loader2, CheckCircle2, AlertCircle, FileVideo } from 'lucide-react';
import { ProcessingStatus, ExtractedData } from '../types';
import VideoUploadZone from './VideoUploadZone';

interface PhotoUploadZoneProps {
  images: string[];
  onImagesChange: (newImages: string[]) => void;
  
  // Updated Video Props
  videoData: ExtractedData | null;
  onVideoProcessed: (data: ExtractedData) => void;
  onVideoProcessStart: () => void;
  onVideoProcessError: (msg: string) => void;
  onRemoveVideo: () => void;
  
  status: ProcessingStatus;
}

const PhotoUploadZone: React.FC<PhotoUploadZoneProps> = ({ 
  images, 
  onImagesChange, 
  videoData, 
  onVideoProcessed,
  onVideoProcessStart,
  onVideoProcessError,
  onRemoveVideo,
  status 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVideoInput, setShowVideoInput] = useState(false);

  const processFiles = (files: FileList | File[]) => {
    if (status !== ProcessingStatus.IDLE && status !== ProcessingStatus.COMPLETED && status !== ProcessingStatus.ERROR) return;
    setError(null);

    const newImages: string[] = [];
    const readers: Promise<void>[] = [];

    Array.from(files).forEach(file => {
      if (file.type.startsWith('video/')) {
         setShowVideoInput(true);
      } else if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        const promise = new Promise<void>((resolve) => {
          reader.onloadend = () => {
            if (reader.result) {
              newImages.push(reader.result as string);
            }
            resolve();
          };
        });
        reader.readAsDataURL(file);
        readers.push(promise);
      }
    });

    Promise.all(readers).then(() => {
      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
      }
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (status === ProcessingStatus.ANALYZING) return;
    setIsDragging(true);
  }, [status]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (status === ProcessingStatus.ANALYZING) return;
    
    const files = (e.dataTransfer as any).files;
    if (files) {
      processFiles(files);
    }
  }, [images, onImagesChange, status]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = (e.target as any).files;
    if (files) {
      processFiles(files);
    }
  };

  const removeImage = (indexToRemove: number) => {
    if (status === ProcessingStatus.ANALYZING) return;
    onImagesChange(images.filter((_, index) => index !== indexToRemove));
  };

  const getStatusBadge = () => {
    switch (status) {
      case ProcessingStatus.ANALYZING:
        return <span className="flex items-center gap-1 text-blue-600"><Loader2 size={12} className="animate-spin" /> Analyzing</span>;
      case ProcessingStatus.COMPLETED:
        return <span className="flex items-center gap-1 text-green-600"><CheckCircle2 size={12} /> Scanned</span>;
      case ProcessingStatus.ERROR:
        return <span className="flex items-center gap-1 text-red-600"><AlertCircle size={12} /> Error</span>;
      default:
        return <span className="text-slate-500">Pending</span>;
    }
  };

  const isLocked = status === ProcessingStatus.ANALYZING;

  if (showVideoInput && !videoData) {
    return (
      <VideoUploadZone 
        onVideoProcessed={(data) => {
          onVideoProcessed(data);
          setShowVideoInput(false);
        }}
        onProcessStart={onVideoProcessStart}
        onProcessError={onVideoProcessError}
        onCancel={() => setShowVideoInput(false)} 
      />
    );
  }

  return (
    <div className="space-y-4 select-none">
      {!videoData && (
        <>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ease-in-out group ${
            isDragging
              ? 'border-blue-500 bg-blue-50 scale-[1.01] shadow-md'
              : isLocked 
                ? 'border-slate-200 bg-slate-50 opacity-70 cursor-not-allowed' 
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50 cursor-pointer'
          }`}
        >
          {!isLocked && (
            <input
              type="file"
              multiple
              accept="image/*,video/mp4,video/webm"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
          )}
          
          <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
            <div className={`p-3 rounded-full transition-colors ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 group-hover:text-slate-600'}`}>
              {isLocked ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                {isLocked ? 'Analysis in progress...' : 'Click or drag video & photos'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                MP4, WebM, JPG, PNG
              </p>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        </>
      )}

      {videoData && (
        <div className="relative bg-slate-900 rounded-lg overflow-hidden border border-slate-200 shadow-sm animate-in group p-4 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="bg-white/10 p-3 rounded-lg text-white">
                <FileVideo size={24} />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Video Walkthrough</p>
                <p className="text-green-400 text-xs font-mono flex items-center gap-1">
                   <CheckCircle2 size={10} /> Scanned ({videoData.frames.length} Frames + Audio)
                </p>
              </div>
           </div>

           <div className="flex items-center gap-2">
             {!isLocked && (
              <button
                onClick={onRemoveVideo}
                className="p-2 bg-white/10 hover:bg-red-500/80 hover:text-white text-slate-300 rounded-full transition-all"
              >
                <X size={16} />
              </button>
            )}
           </div>
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-in">
          {images.map((img, idx) => (
            <div key={idx} className="group relative aspect-square bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <img 
                src={img} 
                alt={`Upload ${idx + 1}`} 
                className={`w-full h-full object-cover transition-transform duration-500 ${isLocked ? 'opacity-80 grayscale-[0.3]' : 'group-hover:scale-105'}`}
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
              
              {!isLocked && (
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute top-1.5 right-1.5 p-1.5 bg-white/90 hover:bg-red-500 hover:text-white text-slate-600 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 transform hover:scale-110 z-20"
                  title="Remove photo"
                >
                  <X size={14} />
                </button>
              )}

              <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/90 text-slate-700 shadow-sm backdrop-blur-sm">
                   #{idx + 1}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/90 shadow-sm backdrop-blur-sm">
                   {getStatusBadge()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoUploadZone;
