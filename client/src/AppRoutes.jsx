import { useSelector } from "react-redux";
import { selectUser, selectAuthLoading } from "./redux/slices/authSlice";
import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./components/marketing/LandingPage";
import AboutPage from "./components/marketing/AboutPage";
import ResetPassword from "./components/forms/ResetPassword";
import ForgotPassword from "./components/forms/ForgotPassword";
import ChatLayout from "./layouts/ChatLayout";
import AppLayout from "./layouts/AppLayout";
import SelectChat from "./components/chats/_components/SelectChat";
import Profile from "./components/settings/Profile";
import ContactsPage from "./components/contact/ContactsPage";
import LinkedDevicesPage from "./components/settings/LinkedDevicesPage";
import LoginForm from "./components/forms/LoginForm";
import RegistrationForm from "./components/forms/RegistrationForm";
import MarketingLayout from "./layouts/MarketingLayout";
import PublicRoutes from "../routes/PublicRoutes";
import UserRoute from "../routes/UserRoute";
import AdminRoute from "../routes/AdminRoute";
import LoadingScreen from "./components/global/LoadingScreen";
import { MARKETING_ROUTES, CHAT_ROUTES, ADMIN_ROUTES, getIsMobile } from "../routes/routes";
import Sparks from "./components/sparks/Sparks";
import DetailsLayout from "./layouts/DetailsLayout";
import Settings from "./components/settings/Settings";
import GroupInfo from "./components/chats/_components/GroupInfo";
import ChatInfo from "./components/chats/_components/ChatInfo";
import ChatsOverview from "./components/app/ChatsOverview";
import DesktopLayout from "./layouts/DesktopLayout";
import Conversation from "./components/chats/conversation/Conversation";
import E2EESyncModal from "./components/global/E2EESyncModal";
import SupremeAdminPanel from "./components/admin/SupremeAdminPanel";
import JoinGroupPage from "./components/chats/_components/JoinGroupPage";

export default function AppRoutes() {
    const user = useSelector(selectUser);
    const loading = useSelector(selectAuthLoading);
    const [isMobile, setIsMobile] = useState(getIsMobile());

    useEffect(() => {
        const handleResize = () => setIsMobile(getIsMobile());
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    return (
        <LoadingScreen loading={loading} text="Initializing Server...">
            <E2EESyncModal />
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<PublicRoutes><MarketingLayout /></PublicRoutes>}>
                    <Route index element={<LandingPage />} />
                    <Route path="login" element={<LoginForm />} />
                    <Route path="register" element={<RegistrationForm />} />
                    <Route path="reset-password/:token" element={<ResetPassword />} />
                    <Route path="forgot-password" element={<ForgotPassword />} />
                    <Route path="about" element={<AboutPage />} />
                </Route>

                {/* Direct Group Invite Link Entry */}
                <Route path="/join" element={<JoinGroupPage />} />
                <Route path="/join/:code" element={<JoinGroupPage />} />

                {/* Protected User App Routes (Admins are strictly blocked and redirected to /flsh-ad-pnl) */}
                {isMobile ? (
                    <>
                        <Route
                            path="/app"
                            element={<UserRoute><AppLayout /></UserRoute>}
                        >
                            <Route path='chats' element={<ChatsOverview />} />
                            <Route path="profile" element={<Profile edit={true} />} />
                            <Route path="sparks" element={<Sparks />} />
                            <Route path="contacts" element={<ContactsPage />} />
                        </Route>

                        <Route path="/chat/:chatId" element={<UserRoute><ChatLayout /></UserRoute>} />
                        <Route path="/chat/:chatId/info" element={<UserRoute><DetailsLayout><ChatInfo /></DetailsLayout></UserRoute>} />
                        <Route path="/group/:groupId/info" element={<UserRoute><DetailsLayout><GroupInfo /></DetailsLayout></UserRoute>} />

                        <Route path="/settings" element={<UserRoute><DetailsLayout /></UserRoute>}>
                            <Route index element={<Settings />} />
                            <Route path="profile" element={<Profile edit={true} />} />
                            <Route path="update-history" element={<AboutPage />} />
                            <Route path="linked-devices" element={<LinkedDevicesPage />} />
                        </Route>
                    </>
                ) : (
                    <>
                        <Route
                            path="/"
                            element={<UserRoute><DesktopLayout /></UserRoute>}
                        >
                            <Route path="app" element={<Navigate to="/app/chats" replace />} />
                            <Route path="app/chats" element={<SelectChat />} />
                            <Route path="chat/:chatId" element={<Conversation />} />

                            <Route path="chat/:chatId/info" element={<DetailsLayout><ChatInfo /></DetailsLayout>} />
                            <Route path="group/:groupId/info" element={<DetailsLayout><GroupInfo /></DetailsLayout>} />

                            <Route path="app/sparks" element={<Sparks />} />
                            <Route path="app/contacts" element={<ContactsPage />} />
                            <Route path="app/profile" element={<Profile edit={true} />} />

                            <Route path="settings" element={<DetailsLayout />}>
                                <Route index element={<Settings />} />
                                <Route path="profile" element={<Profile edit={true} />} />
                                <Route path="update-history" element={<AboutPage />} />
                                <Route path="linked-devices" element={<LinkedDevicesPage />} />
                            </Route>
                        </Route>
                    </>
                )}

                {/* Supreme Admin Command Console (Standard users are strictly blocked and redirected to /app/chats) */}
                <Route path="/flsh-ad-pnl" element={<AdminRoute><SupremeAdminPanel /></AdminRoute>} />

                {/* Fallback */}
                <Route
                    path="*"
                    element={
                        user ? (
                            <Navigate to={isAdmin ? ADMIN_ROUTES.dashboard : CHAT_ROUTES.root} replace />
                        ) : (
                            <Navigate to={MARKETING_ROUTES.landing} replace />
                        )
                    }
                />
            </Routes>
        </LoadingScreen>
    );
}

