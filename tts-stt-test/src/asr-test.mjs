/**
 * ASR（Automatic Speech Recognition）测试脚本 - 腾讯云语音识别
 *
 * 功能说明：
 *   本脚本使用腾讯云 ASR SDK，将 MP3 音频文件识别为文字。
 *   采用同步调用方式，适合短音频（60秒以内）的识别场景。
 *
 * 技术背景：
 *   语音识别（ASR）是将人类的语音转换为文本的技术。
 *   与 TTS（Text-to-Speech，语音合成）相反，ASR 是"听"音频，TTS 是"说"文本。
 *
 * 使用前提：
 *   - 在 .env 中配置 SECRET_ID 和 SECRET_KEY
 *   - 已安装依赖：npm install dotenv tencentcloud-sdk-nodejs
 *   - 需要一个有效的音频文件（目前支持：mp3、wav、pcm、opus、ogg 等格式）
 */

// ============ 导入依赖 ============

import "dotenv/config";   // 加载 .env 环境变量（SECRET_ID、SECRET_KEY）
import tencentcloud from "tencentcloud-sdk-nodejs"; // 腾讯云 SDK（包含 ASR 等多种服务）
import fs from "node:fs"; // Node.js 文件系统模块，用于读取音频文件

// ============ 环境变量 ============

// 从环境变量读取腾讯云密钥（请在 .env 中配置）
const SECRET_ID = process.env.SECRET_ID;
const SECRET_KEY = process.env.SECRET_KEY;

// ============ 配置常量 ============

/**
 * ASR 客户端类
 *
 * 说明：
 *   腾讯云 SDK 按服务分为多个版本，如 asr.v20190614（语音识别）
 *   这里使用 v20190614 版本的 ASR 客户端
 *
 * 腾讯云 ASR 服务版本演进：
 *   - v20190614：基础版，支持中文普通话识别
 *   - v20190812：增强版，支持更多场景和方言
 *   具体版本选择需根据实际功能需求和 SDK 支持情况决定
 */
const AsrClient = tencentcloud.asr.v20190614.Client;

/**
 * 要识别的音频文件路径
 *
 * 重要说明：
 *   - 音频格式需与 VoiceFormat 参数一致
 *   - 音频时长建议控制在 60 秒以内（超过可能影响识别效果）
 *   - 音频采样率建议为 16kHz（腾讯云推荐）
 *   - 音频文件不能为空（否则会报错 "need param 'Data'"）
 */
const AUDIO_FILE = './output.mp3';

// ============ 初始化 ASR 客户端 ============

/**
 * 创建 ASR 客户端实例
 *
 * 配置说明：
 *   - credential: 身份凭证，包含 secretId 和 secretKey
 *   - region: 地域，这里使用上海（ap-shanghai）
 *     注意：不同服务可能支持不同的区域，TTS 用北京，ASR 用上海
 *   - profile.httpProfile: HTTP 配置
 *       reqMethod: POST，ASR 接口只支持 POST 请求
 *       reqTimeout: 30 秒，请求超时时间
 */
const client = new AsrClient({
  credential: {
    secretId: SECRET_ID,
    secretKey: SECRET_KEY,
  },
  region: "ap-shanghai", // 上海区域
  profile: {
    httpProfile: {
      reqMethod: "POST",   // 请求方法：POST
      reqTimeout: 30,      // 请求超时时间：30 秒
    },
  },
});

// ============ 主函数：执行语音识别 ============

