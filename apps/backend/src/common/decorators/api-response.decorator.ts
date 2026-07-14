import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { SuccessResponseDto } from '../dto/api-response.dto';

export const ApiSuccessResponse = <TModel extends Type<any>>(
  model: TModel,
  isPageable = false,
) => {
  return applyDecorators(
    ApiExtraModels(SuccessResponseDto, model),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(SuccessResponseDto) },
          {
            properties: {
              data: isPageable
                ? {
                    type: 'array',
                    items: { $ref: getSchemaPath(model) },
                  }
                : { $ref: getSchemaPath(model) },
              ...(isPageable && {
                pagination: {
                  type: 'object',
                  properties: {
                    total: { type: 'integer', example: 23 },
                    page: { type: 'integer', example: 1 },
                    limit: { type: 'integer', example: 10 },
                    total_pages: { type: 'integer', example: 3 },
                  },
                },
              }),
            },
          },
        ],
      },
    }),
  );
};
