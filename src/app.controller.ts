import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'encargate-api',
    };
  }

  @Get()
  getHello() {
    return {
      message: 'Encárgate API is running!',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        docs: '/api/docs',
        api: '/api',
      },
    };
  }
}
