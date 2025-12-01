import React, { useCallback, useState } from 'react';
import { Upload, X, Loader2, CheckCircle2, AlertCircle, FileVideo, ImagePlus, Mic } from 'lucide-react';
import { ProcessingStatus, ExtractedData } from '../types';
import VideoUploadZone from './VideoUploadZone';

interface PhotoUploadZoneProps {
  images: string[];
  onImagesChange: (newImages: string[]) => void;
  audioFiles: File[];
  onAudioFilesChange: (newAudioFiles: File[]) => void;
  
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
  audioFiles,
  onAudioFilesChange,
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
    const newAudios: File[] = [];
    const readers: Promise<void>[] = [];

    Array.from(files).forEach(file => {
      if (file.type.startsWith('video/')) {
         setShowVideoInput(true);
      } else if (file.type.startsWith('audio/')) {
         newAudios.push(file);
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

    if (newAudios.length > 0) {
      onAudioFilesChange([...audioFiles, ...newAudios]);
    }

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
  }, [images, audioFiles, status]);

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

  const removeAudio = (indexToRemove: number) => {
    if (status === ProcessingStatus.ANALYZING) return;
    onAudioFilesChange(audioFiles.filter((_, index) => index !== indexToRemove));
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
      
      {/* 1. VIDEO CARD */}
      {videoData && (
        <div className="relative bg-slate-900 rounded-lg overflow-hidden border border-slate-200 shadow-sm animate-in group p-4 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="bg-white/10 p-3 rounded-lg text-white">
                <FileVideo size={24} />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Video Walkthrough</p>
                <p className="text-green-400 text-xs font-mono flex items-center gap-1">
                   <CheckCircle2 size={10} /> Analyzed ({videoData.frames.length} Frames + Audio)
                </p>
              </div>
           </div>
           <button onClick={onRemoveVideo} disabled={isLocked} className="p-2 bg-white/10 hover:bg-red-500/80 hover:text-white text-slate-300 rounded-full transition-all">
             <X size={16} />
           </button>
        </div>
      )}

      {/* 2. AUDIO FILES LIST */}
      {audioFiles.length > 0 && (
        <div className="flex flex-col gap-2">
          {audioFiles.map((file, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-purple-50 border border-purple-100 rounded-lg animate-in">
               <div className="flex items-center gap-3">
                 <div className="bg-white p-2 rounded-md text-purple-600 shadow-sm">
                   <Mic size={18} />
                 </div>
                 <div>
                   <p className="text-xs font-bold text-purple-900 truncate max-w-[200px]">{file.name}</p>
                   <p className="text-[10px] text-purple-600">External Audio Track</p>
                 </div>
               </div>
               <button onClick={() => removeAudio(idx)} disabled={isLocked} className="text-purple-400 hover:text-red-500 transition-colors">
                 <X size={14} />
               </button>
            </div>
          ))}
        </div>
      )}

      {/* 3. UPLOAD ZONE */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ease-in-out group ${
          isDragging ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50 cursor-pointer'
        }`}
      >
        {!isLocked && (
          <input
            type="file"
            multiple
            accept="image/*,video/mp4,video/webm,audio/*"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
        )}
        
        <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
          <div className="p-3 rounded-full bg-slate-100 text-slate-400 group-hover:text-slate-600">
            {isLocked ? <Loader2 size={24} className="animate-spin" /> : videoData ? <ImagePlus size={24} /> : <Upload size={24} />}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">
              {isLocked ? 'Analysis in progress...' : 'Click or drag media'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports: Photos, Video (MP4), Audio (MP3/WAV)
            </p>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* 4. IMAGE GRID */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in">
          {images.map((img, idx) => (
            <div key={idx} className="group relative aspect-square bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm">
              <img src={img} alt={`Upload ${idx}`} className={`w-full h-full object-cover ${isLocked ? 'grayscale opacity-50' : ''}`} />
              {!isLocked && (
                <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 p-1 bg-white/90 hover:bg-red-500 text-slate-600 hover:text-white rounded-full shadow-sm">
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoUploadZone;