'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { UserActionType } from '@/types/admin';
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Loader2Icon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Cog,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Download,
  Lock,
  Mail,
} from 'lucide-react';

interface UserBulkActionsProps {
  selectedUserIds: string[];
  onActionComplete: () => void;
  disabled?: boolean;
}

export default function UserBulkActions({
  selectedUserIds,
  onActionComplete,
  disabled = false,
}: UserBulkActionsProps) {
  const t = useTranslations('Admin.verification.users.bulkActions');
  const { toast } = useToast();
  const router = useRouter();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<UserActionType | ''>('');
  const [reason, setReason] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [notifyUsers, setNotifyUsers] = useState(true);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [additionalData, setAdditionalData] = useState<Record<string, any>>({});
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);

  // Mutation tRPC pour exécuter des actions en masse
  const bulkActionMutation = api.adminUser.bulkUserAction.useMutation({
    onSuccess: () => {
      toast({
        title: t('success.title'),
        description: t('success.description', { count: selectedUserIds.length }),
      });
      setIsDialogOpen(false);
      onActionComplete();
      resetForm();
    },
    onError: error => {
      toast({
        variant: 'destructive',
        title: t('error.title'),
        description: error.message || t('error.description'),
      });
    },
  });

  const resetForm = () => {
    setSelectedAction('');
    setReason('');
    setConfirmationCode('');
    setNotifyUsers(true);
    setScheduledDate(undefined);
    setAdditionalData({});
  };

  const handleOpenDialog = (action: UserActionType) => {
    setSelectedAction(action);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = () => {
    if (!selectedAction) return;

    // Vérifier si nous avons besoin d'un code de confirmation pour cette action
    const needsConfirmation = ['DELETE', 'SUSPEND'].includes(selectedAction);
    if (needsConfirmation && (!confirmationCode || confirmationCode !== 'CONFIRM')) {
      toast({
        variant: 'destructive',
        title: t('error.confirmationRequired.title'),
        description: t('error.confirmationRequired.description'),
      });
      return;
    }

    // Exécuter l'action en masse
    bulkActionMutation.mutate({
      userIds: selectedUserIds,
      action: selectedAction,
      reason,
      notifyUsers,
      additionalData: Object.keys(additionalData).length > 0 ? additionalData : undefined,
      scheduledFor: scheduledDate,
      confirmationCode: needsConfirmation ? confirmationCode : undefined,
    });
  };

  // Configuration des actions en fonction du type d'action sélectionné
  const getActionConfig = () => {
    if (!selectedAction) return null;

    const configs: Record<UserActionType, React.ReactNode> = {
      ACTIVATE: (
        <div className="space-y-4">
          <p>{t('actions.ACTIVATE.description')}</p>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="notify-users"
              checked={notifyUsers}
              onCheckedChange={checked => setNotifyUsers(!!checked)}
            />
            <Label htmlFor="notify-users">{t('common.notifyUsers')}</Label>
          </div>
        </div>
      ),
      DEACTIVATE: (
        <div className="space-y-4">
          <p>{t('actions.DEACTIVATE.description')}</p>
          <div className="space-y-2">
            <Label htmlFor="reason">{t('common.reason')}</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('placeholders.reason')}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="notify-users"
              checked={notifyUsers}
              onCheckedChange={checked => setNotifyUsers(!!checked)}
            />
            <Label htmlFor="notify-users">{t('common.notifyUsers')}</Label>
          </div>
        </div>
      ),
      SUSPEND: (
        <div className="space-y-4">
          <p className="text-amber-600 dark:text-amber-400">{t('actions.SUSPEND.warning')}</p>
          <div className="space-y-2">
            <Label htmlFor="reason">{t('common.reason')}</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('placeholders.reason')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t('common.suspensionDuration')}</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduledDate ? (
                    format(scheduledDate, 'PPP', { locale: fr })
                  ) : (
                    <span>{t('placeholders.selectDate')}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={scheduledDate}
                  onSelect={date => {
                    setScheduledDate(date);
                    setIsCalendarOpen(false);
                  }}
                  initialFocus
                  disabled={date => date < new Date()}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">{t('common.suspensionExplanation')}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="notify-users"
              checked={notifyUsers}
              onCheckedChange={checked => setNotifyUsers(!!checked)}
            />
            <Label htmlFor="notify-users">{t('common.notifyUsers')}</Label>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="confirmation-code" className="text-red-500">
              {t('common.confirmationCode')}
            </Label>
            <Input
              id="confirmation-code"
              value={confirmationCode}
              onChange={e => setConfirmationCode(e.target.value.toUpperCase())}
              placeholder="CONFIRM"
              className="border-red-200"
              required
            />
            <p className="text-xs text-red-500">{t('common.confirmationHelp')}</p>
          </div>
        </div>
      ),
      FORCE_PASSWORD_RESET: (
        <div className="space-y-4">
          <p>{t('actions.FORCE_PASSWORD_RESET.description')}</p>
          <div className="space-y-2">
            <Label htmlFor="reason">{t('common.reason')}</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('placeholders.reason')}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="notify-users"
              checked={notifyUsers}
              onCheckedChange={checked => setNotifyUsers(!!checked)}
            />
            <Label htmlFor="notify-users">{t('common.notifyUsers')}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="expire-tokens"
              checked={additionalData.expireExistingTokens ?? true}
              onCheckedChange={checked =>
                setAdditionalData({
                  ...additionalData,
                  expireExistingTokens: !!checked,
                })
              }
            />
            <Label htmlFor="expire-tokens">{t('common.expireTokens')}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="require-strong"
              checked={additionalData.requireStrongPassword ?? true}
              onCheckedChange={checked =>
                setAdditionalData({
                  ...additionalData,
                  requireStrongPassword: !!checked,
                })
              }
            />
            <Label htmlFor="require-strong">{t('common.requireStrongPassword')}</Label>
          </div>
        </div>
      ),
      SEND_VERIFICATION_EMAIL: (
        <div className="space-y-4">
          <p>{t('actions.SEND_VERIFICATION_EMAIL.description')}</p>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="force-resend"
              checked={additionalData.forceResend ?? true}
              onCheckedChange={checked =>
                setAdditionalData({
                  ...additionalData,
                  forceResend: !!checked,
                })
              }
            />
            <Label htmlFor="force-resend">{t('common.forceResend')}</Label>
          </div>
        </div>
      ),
      DELETE: (
        <div className="space-y-4">
          <p className="text-red-600 dark:text-red-400 font-medium">
            {t('actions.DELETE.warning')}
          </p>
          <div className="space-y-2">
            <Label htmlFor="reason">{t('common.reason')}</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('placeholders.reason')}
              required
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="notify-users"
              checked={notifyUsers}
              onCheckedChange={checked => setNotifyUsers(!!checked)}
            />
            <Label htmlFor="notify-users">{t('common.notifyUsers')}</Label>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="confirmation-code" className="text-red-500">
              {t('common.confirmationCode')}
            </Label>
            <Input
              id="confirmation-code"
              value={confirmationCode}
              onChange={e => setConfirmationCode(e.target.value.toUpperCase())}
              placeholder="CONFIRM"
              className="border-red-200"
              required
            />
            <p className="text-xs text-red-500">{t('common.confirmationHelp')}</p>
          </div>
        </div>
      ),
      ADD_TAG: (
        <div className="space-y-4">
          <p>{t('actions.ADD_TAG.description')}</p>
          <div className="space-y-2">
            <Label htmlFor="tag">{t('common.tag')}</Label>
            <Input
              id="tag"
              value={additionalData.tag || ''}
              onChange={e =>
                setAdditionalData({
                  ...additionalData,
                  tag: e.target.value,
                })
              }
              placeholder={t('placeholders.tag')}
              required
            />
          </div>
        </div>
      ),
      REMOVE_TAG: (
        <div className="space-y-4">
          <p>{t('actions.REMOVE_TAG.description')}</p>
          <div className="space-y-2">
            <Label htmlFor="tag">{t('common.tag')}</Label>
            <Input
              id="tag"
              value={additionalData.tag || ''}
              onChange={e =>
                setAdditionalData({
                  ...additionalData,
                  tag: e.target.value,
                })
              }
              placeholder={t('placeholders.tag')}
              required
            />
          </div>
        </div>
      ),
      ASSIGN_ROLE: (
        <div className="space-y-4">
          <p>{t('actions.ASSIGN_ROLE.description')}</p>
          <div className="space-y-2">
            <Label htmlFor="role">{t('common.role')}</Label>
            <Select
              value={additionalData.role || ''}
              onValueChange={value =>
                setAdditionalData({
                  ...additionalData,
                  role: value,
                })
              }
            >
              <SelectTrigger id="role">
                <SelectValue placeholder={t('placeholders.role')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">{t('roles.admin')}</SelectItem>
                <SelectItem value="CLIENT">{t('roles.client')}</SelectItem>
                <SelectItem value="DELIVERER">{t('roles.deliverer')}</SelectItem>
                <SelectItem value="MERCHANT">{t('roles.merchant')}</SelectItem>
                <SelectItem value="PROVIDER">{t('roles.provider')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="notify-users"
              checked={notifyUsers}
              onCheckedChange={checked => setNotifyUsers(!!checked)}
            />
            <Label htmlFor="notify-users">{t('common.notifyUsers')}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="create-profile"
              checked={additionalData.createRoleSpecificProfile ?? true}
              onCheckedChange={checked =>
                setAdditionalData({
                  ...additionalData,
                  createRoleSpecificProfile: !!checked,
                })
              }
            />
            <Label htmlFor="create-profile">{t('common.createProfile')}</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">{t('common.reason')}</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('placeholders.reason')}
            />
          </div>
        </div>
      ),
      ASSIGN_PERMISSION: (
        <div className="space-y-4">
          <p>{t('actions.ASSIGN_PERMISSION.description')}</p>
          <div className="space-y-2">
            <Label htmlFor="permission">{t('common.permission')}</Label>
            <Input
              id="permission"
              value={additionalData.permission || ''}
              onChange={e =>
                setAdditionalData({
                  ...additionalData,
                  permission: e.target.value,
                })
              }
              placeholder={t('placeholders.permission')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="permission-group">{t('common.permissionGroup')}</Label>
            <Input
              id="permission-group"
              value={additionalData.permissionGroup || ''}
              onChange={e =>
                setAdditionalData({
                  ...additionalData,
                  permissionGroup: e.target.value,
                })
              }
              placeholder={t('placeholders.permissionGroup')}
            />
            <p className="text-xs text-muted-foreground">{t('common.permissionGroupHelp')}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="notify-users"
              checked={notifyUsers}
              onCheckedChange={checked => setNotifyUsers(!!checked)}
            />
            <Label htmlFor="notify-users">{t('common.notifyUsers')}</Label>
          </div>
        </div>
      ),
      REVOKE_PERMISSION: (
        <div className="space-y-4">
          <p>{t('actions.REVOKE_PERMISSION.description')}</p>
          <div className="space-y-2">
            <Label htmlFor="permission">{t('common.permission')}</Label>
            <Input
              id="permission"
              value={additionalData.permission || ''}
              onChange={e =>
                setAdditionalData({
                  ...additionalData,
                  permission: e.target.value,
                })
              }
              placeholder={t('placeholders.permission')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="permission-group">{t('common.permissionGroup')}</Label>
            <Input
              id="permission-group"
              value={additionalData.permissionGroup || ''}
              onChange={e =>
                setAdditionalData({
                  ...additionalData,
                  permissionGroup: e.target.value,
                })
              }
              placeholder={t('placeholders.permissionGroup')}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="notify-users"
              checked={notifyUsers}
              onCheckedChange={checked => setNotifyUsers(!!checked)}
            />
            <Label htmlFor="notify-users">{t('common.notifyUsers')}</Label>
          </div>
        </div>
      ),
      SEND_NOTIFICATION: (
        <div className="space-y-4">
          <p>{t('actions.SEND_NOTIFICATION.description')}</p>
          <div className="space-y-2">
            <Label htmlFor="title">{t('common.title')}</Label>
            <Input
              id="title"
              value={additionalData.title || ''}
              onChange={e =>
                setAdditionalData({
                  ...additionalData,
                  title: e.target.value,
                })
              }
              placeholder={t('placeholders.title')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">{t('common.message')}</Label>
            <Textarea
              id="message"
              value={additionalData.message || ''}
              onChange={e =>
                setAdditionalData({
                  ...additionalData,
                  message: e.target.value,
                })
              }
              placeholder={t('placeholders.message')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notification-type">{t('common.notificationType')}</Label>
            <Select
              value={additionalData.type || 'INFO'}
              onValueChange={value =>
                setAdditionalData({
                  ...additionalData,
                  type: value,
                })
              }
            >
              <SelectTrigger id="notification-type">
                <SelectValue placeholder={t('placeholders.notificationType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INFO">{t('notificationTypes.info')}</SelectItem>
                <SelectItem value="SUCCESS">{t('notificationTypes.success')}</SelectItem>
                <SelectItem value="WARNING">{t('notificationTypes.warning')}</SelectItem>
                <SelectItem value="ERROR">{t('notificationTypes.error')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notification-channel">{t('common.notificationChannel')}</Label>
            <Select
              value={additionalData.channel || 'EMAIL'}
              onValueChange={value =>
                setAdditionalData({
                  ...additionalData,
                  channel: value,
                })
              }
            >
              <SelectTrigger id="notification-channel">
                <SelectValue placeholder={t('placeholders.notificationChannel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMAIL">{t('channels.email')}</SelectItem>
                <SelectItem value="PUSH">{t('channels.push')}</SelectItem>
                <SelectItem value="SMS">{t('channels.sms')}</SelectItem>
                <SelectItem value="IN_APP">{t('channels.inApp')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
      EXPORT_DATA: (
        <div className="space-y-4">
          <p>{t('actions.EXPORT_DATA.description')}</p>
          <div className="space-y-2">
            <Label htmlFor="export-format">{t('common.format')}</Label>
            <Select
              value={additionalData.format || 'csv'}
              onValueChange={value =>
                setAdditionalData({
                  ...additionalData,
                  format: value,
                })
              }
            >
              <SelectTrigger id="export-format">
                <SelectValue placeholder={t('placeholders.format')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-headers"
              checked={additionalData.includeHeaders ?? true}
              onCheckedChange={checked =>
                setAdditionalData({
                  ...additionalData,
                  includeHeaders: !!checked,
                })
              }
            />
            <Label htmlFor="include-headers">{t('common.includeHeaders')}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-sensitive"
              checked={additionalData.includeSensitiveData ?? false}
              onCheckedChange={checked =>
                setAdditionalData({
                  ...additionalData,
                  includeSensitiveData: !!checked,
                })
              }
            />
            <Label htmlFor="include-sensitive">{t('common.includeSensitive')}</Label>
          </div>
        </div>
      ),
      BAN: (
        <div className="space-y-4">
          <p className="text-red-600 dark:text-red-400 font-medium">{t('actions.BAN.warning')}</p>
          <div className="space-y-2">
            <Label htmlFor="reason">{t('common.reason')}</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('placeholders.reason')}
              required
            />
          </div>
        </div>
      ),
      UNBAN: (
        <div className="space-y-4">
          <p>{t('actions.UNBAN.description')}</p>
        </div>
      ),
    };

    return configs[selectedAction];
  };

  const isLoading = bulkActionMutation.isLoading;
  const noUsersSelected = selectedUserIds.length === 0;

  // Fonction pour exécuter l'action
  const executeAction = () => {
    if (!currentAction || selectedUserIds.length === 0) return;

    bulkActionMutation.mutate({
      userIds: selectedUserIds,
      action: currentAction,
      notifyUsers: true,
    });
  };

  // Fonction pour préparer l'action
  const prepareAction = (action: string) => {
    setCurrentAction(action);
    setIsConfirmDialogOpen(true);
  };

  // Titre de confirmation dynamique en fonction de l'action
  const getConfirmationTitle = () => {
    if (!currentAction) return '';

    switch (currentAction) {
      case 'ACTIVATE':
        return 'Activer les utilisateurs sélectionnés';
      case 'DEACTIVATE':
        return 'Désactiver les utilisateurs sélectionnés';
      case 'SUSPEND':
        return 'Suspendre les utilisateurs sélectionnés';
      case 'DELETE':
        return 'Supprimer les utilisateurs sélectionnés';
      case 'FORCE_PASSWORD_RESET':
        return 'Forcer la réinitialisation des mots de passe';
      case 'SEND_VERIFICATION_EMAIL':
        return 'Envoyer des emails de vérification';
      case 'BAN':
        return 'Bannir les utilisateurs sélectionnés';
      case 'UNBAN':
        return 'Débannir les utilisateurs sélectionnés';
      default:
        return "Confirmer l'action";
    }
  };

  // Description de confirmation dynamique en fonction de l'action
  const getConfirmationDescription = () => {
    if (!currentAction) return '';

    const userCount = selectedUserIds.length;

    switch (currentAction) {
      case 'ACTIVATE':
        return `Êtes-vous sûr de vouloir activer les ${userCount} utilisateurs sélectionnés ? Ils pourront se connecter à la plateforme.`;
      case 'DEACTIVATE':
        return `Êtes-vous sûr de vouloir désactiver les ${userCount} utilisateurs sélectionnés ? Ils ne pourront plus se connecter à la plateforme.`;
      case 'SUSPEND':
        return `Êtes-vous sûr de vouloir suspendre les ${userCount} utilisateurs sélectionnés ? Cela restreindra immédiatement leur accès à la plateforme.`;
      case 'DELETE':
        return `Êtes-vous sûr de vouloir supprimer les ${userCount} utilisateurs sélectionnés ? Cette action est irréversible.`;
      case 'FORCE_PASSWORD_RESET':
        return `Êtes-vous sûr de vouloir forcer la réinitialisation des mots de passe pour les ${userCount} utilisateurs sélectionnés ? Ils recevront un email avec un lien de réinitialisation.`;
      case 'SEND_VERIFICATION_EMAIL':
        return `Êtes-vous sûr de vouloir envoyer des emails de vérification aux ${userCount} utilisateurs sélectionnés ?`;
      case 'BAN':
        return `Êtes-vous sûr de vouloir bannir les ${userCount} utilisateurs sélectionnés ? Ils ne pourront plus accéder à la plateforme.`;
      case 'UNBAN':
        return `Êtes-vous sûr de vouloir débannir les ${userCount} utilisateurs sélectionnés ? Ils pourront à nouveau accéder à la plateforme.`;
      default:
        return `Êtes-vous sûr de vouloir effectuer cette action sur les ${userCount} utilisateurs sélectionnés ?`;
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={noUsersSelected || disabled}
            className="min-w-[140px]"
          >
            {t('button') || 'Actions en masse'} ({selectedUserIds.length})
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{t('title') || 'Actions en masse'}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleOpenDialog('ACTIVATE')}>
            {t('actions.ACTIVATE.label')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleOpenDialog('DEACTIVATE')}>
            {t('actions.DEACTIVATE.label')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleOpenDialog('SUSPEND')}>
            {t('actions.SUSPEND.label')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleOpenDialog('FORCE_PASSWORD_RESET')}>
            {t('actions.FORCE_PASSWORD_RESET.label')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleOpenDialog('SEND_VERIFICATION_EMAIL')}>
            {t('actions.SEND_VERIFICATION_EMAIL.label')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleOpenDialog('ASSIGN_ROLE')}>
            {t('actions.ASSIGN_ROLE.label')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleOpenDialog('ASSIGN_PERMISSION')}>
            {t('actions.ASSIGN_PERMISSION.label')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleOpenDialog('REVOKE_PERMISSION')}>
            {t('actions.REVOKE_PERMISSION.label')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleOpenDialog('ADD_TAG')}>
            {t('actions.ADD_TAG.label')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleOpenDialog('REMOVE_TAG')}>
            {t('actions.REMOVE_TAG.label')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleOpenDialog('SEND_NOTIFICATION')}>
            {t('actions.SEND_NOTIFICATION.label')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleOpenDialog('EXPORT_DATA')}>
            {t('actions.EXPORT_DATA.label')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleOpenDialog('DELETE')}
            className="text-red-600 focus:text-red-600"
          >
            {t('actions.DELETE.label')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleOpenDialog('BAN')}
            className="text-red-600 focus:text-red-600"
          >
            {t('actions.BAN.label')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleOpenDialog('UNBAN')}
            className="text-red-600 focus:text-red-600"
          >
            {t('actions.UNBAN.label')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedAction &&
                t(`actions.${selectedAction}.title`, {
                  count: selectedUserIds.length,
                })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmationText', { count: selectedUserIds.length }) ||
                `Vous avez sélectionné ${selectedUserIds.length} utilisateurs`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {getActionConfig()}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseDialog}>
              {t('cancel') || 'Annuler'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              disabled={isLoading}
              className={
                selectedAction === 'DELETE' || selectedAction === 'SUSPEND'
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600'
                  : ''
              }
            >
              {isLoading ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  {t('processing') || 'Traitement en cours...'}
                </>
              ) : (
                t('confirm') || 'Confirmer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getConfirmationTitle()}</DialogTitle>
            <DialogDescription>{getConfirmationDescription()}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant={currentAction === 'DELETE' ? 'destructive' : 'default'}
              onClick={executeAction}
              disabled={bulkActionMutation.isLoading}
            >
              {bulkActionMutation.isLoading ? 'Traitement en cours...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
