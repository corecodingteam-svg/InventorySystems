import { IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

const FIELD_TYPES = [
  'TEXT',
  'NUMBER',
  'DECIMAL',
  'CURRENCY',
  'DATE',
  'DATETIME',
  'BOOLEAN',
  'DROPDOWN',
  'MULTI_SELECT',
  'URL',
];

export class CreateCustomFieldDefinitionDto {
  @IsString()
  @MinLength(1)
  entityType: string;

  @IsString()
  @MinLength(1)
  fieldKey: string;

  @IsString()
  @MinLength(1)
  label: string;

  @IsIn(FIELD_TYPES)
  fieldType: string;

  @IsOptional()
  @IsArray()
  options?: string[];

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateCustomFieldDefinitionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @IsOptional()
  @IsArray()
  options?: string[];

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class SetCustomFieldValuesDto {
  @IsUUID()
  entityId: string;

  @IsObject()
  values: Record<string, unknown>;
}
