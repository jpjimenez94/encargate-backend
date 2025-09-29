import { Module } from '@nestjs/common';
import { EncargadosService } from './encargados.service';
import { EncargadosController } from './encargados.controller';

@Module({
  controllers: [EncargadosController],
  providers: [EncargadosService],
  exports: [EncargadosService],
})
export class EncargadosModule {}
