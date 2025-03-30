import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginForm from "./components/LoginForm";
import RegistrationForm from "./components/forms/RegistrationForm";
import ChatInterface from "./components/ChatInterface/ChatInterface";
import WebsiteLayout from "./layouts/WebsiteLayout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import Landing from "./components/Landing";
import { ThemeProvider } from "./contexts/ThemeContext";
import AboutPage from "./components/AboutPage";
import NoChatsFound from "./components/NoChatsFound";
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <MainApp />
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ ThemeProvider>
  );
}

const MainApp = () => {
  const { admin } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<WebsiteLayout />}>
        <Route path='/' element={<Landing />} />
        <Route path='/test' element={<NoChatsFound />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegistrationForm />} />
        <Route path="/chats" element={<ChatInterface />} />
        <Route path="/about" element={<AboutPage />} />
      </Route>
    </Routes>
  );
};

export default App;