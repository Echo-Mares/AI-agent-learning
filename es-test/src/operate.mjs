/**
 * ES 客户端配置
 * 连接本地 Elasticsearch 服务，地址为 http://localhost:9200
 */
import { Client } from '@elastic/elasticsearch';

const client = new Client({
  node: 'http://localhost:9200'
});

// 索引名称，与 create.mjs 中创建的索引保持一致
const INDEX_NAME = 'travel_journal';

/**
 * 创建单个文档
 * 使用 index API 插入新文档，refresh: true 确保立即可搜索
 * @returns {Promise<string>} 返回新插入文档的 ID
 */
async function createDocument() {
  const now = new Date().toISOString();
  const res = await client.index({
    index: INDEX_NAME,
    document: {
      note_title: '夜跑复盘',
      note_body: '今天夜跑 5 公里，配速稳定，结束后做了拉伸。',
      tags: ['运动', '夜跑'],
      mood: 'focused',
      priority: 2,
      created_at: now,
      updated_at: now
    },
    refresh: true
  });

  console.log('✅ 新增成功，ID =', res._id);
  return res._id;
}

/**
 * 根据 ID 获取单个文档
 * 使用 get API 按 ID 查询文档内容
 * @param {string} docId - 文档 ID
 */
async function getDocument(docId) {
  const res = await client.get({
    index: INDEX_NAME,
    id: docId
  });
  console.log('📖 查询结果:', res._source);
}

/**
 * 更新已有文档
 * 使用 update API 进行部分更新，只更新指定的字段
 * @param {string} docId - 文档 ID
 */
async function updateDocument(docId) {
  await client.update({
    index: INDEX_NAME,
    id: docId,
    doc: {
      note_body: '今天夜跑 6 公里，状态不错，拉伸后恢复很快。',
      tags: ['运动', '夜跑', '训练'],
      updated_at: new Date().toISOString()
    },
    refresh: true
  });
  console.log('🔄 更新成功');
}

/**
 * 搜索文档
 * 使用 match 查询在 note_body 字段中搜索关键词
 * 使用 ik_smart 分词器进行智能分词，提高搜索准确性
 */
async function searchDocuments() {
  const res = await client.search({
    index: INDEX_NAME,
    query: {
      match: {
        note_body: {
          query: '慢跑以及骑行的数据',
          analyzer: 'ik_smart'
        }
      }
    }
  });


  // 将搜索结果转换为简洁的格式，包含 ID 和文档内容
  const rows = res.hits.hits.map((item) => ({
    id: item._id,
    ...item._source
  }));
  console.log('🔍 搜索结果:', rows);
}

/**
 * 删除文档
 * 使用 delete API 根据 ID 删除指定文档
 * @param {string} docId - 文档 ID
 */
async function deleteDocument(docId) {
  await client.delete({
    index: INDEX_NAME,
    id: docId,
    refresh: true
  });
  console.log('🗑️ 删除成功');
}

/**
 * 主函数：执行文档操作流程
 * 默认演示删除指定 ID 的文档
 * 可以注释掉 deleteDocument 调用，改为其他操作进行测试
 */
async function run() {
  // const docId = await createDocument();
  // await getDocument(docId);
  // console.log('docId', docId);
  const docId = 'ryqn7J0BJMRpuEWWHQ8i';
  // await updateDocument(docId);
  // await getDocument(docId);
  // await searchDocuments();

  // await deleteDocument(docId);
}

/**
 * 入口：运行主函数，捕获并输出错误信息
 */
run().catch((err) => {
  console.error('❌ 操作阶段失败:', err);
  process.exit(1);
});
