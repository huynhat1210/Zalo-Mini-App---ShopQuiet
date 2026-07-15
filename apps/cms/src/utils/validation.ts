// Validation rules for different field types
export interface ValidationRule {
  type: 'required' | 'email' | 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

export interface FieldValidation {
  fieldName: string;
  rules: ValidationRule[];
}

export const validationRules: Record<string, FieldValidation[]> = {
  Product: [
    {
      fieldName: 'name',
      rules: [
        { type: 'required', message: 'Tên sản phẩm là bắt buộc' },
        { type: 'minLength', value: 3, message: 'Tên sản phẩm phải có ít nhất 3 ký tự' },
        { type: 'maxLength', value: 200, message: 'Tên sản phẩm không được quá 200 ký tự' }
      ]
    },
    {
      fieldName: 'price',
      rules: [
        { type: 'required', message: 'Giá sản phẩm là bắt buộc' },
        { type: 'min', value: 0, message: 'Giá sản phẩm phải lớn hơn hoặc bằng 0' },
        { type: 'max', value: 1000000000, message: 'Giá sản phẩm không được quá 1 tỷ' }
      ]
    },
    {
      fieldName: 'stock',
      rules: [
        { type: 'min', value: 0, message: 'Tồn kho phải lớn hơn hoặc bằng 0' },
        { type: 'max', value: 100000, message: 'Tồn kho không được quá 100,000' }
      ]
    },
    {
      fieldName: 'image',
      rules: [
        { type: 'required', message: 'URL ảnh sản phẩm là bắt buộc' },
        { 
          type: 'pattern', 
          value: /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i, 
          message: 'URL ảnh không hợp lệ (phải là jpg, jpeg, png, gif, hoặc webp)' 
        }
      ]
    }
  ],
  ProductVariant: [
    {
      fieldName: 'size',
      rules: [
        { type: 'required', message: 'Size là bắt buộc' },
        { 
          type: 'custom',
          validator: (value: string) => ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].includes(value),
          message: 'Size phải là một trong: XS, S, M, L, XL, XXL, XXXL'
        }
      ]
    },
    {
      fieldName: 'price',
      rules: [
        { type: 'required', message: 'Giá biến thể là bắt buộc' },
        { type: 'min', value: 0, message: 'Giá phải lớn hơn hoặc bằng 0' }
      ]
    },
    {
      fieldName: 'stock',
      rules: [
        { type: 'required', message: 'Tồn kho là bắt buộc' },
        { type: 'min', value: 0, message: 'Tồn kho phải lớn hơn hoặc bằng 0' }
      ]
    }
  ],
  Voucher: [
    {
      fieldName: 'code',
      rules: [
        { type: 'required', message: 'Mã voucher là bắt buộc' },
        { type: 'minLength', value: 3, message: 'Mã voucher phải có ít nhất 3 ký tự' },
        { type: 'maxLength', value: 20, message: 'Mã voucher không được quá 20 ký tự' },
        { 
          type: 'pattern', 
          value: /^[A-Z0-9]+$/, 
          message: 'Mã voucher chỉ được chứa chữ hoa và số' 
        }
      ]
    },
    {
      fieldName: 'value',
      rules: [
        { type: 'required', message: 'Giá trị voucher là bắt buộc' },
        { type: 'min', value: 0, message: 'Giá trị phải lớn hơn 0' }
      ]
    },
    {
      fieldName: 'minOrder',
      rules: [
        { type: 'min', value: 0, message: 'Đơn tối thiểu phải lớn hơn hoặc bằng 0' }
      ]
    },
    {
      fieldName: 'maxUses',
      rules: [
        { type: 'min', value: 1, message: 'Số lần sử dụng tối đa phải lớn hơn 0' }
      ]
    }
  ],
  Order: [
    {
      fieldName: 'shippingName',
      rules: [
        { type: 'required', message: 'Tên người nhận là bắt buộc' },
        { type: 'minLength', value: 2, message: 'Tên phải có ít nhất 2 ký tự' }
      ]
    },
    {
      fieldName: 'shippingPhone',
      rules: [
        { type: 'required', message: 'Số điện thoại là bắt buộc' },
        { 
          type: 'pattern', 
          value: /^[0-9]{10,11}$/, 
          message: 'Số điện thoại không hợp lệ (10-11 số)' 
        }
      ]
    },
    {
      fieldName: 'shippingAddress',
      rules: [
        { type: 'required', message: 'Địa chỉ giao hàng là bắt buộc' },
        { type: 'minLength', value: 10, message: 'Địa chỉ phải có ít nhất 10 ký tự' }
      ]
    },
    {
      fieldName: 'totalAmount',
      rules: [
        { type: 'required', message: 'Tổng tiền là bắt buộc' },
        { type: 'min', value: 0, message: 'Tổng tiền phải lớn hơn hoặc bằng 0' }
      ]
    }
  ],
  User: [
    {
      fieldName: 'name',
      rules: [
        { type: 'minLength', value: 2, message: 'Tên phải có ít nhất 2 ký tự' }
      ]
    },
    {
      fieldName: 'email',
      rules: [
        { 
          type: 'email', 
          message: 'Email không hợp lệ' 
        }
      ]
    },
    {
      fieldName: 'phone',
      rules: [
        { 
          type: 'pattern', 
          value: /^[0-9]{10,11}$/, 
          message: 'Số điện thoại không hợp lệ (10-11 số)' 
        }
      ]
    },
    {
      fieldName: 'role',
      rules: [
        { type: 'required', message: 'Vai trò là bắt buộc' },
        { 
          type: 'custom',
          validator: (value: string) => ['admin', 'user'].includes(value),
          message: 'Vai trò phải là admin hoặc user'
        }
      ]
    }
  ]
};

