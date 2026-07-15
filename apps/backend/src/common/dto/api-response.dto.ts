import { ApiProperty } from '@nestjs/swagger';

export class MetaDto {
  @ApiProperty({ example: '73292a8d-48c9-4545-932b-299c0952c320', description: 'Unique request identifier' })
  request_id: string;

  @ApiProperty({ example: 'bea56618-05d7-4aa9-bd77-6e23bf0e7c36', description: 'Trace ID for monitoring' })
  trace_id: string;
}

export class PaginationDto {
  @ApiProperty({ example: 23, description: 'Total records matching query' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 10, description: 'Page limit' })
  limit: number;

  @ApiProperty({ example: 3, description: 'Total pages available' })
  total_pages: number;
}

export class SuccessResponseDto<T> {
  @ApiProperty({ example: 'Request successful', description: 'Status message' })
  message: string;

  @ApiProperty({ description: 'Response data payload', required: false, type: () => Object })
  data: T;

  @ApiProperty({ type: MetaDto })
  meta: MetaDto;

  @ApiProperty({ type: PaginationDto, required: false })
  pagination?: PaginationDto;
}

export class ErrorDetailDto {
  @ApiProperty({ example: 'Invalid email format', description: 'Error message details' })
  message: string;

  @ApiProperty({ example: 'email', description: 'Target field containing error' })
  field: string;

  @ApiProperty({ example: 'INVALID_EMAIL', description: 'Unique error code identifier' })
  code: string;
}

export class ErrorResponseDto {
  @ApiProperty({ example: 'Validation failed', description: 'General error summary' })
  message: string;

  @ApiProperty({ type: [ErrorDetailDto], description: 'Detailed field level errors' })
  errors: ErrorDetailDto[];

  @ApiProperty({ type: MetaDto })
  meta: MetaDto;
}
