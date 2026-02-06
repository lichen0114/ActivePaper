import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './styles/index.css'

const root = document.getElementById('root')

if (root) {
  try {
    const reactRoot = ReactDOM.createRoot(root)
    reactRoot.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>,
    )
  } catch (error) {
    console.error('Failed to render:', error)
    root.innerHTML = `<div style="color: red; padding: 20px;">Error: ${error}</div>`
  }
} else {
  console.error('Root element not found!')
}
