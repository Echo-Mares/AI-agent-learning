/**
 * TTS（Text-to-Speech）测试脚本 - 腾讯云语音合成
 *
 * 功能说明：
 *   本脚本使用腾讯云 TTS SDK，将一段中文文本合成为 MP3 音频文件。
 *   采用同步调用方式，适合短文本（一般不超过 200 字符）的语音合成场景。
 *
 * 使用前提：
 *   - 在项目根目录创建 .env 文件，配置 SECRET_ID 和 SECRET_KEY
 *   - 已安装依赖：npm install dotenv tencentcloud-sdk-nodejs-tts
 */

// ============ 导入依赖 ============

import "dotenv/config"; // 加载 .env 环境变量文件（SECRET_ID、SECRET_KEY）
import tencentcloud from "tencentcloud-sdk-nodejs-tts"; // 腾讯云 TTS SDK
import fs from "node:fs"; // Node.js 文件系统模块，用于保存音频文件

// ============ 配置项 ============

// 从环境变量读取腾讯云密钥（请确保 .env 中已配置）
const secretId = process.env.SECRET_ID;
const secretKey = process.env.SECRET_KEY;

// 提取 TTS v20190823 版本客户端类（腾讯云 SDK 多版本共存，需手动指定版本）
const TtsClient = tencentcloud.tts.v20190823.Client;

// ============ 初始化 TTS 客户端 ============

/**
 * 创建 TTS 客户端实例
 *
 * 配置说明：
 *   - credential: 身份凭证，包含 secretId 和 secretKey
 *   - region: 地域，这里使用北京（ap-beijing）
 *   - profile.httpProfile.endpoint: API 地址，固定为 tts.tencentcloudapi.com
 */
const client = new TtsClient({
  credential: {
    secretId,
    secretKey,
  },
  region: "ap-beijing",
  profile: {
    httpProfile: {
      endpoint: "tts.tencentcloudapi.com",
    },
  },
});

// ============ 合成参数 ============

/**
 * 语音合成参数
 *
 * 关键参数说明：
 *   - Text: 要合成的文本内容，建议不超过 200 字符
 *   - SessionId: 会话 ID，用于追踪和区分不同的合成请求（可自定义）
 *   - VoiceType: 音色选择
 *       101016 = 女童音色
 *       其他常见音色：101001（基础女声）、101002（基础男声）、100001（慵懒女声）等
 *   - Codec: 音频编码格式，mp3 支持浏览器直接播放
 *
 * 完整参数请参考：
 *   https://cloud.tencent.com/document/api/441/19906
 */
const params = {
  Text: "下班路上，我还在为晚霞开心。突然电话响起：系统崩了。我的心一下揪紧，冲进办公室时几乎要绝望。可当大家一起排查、重启，屏幕终于恢复正常，我长长松了口气，笑着说：还好，我们没放弃。",
  SessionId: "session-001",      // 会话标识，用于请求去重和状态追踪
  VoiceType: 101016,             // 101016 = 女童音色
  Codec: "mp3",                  // 输出音频格式为 mp3
};

// ============ 发起合成请求 ============

/**
 * 调用 TextToVoice 接口进行语音合成
 *
 * 返回值说明：
 *   - data.Audio: Base64 编码的音频数据（MP3 格式）
 *   - data.RequestId: 本次请求的唯一 ID，用于排查问题
 *
 * 错误处理：
 *   - 网络错误、认证失败、参数错误等都会触发 reject
 */
client.TextToVoice(params).then(
  // ============ 成功回调 ============
  (data) => {
    // 将 Base64 字符串解码为二进制音频数据
    const audioBuffer = Buffer.from(data.Audio, "base64");

    // 输出文件路径（当前目录下的 output.mp3）
    const outputPath = "./output.mp3";

    // 将解码后的音频二进制数据写入文件
    fs.writeFile(outputPath, audioBuffer, (err) => {
      if (err) {
        // 文件写入失败（可能原因：磁盘空间不足、目录无写权限等）
        console.error("保存文件失败：", err);
      } else {
        // 成功保存，输出文件路径
        console.log("MP3 已保存至：", outputPath);
      }
    });
  },

  // ============ 失败回调 ============
  (err) => {
    // 合成失败（可能原因：文本过长、secretId/secretKey 无效、网络超时等）
    console.error("合成失败：", err);
  }
);