export const validateField = (modelName: string, fieldName: string, value: any): string[] => {
  const errors: string[] = [];
  const modelRules = validationRules[modelName];
  
  if (!modelRules) return errors;
  
  const fieldValidation = modelRules.find(f => f.fieldName === fieldName);
  if (!fieldValidation) return errors;
  
  for (const rule of fieldValidation.rules) {
    let isValid = true;
    
    switch (rule.type) {
      case 'required':
        isValid = value !== null && value !== undefined && value !== '';
        break;
      case 'email':
        isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        break;
      case 'minLength':
        isValid = value && value.length >= rule.value;
        break;
      case 'maxLength':
        isValid = !value || value.length <= rule.value;
        break;
      case 'min':
        isValid = value >= rule.value;
        break;
      case 'max':
        isValid = value <= rule.value;
        break;
      case 'pattern':
        isValid = !value || rule.value.test(value);
        break;
      case 'custom':
        isValid = rule.validator ? rule.validator(value) : true;
        break;
    }
    
    if (!isValid) {
      errors.push(rule.message);
    }
  }
  
  return errors;
};

export const validateRecord = (modelName: string, record: Record<string, any>): Record<string, string[]> => {
  const errors: Record<string, string[]> = {};
  const modelRules = validationRules[modelName];
  
  if (!modelRules) return errors;
  
  for (const fieldValidation of modelRules) {
    const fieldErrors = validateField(modelName, fieldValidation.fieldName, record[fieldValidation.fieldName]);
    if (fieldErrors.length > 0) {
      errors[fieldValidation.fieldName] = fieldErrors;
    }
  }
  
  return errors;
};

// Data quality checks
export interface DataQualityIssue {
  type: 'duplicate' | 'missing' | 'invalid' | 'inconsistent';
  field: string;
  recordId: string | number;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export const checkDataQuality = (modelName: string, records: any[]): DataQualityIssue[] => {
  const issues: DataQualityIssue[] = [];
  
  if (!records || records.length === 0) return issues;
  
  // Check for missing required fields
  const modelRules = validationRules[modelName];
  if (modelRules) {
    for (const record of records) {
      for (const fieldValidation of modelRules) {
        const hasRequiredRule = fieldValidation.rules.some(r => r.type === 'required');
        if (hasRequiredRule) {
          const value = record[fieldValidation.fieldName];
          if (value === null || value === undefined || value === '') {
            issues.push({
              type: 'missing',
              field: fieldValidation.fieldName,
              recordId: record.id || record.zaloId || record.code,
              message: `Thiếu trường bắt buộc: ${fieldValidation.fieldName}`,
              severity: 'high'
            });
          }
        }
      }
    }
  }
  
  // Check for duplicates (based on name/code)
  if (modelName === 'Product') {
    const names = records.map(r => r.name);
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    duplicates.forEach(duplicateName => {
      const duplicateRecords = records.filter(r => r.name === duplicateName);
      duplicateRecords.forEach(record => {
        issues.push({
          type: 'duplicate',
          field: 'name',
          recordId: record.id,
          message: `Tên sản phẩm trùng lặp: ${duplicateName}`,
          severity: 'medium'
        });
      });
    });
  }
  
  if (modelName === 'Voucher') {
    const codes = records.map(r => r.code);
    const duplicates = codes.filter((code, index) => codes.indexOf(code) !== index);
    duplicates.forEach(duplicateCode => {
      const duplicateRecords = records.filter(r => r.code === duplicateCode);
      duplicateRecords.forEach(record => {
        issues.push({
          type: 'duplicate',
          field: 'code',
          recordId: record.id,
          message: `Mã voucher trùng lặp: ${duplicateCode}`,
          severity: 'high'
        });
      });
    });
  }
  
  return issues;
};
