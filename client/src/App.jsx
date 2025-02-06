import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginForm from "./components/LoginForm/LoginForm";
import RegistrationForm from "./components/RegistrationForm/RegistrationForm";
import ChatInterface from "./components/ChatInterface/ChatInterface";
import WebsiteLayout from "./layouts/WebsiteLayout";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WebsiteLayout />}>
          <Route path="login" element={<LoginForm />} />
          <Route path="register" element={<RegistrationForm />} />
          <Route path="chat" element={<ChatInterface />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
