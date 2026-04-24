/**
 * 流式 TTS（Text-to-Speech）测试脚本 - 腾讯云 WebSocket 实时语音合成
 *
 * 功能说明：
 *   本脚本通过 WebSocket 协议连接腾讯云 TTS 服务，实现流式、实时的语音合成。
 *   与同步 TTS（tts-test.mjs）的区别：
 *     - 同步方式：一次性发送整段文本，等待合成完成后一次性返回完整音频
 *     - 流式方式：通过 WebSocket 边发送边接收，适合长文本或需要实时反馈的场景
 *
 * 技术特点：
 *   - WebSocket 保持长连接，双向实时通信
 *   - 音频数据分块接收，边接收边写入文件
 *   - 支持分段发送文本，实现渐进式合成体验
 *
 * 使用前提：
 *   - 在 .env 中配置 SECRET_ID、SECRET_KEY、APP_ID
 *   - 已安装依赖：npm install dotenv ws
 */

// ============ 导入依赖 ============

import "dotenv/config";   // 加载 .env 环境变量（SECRET_ID、SECRET_KEY、APP_ID）
import WebSocket from "ws"; // WebSocket 客户端库，用于与腾讯云 TTS 服务建立长连接
import crypto from "node:crypto"; // Node.js 加密模块，用于生成 API 签名
import fs from "node:fs"; // 文件系统模块，用于将接收到的音频数据写入文件

// ============ 环境变量 ============

// 从环境变量读取腾讯云密钥和 AppID（请在 .env 中配置）
const SECRET_ID = process.env.SECRET_ID;
const SECRET_KEY = process.env.SECRET_KEY;
const APP_ID = process.env.APP_ID;

// ============ 配置常量 ============

const VOICE_TYPE = 101001;    // 音色类型：101001 = 基础女声（可改为 101016 等其他音色）
const OUTPUT_FILE = "output3.mp3"; // 输出的音频文件名（覆盖式写入）
const TEXT_INTERVAL_MS = 3000;    // 发送每个文本片段之间的间隔（毫秒），避免发送过快

/**
 * 要合成的文本数组
 * 拆分成多个短句，每个句子独立发送，实现边发送边听到效果
 * 这是流式 TTS 的典型用法：一次性合成长文本时，可以分批发送获得渐进体验
 */
const TEXTS = [
  "傍晚我还在为晚霞开心，",
  "突然接到电话说系统崩了，",
  "我心里一沉冲回办公室，",
  "好在大家一起排查后终于恢复，",
  "我长长松了口气。",
];

// ============ 辅助函数 ============

/**
 * 延时函数（基于 Promise + setTimeout）
 * 用于在循环发送文本时添加间隔，避免请求过于频繁
 *
 * @param {number} ms - 延时毫秒数
 * @returns {Promise<void>} - 延时结束后 resolved 的 Promise
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ============ 签名生成 ============

/**
 * 构建 WebSocket 连接 URL 及 SessionId
 *
 * 腾讯云流式 TTS API 需要对请求参数进行签名认证，流程如下：
 *   1. 构造参数字典（Action、AppId、Codec 等）
 *   2. 按字典序排序所有参数
 *   3. 拼接成 "key1=value1&key2=value2" 格式的字符串
 *   4. 构造待签名字符串：GETtts.cloud.tencent.com/stream_wsv2?<排序后的参数字符串>
 *   5. 使用 SecretKey 对上一步字符串进行 HMAC-SHA1 签名
 *   6. 将签名结果 Base64 编码后作为 Signature 参数附加到 URL
 *
 * @returns {Object} - 包含 sessionId（会话标识）和完整 url（WebSocket 地址）
 */
