'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, X, Check, AlertCircle, File, Image, FileCode } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UploadProgress {
  filename: string;
  progress: number;
  status: 'uploading' | 'processing' | 'indexing' | 'complete' | 'error';
  error?: string;
}

interface DocumentUploadProps {
  onUploadComplete?: (documentId: string) => void;
}

// Get file icon based on extension
const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
    case 'doc':
    case 'docx':
    case 'txt':
      return <FileText className="w-4 h-4" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
      return <Image className="w-4 h-4" />;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'py':
    case 'java':
      return <FileCode className="w-4 h-4" />;
    default:
      return <File className="w-4 h-4" />;
  }
};

export function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(uploadFile);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(uploadFile);
  };

  const uploadFile = async (file: File) => {
    const uploadProgress: UploadProgress = {
      filename: file.name,
      progress: 0,
      status: 'uploading',
    };
    setUploads((prev) => [...prev, uploadProgress]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload document');
      }

      const result = await response.json();

      setUploads((prev) =>
        prev.map((u) =>
          u.filename === file.name
            ? { ...u, status: 'processing', progress: 50 }
            : u
        )
      );

      setTimeout(() => {
        setUploads((prev) =>
          prev.map((u) =>
            u.filename === file.name
              ? { ...u, status: 'indexing', progress: 75 }
              : u
          )
        );
      }, 500);

      setTimeout(() => {
        setUploads((prev) =>
          prev.map((u) =>
            u.filename === file.name
              ? { ...u, status: 'complete', progress: 100 }
              : u
          )
        );
        onUploadComplete?.(result.document_id);
        toast.success(`${file.name} uploaded`);
      }, 1500);
    } catch (error) {
      setUploads((prev) =>
        prev.map((u) =>
          u.filename === file.name
            ? { ...u, status: 'error', error: 'Failed to upload' }
            : u
        )
      );
      toast.error(error instanceof Error ? error.message : `Failed to upload ${file.name}`);
    }
  };

  const removeUpload = (filename: string) => {
    setUploads((prev) => prev.filter((u) => u.filename !== filename));
  };

  const getStatusConfig = (status: UploadProgress['status']) => {
    switch (status) {
      case 'complete':
        return {
          color: 'success',
          icon: <Check className="w-3.5 h-3.5" />,
          text: 'Complete',
        };
      case 'error':
        return {
          color: 'destructive',
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          text: 'Error',
        };
      default:
        return {
          color: 'primary',
          icon: null,
          text: 'Processing...',
        };
    }
  };

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.01] shadow-sm'
            : 'border-border hover:border-primary/40 bg-muted/30 hover:bg-muted/50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all duration-300',
              isDragging
                ? 'bg-primary text-primary-foreground scale-110'
                : 'bg-primary/10 text-primary'
            )}
          >
            <Upload className={cn('w-5 h-5', isDragging && 'animate-bounce-gentle')} />
          </div>
          <p className="text-sm font-medium mb-1">
            {isDragging ? 'Drop files here' : 'Upload Documents'}
          </p>
          <p className="text-xs text-muted-foreground">
            Drag & drop or click to browse
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-2">
            PDF, DOC, DOCX, TXT, PNG, JPG
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        multiple
        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
      />

      {/* Upload Progress List */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload) => {
            const config = getStatusConfig(upload.status);

            return (
              <div
                key={upload.filename}
                className="card-flat p-3 animate-slide-up"
              >
                <div className="flex items-center gap-3">
                  {/* File Icon */}
                  <div
                    className={cn(
                      'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
                      upload.status === 'error'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-primary/10 text-primary'
                    )}
                  >
                    {getFileIcon(upload.filename)}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="text-sm font-medium truncate">
                        {upload.filename}
                      </p>
                      {/* Status Icon */}
                      <div
                        className={cn(
                          'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center',
                          config.color === 'success' && 'bg-success/10 text-success',
                          config.color === 'destructive' && 'bg-destructive/10 text-destructive',
                          config.color === 'primary' && 'bg-primary/10'
                        )}
                      >
                        {config.icon}
                        {!config.icon &&
                          upload.status !== 'complete' &&
                          upload.status !== 'error' && (
                            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full transition-all duration-300 rounded-full',
                            upload.status === 'error'
                              ? 'bg-destructive'
                              : 'bg-primary'
                          )}
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
                        {upload.progress}%
                      </span>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeUpload(upload.filename);
                    }}
                    className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Error Message */}
                {upload.error && (
                  <p className="text-xs text-destructive mt-2 pl-12">
                    {upload.error}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
