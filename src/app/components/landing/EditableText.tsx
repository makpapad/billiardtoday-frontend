"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import { strapiContent } from '@/lib/strapi-content';
import { useAuth } from '@/contexts/AuthContext';

interface EditableTextProps {
  text: string;
  onSave?: (newText: string) => void;
  className?: string;
  demo?: boolean; // Demo mode - always shows edit button
  storageKey?: string; // Custom storage key
  page?: string; // Strapi page identifier
  component?: string; // Strapi component identifier
}

export function EditableText({ 
  text, 
  onSave, 
  className = "", 
  demo = false, 
  storageKey, 
  page = 'landing',
  component = 'general'
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const [isHovered, setIsHovered] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savedContent, setSavedContent] = useState<string | null>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();

  // Generate storage key or use custom one
  const key = storageKey || `editable-${text.replace(/\s+/g, '-').toLowerCase()}`;

  // Set isClient to true after mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Load saved content from Strapi on mount (client only)
    if (isClient) {
      loadContent();
    }
  }, [key, isClient]);

  const loadContent = async () => {
    try {
      const content = await strapiContent.getContent(key);
      if (content && content.content) {
        setSavedContent(content.content);
        setEditText(content.content);
      }
    } catch (error) {
      console.log('Content not found or error loading, using original text');
    }
  };

  const handleEdit = () => {
    if (!isAuthenticated && !demo) {
      alert('Please login to edit content');
      return;
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      // Save to Strapi backend
      if (isAuthenticated || demo) {
        await strapiContent.saveContent(key, editText, page, component);
        setSavedContent(editText);
        console.log(`Saved "${editText}" to Strapi with key: ${key}`);
      }
      
      // Call external save handler
      if (onSave) {
        onSave(editText);
      }
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Failed to save content. Please try again.');
    } finally {
      setIsLoading(false);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Restore to saved content or original text
    setEditText(savedContent || text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Display saved content if available and client is mounted, otherwise original text
  const displayText = isClient && savedContent ? savedContent : editText;

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="px-2 py-1 border border-[#00d9ff] rounded bg-[#1a2235] text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]"
            autoFocus
            disabled={isLoading}
          />
          <button
            onClick={handleSave}
            className="p-1 text-green-400 hover:text-green-300 transition-colors disabled:opacity-50"
            title="Save"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-400 border-t-transparent" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={handleCancel}
            className="p-1 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            title="Cancel"
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span ref={textRef}>{displayText}</span>
          {(isHovered || demo) && (
            <button
              onClick={handleEdit}
              className="p-1 text-[#64748b] hover:text-[#00d9ff] transition-colors"
              title={isAuthenticated ? "Edit" : "Login to edit"}
            >
              <Edit2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
