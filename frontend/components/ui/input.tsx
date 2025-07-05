import React from 'react';

export function Input({ className = '', ...props }) {
  return (
    <input
      className={`border rounded-xl px-4 py-2 w-full focus:outline-none focus:ring focus:ring-blue-300 ${className}`}
      {...props}
    />
  );
}
