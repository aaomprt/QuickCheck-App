import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import liff from "@line/liff";
import LoadingPage from "./LoadingPage";
import { LIFF_ID } from "../config";

export default function LiffEntry() {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            await liff.init({ liffId: LIFF_ID });

            if (!liff.isLoggedIn()) {
                liff.login({ redirectUri: window.location.origin });
                return;
            }

            const params = new URLSearchParams(location.search);
            const liffState = params.get("liff.state");

            const target =
                liffState && liffState.startsWith("/")
                    ? liffState
                    : "/member";

            navigate(target, { replace: true });
        })().catch((e) => {
            console.error("LIFF entry init error:", e);
            navigate("/member", { replace: true });
        });
    }, [location.search, navigate]);

    return <LoadingPage title="กำลังเข้าสู่ระบบ" subtitle="กำลังเชื่อมต่อกับ LINE..." />;
}
