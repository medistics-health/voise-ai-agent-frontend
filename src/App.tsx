import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import Providers from './pages/Providers'
import Insurance from './pages/Insurance'
import Payer from './pages/Payer'
import Practice from './pages/Practice'
import Upload from './pages/Upload'
import Results from './pages/Results'
import Coverage from './pages/Coverage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/providers" element={<Providers />} />
            <Route path="/insurances" element={<Insurance />} />
            <Route path="/payers" element={<Payer />} />
            <Route path="/practices" element={<Practice />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/results" element={<Results />} />
            <Route path="/results/:jobId" element={<Results />} />
            <Route path="/coverage" element={<Coverage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
