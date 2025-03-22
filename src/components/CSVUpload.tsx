
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

const CSVUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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
    
    setIsUploading(true);
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
              setMappingDialogOpen(true);
            } else {
              toast.error("CSV format is invalid. Missing required columns.");
            }
            
            setIsUploading(false);
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
          setIsUploading(false);
        }
      };
      
      reader.onerror = () => {
        setParseError("Failed to read the file.");
        toast.error("Failed to read the file.");
        setIsUploading(false);
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error("CSV processing error:", error);
      setParseError("An error occurred while processing the file.");
      toast.error("An error occurred while processing the file.");
      setIsUploading(false);
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
    
    try {
      console.log("Starting upload with data:", parsedData.length, "records");
      
      await saveAdData(parsedData, currentUser.uid, overwrite, file?.name || "upload.csv");
      console.log("Upload completed successfully");
      
      resetForm();
      setDialogOpen(false);
      toast.success("Data uploaded successfully!");
      navigate("/");
    } catch (error) {
      console.error("Firebase upload error:", error);
      toast.error("Failed to upload data to the database: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsUploading(false);
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

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-xl font-semibold">
            <FileText className="mr-2 h-5 w-5 text-adpulse-green" />
            Upload Meta Ads Data
          </CardTitle>
          <CardDescription>
            Upload your Meta Ads CSV data for analysis and tracking.
            <Button 
              variant="link" 
              onClick={goToAdvancedUpload} 
              className="text-adpulse-green px-0 hover:no-underline"
            >
              Use advanced upload features
            </Button>
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload CSV</TabsTrigger>
              <TabsTrigger value="template">Format Requirements</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="pt-4">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="csv-file">Select CSV File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                </div>
                
                {parseError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{parseError}</AlertDescription>
                  </Alert>
                )}
                
                {file && (
                  <Alert variant="default" className="bg-muted">
                    <FileText className="h-4 w-4" />
                    <AlertTitle>Selected File</AlertTitle>
                    <AlertDescription className="flex items-center justify-between">
                      <span>{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={openColumnMappingDialog}
                          className="h-8 px-2 py-1 text-xs"
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
                <p className="text-sm text-muted-foreground">
                  Your CSV file must include the following columns:
                </p>
                
                <div className="bg-card border rounded-md p-4 overflow-auto max-h-[400px]">
                  <div className="grid grid-cols-1 gap-2">
                    {csvHeaders.map((header, index) => (
                      <div 
                        key={index} 
                        className="text-xs py-1 px-2 border border-white/10 rounded bg-muted/50"
                      >
                        {header}
                      </div>
                    ))}
                  </div>
                </div>
                
                <Button 
                  onClick={downloadTemplate}
                  className="w-full"
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
            className="w-full"
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
            <DialogTitle>Map CSV Columns</DialogTitle>
            <DialogDescription>
              Map your CSV columns to the required format. This helps when your column names are different.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[300px] overflow-y-auto py-4">
            <div className="space-y-4">
              <p className="text-sm font-medium text-white">Column Mapping</p>
              
              <div className="space-y-2">
                {detectedHeaders.length > 0 && (
                  <div className="grid gap-4">
                    {detectedHeaders.map((header, index) => {
                      // Skip already recognized headers
                      const isAlreadyRecognized = csvHeaders.some(
                        required => required.toLowerCase() === header.toLowerCase()
                      );
                      
                      if (isAlreadyRecognized) return null;
                      
                      return (
                        <div key={index} className="grid grid-cols-2 gap-2 items-center">
                          <div className="text-sm truncate">{header}</div>
                          <select
                            className="bg-[#0B2537] border border-white/20 rounded p-1 text-sm"
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
                    
                    {/* Show specific mapping for CPM which might be split */}
                    <div className="border-t border-white/10 pt-2 mt-2">
                      <p className="text-xs text-adpulse-green mb-2">
                        Special Case: If "CPM (cost per 1,000 impressions)" is split across multiple columns, map both to the same target.
                      </p>
                      <div className="grid grid-cols-2 gap-2 items-center">
                        <div className="text-sm truncate">CPM (cost per 1 part)</div>
                        <select
                          className="bg-[#0B2537] border border-white/20 rounded p-1 text-sm"
                          value={customColumnMapping["CPM (cost per 1"] || ""}
                          onChange={(e) => handleColumnMappingChange("CPM (cost per 1", e.target.value)}
                        >
                          <option value="">-- Select Target --</option>
                          <option value="CPM (cost per 1,000 impressions)">CPM (cost per 1,000 impressions)</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2 items-center mt-2">
                        <div className="text-sm truncate">000 impressions) part</div>
                        <select
                          className="bg-[#0B2537] border border-white/20 rounded p-1 text-sm"
                          value={customColumnMapping["000 impressions)"] || ""}
                          onChange={(e) => handleColumnMappingChange("000 impressions)", e.target.value)}
                        >
                          <option value="">-- Select Target --</option>
                          <option value="CPM (cost per 1,000 impressions)">CPM (cost per 1,000 impressions)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <Button 
              variant="outline" 
              onClick={() => setMappingDialogOpen(false)}
              className="sm:w-auto w-full"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={applyColumnMappingAndContinue}
              className="sm:w-auto w-full"
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
            <DialogTitle>Data Preview</DialogTitle>
            <DialogDescription>
              Your CSV file has been parsed successfully. Review the data before uploading.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[300px] overflow-y-auto text-sm">
            <div className="space-y-2">
              {parsedData && (
                <>
                  <div className="text-xs font-medium text-muted-foreground">
                    {parsedData.length} rows were parsed successfully.
                  </div>
                  
                  {validationWarnings.length > 0 && (
                    <Alert className="bg-yellow-500/10 border-yellow-500/20">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <AlertTitle>Warnings</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc pl-5 text-[10px] space-y-1 mt-1">
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
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-left">Campaign</th>
                          <th className="p-2 text-left">Ad Set</th>
                          <th className="p-2 text-right">Spend</th>
                          <th className="p-2 text-right">Results</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 5).map((row, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-2">{row.date}</td>
                            <td className="p-2">{row.campaignName.substring(0, 15)}...</td>
                            <td className="p-2">{row.adSetName.substring(0, 15)}...</td>
                            <td className="p-2 text-right">₹{row.amountSpent.toFixed(2)}</td>
                            <td className="p-2 text-right">{row.results}</td>
                          </tr>
                        ))}
                        {parsedData.length > 5 && (
                          <tr className="border-t">
                            <td colSpan={5} className="p-2 text-center text-muted-foreground">
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
              <Label htmlFor="overwrite" className="text-sm">
                Overwrite existing data
              </Label>
            </div>
            <div className="text-xs text-muted-foreground">
              {overwrite ? "Will update existing entries" : "Will skip duplicate entries"}
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              className="sm:w-auto w-full"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={uploadToFirebase} 
              disabled={isUploading}
              className="sm:w-auto w-full"
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
