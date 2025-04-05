import { ReactNode } from 'react';

class ResendMock {
  async sendEmail({ 
    from, 
    to, 
    subject, 
    react, 
    text 
  }: { 
    from: string; 
    to: string | string[]; 
    subject: string; 
    react?: ReactNode; 
    text?: string;
  }) {
    return {
      id: 'mock-email-id',
      from,
      to,
      subject,
      status: 'success',
    };
  }
}

export const Resend = ResendMock;
export default new ResendMock(); 