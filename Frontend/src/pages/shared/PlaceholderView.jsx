import React from 'react';

export default function PlaceholderView({ title }) {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
          <p className="text-gray-400">This section is currently under development.</p>
        </div>
      </div>
      
      <div className="glass-panel p-8 text-center border-dashed border-2 border-gray-700">
        <h3 className="text-lg font-medium text-white mb-2">{title} Settings & Options</h3>
        <p className="text-gray-400 max-w-md mx-auto">
          Additional configurations and features for this module will be available in a future update.
        </p>
      </div>
    </div>
  );
}
