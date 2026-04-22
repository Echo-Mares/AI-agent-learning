import { Controller, Get, Query, Sse } from '@nestjs/common';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('chat')
  async chat(@Query('query') query: string) {
    const answer = await this.aiService.runChain(query);
    return { answer };
  }

  @Sse('chat/stream')
  chatStream(@Query('query') query: string) {
    return from(this.aiService.streamChain(query)).pipe(
      map((chunk) => ({
        data: chunk,
      })),
    );
  }
}
