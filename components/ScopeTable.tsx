import React from 'react';
import { LineItem, ActivityCode } from '../types';
import { Trash2, AlertTriangle } from 'lucide-react';

interface ScopeTableProps {
  items: LineItem[];
  onDeleteItem?: (id: string) => void;
}

const ScopeTable: React.FC<ScopeTableProps> = ({ items, onDeleteItem }) => {
  if (items.length === 0) return null;

  const getActivityLabel = (code: string) => {
    switch (code) {
      case ActivityCode.REMOVE: return <span className="text-red-600 font-mono font-bold">(-) Rem</span>;
      case ActivityCode.REPLACE: return <span className="text-emerald-600 font-mono font-bold">(+) Repl</span>;
      case ActivityCode.DETACH_RESET: return <span className="text-blue-600 font-mono font-bold">(&) D&R</span>;
      default: return code;
    }
  };

  return (
    <div className="w-full overflow-hidden bg-white shadow-sm rounded-lg border border-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 w-20">Cat</th>
              <th className="px-4 py-3 w-20">Sel</th>
              <th className="px-4 py-3 w-24 text-center">Act</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 w-20 text-right">Qty</th>
              <th className="px-4 py-3 w-16">Unit</th>
              <th className="px-4 py-3 w-32">Reasoning</th>
              <th className="px-4 py-3 w-12 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="group hover:bg-blue-50/30 transition-colors">
                <td className="px-4 py-3 font-bold text-slate-700">{item.category}</td>
                <td className="px-4 py-3 font-medium text-slate-600">{item.selector}</td>
                <td className="px-4 py-3 text-center bg-slate-50/50">
                  {getActivityLabel(item.activity)}
                </td>
                <td className="px-4 py-3 text-slate-800 font-medium">{item.description}</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">{item.quantity}</td>
                <td className="px-4 py-3 text-xs uppercase text-slate-500">{item.unit}</td>
                <td className="px-4 py-3 text-xs text-slate-400 max-w-[150px] truncate" title={item.reasoning}>
                  {item.reasoning}
                </td>
                <td className="px-4 py-3 text-center">
                  <button 
                    onClick={() => onDeleteItem && onDeleteItem(item.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                    title="Remove Item"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScopeTable;