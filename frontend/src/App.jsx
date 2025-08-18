import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { Toaster } from 'react-hot-toast';
import PageLoader from './components/PageLoader.jsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useAutheUser from './hooks/useAutheUser.js';
import Layout from './components/Layout.jsx';
import { useThemeStore } from './hooks/useThemestore.js';
import { initializeStream, disconnectStream } from './lib/stream.js';
import { getStreamToken } from './lib/api';

import HomePage from './pages/HomePage.jsx';
import SignUpPage from './pages/SignUpPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import CallPage from './pages/CallPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import Frindes from './pages/Frindes.jsx';
import { GroupList } from './components/Groups/GroupList';
import { GroupChat } from './components/Groups/GroupChat';
import EditGroupPage from './pages/EditGroupPage.jsx';
import GroupInfo from './components/Groups/GroupInfo.jsx';
import JoinGroupPage from './pages/JoinGroupPage.jsx';

const queryClient = new QueryClient();

function App() {
  const { isLoading, authUser } = useAutheUser();
  const { theme } = useThemeStore();

  useEffect(() => {
    let isMounted = true;

    const initStream = async () => {
      if (!authUser) return;

      try {
        // No longer need to fetch token here as initializeStream handles it internally
        // const tokenData = await getStreamToken();
        // if (tokenData?.token && isMounted) {
        //   await connectUser(authUser, tokenData.token);
        // }
        if (isMounted) {
          await initializeStream(authUser);
        }
      } catch (error) {
        console.error("Error initializing Stream:", error);
      }
    };

    initStream();

    return () => {
      isMounted = false;
      disconnectStream(); // Use the unified disconnectStream function
    };
  }, [authUser]);

  if (isLoading) {
    return <div data-theme={theme}><PageLoader /></div>;
  }

  const isAuthenticated = Boolean(authUser);
  const isOnboarded = authUser?.isOnboarded;

  return (
    <div className="h-screen" data-theme={theme}>

      <Routes>
        <Route path="/" element={isAuthenticated && isOnboarded ? (
          <Layout showSidebar>
            <HomePage />
          </Layout>
        ) : (<Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />)} />

        <Route path="/signup" element={!isAuthenticated ?
          <SignUpPage />
          :
          <Navigate to={!isOnboarded ? "/onboarding" : "/"} />} />
        <Route path='/onboarding' element={isAuthenticated ? <OnboardingPage /> : <Navigate to="/" />} />
        <Route path="/login" element={!isAuthenticated ?
          <LoginPage />
          :
          (!isOnboarded && isAuthenticated ? <OnboardingPage /> : <Navigate to="/" />)} />

        <Route path="/chat/:id" element={isAuthenticated && isOnboarded ? (
          <Layout showSidebar={false}>
            <ChatPage />
          </Layout>
        ) : (<Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />)} />

        <Route path="/call/:id" element={
          isAuthenticated && isOnboarded ? (
            <CallPage />
          ) : (
            <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
          )
        } />

        <Route path="/notifications" element={isAuthenticated && isOnboarded ? (
          <Layout showSidebar>
            <NotificationsPage />
          </Layout>
        ) : (<Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />)} />

        <Route path='/onboarding' element={isAuthenticated ? (!isOnboarded ? <OnboardingPage /> : <Navigate to="/" />) : (<Navigate to="/login" />)} />

        <Route path='/friends' element={isAuthenticated && isOnboarded ? (
          <Layout showSidebar>
            <Frindes />
          </Layout>
        ) : (<Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />)} />

        <Route path='/groups' element={isAuthenticated && isOnboarded ? (
          <Layout showSidebar>
            <GroupList />
          </Layout>
        ) : (<Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />)} />

        <Route path='/groups/:groupId' element={
          <Layout showSidebar={false}>
            <GroupChat />
          </Layout>
        } />

        <Route path='/groups/:groupId/edit' element={isAuthenticated && isOnboarded ? (
          <Layout showSidebar={false}>
            <EditGroupPage />
          </Layout>
        ) : (<Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />)} />

        <Route path='/groups/:groupId/info' element={isAuthenticated && isOnboarded ? (
          <Layout showSidebar={false}>
            <GroupInfo />
          </Layout>
        ) : (<Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />)} />

        <Route path='/groups/join/:groupId' element={
          <Layout showSidebar={false}>
            <JoinGroupPage />
          </Layout>
        } />
      </Routes>
      <Toaster position="top-right" reverseOrder={true} />
    </div>
  );
}

export default function WrappedApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}