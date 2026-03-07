
import './App.css'
import {Routes, Route} from 'react-router-dom'
import DashBoard from './pages/DashBoard'
import ViewFromLocalStorage from './pages/ViewFromLocalStorage'
import Auction from './pages/Auction'
import LiveScreen from './components/LiveScreen'

function App() {


  return (
   <Routes>

    <Route path='/' element={<DashBoard />} />
    <Route path='/view' element={<ViewFromLocalStorage />} />
    <Route path='/auction' element={<Auction />} /> 
      <Route path='/live'   element={<LiveScreen/>} />


   </Routes>
  )
}

export default App
