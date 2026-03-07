
import './App.css'
import {Routes, Route} from 'react-router-dom'
import DashBoard from './pages/DashBoard'
import ViewFromLocalStorage from './pages/ViewFromLocalStorage'
import Auction from './pages/Auction'
import LiveScreen from './components/LiveScreen'
import AddLicense from './pages/AddLicense'
import ProtectedRoute from './utils/ProtectedRoute'

function App() {


  return (
   <Routes>


    <Route path='/' element={<AddLicense  />} />
  

       <Route element={<ProtectedRoute/>}>
            <Route path='/dashboard' element={<DashBoard />} />
              

            <Route path='/view' element={<ViewFromLocalStorage />} />
            <Route path='/auction' element={<Auction />} /> 
              <Route path='/live'   element={<LiveScreen/>} />

        </Route>

   </Routes>
  )
}

export default App
