import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CollateralMethod } from '../../../generated/prisma/enums';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveBookingContractDto {
  @ApiProperty({ example: '079123456789' })
  @IsString()
  @MaxLength(20)
  contractCccd: string;

  @ApiPropertyOptional({ enum: CollateralMethod })
  @IsOptional()
  @IsEnum(CollateralMethod)
  collateralMethod?: CollateralMethod;
}
