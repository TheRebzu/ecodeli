"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"
import { useClientDashboard } from "../hooks/useClientDashboard"
import { StorageStatusWidget } from './storage/storage-status-widget'
import { TutorialStatusWidget } from '@/features/tutorials/components/tutorial-status-widget'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function ClientDashboard() {
  const t = useTranslations()
  const { dashboardData, isLoading } = useClientDashboard()

  const quickActions = [
    {
      title: t("dashboard.actions.newAnnouncement"),
      description: t("dashboard.actions.newAnnouncementDesc"),
      href: "/client/announcements/create",
      icon: "📦",
      color: "bg-blue-500"
    },
    {
      title: t("dashboard.actions.bookService"),
      description: t("dashboard.actions.bookServiceDesc"),
      href: "/client/services",
      icon: "🔧",
      color: "bg-green-500"
    },
    {
      title: t("dashboard.actions.myDeliveries"),
      description: t("dashboard.actions.myDeliveriesDesc"),
      href: "/client/deliveries",
      icon: "🚚",
      color: "bg-orange-500"
    },
    {
      title: t("dashboard.actions.storage"),
      description: t("dashboard.actions.storageDesc"),
      href: "/client/storage",
      icon: "📦",
      color: "bg-purple-500"
    }
  ]

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="mb-6 lg:mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 lg:h-32" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t("dashboard.welcome")}
        </h1>
        <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">
          {t("dashboard.subtitle")}
        </p>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg flex-shrink-0">
                <div className="text-blue-600 dark:text-blue-400 text-lg lg:text-base">📦</div>
              </div>
              <div className="ml-3 lg:ml-4">
                <h3 className="text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("dashboard.stats.totalDeliveries")}
                </h3>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {dashboardData?.stats.totalDeliveries || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg flex-shrink-0">
                <div className="text-green-600 dark:text-green-400 font-semibold text-xs lg:text-sm">✓</div>
              </div>
              <div className="ml-3 lg:ml-4">
                <h3 className="text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("dashboard.stats.completed")}
                </h3>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {dashboardData?.stats.completedDeliveries || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg flex-shrink-0">
                <div className="text-orange-600 dark:text-orange-400 text-lg lg:text-base">🚛</div>
              </div>
              <div className="ml-3 lg:ml-4">
                <h3 className="text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("dashboard.stats.inProgress")}
                </h3>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {dashboardData?.stats.inProgressDeliveries || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg flex-shrink-0">
                <div className="text-purple-600 dark:text-purple-400 text-lg lg:text-base">💰</div>
              </div>
              <div className="ml-3 lg:ml-4">
                <h3 className="text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("dashboard.stats.totalSaved")}
                </h3>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {dashboardData?.stats.totalSaved || 0}€
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Actions rapides */}
        <div className="lg:col-span-2">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 lg:mb-4">
            Actions rapides
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 lg:p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:shadow-lg transition-shadow group"
              >
                <div className="flex items-start space-x-3 lg:space-x-4">
                  <div className={`p-2 lg:p-3 rounded-lg ${action.color} text-white text-lg lg:text-xl flex-shrink-0`}>
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-green-600 dark:group-hover:text-green-400 text-sm lg:text-base">
                      {action.title}
                    </h3>
                    <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {action.description}
                    </p>
                  </div>
                  <div className="text-gray-400 dark:text-gray-500 group-hover:text-green-600 dark:group-hover:text-green-400 text-sm lg:text-base">
                    →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Widgets latéraux */}
        <div className="mt-6 lg:mt-0 space-y-6">
          {/* Tutoriel */}
          <TutorialStatusWidget />

          {/* Box de stockage */}
          <StorageStatusWidget />

          {/* Activité récente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg lg:text-xl">
                {t("dashboard.recentActivity")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 lg:space-y-4">
                {dashboardData?.recentActivities && dashboardData.recentActivities.length > 0 ? (
                  dashboardData.recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-2 lg:space-x-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 lg:mt-2 flex-shrink-0 ${
                        activity.type === 'delivery_completed' ? 'bg-green-500' : 
                        activity.type === 'announcement_created' ? 'bg-blue-500' :
                        activity.type === 'payment_received' ? 'bg-purple-500' : 'bg-gray-500'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs lg:text-sm font-medium text-gray-900 dark:text-gray-100">
                          {activity.title}
                        </h4>
                        <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 mt-0.5 lg:mt-1">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 lg:mt-1">
                          {new Date(activity.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    {t("dashboard.noRecentActivity")}
                  </p>
                )}
              </div>
              <div className="pt-4 border-t mt-4">
                <Link 
                  href="/client/notifications"
                  className="text-xs lg:text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  {t("dashboard.viewAllNotifications")} →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}