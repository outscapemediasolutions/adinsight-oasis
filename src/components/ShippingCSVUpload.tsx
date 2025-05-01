import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, HelpCircle, X } from "lucide-react";
import { storage, db } from "@/services/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp, writeBatch, doc, Timestamp } from "firebase/firestore";
import Papa from 'papaparse';

interface ShippingCSVUploadProps {
  onUploadStart: () => void;
  onUploadComplete: (success: boolean, filename?: string) => void;
  onHeadersDetected?: (headers: string[]) => void;
  columnMapping?: Record<string, string>;
}

const ShippingCSVUpload = ({ 
  onUploadStart, 
  onUploadComplete,
  onHeadersDetected,
  columnMapping = {}
}: ShippingCSVUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [processingStatus, setProcessingStatus] = useState('');
  const uploadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
      }
    };
  }, []);

  // Helper function to clean data and handle all types of missing values
  const cleanData = (data: any, mapping: Record<string, string>) => {
    if (!data) return null;
    
    console.log("Cleaning data with mapping:", mapping);
    
    // Create a new object for the cleaned data
    const cleaned: any = {};
    
    // Map CSV columns to expected field names
    Object.entries(mapping).forEach(([fieldKey, csvHeader]) => {
      if (!csvHeader || csvHeader === "not-mapped") return; // Skip unmapped fields
      
      // Get the value from the CSV data
      let value = data[csvHeader];
      
      // Check if the value is missing or empty
      const isEmpty = value === undefined || value === null || value === "" || 
                      value === "N/A" || value === "NULL" || value === "null";
      
      // Handle numerical fields (replace empty with 0)
      const numericalFields = [
        "productQuantity", "productPrice", "orderTotal", "discountValue", 
        "weight", "chargedWeight", "codPayableAmount", "remittedAmount", 
        "codCharges", "shippingCharges", "freightTotalAmount"
      ];
      
      if (isEmpty) {
        if (numericalFields.includes(fieldKey)) {
          value = 0;
        } else if (fieldKey === "trackingId") {
          // Special handling for Tracking ID - keep as empty string when NULL
          value = "";
        } else {
          value = ""; // Empty string for string fields
        }
      } else if (numericalFields.includes(fieldKey) && typeof value === 'string') {
        // Convert string numbers to actual numbers
        value = parseFloat(value) || 0;
      }
      
      // Add to cleaned data
      cleaned[fieldKey] = value;
    });
    
    // Add a marker to indicate if this record has a valid tracking ID
    cleaned.hasTrackingId = cleaned.trackingId && cleaned.trackingId.trim() !== '';
    
    console.log("Cleaned data result:", cleaned); // Debug log
    
    return cleaned;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    
    // Reset states
    setUploadSuccess(false);
    setUploadError('');
    setProgress(0);
    setProcessingStatus('');
    
    if (selectedFile) {
      // Check if file is CSV
      if (!selectedFile.name.endsWith('.csv')) {
        setUploadError('Please upload a CSV file');
        toast.error('Please upload a CSV file');
        return;
      }
      
      console.log("File selected:", selectedFile.name);
      
      // Parse CSV headers to validate the file format
      Papa.parse(selectedFile, {
        header: true,
        preview: 1, // Only parse the first row to get headers
        skipEmptyLines: true,
        complete: function(results) {
          console.log("Preview parse results:", results);
          if (results.data && Array.isArray(results.data) && results.data.length > 0) {
            const firstRow = results.data[0];
            if (typeof firstRow === 'object' && firstRow !== null) {
              const headers = Object.keys(firstRow);
              console.log("Detected headers:", headers);
              
              if (onHeadersDetected) {
                onHeadersDetected(headers);
              }
            }
          }
        },
        error: function(error) {
          console.error("Error parsing CSV headers:", error);
          setUploadError('Failed to parse CSV headers. Please check file format.');
          toast.error('Failed to parse CSV headers. Please check file format.');
        }
      });
      
      setFile(selectedFile);
    }
  }, [onHeadersDetected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

  const handleUpload = async () => {
    if (!file) {
      console.log("No file selected");
      toast.error("No file selected");
      return;
    }
    
    // Check if column mapping is empty or necessary fields are missing
    if (Object.keys(columnMapping).length === 0) {
      toast.error("Please set up column mapping before uploading");
      return;
    }
    
    // Verify key columns are mapped
    const requiredFields = ["orderId", "shipDate", "productQuantity"];
    const missingFields = requiredFields.filter(field => !columnMapping[field]);
    if (missingFields.length > 0) {
      toast.error(`Missing required field mappings: ${missingFields.join(", ")}`);
      return;
    }
    
    onUploadStart();
    setIsLoading(true);
    setUploadSuccess(false);
    setUploadError('');
    setProcessingStatus('Preparing upload...');
    setProgress(5); // Start with 5% to show activity
    
    // Set a timeout to abort if the upload takes too long
    if (uploadTimeoutRef.current) {
      clearTimeout(uploadTimeoutRef.current);
    }
    
    uploadTimeoutRef.current = setTimeout(() => {
      setUploadError('Upload timed out after 30 seconds. Please try again.');
      setIsLoading(false);
      setProcessingStatus('');
      setProgress(0);
      onUploadComplete(false);
      toast.error('Upload timed out after 30 seconds.');
    }, 30000);
    
    try {
      console.log("Starting upload process with column mapping:", columnMapping);
      
      // First, store the file in Firebase Storage as backup
      const storageRef = ref(storage, `shipping_data/${Date.now()}-${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const uploadProgress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 20); // First 20% for file upload
          setProgress(uploadProgress);
          setProcessingStatus(`Uploading file: ${uploadProgress}%`);
        },
        (error) => {
          console.error('Upload to storage failed:', error);
          setUploadError(`File upload failed: ${error.message}`);
          setIsLoading(false);
          setProcessingStatus('');
          setProgress(0);
          
          if (uploadTimeoutRef.current) {
            clearTimeout(uploadTimeoutRef.current);
            uploadTimeoutRef.current = null;
          }
          
          onUploadComplete(false);
          toast.error(`File upload failed: ${error.message}`);
        },
        async () => {
          // Get download URL after upload completes
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log("File uploaded successfully to storage, URL:", downloadURL);
            setProcessingStatus('File uploaded to storage. Starting CSV processing...');
            setProgress(25);
            
            // Parse CSV data with enhanced error handling
            Papa.parse(file, {
              header: true,
              skipEmptyLines: true,
              dynamicTyping: false, // Keep as strings until we process them
              complete: async function(results) {
                try {
                  const parsedData = results.data;
                  console.log(`Parsed ${parsedData.length} rows from CSV`);
                  setProcessingStatus(`Parsed ${parsedData.length} records. Processing data...`);
                  setProgress(40);
                  
                  // Report any parsing errors
                  if (results.errors && results.errors.length > 0) {
                    console.warn("CSV parsing had some errors:", results.errors);
                    toast.warning(`CSV parsing had ${results.errors.length} errors. Some data may be incomplete.`);
                  }
                  
                  if (parsedData.length === 0) {
                    throw new Error("No valid data found in the CSV file");
                  }
                  
                  // Create a metadata document first
                  const metaRef = collection(db, 'shippingData_meta');
                  
                  const metaDoc = await addDoc(metaRef, {
                    filename: file.name,
                    uploadDate: serverTimestamp(),
                    fileSize: file.size,
                    recordCount: parsedData.length,
                    downloadURL,
                    columnMapping: columnMapping // Store the column mapping with metadata
                  });
                  
                  console.log("Created metadata document with ID:", metaDoc.id);
                  setProgress(50);
                  setProcessingStatus('Preparing data for database...');
                  
                  // Process data in smaller batches to avoid Firestore limits
                  const batchSize = 100; // Keep well under Firestore's limit (was 200)
                  let currentBatch = writeBatch(db);
                  let batchCount = 0;
                  let recordCount = 0;
                  let recordsWithTrackingId = 0;
                  let errorCount = 0;
                  
                  const shippingCollection = collection(db, 'shippingData');
                  
                  // Process in smaller chunks with batch commits between
                  for (let i = 0; i < parsedData.length; i++) {
                    // Commit the current batch and create a new one if we've reached the limit
                    if (i > 0 && i % batchSize === 0) {
                      try {
                        setProcessingStatus(`Saving batch ${++batchCount} to database...`);
                        await currentBatch.commit();
                        console.log(`Committed batch ${batchCount} successfully (${i}/${parsedData.length})`);
                        
                        // Calculate overall progress (50% for initial steps + up to 45% for batches)
                        const batchProgress = Math.min(95, 50 + Math.round((i / parsedData.length) * 45));
                        setProgress(batchProgress);
                        
                        // Create a new batch for the next set of records
                        currentBatch = writeBatch(db);
                      } catch (batchError: any) {
                        console.error(`Error committing batch ${batchCount}:`, batchError);
                        errorCount++;
                        toast.error(`Error saving batch ${batchCount}: ${batchError.message}`);
                        // Create a new batch and continue despite errors
                        currentBatch = writeBatch(db);
                      }
                    }
                    
                    const row = parsedData[i];
                    if (typeof row !== 'object' || row === null) {
                      console.warn(`Skipping invalid row at index ${i}`);
                      continue;
                    }
                    
                    try {
                      // Clean and map the data
                      const cleanedData = cleanData(row, columnMapping);
                      
                      if (!cleanedData) {
                        console.warn(`Row ${i} resulted in null data after cleaning, skipping`);
                        continue;
                      }
                      
                      // Add uploadId and timestamps
                      cleanedData.uploadId = metaDoc.id;
                      cleanedData.uploadDate = serverTimestamp();
                      cleanedData.processedAt = serverTimestamp();
                      
                      // Convert shipDate to a Timestamp if it exists
                      if (cleanedData.shipDate) {
                        try {
                          const dateValue = new Date(cleanedData.shipDate);
                          // Check if parsed date is valid
                          if (!isNaN(dateValue.getTime())) {
                            cleanedData.shipDate = Timestamp.fromDate(dateValue);
                          } else {
                            console.warn(`Invalid date format for row ${i}:`, cleanedData.shipDate);
                            // Use current date as fallback
                            cleanedData.shipDate = Timestamp.now();
                          }
                        } catch (e) {
                          console.warn(`Error parsing date for row ${i}:`, e);
                          // Use current date as fallback
                          cleanedData.shipDate = Timestamp.now();
                        }
                      } else {
                        // If no ship date, use current date
                        cleanedData.shipDate = Timestamp.now();
                      }
                      
                      // Check if this record has a valid tracking ID
                      if (cleanedData.hasTrackingId) {
                        recordsWithTrackingId++;
                      }
                      
                      // Create a document reference with a unique ID
                      const docRef = doc(shippingCollection);
                      
                      // Add to batch
                      currentBatch.set(docRef, cleanedData);
                      recordCount++;
                      
                      // Update UI progress every few records for smoother experience
                      if (i % 20 === 0) {
                        const itemProgress = Math.min(95, 50 + Math.round((i / parsedData.length) * 45));
                        setProgress(itemProgress);
                        setProcessingStatus(`Processing data: ${Math.round((i / parsedData.length) * 100)}%`);
                      }
                    } catch (rowError: any) {
                      console.error(`Error processing row ${i}:`, rowError);
                      errorCount++;
                      // Continue with next row despite errors
                    }
                  }
                  
                  // Commit any remaining records in the last batch
                  if (recordCount % batchSize !== 0 && recordCount > 0) {
                    try {
                      setProcessingStatus('Saving final records to database...');
                      await currentBatch.commit();
                      console.log('Committed final batch successfully');
                    } catch (batchError: any) {
                      console.error('Error committing final batch:', batchError);
                      errorCount++;
                      toast.error(`Error saving final records: ${batchError.message}`);
                    }
                  }
                  
                  // Update metadata with valid tracking ID count
                  try {
                    await addDoc(collection(db, 'shippingData_stats'), {
                      uploadId: metaDoc.id,
                      totalRecords: recordCount,
                      recordsWithTrackingId: recordsWithTrackingId,
                      errorCount: errorCount,
                      uploadDate: serverTimestamp()
                    });
                    console.log('Successfully updated shippingData_stats');
                  } catch (statsError: any) {
                    console.error('Error saving stats:', statsError);
                    // Non-critical error, don't fail the whole operation
                  }
                  
                  // Clear timeout as upload was successful
                  if (uploadTimeoutRef.current) {
                    clearTimeout(uploadTimeoutRef.current);
                    uploadTimeoutRef.current = null;
                  }
                  
                  // Finalize the upload
                  setProgress(100);
                  setProcessingStatus('Upload complete!');
                  setUploadSuccess(true);
                  setIsLoading(false);
                  console.log(`Successfully uploaded ${recordCount} records to Firestore (${recordsWithTrackingId} with tracking IDs)`);
                  
                  // Display warning if not all records have tracking IDs
                  if (recordsWithTrackingId < recordCount) {
                    toast.warning(`${recordCount - recordsWithTrackingId} records without Tracking ID will not appear in dashboard.`);
                  }
                  
                  // Show error summary if any errors occurred
                  if (errorCount > 0) {
                    toast.warning(`Upload completed with ${errorCount} errors. Check console for details.`);
                  }
                  
                  onUploadComplete(true, file.name);
                  toast.success(`${file.name} uploaded successfully!`);
                  
                  // Reset the interface after a short delay
                  setTimeout(() => {
                    setFile(null);
                    setProgress(0);
                    setProcessingStatus('');
                  }, 1500);
                  
                } catch (err: any) {
                  // Clear timeout on error
                  if (uploadTimeoutRef.current) {
                    clearTimeout(uploadTimeoutRef.current);
                    uploadTimeoutRef.current = null;
                  }
                  
                  console.error('Error processing CSV data:', err);
                  setUploadError(`Failed to process data: ${err.message}`);
                  setIsLoading(false);
                  setProgress(0);
                  setProcessingStatus('');
                  onUploadComplete(false);
                  toast.error(`Failed to process data: ${err.message}`);
                }
              },
              error: function(err: any) {
                // Clear timeout on error
                if (uploadTimeoutRef.current) {
                  clearTimeout(uploadTimeoutRef.current);
                  uploadTimeoutRef.current = null;
                }
                
                console.error('Error parsing CSV:', err);
                setUploadError(`Failed to parse CSV: ${err.message}`);
                setIsLoading(false);
                setProgress(0);
                setProcessingStatus('');
                onUploadComplete(false);
                toast.error(`Failed to parse CSV: ${err.message}`);
              }
            });
          } catch (downloadError: any) {
            console.error('Error getting download URL:', downloadError);
            setUploadError(`Error accessing uploaded file: ${downloadError.message}`);
            setIsLoading(false);
            setProgress(0);
            setProcessingStatus('');
            
            if (uploadTimeoutRef.current) {
              clearTimeout(uploadTimeoutRef.current);
              uploadTimeoutRef.current = null;
            }
            
            onUploadComplete(false);
            toast.error(`Error accessing uploaded file: ${downloadError.message}`);
          }
        }
      );
    } catch (error: any) {
      // Clear timeout on error
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
        uploadTimeoutRef.current = null;
      }
      
      console.error('Error starting upload:', error);
      setUploadError(`Upload failed: ${error.message}`);
      setIsLoading(false);
      setProgress(0);
      setProcessingStatus('');
      onUploadComplete(false);
      toast.error(`Upload failed: ${error.message}`);
    }
  };

  return (
    <div className="space-y-4">
      <Card className={`border border-dashed p-6 text-center ${isDragActive ? 'border-primary/50 bg-primary/5' : 'border-muted-foreground/25'}`}>
        <div 
          {...getRootProps()} 
          className="flex flex-col items-center justify-center space-y-2 py-4 cursor-pointer"
        >
          <input {...getInputProps()} />
          
          <div className="rounded-full bg-primary/10 p-3">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Drag & drop your CSV file here</p>
            <p className="text-xs text-muted-foreground">or click to browse files</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Accepts CSV files containing shipping data
          </p>
        </div>
      </Card>

      {Object.keys(columnMapping).length > 0 && (
        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-muted">
          <p className="font-medium mb-1">Column mapping applied:</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 max-h-24 overflow-y-auto">
            {Object.entries(columnMapping).map(([key, value]) => (
              value && value !== "not-mapped" && (
                <div key={key} className="flex justify-between">
                  <span>{key}:</span>
                  <span className="text-primary-foreground">{value}</span>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {file && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 rounded-md border p-3">
            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
            {uploadSuccess && (
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            )}
            {uploadError && (
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            )}
            {!isLoading && !uploadSuccess && (
              <Button variant="ghost" size="icon" onClick={() => setFile(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {isLoading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>{processingStatus || "Processing..."}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {uploadError && (
            <p className="text-sm text-red-500">{uploadError}</p>
          )}

          <div className="flex justify-end">
            <Button 
              onClick={handleUpload} 
              disabled={isLoading || !file || uploadSuccess || Object.keys(columnMapping).length === 0}
              className="bg-gradient-to-r from-[#9b87f5] to-[#7E69AB] hover:from-[#7E69AB] hover:to-[#9b87f5] text-white"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </span>
              ) : Object.keys(columnMapping).length === 0 ? 
                'Set Column Mapping First' : 
                'Upload File'
              }
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingCSVUpload;
