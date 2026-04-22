"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = require("@langchain/openai");
const prompts_1 = require("@langchain/core/prompts");
const output_parsers_1 = require("@langchain/core/output_parsers");
const config_1 = require("@nestjs/config");
let AiService = class AiService {
    chain;
    constructor(configService) {
        const prompt = prompts_1.PromptTemplate.fromTemplate('请回答以下问题：\n\n{query}');
        const model = new openai_1.ChatOpenAI({
            temperature: 0.7,
            modelName: configService.get('MODEL_NAME'),
            apiKey: configService.get('OPENAI_API_KEY'),
            configuration: {
                baseURL: configService.get('OPENAI_BASE_URL'),
            },
        });
        this.chain = prompt.pipe(model).pipe(new output_parsers_1.StringOutputParser());
    }
    runChain(query) {
        return this.chain.invoke({ query });
    }
    async *streamChain(query) {
        const stream = await this.chain.stream({ query });
        for await (const chunk of stream) {
            yield chunk;
        }
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(config_1.ConfigService)),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AiService);
//# sourceMappingURL=ai.service.js.map