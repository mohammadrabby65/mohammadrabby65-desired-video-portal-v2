/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Layout } from "./components/layout/Layout";
import { AdminLayout } from "./components/admin/AdminLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/admin/ProtectedRoute";

const Home = lazy(() => import("./pages/Home").then(module => ({ default: module.Home })));
const Video = lazy(() => import("./pages/Video").then(module => ({ default: module.Video })));
const Login = lazy(() => import("./pages/admin/Login").then(module => ({ default: module.Login })));
const Dashboard = lazy(() => import("./pages/admin/Dashboard").then(module => ({ default: module.Dashboard })));
const UploadPost = lazy(() => import("./pages/admin/posts/UploadPost").then(module => ({ default: module.UploadPost })));
const ManagePosts = lazy(() => import("./pages/admin/posts/ManagePosts").then(module => ({ default: module.ManagePosts })));
const Categories = lazy(() => import("./pages/admin/Categories").then(module => ({ default: module.Categories })));
const Analytics = lazy(() => import("./pages/admin/Analytics").then(module => ({ default: module.Analytics })));
const Settings = lazy(() => import("./pages/admin/Settings").then(module => ({ default: module.Settings })));
const Profile = lazy(() => import("./pages/admin/Profile").then(module => ({ default: module.Profile })));

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div></div>}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="video/:slug" element={<Video />} />
          </Route>
          
          <Route path="/admin/login" element={<Login />} />
          
          <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="posts/new" element={<UploadPost />} />
            <Route path="posts" element={<ManagePosts />} />
            <Route path="posts/edit/:id" element={<UploadPost />} />
            <Route path="categories" element={<Categories />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
