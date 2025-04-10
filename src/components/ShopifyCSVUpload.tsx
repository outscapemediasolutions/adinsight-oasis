
import React, { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, AlertCircle, CheckCircle, X, FileText, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { useAuth } from "@/contexts/AuthContext";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/firebase";

interface ShopifyCSVUploadProps {
  onUploadStart?: () => void;
  onUploadComplete?: (success: boolean, filename?: string) => void;
}

const ShopifyCSVUpload = ({ onUploadStart, onUploadComplete }: ShopifyCSVUploadProps) => {
  const { currentUser } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const progressInterval = useRef<number | null>(null);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError("Please upload a CSV file.");
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1
  });
  
  const validateRequiredColumns = (headers: string[]) => {
    const requiredColumns = [
      "Name", "Email", "Financial Status", "Total", "Created at", 
      "Lineitem name", "Lineitem price", "Lineitem quantity"
    ];
    
    const lowercaseHeaders = headers.map(h => h.toLowerCase());
    const missingColumns = requiredColumns.filter(
      column => !lowercaseHeaders.includes(column.toLowerCase())
    );
    
    if (missingColumns.length > 0) {
      return `Missing required columns: ${missingColumns.join(", ")}`;
    }
    
    return null;
  };
  
  const processData = async (data: Record<string, string>[]) => {
    if (!currentUser) {
      throw new Error("User not authenticated");
    }
    
    // Process and upload the data
    try {
      const shopifyDataRef = collection(db, "users", currentUser.uid, "shopifyData");
      
      // Add metadata document
      const metadataRef = await addDoc(collection(db, "users", currentUser.uid, "shopifyUploads"), {
        filename: file?.name,
        uploadDate: serverTimestamp(),
        recordCount: data.length,
        userId: currentUser.uid
      });
      
      // Break data into chunks for Firestore batch limits
      const chunkSize = 400;
      const batches = [];
      
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        
        // Add each record with reference to the metadata
        for (const record of chunk) {
          await addDoc(shopifyDataRef, {
            ...record,
            uploadId: metadataRef.id,
            createdAt: new Date(record["Created at"] || ""),
            processedAt: serverTimestamp(),
          });
        }
        
        // Update progress after each chunk
        const progressValue = Math.min(95, Math.round((i + chunk.length) / data.length * 95));
        setProgress(progressValue);
      }
      
      return metadataRef.id;
    } catch (error) {
      console.error("Error processing data:", error);
      throw error;
    }
  };
  
  const handleUpload = async () => {
    if (!file || !currentUser) return;
    
    try {
      onUploadStart?.();
      setIsUploading(true);
      setProgress(5);
      setError(null);
      setSuccess(false);
      
      // Simulate progress for better UX
      progressInterval.current = window.setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 1;
          return newProgress < 90 ? newProgress : prev;
        });
      }, 100);
      
      // Parse CSV with more explicit configuration
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy', // Skip empty lines more aggressively
        delimiter: ',', // Explicitly set delimiter
        complete: async (results) => {
          try {
            // Check if we have any data
            if (!results.data || results.data.length === 0) {
              throw new Error("CSV file appears to be empty or improperly formatted");
            }
            
            // Check for parsing errors
            if (results.errors.length > 0) {
              const errorMessage = results.errors[0].message;
              
              // Provide more user-friendly error messages
              if (errorMessage.includes("Too few fields")) {
                throw new Error("CSV format error: The file doesn't have enough columns. Please ensure you're uploading a standard Shopify export. Use the template guide for reference.");
              } else if (errorMessage.includes("Too many fields")) {
                throw new Error("CSV format error: The file has too many columns. Please ensure you're uploading a standard Shopify export.");
              } else {
                throw new Error(`CSV parsing error: ${errorMessage}`);
              }
            }
            
            const columnValidationError = validateRequiredColumns(results.meta.fields || []);
            if (columnValidationError) {
              throw new Error(columnValidationError);
            }
            
            console.log("CSV successfully parsed. First row:", results.data[0]);
            console.log("Found fields:", results.meta.fields);
            
            // Process and upload the data
            const uploadId = await processData(results.data as Record<string, string>[]);
            
            // Cleanup and success handling
            if (progressInterval.current) {
              clearInterval(progressInterval.current);
            }
            
            setProgress(100);
            setSuccess(true);
            onUploadComplete?.(true, file.name);
            toast.success("Shopify data uploaded successfully");
            
            // Reset after successful upload with delay for progress bar to complete
            setTimeout(() => {
              setFile(null);
              setIsUploading(false);
              setProgress(0);
            }, 1500);
          } catch (error: any) {
            handleUploadError(error);
          }
        },
        error: (error) => {
          handleUploadError(error);
        },
        // Add transform to handle BOM characters and other encoding issues
        transform: (value) => {
          // Remove BOM character if present
          if (value.charCodeAt(0) === 0xFEFF) {
            return value.substr(1);
          }
          return value;
        },
        encoding: "UTF-8" // Explicitly set encoding
      });
    } catch (error: any) {
      handleUploadError(error);
    }
  };
  
  const handleUploadError = (error: any) => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    setIsUploading(false);
    setProgress(0);
    setError(`Upload failed: ${error.message}`);
    onUploadComplete?.(false);
    toast.error(`Upload failed: ${error.message}`);
    
    console.error("Detailed upload error:", error);
  };
  
  const handleReset = () => {
    setFile(null);
    setError(null);
    setSuccess(false);
  };
  
  const showFileInfo = () => {
    // Add a helper to show the user more information about their file
    if (!file) return null;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const firstLine = content.split('\n')[0];
      const fieldCount = firstLine.split(',').length;
      
      console.log(`CSV preview - First line has ${fieldCount} fields`);
      console.log(`CSV preview - First 50 chars: ${content.substring(0, 50)}`);
    };
    reader.readAsText(file);
    
    toast.info("Inspecting file format...", {
      description: "Checking the structure of your CSV file"
    });
  };
  
  return (
    <div className="space-y-4">
      {!file && !isUploading && (
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? "border-adpulse-green bg-adpulse-green/5" 
              : "border-gray-300 hover:border-adpulse-green/50"
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center">
            <Upload className="h-10 w-10 text-adpulse-green mb-2" />
            <p className="text-lg font-medium mb-1">
              {isDragActive ? "Drop the CSV file here" : "Drag & drop Shopify CSV file here"}
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              or click to browse your files
            </p>
            <Button type="button" variant="outline" className="mt-2">
              Select file
            </Button>
          </div>
        </div>
      )}
      
      {file && !isUploading && !success && (
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={showFileInfo}
                title="Inspect file format"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleReset}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleUpload} disabled={isUploading} className="w-full">
              Upload and Process
            </Button>
          </div>
        </div>
      )}
      
      {isUploading && (
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="font-medium">Uploading {file?.name}...</p>
            <p className="text-sm">{progress}%</p>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            {progress < 30 && "Parsing CSV data..."}
            {progress >= 30 && progress < 60 && "Processing records..."}
            {progress >= 60 && progress < 90 && "Saving to database..."}
            {progress >= 90 && "Finalizing..."}
          </p>
        </div>
      )}
      
      {success && (
        <Alert className="border-adpulse-green bg-adpulse-green/10">
          <CheckCircle className="h-5 w-5 text-adpulse-green" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {file?.name} uploaded and processed successfully.
            </span>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Upload another file
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="flex flex-col gap-2">
            <span>{error}</span>
            {error.includes("CSV format") && (
              <span className="text-sm">
                Make sure your file is a valid Shopify CSV export. Please check the template guide
                for the correct format.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ShopifyCSVUpload;
