
import React, { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  validateShopifyCSVHeaders, 
  processAndSaveShopifyCSVData 
} from "@/services/shopifyData";

interface ShopifyCSVUploadProps {
  onUploadStart?: () => void;
  onUploadComplete?: (success: boolean, filename?: string, dateRange?: { start: string; end: string }) => void;
  onUploadSuccess?: () => void;
}

const ShopifyCSVUpload: React.FC<ShopifyCSVUploadProps> = ({
  onUploadStart,
  onUploadComplete,
  onUploadSuccess
}) => {
  const { currentUser } = useAuth();
  const [uploadStatus, setUploadStatus] = useState<"idle" | "reading" | "validating" | "mapping" | "uploading" | "error" | "success">("idle");
  const [progress, setProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<Record<string, string>[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [showMappingDialog, setShowMappingDialog] = useState<boolean>(false);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [missingHeaders, setMissingHeaders] = useState<string[]>([]);
  
  const handleDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }
    
    try {
      if (onUploadStart) {
        onUploadStart();
      }
      
      setUploadStatus("reading");
      setProgress(10);
      setErrorMessage(null);
      setFileName(file.name);
      
      const csvText = await file.text();
      
      setUploadStatus("validating");
      setProgress(30);
      
      // Validate CSV headers
      const { isValid, missingHeaders: missing } = validateShopifyCSVHeaders(csvText);
      
      if (!isValid && missing.length > 0) {
        setMissingHeaders(missing);
        setUploadStatus("mapping");
        setProgress(40);
        setShowMappingDialog(true);
        return;
      }
      
      // Parse CSV data
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          if (results.errors.length > 0) {
            setErrorMessage("Error parsing CSV: " + results.errors[0].message);
            setUploadStatus("error");
            if (onUploadComplete) {
              onUploadComplete(false);
            }
            return;
          }
          
          // Type assertion to ensure data is Record<string, string>[]
          const typedData = results.data as Record<string, string>[];
          setCsvData(typedData);
          
          try {
            setUploadStatus("uploading");
            setProgress(60);
            
            // Save data to Firestore
            if (currentUser) {
              const { success, uploadId } = await processAndSaveShopifyCSVData(
                currentUser.uid,
                file.name,
                typedData
              );
              
              if (success) {
                setUploadStatus("success");
                setProgress(100);
                toast.success("Upload successful");
                
                // Find date range in the data
                let minDate = "";
                let maxDate = "";
                typedData.forEach((row: Record<string, string>) => {
                  const createdAt = row["Created at"];
                  if (createdAt) {
                    if (!minDate || createdAt < minDate) minDate = createdAt;
                    if (!maxDate || createdAt > maxDate) maxDate = createdAt;
                  }
                });
                
                // Call onUploadComplete with success=true
                if (onUploadComplete) {
                  onUploadComplete(true, file.name, {
                    start: minDate,
                    end: maxDate
                  });
                }
                
                // Call onUploadSuccess to refresh history
                if (onUploadSuccess) {
                  onUploadSuccess();
                }
              } else {
                setUploadStatus("error");
                setErrorMessage("Error saving data to the database");
                if (onUploadComplete) {
                  onUploadComplete(false);
                }
              }
            } else {
              setUploadStatus("error");
              setErrorMessage("User not authenticated");
              if (onUploadComplete) {
                onUploadComplete(false);
              }
            }
          } catch (error) {
            console.error("Error uploading data:", error);
            setUploadStatus("error");
            setErrorMessage(
              error instanceof Error ? error.message : "Unknown error occurred"
            );
            if (onUploadComplete) {
              onUploadComplete(false);
            }
          }
        },
        error: (error) => {
          setUploadStatus("error");
          setErrorMessage("Error parsing CSV: " + error.message);
          if (onUploadComplete) {
            onUploadComplete(false);
          }
        }
      });
      
    } catch (error) {
      console.error("Error processing file:", error);
      setUploadStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
      if (onUploadComplete) {
        onUploadComplete(false);
      }
    }
  }, [currentUser, onUploadComplete, onUploadStart, onUploadSuccess]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
  });
  
  const handleMappingConfirm = async () => {
    if (!csvData || !currentUser) {
      setErrorMessage("No data to upload or user not authenticated");
      setUploadStatus("error");
      setShowMappingDialog(false);
      return;
    }
    
    try {
      setShowMappingDialog(false);
      setUploadStatus("uploading");
      setProgress(60);
      
      const { success, uploadId } = await processAndSaveShopifyCSVData(
        currentUser.uid,
        fileName,
        csvData,
        columnMapping
      );
      
      if (success) {
        setUploadStatus("success");
        setProgress(100);
        toast.success("Upload successful");
        
        // Find date range in the data
        let minDate = "";
        let maxDate = "";
        csvData.forEach((row: Record<string, string>) => {
          const createdAt = row["Created at"];
          if (createdAt) {
            if (!minDate || createdAt < minDate) minDate = createdAt;
            if (!maxDate || createdAt > maxDate) maxDate = createdAt;
          }
        });
        
        if (onUploadComplete) {
          onUploadComplete(true, fileName, {
            start: minDate,
            end: maxDate
          });
        }
        
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      } else {
        setUploadStatus("error");
        setErrorMessage("Error saving data to the database");
        if (onUploadComplete) {
          onUploadComplete(false);
        }
      }
    } catch (error) {
      console.error("Error uploading mapped data:", error);
      setUploadStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
      if (onUploadComplete) {
        onUploadComplete(false);
      }
    }
  };
  
  const handleMappingCancel = () => {
    setShowMappingDialog(false);
    setUploadStatus("idle");
    setProgress(0);
    setCsvData(null);
    setErrorMessage(null);
  };
  
  return (
    <>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover:border-adpulse-green/70 transition-colors ${
          isDragActive ? "border-adpulse-green bg-adpulse-green/5" : "border-white/20"
        } ${uploadStatus === "error" ? "border-red-500/50 bg-red-900/10" : ""}`}
      >
        <input {...getInputProps()} disabled={uploadStatus !== "idle" && uploadStatus !== "error"} />
        
        {uploadStatus === "idle" || uploadStatus === "error" ? (
          <div>
            <Upload className="mx-auto h-10 w-10 mb-3 text-adpulse-green" />
            <p className="text-sm mb-1">
              Drag & drop a Shopify orders CSV file here, or click to select
            </p>
            <p className="text-xs text-white/60">
              Upload your Shopify orders CSV export to see analytics
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <p className="font-medium mb-1">{fileName}</p>
              <Progress value={progress} className="h-1" />
            </div>
            <p className="text-sm">
              {uploadStatus === "reading" && "Reading file..."}
              {uploadStatus === "validating" && "Validating CSV format..."}
              {uploadStatus === "mapping" && "Mapping columns..."}
              {uploadStatus === "uploading" && "Uploading data..."}
              {uploadStatus === "success" && "Upload complete!"}
            </p>
          </div>
        )}
      </div>

      {errorMessage && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Mapping Dialog */}
      <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Column Mapping Required</DialogTitle>
            <DialogDescription>
              Some required columns are missing in your CSV. Please map your columns to the required fields.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p>
              The following columns are missing in your CSV file:
            </p>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Required Column</TableHead>
                    <TableHead>Map to Your Column</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missingHeaders.map((header) => (
                    <TableRow key={header}>
                      <TableCell className="font-medium">{header}</TableCell>
                      <TableCell>
                        <select
                          className="w-full p-2 bg-background border rounded"
                          onChange={(e) => {
                            const mapping = {...columnMapping};
                            mapping[header] = e.target.value;
                            setColumnMapping(mapping);
                          }}
                          value={columnMapping[header] || ""}
                        >
                          <option value="">-- Select a column --</option>
                          {csvData && csvData.length > 0 &&
                            Object.keys(csvData[0]).map((col) => (
                              <option key={col} value={col}>
                                {col}
                              </option>
                            ))}
                          <option value="__empty__">Leave empty</option>
                        </select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-sm text-muted-foreground">
              Map your columns to the required fields or select "Leave empty" to use default values.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleMappingCancel}>
              Cancel
            </Button>
            <Button onClick={handleMappingConfirm}>
              Continue Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ShopifyCSVUpload;
