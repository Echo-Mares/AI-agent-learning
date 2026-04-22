import { ConfigService } from '@nestjs/config';
export declare class AiService {
    private readonly chain;
    constructor(configService: ConfigService);
    runChain(query: string): Promise<string>;
    streamChain(query: string): AsyncGenerator<string>;
}
