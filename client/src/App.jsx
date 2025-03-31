import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginForm from "./components/forms/LoginForm";
import RegistrationForm from "./components/forms/RegistrationForm";
import ChatInterface from "./components/ChatInterface";
import WebsiteLayout from "./layouts/WebsiteLayout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import Landing from "./components/Landing";
import { ThemeProvider } from "./contexts/ThemeContext";
import AboutPage from "./components/AboutPage";
import ResetPassword from "./components/forms/ResetPassword";
import ForgotPassword from "./components/forms/ForgotPassword";
import NoChatsFound from "./components/NoChatsFound";
import { GoogleOAuthProvider } from "@react-oauth/google";
function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <NotificationProvider>

          <AuthProvider>
            <Router>
              <MainApp />
            </Router>
          </AuthProvider>
        </NotificationProvider>
      </ ThemeProvider>
    </GoogleOAuthProvider>
  );
}

const MainApp = () => {
  const { user } = useAuth();
  console.log(user)
  return (
    <Routes>
      <Route path="/" element={<WebsiteLayout />}>
        <Route path='/' element={<Landing />} />
        <Route path='/test' element={<NoChatsFound />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegistrationForm />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/chats" element={<ChatInterface />} />
        <Route path="/about" element={<AboutPage />} />
      </Route>
    </Routes>
  );
};

export default App;