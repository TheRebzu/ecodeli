"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Play } from "lucide-react";
import { useAnnouncements } from "@/hooks/features/use-announcements";
import { useClientDashboard } from "@/hooks/client/use-client-dashboard";
import { api } from "@/trpc/react";

export const ApiTestWidget = () => {
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>("");

  // Hooks pour tester
  const { createTestAnnouncement, announcements, isLoading: announcementsLoading } = useAnnouncements();
  const { stats, isLoading: dashboardLoading } = useClientDashboard();

  // Test direct tRPC
  const { data: profileData, isLoading: profileLoading } = api.client.getProfile.useQuery();

  const runTest = async (testName: string, testFn: () => Promise<boolean>) => {
    setCurrentTest(testName);
    try {
      const result = await testFn();
      setTestResults(prev => ({ ...prev, [testName]: result }));
      return result;
    } catch (error) {
      console.error(`Test ${testName} failed:`, error);
      setTestResults(prev => ({ ...prev, [testName]: false }));
      return false;
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults({});
    
    const tests = [
      {
        name: "Profile API",
        test: async () => {
          // Le profil devrait déjà être chargé
          return profileData !== undefined;
        }
      },
      {
        name: "Dashboard Stats",
        test: async () => {
          return stats !== undefined;
        }
      },
      {
        name: "Announcements List",
        test: async () => {
          return announcements !== undefined;
        }
      },
      {
        name: "Create Test Announcement",
        test: async () => {
          try {
            const result = await createTestAnnouncement();
            return result !== null && result !== undefined;
          } catch (error) {
            console.error("Test announcement creation failed:", error);
            return false;
          }
        }
      }
    ];

    for (const test of tests) {
      await runTest(test.name, test.test);
      // Pause entre les tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
    setCurrentTest("");
  };

  const getTestStatus = (testName: string) => {
    if (currentTest === testName) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    if (testResults[testName] === true) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (testResults[testName] === false) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    return <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />;
  };

  const successCount = Object.values(testResults).filter(result => result).length;
  const totalTests = Object.keys(testResults).length;
  const successRate = totalTests > 0 ? Math.round((successCount / totalTests) * 100) : 0;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Test des API Client
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* État actuel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{successCount}/{Math.max(totalTests, 4)}</div>
            <div className="text-sm text-muted-foreground">Tests réussis</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{successRate}%</div>
            <div className="text-sm text-muted-foreground">Taux de réussite</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{announcements?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Annonces</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats?.totalAnnouncements || 0}</div>
            <div className="text-sm text-muted-foreground">Total stats</div>
          </div>
        </div>

        {/* Bouton de test */}
        <Button 
          onClick={runAllTests} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Tests en cours...
            </>
          ) : (
            "Lancer tous les tests"
          )}
        </Button>

        {/* Résultats des tests */}
        <div className="space-y-2">
          <h4 className="font-medium">État des tests :</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 border rounded">
              <span>Profile API</span>
              <div className="flex items-center gap-2">
                {getTestStatus("Profile API")}
                <Badge variant={profileLoading ? "secondary" : "outline"}>
                  {profileData ? "Données chargées" : "En attente"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 border rounded">
              <span>Dashboard Stats</span>
              <div className="flex items-center gap-2">
                {getTestStatus("Dashboard Stats")}
                <Badge variant={dashboardLoading ? "secondary" : "outline"}>
                  {stats ? "Stats disponibles" : "En cours"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 border rounded">
              <span>Liste des annonces</span>
              <div className="flex items-center gap-2">
                {getTestStatus("Announcements List")}
                <Badge variant={announcementsLoading ? "secondary" : "outline"}>
                  {announcements ? `${announcements.length} trouvées` : "Chargement"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 border rounded">
              <span>Création d'annonce test</span>
              <div className="flex items-center gap-2">
                {getTestStatus("Create Test Announcement")}
                <Badge variant="outline">
                  Test mutation
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Résumé */}
        {totalTests > 0 && (
          <Alert className={successRate >= 75 ? "border-green-500 bg-green-50" : "border-yellow-500 bg-yellow-50"}>
            <AlertDescription>
              {successRate >= 75 ? (
                <>✅ Excellent ! L'API fonctionne correctement ({successRate}% de réussite)</>
              ) : (
                <>⚠️ Quelques problèmes détectés. Taux de réussite : {successRate}%</>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};