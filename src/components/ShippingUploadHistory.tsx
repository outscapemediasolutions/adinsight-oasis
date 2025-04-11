
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileSpreadsheet, Trash2, AlertCircle, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db, storage } from "@/services/firebase";
import { collection, query, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { format, formatDistanceToNow } from "date-fns";

interface ShippingUploadHistoryProps {
  refreshTrigger?: number;
}

const ShippingUploadHistory = ({ refreshTrigger = 0 }: ShippingUploadHistoryProps) => {
  const { currentUser } = useAuth();
  const [uploads, setUploads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!currentUser) return;
    
    fetchUploadHistory();
  }, [currentUser, refreshTrigger]);
  
  const fetchUploadHistory = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const uploadsRef = collection(db, "users", currentUser.uid, "shippingData_meta");
      const q = query(uploadsRef, orderBy("uploadDate", "desc"));
      
      const querySnapshot = await getDocs(q);
      
      const uploadHistory: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        uploadHistory.push({
          id: doc.id,
          ...data,
          uploadDate: data.uploadDate ? data.uploadDate.toDate() : new Date()
        });
      });
      
      setUploads(uploadHistory);
    } catch (error) {
      console.error("Error fetching upload history:", error);
      toast.error("Failed to load upload history");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async (uploadId: string, downloadURL: string) => {
    if (!currentUser) return;
    
    try {
      // Delete Firestore document
      await deleteDoc(doc(db, "users", currentUser.uid, "shippingData_meta", uploadId));
      
      // Try to delete Storage file if URL is available
      if (downloadURL) {
        try {
          const storageRef = ref(storage, downloadURL);
          await deleteObject(storageRef);
        } catch (storageError) {
          console.error("Error deleting file from storage:", storageError);
          // Continue with deletion of Firestore documents even if storage deletion fails
        }
      }
      
      // Update state
      setUploads(prevUploads => prevUploads.filter(upload => upload.id !== uploadId));
      toast.success("Upload deleted successfully");
    } catch (error) {
      console.error("Error deleting upload:", error);
      toast.error("Failed to delete upload");
    }
  };
  
  if (isLoading) {
    return (
      <Card className="border border-muted/20 bg-card/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Upload History</CardTitle>
          <CardDescription>Your previous shipping data uploads</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (uploads.length === 0) {
    return (
      <Card className="border border-muted/20 bg-card/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Upload History</CardTitle>
          <CardDescription>Your previous shipping data uploads</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
          <h3 className="mt-4 text-lg font-medium">No uploads found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            You haven't uploaded any shipping data yet.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border border-muted/20 bg-card/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Upload History</CardTitle>
        <CardDescription>Your previous shipping data uploads</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File Name</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead className="text-right">Records</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {uploads.map((upload) => (
              <TableRow key={upload.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    <span className="font-medium">{upload.filename}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{format(upload.uploadDate, "MMM dd, yyyy")}</span>
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(upload.uploadDate, { addSuffix: true })}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{upload.recordCount}</TableCell>
                <TableCell className="text-right">{(upload.fileSize / 1024).toFixed(1)} KB</TableCell>
                <TableCell>
                  <button
                    onClick={() => handleDelete(upload.id, upload.downloadURL)}
                    className="hover:text-red-500 transition-colors"
                    title="Delete Upload"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ShippingUploadHistory;
