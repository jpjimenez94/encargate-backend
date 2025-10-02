import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WompiController } from './wompi.controller';
import { WompiService } from './wompi.service';
import { TokenizationService } from './tokenization.service';
import { IntegritySignatureService } from './integrity-signature.service';

@Module({
  imports: [ConfigModule],
  controllers: [WompiController],
  providers: [WompiService, TokenizationService, IntegritySignatureService],
  exports: [WompiService, TokenizationService, IntegritySignatureService],
})
export class WompiModule {}
