import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { GeminiAiOpsService } from './gemini-ai-ops.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

export class MarkAlertReadDto {
  @ApiProperty({ example: 'alert_123', required: false, description: 'ID của cảnh báo vận hành cần đánh dấu đọc' })
  alertId?: string;
}

export class ExecuteAiActionDto {
  @ApiProperty({ example: 'UPDATE_STOCK', description: 'Loại hành động tự động hóa AI' })
  actionType: string;

  @ApiProperty({ example: { productId: 1, stock: 50 }, description: 'Dữ liệu payload chi tiết' })
  payload: any;

  @ApiProperty({ example: 'alert_123', required: false, description: 'ID cảnh báo liên quan' })
  alertId?: string;
}

export class AskGeminiDto {
  @ApiProperty({ example: 'Phân tích doanh thu 7 ngày qua và đưa ra gợi ý tối ưu', description: 'Câu hỏi / Yêu cầu gửi cho AI trợ lý' })
  prompt: string;

  @ApiProperty({ example: {}, required: false, description: 'Bối cảnh dữ liệu đính kèm' })
  contextData?: any;
}

@ApiTags('CMS Admin')
@Controller('cms/ai-ops')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class GeminiAiOpsController {
  constructor(private readonly geminiAiOpsService: GeminiAiOpsService) {}

  @ApiOperation({ summary: 'Lấy danh sách các cảnh báo vận hành cửa hàng trực tiếp từ AI Ops' })
  @Get('alerts')
  async getAlerts() {
    return this.geminiAiOpsService.getLiveOperationalAlerts();
  }

  @ApiOperation({ summary: 'Đánh dấu cảnh báo vận hành là đã xem' })
  @Post('mark-read')
  async markRead(@Body() dto: MarkAlertReadDto) {
    this.geminiAiOpsService.markAlertsAsRead(dto.alertId);
    return { success: true };
  }

  @ApiOperation({ summary: 'Thực thi hành động tự động đề xuất bởi AI Ops' })
  @Post('execute-action')
  async executeAction(@Body() dto: ExecuteAiActionDto) {
    return this.geminiAiOpsService.executeAction(dto.actionType, dto.payload, dto.alertId);
  }

  @ApiOperation({ summary: 'Hỏi đáp trực tiếp với AI Trợ Lý Vận Hành Gemini' })
  @Post('ask-gemini')
  async askGemini(@Body() dto: AskGeminiDto) {
    const reply = await this.geminiAiOpsService.askGemini(dto.prompt, dto.contextData);
    return { reply };
  }
}
