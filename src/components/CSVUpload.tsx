
import React, { useState, useRef, useCallback, ChangeEvent } from "react";
import { useDropzone } from "react-dropzone";
import { useAuth } from "@/contexts/AuthContext";
import { processAndSaveCSVData } from "@/services/data";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UploadCloud, X, AlertCircle, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import Papa from "papaparse";

interface CSVUploadProps {
  onUploadStart?: () => void;
  onUploadComplete?: (success: boolean, filename?: string, dateRange?: { start: string; end: string }) => void;
  onValidate?: (csvData: string) => boolean;
  onUploadSuccess?: () => void; // New callback for explicit refresh trigger
}

const CSVUpload: React.FC<CSVUploadProps> = ({ 
  onUploadStart, 
  onUploadComplete,
  onValidate,
  onUploadSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Reset upload state
  const resetUpload = () => {
    setFile(null);
    setUploading(false);
    setUploadProgress(0);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  // Handle file drop or selection
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const selectedFile = acceptedFiles[0];
    
    // Validate file type
    if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
      setError("Please upload a CSV file");
      return;
    }
    
    setFile(selectedFile);
    setError(null);
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    maxSize: 10485760, // 10MB
  });
  
  // Handle manual file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    // Validate file type
    if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
      setError("Please upload a CSV file");
      return;
    }
    
    setFile(selectedFile);
    setError(null);
  };
  
  // Process and upload CSV file
  const handleUpload = async () => {
    if (!file || !currentUser) return;
    
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    
    if (onUploadStart) {
      onUploadStart();
    }
    
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 300);
      
      // Read the CSV file
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        const csvData = event.target?.result as string;
        
        // Validate CSV structure if validation function provided
        if (onValidate) {
          const isValid = onValidate(csvData);
          if (!isValid) {
            setError("CSV validation failed. Please check the required columns.");
            clearInterval(progressInterval);
            setUploading(false);
            if (onUploadComplete) {
              onUploadComplete(false);
            }
            return;
          }
        }
        
        try {
          // Parse CSV data
          const parseResult = await new Promise<Papa.ParseResult<Record<string, string>>>((resolve, reject) => {
            Papa.parse<Record<string, string>>(csvData, {
              header: true,
              skipEmptyLines: true,
              complete: resolve,
              error: reject
            });
          });
          
          if (parseResult.errors.length > 0) {
            throw new Error(`CSV parsing error: ${parseResult.errors[0].message}`);
          }
          
          // Get date range from data
          let minDate = '';
          let maxDate = '';
          
          parseResult.data.forEach(row => {
            const date = row['Date'];
            if (date) {
              if (!minDate || date < minDate) minDate = date;
              if (!maxDate || date > maxDate) maxDate = date;
            }
          });
          
          // Process and save data
          const result = await processAndSaveCSVData(
            currentUser.uid,
            file.name,
            parseResult.data
          );
          
          clearInterval(progressInterval);
          setUploadProgress(100);
          
          // Use a slight delay for better UX
          setTimeout(() => {
            if (onUploadComplete) {
              onUploadComplete(
                true, 
                file.name, 
                { start: minDate, end: maxDate }
              );
            }
            
            // Call onUploadSuccess callback to trigger history refresh
            if (onUploadSuccess) {
              onUploadSuccess();
            }
            
            resetUpload();
            toast.success("CSV data uploaded successfully");
          }, 500);
        } catch (error) {
          clearInterval(progressInterval);
          console.error("Error processing CSV:", error);
          setError(`Error processing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setUploading(false);
          if (onUploadComplete) {
            onUploadComplete(false);
          }
        }
      };
      
      reader.onerror = () => {
        clearInterval(progressInterval);
        setError("Error reading the file");
        setUploading(false);
        if (onUploadComplete) {
          onUploadComplete(false);
        }
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error("Upload error:", error);
      setError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setUploading(false);
      if (onUploadComplete) {
        onUploadComplete(false);
      }
    }
  };
  
  // Handle file removal
  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetUpload();
  };
  
  return (
    <Card className="border-dashed border-2 border-gray-300/20">
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={`flex flex-col items-center justify-center p-6 text-center rounded-lg cursor-pointer ${
            isDragActive ? "bg-white/5" : "hover:bg-white/5"
          } transition-colors`}
        >
          <input {...getInputProps()} ref={fileInputRef} onChange={handleFileChange} />
          
          {uploading ? (
            <div className="w-full space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-adpulse-green animate-pulse" />
                  <span>Uploading {file?.name}</span>
                </div>
                <span className="text-sm">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1" />
            </div>
          ) : file ? (
            <div className="w-full">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-adpulse-green" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-xs text-white/60">
                    ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full"
                  onClick={handleRemoveFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Button
                className="w-full bg-adpulse-green text-black hover:bg-adpulse-green/90"
                onClick={handleUpload}
                disabled={uploading}
              >
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload CSV
              </Button>
            </div>
          ) : (
            <>
              <UploadCloud className="h-12 w-12 text-white/60 mb-4" />
              <p className="text-lg font-medium mb-1">Drop CSV file here or click to browse</p>
              <p className="text-sm text-white/60 mb-4">
                Upload Meta Ads Manager export (.csv)
              </p>
              <Button variant="outline" className="border-white/20">
                Select CSV File
              </Button>
            </>
          )}
        </div>
        
        {error && (
          <div className="mt-4 p-3 rounded-md bg-red-500/20 text-red-200 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-300 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">Upload Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CSVUpload;
