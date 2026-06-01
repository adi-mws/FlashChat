import "./App.css";
import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/AuthContext";
import { NotificationProvider } from "./hooks/NotificationContext";
import { ThemeProvider } from "./hooks/ThemeContext";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { ChatProvider } from "./hooks/ChatsContext";
import { PopUpProvider } from "./hooks/PopUpContext";
import { NetworkProvider } from "./hooks/NetworkContext";
import AppRoutes from "./AppRoutes";



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
                    <AppRoutes />
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





export default App;
