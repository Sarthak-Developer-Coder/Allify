import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { ChakraProvider } from "@chakra-ui/react";
import theme from "./theme";

import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import Home from "./components/Home";
import Dashboard from "./components/Dashboard/Dashboard";
import ChatState from "./context/appState";
import Profile from "./components/Profile";
import PortfolioPage from "./components/Portfolio/PortfolioPage";
import PublicPortfolio from "./components/Portfolio/PublicPortfolio";
import PaintPage from "./components/Paint/PaintPage";
import MeetingPage from "./components/Meetings/MeetingPage";
import MusicPage from "./components/Music/MusicPage";
import AssistantPage from "./components/Assistant/AssistantPage";
import SnapPage from "./components/Snaps/SnapPage";
import StreaksPage from "./components/Snaps/StreaksPage";
import FriendProfile from "./components/Snaps/FriendProfile";
import MemoriesPage from "./components/Snaps/MemoriesPage";
import StoriesViewer from "./components/Snaps/StoriesViewer";
import DiscoverPage from "./components/Snaps/DiscoverPage";
import MapPage from "./components/Snaps/MapPage";
import AdminDashboard from "./components/Admin/AdminDashboard";
import SentSnapsPage from "./components/Snaps/SentSnapsPage";
import AnimatedLayout from "./components/routing/AnimatedLayout";

const token = localStorage.getItem("token");

const router = createBrowserRouter([
  // Robust top-level Assistant route to avoid any nesting issues
  {
    path: "/assistant",
    element: (
      <ChatState>
        <ChakraProvider theme={theme}>
          <App token={token} />
          <AssistantPage />
        </ChakraProvider>
      </ChatState>
    ),
  },
  {
    path: "/",
    element: (
      <ChatState>
        <ChakraProvider theme={theme}>
          <AnimatedLayout token={token} />
        </ChakraProvider>
      </ChatState>
    ),
    children: [
      { path: "/", element: <Home /> },
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/profile/:id", element: <Profile /> },
      { path: "/portfolio", element: <PortfolioPage /> },
      { path: "/p/:slug", element: <PublicPortfolio /> },
      { path: "/paint", element: <PaintPage /> },
      { path: "/meet", element: <MeetingPage /> },
      { path: "/music", element: <MusicPage /> },
  { path: "/snaps", element: <SnapPage /> },
  { path: "/streaks", element: <StreaksPage /> },
  { path: "/friend/:id", element: <FriendProfile /> },
  { path: "/memories", element: <MemoriesPage /> },
  { path: "/stories", element: <StoriesViewer /> },
  { path: "/discover", element: <DiscoverPage /> },
  { path: "/map", element: <MapPage /> },
  { path: "/admin", element: <AdminDashboard /> },
  { path: "/snaps/sent", element: <SentSnapsPage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Service worker registration (optional PWA)
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// In development, ensure no old SW controls the page (prevents stale bundles/routes)
if (process.env.NODE_ENV !== 'production' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  }).catch(() => {});
  if (window.caches && window.caches.keys) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
  }
}
