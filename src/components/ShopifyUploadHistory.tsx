
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserShopifyUploads, deleteShopifyUpload, ShopifyUploadRecord } from "@/services/shopifyData";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar, Download, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface ShopifyUploadHistoryProps {
  refreshTrigger?: number;
}

const ShopifyUploadHistory: React.FC<ShopifyUploadHistoryProps> = ({ refreshTrigger = 0 }) => {
  const { currentUser } = useAuth();
  const [uploads, setUploads] = useState<ShopifyUploadRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUploadHistory = async () => {
      if (!currentUser) return;
      
      try {
        setIsLoading(true);
        const uploadsData = await getUserShopifyUploads(currentUser.uid);
        setUploads(uploadsData);
      } catch (error) {
        console.error("Error fetching Shopify upload history:", error);
        toast.error("Failed to load upload history");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUploadHistory();
  }, [currentUser, refreshTrigger]);

  const handleDelete = (uploadId: string) => {
    setSelectedUploadId(uploadId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedUploadId || !currentUser) return;
    
    try {
      await deleteShopifyUpload(currentUser.uid, selectedUploadId);
      setUploads(uploads.filter(upload => upload.id !== selectedUploadId));
      toast.success("Upload deleted successfully");
    } catch (error) {
      console.error("Error deleting Shopify upload:", error);
      toast.error("Failed to delete upload");
    } finally {
      setDeleteDialogOpen(false);
      setSelectedUploadId(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRefresh = async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      const uploadsData = await getUserShopifyUploads(currentUser.uid);
      setUploads(uploadsData);
      toast.success("Upload history refreshed");
    } catch (error) {
      console.error("Error refreshing Shopify upload history:", error);
      toast.error("Failed to refresh upload history");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Shopify Upload History</CardTitle>
          <CardDescription>
            View and manage your previous Shopify data uploads
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {uploads.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.map((upload) => (
                <TableRow key={upload.id}>
                  <TableCell className="font-medium">{upload.fileName}</TableCell>
                  <TableCell>{formatDate(upload.uploadedAt)}</TableCell>
                  <TableCell>{upload.recordCount}</TableCell>
                  <TableCell>
                    {upload.dateRange ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-adpulse-green/70" />
                        <span>
                          {new Date(upload.dateRange.start).toLocaleDateString()} to{" "}
                          {new Date(upload.dateRange.end).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        upload.status === "completed"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                      }`}
                    >
                      {upload.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100/10"
                      onClick={() => handleDelete(upload.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : isLoading ? (
          <div className="py-8 text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-adpulse-green/70" />
            <p className="mt-2">Loading upload history...</p>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p>No upload history found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload some Shopify order data to get started
            </p>
          </div>
        )}
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this upload? This action cannot be undone and will
              permanently remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ShopifyUploadHistory;
