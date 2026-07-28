import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GeminiAiOpsService } from './gemini-ai-ops.service';

@ApiTags('CMS Admin')
@Controller('cms/ai-ops')
export class GeminiAiOpsController {
  constructor(private readonly geminiAiOpsService: GeminiAiOpsService) {}

  @Get('alerts')
  async getAlerts() {
    return this.geminiAiOpsService.getLiveOperationalAlerts();
  }

  @Post('mark-read')
  async markRead(@Body() body: { alertId?: string }) {
    this.geminiAiOpsService.markAlertsAsRead(body.alertId);
    return { success: true };
  }

  @Post('execute-action')
  async executeAction(@Body() body: { actionType: string; payload: any; alertId?: string }) {
    return this.geminiAiOpsService.executeAction(body.actionType, body.payload, body.alertId);
  }

  @Post('ask-gemini')
  async askGemini(@Body() body: { prompt: string; contextData?: any }) {
    const reply = await this.geminiAiOpsService.askGemini(body.prompt, body.contextData);
    return { reply };
  }
}
