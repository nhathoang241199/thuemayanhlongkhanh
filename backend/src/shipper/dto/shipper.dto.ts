import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateShipperDto {
  @ApiProperty({ example: '0901234567' })
  @IsString()
  @MinLength(9)
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: 'Anh Tùng' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'mat-khau-ship' })
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password: string;
}

export class UpdateShipperDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Để trống = không đổi mật khẩu' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Số dư mới bằng VND' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  balanceVnd?: number;

  @ApiPropertyOptional({
    description: 'true = huỷ gắn Messenger PSID của shipper',
  })
  @IsOptional()
  @IsBoolean()
  clearMessengerPsid?: boolean;
}

export class ShipperLoginDto {
  @ApiProperty({ example: '0901234567' })
  @IsString()
  @MinLength(9)
  @MaxLength(20)
  phone: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  password: string;
}