/**
 * 读取音频文件并调用 ASR 接口进行识别
 *
 * 流程说明：
 *   1. 读取本地音频文件为二进制数据
 *   2. 将二进制数据转换为 Base64 编码（腾讯云 API 要求）
 *   3. 构造识别参数（文本、语言、音频格式等）
 *   4. 调用 SentenceRecognition 接口获取识别结果
 *   5. 打印识别结果或错误信息
 *
 * 参数说明（SentenceRecognition）：
 *   - EngSerViceType: 引擎类型
 *       "16k_zh" = 16kHz 中文普通话（最常用）
 *       "16k_zh-PY" = 16kHz 中文普通话（支持拼音标注）
 *       "16k_en" = 16kHz 英语
 *       其他引擎可参考腾讯云文档
 *   - SourceType: 音频数据来源类型
 *       0 = 回调模式（URL），本例不使用
 *       1 = 音频数据直接传递（Base64），本例使用此模式
 *   - Data: Base64 编码的音频二进制数据
 *   - DataLen: 音频数据的实际字节长度（不是 Base64 字符串长度）
 *   - VoiceFormat: 音频格式（mp3、wav、pcm、opus、ogg 等）
 *
 * 完整 API 说明：
 *   https://cloud.tencent.com/document/api/1093/35643
 */
async function run() {
  // ============ 读取音频文件 ============
  /**
   * 读取音频文件并转为 Base64 字符串
   *
   * readFileSync: 同步读取文件（简单直接，适合一次性读取）
   * toString("base64"): 将二进制数据转换为 Base64 编码的字符串
   *
   * 注意：这里直接读取整个文件到内存，适合小文件（几 MB 以内）
   * 对于超大音频文件，建议使用流式读取或分片上传
   */
  const audioBase64 = fs.readFileSync(AUDIO_FILE).toString("base64");

  // ============ 构造识别参数 ============
  const params = {
    /**
     * EngSerViceType: 引擎类型
     * "16k_zh" 表示使用 16kHz 采样率的中文普通话识别引擎
     * 这是最常用引擎，适合大多数中文语音识别场景
     */
    EngSerViceType: "16k_zh",

    /**
     * SourceType: 音频数据来源
     * 值为 1 表示音频数据直接通过 HTTP 传递（Base64 编码）
     * 另一个选项是 0，表示通过 URL 回调（腾讯云拉取远程文件）
     */
    SourceType: 1,

    /**
     * Data: Base64 编码的音频数据
     * 腾讯云要求音频数据以 Base64 字符串形式传递
     */
    Data: audioBase64,

    /**
     * DataLen: 原始音频数据的字节长度（不是 Base64 字符串长度）
     * Buffer.byteLength(base64String) 计算的是 Base64 解码后的原始字节数
     * 这个值必须准确，否则会导致识别失败
     */
    DataLen: Buffer.byteLength(audioBase64),

    /**
     * VoiceFormat: 音频格式
     * 常见的格式：mp3、wav、pcm、opus、ogg
     * 必须与实际音频文件格式一致，否则识别会失败
     */
    VoiceFormat: "mp3",
  };

  // ============ 调用识别接口 ============
  try {
    /**
     * SentenceRecognition: 句子识别接口
     *
     * 功能：将一段完整音频识别为文字（不带时间戳）
     * 适用场景：命令识别、语音输入、音频转文字等
     *
     * 返回结果（data）：
     *   - data.Result: 识别出的文本内容
     *   - data.RequestId: 请求唯一 ID（用于排查问题）
     *   - data.ChannelId: 声道 ID（单声道为 0）
     *   - 其他字段请参考官方文档
     */
    const data = await client.SentenceRecognition(params);

    // 打印识别结果
    console.log("识别结果：", data.Result);

  } catch (err) {
    /**
     * 错误处理
     *
     * 常见错误类型：
     *   - InvalidParameter: 参数错误（如 Data 为空、VoiceFormat 不匹配）
     *   - InvalidCredential: 认证失败（secretId 或 secretKey 错误）
     *   - ResourceNotFound: 找不到音频资源
     *   - RequestTimeout: 请求超时
     *   - 等等
     *
     * 错误排查提示：
     *   - "need param 'Data'"：音频数据为空（文件不存在或为空）
     *   - "InvalidParameter": 参数值不合法
     *   - "ResourceNotFound": 音频文件路径错误
     */
    console.error("识别失败：", err);
  }
}

// ============ 启动程序 ============

// 执行识别主函数
run();