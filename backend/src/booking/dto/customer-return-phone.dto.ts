import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CustomerReturnPhoneDto {
  @ApiProperty({ example: '0901234567' })
  @IsString()
  @MinLength(9)
  @MaxLength(20)
  phone: string;
}
