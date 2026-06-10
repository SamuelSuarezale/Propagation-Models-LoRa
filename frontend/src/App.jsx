import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
            <Route path="/measurements" element={<div>Mediciones</div>} />
            <Route path="/models" element={<div>Modelos</div>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App