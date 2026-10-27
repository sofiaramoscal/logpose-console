import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { GuestOnly, RequireAuth } from './auth/RequireAuth';
import { Layout } from './components/Layout';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { NewsDetail } from './pages/NewsDetail';
import { NewsPage } from './pages/NewsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SagaStoryPage } from './pages/SagaStoryPage';
import { SagasPage } from './pages/SagasPage';
import { WantedDetail } from './pages/WantedDetail';
import { WantedPage } from './pages/WantedPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Solo para invitados: con sesión, redirigen a donde se quería ir */}
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Rutas privadas */}
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              {/* El detalle es ruta HIJA del listado: el listado no se desmonta al abrirlo */}
              <Route path="/wanted" element={<WantedPage />}>
                <Route path=":id" element={<WantedDetail />} />
              </Route>
              <Route path="/news" element={<NewsPage />}>
                <Route path=":id" element={<NewsDetail />} />
              </Route>
              <Route path="/sagas" element={<SagasPage />} />
              <Route path="/sagas/:id" element={<SagaStoryPage />} />
              {/* Página 404 para cualquier otra ruta */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
