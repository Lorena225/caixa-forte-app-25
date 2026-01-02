import { Navigate } from 'react-router-dom';

// Redireciona para o novo Dashboard Executivo
export default function Dashboard() {
  return <Navigate to="/dashboards/executive" replace />;
}