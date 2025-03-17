import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginForm from "./components/LoginForm/LoginForm";
import RegistrationForm from "./components/RegistrationForm/RegistrationForm";
import ChatInterface from "./components/ChatInterface/ChatInterface";
import WebsiteLayout from "./layouts/WebsiteLayout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <MainApp />
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

// ✅ Use `useAuth()` inside a child component (not at the top level)
const MainApp = () => {
  const { admin } = useAuth();
  // console.log(admin)
  return (
    <Routes>
      <Route path="/" element={<WebsiteLayout />}>
        <Route path="login" element={<LoginForm />} />
        <Route path="register" element={<RegistrationForm />} />
        {/* Show chat only if user is logged in */}
        <Route path="chat" element={admin ? <ChatInterface /> : <LoginForm />} />
      </Route>
    </Routes>
  );
};

export default App;