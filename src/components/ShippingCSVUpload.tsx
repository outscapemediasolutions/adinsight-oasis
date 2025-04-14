
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { storage, db, auth } from "@/services/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp, writeBatch, doc } from "firebase/firestore";
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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    
    // Reset states
    setUploadSuccess(false);
    setUploadError('');
    setProgress(0);
    
    if (selectedFile) {
      // Check if file is CSV
      if (!selectedFile.name.endsWith('.csv')) {
        setUploadError('Please upload a CSV file');
        return;
      }
      
      // Parse CSV headers
      Papa.parse(selectedFile, {
        header: true,
        preview: 1,
        complete: function(results) {
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
        }
      });
      
      setFile(selectedFile);
      console.log("File selected:", selectedFile.name);
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
      return;
    }
    
    onUploadStart();
    setIsLoading(true);
    setUploadSuccess(false);
    setUploadError('');
    
    try {
      console.log("Starting upload process...");
      // Upload file to Firebase Storage
      const storageRef = ref(storage, `shipping_data/${auth.currentUser.uid}/${Date.now()}-${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 50); // Up to 50% for file upload
          console.log(`Upload progress: ${progress}%`);
          setProgress(progress);
        },
        (error) => {
          console.error('Upload failed:', error);
          setUploadError('Upload failed. Please try again.');
          setIsLoading(false);
          onUploadComplete(false);
          toast.error('Upload failed. Please try again.');
        },
        async () => {
          // Get download URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("File uploaded successfully, URL:", downloadURL);
          
          // Parse CSV data
          Papa.parse(file, {
            header: true,
            complete: async function(results) {
              try {
                console.log(`Parsed ${results.data.length} rows from CSV`);
                // Create a batch for more efficient writes
                const batch = writeBatch(db);
                
                // Add metadata to Firestore
                const userId = auth.currentUser!.uid;
                const metaDocRef = doc(collection(db, 'users', userId, 'shippingData_meta'));
                
                batch.set(metaDocRef, {
                  filename: file.name,
                  uploadDate: serverTimestamp(),
                  fileSize: file.size,
                  recordCount: results.data.length,
                  downloadURL
                });
                
                console.log("Created metadata document with ID:", metaDocRef.id);
                
                // Process and add rows to Firestore
                const shippingCollection = collection(db, 'users', userId, 'shippingData');
                
                // Process only valid rows
                const validRows = results.data.filter((row: any) => 
                  row && 
                  typeof row === 'object' && 
                  Object.keys(row).length > 0
                );
                
                console.log(`Processing ${validRows.length} valid rows`);
                
                // Process in chunks due to Firestore batch limits (max 500 operations)
                const chunkSize = 400; // Keep under Firestore's 500 limit to be safe
                
                // Process first chunk directly in this batch
                const firstChunk = validRows.slice(0, chunkSize);
                
                for (const row of firstChunk) {
                  if (typeof row === 'object' && row !== null) {
                    const docRef = doc(shippingCollection);
                    batch.set(docRef, {
                      orderId: row['Order ID'] || '',
                      trackingId: row['Tracking ID'] || '',
                      shipDate: row['Ship Date'] ? new Date(row['Ship Date']) : null,
                      channel: row['Channel'] || '',
                      status: row['Status'] || '',
                      channelSKU: row['Channel SKU'] || '',
                      masterSKU: row['Master SKU'] || '',
                      productName: row['Product Name'] || '',
                      productCategory: row['Product Category'] || '',
                      productQuantity: parseInt(row['Product Quantity'] || '0'),
                      customerName: row['Customer Name'] || '',
                      customerEmail: row['Customer Email'] || '',
                      customerMobile: row['Customer Mobile'] || '',
                      addressLine1: row['Address Line 1'] || '',
                      addressLine2: row['Address Line 2'] || '',
                      addressCity: row['Address City'] || '',
                      addressState: row['Address State'] || '',
                      addressPincode: row['Address Pincode'] || '',
                      paymentMethod: row['Payment Method'] || '',
                      productPrice: parseFloat(row['Product Price'] || '0'),
                      orderTotal: parseFloat(row['Order Total'] || '0'),
                      discountValue: parseFloat(row['Discount Value'] || '0'),
                      weight: parseFloat(row['Weight (KG)'] || '0'),
                      chargedWeight: parseFloat(row['Charged Weight'] || '0'),
                      courierCompany: row['Courier Company'] || '',
                      pickupLocationId: row['Pickup Location ID'] || '',
                      codPayableAmount: parseFloat(row['COD Payble Amount'] || '0'),
                      remittedAmount: parseFloat(row['Remitted Amount'] || '0'),
                      codCharges: parseFloat(row['COD Charges'] || '0'),
                      shippingCharges: parseFloat(row['Shipping Charges'] || '0'),
                      freightTotalAmount: parseFloat(row['Freight Total Amount'] || '0'),
                      pickupPincode: row['Pickup Pincode'] || '',
                      uploadDate: serverTimestamp(),
                      uploadId: metaDocRef.id
                    });
                  }
                }
                
                // Commit the first batch
                await batch.commit();
                console.log(`Successfully uploaded first batch of ${firstChunk.length} records`);
                setProgress(60); // 60% progress after first batch
                
                // Process any remaining chunks
                const remaining = validRows.slice(chunkSize);
                let processedCount = firstChunk.length;
                
                for (let i = 0; i < remaining.length; i += chunkSize) {
                  const nextBatch = writeBatch(db);
                  const chunk = remaining.slice(i, i + chunkSize);
                  
                  for (const row of chunk) {
                    if (typeof row === 'object' && row !== null) {
                      const docRef = doc(shippingCollection);
                      nextBatch.set(docRef, {
                        orderId: row['Order ID'] || '',
                        trackingId: row['Tracking ID'] || '',
                        shipDate: row['Ship Date'] ? new Date(row['Ship Date']) : null,
                        channel: row['Channel'] || '',
                        status: row['Status'] || '',
                        channelSKU: row['Channel SKU'] || '',
                        masterSKU: row['Master SKU'] || '',
                        productName: row['Product Name'] || '',
                        productCategory: row['Product Category'] || '',
                        productQuantity: parseInt(row['Product Quantity'] || '0'),
                        customerName: row['Customer Name'] || '',
                        customerEmail: row['Customer Email'] || '',
                        customerMobile: row['Customer Mobile'] || '',
                        addressLine1: row['Address Line 1'] || '',
                        addressLine2: row['Address Line 2'] || '',
                        addressCity: row['Address City'] || '',
                        addressState: row['Address State'] || '',
                        addressPincode: row['Address Pincode'] || '',
                        paymentMethod: row['Payment Method'] || '',
                        productPrice: parseFloat(row['Product Price'] || '0'),
                        orderTotal: parseFloat(row['Order Total'] || '0'),
                        discountValue: parseFloat(row['Discount Value'] || '0'),
                        weight: parseFloat(row['Weight (KG)'] || '0'),
                        chargedWeight: parseFloat(row['Charged Weight'] || '0'),
                        courierCompany: row['Courier Company'] || '',
                        pickupLocationId: row['Pickup Location ID'] || '',
                        codPayableAmount: parseFloat(row['COD Payble Amount'] || '0'),
                        remittedAmount: parseFloat(row['Remitted Amount'] || '0'),
                        codCharges: parseFloat(row['COD Charges'] || '0'),
                        shippingCharges: parseFloat(row['Shipping Charges'] || '0'),
                        freightTotalAmount: parseFloat(row['Freight Total Amount'] || '0'),
                        pickupPincode: row['Pickup Pincode'] || '',
                        uploadDate: serverTimestamp(),
                        uploadId: metaDocRef.id
                      });
                    }
                  }
                  
                  await nextBatch.commit();
                  processedCount += chunk.length;
                  const updatedProgress = Math.min(95, 60 + Math.round((processedCount / validRows.length) * 35));
                  setProgress(updatedProgress);
                  console.log(`Successfully uploaded batch ${Math.floor(i/chunkSize) + 2} with ${chunk.length} records`);
                }
                
                console.log("All data successfully uploaded to Firestore");
                setProgress(100);
                setUploadSuccess(true);
                setIsLoading(false);
                onUploadComplete(true, file.name);
                toast.success(`${file.name} uploaded successfully!`);
              } catch (err) {
                console.error('Error storing CSV data:', err);
                setUploadError('Failed to process data. Please try again.');
                setIsLoading(false);
                onUploadComplete(false);
                toast.error('Failed to process data. Please try again.');
              }
            },
            error: function(err) {
              console.error('Error parsing CSV:', err);
              setUploadError('Failed to parse CSV. Please check file format.');
              setIsLoading(false);
              onUploadComplete(false);
              toast.error('Failed to parse CSV. Please check file format.');
            }
          });
        }
      );
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError('Upload failed. Please try again.');
      setIsLoading(false);
      onUploadComplete(false);
      toast.error('Upload failed. Please try again.');
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
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Uploading...</span>
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
              {isLoading ? `Uploading (${progress}%)` : 'Upload File'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingCSVUpload;
