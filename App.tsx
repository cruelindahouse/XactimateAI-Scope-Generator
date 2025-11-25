import React from 'react';
import ScopeGenerator from './components/ScopeGenerator';
import CruelBrand from './components/CruelBrand';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20 relative">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 w-8 h-8 rounded flex items-center justify-center text-white font-bold text-lg">
              X
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Xactimate<span className="text-blue-600">AI</span> Scope Generator
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full">
              Level 3 Auditor Mode
            </span>
          </div>
        </div>
      </header>

      <main className="pt-8 relative z-10">
        <ScopeGenerator />
      </main>

      {/* Global Brand Watermark */}
      <CruelBrand />
    </div>
  );
}

export default App;