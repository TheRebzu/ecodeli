import { NextResponse } from 'next/server';

export class ApiResponse {
  static success(data: any, status = 200) {
    return NextResponse.json({ success: true, data }, { status });
  }
  
  static error(message: string, status = 400) {
    return NextResponse.json({ success: false, error: message }, { status });
  }
  
  static paginated(data: any[], total: number, page: number, limit: number) {
    return NextResponse.json({
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  }
}
