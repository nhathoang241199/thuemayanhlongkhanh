import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PolicyRagQuestionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  question!: string;
}
