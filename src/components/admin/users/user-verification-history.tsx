import { format } from "date-fns";
import {
  Calendar,
  Clock,
  UserCheck,
  UserX,
  Info,
  MessageSquare} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger} from "@/components/ui/dialog";

interface VerificationHistoryItem {
  id: string;
  status: string;
  timestamp: Date;
  verifiedBy?: {
    id: string;
    name: string;
  };
  reason?: string;
}

interface UserVerificationHistoryProps {
  verificationHistory: VerificationHistoryItem[];
  isLoading: boolean;
}

export function UserVerificationHistory({
  verificationHistory,
  isLoading}: UserVerificationHistoryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-[180px] mb-2" />
          <Skeleton className="h-4 w-[250px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verification History</CardTitle>
        <CardDescription>
          Track user verification status changes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {verificationHistory.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No verification history available.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Verified By</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {verificationHistory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.status === "APPROVED" ? (
                      <Badge className="bg-green-500">
                        <UserCheck className="mr-1 h-3 w-3" />
                        Approved
                      </Badge>
                    ) : item.status === "REJECTED" ? (
                      <Badge className="bg-red-500">
                        <UserX className="mr-1 h-3 w-3" />
                        Rejected
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-500">
                        <Info className="mr-1 h-3 w-3" />
                        {item.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {format(new Date(item.timestamp), "MMM d, yyyy")}
                      <span className="mx-1 text-muted-foreground">·</span>
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {format(new Date(item.timestamp), "HH:mm")}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.verifiedBy ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="text-primary underline-offset-4 hover:underline">
                            {item.verifiedBy.name}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Admin ID: {item.verifiedBy.id}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-muted-foreground italic">
                        System
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.reason ? (
                      item.reason.length > 30 ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1 text-primary"
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              View reason
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                {item.status === "APPROVED"
                                  ? "Approval"
                                  : "Rejection"}{" "}
                                Reason
                              </DialogTitle>
                              <DialogDescription>
                                {format(
                                  new Date(item.timestamp),
                                  "MMM d, yyyy HH:mm",
                                )}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="p-4 border rounded-md bg-muted/50">
                              {item.reason}
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <span>{item.reason}</span>
                      )
                    ) : (
                      <span className="text-muted-foreground italic">
                        No reason provided
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
