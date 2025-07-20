import "./App.css";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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
import { NetworkProvider } from "./hooks/NetworkContext";

// Pages
import SelectChat from "./components/SelectChat";
import ChatPage from "./components/ChatPage";
import ProfilePage from "./components/ProfilePage";
import ChatsList from "./components/ChatsList";

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <NetworkProvider>
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
        </NetworkProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

import { useEffect, useState } from "react";

const MainApp = () => {
  const { user, loading } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<WebsiteLayout />}>
        <Route index element={<Landing />} />
        <Route path="/test" element={<NoChatsFound />} />
        <Route
          path="login"
          element={!user ? <LoginForm /> : <Navigate to="/chats" replace />}
        />
        <Route
          path="register"
          element={!user ? <RegistrationForm /> : <Navigate to="/chats" replace />}
        />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="about" element={<AboutPage />} />
      </Route>

      {/* Protected Chat Routes */}
      <Route
        path="/chats"
        element={user ? <ChatLayout /> : <Navigate to="/" replace />}
      >
        {/* 🔁 Mobile: show ChatsList | Desktop: show SelectChat */}
        <Route index element={isMobile ? <ChatsList /> : <SelectChat />} />
        <Route path=":chatId" element={<ChatPage />} />
        <Route path="profile" element={<ProfilePage edit={true} />} />
        <Route path="profile/:id" element={<ProfilePage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
