import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './context/AppContext.jsx';
import Layout from './components/Layout.jsx';
import ResourcePage from './components/ResourcePage.jsx';
import { RESOURCES } from './resources.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Forecast from './pages/Forecast.jsx';
import Reserve from './pages/Reserve.jsx';
import Scenario from './pages/Scenario.jsx';
import Settings from './pages/Settings.jsx';

function Protected({ children }) {
  const { user } = useApp();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="forecast" element={<Forecast />} />
        <Route path="reserve" element={<Reserve />} />
        <Route path="scenario" element={<Scenario />} />
        <Route path="settings" element={<Settings />} />
        {Object.entries(RESOURCES).map(([key, cfg]) => (
          <Route key={key} path={key} element={<ResourcePage config={cfg} />} />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
