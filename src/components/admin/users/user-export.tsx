import { useState } from 'react';
import { Download, File, FileText, X } from 'lucide-react';
import { UserRole, UserStatus } from '@prisma/client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';
import { UserFilters } from '@/types/actors/admin';
import { useAdminUsers } from '@/hooks/admin/use-admin-users';

interface UserExportProps {
  currentFilters: UserFilters;
}

export function UserExport({ currentFilters }: UserExportProps) {
  const [open, setOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'id',
    'name',
    'email',
    'role',
    'status',
    'createdAt',
  ]);
  const [isExporting, setIsExporting] = useState(false);

  const api = useAdminUsers();

  const availableFields = [
    { key: 'id', label: 'User ID' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Created At' },
    { key: 'updatedAt', label: 'Updated At' },
    { key: 'lastLoginAt', label: 'Last Login' },
    { key: 'phoneNumber', label: 'Phone Number' },
    { key: 'isVerified', label: 'Verification Status' },
    { key: 'emailVerified', label: 'Email Verified Date' },
    { key: 'twoFactorEnabled', label: '2FA Enabled' },
    { key: 'hasPendingVerifications', label: 'Has Pending Verifications' },
    { key: 'documentsCount', label: 'Documents Count' },
    { key: 'country', label: 'Country' },
    { key: 'city', label: 'City' },
    { key: 'address', label: 'Address' },
  ];

  const handleToggleField = (field: string) => {
    setSelectedFields(current => {
      if (current.includes(field)) {
        return current.filter(f => f !== field);
      } else {
        return [...current, field];
      }
    });
  };

  const handleSelectAllFields = () => {
    setSelectedFields(availableFields.map(field => field.key));
  };

  const handleDeselectAllFields = () => {
    setSelectedFields([]);
  };

  const exportUsers = async () => {
    if (selectedFields.length === 0) {
      toast({
        title: 'No fields selected',
        description: 'Please select at least one field to export',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      const result = await api.exportUsersBasedOnFilters(
        exportFormat,
        selectedFields,
        currentFilters
      );

      // Handle the export result - this would typically be a file download
      if (result?.fileUrl) {
        window.open(result.fileUrl, '_blank');
        toast({
          title: 'Export successful',
          description: `Users exported to ${exportFormat.toUpperCase()} format successfully`,
        });
      } else {
        throw new Error('Export failed - no file URL returned');
      }

      setOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'There was an error exporting the users. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const formatTotalUsers = () => {
    const total = api.totalUsers;
    const role = currentFilters.role ? ` (${currentFilters.role.toLowerCase()})` : '';
    const status = currentFilters.status
      ? ` with status ${currentFilters.status.toLowerCase().replace('_', ' ')}`
      : '';

    return `${total} users${role}${status}`;
  };

  const getFormatIcon = (format: 'csv' | 'excel' | 'pdf') => {
    switch (format) {
      case 'csv':
        return <FileText className="h-4 w-4 mr-2" />;
      case 'excel':
        return <File className="h-4 w-4 mr-2 text-green-600" />;
      case 'pdf':
        return <File className="h-4 w-4 mr-2 text-red-600" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-1">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Users</DialogTitle>
          <DialogDescription>
            Export {formatTotalUsers()} based on your current filters
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Export Format</h3>
            <RadioGroup
              value={exportFormat}
              onValueChange={value => setExportFormat(value as 'csv' | 'excel' | 'pdf')}
              className="flex flex-row gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  CSV
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="flex items-center">
                  <File className="h-4 w-4 mr-2 text-green-600" />
                  Excel
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex items-center">
                  <File className="h-4 w-4 mr-2 text-red-600" />
                  PDF
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Fields to Export</h3>
              <div className="text-xs space-x-2">
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={handleSelectAllFields}
                >
                  Select All
                </Button>
                <span>|</span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={handleDeselectAllFields}
                >
                  Deselect All
                </Button>
              </div>
            </div>
            <ScrollArea className="h-60 rounded-md border">
              <div className="p-4 space-y-2">
                {availableFields.map(field => (
                  <div key={field.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`field-${field.key}`}
                      checked={selectedFields.includes(field.key)}
                      onCheckedChange={() => handleToggleField(field.key)}
                    />
                    <Label htmlFor={`field-${field.key}`}>{field.label}</Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={exportUsers} disabled={isExporting || selectedFields.length === 0}>
            {isExporting ? 'Exporting...' : 'Export'}
            {!isExporting && getFormatIcon(exportFormat)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
