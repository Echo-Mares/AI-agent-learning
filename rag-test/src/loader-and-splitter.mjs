import "dotenv/config";
import"cheerio";
import { CheerioWebBaseLoader } from"@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from"@langchain/textsplitters";

const cheerioLoader = new CheerioWebBaseLoader(
"https://juejin.cn/post/7233327509919547452",
  {
    selector: '.main-area p'
  }
);

const documents = await cheerioLoader.load();
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 400, // size of each chunk
  chunkOverlap: 50, // redundancy between chunks
  separators: [ "。", "！", "？"]
});
const splitDocuments = await textSplitter.splitDocuments(documents)
console.log(splitDocuments);