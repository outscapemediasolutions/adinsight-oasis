import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { parseCSVData, saveAdData, generateCSVTemplate, validateCSVHeaders, AdData, csvHeaders, columnMappings } from "@/services/data";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, Download, AlertTriangle, X, Check, FileText, Map } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

const CSVUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState<string>("");
  const [showUploadingScreen, setShowUploadingScreen] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<AdData[] | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [customColumnMapping, setCustomColumnMapping] = useState<Record<string, string>>({});
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  const { currentUser } = useAuth();
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setParseError(null);
      setParsedData(null);
      setValidationWarnings([]);
      
      // Extract headers from file to prepare for mapping
      extractHeadersFromFile(selectedFile);
    } else {
      setFile(null);
      setParseError("Please select a valid CSV file.");
      toast.error("Please select a valid CSV file.");
    }
  };
  
  // Extract CSV headers from the file
  const extractHeadersFromFile = (selectedFile: File) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const csvData = event.target?.result as string;
        const lines = csvData.split('\n');
        if (lines.length > 0) {
          const headers = lines[0].split(',').map(header => header.trim());
          setDetectedHeaders(headers);
          console.log("Detected headers:", headers);
        }
      } catch (error) {
        console.error("Error extracting headers:", error);
      }
    };
    
    reader.readAsText(selectedFile);
  };

  // Parse CSV data
  const parseCSV = async () => {
    if (!file) return;
    
    setIsValidating(true);
    setParseError(null);
    
    try {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const csvData = event.target?.result as string;
          
          // Validate CSV headers first
          const headerValidation = validateCSVHeaders(csvData);
          
          if (!headerValidation.isValid) {
            console.log("Missing headers:", headerValidation.missingHeaders);
            setParseError(`Missing required columns: ${headerValidation.missingHeaders.join(", ")}`);
            
            // Check if we have a CPM column split issue
            const hasCPMPart1 = headerValidation.mappedHeaders.some(h => h.includes("CPM (cost per 1"));
            const hasCPMPart2 = headerValidation.mappedHeaders.some(h => h.includes("000 impressions)"));
            
            if (hasCPMPart1 && hasCPMPart2) {
              // Auto-map the CPM columns
              setCustomColumnMapping(prev => ({
                ...prev,
                "CPM (cost per 1": "CPM (cost per 1,000 impressions)",
                "000 impressions)": "CPM (cost per 1,000 impressions)"
              }));
              setMappingDialogOpen(true);
            } else {
              setMappingDialogOpen(true);
            }
            
            setIsValidating(false);
            return;
          }
          
          try {
            const data = parseCSVData(csvData, customColumnMapping);
            
            if (data.length === 0) {
              setParseError("No valid data found in the CSV file.");
              toast.error("No valid data found in the CSV file.");
            } else {
              // Check for warnings
              const warnings = [];
              if (data.some(row => row.amountSpent === 0)) {
                warnings.push("Some rows have 0 amount spent.");
              }
              if (data.some(row => row.impressions < 100)) {
                warnings.push("Some campaigns have very low impressions (<100).");
              }
              
              setValidationWarnings(warnings);
              setParsedData(data);
              setDialogOpen(true);
            }
          } catch (parseError) {
            console.error("CSV parse error:", parseError);
            setParseError((parseError as Error).message);
            toast.error((parseError as Error).message);
          }
        } catch (error) {
          console.error("CSV validation error:", error);
          setParseError((error as Error).message);
          toast.error((error as Error).message);
        } finally {
          setIsValidating(false);
        }
      };
      
      reader.onerror = () => {
        setParseError("Failed to read the file.");
        toast.error("Failed to read the file.");
        setIsValidating(false);
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error("CSV processing error:", error);
      setParseError("An error occurred while processing the file.");
      toast.error("An error occurred while processing the file.");
      setIsValidating(false);
    }
  };

  // Open column mapping dialog
  const openColumnMappingDialog = () => {
    setMappingDialogOpen(true);
  };
  
  // Handle column mapping changes
  const handleColumnMappingChange = (originalHeader: string, targetHeader: string) => {
    setCustomColumnMapping(prev => ({
      ...prev,
      [originalHeader]: targetHeader
    }));
  };
  
  // Apply column mapping and continue
  const applyColumnMappingAndContinue = () => {
    setMappingDialogOpen(false);
    parseCSV();
  };

  // Upload parsed data to Firebase
  const uploadToFirebase = async () => {
    if (!parsedData || !currentUser) return;
    
    setIsUploading(true);
    setShowUploadingScreen(true);
    setUploadProgress(0);
    setUploadStep("Parsing data...");
    
    try {
      console.log("Starting upload with data:", parsedData.length, "records");
      
      // Step 1: Prepare data
      setUploadProgress(20);
      setUploadStep("Processing data...");
      await new Promise(r => setTimeout(r, 500)); // Simulate processing time
      
      // Step 2: Uploading
      setUploadProgress(40);
      setUploadStep("Uploading to database...");
      
      await saveAdData(parsedData, currentUser.uid, overwrite, file?.name || "upload.csv");
      
      // Step 3: Finalizing
      setUploadProgress(80);
      setUploadStep("Finalizing...");
      await new Promise(r => setTimeout(r, 500)); // Simulate finalizing
      
      console.log("Upload completed successfully");
      
      // Step 4: Complete
      setUploadProgress(100);
      setUploadStep("Upload complete!");
      
      setTimeout(() => {
        resetForm();
        setDialogOpen(false);
        setShowUploadingScreen(false);
        toast.success("Data uploaded successfully!");
        navigate("/");
      }, 1000);
      
    } catch (error) {
      console.error("Firebase upload error:", error);
      toast.error("Failed to upload data to the database: " + (error instanceof Error ? error.message : "Unknown error"));
      setIsUploading(false);
      setShowUploadingScreen(false);
    }
  };

  // Download CSV template
  const downloadTemplate = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = "adpulse_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Template downloaded successfully.");
  };

  // Reset form
  const resetForm = () => {
    setFile(null);
    setParseError(null);
    setParsedData(null);
    setValidationWarnings([]);
    setCustomColumnMapping({});
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle redirection to advanced upload page
  const goToAdvancedUpload = () => {
    navigate("/upload");
  };

  // Display column format in a more readable way
  const formatColumnName = (name: string) => {
    return (
      <span className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] inline-block">
        {name}
      </span>
    );
  };

  if (showUploadingScreen) {
    return (
      <div className="w-full h-[80vh] flex flex-col items-center justify-center font-poppins">
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
    <div className="space-y-6 animate-fade-in">
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-xl font-semibold font-poppins">
            <FileText className="mr-2 h-5 w-5 text-adpulse-green" />
            Upload Meta Ads Data
          </CardTitle>
          <CardDescription className="font-poppins">
            Upload your Meta Ads CSV data for analysis and tracking.
            <Button 
              variant="link" 
              onClick={goToAdvancedUpload} 
              className="text-adpulse-green px-0 hover:no-underline font-poppins"
            >
              Use advanced upload features
            </Button>
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="font-poppins">Upload CSV</TabsTrigger>
              <TabsTrigger value="template" className="font-poppins">Format Requirements</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="pt-4">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="csv-file" className="font-poppins">Select CSV File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="cursor-pointer font-poppins"
                  />
                </div>
                
                {parseError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="font-poppins">Error</AlertTitle>
                    <AlertDescription className="font-poppins">{parseError}</AlertDescription>
                  </Alert>
                )}
                
                {file && (
                  <Alert variant="default" className="bg-muted">
                    <FileText className="h-4 w-4" />
                    <AlertTitle className="font-poppins">Selected File</AlertTitle>
                    <AlertDescription className="flex items-center justify-between">
                      <span className="font-poppins">{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={openColumnMappingDialog}
                          className="h-8 px-2 py-1 text-xs font-poppins"
                        >
                          <Map className="h-3 w-3 mr-1" />
                          Map Columns
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={resetForm}
                          className="h-6 w-6"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="template" className="pt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground font-poppins">
                  Your CSV file must include the following columns:
                </p>
                
                <div className="bg-card border rounded-md p-4 overflow-auto max-h-[400px]">
                  <div className="grid grid-cols-1 gap-2">
                    {csvHeaders.map((header, index) => (
                      <div 
                        key={index} 
                        className="text-xs py-1 px-2 border border-white/10 rounded bg-muted/50 font-poppins"
                      >
                        {header}
                      </div>
                    ))}
                  </div>
                </div>
                
                <Button 
                  onClick={downloadTemplate}
                  className="w-full font-poppins"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="pt-0">
          <Button
            onClick={parseCSV}
            disabled={!file || isUploading}
            className="w-full font-poppins"
          >
            {isUploading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spinner rounded-full border-2 border-adpulse-green border-r-transparent" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Data
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Column Mapping Dialog */}
      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent className="sm:max-w-md glass-card">
          <DialogHeader>
            <DialogTitle className="font-poppins">Map CSV Columns</DialogTitle>
            <DialogDescription className="font-poppins">
              Map your CSV columns to the required format. This helps when your column names are different.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[300px] overflow-y-auto py-4">
            <div className="space-y-4">
              <p className="text-sm font-medium text-white font-poppins">Column Mapping</p>
              
              <div className="space-y-2">
                {detectedHeaders.length > 0 && (
                  <div className="grid gap-4">
                    {detectedHeaders.map((header, index) => {
                      // Skip empty headers
                      if (!header.trim()) return null;
                      
                      // Check if this header is already mapped correctly
                      const isStandardHeader = csvHeaders.some(
                        required => required.toLowerCase() === header.toLowerCase()
                      );
                      
                      // If it's a standard header, show it as already mapped
                      if (isStandardHeader) {
                        const matchingHeader = csvHeaders.find(
                          h => h.toLowerCase() === header.toLowerCase()
                        );
                        return (
                          <div key={index} className="grid grid-cols-2 gap-2 items-center">
                            <div className="text-sm truncate font-poppins">{header}</div>
                            <div className="flex items-center">
                              <span className="bg-adpulse-green/20 text-adpulse-green text-xs rounded px-2 py-1 font-poppins">
                                Mapped to {matchingHeader}
                              </span>
                              <Check className="ml-2 h-4 w-4 text-adpulse-green" />
                            </div>
                          </div>
                        );
                      }
                      
                      // Otherwise, show mapping dropdown
                      return (
                        <div key={index} className="grid grid-cols-2 gap-2 items-center">
                          <div className="text-sm truncate font-poppins">{header}</div>
                          <select
                            className="bg-[#0B2537] border border-white/20 rounded p-1 text-sm font-poppins"
                            value={customColumnMapping[header] || ""}
                            onChange={(e) => handleColumnMappingChange(header, e.target.value)}
                          >
                            <option value="">-- Select Target --</option>
                            {csvHeaders.map((targetHeader, idx) => (
                              <option key={idx} value={targetHeader}>
                                {targetHeader}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                    
                    {/* Special case for split CPM column */}
                    {detectedHeaders.includes("CPM (cost per 1") && detectedHeaders.includes("000 impressions)") && (
                      <div className="mt-4 p-3 border border-adpulse-green/20 bg-adpulse-green/5 rounded-md">
                        <p className="text-xs text-adpulse-green mb-2 font-poppins">
                          <Check className="inline-block mr-1 h-3 w-3" />
                          Split CPM column detected and automatically mapped.
                        </p>
                        <div className="text-xs font-poppins">
                          "CPM (cost per 1" + "000 impressions)" → "CPM (cost per 1,000 impressions)"
                        </div>
                      </div>
                    )}
                    
                    {/* Missing required columns section */}
                    {csvHeaders.some(required => 
                      !detectedHeaders.some(h => h.toLowerCase() === required.toLowerCase()) && 
                      !Object.values(customColumnMapping).includes(required)
                    ) && (
                      <div className="mt-4 p-3 border border-yellow-500/20 bg-yellow-500/5 rounded-md">
                        <p className="text-xs text-yellow-500 mb-2 font-poppins">
                          <AlertTriangle className="inline-block mr-1 h-3 w-3" />
                          Missing required columns:
                        </p>
                        <div className="space-y-1">
                          {csvHeaders.filter(required => 
                            !detectedHeaders.some(h => h.toLowerCase() === required.toLowerCase()) &&
                            !Object.values(customColumnMapping).includes(required)
                          ).map((missing, idx) => (
                            <div key={idx} className="text-xs font-poppins">{missing}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <Button 
              variant="outline" 
              onClick={() => setMappingDialogOpen(false)}
              className="sm:w-auto w-full font-poppins"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={applyColumnMappingAndContinue}
              className="sm:w-auto w-full font-poppins"
            >
              <Check className="mr-2 h-4 w-4" />
              Apply Mapping & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Data Preview Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md glass-card">
          <DialogHeader>
            <DialogTitle className="font-poppins">Data Preview</DialogTitle>
            <DialogDescription className="font-poppins">
              Your CSV file has been parsed successfully. Review the data before uploading.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[300px] overflow-y-auto text-sm">
            <div className="space-y-2">
              {parsedData && (
                <>
                  <div className="text-xs font-medium text-muted-foreground font-poppins">
                    {parsedData.length} rows were parsed successfully.
                  </div>
                  
                  {validationWarnings.length > 0 && (
                    <Alert className="bg-yellow-500/10 border-yellow-500/20">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <AlertTitle className="font-poppins">Warnings</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc pl-5 text-[10px] space-y-1 mt-1 font-poppins">
                          {validationWarnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-2 text-left font-poppins">Date</th>
                          <th className="p-2 text-left font-poppins">Campaign</th>
                          <th className="p-2 text-left font-poppins">Ad Set</th>
                          <th className="p-2 text-right font-poppins">Spend</th>
                          <th className="p-2 text-right font-poppins">Results</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 5).map((row, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-2 font-poppins">{row.date}</td>
                            <td className="p-2 font-poppins">{row.campaignName.substring(0, 15)}...</td>
                            <td className="p-2 font-poppins">{row.adSetName.substring(0, 15)}...</td>
                            <td className="p-2 text-right font-poppins">₹{row.amountSpent.toFixed(2)}</td>
                            <td className="p-2 text-right font-poppins">{row.results}</td>
                          </tr>
                        ))}
                        {parsedData.length > 5 && (
                          <tr className="border-t">
                            <td colSpan={5} className="p-2 text-center text-muted-foreground font-poppins">
                              ...and {parsedData.length - 5} more rows
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between space-x-2 py-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="overwrite"
                checked={overwrite}
                onCheckedChange={setOverwrite}
              />
              <Label htmlFor="overwrite" className="text-sm font-poppins">
                Overwrite existing data
              </Label>
            </div>
            <div className="text-xs text-muted-foreground font-poppins">
              {overwrite ? "Will update existing entries" : "Will skip duplicate entries"}
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              className="sm:w-auto w-full font-poppins"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={uploadToFirebase} 
              disabled={isUploading}
              className="sm:w-auto w-full font-poppins"
            >
              {isUploading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spinner rounded-full border-2 border-current border-r-transparent" />
                  Uploading...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Confirm Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CSVUpload;
