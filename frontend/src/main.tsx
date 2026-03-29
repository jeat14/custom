import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { router } from './router'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} future={{ v7_startTransition: true }} />
    <Analytics />
  </React.StrictMode>
)
