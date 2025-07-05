import React from 'react';

export function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg relative max-w-full">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-black" aria-label="Close">
          &times;
        </button>
        {children}
      </div>
    </div>
  );
}
