#!/usr/bin/env tsx

import { writeFileSync, readFileSync, existsSync } from "fs";
import { glob } from "glob";
import path from "path";

interface RouterDocumentation {
  filePath: string;
  routerName: string;
  procedures: Array<{
    name: string;
    type: "query" | "mutation";
    description: string;
    tags: string[];
  }>;
}

// Documentation templates for common routers
const routerDocs: Record<string, RouterDocumentation> = {
  "deliverer/deliverer-announcements.router.ts": {
    filePath: "",
    routerName: "delivererAnnouncements",
    procedures: [
      {
        name: "searchAnnouncements",
        type: "query",
        description: "Search available announcements for delivery",
        tags: ["Deliverer", "Announcements"],
      },
      {
        name: "applyToAnnouncement",
        type: "mutation",
        description: "Apply to deliver an announcement",
        tags: ["Deliverer", "Applications"],
      },
    ],
  },
  "deliverer/deliverer-deliveries.router.ts": {
    filePath: "",
    routerName: "delivererDeliveries",
    procedures: [
      {
        name: "getMyDeliveries",
        type: "query",
        description: "Get deliverer's active and past deliveries",
        tags: ["Deliverer", "Deliveries"],
      },
      {
        name: "updateDeliveryStatus",
        type: "mutation",
        description: "Update delivery status and location",
        tags: ["Deliverer", "Tracking"],
      },
      {
        name: "confirmPickup",
        type: "mutation",
        description: "Confirm package pickup",
        tags: ["Deliverer", "Pickup"],
      },
      {
        name: "confirmDelivery",
        type: "mutation",
        description: "Confirm package delivery",
        tags: ["Deliverer", "Delivery"],
      },
    ],
  },
  "admin/admin-users.router.ts": {
    filePath: "",
    routerName: "adminUsers",
    procedures: [
      {
        name: "getAllUsers",
        type: "query",
        description: "Get all users with filters (Admin only)",
        tags: ["Admin", "Users"],
      },
      {
        name: "getUserById",
        type: "query",
        description: "Get user details by ID (Admin only)",
        tags: ["Admin", "Users"],
      },
      {
        name: "updateUserStatus",
        type: "mutation",
        description: "Update user status (Admin only)",
        tags: ["Admin", "Users"],
      },
      {
        name: "verifyUser",
        type: "mutation",
        description: "Verify user account (Admin only)",
        tags: ["Admin", "Verification"],
      },
    ],
  },
};

function generateOpenAPIDoc(
  procedure: RouterDocumentation["procedures"][0],
  routerPath: string,
): string {
  const { name, type, description, tags } = procedure;
  const httpMethod = "post"; // tRPC uses POST for all procedures

  return `
/**
 * @openapi
 * /api/trpc/${routerPath}.${name}:
 *   ${httpMethod}:
 *     tags:
 *       ${tags.map((tag) => `- ${tag}`).join("\n *       ")}
 *     summary: ${description}
 *     description: ${description}
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               input:
 *                 type: object
 *                 description: Request parameters (specific to each endpoint)
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 result:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       description: Response data (specific to each endpoint)
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */`;
}

async function addDocumentationToRouter(
  routerDoc: RouterDocumentation,
): Promise<void> {
  if (!existsSync(routerDoc.filePath)) {
    console.log(`❌ Router file not found: ${routerDoc.filePath}`);
    return;
  }

  try {
    let content = readFileSync(routerDoc.filePath, "utf-8");

    // Check if file already has OpenAPI documentation
    if (content.includes("@openapi")) {
      console.log(`✅ ${routerDoc.filePath} already has OpenAPI documentation`);
      return;
    }

    // Find router export
    const routerExportRegex =
      /export\s+const\s+\w+Router\s*=\s*router\s*\(\s*{/;
    const match = content.match(routerExportRegex);

    if (!match) {
      console.log(`❌ Could not find router export in ${routerDoc.filePath}`);
      return;
    }

    // Add documentation before router export
    const routerPath = routerDoc.filePath
      .replace(/.*\/routers\//, "")
      .replace(/\.router\.ts$/, "")
      .replace(/\//g, ".");

    const docs = routerDoc.procedures
      .map((proc) => generateOpenAPIDoc(proc, routerPath))
      .join("\n");

    const insertIndex = match.index!;
    const newContent =
      content.slice(0, insertIndex) +
      docs +
      "\n\n" +
      content.slice(insertIndex);

    writeFileSync(routerDoc.filePath, newContent, "utf-8");
    console.log(`✅ Added OpenAPI documentation to ${routerDoc.filePath}`);
  } catch (error) {
    console.error(`❌ Error processing ${routerDoc.filePath}:`, error);
  }
}

async function main(): Promise<void> {
  console.log("🚀 Adding OpenAPI documentation to tRPC routers...\n");

  // Find all router files
  const routerFiles = glob.sync("src/server/api/routers/**/*.router.ts");
  console.log(`Found ${routerFiles.length} router files\n`);

  // Process documented routers
  for (const [filePath, doc] of Object.entries(routerDocs)) {
    const fullPath = path.join(
      process.cwd(),
      "src/server/api/routers",
      filePath,
    );
    doc.filePath = fullPath;

    console.log(`📝 Processing: ${filePath}`);
    await addDocumentationToRouter(doc);
  }

  console.log("\n✨ OpenAPI documentation generation completed!");
  console.log("\n📋 Next steps:");
  console.log(
    "1. Check the generated documentation at: http://localhost:3000/fr/developers/api-docs",
  );
  console.log("2. Add more specific input/output schemas for each procedure");
  console.log("3. Add examples and detailed descriptions");
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
