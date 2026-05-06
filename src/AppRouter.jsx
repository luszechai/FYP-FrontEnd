import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ChatApp from './ChatApp'
import EmailsPage from './pages/EmailsPage'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatApp />} />
        <Route path="/emails" element={<EmailsPage />} />
        <Route path="/emails/:emailId" element={<EmailsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

