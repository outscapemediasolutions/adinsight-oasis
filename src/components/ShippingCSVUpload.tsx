
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { storage, db, auth } from "@/services/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp, writeBatch, doc, Timestamp } from "firebase/firestore";
import Papa from 'papaparse';

interface ShippingCSVUploadProps {
  onUploadStart: () => void;
  onUploadComplete: (success: boolean, filename?: string) => void;
  onHeadersDetected?: (headers: string[]) => void;
}

const ShippingCSVUpload = ({ 
  onUploadStart, 
  onUploadComplete,
  onHeadersDetected 
}: ShippingCSVUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [processingStatus, setProcessingStatus] = useState('');

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
          if (results.data && Array.isArray(results.data) && results.data.length > 0) {
            const firstRow = results.data[0];
            if (typeof firstRow === 'object' && firstRow !== null) {
              const headers = Object.keys(firstRow);
              console.log("Detected headers:", headers);
              
              // Validate required headers
              const requiredHeaders = [
                "Order ID", "Ship Date", "Status", "Product Name", 
                "Product Quantity", "Order Total"
              ];
              
              const missingHeaders = requiredHeaders.filter(
                header => !headers.some(h => h.toLowerCase() === header.toLowerCase())
              );
              
              if (missingHeaders.length > 0) {
                console.warn("Missing required headers:", missingHeaders);
                toast.warning(`Missing required headers: ${missingHeaders.join(", ")}`);
              }
              
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
    if (!file || !auth.currentUser) {
      console.log("No file selected or user not authenticated");
      toast.error("No file selected or you're not logged in");
      return;
    }
    
    onUploadStart();
    setIsLoading(true);
    setUploadSuccess(false);
    setUploadError('');
    setProcessingStatus('Preparing upload...');
    
    try {
      console.log("Starting upload process...");
      
      // First, store the file in Firebase Storage as backup
      const storageRef = ref(storage, `shipping_data/${auth.currentUser.uid}/${Date.now()}-${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const uploadProgress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 20); // First 20% for file upload
          console.log(`Upload progress: ${uploadProgress}%`);
          setProgress(uploadProgress);
          setProcessingStatus(`Uploading file: ${uploadProgress}%`);
        },
        (error) => {
          console.error('Upload failed:', error);
          setUploadError('File upload failed. Please try again.');
          setIsLoading(false);
          setProcessingStatus('');
          onUploadComplete(false);
          toast.error('File upload failed. Please try again.');
        },
        async () => {
          // Get download URL after upload completes
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("File uploaded successfully, URL:", downloadURL);
          setProcessingStatus('File uploaded. Starting CSV processing...');
          setProgress(25);
          
          // Parse CSV data
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true, // Auto-convert strings to numbers where appropriate
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
                const userId = auth.currentUser!.uid;
                const metaRef = collection(db, 'users', userId, 'shippingData_meta');
                
                const metaDoc = await addDoc(metaRef, {
                  filename: file.name,
                  uploadDate: serverTimestamp(),
                  fileSize: file.size,
                  recordCount: parsedData.length,
                  downloadURL
                });
                
                console.log("Created metadata document with ID:", metaDoc.id);
                setProgress(50);
                setProcessingStatus('Preparing data for database...');
                
                // Create batch for data upload
                const batch = writeBatch(db);
                const shippingCollection = collection(db, 'users', userId, 'shippingData');
                
                // Process valid rows in smaller batches (Firestore batch limit is 500 operations)
                const batchSize = 400; // Keep under Firestore's limit
                let batchCount = 0;
                let recordCount = 0;
                
                for (let i = 0; i < parsedData.length; i++) {
                  // Commit the current batch and create a new one if we've reached the limit
                  if (i > 0 && i % batchSize === 0) {
                    try {
                      setProcessingStatus(`Saving batch ${++batchCount} to database...`);
                      await batch.commit();
                      console.log(`Committed batch ${batchCount}`);
                      
                      // Calculate overall progress (50% for initial steps + up to 45% for batches)
                      const batchProgress = Math.min(95, 50 + Math.round((i / parsedData.length) * 45));
                      setProgress(batchProgress);
                      
                      // Create a new batch for the next set of records
                      batch = writeBatch(db);
                    } catch (batchError) {
                      console.error(`Error committing batch ${batchCount}:`, batchError);
                      toast.error(`Error saving batch ${batchCount}. Some data may be missing.`);
                      // Continue with next batch despite errors
                    }
                  }
                  
                  const row = parsedData[i];
                  if (typeof row !== 'object' || row === null) {
                    console.warn(`Skipping invalid row at index ${i}`);
                    continue;
                  }
                  
                  // Create a document reference with a unique ID
                  const docRef = doc(shippingCollection);
                  
                  // Convert shipDate to a proper timestamp if it exists
                  let shipDate = null;
                  if (row['Ship Date']) {
                    try {
                      const dateValue = new Date(row['Ship Date']);
                      // Check if parsed date is valid
                      if (!isNaN(dateValue.getTime())) {
                        shipDate = Timestamp.fromDate(dateValue);
                      } else {
                        console.warn(`Invalid date format for row ${i}:`, row['Ship Date']);
                      }
                    } catch (e) {
                      console.warn(`Error parsing date for row ${i}:`, e);
                    }
                  }
                  
                  // Create document data, ensuring all fields have proper types
                  batch.set(docRef, {
                    orderId: String(row['Order ID'] || ''),
                    trackingId: String(row['Tracking ID'] || ''),
                    shipDate: shipDate,
                    channel: String(row['Channel'] || ''),
                    status: String(row['Status'] || ''),
                    channelSKU: String(row['Channel SKU'] || ''),
                    masterSKU: String(row['Master SKU'] || ''),
                    productName: String(row['Product Name'] || ''),
                    productCategory: String(row['Product Category'] || ''),
                    productQuantity: Number(row['Product Quantity'] || 0),
                    customerName: String(row['Customer Name'] || ''),
                    customerEmail: String(row['Customer Email'] || ''),
                    customerMobile: String(row['Customer Mobile'] || ''),
                    addressLine1: String(row['Address Line 1'] || ''),
                    addressLine2: String(row['Address Line 2'] || ''),
                    addressCity: String(row['Address City'] || ''),
                    addressState: String(row['Address State'] || ''),
                    addressPincode: String(row['Address Pincode'] || ''),
                    paymentMethod: String(row['Payment Method'] || ''),
                    productPrice: Number(row['Product Price'] || 0),
                    orderTotal: Number(row['Order Total'] || 0),
                    discountValue: Number(row['Discount Value'] || 0),
                    weight: Number(row['Weight (KG)'] || 0),
                    chargedWeight: Number(row['Charged Weight'] || 0),
                    courierCompany: String(row['Courier Company'] || ''),
                    pickupLocationId: String(row['Pickup Location ID'] || ''),
                    codPayableAmount: Number(row['COD Payble Amount'] || 0),
                    remittedAmount: Number(row['Remitted Amount'] || 0),
                    codCharges: Number(row['COD Charges'] || 0),
                    shippingCharges: Number(row['Shipping Charges'] || 0),
                    freightTotalAmount: Number(row['Freight Total Amount'] || 0),
                    pickupPincode: String(row['Pickup Pincode'] || ''),
                    uploadDate: serverTimestamp(),
                    uploadId: metaDoc.id
                  });
                  
                  recordCount++;
                  
                  // Update UI progress every few records for smoother experience
                  if (i % 20 === 0) {
                    const itemProgress = Math.min(95, 50 + Math.round((i / parsedData.length) * 45));
                    setProgress(itemProgress);
                    setProcessingStatus(`Processing data: ${Math.round((i / parsedData.length) * 100)}%`);
                  }
                }
                
                // Commit any remaining records in the last batch
                if (recordCount % batchSize !== 0) {
                  try {
                    setProcessingStatus('Saving final records to database...');
                    await batch.commit();
                    console.log('Committed final batch');
                  } catch (batchError) {
                    console.error('Error committing final batch:', batchError);
                    toast.error('Error saving final batch. Some data may be missing.');
                  }
                }
                
                // Finalize the upload
                setProgress(100);
                setProcessingStatus('Upload complete!');
                setUploadSuccess(true);
                setIsLoading(false);
                console.log(`Successfully uploaded ${recordCount} records to Firestore`);
                onUploadComplete(true, file.name);
                toast.success(`${file.name} uploaded successfully!`);
                
                // Navigate to the dashboard automatically after a short delay
                setTimeout(() => {
                  window.location.href = '/shipping-analytics';
                }, 1500);
                
              } catch (err: any) {
                console.error('Error processing CSV data:', err);
                setUploadError(`Failed to process data: ${err.message}`);
                setIsLoading(false);
                setProcessingStatus('');
                onUploadComplete(false);
                toast.error(`Failed to process data: ${err.message}`);
              }
            },
            error: function(err: any) {
              console.error('Error parsing CSV:', err);
              setUploadError(`Failed to parse CSV: ${err.message}`);
              setIsLoading(false);
              setProcessingStatus('');
              onUploadComplete(false);
              toast.error(`Failed to parse CSV: ${err.message}`);
            }
          });
        }
      );
    } catch (error: any) {
      console.error('Error starting upload:', error);
      setUploadError(`Upload failed: ${error.message}`);
      setIsLoading(false);
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
          </div>

          {isLoading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>{processingStatus || "Processing..."}</span>
                <span>{progress}%</span>
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
              disabled={isLoading || !file || uploadSuccess}
              className="bg-gradient-to-r from-[#9b87f5] to-[#7E69AB] hover:from-[#7E69AB] hover:to-[#9b87f5] text-white"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </span>
              ) : 'Upload File'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingCSVUpload;
