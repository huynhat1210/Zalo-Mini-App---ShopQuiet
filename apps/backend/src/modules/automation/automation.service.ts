import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface AutomationAction {
  type: 'NOTIFICATION' | 'VOUCHER' | 'POINTS' | 'EMAIL' | 'SMS';
  config: {
    title?: string;
    content?: string;
    voucherCode?: string;
    points?: number;
    reason?: string;
    delay?: number; // Delay in minutes
  };
}

interface AutomationCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: any;
}

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new automation rule
   */
  async createAutomation(data: {
    name: string;
    description?: string;
    trigger: string;
    actions: AutomationAction[];
    conditions?: Record<string, any>;
    priority?: number;
    metadata?: Record<string, any>;
  }) {
    try {
      const automation = await this.prisma.automation.create({
        data: {
          name: data.name,
          description: data.description,
          trigger: data.trigger,
          actions: data.actions as any,
          conditions: data.conditions || {},
          priority: data.priority || 0,
          metadata: data.metadata || {},
        },
      });

      this.logger.log(`Created automation: ${automation.name} (ID: ${automation.id})`);
      return automation;
    } catch (error) {
      this.logger.error('Failed to create automation:', error);
      throw error;
    }
  }

  /**
   * Get all automations
   */
  async getAllAutomations() {
    return this.prisma.automation.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Get automation by ID
   */
  async getAutomationById(id: number) {
    return this.prisma.automation.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { triggeredAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Update automation
   */
  async updateAutomation(id: number, data: Partial<{
    name: string;
    description: string;
    trigger: string;
    actions: AutomationAction[];
    conditions: Record<string, any>;
    enabled: boolean;
    priority: number;
    metadata: Record<string, any>;
  }>) {
    try {
      const automation = await this.prisma.automation.update({
        where: { id },
        data: {
          ...data,
          actions: data.actions as any,
        },
      });

      this.logger.log(`Updated automation: ${automation.name} (ID: ${automation.id})`);
      return automation;
    } catch (error) {
      this.logger.error('Failed to update automation:', error);
      throw error;
    }
  }

  /**
   * Delete automation
   */
  async deleteAutomation(id: number) {
    try {
      await this.prisma.automation.delete({
        where: { id },
      });

      this.logger.log(`Deleted automation ID: ${id}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to delete automation:', error);
      throw error;
    }
  }

  /**
   * Toggle automation enabled status
   */
  async toggleAutomation(id: number, enabled: boolean) {
    return this.updateAutomation(id, { enabled });
  }

  /**
   * Trigger automation for a specific user
   */
  async triggerAutomation(trigger: string, zaloUserId: string, context?: Record<string, any>) {
    try {
      // Get enabled automations for this trigger
      const automations = await this.prisma.automation.findMany({
        where: {
          trigger,
          enabled: true,
        },
        orderBy: { priority: 'desc' },
      });

      if (automations.length === 0) {
        this.logger.debug(`No enabled automations found for trigger: ${trigger}`);
        return { triggered: 0 };
      }

      let triggeredCount = 0;

      for (const automation of automations) {
        // Check if conditions are met
        if (await this.checkConditions(automation.conditions as Record<string, any>, zaloUserId, context)) {
          // Execute automation actions
          await this.executeAutomation(automation, zaloUserId, context);
          triggeredCount++;
        }
      }

      this.logger.log(`Triggered ${triggeredCount} automations for user ${zaloUserId}`);
      return { triggered: triggeredCount };
    } catch (error) {
      this.logger.error('Failed to trigger automation:', error);
      throw error;
    }
  }

  /**
   * Check if automation conditions are met
   */
  private async checkConditions(
    conditions: Record<string, any>,
    zaloUserId: string,
    context?: Record<string, any>,
  ): Promise<boolean> {
    if (!conditions || Object.keys(conditions).length === 0) {
      return true; // No conditions means always trigger
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { zaloId: zaloUserId },
      });

      if (!user) {
        return false;
      }

      // Check each condition
      for (const [field, condition] of Object.entries(conditions)) {
        const fieldValue = this.getFieldValue(user, field, context);
        const { operator, value } = condition as any;

        if (!this.evaluateCondition(fieldValue, operator, value)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to check conditions:', error);
      return false;
    }
  }

  /**
   * Get field value from user or context
   */
  private getFieldValue(user: any, field: string, context?: Record<string, any>): any {
    // Check context first
    if (context && context[field] !== undefined) {
      return context[field];
    }

    // Check user fields
    const fieldMap: Record<string, string> = {
      'membershipTier': 'membershipTier',
      'totalSpent': 'totalSpent',
      'gamificationPoints': 'gamificationPoints',
      'role': 'role',
      'createdAt': 'createdAt',
      'birthday': 'birthday',
    };

    const userField = fieldMap[field] || field;
    return user[userField];
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(fieldValue: any, operator: string, value: any): boolean {
    switch (operator) {
      case 'eq':
        return fieldValue === value;
      case 'ne':
        return fieldValue !== value;
      case 'gt':
        return fieldValue > value;
      case 'lt':
        return fieldValue < value;
      case 'gte':
        return fieldValue >= value;
      case 'lte':
        return fieldValue <= value;
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'contains':
        return String(fieldValue).includes(value);
      default:
        return true;
    }
  }

  /**
   * Execute automation actions
   */
  private async executeAutomation(
    automation: any,
    zaloUserId: string,
    context?: Record<string, any>,
  ) {
    try {
      const actions = automation.actions as AutomationAction[];
      const results: any[] = [];

      for (const action of actions) {
        // Handle delay if specified
        if (action.config.delay && action.config.delay > 0) {
          await this.delay(action.config.delay * 60 * 1000); // Convert minutes to milliseconds
        }

        const result = await this.executeAction(action, zaloUserId, context);
        results.push(result);
      }

      // Log successful execution
      await this.prisma.automationLog.create({
        data: {
          automationId: automation.id,
          zaloUserId,
          status: 'SUCCESS',
          executedAt: new Date(),
          result: results as any,
        },
      });

      this.logger.log(`Successfully executed automation ${automation.id} for user ${zaloUserId}`);
    } catch (error) {
      // Log failed execution
      await this.prisma.automationLog.create({
        data: {
          automationId: automation.id,
          zaloUserId,
          status: 'FAILED',
          errorMessage: error.message,
        },
      });

      this.logger.error(`Failed to execute automation ${automation.id}:`, error);
      throw error;
    }
  }

  /**
   * Execute single action
   */
  private async executeAction(action: AutomationAction, zaloUserId: string, context?: Record<string, any>) {
    switch (action.type) {
      case 'NOTIFICATION':
        return this.executeNotificationAction(action, zaloUserId);
      case 'VOUCHER':
        return this.executeVoucherAction(action, zaloUserId);
      case 'POINTS':
        return this.executePointsAction(action, zaloUserId);
      case 'EMAIL':
        return this.executeEmailAction(action, zaloUserId);
      case 'SMS':
        return this.executeSmsAction(action, zaloUserId);
      default:
        this.logger.warn(`Unknown action type: ${action.type}`);
        return { success: false, message: 'Unknown action type' };
    }
  }

  /**
   * Execute notification action
   */
  private async executeNotificationAction(action: AutomationAction, zaloUserId: string) {
    const { title, content } = action.config;

    const notification = await this.prisma.notification.create({
      data: {
        zaloUserId,
        title: title || 'Thông báo từ ShopQuiet',
        content: content || '',
        type: 'AUTOMATION',
        date: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }) + ' - ' + new Date().toLocaleDateString('vi-VN'),
      },
    });

    return { success: true, notificationId: notification.id };
  }

  /**
   * Execute voucher action
   */
  private async executeVoucherAction(action: AutomationAction, zaloUserId: string) {
    const { voucherCode } = action.config;

    if (!voucherCode) {
      return { success: false, message: 'Voucher code not provided' };
    }

    // Check if voucher exists
    const voucher = await this.prisma.voucher.findUnique({
      where: { code: voucherCode },
    });

    if (!voucher) {
      return { success: false, message: 'Voucher not found' };
    }

    // Create notification with voucher info
    await this.prisma.notification.create({
      data: {
        zaloUserId,
        title: `Bạn nhận được Voucher ${voucherCode}!`,
        content: `Mã giảm giá ${voucher.value.toLocaleString('vi-VN')}đ cho đơn từ ${voucher.minOrderVal.toLocaleString('vi-VN')}đ. Hãy mua sắm ngay nhé!`,
        type: 'VOUCHER',
        date: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }) + ' - ' + new Date().toLocaleDateString('vi-VN'),
      },
    });

    return { success: true, voucherCode };
  }

  /**
   * Execute points action
   */
  private async executePointsAction(action: AutomationAction, zaloUserId: string) {
    const { points, reason } = action.config;

    if (!points || points <= 0) {
      return { success: false, message: 'Invalid points value' };
    }

    // Add points to user
    await this.prisma.user.update({
      where: { zaloId: zaloUserId },
      data: {
        gamificationPoints: {
          increment: points,
        },
      },
    });

    // Create points history record
    await this.prisma.pointsHistory.create({
      data: {
        zaloUserId,
        points,
        reason: reason || 'Automation reward',
        metadata: { source: 'automation' },
      },
    });

    // Create notification
    await this.prisma.notification.create({
      data: {
        zaloUserId,
        title: `Bạn nhận được ${points} Xu!`,
        content: reason || 'ShopQuiet tặng bạn Xu thưởng từ chương trình tự động.',
        type: 'POINTS',
        date: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }) + ' - ' + new Date().toLocaleDateString('vi-VN'),
      },
    });

    return { success: true, points };
  }

  /**
   * Execute email action (placeholder)
   */
  private async executeEmailAction(action: AutomationAction, zaloUserId: string) {
    // TODO: Implement email sending
    this.logger.warn('Email action not yet implemented');
    return { success: false, message: 'Email action not yet implemented' };
  }

  /**
   * Execute SMS action (placeholder)
   */
  private async executeSmsAction(action: AutomationAction, zaloUserId: string) {
    // TODO: Implement SMS sending
    this.logger.warn('SMS action not yet implemented');
    return { success: false, message: 'SMS action not yet implemented' };
  }

  /**
   * Get automation statistics
   */
  async getAutomationStats(automationId: number) {
    const logs = await this.prisma.automationLog.findMany({
      where: { automationId },
    });

    const totalTriggered = logs.length;
    const successful = logs.filter((log: any) => log.status === 'SUCCESS').length;
    const failed = logs.filter((log: any) => log.status === 'FAILED').length;
    const successRate = totalTriggered > 0 ? (successful / totalTriggered) * 100 : 0;

    return {
      totalTriggered,
      successful,
      failed,
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  /**
   * Get automation logs
   */
  async getAutomationLogs(automationId: number, limit = 50) {
    return this.prisma.automationLog.findMany({
      where: { automationId },
      orderBy: { triggeredAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Create automation template
   */
  async createTemplate(data: {
    name: string;
    description?: string;
    category: string;
    trigger: string;
    actions: AutomationAction[];
    conditions?: Record<string, any>;
    isSystem?: boolean;
  }) {
    return this.prisma.automationTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        trigger: data.trigger,
        actions: data.actions as any,
        conditions: data.conditions || {},
        isSystem: data.isSystem || false,
      },
    });
  }

  /**
   * Get all templates
   */
  async getTemplates(category?: string) {
    return this.prisma.automationTemplate.findMany({
      where: category ? { category } : undefined,
      orderBy: { category: 'asc' },
    });
  }

  /**
   * Create automation from template
   */
  async createFromTemplate(templateId: number, name: string) {
    const template = await this.prisma.automationTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    return this.createAutomation({
      name,
      description: template.description || undefined,
      trigger: template.trigger,
      actions: template.actions as any,
      conditions: template.conditions as any,
    });
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Seed default automation templates
   */
  async seedDefaultTemplates() {
    const templates = [
      {
        name: 'Chào mừng thành viên mới',
        description: 'Gửi voucher chào mừng khi khách hàng mới đăng ký',
        category: 'WELCOME',
        trigger: 'NEW_USER',
        actions: [
          {
            type: 'NOTIFICATION' as const,
            config: {
              title: 'Chào mừng bạn đến với ShopQuiet!',
              content: 'Cảm ơn bạn đã tham gia ShopQuiet. Nhận ngay ưu đãi chào mừng thành viên mới!',
            },
          },
          {
            type: 'VOUCHER' as const,
            config: {
              voucherCode: 'WELCOME50K',
            },
          },
          {
            type: 'POINTS' as const,
            config: {
              points: 100,
              reason: 'Thưởng đăng ký thành viên mới',
            },
          },
        ],
        isSystem: true,
      },
      {
        name: 'Chúc mừng sinh nhật',
        description: 'Gửi voucher và Xu vào ngày sinh nhật khách hàng',
        category: 'BIRTHDAY',
        trigger: 'BIRTHDAY',
        actions: [
          {
            type: 'NOTIFICATION' as const,
            config: {
              title: 'Chúc Mừng Sinh Nhật!',
              content: 'ShopQuiet chúc bạn một ngày thật tuyệt vời. Chúng tôi có quà đặc biệt cho bạn!',
            },
          },
          {
            type: 'VOUCHER' as const,
            config: {
              voucherCode: 'BIRTHDAY100K',
            },
          },
          {
            type: 'POINTS' as const,
            config: {
              points: 100000,
              reason: 'Quà tặng sinh nhật',
            },
          },
        ],
        isSystem: true,
      },
      {
        name: 'Nhắc giỏ hàng bỏ quên (1h)',
        description: 'Nhắc khách hàng về giỏ hàng sau 1 giờ',
        category: 'CONVERSION',
        trigger: 'CART_ABANDONED',
        actions: [
          {
            type: 'NOTIFICATION' as const,
            config: {
              title: 'Giỏ hàng của bạn đang chờ!',
              content: 'Bạn có sản phẩm trong giỏ hàng. Đừng bỏ lỡ nhé!',
              delay: 60, // 1 hour
            },
          },
          {
            type: 'VOUCHER' as const,
            config: {
              voucherCode: 'CART10',
              delay: 60,
            },
          },
        ],
        isSystem: true,
      },
      {
        name: 'Chăm sóc khách hàng VIP',
        description: 'Ưu đãi đặc biệt cho khách hàng VIP',
        category: 'VIP',
        trigger: 'MEMBERSHIP_UPGRADE',
        conditions: {
          membershipTier: {
            operator: 'in',
            value: ['Vàng', 'Kim cương'],
          },
        },
        actions: [
          {
            type: 'NOTIFICATION' as const,
            config: {
              title: 'Chúc mừng bạn thăng hạng!',
              content: 'Bạn đã trở thành khách hàng VIP của ShopQuiet. Nhận ngay ưu đãi đặc biệt!',
            },
          },
          {
            type: 'POINTS' as const,
            config: {
              points: 5000,
              reason: 'Thưởng thăng hạng thành viên',
            },
          },
        ],
        isSystem: true,
      },
    ];

    for (const template of templates) {
      const existing = await this.prisma.automationTemplate.findFirst({
        where: { name: template.name },
      });

      if (!existing) {
        await this.createTemplate(template);
        this.logger.log(`Created template: ${template.name}`);
      }
    }

    const automationCount = await this.prisma.automation.count();
    if (automationCount === 0) {
      for (const template of templates) {
        await this.createAutomation({
          name: template.name,
          description: template.description,
          trigger: template.trigger,
          actions: template.actions as any,
          conditions: template.conditions || {},
          priority: 0,
        });
      }
      this.logger.log('Seeded default active automations.');
    }
  }
}