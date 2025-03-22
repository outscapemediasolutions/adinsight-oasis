
import React, { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUserUploads, downloadHistoricalData, deleteUpload, UploadRecord } from "@/services/data";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Download,
  Trash2, 
  FileText, 
  RefreshCw, 
  CalendarRange
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const UploadHistory = () => {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Fetch upload history
  const fetchUploadHistory = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const uploadHistory = await getUserUploads(currentUser.uid);
      console.log("Fetched upload history:", uploadHistory);
      setUploads(uploadHistory);
    } catch (error) {
      console.error("Failed to fetch upload history:", error);
      toast.error("Failed to fetch upload history. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initialize data
  useEffect(() => {
    fetchUploadHistory();
  }, [currentUser]);
  
  // Handle download
  const handleDownload = async (uploadId: string, format: "csv" | "json" = "csv") => {
    if (!currentUser) return;
    
    setIsDownloading(uploadId);
    try {
      await downloadHistoricalData(currentUser.uid, uploadId, format);
      toast.success(`Data downloaded successfully as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Failed to download data:", error);
      toast.error("Failed to download data. Please try again.");
    } finally {
      setIsDownloading(null);
    }
  };
  
  // Handle delete
  const handleDelete = async (uploadId: string) => {
    if (!currentUser) return;
    
    setIsDeleting(uploadId);
    try {
      const success = await deleteUpload(currentUser.uid, uploadId);
      if (success) {
        setUploads(uploads.filter(upload => upload.id !== uploadId));
        toast.success("Upload record and associated data deleted successfully");
      }
    } catch (error) {
      console.error("Failed to delete upload:", error);
      toast.error("Failed to delete upload. Please try again.");
    } finally {
      setIsDeleting(null);
    }
  };
  
  // View data in dashboard
  const viewInDashboard = (upload: UploadRecord) => {
    if (upload.dateRange?.start && upload.dateRange?.end) {
      // Navigate to dashboard with the date range
      navigate(`/?startDate=${upload.dateRange.start}&endDate=${upload.dateRange.end}`);
    } else {
      toast.warning("No date range available for this upload");
    }
  };
  
  // Format date for display
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };
  
  // Format date range for display
  const formatDateRange = (upload: UploadRecord) => {
    if (upload.dateRange?.start && upload.dateRange?.end) {
      return `${upload.dateRange.start} - ${upload.dateRange.end}`;
    }
    return "Not specified";
  };
  
  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const color = status === 'completed' ? 'success' : status === 'failed' ? 'destructive' : 'warning';
    return (
      <span className={`text-xs px-2 py-1 rounded-full bg-${color === 'success' ? 'adpulse-green/20' : color === 'destructive' ? 'red-500/20' : 'yellow-500/20'} text-${color === 'success' ? 'adpulse-green' : color === 'destructive' ? 'red-500' : 'yellow-500'}`}>
        {status}
      </span>
    );
  };
  
  return (
    <Card className="glass-card w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-poppins flex items-center">
          <FileText className="mr-2 h-5 w-5 text-adpulse-green" />
          Upload History
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchUploadHistory}
          disabled={isLoading}
          className="font-poppins"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      
      <CardContent>
        {uploads.length === 0 ? (
          <div className="text-center py-8 font-poppins">
            {isLoading ? (
              <div className="flex items-center justify-center flex-col">
                <RefreshCw className="h-8 w-8 animate-spin text-adpulse-green mb-4" />
                <p>Loading upload history...</p>
              </div>
            ) : (
              <p className="text-white/60">No upload history found. Upload some data to see it here.</p>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-white/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] font-poppins">Date</TableHead>
                  <TableHead className="font-poppins">File Name</TableHead>
                  <TableHead className="font-poppins">Data Range</TableHead>
                  <TableHead className="text-center font-poppins">Rows</TableHead>
                  <TableHead className="text-center font-poppins">Status</TableHead>
                  <TableHead className="text-right font-poppins">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.map((upload) => (
                  <TableRow key={upload.id} className="cursor-pointer hover:bg-white/5" onClick={() => viewInDashboard(upload)}>
                    <TableCell className="font-poppins">{formatDate(upload.uploadedAt)}</TableCell>
                    <TableCell className="font-poppins">
                      <div className="flex items-center">
                        <FileText className="mr-2 h-4 w-4 text-adpulse-green" />
                        {upload.fileName}
                      </div>
                    </TableCell>
                    <TableCell 
                      className="font-poppins font-medium text-adpulse-green"
                      onClick={(e) => {
                        e.stopPropagation();
                        viewInDashboard(upload);
                      }}
                    >
                      <div className="flex items-center">
                        <CalendarRange className="mr-2 h-4 w-4" />
                        {formatDateRange(upload)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-poppins">{upload.recordCount} rows</TableCell>
                    <TableCell className="text-center font-poppins">
                      <StatusBadge status={upload.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(upload.id, "csv")}
                          disabled={isDownloading === upload.id}
                          className="h-8 w-8"
                        >
                          <Download className={`h-4 w-4 ${isDownloading === upload.id ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(upload.id)}
                          disabled={isDeleting === upload.id}
                          className="h-8 w-8 text-red-500"
                        >
                          <Trash2 className={`h-4 w-4 ${isDeleting === upload.id ? 'animate-bounce' : ''}`} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadHistory;
