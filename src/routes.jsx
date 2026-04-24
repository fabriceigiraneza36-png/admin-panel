import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '@/layouts/AuthLayout';
import MainLayout from '@/layouts/MainLayout';
import FullPageLayout from '@/layouts/FullPageLayout';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Lazy load pages
const Login = lazy(() => import('@/pages/auth/Login'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const CountriesPage = lazy(() => import('@/pages/countries/CountriesPage'));
const CountryDetails = lazy(() => import('@/pages/countries/CountryDetails'));
const CreateCountry = lazy(() => import('@/pages/countries/CreateCountry'));
const DestinationsPage = lazy(() => import('@/pages/destinations/DestinationsPage'));
const DestinationDetails = lazy(() => import('@/pages/destinations/DestinationDetails'));
const CreateDestination = lazy(() => import('@/pages/destinations/CreateDestination'));
const BookingsPage = lazy(() => import('@/pages/bookings/BookingsPage'));
const BookingDetailsPage = lazy(() => import('@/pages/bookings/BookingDetailsPage'));
const PostsPage = lazy(() => import('@/pages/posts/PostsPage'));
const CreatePost = lazy(() => import('@/pages/posts/CreatePost'));
const EditPost = lazy(() => import('@/pages/posts/EditPost'));
const ContactPage = lazy(() => import('@/pages/contact/ContactPage'));
const MessageDetailsPage = lazy(() => import('@/pages/contact/MessageDetailsPage'));
const TeamPage = lazy(() => import('@/pages/team/TeamPage'));
const CreateTeamMember = lazy(() => import('@/pages/team/CreateTeamMember'));
const GalleryPage = lazy(() => import('@/pages/gallery/GalleryPage'));
const ServicesPage = lazy(() => import('@/pages/services/ServicesPage'));
const FAQsPage = lazy(() => import('@/pages/faqs/FAQsPage'));
const TipsPage = lazy(() => import('@/pages/tips/TipsPage'));
const SubscribersPage = lazy(() => import('@/pages/subscribers/SubscribersPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={<LoadingSpinner fullScreen />}>
    {children}
  </Suspense>
);

const AppRoutes = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={
          <SuspenseWrapper>
            <Login />
          </SuspenseWrapper>
        } />
        <Route path="/forgot-password" element={
          <SuspenseWrapper>
            <ForgotPassword />
          </SuspenseWrapper>
        } />
      </Route>

      {/* Main App Routes */}
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={
          <SuspenseWrapper>
            <Dashboard />
          </SuspenseWrapper>
        } />

        {/* Countries */}
        <Route path="/countries" element={
          <SuspenseWrapper>
            <CountriesPage />
          </SuspenseWrapper>
        } />
        <Route path="/countries/create" element={
          <SuspenseWrapper>
            <CreateCountry />
          </SuspenseWrapper>
        } />
        <Route path="/countries/:id" element={
          <SuspenseWrapper>
            <CountryDetails />
          </SuspenseWrapper>
        } />

        {/* Destinations */}
        <Route path="/destinations" element={
          <SuspenseWrapper>
            <DestinationsPage />
          </SuspenseWrapper>
        } />
        <Route path="/destinations/create" element={
          <SuspenseWrapper>
            <CreateDestination />
          </SuspenseWrapper>
        } />
        <Route path="/destinations/:id" element={
          <SuspenseWrapper>
            <DestinationDetails />
          </SuspenseWrapper>
        } />

        {/* Bookings */}
        <Route path="/bookings" element={
          <SuspenseWrapper>
            <BookingsPage />
          </SuspenseWrapper>
        } />
        <Route path="/bookings/:id" element={
          <SuspenseWrapper>
            <BookingDetailsPage />
          </SuspenseWrapper>
        } />

        {/* Posts */}
        <Route path="/posts" element={
          <SuspenseWrapper>
            <PostsPage />
          </SuspenseWrapper>
        } />
        <Route path="/posts/create" element={
          <SuspenseWrapper>
            <CreatePost />
          </SuspenseWrapper>
        } />
        <Route path="/posts/:id/edit" element={
          <SuspenseWrapper>
            <EditPost />
          </SuspenseWrapper>
        } />

        {/* Contact */}
        <Route path="/contact" element={
          <SuspenseWrapper>
            <ContactPage />
          </SuspenseWrapper>
        } />
        <Route path="/contact/:id" element={
          <SuspenseWrapper>
            <MessageDetailsPage />
          </SuspenseWrapper>
        } />

        {/* Team */}
        <Route path="/team" element={
          <SuspenseWrapper>
            <TeamPage />
          </SuspenseWrapper>
        } />
        <Route path="/team/create" element={
          <SuspenseWrapper>
            <CreateTeamMember />
          </SuspenseWrapper>
        } />

        {/* Other Pages */}
        <Route path="/gallery" element={
          <SuspenseWrapper>
            <GalleryPage />
          </SuspenseWrapper>
        } />
        <Route path="/services" element={
          <SuspenseWrapper>
            <ServicesPage />
          </SuspenseWrapper>
        } />
        <Route path="/faqs" element={
          <SuspenseWrapper>
            <FAQsPage />
          </SuspenseWrapper>
        } />
        <Route path="/tips" element={
          <SuspenseWrapper>
            <TipsPage />
          </SuspenseWrapper>
        } />
        <Route path="/subscribers" element={
          <SuspenseWrapper>
            <SubscribersPage />
          </SuspenseWrapper>
        } />
        <Route path="/settings" element={
          <SuspenseWrapper>
            <SettingsPage />
          </SuspenseWrapper>
        } />
        <Route path="/profile" element={
          <SuspenseWrapper>
            <ProfilePage />
          </SuspenseWrapper>
        } />
      </Route>

      {/* Redirects & 404 */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={
        <SuspenseWrapper>
          <NotFound />
        </SuspenseWrapper>
      } />
    </Routes>
  );
};

export default AppRoutes;