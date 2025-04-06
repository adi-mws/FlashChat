import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginForm from "./components/forms/LoginForm";
import RegistrationForm from "./components/forms/RegistrationForm";
import WebsiteLayout from "./layouts/WebsiteLayout";
import { AuthProvider, useAuth } from "./hooks/AuthContext";
import { NotificationProvider } from "./hooks/NotificationContext";
import Landing from "./components/Landing";
import { ThemeProvider } from "./hooks/ThemeContext";
import AboutPage from "./components/AboutPage";
import ResetPassword from "./components/forms/ResetPassword";
import ForgotPassword from "./components/forms/ForgotPassword";
import NoChatsFound from "./components/NoChatsFound";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ChatProvider } from "./hooks/ChatsContext";
import ChatLayout from "./layouts/ChatLayout";
import { PopUpProvider } from "./hooks/PopUpContext";
function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <NotificationProvider>

          <AuthProvider>
            <PopUpProvider>
              <ChatProvider>
                <Router>
                  <MainApp />
                </Router>
              </ChatProvider>
            </PopUpProvider>
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
        <Route path="/about" element={<AboutPage />} />
      </Route>
      <Route path="/chats" element={<ChatLayout />} />

    </Routes>
  );
};

export default App;