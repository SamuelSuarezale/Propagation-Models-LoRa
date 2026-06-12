import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Measurements from './pages/Measurements'
import Models from './pages/Models'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/measurements" element={<Measurements/>} />
            <Route path="/models" element={<Models/>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App