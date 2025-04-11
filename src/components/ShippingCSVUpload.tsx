import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { storage, db, auth } from "@/services/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
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
          if (results.data && results.data.length > 0 && results.data[0]) {
            // Fix: Ensure results.data[0] is an object before spreading
            const firstRow = results.data[0];
            if (typeof firstRow === 'object' && firstRow !== null) {
              const headers = Object.keys(firstRow);
              if (onHeadersDetected) {
                onHeadersDetected(headers);
              }
            }
          }
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
    if (!file || !auth.currentUser) return;
    
    onUploadStart();
    setIsLoading(true);
    setUploadSuccess(false);
    setUploadError('');
    
    try {
      // Upload file to Firebase Storage
      const storageRef = ref(storage, `shipping_data/${auth.currentUser.uid}/${Date.now()}-${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
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
          
          // Parse CSV data
          Papa.parse(file, {
            header: true,
            complete: async function(results) {
              try {
                // Add metadata to Firestore
                await addDoc(collection(db, 'users', auth.currentUser!.uid, 'shippingData_meta'), {
                  filename: file.name,
                  uploadDate: serverTimestamp(),
                  fileSize: file.size,
                  recordCount: results.data.length,
                  downloadURL
                });
                
                // Add each row as a document in Firestore
                const batch = results.data.slice(0, results.data.length - 1); // Remove last row if it's empty
                
                // Process data and add to Firestore
                for (const row of batch) {
                  // Fix: Ensure row is an object before spreading
                  if (row && typeof row === 'object') {
                    try {
                      await addDoc(
                        collection(db, 'users', auth.currentUser!.uid, 'shippingData'),
                        {
                          ...row,
                          // Convert date strings to Date objects
                          shipDate: row['Ship Date'] ? new Date(row['Ship Date']) : null,
                          uploadDate: serverTimestamp(),
                          // Parse numeric values
                          productQuantity: parseInt(row['Product Quantity'] || '0'),
                          orderTotal: parseFloat(row['Order Total'] || '0'),
                          discountValue: parseFloat(row['Discount Value'] || '0'),
                          weight: parseFloat(row['Weight (KG)'] || '0'),
                          chargedWeight: parseFloat(row['Charged Weight'] || '0'),
                          codPayableAmount: parseFloat(row['COD Payble Amount'] || '0'),
                          remittedAmount: parseFloat(row['Remitted Amount'] || '0'),
                          codCharges: parseFloat(row['COD Charges'] || '0'),
                          shippingCharges: parseFloat(row['Shipping Charges'] || '0'),
                          freightTotalAmount: parseFloat(row['Freight Total Amount'] || '0')
                        }
                      );
                    } catch (e) {
                      console.error('Error adding document:', e);
                    }
                  }
                }
                
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
            <Progress value={progress} className="h-2" />
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
              {isLoading ? 'Uploading...' : 'Upload File'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingCSVUpload;
