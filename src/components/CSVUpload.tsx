
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { parseCSVData, saveAdData, generateCSVTemplate, validateCSVHeaders, AdData } from "@/services/data";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, Download, AlertTriangle, X, Check, FileText } from "lucide-react";
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
    } else {
      setFile(null);
      setParseError("Please select a valid CSV file.");
      toast.error("Please select a valid CSV file.");
    }
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
            setParseError(`Missing required columns: ${headerValidation.missingHeaders.join(", ")}`);
            toast.error("CSV format is invalid. Missing required columns.");
            setIsUploading(false);
            return;
          }
          
          const data = parseCSVData(csvData);
          
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
        } catch (error) {
          console.error("CSV parse error:", error);
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

  // Upload parsed data to Firebase
  const uploadToFirebase = async () => {
    if (!parsedData || !currentUser) return;
    
    setIsUploading(true);
    
    try {
      await saveAdData(parsedData, currentUser.uid, overwrite, file?.name || "upload.csv");
      resetForm();
      setDialogOpen(false);
      toast.success("Data uploaded successfully!");
      navigate("/");
    } catch (error) {
      console.error("Firebase upload error:", error);
      toast.error("Failed to upload data to the database.");
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle redirection to advanced upload page
  const goToAdvancedUpload = () => {
    navigate("/upload");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-xl font-semibold">
            <FileText className="mr-2 h-5 w-5 text-adpulse-green" />
            Upload Ad Data
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
              <TabsTrigger value="template">Download Template</TabsTrigger>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={resetForm}
                        className="h-6 w-6"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="template" className="pt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Download our CSV template to ensure your data is formatted correctly for upload.
                  The template includes all required columns in the correct order.
                </p>
                
                <div className="grid gap-4">
                  <h4 className="text-sm font-medium">Required Columns:</h4>
                  <div className="text-xs text-muted-foreground grid gap-1.5">
                    <p>Date, Campaign name, Ad set name, Delivery status, Delivery level, Reach, Impressions, Frequency,</p>
                    <p>Attribution setting, Result Type, Results, Amount spent (INR), Cost per result, Purchase ROAS,</p>
                    <p>Purchases conversion value, Starts, Ends, Link clicks, CPC, CPM, CTR, and more...</p>
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
