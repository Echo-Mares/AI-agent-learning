/**
 * ES 客户端配置
 * 连接本地 Elasticsearch 服务，地址为 http://localhost:9200
 */
import { Client } from '@elastic/elasticsearch';

const client = new Client({
  node: 'http://localhost:9200'
});

// 索引名称，用于存储旅行日记数据
const INDEX_NAME = 'travel_journal';

/**
 * 创建 Elasticsearch 索引
 * 如果索引已存在则跳过，避免重复创建
 * 索引 mapping 定义了各字段的类型和分词器
 * - note_title/note_body: 文本字段，使用 IK 中文分词器
 * - tags/mood: 关键字字段，用于精确匹配和聚合
 * - priority: 整数，用于排序
 * - created_at/updated_at: 日期字段
 */
async function createIndex() {
  const exists = await client.indices.exists({ index: INDEX_NAME });
  if (exists) {
    console.log(`ℹ️ 索引已存在: ${INDEX_NAME}`);
    return;
  }

  await client.indices.create({
    index: INDEX_NAME,
    mappings: {
      properties: {
        note_title: { type: 'text', analyzer: 'ik_max_word', search_analyzer: 'ik_smart' },
        note_body: { type: 'text', analyzer: 'ik_max_word', search_analyzer: 'ik_smart' },
        tags: { type: 'keyword' },
        mood: { type: 'keyword' },
        priority: { type: 'integer' },
        created_at: { type: 'date' },
        updated_at: { type: 'date' }
      }
    }
  });

  console.log(`✅ 索引创建成功: ${INDEX_NAME}`);
}

/**
 * 初始化示例数据
 * 向索引中批量插入多条旅行日记文档
 * 使用 bulk API 一次性写入，提搞写入效率
 */
async function seedData() {
  const now = new Date().toISOString();
  const docs = [
    {
      note_title: '杭州西湖半日游',
      note_body: '早上绕湖慢跑，中午吃片儿川，下午在断桥拍照放松。',
      tags: ['旅行', '周末', '杭州'],
      mood: 'relaxed',
      priority: 2,
      created_at: now,
      updated_at: now
    },
    {
      note_title: '城市骑行计划',
      note_body: '周六沿江骑行 20 公里，带上水和简易修车工具。',
      tags: ['运动', '骑行'],
      mood: 'energetic',
      priority: 3,
      created_at: now,
      updated_at: now
    },
    {
      note_title: '雨天宅家阅读',
      note_body: '下雨天在家看书，整理本周笔记并做晚餐。',
      tags: ['生活', '阅读'],
      mood: 'calm',
      priority: 1,
      created_at: now,
      updated_at: now
    }
  ];

  // 将文档列表转换为 bulk API 所需的格式：[action, doc, action, doc, ...]
  const operations = docs.flatMap((doc) => [{ index: { _index: INDEX_NAME } }, doc]);
  // refresh: true 确保持久化后立即可搜索
  await client.bulk({ refresh: true, operations });
  console.log(`✅ 初始化数据完成，共 ${docs.length} 条`);
}

/**
 * 主函数：依次执行索引创建和数据初始化
 */
async function run() {
  await createIndex();
  await seedData();
}

run().catch((err) => {
  // 捕获并输出错误信息，最后以非零状态码退出进程
  console.error('❌ 创建阶段失败:', err);
  process.exit(1);
});

