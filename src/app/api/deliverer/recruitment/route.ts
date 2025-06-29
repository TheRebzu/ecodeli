import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth/utils';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getUserFromSession(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || user.id;

    // Vérifier les permissions
    if (userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Récupérer la candidature de recrutement
    const application = await db.delivererRecruitment.findFirst({
      where: { userId },
      include: {
        documents: {
          orderBy: { uploadedAt: 'desc' }
        }
      }
    });

    if (!application) {
      return NextResponse.json({ application: null });
    }

    // Calculer le progrès de validation
    const requiredDocuments = ['IDENTITY_CARD', 'DRIVING_LICENSE', 'VEHICLE_REGISTRATION', 'INSURANCE'];
    const uploadedDocuments = application.documents.length;
    const approvedDocuments = application.documents.filter(d => d.status === 'APPROVED').length;
    
    let validationProgress = 0;
    validationProgress += Math.min(uploadedDocuments / requiredDocuments.length, 1) * 50; // 50% pour upload
    validationProgress += (approvedDocuments / requiredDocuments.length) * 50; // 50% pour approbation

    const transformedApplication = {
      id: application.id,
      status: application.status,
      personalInfo: {
        firstName: application.firstName,
        lastName: application.lastName,
        email: application.email,
        phone: application.phone,
        address: application.address,
        dateOfBirth: application.dateOfBirth?.toISOString().split('T')[0],
        nationality: application.nationality,
      },
      professionalInfo: {
        vehicleType: application.vehicleType,
        vehicleModel: application.vehicleModel,
        licenseNumber: application.licenseNumber,
        experience: application.experience,
        availability: application.availability || [],
        preferredZones: application.preferredZones || [],
      },
      documents: application.documents.map(doc => ({
        id: doc.id,
        type: doc.type,
        name: doc.name,
        fileName: doc.fileName,
        status: doc.status,
        uploadedAt: doc.uploadedAt.toISOString(),
        rejectionReason: doc.rejectionReason,
        downloadUrl: `/api/deliverer/recruitment/documents/${doc.id}/download`
      })),
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
      submittedAt: application.submittedAt?.toISOString(),
      reviewedAt: application.reviewedAt?.toISOString(),
      rejectionReason: application.rejectionReason,
      validationProgress: Math.round(validationProgress)
    };

    return NextResponse.json({ application: transformedApplication });
  } catch (error) {
    console.error('Error fetching recruitment application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getUserFromSession(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { userId, personalInfo, professionalInfo, submit } = data;

    // Vérifier les permissions
    if (userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Vérifier si une candidature existe déjà
    let application = await db.delivererRecruitment.findFirst({
      where: { userId }
    });

    const applicationData = {
      userId,
      firstName: personalInfo.firstName,
      lastName: personalInfo.lastName,
      email: personalInfo.email,
      phone: personalInfo.phone,
      address: personalInfo.address,
      dateOfBirth: personalInfo.dateOfBirth ? new Date(personalInfo.dateOfBirth) : null,
      nationality: personalInfo.nationality,
      vehicleType: professionalInfo.vehicleType,
      vehicleModel: professionalInfo.vehicleModel,
      licenseNumber: professionalInfo.licenseNumber,
      experience: professionalInfo.experience,
      availability: professionalInfo.availability,
      preferredZones: professionalInfo.preferredZones,
      status: submit ? 'SUBMITTED' : 'DRAFT',
      submittedAt: submit ? new Date() : null,
    };

    if (application) {
      // Ne permettre la modification que si le statut le permet
      if (application.status === 'APPROVED') {
        return NextResponse.json(
          { error: 'Cannot modify approved application' },
          { status: 400 }
        );
      }

      application = await db.delivererRecruitment.update({
        where: { id: application.id },
        data: applicationData
      });
    } else {
      application = await db.delivererRecruitment.create({
        data: applicationData
      });
    }

    // Si soumis, créer une notification pour les admins
    if (submit) {
      const admins = await db.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true }
      });

      const notifications = admins.map(admin => ({
        userId: admin.id,
        type: 'SYSTEM' as const,
        title: 'Nouvelle candidature livreur',
        message: `${personalInfo.firstName} ${personalInfo.lastName} a soumis une candidature de livreur`,
        priority: 'MEDIUM' as const,
        metadata: { applicationId: application.id }
      }));

      await db.notification.createMany({
        data: notifications
      });
    }

    return NextResponse.json({ 
      success: true, 
      applicationId: application.id,
      message: submit ? 'Application submitted successfully' : 'Application saved successfully'
    });
  } catch (error) {
    console.error('Error saving recruitment application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}