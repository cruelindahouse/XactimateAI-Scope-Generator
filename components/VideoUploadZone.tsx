
import React, { useState, useCallback } from 'react';
import { Film, FileVideo, X, CheckCircle2, Loader2, AlertCircle, ScanLine } from 'lucide-react';
import { extractMediaFromVideo } from '../utils/mediaExtractor';
import { ExtractedData } from '../types';

interface VideoUploadZoneProps {
  onVideoProcessed: (data: ExtractedData) => void;
  onProcessStart: () => void;
  onProcessError: (msg: string) => void;
  onCancel: () => void;
}

const VideoUploadZone: React.FC<VideoUploadZoneProps> = ({ 
  onVideoProcessed, 
  onProcessStart,
  onProcessError,
  onCancel 
}) => {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'ready'>('idle');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [fileInfo, setFileInfo] = useState<{name: string, size: number} | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    if (status === 'scanning') return;

    let selectedFile: File | null = null;
    
    if ('dataTransfer' in e) {
      e.preventDefault();
      const dt = e.dataTransfer as any;
      if (dt.files && dt.files.length > 0) selectedFile = dt.files[0];
    } else {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        selectedFile = target.files[0];
        // Reset input value to allow re-selecting same file
        target.value = '';
      }
    }

    if (selectedFile && (selectedFile as File).type.startsWith('video/')) {
      setFileInfo({ name: (selectedFile as File).name, size: (selectedFile as File).size });
      startExtraction(selectedFile as File);
    }
  };

  const startExtraction = async (file: File) => {
    setStatus('scanning');
    onProcessStart();
    setProgress(0);

    try {
      const extractedData = await extractMediaFromVideo(file, (stage, percent) => {
        setProgressLabel(stage);
        setProgress(Math.round(percent)); // percent already comes as 0-100
      });

      onVideoProcessed(extractedData);
      setStatus('ready');
    } catch (err: any) {
      console.error("Extraction failed:", err);
      onProcessError("Failed to scan video content. " + (err.message || ""));
      setFileInfo(null);
      setStatus('idle');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
          <Film size={16} className="text-blue-600" />
          Video Walkthrough
        </div>
        {status !== 'scanning' && (
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="p-6">
        {status === 'idle' ? (
           <div 
            onDrop={handleFileSelect}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-blue-200 rounded-lg p-8 text-center hover:bg-blue-50 transition-colors cursor-pointer group relative"
          >
            <input 
              type="file" 
              accept="video/*"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <FileVideo size={24} />
            </div>
            <h3 className="text-slate-900 font-bold">Upload Video</h3>
            <p className="text-sm text-slate-500 mt-1">
              Drag & drop raw video file
            </p>
             <p className="text-xs text-slate-400 mt-2 font-mono">
              Smart Scan: Extracts Frames + Audio Locally
            </p>
          </div>
        ) : (
          <div className="space-y-4">
             <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-md shadow-sm text-blue-600">
                  <FileVideo size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 truncate max-w-[200px]">
                    {fileInfo?.name || 'Video File'}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    {fileInfo ? formatSize(fileInfo.size) : ''}
                  </p>
                </div>
              </div>
              
              {status === 'ready' ? (
                <div className="flex items-center gap-2 text-xs font-medium text-green-700 bg-green-100 px-3 py-1.5 rounded-full">
                  <CheckCircle2 size={12} /> Scanned
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-medium text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full">
                  <ScanLine size={12} className="animate-pulse" /> Scanning...
                </div>
              )}
            </div>

            {status === 'scanning' && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-600 font-medium">
                  <span>{progressLabel}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUploadZone;
