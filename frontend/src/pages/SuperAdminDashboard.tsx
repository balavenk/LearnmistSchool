import React, { useMemo, useState, useEffect } from "react";
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../components/DataTable';

const SuperAdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    total_schools: 0,
    active_users: 0,
    total_quizzes: 0,
    total_projects: 0,
    recent_schools: [] as any[],
  });
  const userName = localStorage.getItem("username") || "Super Admin";
  const [loading, setLoading] = useState(true);

  // DataTable Columns for Recent Schools
  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'School Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 rounded-lg p-2">
              <svg
                className="w-4 h-4 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <span className="font-semibold text-slate-900">
              {row.original.name}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'address',
        header: 'Address',
        cell: ({ row }) => (
          <span className="text-slate-600">
            {row.original.address || "N/A"}
          </span>
        ),
      },
      {
        accessorKey: 'active',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${row.original.active ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200"
              }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${row.original.active ? "bg-green-500" : "bg-red-500"
                }`}
            ></span>
            {row.original.active ? "Active" : "Inactive"}
          </span>
        ),
      },
    ],
    []
  );

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const fetchStats = async () => {
      try {
        // We need to import api here or assume it's available via context/props?
        // Assuming standard import pattern.
        const response = await import("../api/axios").then((m) =>
          m.default.get("/super-admin/stats", {
            signal: abortController.signal
          })
        );
        if (isMounted) {
          setStats(response.data);
        }
      } catch (error: any) {
        if (error.name === 'AbortError' || error.name === 'CanceledError') {
          // Silently ignore canceled requests (navigation away from page)
          return;
        }
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">Loading dashboard...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
        <div>
          <h1 className="capitalize text-2xl font-bold mb-1 md:mb-2">
            Welcome {userName}
          </h1>
          <p className="text-indigo-100 text-sm md:text-base opacity-90">
            Have a great day managing the platform!
          </p>
        </div>
        <div className="w-full md:w-auto bg-white/10 md:bg-transparent rounded-xl p-3 md:p-0 backdrop-blur-sm md:backdrop-blur-none flex items-center justify-between md:block">
          <p className="text-sm text-indigo-100 md:text-indigo-100 mb-0 md:mb-1 inline md:block mr-2 md:mr-0">Today</p>
          <p className="text-lg font-bold text-white">
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
        {/* Card 1 - Schools */}
        <div className="bg-white rounded-2xl shadow-md border-2 border-indigo-100 hover:shadow-lg transition-all duration-200 overflow-hidden group">
          <div className="p-5 md:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-indigo-100 rounded-xl p-3 group-hover:scale-110 transition-transform duration-200">
                <svg
                  className="w-6 h-6 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                  Schools
                </h3>
              </div>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-indigo-600 mb-1">
              {stats.total_schools}
            </p>
            <p className="text-xs text-slate-500">Registered in system</p>
          </div>
          <div className="bg-indigo-50 px-5 md:px-6 py-2">
            <p className="text-xs text-indigo-600 font-medium">
              📊 All Institutions
            </p>
          </div>
        </div>

        {/* Card 2 - Active Users */}
        <div className="bg-white rounded-2xl shadow-md border-2 border-green-100 hover:shadow-lg transition-all duration-200 overflow-hidden group">
          <div className="p-5 md:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-green-100 rounded-xl p-3 group-hover:scale-110 transition-transform duration-200">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                  Active Users
                </h3>
              </div>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-green-600 mb-1">
              {stats.active_users.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">Students & Staff</p>
          </div>
          <div className="bg-green-50 px-5 md:px-6 py-2">
            <p className="text-xs text-green-600 font-medium">
              👥 Platform Users
            </p>
          </div>
        </div>

        {/* Card 3 - Quizzes */}
        <div className="bg-white rounded-2xl shadow-md border-2 border-blue-100 hover:shadow-lg transition-all duration-200 overflow-hidden group">
          <div className="p-5 md:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-100 rounded-xl p-3 group-hover:scale-110 transition-transform duration-200">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                  Quizzes
                </h3>
              </div>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-blue-600 mb-1">
              {stats.total_quizzes}
            </p>
            <p className="text-xs text-slate-500">Questions-based</p>
          </div>
          <div className="bg-blue-50 px-5 md:px-6 py-2">
            <p className="text-xs text-blue-600 font-medium">📝 Assessments</p>
          </div>
        </div>

        {/* Card 4 - Projects */}
        <div className="bg-white rounded-2xl shadow-md border-2 border-purple-100 hover:shadow-lg transition-all duration-200 overflow-hidden group">
          <div className="p-5 md:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-purple-100 rounded-xl p-3 group-hover:scale-110 transition-transform duration-200">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                  Projects
                </h3>
              </div>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-purple-600 mb-1">
              {stats.total_projects}
            </p>
            <p className="text-xs text-slate-500">Assignments</p>
          </div>
          <div className="bg-purple-50 px-5 md:px-6 py-2">
            <p className="text-xs text-purple-600 font-medium">📚 Work Items</p>
          </div>
        </div>

        {/* Card 5 - System Status */}
        <div className="bg-white rounded-2xl shadow-md border-2 border-emerald-100 hover:shadow-lg transition-all duration-200 overflow-hidden group">
          <div className="p-5 md:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-emerald-100 rounded-xl p-3 group-hover:scale-110 transition-transform duration-200">
                <svg
                  className="w-6 h-6 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                  System
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-2xl font-bold text-emerald-600">
                Online
              </span>
            </div>
            <p className="text-xs text-slate-500">All systems operational</p>
          </div>
          <div className="bg-emerald-50 px-5 md:px-6 py-2">
            <p className="text-xs text-emerald-600 font-medium">
              ✓ Healthy Status
            </p>
          </div>
        </div>
      </div>
      {/* Recent Schools Table */}
      <div className="bg-white rounded-2xl shadow-md border-2 border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-5 border-b-2 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 rounded-lg p-2">
              <svg
                className="w-5 h-5 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              Recent Schools Added
            </h3>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={stats.recent_schools}
          isLoading={loading}
          emptyMessage="No schools found. Schools will appear here once added."
          mobileCardRender={(school) => (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 rounded-lg p-2">
                    <svg
                      className="w-5 h-5 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <span className="font-semibold text-slate-900">
                    {school.name}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${school.active
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-red-100 text-red-700 border border-red-200"
                    }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${school.active ? "bg-green-500" : "bg-red-500"
                      }`}
                  ></span>
                  {school.active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-600 pl-1">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{school.address || "No address provided"}</span>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
