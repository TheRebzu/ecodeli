'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Wallet, 
  Euro, 
  TrendingUp, 
  Download,
  Clock,
  CheckCircle,
  X,
  AlertCircle,
  Plus,
  Minus,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react'
import { useDelivererWallet, useWithdrawals } from '../../hooks/useDelivererData'
import { WithdrawalRequestDialog } from './WithdrawalRequestDialog'
import { useTranslations } from 'next-intl'
import type { WalletTransaction } from '../../types'

export function WalletManager() {
  const { wallet, loading: walletLoading, error: walletError, fetchWallet } = useDelivererWallet()
  const { withdrawals, stats, loading: withdrawalsLoading, fetchWithdrawals } = useWithdrawals()
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false)
  const [selectedTab, setSelectedTab] = useState('overview')
  const t = useTranslations('deliverer.wallet')

  useEffect(() => {
    fetchWallet()
    fetchWithdrawals()
  }, [])

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'EARNING': return <ArrowUpRight className="w-4 h-4 text-green-600" />
      case 'WITHDRAWAL': return <ArrowDownLeft className="w-4 h-4 text-red-600" />
      case 'BONUS': return <Plus className="w-4 h-4 text-blue-600" />
      case 'FEE': return <Minus className="w-4 h-4 text-orange-600" />
      default: return <Euro className="w-4 h-4 text-gray-600" />
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'EARNING': return 'text-green-600'
      case 'WITHDRAWAL': return 'text-red-600'
      case 'BONUS': return 'text-blue-600'
      case 'FEE': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  const getWithdrawalStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'PROCESSING': return 'bg-blue-100 text-blue-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getWithdrawalStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-4 h-4" />
      case 'PROCESSING': return <Clock className="w-4 h-4" />
      case 'PENDING': return <Clock className="w-4 h-4" />
      case 'FAILED': return <X className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  if (walletLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec solde principal */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Wallet className="w-8 h-8 mr-3" />
            {t('title')}
          </CardTitle>
          <CardDescription className="text-blue-100">
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-blue-100 text-sm">{t('available_balance')}</p>
              <p className="text-4xl font-bold">
                {wallet?.balance?.toFixed(2) || '0.00'}€
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-100">{t('total_earned')}</p>
                <p className="text-xl font-semibold">
                  {wallet?.totalEarned?.toFixed(2) || '0.00'}€
                </p>
              </div>
              <div>
                <p className="text-blue-100">{t('total_withdrawn')}</p>
                <p className="text-xl font-semibold">
                  {wallet?.totalWithdrawn?.toFixed(2) || '0.00'}€
                </p>
              </div>
            </div>

            {wallet && wallet.pendingAmount > 0 && (
              <Alert className="bg-yellow-100 border-yellow-300">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  {t('pending_amount')}: {wallet.pendingAmount.toFixed(2)}€
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={() => setWithdrawalDialogOpen(true)}
              disabled={!wallet || wallet.balance < 10}
              className="w-full bg-white text-blue-600 hover:bg-gray-100"
            >
              <Download className="w-4 h-4 mr-2" />
              {t('request_withdrawal')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Erreurs */}
      {walletError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{walletError}</AlertDescription>
        </Alert>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ArrowDownLeft className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">{t('stats.total_withdrawn')}</p>
                <p className="text-xl font-bold">{stats?.totalWithdrawn?.toFixed(2) || '0.00'}€</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">{t('stats.pending_amount')}</p>
                <p className="text-xl font-bold">{stats?.pendingAmount?.toFixed(2) || '0.00'}€</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">{t('stats.processing_time')}</p>
                <p className="text-xl font-bold">{stats?.avgProcessingTime || 0}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
          <TabsTrigger value="withdrawals">{t('tabs.withdrawals')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Transactions récentes */}
          <Card>
            <CardHeader>
              <CardTitle>{t('recent_transactions')}</CardTitle>
              <CardDescription>
                {t('transactions_description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {wallet?.transactions && wallet.transactions.length > 0 ? (
                <div className="space-y-3">
                  {wallet.transactions.slice(0, 10).map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                          {transaction.type === 'WITHDRAWAL' || transaction.type === 'FEE' ? '-' : '+'}
                          {transaction.amount.toFixed(2)}€
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {t(`transaction_types.${transaction.type.toLowerCase()}`)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Euro className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">{t('no_transactions')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4">
          {/* Demandes de retrait */}
          <Card>
            <CardHeader>
              <CardTitle>{t('withdrawal_history')}</CardTitle>
              <CardDescription>
                {t('withdrawals_description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {withdrawals && withdrawals.length > 0 ? (
                <div className="space-y-3">
                  {withdrawals.map((withdrawal) => (
                    <div 
                      key={withdrawal.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {getWithdrawalStatusIcon(withdrawal.status)}
                        <div>
                          <p className="font-medium">{withdrawal.amount.toFixed(2)}€</p>
                          <p className="text-sm text-gray-500">{withdrawal.bankAccount}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(withdrawal.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge className={getWithdrawalStatusColor(withdrawal.status)}>
                          {t(`withdrawal_status.${withdrawal.status.toLowerCase()}`)}
                        </Badge>
                        <p className="text-sm text-gray-500 mt-1">
                          {t('net_amount')}: {withdrawal.netAmount.toFixed(2)}€
                        </p>
                        <p className="text-xs text-gray-400">
                          {t('fees')}: {withdrawal.fee.toFixed(2)}€
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Download className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">{t('no_withdrawals')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de demande de retrait */}
      <WithdrawalRequestDialog
        isOpen={withdrawalDialogOpen}
        onClose={() => setWithdrawalDialogOpen(false)}
        availableBalance={wallet?.balance || 0}
        onSuccess={() => {
          fetchWallet()
          fetchWithdrawals()
          setWithdrawalDialogOpen(false)
        }}
      />
    </div>
  )
} 