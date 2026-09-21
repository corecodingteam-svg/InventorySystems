import { Module } from '@nestjs/common';
import { SerialNumbersService } from './serial-numbers.service';
import { SerialNumbersController } from './serial-numbers.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [SerialNumbersService],
  controllers: [SerialNumbersController],
})
export class SerialNumbersModule {}
