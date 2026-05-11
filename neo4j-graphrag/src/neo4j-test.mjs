import neo4j from 'neo4j-driver'

// =============================================
// Neo4j 连接配置（请根据实际环境修改）
// =============================================
const NEO4J_URI = 'bolt://localhost:7687'
const NEO4J_USER = 'neo4j'
const NEO4J_PASSWORD = '12345678'

// 创建驱动实例（整个应用生命周期只创建一次）
const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD))

// =============================================
// 辅助函数：执行 Cypher 查询
// =============================================
/**
 * 执行 Cypher 查询的通用函数
 * @param {string} cypher - Cypher 查询语句
 * @param {object} params - 查询参数（可选）
 * @returns {Promise<object>} 查询结果
 */
async function executeQuery(cypher, params = {}) {
  const session = driver.session()
  try {
    const result = await session.run(cypher, params)
    return result
  } finally {
    // 确保会话关闭，释放资源
    await session.close()
  }
}

// =============================================
// 1. 创建节点
// =============================================
/**
 * 创建 Product 和 Ingredient 节点
 * CREATE: 创建新节点，无返回值
 */
async function createNodes() {
  const cypher = `
    CREATE (p:Product {name: "珍珠奶茶"})
    CREATE (i:Ingredient {name: "珍珠"})
    RETURN p, i
  `
  const result = await executeQuery(cypher)
  console.log('✅ 节点创建成功:', result.summary.counters.updates().nodesCreated, '个节点')
}

// =============================================
// 2. 创建关系
// =============================================
/**
 * 为两个已存在的节点创建关系
 * MATCH: 先匹配已存在的节点
 * CREATE: 创建关系（注意：CREATE 创建后不会返回关系，需要用 CREATE (p)-[r:包含]->(i) RETURN r）
 */
async function createRelation() {
  const cypher = `
    MATCH (p:Product {name: "珍珠奶茶"})
    MATCH (i:Ingredient {name: "珍珠"})
    CREATE (p)-[r:包含]->(i)
    RETURN p, r, i
  `
  await executeQuery(cypher)
  console.log('✅ 关系创建成功')
}

// =============================================
// 3. 查询数据
// =============================================
/**
 * 查询节点及其关系
 * MATCH (p:Product)-[r]->(i): 匹配 Product 节点及其所有出方向关系
 * RETURN: 返回匹配的节点、关系属性
 */
async function queryData() {
  const cypher = `
    MATCH (p:Product {name: "珍珠奶茶"})-[r]->(i)
    RETURN p, r, i
  `
  const result = await executeQuery(cypher)

  if (result.records.length === 0) {
    console.log('📭 未查询到数据')
    return
  }

  result.records.forEach(record => {
    console.log('--------------------------------')
    console.log('奶茶:', record.get('p').properties.name)
    console.log('关系:', record.get('r').type)
    console.log('配料:', record.get('i').properties.name)
  })
  console.log('--------------------------------')
  console.log(`共查询到 ${result.records.length} 条记录`)
}

// =============================================
// 4. 更新属性
// =============================================
/**
 * 更新已有节点的属性
 * MATCH: 匹配节点
 * SET: 设置属性（可同时设置多个，逗号分隔）
 */
async function updateNodeProperties() {
  const cypher = `
    MATCH (p:Product {name: "珍珠奶茶"})
    SET p.price = 15, p.calorie = "中高"
    RETURN p
  `
  const result = await executeQuery(cypher)
  const updatedNode = result.records[0]?.get('p').properties
  console.log('✅ 属性更新成功:', updatedNode)
}

// =============================================
// 5. 删除关系
// =============================================
/**
 * 删除两个节点之间的关系
 * DELETE: 删除关系（删除前需确保没有其他节点依赖此关系）
 */
async function deleteRelationship() {
  const cypher = `
    MATCH (p:Product {name: "珍珠奶茶"})-[r:包含]->(i:Ingredient {name: "珍珠"})
    DELETE r
  `
  await executeQuery(cypher)
  console.log('✅ 关系删除成功')
}

// =============================================
// 6. 删除节点
// =============================================
/**
 * 删除节点（如果节点有关系，需先删除关系）
 * DETACH DELETE: 分离并删除节点及其所有关系
 */
async function deleteNode() {
  const cypher = `
    MATCH (p:Product {name: "珍珠奶茶"})
    DETACH DELETE p
  `
  await executeQuery(cypher)
  console.log('✅ 节点删除成功（包含所有关系）')
}

// =============================================
// 主函数：运行所有操作
// =============================================
async function main() {
  try {
    // 1. 创建节点
    await createNodes()

    // 2. 创建关系
    await createRelation()

    // 3. 查询数据
    await queryData()

    // 4. 更新属性
    await updateNodeProperties()

    // 5. 删除关系（可选，取消注释执行）
    // await deleteRelationship()

    // 6. 删除节点（可选，取消注释执行）
    // await deleteNode()

    console.log('\n🎉 所有操作执行完成')
  } catch (error) {
    console.error('❌ 执行出错:', error.message)
  } finally {
    // 关闭驱动，释放连接池
    await driver.close()
    console.log('🔌 数据库连接已关闭')
  }
}

// 运行主函数
main()
