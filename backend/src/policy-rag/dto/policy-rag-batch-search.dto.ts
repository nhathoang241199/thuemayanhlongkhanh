import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, MaxLength } from 'class-validator';

export class PolicyRagBatchSearchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  questions!: string[];
}
