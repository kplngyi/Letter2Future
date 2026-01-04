import { NextResponse } from 'next/server';
import { startScheduler } from '@/lib/scheduler';

// 在服务器启动时启动调度器
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SCHEDULER === 'true') {
  startScheduler();
}

export async function GET() {
  return NextResponse.json({ status: 'Scheduler is running' });
}

export async function POST() {
  startScheduler();
  return NextResponse.json({ status: 'Scheduler started' });
}
