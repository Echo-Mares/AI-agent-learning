import { AiService } from './ai.service';
export declare class AiController {
    private readonly aiService;
    constructor(aiService: AiService);
    chat(query: string): Promise<{
        answer: string;
    }>;
    chatStream(query: string): import("rxjs").Observable<{
        data: string;
    }>;
}
