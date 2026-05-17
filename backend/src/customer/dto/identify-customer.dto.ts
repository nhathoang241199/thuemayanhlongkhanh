import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class IdentifyCustomerDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: '0909123456' })
  @IsString()
  @MinLength(9)
  @MaxLength(32)
  phone: string;
}
