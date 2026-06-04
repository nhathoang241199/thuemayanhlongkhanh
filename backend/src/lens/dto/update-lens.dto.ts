import { PartialType } from '@nestjs/swagger';
import { CreateLensDto } from './create-lens.dto';

export class UpdateLensDto extends PartialType(CreateLensDto) {}
