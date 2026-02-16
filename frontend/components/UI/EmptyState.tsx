
import React from 'react';
import { Archive } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  submessage?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ message, submessage }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
      <div className="bg-gray-100 p-4 rounded-full mb-4">
        <Archive className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{message}</h3>
      {submessage && <p className="text-gray-500 text-sm mt-1">{submessage}</p>}
    </div>
  );
};

export default EmptyState;
