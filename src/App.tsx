/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import React, { Suspense, lazy, useEffect } from "react";
import { Layout } from "./components/layout/Layout";
import { AdminLayout } from "./components/admin/AdminLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/admin/ProtectedRoute";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { Home } from "./pages/Home";

function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T } | any>,
) {
  return lazy(async () => {
    try {
      const module = await factory();
      return module.default ? module : { default: module };
    } catch (error) {
      console.warn("Retrying dynamic import due to chunk load error:", error);
      try {
        await new Promise((r) => setTimeout(r, 600));
        const module = await factory();
        return module.default ? module : { default: module };
      } catch (retryError) {
        console.error("Dynamic import failed after retry:", retryError);
        throw retryError;
      }
    }
  });
}

const Video = lazyWithRetry(() =>
  import("./pages/Video").then((module) => ({ default: module.Video })),
);
const Category = lazyWithRetry(() =>
  import("./pages/Category").then((module) => ({ default: module.Category })),
);
const Tag = lazyWithRetry(() =>
  import("./pages/Tag").then((module) => ({ default: module.Tag })),
);
const Search = lazyWithRetry(() =>
  import("./pages/Search").then((module) => ({ default: module.Search })),
);
const Download = lazyWithRetry(() =>
  import("./pages/Download").then((module) => ({ default: module.Download })),
);
const DMCA = lazyWithRetry(() =>
  import("./pages/DMCA").then((module) => ({ default: module.DMCA })),
);
const Compliance2257 = lazyWithRetry(() =>
  import("./pages/Compliance2257").then((module) => ({
    default: module.Compliance2257,
  })),
);
const PrivacyPolicy = lazyWithRetry(() =>
  import("./pages/PrivacyPolicy").then((module) => ({
    default: module.PrivacyPolicy,
  })),
);
const Login = lazyWithRetry(() =>
  import("./pages/admin/Login").then((module) => ({ default: module.Login })),
);
const Dashboard = lazyWithRetry(() =>
  import("./pages/admin/Dashboard").then((module) => ({
    default: module.Dashboard,
  })),
);
const UploadPost = lazyWithRetry(() =>
  import("./pages/admin/posts/UploadPost").then((module) => ({
    default: module.UploadPost,
  })),
);
const ManagePosts = lazyWithRetry(() =>
  import("./pages/admin/posts/ManagePosts").then((module) => ({
    default: module.ManagePosts,
  })),
);
const Categories = lazyWithRetry(() =>
  import("./pages/Categories").then((module) => ({
    default: module.Categories,
  })),
);
const AdminCategories = lazyWithRetry(() =>
  import("./pages/admin/Categories").then((module) => ({
    default: module.Categories,
  })),
);
const DeadUrls = lazyWithRetry(() =>
  import("./pages/admin/DeadUrls").then((module) => ({
    default: module.DeadUrls,
  })),
);
const Analytics = lazyWithRetry(() =>
  import("./pages/admin/Analytics").then((module) => ({
    default: module.Analytics,
  })),
);
const Settings = lazyWithRetry(() =>
  import("./pages/admin/Settings").then((module) => ({
    default: module.Settings,
  })),
);
const Profile = lazyWithRetry(() =>
  import("./pages/admin/Profile").then((module) => ({
    default: module.Profile,
  })),
);
const Promotions = lazyWithRetry(() =>
  import("./pages/admin/Promotions").then((module) => ({
    default: module.Promotions,
  })),
);

export default function App() {
  const location = useLocation();

  // Track page views on route change
  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);

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
      document.documentElement.style.backgroundColor =
        theme === "dark" ? "#0a0a0a" : "#f9fafb";

      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute("content", theme === "dark" ? "#0a0a0a" : "#f9fafb");
      }
    };

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (!localStorage.getItem("theme")) {
        applyTheme(e.matches ? "dark" : "light");
      }
    };

    // Initial check on mount
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      applyTheme(storedTheme);
    } else {
      applyTheme("dark");
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
    <ErrorBoundary>
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
              <Route path="page/:page" element={<Navigate to="/" replace />} />
              <Route path="video/:slug" element={<Video />} />
              <Route path="download/:slug" element={<Download />} />
              <Route path="category/:slug" element={<Category />} />
              <Route path="categories" element={<Categories />} />
              <Route path="tag/:slug" element={<Tag />} />
              <Route path="search" element={<Search />} />
              <Route path="dmca" element={<DMCA />} />
              <Route path="2257" element={<Compliance2257 />} />
              <Route path="privacy-policy" element={<PrivacyPolicy />} />
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
              <Route path="ads" element={<Promotions />} />
              <Route path="settings" element={<Settings />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  );
}
