
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Check, Download, File, FileText, Upload as UploadIcon, Trash2,
  X, AlertTriangle, History, Table as TableIcon, RefreshCcw, RotateCcw
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  parseCSVData, 
  saveAdData, 
  generateCSVTemplate, 
  getUserUploads,
  downloadHistoricalData,
  deleteUpload,
  validateCSVHeaders,
  UploadRecord,
  AdData,
  csvHeaders
} from "@/services/data";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import EmptyState from "@/components/EmptyState";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow, format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const UploadPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState<string>("");
  const [isValidated, setIsValidated] = useState(false);
  const [showUploadingScreen, setShowUploadingScreen] = useState(false);
  const [csvData, setCsvData] = useState<string | null>(null);
  const [uploadOption, setUploadOption] = useState<"append" | "overwrite">("append");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [headerMismatch, setHeaderMismatch] = useState<{original: string; required: string}[]>([]);
  const [columnMappingOpen, setColumnMappingOpen] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [uploadHistory, setUploadHistory] = useState<UploadRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUpload, setSelectedUpload] = useState<UploadRecord | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<"csv" | "json">("csv");
  const [downloadInProgress, setDownloadInProgress] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<AdData[] | null>(null);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("upload");
  
  // Fetch upload history when component mounts
  useEffect(() => {
    if (currentUser) {
      fetchUploadHistory();
    }
  }, [currentUser]);

  // Reset upload progress when upload is finished
  useEffect(() => {
    if (uploadProgress === 100) {
      const timer = setTimeout(() => {
        setShowUploadingScreen(false);
        setUploadProgress(0);
        setUploadStep("");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [uploadProgress]);
  
  const fetchUploadHistory = async () => {
    if (!currentUser) return;
    
    setLoadingHistory(true);
    try {
      const history = await getUserUploads(currentUser.uid);
      setUploadHistory(history);
    } catch (error) {
      console.error("Error fetching upload history:", error);
      toast.error("Failed to load upload history");
    } finally {
      setLoadingHistory(false);
    }
  };
  
  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = "adpulse_template.csv";
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Template downloaded successfully");
  };
  
  const handleHistoricalDownload = async () => {
    if (!selectedUpload || !currentUser) return;
    
    setDownloadInProgress(true);
    setDownloadProgress(0);
    
    try {
      // Simulate progress updates (in a real app, this would come from the actual download)
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          const newProgress = Math.min(prev + 10, 90);
          return newProgress;
        });
      }, 200);
      
      // Perform the actual download
      await downloadHistoricalData(
        currentUser.uid, 
        selectedUpload.id, 
        downloadFormat
      );
      
      clearInterval(progressInterval);
      setDownloadProgress(100);
      
      setTimeout(() => {
        setDownloadDialogOpen(false);
        setDownloadInProgress(false);
        setDownloadProgress(0);
      }, 500);
      
      toast.success(`Data downloaded successfully as ${downloadFormat.toUpperCase()}`);
    } catch (error) {
      console.error("Error downloading data:", error);
      toast.error("Failed to download data: " + (error instanceof Error ? error.message : "Unknown error"));
      setDownloadInProgress(false);
      setDownloadProgress(0);
    }
  };
  
  const handleDeleteUpload = async () => {
    if (!selectedUpload || !currentUser) return;
    
    setDeleteInProgress(true);
    
    try {
      const success = await deleteUpload(currentUser.uid, selectedUpload.id);
      
      if (success) {
        // Refresh upload history
        fetchUploadHistory();
        toast.success("Upload deleted successfully");
      } else {
        toast.error("Failed to delete upload");
      }
    } catch (error) {
      console.error("Error deleting upload:", error);
      toast.error("Failed to delete upload: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setDeleteInProgress(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "text/csv" || droppedFile.name.endsWith(".csv")) {
        setFile(droppedFile);
        setIsValidated(false);
        resetValidationState();
      } else {
        toast.error("Please upload a CSV file");
      }
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setIsValidated(false);
      resetValidationState();
    }
  };
  
  const resetValidationState = () => {
    setValidationErrors([]);
    setValidationWarnings([]);
    setHeaderMismatch([]);
    setColumnMapping({});
    setParsedPreview(null);
    setAvailableColumns([]);
  };
  
  const validateFile = async () => {
    if (!file) {
      toast.error("Please select a file to validate");
      return;
    }
    
    setIsValidating(true);
    resetValidationState();
    
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const csvText = e.target?.result as string;
          setCsvData(csvText);
          
          // Extract available columns from CSV
          const lines = csvText.split('\n');
          if (lines.length > 0) {
            const headers = lines[0].split(',').map(h => h.trim());
            setAvailableColumns(headers);
          }
          
          // Validate CSV headers first
          const headerValidation = validateCSVHeaders(csvText);
          
          if (headerValidation.missingHeaders.length > 0 || headerValidation.unknownHeaders.length > 0) {
            // Handle header mismatches - prepare column mapping options
            const mismatches = [...headerValidation.missingHeaders.map(header => ({
              required: header,
              original: ''
            }))];
            
            if (mismatches.length > 0) {
              setHeaderMismatch(mismatches);
              setColumnMappingOpen(true);
              setIsValidating(false);
              return;
            }
          }
          
          // If headers are valid or we've applied a mapping, attempt to parse data
          try {
            const parsedData = parseCSVData(csvText, columnMapping);
            setParsedPreview(parsedData.slice(0, 5));
            
            // Check for potential warnings
            const warnings = [];
            if (parsedData.some(row => row.amountSpent === 0)) {
              warnings.push("Some rows have 0 amount spent.");
            }
            if (parsedData.some(row => row.impressions < 100)) {
              warnings.push("Some campaigns have very low impressions (<100).");
            }
            
            setValidationWarnings(warnings);
            setIsValidated(true);
            toast.success("File is valid and ready to upload");
          } catch (parseError) {
            console.error("Parse error:", parseError);
            setValidationErrors([parseError instanceof Error ? parseError.message : "Invalid data format"]);
            toast.error("Error parsing CSV data");
          }
        } catch (error) {
          console.error("Validation error:", error);
          setValidationErrors([error instanceof Error ? error.message : "Invalid CSV format"]);
          toast.error(error instanceof Error ? error.message : "Invalid CSV format");
        } finally {
          setIsValidating(false);
        }
      };
      
      reader.onerror = () => {
        setValidationErrors(["Error reading file"]);
        toast.error("Error reading file");
        setIsValidating(false);
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error("File validation error:", error);
      setValidationErrors([error instanceof Error ? error.message : "Error validating file"]);
      toast.error("Error validating file");
      setIsValidating(false);
    }
  };
  
  const applyColumnMapping = () => {
    if (!csvData) return;
    
    const newMapping: Record<string, string> = {};
    headerMismatch.forEach(mismatch => {
      if (mismatch.original) {
        newMapping[mismatch.original] = mismatch.required;
      }
    });
    
    setColumnMapping(newMapping);
    setColumnMappingOpen(false);
    
    // Re-validate the file with the new column mapping
    validateWithMapping(csvData, newMapping);
  };
  
  const validateWithMapping = (csvText: string, mapping: Record<string, string>) => {
    setIsValidating(true);
    
    try {
      const parsedData = parseCSVData(csvText, mapping);
      setParsedPreview(parsedData.slice(0, 5));
      
      // Check for potential warnings
      const warnings = [];
      if (parsedData.some(row => row.amountSpent === 0)) {
        warnings.push("Some rows have 0 amount spent.");
      }
      if (parsedData.some(row => row.impressions < 100)) {
        warnings.push("Some campaigns have very low impressions (<100).");
      }
      
      setValidationWarnings(warnings);
      setIsValidated(true);
      toast.success("File is valid with column mapping applied");
    } catch (error) {
      console.error("Validation error with mapping:", error);
      setValidationErrors([error instanceof Error ? error.message : "Invalid data format even with mapping"]);
      toast.error("File is still invalid even with column mapping");
    } finally {
      setIsValidating(false);
    }
  };
  
  const uploadFile = async () => {
    if (!currentUser || !file || !csvData || !isValidated) {
      toast.error("Please validate the file first");
      return;
    }
    
    setIsUploading(true);
    setShowUploadingScreen(true);
    setUploadProgress(0);
    setUploadStep("Parsing data...");
    
    try {
      // Step 1: Parse the data
      setUploadProgress(10);
      const parsedData = parseCSVData(csvData, columnMapping);
      
      // Step 2: Processing data
      setUploadProgress(30);
      setUploadStep("Processing data...");
      await new Promise(r => setTimeout(r, 500)); // Simulate processing time
      
      // Step 3: Uploading to database
      setUploadProgress(50);
      setUploadStep("Uploading to database...");
      
      // Save data to Firestore
      await saveAdData(
        parsedData, 
        currentUser.uid, 
        uploadOption === "overwrite",
        file.name
      );
      
      // Step 4: Finalizing
      setUploadProgress(80);
      setUploadStep("Finalizing...");
      await new Promise(r => setTimeout(r, 500)); // Simulate finalizing time
      
      // Step 5: Complete
      setUploadProgress(100);
      setUploadStep("Upload complete!");
      
      // Reset state
      setTimeout(() => {
        setFile(null);
        setCsvData(null);
        setIsValidated(false);
        resetValidationState();
        
        // Refresh upload history
        fetchUploadHistory();
        
        toast.success("Data uploaded successfully!");
        
        // Navigate to dashboard
        navigate("/");
      }, 1000);
      
    } catch (error) {
      console.error("Error uploading data:", error);
      toast.error("Failed to upload data: " + (error instanceof Error ? error.message : "Unknown error"));
      setIsUploading(false);
      setShowUploadingScreen(false);
    }
  };

  const goToDashboard = () => {
    navigate("/");
  };

  const handleUploadHistoryItemClick = (upload: UploadRecord) => {
    if (upload.dateRange && upload.dateRange.start && upload.dateRange.end) {
      navigate('/', { 
        state: { 
          dateRange: {
            from: new Date(upload.dateRange.start),
            to: new Date(upload.dateRange.end)
          }
        }
      });
    } else {
      navigate('/');
    }
  };
  
  if (showUploadingScreen) {
    return (
      <div className="max-w-4xl mx-auto w-full h-[80vh] flex flex-col items-center justify-center font-poppins">
        <div className="w-full max-w-2xl p-6 text-center">
          <div className="animate-pulse mb-8">
            <div className="w-16 h-16 mx-auto border-4 border-adpulse-green border-t-transparent rounded-full animate-spin"></div>
          </div>
          
          <h2 className="text-2xl font-semibold mb-4 font-poppins">Uploading data...</h2>
          <p className="text-white/60 mb-8 font-poppins">Please wait while your data is being processed and uploaded.</p>
          
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-poppins">{uploadStep}</span>
              <span className="font-poppins">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
          
          <p className="text-sm text-white/60 font-poppins">Uploading to database...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto w-full font-poppins">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold font-poppins">Upload Meta Ads Data</h2>
          <p className="text-white/60 font-poppins">Import your advertising data from Facebook Ads Manager</p>
        </div>
        
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="bg-[#0B2537] border-white/20 font-poppins"
            onClick={handleDownloadTemplate}
          >
            <Download className="h-4 w-4 mr-2" />
            Download CSV Template
          </Button>
          
          <Button 
            className="bg-adpulse-green text-[#021627] hover:bg-adpulse-green/90 font-poppins"
            onClick={goToDashboard}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Go to Dashboard & Refresh Data
          </Button>
        </div>
      </div>
      
      <Tabs 
        defaultValue="upload" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger 
            value="upload" 
            className="font-poppins text-base py-3 data-[state=active]:bg-[#0B2537] data-[state=active]:text-white data-[state=active]:border-adpulse-green data-[state=active]:border-b-2 rounded-none"
          >
            Upload CSV
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="font-poppins text-base py-3 data-[state=active]:bg-[#0B2537] data-[state=active]:text-white data-[state=active]:border-adpulse-green data-[state=active]:border-b-2 rounded-none"
          >
            Upload History
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="mt-0">
          <Card className="bg-[#0B2537] border-white/10">
            <CardContent className="pt-6">
              <div 
                className={`border-2 border-dashed rounded-lg p-10 text-center ${
                  isDragging 
                    ? "border-adpulse-green bg-adpulse-green/5" 
                    : "border-white/20 hover:border-white/30"
                } transition-colors cursor-pointer`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="p-3 rounded-full bg-[#021627]">
                    <FileText className="h-10 w-10 text-adpulse-green/80" />
                  </div>
                  <h3 className="text-lg font-medium font-poppins">Upload CSV File</h3>
                  <p className="text-white/60 max-w-md text-sm font-poppins">
                    Drag and drop or click to browse
                  </p>
                  <Button variant="outline" size="sm" className="mt-2 bg-transparent border-white/20 font-poppins">
                    Choose File
                  </Button>
                </div>
              </div>
              
              {file && (
                <div className="mt-6">
                  <div className="flex items-center p-3 border border-white/10 rounded-lg bg-[#021627]">
                    <File className="h-6 w-6 text-adpulse-green/80 mr-3" />
                    <div className="flex-1 truncate">
                      <p className="font-medium truncate font-poppins">{file.name}</p>
                      <p className="text-xs text-white/60 font-poppins">{Math.round(file.size / 1024)} KB</p>
                    </div>
                    {isValidated ? (
                      <div className="flex items-center text-adpulse-green">
                        <Check className="h-5 w-5 mr-1" />
                        <span className="text-sm font-poppins">Valid</span>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          validateFile();
                        }}
                        disabled={isValidating}
                        className="bg-transparent border-white/20 font-poppins"
                      >
                        {isValidating ? "Validating..." : "Validate File"}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setIsValidated(false);
                        resetValidationState();
                      }}
                      className="ml-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              {validationErrors.length > 0 && (
                <div className="mt-6">
                  <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <AlertTitle className="font-poppins">Validation Errors</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-5 text-sm space-y-1 mt-1 font-poppins">
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              
              {validationWarnings.length > 0 && (
                <div className="mt-6">
                  <Alert className="bg-yellow-500/10 border-yellow-500/20">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <AlertTitle className="font-poppins">Warnings</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-5 text-sm space-y-1 mt-1 font-poppins">
                        {validationWarnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              
              {parsedPreview && parsedPreview.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-2 font-poppins">Data Preview</h4>
                  <div className="border border-white/10 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-[#021627]">
                        <TableRow>
                          <TableHead className="font-poppins">Date</TableHead>
                          <TableHead className="font-poppins">Campaign</TableHead>
                          <TableHead className="font-poppins">Ad Set</TableHead>
                          <TableHead className="text-right font-poppins">Spent</TableHead>
                          <TableHead className="text-right font-poppins">Results</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedPreview.map((row, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-poppins">{row.date}</TableCell>
                            <TableCell className="max-w-[150px] truncate font-poppins">{row.campaignName}</TableCell>
                            <TableCell className="max-w-[150px] truncate font-poppins">{row.adSetName}</TableCell>
                            <TableCell className="text-right font-poppins">₹{row.amountSpent.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-poppins">{row.results}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              
              {isValidated && (
                <div className="mt-6 space-y-4">
                  <div className="bg-adpulse-green/10 border border-adpulse-green/20 rounded-lg p-3 flex items-center">
                    <Check className="h-5 w-5 text-adpulse-green mr-2" />
                    <p className="text-sm font-poppins">File is valid and ready to upload</p>
                  </div>
                  
                  <div className="p-4 border border-white/10 rounded-lg bg-[#021627]">
                    <h4 className="text-sm font-medium mb-3 font-poppins">Upload Options</h4>
                    <RadioGroup 
                      value={uploadOption} 
                      onValueChange={(value) => setUploadOption(value as "append" | "overwrite")}
                      className="space-y-3"
                    >
                      <div className="flex items-start space-x-2">
                        <RadioGroupItem value="append" id="append" />
                        <div className="grid gap-1">
                          <Label htmlFor="append" className="font-medium font-poppins">
                            Append data (add to existing data)
                          </Label>
                          <p className="text-xs text-white/60 font-poppins">
                            Add this data to your existing dataset. Duplicate entries will be skipped.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-2">
                        <RadioGroupItem value="overwrite" id="overwrite" />
                        <div className="grid gap-1">
                          <Label htmlFor="overwrite" className="font-medium font-poppins">
                            Overwrite data (replace existing data for matching dates)
                          </Label>
                          <p className="text-xs text-white/60 font-poppins">
                            Replace existing data for the same date, campaign, and ad set combinations.
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      onClick={uploadFile} 
                      disabled={isUploading}
                      className="bg-adpulse-green text-[#021627] hover:bg-adpulse-green/90 font-poppins"
                    >
                      <UploadIcon className="h-4 w-4 mr-2" />
                      {isUploading ? "Uploading..." : "Upload File"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="mt-0">
          <Card className="bg-[#0B2537] border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <h3 className="text-xl font-semibold font-poppins">Upload History</h3>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchUploadHistory}
                disabled={loadingHistory}
                className="bg-transparent border-white/20 font-poppins"
              >
                <RefreshCcw className={`h-4 w-4 mr-2 ${loadingHistory ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="py-10 flex justify-center">
                  <div className="h-8 w-8 rounded-full border-4 border-adpulse-green/20 border-t-adpulse-green animate-spin"></div>
                </div>
              ) : uploadHistory.length === 0 ? (
                <EmptyState
                  title="No upload history"
                  description="You haven't uploaded any data yet. Upload a CSV file to get started."
                  icon={<UploadIcon className="h-8 w-8 text-white/30" />}
                  className="py-10 h-auto"
                />
              ) : (
                <div className="space-y-4">
                  <div className="border border-white/10 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-[#021627]">
                        <TableRow>
                          <TableHead className="font-poppins">Date</TableHead>
                          <TableHead className="font-poppins">File Name</TableHead>
                          <TableHead className="font-poppins">Data Range</TableHead>
                          <TableHead className="font-poppins text-center">Rows</TableHead>
                          <TableHead className="font-poppins text-center">Status</TableHead>
                          <TableHead className="font-poppins text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uploadHistory.map((upload) => (
                          <TableRow 
                            key={upload.id} 
                            className="cursor-pointer hover:bg-white/5"
                            onClick={() => handleUploadHistoryItemClick(upload)}
                          >
                            <TableCell>
                              <div className="font-poppins">
                                {format(new Date(upload.uploadedAt), "yyyy-MM-dd")}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-adpulse-green" />
                                <span className="font-poppins">{upload.fileName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-poppins">
                              {upload.dateRange && upload.dateRange.start && upload.dateRange.end ? (
                                `${upload.dateRange.start} - ${upload.dateRange.end}`
                              ) : (
                                <span className="text-white/40">Invalid date - Invalid date</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-poppins">
                              {upload.recordCount} rows
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-600/20 text-green-500 font-poppins">
                                success
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => {
                                    setSelectedUpload(upload);
                                    setDownloadDialogOpen(true);
                                  }}
                                  className="h-8 w-8 text-white/70 hover:text-white"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => {
                                    setSelectedUpload(upload);
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="h-8 w-8 text-red-400 hover:text-red-300"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Column Mapping Dialog */}
      <Dialog open={columnMappingOpen} onOpenChange={setColumnMappingOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-poppins">Map Columns</DialogTitle>
            <DialogDescription className="font-poppins">
              Some required columns are missing or have different names. Please map your CSV columns to the required ones.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[400px] overflow-y-auto">
            <div className="space-y-4 py-4">
              {headerMismatch.map((mismatch, index) => (
                <div key={index} className="grid grid-cols-2 gap-4 items-center">
                  <div>
                    <Label className="mb-1 block font-poppins">Required Column</Label>
                    <div className="p-2 bg-slate-800 rounded border border-white/10 font-poppins">
                      {mismatch.required}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-1 block font-poppins">Map From</Label>
                    <Select
                      value={mismatch.original || "none"}
                      onValueChange={(value) => {
                        const updated = [...headerMismatch];
                        updated[index].original = value === "none" ? "" : value;
                        setHeaderMismatch(updated);
                      }}
                    >
                      <SelectTrigger className="w-full font-poppins">
                        <SelectValue placeholder="Select a column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="font-poppins">None</SelectItem>
                        {availableColumns.map((column, idx) => (
                          <SelectItem key={idx} value={column} className="font-poppins">{column}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <Button 
              variant="outline" 
              onClick={() => setColumnMappingOpen(false)}
              className="sm:w-auto w-full font-poppins"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={applyColumnMapping}
              className="sm:w-auto w-full font-poppins"
            >
              <Check className="mr-2 h-4 w-4" />
              Apply Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Download Dialog */}
      <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-poppins">Download Data</DialogTitle>
            <DialogDescription className="font-poppins">
              Download the data from your previous upload.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="mb-2 block font-poppins">File Details</Label>
              <div className="rounded-lg bg-[#021627] p-3 border border-white/10">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-white/60 font-poppins">File Name:</div>
                  <div className="font-poppins">{selectedUpload?.fileName || "Unknown"}</div>
                  <div className="text-white/60 font-poppins">Uploaded:</div>
                  <div className="font-poppins">
                    {selectedUpload
                      ? format(new Date(selectedUpload.uploadedAt), "MMM d, yyyy h:mm a")
                      : "Unknown"}
                  </div>
                  <div className="text-white/60 font-poppins">Record Count:</div>
                  <div className="font-poppins">{selectedUpload?.recordCount || 0}</div>
                  <div className="text-white/60 font-poppins">Date Range:</div>
                  <div className="font-poppins">
                    {selectedUpload?.dateRange && selectedUpload.dateRange.start && selectedUpload.dateRange.end
                      ? `${selectedUpload.dateRange.start} to ${selectedUpload.dateRange.end}`
                      : "Unknown"}
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <Label className="mb-2 block font-poppins">Download Format</Label>
              <RadioGroup 
                value={downloadFormat} 
                onValueChange={(value) => setDownloadFormat(value as "csv" | "json")}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv" className="font-poppins">CSV</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="json" id="json" />
                  <Label htmlFor="json" className="font-poppins">JSON</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          
          {downloadInProgress && (
            <div className="space-y-2">
              <Progress value={downloadProgress} className="h-2" />
              <p className="text-xs text-white/60 text-center font-poppins">
                {downloadProgress === 100 ? "Download complete!" : "Preparing download..."}
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDownloadDialogOpen(false)}
              disabled={downloadInProgress}
              className="mr-2 font-poppins"
            >
              Cancel
            </Button>
            <Button
              onClick={handleHistoricalDownload}
              disabled={downloadInProgress}
              className="bg-adpulse-green text-[#021627] hover:bg-adpulse-green/90 font-poppins"
            >
              {downloadInProgress ? (
                <>
                  <div className="h-4 w-4 border-2 border-[#021627] border-r-transparent rounded-full animate-spin mr-2"></div>
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-poppins">
              Delete Upload
            </AlertDialogTitle>
            <AlertDialogDescription className="font-poppins">
              Are you sure you want to delete this upload and all its associated data? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 mb-6 rounded-lg bg-[#0B2537] p-3 border border-white/10">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-white/60 font-poppins">File Name:</div>
              <div className="font-poppins">{selectedUpload?.fileName || "Unknown"}</div>
              <div className="text-white/60 font-poppins">Records:</div>
              <div className="font-poppins">{selectedUpload?.recordCount || 0}</div>
              <div className="text-white/60 font-poppins">Date Range:</div>
              <div className="font-poppins">
                {selectedUpload?.dateRange && selectedUpload.dateRange.start && selectedUpload.dateRange.end
                  ? `${selectedUpload.dateRange.start} to ${selectedUpload.dateRange.end}`
                  : "Unknown"}
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-poppins">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDeleteUpload();
              }}
              className="bg-red-500 hover:bg-red-600 text-white font-poppins"
              disabled={deleteInProgress}
            >
              {deleteInProgress ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-r-transparent rounded-full animate-spin mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Upload
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UploadPage;
