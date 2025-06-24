import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

export type UserRole = 'CLIENT' | 'DELIVERER' | 'MERCHANT' | 'PROVIDER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export function withAuth(
  handler: (req: NextRequest & { auth: { user: AuthUser } }) => Promise<NextResponse>,
  allowedRoles?: UserRole[]
) {
  return async (req: NextRequest) => {
    try {
      const token = req.headers.get('authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const decoded = verify(token, process.env.JWT_SECRET!) as AuthUser;
      
      if (allowedRoles && !allowedRoles.includes(decoded.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      
      (req as any).auth = { user: decoded };
      return handler(req as NextRequest & { auth: { user: AuthUser } });
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  };
}

export function withRoles(...roles: UserRole[]) {
  return (handler: any) => withAuth(handler, roles);
}
