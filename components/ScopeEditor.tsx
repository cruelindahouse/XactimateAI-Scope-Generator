
import React, { useState, useEffect } from 'react';
import { LineItem, RoomData, ActivityCode } from '../types';
import { Trash2, Plus, Save, X, CheckCircle2, AlertTriangle, Info, Copy, CheckSquare, Square, Printer, ClipboardCopy, Star, ThumbsUp, ThumbsDown, Clock } from 'lucide-react';
import { getCatDefinition } from '../utils/catCodeData';
import { useEditTracking } from '../hooks/useEditTracking';

interface ScopeEditorProps {
  initialRooms: RoomData[];
  onSave: (updatedRooms: RoomData[]) => void;
}

const ScopeEditor: React.FC<ScopeEditorProps> = ({ initialRooms, onSave }) => {
  const [localRooms, setLocalRooms] = useState<RoomData[]>(initialRooms);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  
  // Feedback State
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const { trackEdit } = useEditTracking();

  useEffect(() => {
    // Only update if initialRooms changes drastically (new generation), 
    // to avoid overwriting local edits during minor parent re-renders.
    // Ideally, we trust local state until explicit save/reset.
    if (initialRooms.length > 0 && localRooms.length === 0) {
        setLocalRooms(initialRooms);
    }
  }, [initialRooms]);

  // --- ACTIONS ---

  const handleSaveClick = () => {
    // Track changes before saving
    localRooms.forEach(room => {
        const originalRoom = initialRooms.find(r => r.id === room.id);
        if (!originalRoom) return;

        room.items.forEach(editedItem => {
            const originalItem = originalRoom.items.find(i => i.id === editedItem.id);
            if (originalItem) {
                trackEdit(originalItem, editedItem, room.name);
            }
        });
    });

    onSave(localRooms);
  };

  const toggleItemComplete = (itemId: string) => {
    const newSet = new Set(completedItems);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    setCompletedItems(newSet);
  };

  const toggleRoomComplete = (room: RoomData) => {
    const allItemIds = room.items.map(i => i.id);
    const newSet = new Set(completedItems);
    
    // Check if all are currently completed
    const allComplete = allItemIds.every(id => newSet.has(id));

    if (allComplete) {
      allItemIds.forEach(id => newSet.delete(id));
    } else {
      allItemIds.forEach(id => newSet.add(id));
    }
    setCompletedItems(newSet);
  };

  const handleCopyCode = (item: LineItem) => {
    const actCode = item.activity === '&' ? '&' : item.activity === '-' ? '-' : '+';
    // Format for Xactimate Quick Entry: CAT [TAB] SEL [TAB] ACT [TAB] QTY
    const text = `${item.category}\t${item.selector}\t${actCode}\t${item.quantity}\t${item.unit}`;
    
    navigator.clipboard.writeText(text).then(() => {
      setCopiedItemId(item.id);
      setTimeout(() => setCopiedItemId(null), 1500);
      
      // Auto-mark as complete when copied
      const newSet = new Set(completedItems);
      newSet.add(item.id);
      setCompletedItems(newSet);
    });
  };

  const handleFieldChange = (roomId: string, itemId: string, field: keyof LineItem, value: any) => {
    setLocalRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room;
      return {
        ...room,
        items: room.items.map(item => {
          if (item.id !== itemId) return item;
          return { ...item, [field]: value };
        })
      };
    }));
  };

  const handleDeleteItem = (roomId: string, itemId: string) => {
    setLocalRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room;
      return {
        ...room,
        items: room.items.filter(item => item.id !== itemId)
      };
    }));
  };

  const handleAddItem = (roomId: string) => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      category: 'UNK',
      selector: 'SEL',
      code: 'UNK SEL',
      description: 'New line item',
      activity: '+',
      quantity: 1,
      quantity_inference: 'Manual',
      unit: 'EA',
      reasoning: 'Manual Entry',
      confidence: 'High'
    };

    setLocalRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room;
      return { ...room, items: [...room.items, newItem] };
    }));
  };

  const submitRating = (score: number) => {
      // Mock log
      console.log(`User Rating Submitted: ${score}/5`);
      const existing = JSON.parse(localStorage.getItem('user_ratings') || '[]');
      existing.push({ timestamp: new Date().toISOString(), score });
      localStorage.setItem('user_ratings', JSON.stringify(existing));
      setRatingSubmitted(true);
  };

  // --- METRICS ---
  const totalItems = localRooms.reduce((acc, r) => acc + r.items.length, 0);
  const totalCompleted = completedItems.size;
  const progressPercent = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;
  const isAllComplete = totalItems > 0 && totalCompleted === totalItems;

  // --- HELPER COMPONENTS ---

  const ConfidenceBadge = ({ level, reasoning }: { level?: string, reasoning?: string }) => {
    let icon = <CheckCircle2 size={14} className="text-emerald-500" />;
    let bg = "bg-emerald-50";
    let text = "text-emerald-700";
    let label = "High Confidence";

    if (level === 'Medium') {
      icon = <AlertTriangle size={14} className="text-amber-500" />;
      bg = "bg-amber-50";
      text = "text-amber-700";
      label = "Medium Confidence";
    } else if (level === 'Low') {
      icon = <Info size={14} className="text-red-500" />;
      bg = "bg-red-50";
      text = "text-red-700";
      label = "Low Confidence";
    }

    return (
      <div className={`group relative inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${bg} ${text} cursor-help`}>
        {icon}
        <span className="hidden sm:inline">{label}</span>
        
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          <p className="font-bold mb-1">{label}</p>
          <p className="opacity-80 italic">{reasoning || "No reasoning provided."}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 relative">
      
      {/* ENTRY ASSISTANT DASHBOARD */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 no-print sticky top-20 z-30">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 w-full">
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
               <ClipboardCopy className="text-blue-600" /> 
               Entry Assistant
             </h2>
             <p className="text-sm text-slate-500 mt-1">
               Check off items as you enter them into Xactimate.
             </p>
             <div className="mt-4">
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                  <span>Progress: {totalCompleted} / {totalItems} items</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
             </div>
          </div>

          <div className="flex gap-3">
             <button 
               onClick={() => window.print()}
               className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
             >
               <Printer size={18} /> Print Guide
             </button>
             <button 
               onClick={handleSaveClick}
               className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors"
             >
               <Save size={18} /> Save Edits
             </button>
          </div>
        </div>
      </div>

      {/* ROOM CHECKLISTS */}
      {localRooms.map((room) => {
        const roomCompletedCount = room.items.filter(i => completedItems.has(i.id)).length;
        const isRoomComplete = room.items.length > 0 && roomCompletedCount === room.items.length;

        return (
          <div key={room.id} className="room-section bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden break-inside-avoid">
             {/* Room Header */}
             <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors ${isRoomComplete ? 'bg-green-50/50' : ''}`}
                  onClick={() => toggleRoomComplete(room)}>
                <div className="flex items-center gap-3">
                   <button 
                     className={`p-1 rounded transition-colors ${isRoomComplete ? 'text-green-600 bg-green-100' : 'text-slate-300 hover:text-blue-500'}`}
                   >
                     {isRoomComplete ? <CheckSquare size={24} /> : <Square size={24} />}
                   </button>
                   <div>
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        {room.name}
                        {room.timestamp_in && (
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                             <Clock size={12} /> {room.timestamp_in}
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 hidden md:block italic max-w-xl truncate">
                        {room.narrative_synthesis}
                      </p>
                   </div>
                </div>
                <div className="text-xs font-bold text-slate-400 no-print">
                   {roomCompletedCount}/{room.items.length} Entered
                </div>
             </div>

             {/* Items Table */}
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50/50 text-xs uppercase font-bold text-slate-500 border-b border-slate-100">
                   <tr>
                     <th className="px-4 py-3 w-10 no-print"></th>
                     <th className="px-4 py-3 w-16">Cat</th>
                     <th className="px-4 py-3 w-16">Sel</th>
                     <th className="px-4 py-3 w-10 text-center">Act</th>
                     <th className="px-4 py-3 w-16 text-right">Qty</th>
                     <th className="px-4 py-3 w-12">Unit</th>
                     <th className="px-4 py-3">Description</th>
                     <th className="px-4 py-3 w-32 no-print">Confidence</th>
                     <th className="px-4 py-3 w-24 no-print text-center">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {room.items.map((item) => {
                     const isComplete = completedItems.has(item.id);
                     const actLabel = item.activity === '+' ? 'Repl' : item.activity === '-' ? 'Rem' : 'D&R';
                     const actColor = item.activity === '+' ? 'text-green-600' : item.activity === '-' ? 'text-red-600' : 'text-blue-600';

                     return (
                       <tr key={item.id} className={`group hover:bg-blue-50/30 transition-colors ${isComplete ? 'bg-slate-50 opacity-75' : ''}`}>
                         {/* Checkbox */}
                         <td className="px-4 py-3 no-print">
                           <button onClick={() => toggleItemComplete(item.id)} className={`transition-colors ${isComplete ? 'text-blue-500' : 'text-slate-300 hover:text-slate-400'}`}>
                              {isComplete ? <CheckSquare size={18} /> : <Square size={18} />}
                           </button>
                         </td>

                         {/* Codes */}
                         <td className="px-4 py-3 font-mono font-bold text-slate-700">
                            <input 
                              value={item.category}
                              onChange={(e) => handleFieldChange(room.id, item.id, 'category', e.target.value.toUpperCase())}
                              className="w-12 bg-transparent outline-none focus:underline uppercase"
                            />
                         </td>
                         <td className="px-4 py-3 font-mono font-medium text-slate-600">
                            <input 
                              value={item.selector}
                              onChange={(e) => handleFieldChange(room.id, item.id, 'selector', e.target.value.toUpperCase())}
                              className="w-16 bg-transparent outline-none focus:underline uppercase"
                            />
                         </td>
                         <td className={`px-4 py-3 font-mono font-bold text-center ${actColor}`}>
                            <select 
                              value={item.activity}
                              onChange={(e) => handleFieldChange(room.id, item.id, 'activity', e.target.value)}
                              className="bg-transparent outline-none cursor-pointer"
                            >
                                <option value="+">+</option>
                                <option value="-">-</option>
                                <option value="&">&</option>
                            </select>
                         </td>
                         <td className="px-4 py-3 font-mono font-bold text-right text-slate-800">
                            <input 
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleFieldChange(room.id, item.id, 'quantity', parseFloat(e.target.value))}
                              className="w-16 text-right bg-transparent outline-none focus:underline"
                            />
                         </td>
                         <td className="px-4 py-3 font-mono text-xs text-slate-500">
                            <input 
                              value={item.unit}
                              onChange={(e) => handleFieldChange(room.id, item.id, 'unit', e.target.value.toUpperCase())}
                              className="w-8 bg-transparent outline-none focus:underline uppercase"
                            />
                         </td>

                         {/* Description */}
                         <td className="px-4 py-3">
                            <input 
                              value={item.description}
                              onChange={(e) => handleFieldChange(room.id, item.id, 'description', e.target.value)}
                              className="w-full bg-transparent outline-none focus:underline truncate text-slate-700"
                            />
                         </td>

                         {/* Confidence Badge */}
                         <td className="px-4 py-3 no-print">
                           <ConfidenceBadge level={item.confidence} reasoning={item.reasoning} />
                         </td>

                         {/* Actions */}
                         <td className="px-4 py-3 no-print text-center flex items-center justify-end gap-2">
                           <button 
                             onClick={() => handleCopyCode(item)}
                             className={`flex items-center gap-1 px-2 py-1 rounded border shadow-sm text-xs font-bold transition-all ${copiedItemId === item.id ? 'bg-green-100 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600'}`}
                             title="Copy code to clipboard"
                           >
                             {copiedItemId === item.id ? 'Copied!' : <><Copy size={12} /> Copy</>}
                           </button>
                           <button 
                              onClick={() => handleDeleteItem(room.id, item.id)}
                              className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                              <Trash2 size={14} />
                           </button>
                         </td>
                       </tr>
                     );
                   })}
                   {/* Add Item Row */}
                   <tr className="no-print">
                      <td colSpan={9} className="px-4 py-2">
                        <button onClick={() => handleAddItem(room.id)} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline">
                           <Plus size={12} /> Add Manual Item
                        </button>
                      </td>
                   </tr>
                 </tbody>
               </table>
             </div>
          </div>
        );
      })}

      {/* PASSIVE FEEDBACK CARD (Shows only when 100% complete) */}
      {isAllComplete && !ratingSubmitted && (
         <div className="fixed bottom-20 right-6 z-50 bg-white p-6 rounded-xl shadow-2xl border border-slate-200 max-w-sm animate-in slide-in-from-bottom-5 no-print">
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-2 rounded-full text-green-600">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Scope Completed!</h4>
                <p className="text-sm text-slate-500 mt-1 mb-3">
                  Great job! How accurate was the AI analysis for this project?
                </p>
                <div className="flex flex-col gap-2">
                   <button 
                     onClick={() => submitRating(5)} 
                     className="flex items-center gap-2 p-2 rounded-lg border hover:bg-green-50 hover:border-green-200 text-sm font-medium transition-colors"
                   >
                     <Star size={16} className="text-yellow-500 fill-yellow-500" /> 🎯 90-100% Accurate
                   </button>
                   <button 
                     onClick={() => submitRating(3)} 
                     className="flex items-center gap-2 p-2 rounded-lg border hover:bg-amber-50 hover:border-amber-200 text-sm font-medium transition-colors"
                   >
                     <ThumbsUp size={16} className="text-amber-500" /> ⚠️ 70-90% Accurate
                   </button>
                   <button 
                     onClick={() => submitRating(1)} 
                     className="flex items-center gap-2 p-2 rounded-lg border hover:bg-red-50 hover:border-red-200 text-sm font-medium transition-colors"
                   >
                     <ThumbsDown size={16} className="text-red-500" /> ❌ &lt; 70% Accurate
                   </button>
                </div>
                <button 
                  onClick={() => setRatingSubmitted(true)}
                  className="text-xs text-slate-400 mt-3 hover:text-slate-600 underline"
                >
                  Skip Feedback
                </button>
              </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default ScopeEditor;
