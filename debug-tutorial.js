const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugTutorial() {
  try {
    console.log('🔍 Debugging Tutorial State...\n')

    // Get all clients
    const clients = await prisma.client.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    })

    console.log(`📊 Found ${clients.length} clients:`)
    clients.forEach(client => {
      console.log(`  - ${client.user.email} (${client.user.id})`)
      console.log(`    Tutorial completed: ${client.tutorialCompleted}`)
      console.log(`    Tutorial completed at: ${client.tutorialCompletedAt}`)
    })

    // Get tutorial progress
    const tutorialProgress = await prisma.clientTutorialProgress.findMany({
      include: {
        steps: true,
        feedback: true
      }
    })

    console.log(`\n📈 Tutorial Progress (${tutorialProgress.length} records):`)
    tutorialProgress.forEach(progress => {
      console.log(`  - User: ${progress.userId}`)
      console.log(`    Is completed: ${progress.isCompleted}`)
      console.log(`    Started at: ${progress.startedAt}`)
      console.log(`    Completed at: ${progress.completedAt}`)
      console.log(`    Total time spent: ${progress.totalTimeSpent}s`)
      console.log(`    Steps: ${progress.steps.length}`)
      progress.steps.forEach(step => {
        console.log(`      - Step ${step.stepId}: ${step.isCompleted ? '✅' : '❌'} (${step.timeSpent}s)`)
      })
    })

    // Check tutorial steps
    const tutorialSteps = await prisma.tutorialStep.findMany({
      orderBy: [
        { userId: 'asc' },
        { stepId: 'asc' }
      ]
    })

    console.log(`\n📝 Tutorial Steps (${tutorialSteps.length} records):`)
    const stepsByUser = {}
    tutorialSteps.forEach(step => {
      if (!stepsByUser[step.userId]) {
        stepsByUser[step.userId] = []
      }
      stepsByUser[step.userId].push(step)
    })

    Object.entries(stepsByUser).forEach(([userId, steps]) => {
      console.log(`  - User ${userId}:`)
      steps.forEach(step => {
        console.log(`    Step ${step.stepId}: ${step.isCompleted ? '✅' : '❌'} (${step.timeSpent}s)`)
      })
    })

    // Check if any client has completed tutorial
    const completedClients = clients.filter(c => c.tutorialCompleted)
    console.log(`\n✅ Clients with completed tutorial: ${completedClients.length}`)
    completedClients.forEach(client => {
      console.log(`  - ${client.user.email}`)
    })

    // Check mandatory steps completion
    console.log('\n🔍 Checking mandatory steps completion...')
    for (const client of clients) {
      const userSteps = tutorialSteps.filter(s => s.userId === client.user.id)
      const mandatorySteps = [1, 2, 4, 5] // Welcome, Profile, Announcement, Completion
      const completedMandatory = userSteps.filter(s => 
        mandatorySteps.includes(s.stepId) && s.isCompleted
      ).length
      
      console.log(`  - ${client.user.email}: ${completedMandatory}/${mandatorySteps.length} mandatory steps completed`)
      
      if (completedMandatory === mandatorySteps.length && !client.tutorialCompleted) {
        console.log(`    ⚠️  All mandatory steps completed but tutorial not marked as complete!`)
      }
    }

  } catch (error) {
    console.error('❌ Error debugging tutorial:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugTutorial() 