'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, X, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
    const uploadId = crypto.randomUUID();
    const uploadProgress: UploadProgress = {
      filename: file.name,
      progress: 0,
      status: 'uploading',
    };
    setUploads((prev) => [...prev, uploadProgress]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Upload to backend
      const response = await fetch('http://localhost:8000/documents/upload', {
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

      // Simulate indexing progress
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
      }, 1500);

    } catch (error) {
      setUploads((prev) =>
        prev.map((u) =>
          u.filename === file.name
            ? { ...u, status: 'error', error: 'Failed to upload' }
            : u
        )
      );
    }
  };

  const removeUpload = (filename: string) => {
    setUploads((prev) => prev.filter((u) => u.filename !== filename));
  };

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'complete':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card
        className={cn(
          'border-2 border-dashed transition-colors cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Upload Documents</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Supports: PDF, DOCX, TXT, PNG, JPG
          </p>
        </div>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        multiple
        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
      />

      {uploads.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploads</h4>
          {uploads.map((upload) => (
            <Card key={upload.filename} className="p-3">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{upload.filename}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all duration-300',
                          upload.status === 'error'
                            ? 'bg-red-500'
                            : upload.status === 'complete'
                            ? 'bg-green-500'
                            : 'bg-primary'
                        )}
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {upload.progress}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">
                    {upload.status}
                    {upload.error && `: ${upload.error}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(upload.status)}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeUpload(upload.filename)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
