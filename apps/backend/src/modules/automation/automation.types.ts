export interface AutomationAction {
  type: 'NOTIFICATION' | 'VOUCHER' | 'POINTS' | 'EMAIL' | 'SMS';
  config: {
    title?: string;
    content?: string;
    voucherCode?: string;
    points?: number;
    reason?: string;
    delay?: number;
  };
}

export interface AutomationCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: any;
}

export interface CreateAutomationDto {
  name: string;
  description?: string;
  trigger: string;
  actions: AutomationAction[];
  conditions?: Record<string, any>;
  priority?: number;
  metadata?: Record<string, any>;
}

export interface TriggerAutomationDto {
  trigger: string;
  zaloUserId: string;
  context?: Record<string, any>;
}