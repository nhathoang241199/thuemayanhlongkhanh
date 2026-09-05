import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class HermesPublishBlogDto {
  @ApiProperty({ example: 'Cách chọn máy ảnh thuê cho du lịch Long Khánh' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Nội dung Markdown',
    example:
      '## Giới thiệu\n\nThuê máy ảnh tại Long Khánh giúp bạn...\n\n[Đặt lịch](/book)',
  })
  @IsString()
  @MaxLength(50000)
  content: string;

  @ApiPropertyOptional({
    example: 'cach-chon-may-anh-thue-long-khanh',
    description: 'Bỏ trống để tự sinh từ title',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug chỉ gồm chữ thường, số và dấu gạch ngang',
  })
  slug?: string;

  @ApiPropertyOptional({ description: 'Tóm tắt ngắn cho SEO / danh sách' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @ApiPropertyOptional({ description: 'Meta description (SEO)' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  seoDescription?: string;

  @ApiPropertyOptional({
    description: 'URL banner (bắt buộc trước khi xuất bản)',
    example: 'https://thuemayanhlongkhanh.com/api/uploads/blog/.../banner.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImageUrl?: string;

  @ApiPropertyOptional({
    description: 'Alias của coverImageUrl',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bannerUrl?: string;

  @ApiPropertyOptional({
    description:
      'true = xuất bản ngay lên /posts; false = chờ admin duyệt (mặc định)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}
