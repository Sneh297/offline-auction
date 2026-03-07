
import './App.css'
import {Routes, Route} from 'react-router-dom'
import DashBoard from './pages/DashBoard'
import ViewFromLocalStorage from './pages/ViewFromLocalStorage'
import Auction from './pages/Auction'

function App() {


  return (
   <Routes>

    <Route path='/' element={<DashBoard />} />
    <Route path='/view' element={<ViewFromLocalStorage />} />
    <Route path='/auction' element={<Auction />} /> 


   </Routes>
  )
}

export default App
