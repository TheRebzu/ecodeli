import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth/utils';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getUserFromSession(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const merchant = await db.merchant.findFirst({
      where: { userId: user.id }
    });

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const contract = await db.contract.findFirst({
      where: { merchantId: merchant.id },
      include: {
        amendments: {
          orderBy: { createdAt: 'desc' }
        },
        billingCycles: {
          orderBy: { periodStart: 'desc' },
          take: 6
        }
      }
    });

    if (!contract) {
      return NextResponse.json({
        contract: null,
        message: 'No contract found'
      });
    }

    return NextResponse.json({
      contract: {
        id: contract.id,
        type: contract.type,
        status: contract.status,
        version: contract.version,
        title: contract.title,
        description: contract.description,
        commissionRate: contract.commissionRate,
        minCommissionAmount: contract.minCommissionAmount,
        setupFee: contract.setupFee,
        monthlyFee: contract.monthlyFee,
        validFrom: contract.validFrom.toISOString(),
        validUntil: contract.validUntil?.toISOString(),
        autoRenewal: contract.autoRenewal,
        renewalPeriod: contract.renewalPeriod,
        maxOrdersPerMonth: contract.maxOrdersPerMonth,
        maxOrderValue: contract.maxOrderValue,
        deliveryZones: contract.deliveryZones,
        allowedServices: contract.allowedServices,
        merchantSignedAt: contract.merchantSignedAt?.toISOString(),
        adminSignedAt: contract.adminSignedAt?.toISOString(),
        signedDocumentPath: contract.signedDocumentPath,
        notes: contract.notes,
        tags: contract.tags,
        createdAt: contract.createdAt.toISOString(),
        updatedAt: contract.updatedAt.toISOString(),
        amendments: contract.amendments.map(amendment => ({
          id: amendment.id,
          version: amendment.version,
          title: amendment.title,
          description: amendment.description,
          changes: amendment.changes,
          effectiveDate: amendment.effectiveDate.toISOString(),
          merchantSignedAt: amendment.merchantSignedAt?.toISOString(),
          adminSignedAt: amendment.adminSignedAt?.toISOString(),
          createdAt: amendment.createdAt.toISOString()
        })),
        billingCycles: contract.billingCycles.map(billing => ({
          id: billing.id,
          periodStart: billing.periodStart.toISOString(),
          periodEnd: billing.periodEnd.toISOString(),
          status: billing.status,
          totalOrders: billing.totalOrders,
          totalRevenue: billing.totalRevenue,
          commissionAmount: billing.commissionAmount,
          monthlyFee: billing.monthlyFee,
          additionalFees: billing.additionalFees,
          totalAmount: billing.totalAmount,
          invoiceNumber: billing.invoiceNumber,
          dueDate: billing.dueDate?.toISOString(),
          paidAt: billing.paidAt?.toISOString()
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching merchant contract:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const user = await getUserFromSession(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action } = await request.json();

    const merchant = await db.merchant.findFirst({
      where: { userId: user.id }
    });

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const contract = await db.contract.findFirst({
      where: { merchantId: merchant.id }
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    if (action === 'sign') {
      if (contract.merchantSignedAt) {
        return NextResponse.json({ 
          error: 'Contract already signed' 
        }, { status: 400 });
      }

      const updatedContract = await db.contract.update({
        where: { id: contract.id },
        data: {
          merchantSignedAt: new Date(),
          merchantSignature: `merchant_${merchant.id}_${Date.now()}`,
          status: contract.adminSignedAt ? 'ACTIVE' : 'PENDING'
        }
      });

      await db.notification.create({
        data: {
          userId: user.id,
          type: 'SYSTEM',
          title: 'Contrat signé',
          message: 'Votre contrat a été signé électroniquement',
          priority: 'MEDIUM'
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Contract signed successfully',
        contract: {
          id: updatedContract.id,
          status: updatedContract.status,
          merchantSignedAt: updatedContract.merchantSignedAt?.toISOString()
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating merchant contract:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}