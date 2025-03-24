import React, { useState, useRef, useCallback, ChangeEvent } from "react";
import { useDropzone } from "react-dropzone";
import { useAuth } from "@/contexts/AuthContext";
import { processAndSaveCSVData } from "@/services/data";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UploadCloud, X, AlertCircle, Check, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";

interface CSVUploadProps {
  onUploadStart?: () => void;
  onUploadComplete?: (success: boolean, filename?: string, dateRange?: { start: string; end: string }) => void;
  onValidate?: (csvData: string) => boolean;
  onUploadSuccess?: () => void;
}

interface ColumnMapping {
  [key: string]: string;
}

interface MappingFormValues {
  mappings: ColumnMapping;
}

const REQUIRED_COLUMNS = [
  "Date",
  "Campaign name",
  "Ad set name",
  "Objective",
  "Impressions",
  "Link clicks",
  "CTR (All)",
  "CPC (cost per link click)",
  "Amount spent (INR)",
  "Results",
  "Result Type",
  "Cost per result",
  "Purchases",
  "Purchases conversion value",
  "Purchase ROAS",
];

// Common alternate column names for mapping suggestions
const COLUMN_ALTERNATIVES: Record<string, string[]> = {
  "Date": ["Day", "Date Time", "Time"],
  "Campaign name": ["Campaign Name", "Campaign", "Campaign ID", "Campaign Title"],
  "Ad set name": ["Ad Set Name", "Ad Set", "AdSet", "Adset Name", "Ad Group"],
  "Objective": ["Campaign Objective", "Goal", "Conversion Objective"],
  "Impressions": ["Impr.", "Total Impressions", "Views", "Ad Impressions"],
  "Link clicks": ["Clicks", "Total Clicks", "Outbound Clicks", "Link Clicks All"],
  "CTR (All)": ["CTR", "Click Through Rate", "Click Rate", "CTR %"],
  "CPC (cost per link click)": ["CPC", "Cost per Click", "Avg CPC", "Cost per Link Click"],
  "Amount spent (INR)": ["Spend", "Ad Spend", "Cost", "Total Spend", "Amount Spent", "Budget Spent"],
  "Results": ["Conversions", "Total Results", "Actions", "Conversion Events"],
  "Result Type": ["Conversion Type", "Action Type", "Event Type"],
  "Cost per result": ["CPR", "Cost per Conversion", "CPA", "Cost per Action"],
  "Purchases": ["Purchase", "Total Purchases", "Order Count", "Sales", "Orders"],
  "Purchases conversion value": ["Conversion Value", "Revenue", "Sales Value", "Total Revenue"],
  "Purchase ROAS": ["ROAS", "Return on Ad Spend", "ROI", "Return"]
};

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
  const [csvData, setCsvData] = useState<string>("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const form = useForm<MappingFormValues>({
    defaultValues: {
      mappings: {}
    }
  });
  
  // Reset upload state
  const resetUpload = () => {
    // Clear the interval if it exists
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    setFile(null);
    setUploading(false);
    setUploadProgress(0);
    setError(null);
    setCsvData("");
    setCsvHeaders([]);
    setParsedData([]);
    setMissingColumns([]);
    setColumnMapping({});
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
    
    // Read the file to parse headers
    readCSVFile(selectedFile);
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
    
    // Read the file to parse headers
    readCSVFile(selectedFile);
  };
  
  // Read and parse CSV file to extract headers
  const readCSVFile = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const csv = event.target?.result as string;
      setCsvData(csv);
      
      // Parse CSV using Papa Parse
      Papa.parse(csv, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          setCsvHeaders(headers);
          setParsedData(results.data as Record<string, string>[]);
          
          // Check for missing columns
          const missing = REQUIRED_COLUMNS.filter(
            (col) => !headers.includes(col)
          );
          
          setMissingColumns(missing);
          
          // If missing columns, prepare initial column mapping with suggestions
          if (missing.length > 0) {
            const initialMapping: ColumnMapping = {};
            
            missing.forEach(requiredCol => {
              // Try to find a match among alternatives
              const alternatives = COLUMN_ALTERNATIVES[requiredCol] || [];
              const foundMatch = headers.find(header => 
                alternatives.includes(header)
              );
              
              if (foundMatch) {
                initialMapping[requiredCol] = foundMatch;
              }
            });
            
            setColumnMapping(initialMapping);
            form.setValue('mappings', initialMapping);
            setShowMappingDialog(true);
          }
        },
        error: (error) => {
          setError(`Error parsing CSV: ${error.message}`);
        }
      });
    };
    
    reader.onerror = () => {
      setError("Error reading the file");
    };
    
    reader.readAsText(file);
  };
  
  // Handle column mapping submission
  const handleMappingSubmit = (values: MappingFormValues) => {
    setColumnMapping(values.mappings);
    setShowMappingDialog(false);
    // Proceed with upload after mapping is set
    handleUploadWithMapping();
  };
  
  // Process and upload CSV file with column mapping
  const handleUploadWithMapping = async () => {
    if (!file || !currentUser || !csvData) return;
    
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    
    if (onUploadStart) {
      onUploadStart();
    }
    
    try {
      // Clear any existing interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      
      // Simulate upload progress with a properly tracked interval
      progressIntervalRef.current = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 300);
      
      // Parse CSV with column mapping
      const parsedResult = Papa.parse<Record<string, string>>(csvData, {
        header: true,
        skipEmptyLines: true
      });
      
      if (parsedResult.errors.length > 0) {
        throw new Error(`CSV parsing error: ${parsedResult.errors[0].message}`);
      }
      
      // Normalize the data with column mappings
      const normalizedData = parsedResult.data.map(row => {
        const normalizedRow: Record<string, string> = {};
        
        // Copy over directly mapped columns
        REQUIRED_COLUMNS.forEach(requiredCol => {
          if (row[requiredCol]) {
            normalizedRow[requiredCol] = row[requiredCol];
          } else if (columnMapping[requiredCol]) {
            // Use mapped column if original not found
            normalizedRow[requiredCol] = row[columnMapping[requiredCol]] || '';
          } else {
            // If no mapping, set empty
            normalizedRow[requiredCol] = '';
          }
        });
        
        return normalizedRow;
      });
      
      // Get date range from normalized data
      let minDate = '';
      let maxDate = '';
      
      normalizedData.forEach(row => {
        const date = row['Date'];
        if (date) {
          if (!minDate || date < minDate) minDate = date;
          if (!maxDate || date > maxDate) maxDate = date;
        }
      });
      
      // Make sure we have a valid column mapping object (not undefined)
      const mappingToSave = Object.keys(columnMapping).length > 0 ? columnMapping : null;
      
      // Process and save data with the column mapping
      const result = await processAndSaveCSVData(
        currentUser.uid,
        file.name,
        normalizedData,
        mappingToSave
      );
      
      // Clean up interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
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
      // Clean up interval in case of error
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      console.error("Error processing CSV:", error);
      setError(`Error processing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  
  // Process upload when mapping is not needed
  const handleUpload = () => {
    if (missingColumns.length > 0) {
      setShowMappingDialog(true);
    } else {
      handleUploadWithMapping();
    }
  };
  
  // Get suggested headers for a column
  const getSuggestedOptions = (columnName: string) => {
    const alternatives = COLUMN_ALTERNATIVES[columnName] || [];
    return csvHeaders.filter(header => 
      alternatives.includes(header) || header.toLowerCase().includes(columnName.toLowerCase())
    );
  };
  
  // Manual file input click trigger
  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  return (
    <>
      <Card className="border-dashed border-2 border-gray-300/20">
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center p-6 text-center rounded-lg cursor-pointer ${
              isDragActive ? "bg-white/5" : "hover:bg-white/5"
            } transition-colors`}
          >
            <input 
              {...getInputProps()} 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".csv"
            />
            
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
                    <FileText className="h-5 w-5 text-adpulse-green" />
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
                <Button 
                  variant="outline" 
                  className="border-white/20"
                  onClick={triggerFileSelect}
                >
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
      
      {/* Column Mapping Dialog */}
      <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Map CSV Columns</DialogTitle>
            <DialogDescription>
              Some required columns are missing or have different names. Please map them to continue.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleMappingSubmit)}>
              <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Required Column</TableHead>
                      <TableHead>Map To</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {missingColumns.map((column) => (
                      <TableRow key={column}>
                        <TableCell className="font-medium">{column}</TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`mappings.${column}`}
                            render={({ field }) => (
                              <FormItem>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a column" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {/* Prioritize suggested columns */}
                                    {getSuggestedOptions(column).length > 0 && (
                                      <>
                                        <p className="px-2 py-1 text-xs font-bold">Suggested</p>
                                        {getSuggestedOptions(column).map((header) => (
                                          <SelectItem key={`suggested-${header}`} value={header}>
                                            {header}
                                          </SelectItem>
                                        ))}
                                        <p className="px-2 py-1 text-xs font-bold">All Columns</p>
                                      </>
                                    )}
                                    
                                    {csvHeaders.map((header) => (
                                      <SelectItem key={header} value={header}>
                                        {header}
                                      </SelectItem>
                                    ))}
                                    
                                    {/* Option to ignore */}
                                    <SelectItem key="ignore" value="ignore">
                                      Ignore this column
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  {column === "Amount spent (INR)" && "Choose the column containing spend data"}
                                  {column === "Purchases conversion value" && "Choose the column with revenue data"}
                                  {column === "Purchase ROAS" && "Choose the column with ROAS or ROI data"}
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowMappingDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Confirm & Upload
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CSVUpload;
