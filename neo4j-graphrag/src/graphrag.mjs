/**
 * =============================================
 * GraphRAG - 基于 Neo4j 知识图谱的 RAG 系统
 * =============================================
 *
 * 工作流程：
 *   用户提问 → 生成 Cypher 查询 → 执行图数据库查询 → 生成最终答案
 *
 * 依赖：
 *   - Neo4j 图数据库
 *   - OpenAI GPT 模型（通过 LangChain 调用）
 *   - LangChain + LangGraph 编排
 */

import 'dotenv/config'
import { Neo4jGraph } from '@langchain/community/graphs/neo4j_graph'
import { ChatOpenAI } from '@langchain/openai'
import { StateGraph, END, START } from '@langchain/langgraph'
import { HumanMessage } from '@langchain/core/messages'

// =============================================
// 配置区
// =============================================

/** Neo4j 数据库连接配置 */
const NEO4J_CONFIG = {
  url: 'bolt://localhost:7687',
  username: 'neo4j',
  password: '12345678',
}

/** LLM 模型配置 */
const LLM_CONFIG = {
  model: process.env.MODEL_NAME || 'gpt-4o',
  temperature: 0,  // 温度为 0，生成更确定性的回答
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL  // OpenAI 兼容 API 地址
  }
}

/** 奶茶知识图谱的节点和关系定义（用于指导 Cypher 生成） */
const GRAPH_SCHEMA = {
  /** 节点类型 */
  nodes: {
    Product: '奶茶产品',
    Ingredient: '配料',
    Type: '奶茶类型',
    Method: '制作工艺',
    People: '适合人群',
  },
  /** 关系类型（带方向） */
  relationships: {
    BELONGS_TO: '(Product)-[:属于]->(Type)',
    CONTAINS: '(Product)-[:包含]->(Ingredient)',
    SUITABLE_FOR: '(Product)-[:适合]->(People)',
    USES: '(Ingredient)-[:使用]->(Method)',
  }
}

// =============================================
// 初始化：连接图数据库和大模型
// =============================================

/** 创建 Neo4j 图数据库连接实例 */
const graph = new Neo4jGraph(NEO4J_CONFIG)

/** 创建 LLM 实例 */
const llm = new ChatOpenAI(LLM_CONFIG)

// =============================================
// 状态定义
// =============================================

/**
 * LangGraph 工作流状态
 *
 * 状态在节点间传递，每个节点可以读取和修改状态
 */
const state = {
  /** 消息历史列表，用于存储对话上下文 */
  messages: {
    /** 值函数：新消息累加到历史列表 */
    value: (left, right) =>
      left.concat(Array.isArray(right) ? right : [right]),
    /** 默认值：初始为空数组 */
    default: () => [],
  },
  /** 生成的 Cypher 查询语句 */
  cypher: null,
  /** 从图数据库查询到的上下文结果 */
  context: null,
  /** 最终生成的回答 */
  answer: null,
}

// =============================================
// 辅助函数
// =============================================

/**
 * 从消息列表中提取用户最新问题
 * @param {object} state - 当前状态
 * @returns {string} 用户问题的文本内容
 */
function extractUserQuery(state) {
  const messages = state.messages
  const lastMessage = messages[messages.length - 1]
  return lastMessage?.content || ''
}

/**
 * 生成 Cypher 查询的系统提示词
 * 告诉 LLM 如何正确生成 Cypher 语句
 * @param {string} userQuery - 用户的问题
 * @returns {string} 完整的提示词
 */
function buildCypherPrompt(userQuery) {
  const nodeDescriptions = Object.entries(GRAPH_SCHEMA.nodes)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n')

  const relationshipDescriptions = Object.entries(GRAPH_SCHEMA.relationships)
    .map(([key, value]) => `- ${value}`)
    .join('\n')

  return `
你是专业的 Neo4j Cypher 查询生成器。

严格按照以下图谱结构生成 Cypher 查询语句：

【节点类型】
${nodeDescriptions}

【关系类型】（必须严格遵守方向）
${relationshipDescriptions}

【生成规则】
1. 关系方向绝对不能反向
2. 多跳查询使用多个 MATCH 单独匹配，不要连写长路径
3. 只返回纯 Cypher 语句，不要任何解释、标点或 markdown 标记
4. 【重要】禁止使用参数化查询（如 $name），必须直接把值写在 WHERE 或属性匹配中
   例如：正确写法 "MATCH (p:Product {name: '珍珠奶茶'})"
   例如：错误写法 "MATCH (p:Product {name: $name})"

【用户问题】
${userQuery}

请直接返回 Cypher 语句：
`.trim()
}

// =============================================
// LangGraph 节点（工作流步骤）
// =============================================

/**
 * 节点 1：生成 Cypher 查询
 *
 * 根据用户问题，让 LLM 生成对应的 Cypher 语句
 */