function buildWsUrl() {
  // 获取当前时间戳（秒级）
  const now = Math.floor(Date.now() / 1000);

  // 生成唯一会话 ID，格式：session_{时间戳}_{随机字符}
  // 每次请求需要不同的 SessionId，以保证请求的唯一性
  const sessionId = `session_${now}_${Math.random().toString(36).slice(2)}`;

  // 构造 API 请求参数（除 Signature 外所有参数）
  const params = {
    Action: "TextToStreamAudioWSv2", // API 动作名称，固定值
    AppId: parseInt(APP_ID),         // 腾讯云应用 ID（需转换为整数）
    Codec: "mp3",                    // 音频编码格式：mp3
    Expired: now + 3600,            // 签名过期时间（当前时间 + 1小时）
    SampleRate: 16000,              // 采样率：16000 Hz（16kHz，人声常用采样率）
    SecretId: SECRET_ID,            // 秘密 ID（用于身份标识）
    SessionId: sessionId,           // 会话 ID（本次连接的标识）
    Speed: 0,                       // 语速：0 表示标准语速（范围约 -2 到 2）
    Timestamp: now,                // 时间戳（秒级）
    VoiceType: VOICE_TYPE,         // 音色类型
    Volume: 5,                     // 音量：5 表示中等音量（范围 0 到 10）
  };

  // 按字典序（ASCII 升序）排列所有参数 key
  // 这是腾讯云签名的要求：参数名必须排序
  const sortedKeys = Object.keys(params).sort();

  // 拼接成 "key=value&key=value" 格式的字符串
  // 用于后续的签名计算
  const signStr = sortedKeys.map((k) => `${k}=${params[k]}`).join("&");

  /**
   * 签名字符串的格式说明：
   *   GETtts.cloud.tencent.com/stream_wsv2?<排序后的参数字符串>
   *
   * 前缀 "GET" + 主机名 + 路径 + "?" + 参数列表
   * 这是腾讯云 HMAC-SHA1 签名的标准格式
   */
  const rawStr = `GETtts.cloud.tencent.com/stream_wsv2?${signStr}`;

  /**
   * 使用 HMAC-SHA1 算法进行签名
   *   - 密钥：SECRET_KEY（从环境变量读取）
   *   - 数据：rawStr（待签名字符串）
   *   - 输出：Base64 编码的签名结果
   */
  const signature = crypto
    .createHmac("sha1", SECRET_KEY) // 创建 HMAC-SHA1 签名器
    .update(rawStr)                // 输入待签名字符串
    .digest("base64");           // 输出 Base64 编码的签名

  // 将所有参数（包括 Signature）转换为 URL 查询参数
  const searchParams = new URLSearchParams({
    ...params,           // 展开所有 API 参数
    Signature: signature, // 附加签名（签名本身也作为参数）
  });

  // 返回会话 ID 和完整的 WebSocket URL
  return {
    sessionId,
    url: `wss://tts.cloud.tencent.com/stream_wsv2?${searchParams.toString()}`,
  };
}

// ============ 文本发送 ============

/**
 * 循环发送文本片段到 WebSocket 服务器
 *
 * 工作流程：
 *   1. 遍历 TEXTS 数组，逐条发送文本
 *   2. 每发送一条后等待 TEXT_INTERVAL_MS（3秒）
 *   3. 所有文本发送完毕后，发送 ACTION_COMPLETE 通知服务器合成完成
 *
 * 消息格式说明：
 *   - action: "ACTION_SYNTHESIS" - 告诉服务器开始合成此文本
 *   - data: 要合成的文本内容
 *   - session_id: 本次会话 ID（由 buildWsUrl 生成）
 *   - message_id: 消息编号（用于追踪和排序）
 *   - action: "ACTION_COMPLETE" - 通知服务器所有文本已发送，可以结束合成了
 *
 * @param {WebSocket} ws - 已连接的 WebSocket 对象
 * @param {string} sessionId - 本次会话的唯一标识
 */
async function sendTexts(ws, sessionId) {
  for (let i = 0; i < TEXTS.length; i++) {
    // 发送单条文本消息，格式为 JSON 字符串
    ws.send(JSON.stringify({
      session_id: sessionId,        // 会话 ID
      message_id: `msg_${i}`,      // 消息编号，格式为 msg_0, msg_1, ...
      action: "ACTION_SYNTHESIS",  // 动作：告诉服务器开始合成
      data: TEXTS[i],              // 要合成的文本内容
    }));

    console.log(`[文本] 已发送: ${TEXTS[i]}`); // 打印发送的文本内容

    // 如果不是最后一条，等待一段时间后再发送下一条
    // 这样可以让音频有节奏地流出，实现渐进式体验
    if (i < TEXTS.length - 1) {
      await sleep(TEXT_INTERVAL_MS); // 等待 3 秒（避免发送过快）
    }
  }

  // 所有文本都发送完后，发送 ACTION_COMPLETE 通知服务器结束合成
  ws.send(JSON.stringify({
    session_id: sessionId,
    action: "ACTION_COMPLETE", // 动作：通知服务器所有文本已发送完毕
  }));

  console.log("[文本] 已发送 ACTION_COMPLETE"); // 打印完成通知
}

// ============ 主函数：启动流式 TTS ============

/**
 * 启动流式语音合成
 *
 * 完整流程：
 *   1. 参数校验：确保必要的环境变量都已配置
 *   2. 建立 WebSocket 连接（wss:// 开头，SSL 加密）
 *   3. 连接建立后，等待服务器发送 ready 信号
 *   4. 收到 ready 后，开始循环发送文本
 *   5. 接收服务器返回的音频数据（分块），边收边写文件
 *   6. 收到 final=1 信号后，关闭连接，结束合成
 *
 * WebSocket 消息说明：
 *   - 服务器 -> 客户端（二进制）：音频数据（MP3 格式），直接写入文件
 *   - 服务器 -> 客户端（文本 JSON）：状态信息、错误信息、完成信号
 *     - ready: 1 = 服务端已就绪，可以开始发送文本
 *     - code: 0 = 成功，非 0 = 错误
 *     - final: 1 = 合成已完成
 */
