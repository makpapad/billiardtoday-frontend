"use client";

import React, { useState } from 'react';
import { Edit, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoginModal } from './LoginModal';

export function EditToggle() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogin = () => {
    setIsLoginModalOpen(true);
  };

  const handleLogout = async () => {
    await logout();
  };

  if (isAuthenticated) {
    return (
      <>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-[#1e293b] bg-[#1a2235] px-3 py-2">
            <User className="h-4 w-4 text-[#00d9ff]" />
            <span className="text-sm text-[#94a3b8]">
              {user?.firstname || user?.username}
            </span>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-[#1e293b] bg-[#1a2235] px-3 py-2 text-[#94a3b8] transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleLogin}
        className="flex items-center gap-2 rounded-lg border border-[#00d9ff]/30 bg-[#00d9ff]/10 px-3 py-2 text-[#00d9ff] transition-colors hover:border-[#00d9ff]/50 hover:bg-[#00d9ff]/20"
        title="Admin Login"
      >
        <Edit className="h-4 w-4" />
        <span className="text-sm font-medium">Edit</span>
      </button>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </>
  );
}
