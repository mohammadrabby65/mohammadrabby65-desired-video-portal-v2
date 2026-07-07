/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes, Route, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { Layout } from "./components/layout/Layout";
import { AdminLayout } from "./components/admin/AdminLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/admin/ProtectedRoute";

const Home = lazy(() =>
  import("./pages/Home").then((module) => ({ default: module.Home })),
);
const Video = lazy(() =>
  import("./pages/Video").then((module) => ({ default: module.Video })),
);
const Category = lazy(() =>
  import("./pages/Category").then((module) => ({ default: module.Category })),
);
const Tag = lazy(() =>
  import("./pages/Tag").then((module) => ({ default: module.Tag })),
);
const Search = lazy(() =>
  import("./pages/Search").then((module) => ({ default: module.Search })),
);
const DMCA = lazy(() =>
  import("./pages/DMCA").then((module) => ({ default: module.DMCA })),
);
const Compliance2257 = lazy(() =>
  import("./pages/Compliance2257").then((module) => ({ default: module.Compliance2257 })),
);
const PrivacyPolicy = lazy(() =>
  import("./pages/PrivacyPolicy").then((module) => ({ default: module.PrivacyPolicy })),
);
const Sitemap = lazy(() =>
  import("./pages/Sitemap").then((module) => ({ default: module.Sitemap })),
);
const Login = lazy(() =>
  import("./pages/admin/Login").then((module) => ({ default: module.Login })),
);
const Dashboard = lazy(() =>
  import("./pages/admin/Dashboard").then((module) => ({
    default: module.Dashboard,
  })),
);
const UploadPost = lazy(() =>
  import("./pages/admin/posts/UploadPost").then((module) => ({
    default: module.UploadPost,
  })),
);
const ManagePosts = lazy(() =>
  import("./pages/admin/posts/ManagePosts").then((module) => ({
    default: module.ManagePosts,
  })),
);
const Categories = lazy(() =>
  import("./pages/Categories").then((module) => ({ default: module.Categories })),
);
const AdminCategories = lazy(() =>
  import("./pages/admin/Categories").then((module) => ({
    default: module.Categories,
  })),
);
const DeadUrls = lazy(() =>
  import("./pages/admin/DeadUrls").then((module) => ({
    default: module.DeadUrls,
  })),
);
const Analytics = lazy(() =>
  import("./pages/admin/Analytics").then((module) => ({
    default: module.Analytics,
  })),
);
const Settings = lazy(() =>
  import("./pages/admin/Settings").then((module) => ({
    default: module.Settings,
  })),
);
const Profile = lazy(() =>
  import("./pages/admin/Profile").then((module) => ({
    default: module.Profile,
  })),
);

export default function App() {
  const location = useLocation();

  // Track page views on route change
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "page_view", {
        page_path: location.pathname + location.search,
      });
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const applyTheme = (theme: "dark" | "light") => {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(theme);
      document.documentElement.style.colorScheme = theme;
      
      // Sync immediate background to prevent flickering
      document.documentElement.style.backgroundColor = theme === "dark" ? "#0a0a0a" : "#f9fafb";
      
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute("content", theme === "dark" ? "#0a0a0a" : "#f9fafb");
      }
      
      sessionStorage.setItem("theme", theme);
    };

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      applyTheme(e.matches ? "dark" : "light");
    };

    // Initial check on mount
    const storedTheme = sessionStorage.getItem("theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      applyTheme(storedTheme);
    } else {
      handleChange(mediaQuery);
    }

    // Register real-time change listener
    try {
      mediaQuery.addEventListener("change", handleChange);
    } catch (err) {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      try {
        mediaQuery.removeEventListener("change", handleChange);
      } catch (err) {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return (
    <AuthProvider>
      <Suspense
        fallback={
          <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="page/:page" element={<Home />} />
            <Route path="video/:slug" element={<Video />} />
            <Route path="category/:slug" element={<Category />} />
            <Route path="categories" element={<Categories />} />
            <Route path="tag/:slug" element={<Tag />} />
            <Route path="search" element={<Search />} />
            <Route path="dmca" element={<DMCA />} />
            <Route path="2257" element={<Compliance2257 />} />
            <Route path="privacy-policy" element={<PrivacyPolicy />} />
            <Route path="sitemap" element={<Sitemap />} />
          </Route>

          <Route path="/admin/login" element={<Login />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="posts/new" element={<UploadPost />} />
            <Route path="posts" element={<ManagePosts />} />
            <Route path="posts/edit/:id" element={<UploadPost />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="dead-urls" element={<DeadUrls />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
