const { PrismaClient } = require('../backend/node_modules/@prisma/client/index.js');
const prisma = new PrismaClient();
prisma.orderFile.findFirst({ orderBy: { size: 'desc' } }).then((d) => {
  console.log(d.fileUrl);
  prisma.$disconnect();
});
