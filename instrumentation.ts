export async function register() {
  // 在本地开发或显式启用时启动调度器
  if (process.env.ENABLE_SCHEDULER === 'true' || process.env.NODE_ENV === 'development') {
    const { startScheduler } = await import('./src/lib/scheduler');
    startScheduler();
  }
}
