import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import liff from "@line/liff";
import LoadingPage from "./LoadingPage";
import { LIFF_ID, API_BASE_URL } from "../config";

export default function PrivateRoute() {
    const [status, setStatus] = useState("loading");
    const location = useLocation();

    useEffect(() => {
        const checkUserStatus = async () => {
            try {
                await liff.init({ liffId: LIFF_ID });

                if (!liff.isLoggedIn()) {
                    setStatus("need-login");
                    return;
                }

                const profile = await liff.getProfile();
                const response = await fetch(`${API_BASE_URL}/check_user/${profile.userId}`);

                if (response.ok) {
                    setStatus("registered");
                } else if (response.status === 404) {
                    setStatus("not-registered");
                } else {
                    throw new Error("Server error");
                }
            } catch (err) {
                console.error("Auth Check Error:", err);
                setStatus("not-registered");
            }
        };

        checkUserStatus();
    }, []);

    if (status === "need-login") {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    if (status === "loading") {
        return (
            <LoadingPage
                title="กำลังตรวจสอบสถานะผู้ใช้"
                subtitle="กำลังตรวจสอบบัญชีผู้ใช้ผ่าน LINE..."
            />
        );
    }

    return status === "registered"
        ? <Outlet />
        : <Navigate to="/register" state={{ from: location }} replace />;
}