async function generateCypherNode(state) {
  const userQuery = extractUserQuery(state)
  const prompt = buildCypherPrompt(userQuery)

  const response = await llm.invoke([new HumanMessage(prompt)])

  return {
    cypher: response.content.trim()  // 去除首尾空白
  }
}

/**
 * 节点 2：执行图数据库查询
 *
 * 将生成的 Cypher 在 Neo4j 中执行，获取查询结果
 */
async function executeGraphQueryNode(state) {
  try {
    const results = await graph.query(state.cypher)

    // 空结果处理
    if (!results || results.length === 0) {
      return { context: '未查询到相关知识' }
    }

    return {
      context: JSON.stringify(results, null, 2)  // 格式化输出
    }
  } catch (error) {
    // Cypher 执行出错时返回友好提示
    console.error('⚠️ Cypher 执行错误:', error.message)
    return {
      context: `查询出错（${error.message}），请检查 Cypher 语法`
    }
  }
}

/**
 * 节点 3：生成最终答案
 *
 * 根据检索到的上下文，让 LLM 生成最终回答
 */
async function generateAnswerNode(state) {
  const userQuery = extractUserQuery(state)
  const prompt = `
你是奶茶知识图谱专家，基于下方「检索结果」回答用户问题。

【回答要求】
1. 只陈述图谱中真实存在的事实，不要编造
2. 不要推断图谱未包含的信息（如水、冰、添加剂等）
3. 如果检索结果为空或不足，请如实说明

【检索结果】
${state.context}

【用户问题】
${userQuery}
`.trim()

  const response = await llm.invoke([new HumanMessage(prompt)])

  return {
    answer: response.content
  }
}

// =============================================
// 构建 LangGraph 工作流
// =============================================

/**
 * 构建状态图工作流
 *
 * 工作流结构：
 *   START → generateCypher → executeGraph → generateAnswer → END
 */
const workflow = new StateGraph({ channels: state })
  // 添加节点
  .addNode('generateCypher', generateCypherNode)
  .addNode('executeGraph', executeGraphQueryNode)
  .addNode('generateAnswer', generateAnswerNode)
  // 定义边（执行顺序）
  .addEdge(START, 'generateCypher')
  .addEdge('generateCypher', 'executeGraph')
  .addEdge('executeGraph', 'generateAnswer')
  .addEdge('generateAnswer', END)

/** 编译工作流为可执行应用 */
const app = workflow.compile()

// =============================================
// 辅助函数：可视化工作流
// =============================================

/**
 * 打印 LangGraph 工作流的 Mermaid 图表
 * 方便调试和理解工作流结构
 */
async function printWorkflowDiagram() {
  try {
    const graphDrawable = await app.getGraphAsync()
    const mermaidDiagram = graphDrawable.drawMermaid({ withStyles: true })
    console.log('======================================')
    console.log('LangGraph 工作流结构 (Mermaid)')
    console.log('======================================')
    console.log(mermaidDiagram)
    console.log('-----------------------------------------------------------\n')
  } catch (error) {
    console.error('⚠️ 无法生成工作流图:', error.message)
  }
}

// =============================================
// 核心函数：运行 GraphRAG
// =============================================

/**
 * 运行 GraphRAG 流程
 *
 * @param {string} question - 用户的问题
 * @returns {Promise<object>} 执行结果，包含生成的 Cypher、上下文和最终回答
 */
async function runGraphRAG(question) {
  console.log('▶️ 开始处理问题:', question)

  const result = await app.invoke({
    messages: [new HumanMessage(question)],
  })

  // 格式化输出结果
  console.log('\n======================================')
  console.log('📋 问题:', question)
  console.log('--------------------------------------')
  console.log('🔍 生成的 Cypher:')
  console.log(result.cypher)
  console.log('--------------------------------------')
  console.log('📚 检索结果:')
  console.log(result.context)
  console.log('--------------------------------------')
  console.log('💬 最终回答:')
  console.log(result.answer)
  console.log('======================================\n')

  return result
}

// =============================================
// 主函数：运行测试
// =============================================

;(async () => {
  try {
    // 1. 打印工作流结构（方便理解）
    await printWorkflowDiagram()

    // 2. 运行多个测试问题（并行执行，提高效率）
    const testQuestions = [
      '我们这款珍珠奶茶有哪些配料？',
      '台式奶茶的饮品都有哪些配料？',
      '珍珠奶茶适合哪些人群饮用？',
    ]

    console.log('🚀 开始执行 GraphRAG 测试...\n')

    // 并行运行所有问题
    await Promise.all(testQuestions.map(q => runGraphRAG(q)))

    console.log('✅ 所有测试完成')
  } catch (error) {
    console.error('❌ 执行出错:', error.message)
    console.error(error.stack)
  } finally {
    // 3. 关闭图数据库连接，释放资源
    await graph.close()
    console.log('🔌 图数据库连接已关闭')
  }
})()
