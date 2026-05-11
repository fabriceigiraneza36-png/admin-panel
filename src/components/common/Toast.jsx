import React from 'react'
import { Toaster } from 'react-hot-toast'

/*
 * Re-exported configured Toaster.
 * Already placed in main.jsx — this file is a convenience re-export
 * for use in contexts that need to trigger raw toast.
 */
export { default as toast } from 'react-hot-toast'

export default function ToastContainer() {
  return (
    <Toaster
      position="top-right"
      gutter={8}
      toastOptions={{
        duration: 3500,
        style: {
          borderRadius: '12px',
          padding:      '12px 16px',
          fontWeight:   600,
          fontSize:     '14px',
          fontFamily:   'Inter, sans-serif',
          boxShadow:    '0 4px 20px rgba(0,0,0,0.1)',
        },
      }}
    />
  )
}