import React from 'react';

const CruelBrand: React.FC = () => {
  return (
    <div className="fixed bottom-6 left-6 z-50 pointer-events-none select-none">
      {/* Main Watermark - Resized */}
      <h1 
        className="font-serif font-black text-5xl md:text-7xl text-slate-900 tracking-[0.25em] opacity-[0.08] mix-blend-darken leading-none"
        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}
      >
        CRUEL
      </h1>
    </div>
  );
};

export default CruelBrand;