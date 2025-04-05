import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const testFile = searchParams.get('file');
  
  if (!testFile) {
    return NextResponse.json(
      { error: 'Fichier de test non spécifié' },
      { status: 400 }
    );
  }

  try {
    const testResults = await runTest(testFile);
    return NextResponse.json({ success: true, results: testResults });
  } catch (error) {
    console.error('Erreur lors de l\'exécution du test:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'exécution du test', details: error.message },
      { status: 500 }
    );
  }
}

async function runTest(testFile: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Chemin vers le fichier de test
    const testFilePath = path.join(process.cwd(), 'src', 'app', 'test', `${testFile}.tsx`);
    
    // Commande pour exécuter Jest avec le fichier spécifié
    const jestProcess = spawn('npx', ['jest', testFilePath, '--no-cache'], {
      env: { ...process.env, NODE_ENV: 'test' },
    });
    
    let output = '';
    let errorOutput = '';
    
    jestProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
    });
    
    jestProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      errorOutput += chunk;
    });
    
    jestProcess.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Test a échoué avec le code ${code}. Erreur: ${errorOutput}`));
      }
    });
    
    jestProcess.on('error', (err) => {
      reject(new Error(`Erreur lors du lancement de Jest: ${err.message}`));
    });
  });
} 