function streamTTS() {
  // ============ 参数校验 ============
  if (!SECRET_ID || !SECRET_KEY || !APP_ID) {
    throw new Error("请先在 .env 配置 SECRET_ID、SECRET_KEY、APP_ID");
  }

  // ============ 建立 WebSocket 连接 ============
  const { url, sessionId } = buildWsUrl(); // 构造带签名的 URL
  const ws = new WebSocket(url);            // 建立 WebSocket 连接

  // 创建可写流，用于将接收到的音频数据直接写入文件
  // flags: "w" 表示覆盖模式（每次重新开始写）
  const writeStream = fs.createWriteStream(OUTPUT_FILE, { flags: "w" });

  // ============ 状态变量 ============
  let totalBytes = 0; // 已写入的总字节数（用于统计）
  let closed = false;  // 是否已关闭（防止重复关闭）
  let sent = false;    // 是否已发送文本（防止重复发送）

  // ============ 关闭清理函数 ============
  /**
   * 关闭所有连接和文件流
   * 在完成合成、发生错误、连接断开时调用
   * 使用 closed 标志确保只执行一次（防止重复关闭）
   */
  const closeAll = () => {
    if (closed) return; // 防止重复调用
    closed = true;

    // 关闭文件写入流（finish 后打印统计信息）
    writeStream.end(() => {
      console.log(`[保存] 音频已保存至 ${OUTPUT_FILE}，共 ${totalBytes} 字节`);
    });

    // 关闭 WebSocket 连接（如果还在连接中）
    if (ws.readyState < WebSocket.CLOSING) {
      ws.close();
    }
  };

  // ============ WebSocket 事件处理 ============

  /**
   * 连接建立事件
   * 此时连接已建立，但服务器可能还在初始化
   * 需要等待服务器发送 ready 信号后才开始发送文本
   */
  ws.on("open", () => {
    console.log("[连接] WebSocket 已建立，等待服务端就绪...");
  });

  /**
   * 消息接收事件
   * 腾讯云 TTS 服务会发送两种消息：
   *   1. 二进制消息（isBinary=true）：音频数据，直接写入文件
   *   2. 文本消息（isBinary=false）：JSON 格式的状态/控制信息
   *
   * @param {Buffer} data - 消息内容（二进制或文本）
   * @param {boolean} isBinary - 是否为二进制消息
   */
  ws.on("message", async (data, isBinary) => {
    // ============ 二进制消息：音频数据 ============
    if (isBinary) {
      // 直接将音频数据块写入文件（追加模式）
      writeStream.write(data);
      totalBytes += data.length; // 累加字节计数
      return; // 处理完毕，不再解析
    }

    // ============ 文本消息：JSON 状态信息 ============
    try {
      // 解析 JSON 格式的控制消息
      const msg = JSON.parse(data.toString());
      console.log("[消息]", JSON.stringify(msg)); // 打印消息内容（便于调试）

      /**
       * ready 信号：
       *   当服务器就绪后，会发送 { ready: 1 }
       *   此时可以开始发送文本进行合成
       */
      if (msg.ready === 1 && !sent) {
        sent = true; // 标记为已发送（防止重复发送）
        await sendTexts(ws, sessionId); // 开始发送文本
      }

      /**
       * 错误处理：
       *   code 不为 0 表示发生错误，需要打印错误信息并关闭连接
       *   常见错误码：4001（参数错误）、4002（签名错误）、4003（余额不足）等
       */
      if (msg.code && msg.code !== 0) {
        console.error(`[错误] code=${msg.code}, message=${msg.message}`);
        closeAll(); // 发生错误，关闭连接
      }

      /**
       * 完成信号：
       *   当服务器发送 { final: 1 } 时，表示所有音频已合成完毕
       *   此时可以关闭连接，合成完成
       */
      if (msg.final === 1) {
        console.log("[完成] 合成结束。");
        closeAll(); // 正常完成，关闭连接
      }

    } catch (e) {
      // JSON 解析失败（非 JSON 格式的消息）
      console.error("[解析错误]", e.message);
    }
  });

  /**
   * WebSocket 错误事件
   * 发生网络错误、连接失败等时会触发
   * 需要清理资源并打印错误信息
   */
  ws.on("error", (err) => {
    console.error("[WebSocket 错误]", err.message);
    closeAll(); // 发生错误，关闭连接
  });

  /**
   * WebSocket 连接关闭事件
   * 正常完成或异常断开都会触发此事件
   * @param {number} code - 关闭状态码（1000 表示正常关闭）
   * @param {string} reason - 关闭原因（字符串描述）
   */
  ws.on("close", (code, reason) => {
    console.log(`[断开] 连接已关闭，code=${code}, reason=${reason}`);
    closeAll(); // 确保清理资源
  });
}

// ============ 启动程序 ============

// 调用主函数，启动流式 TTS 合成
streamTTS();