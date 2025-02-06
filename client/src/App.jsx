import './App.css';
import { BrowserRouter as Router, Routes, Route, BrowserRouter } from 'react-router-dom'
import LoginForm from './components/LoginForm/LoginForm';
import RegistrationForm from './components/RegistrationForm/RegistrationForm';
import ChatInterface from './components/ChatInterface/ChatInterface';

function App() {

  return (
    <>
      <Router>
        {/* Upcoming Routes */}
        <ChatInterface />
      </Router>
    </>
  )
}

export default App
