import { Route, Routes, Navigate } from "react-router-dom";

import AssessCarDamage from "./page/AssessCarDamage";
import ResultAssess from "./page/ResultAssess";
import Register from "./page/Register";
import Member from "./page/Member";
import ServiceMap from "./page/ServiceMap";
import PrivateRoute from "./components/PrivateRoute";
import LiffEntry from "./components/LiffEntry";

export default function App() {
  return (
    <>
      <Routes>
        {/* LIFF entry */}
        <Route path="/" element={<LiffEntry />} />

        {/* Public page */}
        <Route path="/map-service" element={<ServiceMap />} />
        <Route path="/register" element={<Register />} />

        {/* Protected pages */}
        <Route element={<PrivateRoute />}>
          <Route path="/member" element={<Member />} />
          <Route path="/assess-car-damage" element={<AssessCarDamage />} />
          <Route path="/assess-car-damage/result/:historyId" element={<ResultAssess />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}