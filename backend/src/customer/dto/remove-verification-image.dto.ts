import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class RemoveVerificationImageDto {
  @ApiProperty({ description: 'URL ảnh cần xóa' })
  @IsString()
  @MaxLength(2048)
  url: string;
}
