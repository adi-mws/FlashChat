import { useAuth } from "./hooks/AuthContext";
import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./components/marketing/LandingPage";
import AboutPage from "./components/marketing/AboutPage";
import ResetPassword from "./components/forms/ResetPassword";
import ForgotPassword from "./components/forms/ForgotPassword";
import ChatLayout from "./layouts/ChatLayout";
import AppLayout from "./layouts/AppLayout";
import SelectChat from "./components/chats/SelectChat";
import ChatPage from "./components/chats/ChatPage";
import ProfilePage from "./components/account/ProfilePage";
import ChatList from "./components/chats/ChatList";
import ContactsPage from "./components/contact/ContactsPage";
import LinkedDevicesPage from "./components/account/LinkedDevicesPage";
import LoginForm from "./components/forms/LoginForm";
import RegistrationForm from "./components/forms/RegistrationForm";
import MarketingLayout from "./layouts/MarketingLayout";
import PublicRoutes from "../routes/PublicRoutes";
import LoadingScreen from "./components/global/LoadingScreen";
import { MARKETING_ROUTES, ACCOUNT_ROUTES, CHAT_ROUTES } from "../routes/routes";

export default function AppRoutes() {

    const { user, loading } = useAuth();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 640);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);



    return (
        <LoadingScreen loading={loading} text="Intializing Server...">
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<PublicRoutes><MarketingLayout /></PublicRoutes>}>
                    <Route index element={<LandingPage />} />
                    {/* <Route path="/test" element={<NoChatsFound />} /> */}
                    <Route
                        path="login"
                        element={<LoginForm />}
                    />
                    <Route
                        path="register"
                        element={<RegistrationForm />}
                    />
                    <Route path="reset-password/:token" element={<ResetPassword />} />
                    <Route path="forgot-password" element={<ForgotPassword />} />
                    <Route path="about" element={<AboutPage />} />
                </Route>

                {/* Protected Routes */}
                <Route
                    path="/app"
                    element={user ? <AppLayout /> : <Navigate to={MARKETING_ROUTES.landing} replace />}
                >
                    <Route
                        path="chats" element={user ? <ChatLayout /> : <Navigate to={MARKETING_ROUTES.landing} replace />}
                    >
                        <Route index element={isMobile ? <ChatList /> : <SelectChat />} />
                        <Route path=":chatId" element={<ChatPage />} />
                        <Route path="profile/:id" element={<ProfilePage />} />
                        <Route path="linked-devices" element={<LinkedDevicesPage />} />
                        <Route path="update-history" element={<AboutPage />} />
                    </Route>
                    <Route path="profile" element={<ProfilePage edit={true} />} />
                    <Route path="contacts" element={<ContactsPage />} />
                    <Route path="linked-devices" element={<LinkedDevicesPage />} />
                    <Route path="update-history" element={<AboutPage />} />

                </Route>
                


                {/* Fallback */}
                <Route path="*" element={<Navigate to={MARKETING_ROUTES.landing} replace />} />
            </Routes>
        </LoadingScreen>
    );
};
