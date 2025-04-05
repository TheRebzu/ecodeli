import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

const prisma = mockDeep<PrismaClient>();
export default prisma; 