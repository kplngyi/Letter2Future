export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { createLetter } from '@/lib/db';
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, email, scheduledTime } = body;

    // 验证必填字段
    if (!content || !email || !scheduledTime) {
      return NextResponse.json(
        { error: '请填写所有必填字段' },
        { status: 400 }
      );
    }

    // 验证内容长度
    if (content.length > 3000) {
      return NextResponse.json(
        { error: '信件内容不能超过3000字' },
        { status: 400 }
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '请输入有效的邮箱地址' },
        { status: 400 }
      );
    }

    // 验证时间不能是过去
    const scheduled = new Date(scheduledTime);
    const now = new Date();
    if (scheduled <= now) {
      return NextResponse.json(
        { error: '发送时间必须是未来的时间' },
        { status: 400 }
      );
    }

    // 创建信件（存储为ISO格式，包含时区信息）
    const letterId = await createLetter({
      content,
      recipient_email: email,
      scheduled_time: scheduled.toISOString(),
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      letterId,
      message: '信件已成功封存，将在指定时间发送',
      scheduledTime,
    });
  } catch (error) {
    console.error('Error creating letter:', error);
    return NextResponse.json(
      { error: '创建信件失败，请稍后重试' },
      { status: 500 }
    );
  }
}
