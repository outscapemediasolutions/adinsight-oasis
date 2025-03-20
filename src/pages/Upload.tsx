
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Check, Download, File, FileText, Upload as UploadIcon, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { parseCSVData, saveAdData, generateCSVTemplate } from "@/services/data";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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
      } else {
        toast.error("Please upload a CSV file");
      }
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setIsValidated(false);
    }
  };
  
  const validateFile = async () => {
    if (!file) {
      toast.error("Please select a file to validate");
      return;
    }
    
    setIsValidating(true);
    
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const csvText = e.target?.result as string;
          setCsvData(csvText);
          
          // Attempt to parse the CSV data
          parseCSVData(csvText);
          
          // If parsing succeeds (no error is thrown), set validation as successful
          setIsValidated(true);
          toast.success("File is valid and ready to upload");
        } catch (error) {
          console.error("Validation error:", error);
          toast.error(error instanceof Error ? error.message : "Invalid CSV format");
          setIsValidated(false);
        } finally {
          setIsValidating(false);
        }
      };
      
      reader.onerror = () => {
        toast.error("Error reading file");
        setIsValidating(false);
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error("File validation error:", error);
      toast.error("Error validating file");
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
      // Parse CSV data
      const parsedData = parseCSVData(csvData);
      
      // Save data to Firestore
      await saveAdData(parsedData, currentUser.uid, uploadOption === "overwrite");
      
      // Reset state
      setFile(null);
      setCsvData(null);
      setIsValidated(false);
      
      // Navigate to dashboard
      navigate("/");
    } catch (error) {
      console.error("Error uploading data:", error);
      toast.error("Failed to upload data");
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
                      }}
                      className="ml-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
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
                        <tr>
                          <td className="px-4 py-3 text-sm">Date</td>
                          <td className="px-4 py-3 text-sm text-white/70">Date (YYYY-MM-DD)</td>
                          <td className="px-4 py-3 text-sm text-white/70">The date for this data point</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-sm">Campaign name</td>
                          <td className="px-4 py-3 text-sm text-white/70">Text</td>
                          <td className="px-4 py-3 text-sm text-white/70">Name of the campaign</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-sm">Ad set name</td>
                          <td className="px-4 py-3 text-sm text-white/70">Text</td>
                          <td className="px-4 py-3 text-sm text-white/70">Name of the ad set</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-sm">Amount spent (INR)</td>
                          <td className="px-4 py-3 text-sm text-white/70">Number</td>
                          <td className="px-4 py-3 text-sm text-white/70">Total amount spent</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-sm">Impressions</td>
                          <td className="px-4 py-3 text-sm text-white/70">Number</td>
                          <td className="px-4 py-3 text-sm text-white/70">Number of impressions</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-sm">CTR (all)</td>
                          <td className="px-4 py-3 text-sm text-white/70">Number (0-1)</td>
                          <td className="px-4 py-3 text-sm text-white/70">Click-through rate</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-sm">Purchase ROAS</td>
                          <td className="px-4 py-3 text-sm text-white/70">Number</td>
                          <td className="px-4 py-3 text-sm text-white/70">Return on ad spend</td>
                        </tr>
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
                View your previous data uploads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                title="No upload history"
                description="You haven't uploaded any data yet. Upload a CSV file to get started."
                icon={<UploadIcon className="h-8 w-8 text-white/30" />}
                className="py-10 h-auto"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UploadPage;
