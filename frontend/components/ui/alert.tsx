import React from 'react';

export function Alert({ type = 'info', children, className = '' }) {
  const colors = {
    info: 'bg-blue-100 text-blue-800',
    error: 'bg-red-100 text-red-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <div className={`p-3 rounded-xl text-sm font-medium ${colors[type]} ${className}`}>
      {children}
    </div>
  );
}
