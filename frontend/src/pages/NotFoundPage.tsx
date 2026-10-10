import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-5">
      <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shadow-xl">
        <FileQuestion className="w-8 h-8 text-emerald-400" />
      </div>

      <div className="space-y-2 max-w-md">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
          404 Error
        </span>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          Page Not Found
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          The requested URL path does not exist in the CampusCarbon AI application. Please check the address or return to the main dashboard.
        </p>
      </div>

      <div className="flex items-center space-x-3 pt-2">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};
