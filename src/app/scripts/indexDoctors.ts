import { prisma } from "../lib/prisma";
import { vectorStore } from "../lib/vectorStore";
import { reindexAllDoctors } from "../module/chat/chat.indexer";

const main = async () => {
  try {
    const count = await reindexAllDoctors();
    console.log(`Indexed ${count} approved doctors`);
  } catch (error) {
    console.error("Indexing failed: ", error);
  } finally {
    vectorStore.end();
    await prisma.$disconnect();
  }
};

main();
