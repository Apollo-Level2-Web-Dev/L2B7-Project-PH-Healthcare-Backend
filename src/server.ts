import app from "./app";
import config from "./app/config";
import {
  deleteUnverifiedDoctors,
  reindexDoctorEmbeddings,
} from "./app/lib/cron";
import { transporter } from "./app/lib/nodemailer";
import { prisma } from "./app/lib/prisma";
import { redisClient } from "./app/lib/redis";
import { reindexAllDoctors } from "./app/module/chat/chat.indexer";
import {
  seedSuperAdmin,
  seedTesterAdmin,
  seedTesterDoctor,
} from "./app/utils/seed";

const PORT = config.port;

const main = async () => {
  try {
    await prisma.$connect();
    console.log("Connected to the database successfully.");

    await redisClient.connect();
    console.log("Redis Connected Successfully.");

    await transporter.verify();
    console.log("Nodemailer Connected Successfully.");

    await seedSuperAdmin();
    await seedTesterAdmin();
    await seedTesterDoctor();
    // await reindexAllDoctors();
    await deleteUnverifiedDoctors();
    await reindexDoctorEmbeddings();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting the server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

main();
