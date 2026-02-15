import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.findFirst({
    where: { name: { contains: 'LA', mode: 'insensitive' } },
    select: {
      id: true,
      companyId: true,
      name: true,
      sites: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  if (!project) {
    const anyProject = await prisma.project.findFirst({
      select: {
        id: true,
        companyId: true,
        name: true,
        sites: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    console.log(JSON.stringify(anyProject, null, 2));
  } else {
    console.log(JSON.stringify(project, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
