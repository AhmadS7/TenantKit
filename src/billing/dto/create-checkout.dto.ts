import { IsIn, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

const PLANS = ['pro', 'enterprise'] as const;

export class CreateCheckoutDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsIn(PLANS, { message: `plan must be one of: ${PLANS.join(', ')}` })
  plan: string;
}
