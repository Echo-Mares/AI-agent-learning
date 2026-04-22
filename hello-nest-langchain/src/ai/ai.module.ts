import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    {
      provide: 'CHAT_MODEL',
      useFactory: (configService: ConfigService) => {
        return new ChatOpenAI({
          model: configService.get('MODEL_NAME') as string,
          apiKey: configService.get('OPENAI_API_KEY') as string,
          configuration: {
            baseURL: configService.get('OPENAI_BASE_URL') as string,
          },
        });
      },
      inject: [ConfigService],
    },
  ],
})
export class AiModule {}
