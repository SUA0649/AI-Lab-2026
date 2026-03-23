"use client";

export default function AdminDashboard() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-xl w-full bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-4 text-center">Admin Dashboard</h1>
        <p className="text-center text-gray-600">Welcome, Admin! You have full access to management features.</p>
        {/* Add admin-specific dashboard features here */}
      </div>
    </div>
  );
}
