#!/usr/bin/env tsx

import { Command } from "commander";
import { Logger } from "./helpers/logger.helper";
import { AnnouncementTests } from "./tests/annonces/annonces.test";
import { runFullDeliveryCycle } from "./scenarios/full-cycle";
import { runClientFlowScenario } from "./scenarios/client-flow";
import { runDelivererFlowScenario } from "./scenarios/deliverer-flow";
import { testUsers, TestUser } from "./config/users.config";

const logger = new Logger("API-Test-CLI");

const program = new Command();

program.name("api-test").description("EcoDeli API Test Suite").version("1.0.0");

// Test announcements
program
  .command("annonces")
  .description("Test announcement endpoints")
  .option(
    "-u, --user <user>",
    "User to test as (client, deliverer, merchant, etc.)",
    "client",
  )
  .option(
    "-a, --action <action>",
    "Specific action to test (create, list, get, update, delete, all)",
    "all",
  )
  .action(async (options) => {
    logger.title("Testing Announcements Module");

    const user = testUsers[options.user];
    if (!user) {
      logger.error(`Unknown user: ${options.user}`);
      process.exit(1);
    }

    const tests = new AnnouncementTests();

    switch (options.action) {
      case "create":
        await tests.testCreateAnnouncement(user);
        break;
      case "list":
        await tests.testListAnnouncements(user);
        break;
      case "all":
        await tests.runAllTests();
        break;
      default:
        logger.error(`Unknown action: ${options.action}`);
    }
  });

// Run scenarios
program
  .command("scenario")
  .description("Run end-to-end scenarios")
  .option(
    "-s, --scenario <name>",
    "Scenario to run (full-cycle, client-flow, deliverer-flow)",
    "full-cycle",
  )
  .action(async (options) => {
    logger.title(`Running Scenario: ${options.scenario}`);

    switch (options.scenario) {
      case "full-cycle":
        await runFullDeliveryCycle();
        break;
      case "client-flow":
        await runClientFlowScenario();
        break;
      case "deliverer-flow":
        await runDelivererFlowScenario();
        break;
      default:
        logger.error(`Unknown scenario: ${options.scenario}`);
    }
  });

// Test specific endpoint
program
  .command("endpoint <procedure>")
  .description("Test a specific tRPC endpoint")
  .option("-u, --user <user>", "User to test as", "client")
  .option("-i, --input <json>", "Input data as JSON string", "{}")
  .action(async (procedure, options) => {
    logger.title(`Testing Endpoint: ${procedure}`);

    const user = testUsers[options.user];
    if (!user) {
      logger.error(`Unknown user: ${options.user}`);
      process.exit(1);
    }

    try {
      const input = JSON.parse(options.input);
      const { RequestHelper } = await import("./helpers/request.helper");

      const result = await RequestHelper.trpc(user, procedure, input);
      logger.success("Response received:", result);
    } catch (error) {
      logger.error("Test failed", error);
      process.exit(1);
    }
  });

// List available users
program
  .command("users")
  .description("List all available test users")
  .action(() => {
    logger.title("Available Test Users");

    Object.entries(testUsers).forEach(([key, user]) => {
      logger.info(`${key}: ${user.email} (${user.role}) - ${user.description}`);
    });
  });

// Test auth
program
  .command("auth")
  .description("Test authentication")
  .option("-u, --user <user>", "User to authenticate as", "client")
  .option(
    "-a, --action <action>",
    "Auth action (login, logout, session)",
    "login",
  )
  .action(async (options) => {
    logger.title("Testing Authentication");

    const user = testUsers[options.user];
    if (!user) {
      logger.error(`Unknown user: ${options.user}`);
      process.exit(1);
    }

    const { AuthHelper } = await import("./helpers/auth.helper");

    switch (options.action) {
      case "login":
        const result = await AuthHelper.login({
          email: user.email,
          password: user.password,
        });
        if (result.success) {
          logger.success("Login successful", {
            email: result.session?.user.email,
            role: result.session?.user.role,
          });
        } else {
          logger.error("Login failed", result.error);
        }
        break;

      case "logout":
        await AuthHelper.logout(user.email);
        break;

      case "session":
        const session = await AuthHelper.getSession(user);
        if (session) {
          logger.success("Session active", {
            email: session.user.email,
            expiresAt: session.expiresAt,
          });
        } else {
          logger.error("No active session");
        }
        break;

      default:
        logger.error(`Unknown action: ${options.action}`);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
