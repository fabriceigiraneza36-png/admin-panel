import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import { store } from '@store/index'
import App from './App'
import '@styles/globals.css'

/* ── Global error handlers ── */
window.addEventListener('unhandledrejection', (e) => {
    console.warn('[App] Unhandled promise rejection:', e.reason)
})

const root = document.getElementById('root')
if (!root) {
    console.error('[App] #root element not found!')
} else {
    ReactDOM.createRoot(root).render(
        <React.StrictMode>
            <Provider store={store}>
                <App />
                <Toaster
                    position="top-right"
                    gutter={8}
                    containerStyle={{ top: 16, right: 16 }}
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
            </Provider>
        </React.StrictMode>,
    )
}