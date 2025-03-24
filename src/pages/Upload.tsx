
import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { validateCSVHeaders, generateCSVTemplate } from "@/services/data";
import CSVUpload from "@/components/CSVUpload";
import UploadHistory from "@/components/UploadHistory";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Download, HelpCircle, UploadCloud } from "lucide-react";
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
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

const Upload = () => {
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);
  const [missingColumns, setMissingColumns] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [mappedHeaders, setMappedHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string>("");
  const [isCsvValid, setIsCsvValid] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadFilename, setUploadFilename] = useState<string | null>(null);
  const [uploadDateRange, setUploadDateRange] = useState<{ start: string; end: string } | null>(null);
  const [refreshHistoryTrigger, setRefreshHistoryTrigger] = useState(0); // New state to trigger refreshes
  
  const navigate = useNavigate();
  
  const handleTemplateDownload = () => {
    const csvTemplate = generateCSVTemplate();
    const blob = new Blob([csvTemplate], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "adpulse_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleUploadStart = () => {
    setUploadSuccess(false);
    setUploadFilename(null);
    setUploadDateRange(null);
  };
  
  const handleUploadComplete = (success: boolean, filename?: string, dateRange?: { start: string; end: string }) => {
    setUploadSuccess(success);
    setUploadFilename(filename || null);
    setUploadDateRange(dateRange || null);
  };

  // Create a new handler for upload success
  const handleUploadSuccess = () => {
    console.log("Upload successful, refreshing history...");
    // Increment the trigger to cause a refresh in the UploadHistory component
    setRefreshHistoryTrigger(prev => prev + 1);
  };
  
  const handleCSVValidation = (csvData: string) => {
    const result = validateCSVHeaders(csvData);
    
    if (!result.isValid) {
      setValidationErrors(result.missingHeaders);
      setMissingColumns(result.missingHeaders.join(", "));
      setShowValidationError(true);
      return false;
    }
    
    setValidationErrors([]);
    setShowValidationError(false);
    setMappedHeaders(result.mappedHeaders);
    return true;
  };
  
  return (
    <div className="container relative py-10 font-poppins">
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="bg-[#021627]/50">
          <TabsTrigger value="upload">Data Upload</TabsTrigger>
          <TabsTrigger value="history">Upload History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Upload Your Data</CardTitle>
              <CardDescription>
                Upload your advertising data in CSV format to get started.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <CSVUpload
                onUploadStart={handleUploadStart}
                onUploadComplete={handleUploadComplete}
                onValidate={handleCSVValidation}
                onUploadSuccess={handleUploadSuccess} // Add new callback
              />
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <Button variant="link" onClick={() => setShowTemplateDialog(true)}>
                <HelpCircle className="mr-2 h-4 w-4" />
                View Template Guide
              </Button>
              <Button variant="secondary" onClick={handleTemplateDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download CSV Template
              </Button>
            </CardFooter>
          </Card>
          
          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle>CSV Template Guide</DialogTitle>
                <DialogDescription>
                  Follow these guidelines to ensure your CSV file is properly formatted for upload.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <p>
                  The CSV file should contain the following columns, with the headers exactly as specified:
                </p>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Column Name</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Date</TableCell>
                        <TableCell>The date of the ad data (YYYY-MM-DD)</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Campaign name</TableCell>
                        <TableCell>The name of the ad campaign</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Ad set name</TableCell>
                        <TableCell>The name of the ad set</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Objective</TableCell>
                        <TableCell>The objective of the campaign (e.g., "Sales", "Traffic")</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Impressions</TableCell>
                        <TableCell>The number of impressions for the ad</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Link clicks</TableCell>
                        <TableCell>The number of link clicks for the ad</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">CTR (All)</TableCell>
                        <TableCell>The click-through rate of the ad (as a decimal, e.g., 0.01 for 1%)</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">CPC (cost per link click)</TableCell>
                        <TableCell>The cost per link click for the ad</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Amount spent (INR)</TableCell>
                        <TableCell>The amount spent on the ad in INR</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Results</TableCell>
                        <TableCell>The number of results (e.g., conversions, leads) for the ad</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Result Type</TableCell>
                        <TableCell>The type of result (e.g., "Purchases", "Leads")</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Cost per result</TableCell>
                        <TableCell>The cost per result for the ad</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Purchases</TableCell>
                        <TableCell>The number of purchases for the ad</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Purchases conversion value</TableCell>
                        <TableCell>The conversion value of purchases for the ad</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Purchase ROAS</TableCell>
                        <TableCell>The return on ad spend for purchases (as a decimal, e.g., 2.5 for 250%)</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <p>
                  Ensure that the CSV file is properly formatted, with each column separated by a comma.
                </p>
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => setShowTemplateDialog(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showValidationError} onOpenChange={setShowValidationError}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>CSV Validation Error</DialogTitle>
                <DialogDescription>
                  The CSV file is missing required columns. Please update the file and try again.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Missing Columns</AlertTitle>
                  <AlertDescription>
                    {missingColumns}
                  </AlertDescription>
                </Alert>
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => setShowValidationError(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <UploadHistory refreshTrigger={refreshHistoryTrigger} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Upload;
