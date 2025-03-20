import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Check, Download, File, FileText, Upload as UploadIcon, 
  X, AlertTriangle, History, Table as TableIcon 
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  parseCSVData, 
  saveAdData, 
  generateCSVTemplate, 
  getUserUploads,
  downloadHistoricalData,
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow, format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

const UploadPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
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
  const [selectedUpload, setSelectedUpload] = useState<UploadRecord | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<"csv" | "json">("csv");
  const [downloadInProgress, setDownloadInProgress] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [parsedPreview, setParsedPreview] = useState<AdData[] | null>(null);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  
  // Fetch upload history when component mounts
  useEffect(() => {
    if (currentUser) {
      fetchUploadHistory();
    }
  }, [currentUser]);
  
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
      toast.error("Failed to download data");
      setDownloadInProgress(false);
      setDownloadProgress(0);
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
          
          // Extract available columns from the file for mapping
          const lines = csvText.split('\n');
          if (lines.length > 0) {
            const fileHeaders = lines[0].split(',').map(header => header.trim());
            setAvailableColumns(fileHeaders);
            console.log("Available columns:", fileHeaders);
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
              console.log("Header mismatches found:", mismatches);
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
    
    console.log("Applying column mapping:", newMapping);
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
    
    try {
      // Parse CSV data with column mapping if needed
      const parsedData = parseCSVData(csvData, columnMapping);
      
      // Save data to Firestore
      await saveAdData(
        parsedData, 
        currentUser.uid, 
        uploadOption === "overwrite",
        file.name
      );
      
      // Reset state
      setFile(null);
      setCsvData(null);
      setIsValidated(false);
      resetValidationState();
      
      // Refresh upload history
      fetchUploadHistory();
      
      toast.success("Data uploaded successfully!");
      
      // Navigate to dashboard
      navigate("/");
    } catch (error) {
      console.error("Error uploading data:", error);
      toast.error("Failed to upload data: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Upload your Meta Ads data to track and analyze performance</h2>
        <p className="text-white/60 mt-1">
          Import your advertising data from Facebook Ads Manager to get started with AdPulse Analytics
        </p>
      </div>
      
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="bg-[#021627]/50 mb-4">
          <TabsTrigger value="upload">Upload CSV</TabsTrigger>
          <TabsTrigger value="format">Format Requirements</TabsTrigger>
          <TabsTrigger value="history">Upload History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="mt-0">
          <Card className="bg-[#0B2537] border-white/10">
            <CardHeader>
              <CardTitle>Upload Meta Ads Data</CardTitle>
              <CardDescription>
                Upload a CSV file with your Meta Ads performance data
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                  <h3 className="text-lg font-medium">Upload CSV File</h3>
                  <p className="text-white/60 max-w-md text-sm">
                    Drag and drop or click to browse
                  </p>
                  <Button variant="outline" size="sm" className="mt-2 bg-transparent border-white/20">
                    Choose File
                  </Button>
                </div>
              </div>
              
              {file && (
                <div className="mt-6">
                  <div className="flex items-center p-3 border border-white/10 rounded-lg bg-[#021627]">
                    <File className="h-6 w-6 text-adpulse-green/80 mr-3" />
                    <div className="flex-1 truncate">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-xs text-white/60">{Math.round(file.size / 1024)} KB</p>
                    </div>
                    {isValidated ? (
                      <div className="flex items-center text-adpulse-green">
                        <Check className="h-5 w-5 mr-1" />
                        <span className="text-sm">Valid</span>
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
                        className="bg-transparent border-white/20"
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
                    <AlertTitle>Validation Errors</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-5 text-sm space-y-1 mt-1">
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
                    <AlertTitle>Warnings</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-5 text-sm space-y-1 mt-1">
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
                  <h4 className="text-sm font-medium mb-2">Data Preview</h4>
                  <div className="border border-white/10 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-[#021627]">
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Ad Set</TableHead>
                          <TableHead className="text-right">Spent</TableHead>
                          <TableHead className="text-right">Results</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedPreview.map((row, index) => (
                          <TableRow key={index}>
                            <TableCell>{row.date}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{row.campaignName}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{row.adSetName}</TableCell>
                            <TableCell className="text-right">₹{row.amountSpent.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{row.results}</TableCell>
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
                    <p className="text-sm">File is valid and ready to upload</p>
                  </div>
                  
                  <div className="p-4 border border-white/10 rounded-lg bg-[#021627]">
                    <h4 className="text-sm font-medium mb-3">Upload Options</h4>
                    <RadioGroup 
                      value={uploadOption} 
                      onValueChange={(value) => setUploadOption(value as "append" | "overwrite")}
                      className="space-y-3"
                    >
                      <div className="flex items-start space-x-2">
                        <RadioGroupItem value="append" id="append" />
                        <div className="grid gap-1">
                          <Label htmlFor="append" className="font-medium">
                            Append data (add to existing data)
                          </Label>
                          <p className="text-xs text-white/60">
                            Add this data to your existing dataset. Duplicate entries will be skipped.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-2">
                        <RadioGroupItem value="overwrite" id="overwrite" />
                        <div className="grid gap-1">
                          <Label htmlFor="overwrite" className="font-medium">
                            Overwrite data (replace existing data for matching dates)
                          </Label>
                          <p className="text-xs text-white/60">
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
                      className="bg-adpulse-green text-[#021627] hover:bg-adpulse-green/90"
                    >
                      <UploadIcon className="h-4 w-4 mr-2" />
                      {isUploading ? "Uploading..." : "Upload File"}
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center">
                <p className="text-sm text-white/60">
                  Need the correct format? Download our template.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDownloadTemplate}
                  className="bg-transparent border-white/20"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="format" className="mt-0">
          <Card className="bg-[#0B2537] border-white/10">
            <CardHeader>
              <CardTitle>Format Requirements</CardTitle>
              <CardDescription>
                Required columns and formats for uploading Meta Ads data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Required CSV Columns</h3>
                  <p className="text-white/70 mb-4">
                    Your CSV file must include the following columns in the exact order shown below:
                  </p>
                  
                  <div className="border border-white/10 rounded-lg overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-[#021627]">
                        <tr>
                          <th className="px-4 py-3 text-sm font-medium">Column Name</th>
                          <th className="px-4 py-3 text-sm font-medium">Data Type</th>
                          <th className="px-4 py-3 text-sm font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {csvHeaders.map((header, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm">{header}</td>
                            <td className="px-4 py-3 text-sm text-white/70">
                              {header.toLowerCase().includes('date') ? 'Date (YYYY-MM-DD)' : 
                               header.toLowerCase().includes('name') ? 'Text' :
                               header.toLowerCase().includes('status') || header.toLowerCase().includes('level') ? 'Text' :
                               header.toLowerCase().includes('roas') || header.toLowerCase().includes('cost') || 
                               header.toLowerCase().includes('cpc') || header.toLowerCase().includes('cpm') || 
                               header.toLowerCase().includes('ctr') ? 'Number' : 'Number'}
                            </td>
                            <td className="px-4 py-3 text-sm text-white/70">
                              {header} data from Meta Ads
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <p className="text-sm text-white/70">
                    For a complete template with all required columns, download our CSV template.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownloadTemplate}
                    className="bg-transparent border-white/20"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="mt-0">
          <Card className="bg-[#0B2537] border-white/10">
            <CardHeader>
              <CardTitle>Upload History</CardTitle>
              <CardDescription>
                View and download your previous data uploads
              </CardDescription>
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
                  <Table>
                    <TableHeader className="bg-[#021627]">
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Date Uploaded</TableHead>
                        <TableHead>Records</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadHistory.map((upload) => (
                        <TableRow key={upload.id}>
                          <TableCell className="font-medium">{upload.fileName}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{format(new Date(upload.uploadedAt), "MMM d, yyyy")}</span>
                              <span className="text-xs text-white/60">
                                {formatDistanceToNow(new Date(upload.uploadedAt), { addSuffix: true })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{upload.recordCount}</TableCell>
                          <TableCell>
                            <Badge variant={upload.status === "completed" ? "default" : "outline"}>
                              {upload.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUpload(upload);
                                setDownloadDialogOpen(true);
                              }}
                              className="bg-transparent border-white/20"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  <p className="text-sm text-white/60 mt-2">
                    Note: Historical data is available for download for up to 90 days.
                  </p>
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
            <DialogTitle>Map Columns</DialogTitle>
            <DialogDescription>
              Some required columns are missing or have different names. Please map your CSV columns to the required ones.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[400px] overflow-y-auto">
            <div className="space-y-4 py-4">
              {headerMismatch.map((mismatch, index) => (
                <div key={index} className="grid grid-cols-2 gap-4 items-center">
                  <div>
                    <Label className="mb-1 block">Required Column</Label>
                    <div className="p-2 bg-slate-800 rounded border border-white/10">
                      {mismatch.required}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-1 block">Map From</Label>
                    <Select
                      value={mismatch.original || "none"} 
                      onValueChange={(value) => {
                        const updated = [...headerMismatch];
                        updated[index].original = value === "none" ? "" : value;
                        setHeaderMismatch(updated);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {availableColumns.map((column, idx) => (
                          <SelectItem key={idx} value={column}>{column}</SelectItem>
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
              className="sm:w-auto w-full"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={applyColumnMapping}
              className="sm:w-auto w-full"
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
            <DialogTitle>Download Data</DialogTitle>
            <DialogDescription>
              Download the data from your previous upload.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="mb-2 block">File Details</Label>
              <div className="rounded-lg bg-[#021627] p-3 border border-white/10">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-white/60">File Name:</div>
                  <div>{selectedUpload?.fileName || "Unknown"}</div>
                  <div className="text-white/60">Uploaded:</div>
                  <div>
                    {selectedUpload
                      ? format(new Date(selectedUpload.uploadedAt), "MMM d, yyyy h:mm a")
                      : "Unknown"}
                  </div>
                  <div className="text-white/60">Record Count:</div>
                  <div>{selectedUpload?.recordCount || 0}</div>
                </div>
              </div>
            </div>
            
            <div>
              <Label className="mb-2 block">Download Format</Label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Button
                    variant={downloadFormat === "csv" ? "default" : "outline"}
                    className={`w-full ${downloadFormat === "csv" ? "bg-adpulse-green text-[#021627]" : "bg-transparent border-white/20"}`}
                    onClick={() => setDownloadFormat("csv")}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
                <div className="flex-1">
                  <Button
                    variant={downloadFormat === "json" ? "default" : "outline"}
                    className={`w-full ${downloadFormat === "json" ? "bg-adpulse-green text-[#021627]" : "bg-transparent border-white/20"}`}
                    onClick={() => setDownloadFormat("json")}
                  >
                    <File className="h-4 w-4 mr-2" />
                    JSON
                  </
