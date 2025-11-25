
/// <reference lib="dom" />
import React, { useState, useCallback } from 'react';
import { generateScope } from '../services/geminiService';
import { validateScopeGaps } from '../utils/xactimateRules';
import { copyScopeToClipboard } from '../utils/clipboardService';
import { RoomData, ProcessingStatus, ProjectMetadata, ExtractedData, JobType } from '../types';
import ScopeEditor from './ScopeEditor';
import PhotoUploadZone from './PhotoUploadZone';
import { Wand2, AlertTriangle, FileText, Home, Copy, ClipboardCheck } from 'lucide-react';

const ScopeGenerator: React.FC = () => {
  const [description, setDescription] = useState('');
  const [scopeContext, setScopeContext] = useState('Interior');
  const [jobType, setJobType] = useState<JobType>('R'); // Default to Reconstruction
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [metadata, setMetadata] = useState<ProjectMetadata | null>(null);
  const [auditWarnings, setAuditWarnings] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  
  const [videoData, setVideoData] = useState<ExtractedData | null>(null);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);

  const handleGenerate = useCallback(async () => {
    if ((!description && images.length === 0 && !videoData) || isProcessingVideo) return;
    if (!jobType) return; // Validation

    setStatus(ProcessingStatus.ANALYZING);
    setAuditWarnings([]);
    setRooms([]);
    setMetadata(null);
    
    try {
      const result = await generateScope(description, scopeContext, jobType, images, videoData);
      setRooms(result.rooms);
      setMetadata(result.metadata);
      
      const allItems = result.rooms.flatMap(r => r.items);
      const gaps = validateScopeGaps(allItems);
      setAuditWarnings(gaps);
      
      setStatus(ProcessingStatus.COMPLETED);
    } catch (error) {
      console.error(error);
      setStatus(ProcessingStatus.ERROR);
    }
  }, [description, scopeContext, jobType, images, videoData, isProcessingVideo]);

  const handleSaveEditedScope = (updatedRooms: RoomData[]) => {
      setRooms(updatedRooms);
      const allItems = updatedRooms.flatMap(r => r.items);
      const gaps = validateScopeGaps(allItems);
      setAuditWarnings(gaps);
  };

  const handleExportJSON = () => {
    if (!metadata) return;
    const blob = new Blob([JSON.stringify({metadata, rooms}, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'field_scope_report.json';
    a.click();
  };

  const handleSmartCopy = async () => {
    const allItems = rooms.flatMap(r => r.items);
    if (allItems.length === 0) return;
    const success = await copyScopeToClipboard(allItems);
    if (success) {
      alert("✅ Full Scope Copied!\n\nYou can now paste directly into the Xactimate line item grid if your clipboard supports HTML tables.");
    }
  };

  const isButtonDisabled = 
    status === ProcessingStatus.ANALYZING || 
    isProcessingVideo || 
    (!description && images.length === 0 && !videoData);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Inputs */}
        <div className="lg:col-span-4 space-y-6 no-print">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
            
            {/* Scope Context */}
            <div>
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                 <Home size={16} className="text-purple-600" />
                 Context
               </h2>
              <select
                value={scopeContext}
                onChange={(e) => setScopeContext(e.target.value)}
                className="w-full p-2.5 text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
              >
                <option value="Interior">Interior</option>
                <option value="Exterior">Exterior</option>
                <option value="Both">Both</option>
              </select>
            </div>

            {/* Job Type Selector */}
            <div className="form-section">
              <label className="text-sm font-bold text-slate-700 mb-2 block">
                Job Type (from RMS) <span className="text-red-500">*</span>
              </label>
              
              <div className="flex flex-col gap-3">
                <label className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${jobType === 'R' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}`}>
                  <div className="flex items-start gap-3">
                    <input 
                      type="radio" 
                      name="jobType" 
                      value="R"
                      checked={jobType === 'R'}
                      onChange={(e) => setJobType(e.target.value as JobType)}
                      className="mt-1"
                    />
                    <div>
                      <div className="flex items-center mb-1">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-bold mr-2 bg-blue-100 text-blue-800">R</span>
                        <span className="font-bold text-slate-800 text-sm">Reconstruction</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Full rebuild after mitigation complete.<br/>
                        <span className="opacity-75">Drywall, paint, flooring, doors</span>
                      </p>
                    </div>
                  </div>
                </label>
                
                <label className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${jobType === 'E' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}`}>
                  <div className="flex items-start gap-3">
                    <input 
                      type="radio" 
                      name="jobType" 
                      value="E"
                      checked={jobType === 'E'}
                      onChange={(e) => setJobType(e.target.value as JobType)}
                      className="mt-1"
                    />
                    <div>
                      <div className="flex items-center mb-1">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-bold mr-2 bg-red-100 text-red-800">E</span>
                        <span className="font-bold text-slate-800 text-sm">Emergency Mitigation</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        24/7 response - extraction, drying.<br/>
                        <span className="opacity-75">Water extraction, equipment rental</span>
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 p-1.5 rounded-md">
                  <FileText size={18} />
                </span> 
                Project Narrative
              </h2>
              <textarea
                className="w-full h-32 p-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-all placeholder:text-slate-400"
                placeholder="Describe the loss... e.g. 'Burst pipe. Walked through front door into living room then kitchen.'"
                value={description}
                onChange={(e) => setDescription((e.target as any).value)}
              />
            </div>

            <div className="border-t border-slate-100 pt-6">
               <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="bg-emerald-100 text-emerald-700 p-1.5 rounded-md">
                  <Wand2 size={18} />
                </span> 
                Evidence (Video/Photo)
              </h2>
              <PhotoUploadZone 
                images={images} 
                onImagesChange={setImages} 
                videoData={videoData}
                onVideoProcessed={(data) => {
                  setVideoData(data);
                  setIsProcessingVideo(false);
                }}
                onVideoProcessStart={() => setIsProcessingVideo(true)}
                onVideoProcessError={(msg) => {
                  setIsProcessingVideo(false);
                  setVideoData(null);
                  window.alert(`Video Scan Error: ${msg}`);
                }}
                onRemoveVideo={() => setVideoData(null)}
                status={status}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isButtonDisabled}
              className={`w-full py-3.5 rounded-lg font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                isButtonDisabled 
                  ? 'bg-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/25 active:scale-[0.98]'
              }`}
            >
              {status === ProcessingStatus.ANALYZING ? (
                <>Analyzing Multimodal Data...</>
              ) : isProcessingVideo ? (
                <>Scanning Video...</>
              ) : (
                <>Generate Scope Analysis <Wand2 size={16} /></>
              )}
            </button>
          </div>

           <div className="bg-slate-100 p-4 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-500">Core Engine</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Mode: Zero-Trust Forensic<br/>
              Output: Xactimate Entry Codes<br/>
              Protocol: Manual Entry Assistant
            </p>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-8 space-y-6 relative">
            {metadata && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in">
                    {/* Time Savings Metrics */}
                     <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border border-blue-100 shadow-sm col-span-2">
                        <label className="text-xs font-bold uppercase text-blue-500 block mb-1">Time Analysis</label>
                        <div className="flex items-center gap-3">
                           <div>
                             <p className="text-2xl font-black text-slate-800">~2 min</p>
                             <p className="text-[10px] text-slate-500 font-bold uppercase">Analysis Time</p>
                           </div>
                           <div className="h-8 w-px bg-slate-200"></div>
                           <div>
                             <p className="text-2xl font-black text-green-600">~42 min</p>
                             <p className="text-[10px] text-green-600 font-bold uppercase">Saved</p>
                           </div>
                        </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Severity</label>
                        <div className={`text-lg font-bold ${metadata.severity_score > 7 ? 'text-red-600' : 'text-amber-600'}`}>
                            {metadata.severity_score}/10
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Confidence</label>
                        <div className="text-lg font-bold text-emerald-600">{metadata.confidence_level}</div>
                    </div>
                </div>
            )}
          
          {auditWarnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg shadow-sm animate-in no-print">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-500 mt-0.5" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-amber-800">Auditor Findings</h3>
                  <ul className="mt-2 text-sm text-amber-700 space-y-1 list-disc list-inside">
                    {auditWarnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {rooms.length > 0 ? (
            <div className="animate-in space-y-6">
               <div className="flex items-center justify-between no-print">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Scope Report</h2>
                <div className="flex flex-wrap gap-2 z-10">
                  <button 
                    onClick={handleSmartCopy}
                    className="text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 shadow-sm transition-colors flex items-center gap-1"
                  >
                    <Copy size={14} /> Copy All
                  </button>
                  <button 
                    onClick={handleExportJSON}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-2 rounded-lg border border-slate-200 shadow-sm transition-colors flex items-center gap-1"
                  >
                    <FileText size={14} /> JSON
                  </button>
                </div>
              </div>

              {/* XACTIMATE ENTRY ASSISTANT */}
              <ScopeEditor 
                initialRooms={rooms} 
                onSave={handleSaveEditedScope} 
              />

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl min-h-[500px] bg-slate-50/50">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <ClipboardCheck size={32} className="text-slate-300" />
              </div>
              <p className="font-medium text-slate-500">Ready to Analyze</p>
              <p className="text-sm mt-1 max-w-xs text-center text-slate-400">
                Upload photos or video to generate your Xactimate Entry Checklist.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScopeGenerator;