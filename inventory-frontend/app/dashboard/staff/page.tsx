"use client";

export default function StaffDashboard() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-xl w-full bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-4 text-center">Staff Dashboard</h1>
        <p className="text-center text-gray-600">Welcome, Staff! You can view inventory and create transactions.</p>
        {/* Add staff-specific dashboard features here */}
      </div>
    </div>
  );
}
