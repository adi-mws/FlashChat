import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../src/redux/slices/authSlice";
import { CHAT_ROUTES } from "./routes";

export default function PublicRoutes({ children }) {
    const user = useSelector(selectUser);
    return user ? <Navigate to={CHAT_ROUTES.root} replace /> : children;
}