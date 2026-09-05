import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class HermesSetupPromotionDto {
  @ApiProperty({ example: 20, minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent: number;

  @ApiProperty({ example: '2026-10-01', description: 'YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate phải dạng YYYY-MM-DD',
  })
  startDate: string;

  @ApiProperty({ example: '2026-10-31', description: 'YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate phải dạng YYYY-MM-DD',
  })
  endDate: string;
}

export class HermesPreviewPromotionPostDto extends HermesSetupPromotionDto {}

export class HermesPublishFanpageDto {
  @ApiProperty({ example: 'Giảm 20% tiền thuê máy ảnh tháng 10!' })
  @IsString()
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional({
    example: 'https://thuemayanhlongkhanh.com/book',
    description: 'Link kèm preview (thường là trang đặt lịch)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string;

  @ApiPropertyOptional({
    description:
      'true = đăng công khai fanpage; mặc định false (private, chỉ admin Page thấy trên Meta)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class HermesLaunchPromotionDto extends HermesSetupPromotionDto {
  @ApiPropertyOptional({
    description: 'Nội dung bài fanpage; bỏ trống để dùng mẫu tự động',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;

  @ApiPropertyOptional({
    description: 'true = đăng công khai fanpage; mặc định false (private)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @ApiPropertyOptional({
    description: 'false = chỉ setup KM trên web, không đăng fanpage',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  publishToFanpage?: boolean;
}
