"use client";

import React, { useState } from 'react';
import { X, Eye, EyeOff, Bug } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { debugAuth } from '@/lib/debug-auth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(identifier, password);
    if (!error) {
      onClose();
      // Reset form
      setIdentifier('');
      setPassword('');
    }
  };

  const handleDebug = async () => {
    console.log('Testing Strapi connection...');
    const result = await debugAuth.testConnection();
    console.log('Debug result:', result);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[#1e293b] bg-[#1a2235] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Admin Login</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-[#94a3b8] transition-colors hover:text-white hover:bg-[#2a3348]"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-[#94a3b8] mb-1">
              Email or Username
            </label>
            <input
              type="text"
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-lg border border-[#2a3348] bg-[#0f1620] px-3 py-2 text-white placeholder-[#64748b] focus:border-[#00d9ff] focus:outline-none focus:ring-1 focus:ring-[#00d9ff]"
              placeholder="Enter your email or username"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#94a3b8] mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[#2a3348] bg-[#0f1620] px-3 py-2 pr-10 text-white placeholder-[#64748b] focus:border-[#00d9ff] focus:outline-none focus:ring-1 focus:ring-[#00d9ff]"
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#94a3b8]"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-gradient-to-r from-[#00ff88] to-[#00d9ff] px-4 py-2 font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#00ff88]/25 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs text-[#64748b]">
            Connect to Strapi 5 Admin Panel for inline editing
          </p>
          <button
            type="button"
            onClick={handleDebug}
            className="mt-2 flex items-center gap-2 mx-auto text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors"
          >
            <Bug className="h-3 w-3" />
            Debug Connection
          </button>
        </div>
      </div>
    </div>
  );
}
