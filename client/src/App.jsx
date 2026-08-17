import "./App.css";
import { BrowserRouter as Router } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./redux/store";
import { GoogleOAuthProvider } from "@react-oauth/google";
import AppRoutes from "./AppRoutes";
import AppInitializer from "./components/global/AppInitializer";
import SocketManager from "./components/global/SocketManager";
import NotificationDisplay from "./components/global/NotificationDisplay";
import NetworkWatcher from "./components/global/NetworkWatcher";

// Apply dark theme to document root
document.documentElement.classList.add("dark");

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <Provider store={store}>
        <Router>
          {/* Side-effect components (no UI) */}
          <AppInitializer />
          <SocketManager />
          <NetworkWatcher />
          {/* Global notification toasts */}
          <NotificationDisplay />
          {/* App Routes */}
          <AppRoutes />
        </Router>
      </Provider>
    </GoogleOAuthProvider>
  );
}

export default App;
