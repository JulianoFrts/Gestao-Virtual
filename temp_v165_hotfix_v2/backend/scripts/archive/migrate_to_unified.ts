import "dotenv/config";
import { prisma } from "../src/lib/prisma/client";

async function migrate() {
  console.log("🚀 Starting data migration to unified models...");

  try {
    // 1. Migrate Towers (from legacy table 'tower_technical_data' if exists)
    console.log("🏗️ Fetching legacy towers...");
    let legacyTowers: any[] = [];
    try {
      legacyTowers = await (prisma as any).towerTechnicalData.findMany();
    } catch (e) {
      console.log(
        "⚠️ Prisma model towerTechnicalData not found, trying raw SQL...",
      );
      legacyTowers = await prisma.$queryRawUnsafe(
        'SELECT * FROM "tower_technical_data"',
      );
    }

    console.log(`🏗️ Migrating ${legacyTowers.length} towers...`);

    for (const tower of legacyTowers) {
      await prisma.mapElementTechnicalData.upsert({
        where: {
          projectId_externalId: {
            projectId: tower.projectId || tower.project_id,
            externalId: tower.objectId || tower.object_id,
          },
        },
        update: {},
        create: {
          companyId: tower.companyId || tower.company_id,
          projectId: tower.projectId || tower.project_id,
          elementType: "TOWER",
          externalId: tower.objectId || tower.object_id,
          sequence: tower.objectSeq || tower.object_seq || 0,
          // X is typically Longitude, Y is Latitude
          latitude: tower.yCoordinate || tower.y_coordinate,
          longitude: tower.xCoordinate || tower.x_coordinate,
          elevation: tower.objectElevation || tower.object_elevation,
          name: `Torre ${tower.objectId || tower.object_id}`,
          metadata: {
            towerType: tower.towerType || tower.tower_type,
            objectHeight: tower.objectHeight || tower.object_height,
            deflection: tower.deflection,
            goForward: tower.goForward || tower.go_forward,
            fusoObject: tower.fusoObject || tower.fuso_object,
            fixConductor: tower.fixConductor || tower.fix_conductor,
            trecho: tower.trecho,
            ...(tower.metadata || {}),
          },
        },
      });
    }

    // 2. Migrate Spans (from legacy table 'span_technical_data')
    console.log("🔗 Fetching legacy spans...");
    let legacySpans: any[] = [];
    try {
      legacySpans = await (prisma as any).spanTechnicalData.findMany();
    } catch (e) {
      console.log(
        "⚠️ Prisma model spanTechnicalData not found, trying raw SQL...",
      );
      legacySpans = await prisma.$queryRawUnsafe(
        'SELECT * FROM "span_technical_data"',
      );
    }

    console.log(`🔗 Migrating ${legacySpans.length} spans...`);

    for (const span of legacySpans) {
      const externalId = `${span.towerStartId || span.tower_start_id}_${span.towerEndId || span.tower_end_id}`;
      await prisma.mapElementTechnicalData.upsert({
        where: {
          projectId_externalId: {
            projectId: span.projectId || span.project_id,
            externalId,
          },
        },
        update: {},
        create: {
          companyId: span.companyId || span.company_id,
          projectId: span.projectId || span.project_id,
          elementType: "SPAN",
          externalId,
          sequence: 0,
          metadata: {
            spanName: span.spanName || span.span_name,
            spanLength: span.spanLength || span.span_length,
            cableType: span.cableType || span.cable_type,
            voltageKv: span.voltageKv || span.voltage_kv,
            ...(span.metadata || {}),
          },
        },
      });
    }

    // 3. Migrate Production Status (from legacy table 'tower_activity_status')
    console.log("📊 Fetching legacy production status...");
    let legacyStatuses: any[] = [];
    try {
      legacyStatuses = await (prisma as any).towerActivityStatus.findMany({
        include: { logs: true },
      });
    } catch (e) {
      console.log(
        "⚠️ Prisma model towerActivityStatus not found, trying raw SQL...",
      );
      legacyStatuses = await prisma.$queryRawUnsafe(
        'SELECT * FROM "tower_activity_status"',
      );

      // For logs, we might need another query if they are in a separate table
      for (const status of legacyStatuses) {
        try {
          status.logs = await prisma.$queryRawUnsafe(
            'SELECT * FROM "production_logs" WHERE "status_id" = $1',
            status.id,
          );
        } catch (logErr) {
          status.logs = [];
        }
      }
    }

    console.log(
      `📊 Migrating ${legacyStatuses.length} production status records...`,
    );

    for (const status of legacyStatuses) {
      // Find the corresponding elementId
      // Try to find the element by externalId (tower objectId)
      const projectId = status.projectId || status.project_id;

      // We need to know which tower this belongs to.
      // In legacy, it was towerId. Let's find the tower's objectId first.
      let tower;
      try {
        tower = await (prisma as any).towerTechnicalData.findUnique({
          where: { id: status.towerId || status.tower_id },
        });
      } catch (e) {
        const results: any[] = await prisma.$queryRawUnsafe(
          'SELECT object_id FROM "tower_technical_data" WHERE id = $1',
          status.towerId || status.tower_id,
        );
        tower = results[0];
      }

      if (!tower) continue;

      const objectId = tower.objectId || tower.object_id;

      const element = await prisma.mapElementTechnicalData.findUnique({
        where: {
          projectId_externalId: {
            projectId: projectId,
            externalId: objectId,
          },
        },
      });

      if (!element) continue;

      await prisma.mapElementProductionProgress.upsert({
        where: {
          elementId_activityId: {
            elementId: element.id,
            activityId: status.activityId || status.activity_id,
          },
        },
        update: {
          currentStatus: status.status,
          progressPercent:
            status.progressPercent || status.progress_percent || 0,
          history: (status.logs || []) as any,
        },
        create: {
          projectId: projectId,
          elementId: element.id,
          activityId: status.activityId || status.activity_id,
          currentStatus: status.status,
          progressPercent:
            status.progressPercent || status.progress_percent || 0,
          history: (status.logs || []) as any,
          dailyProduction: {},
        },
      });
    }

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
