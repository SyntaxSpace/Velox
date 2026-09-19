using Microsoft.Extensions.Configuration;
using Serilog;
using VeloxAgent.Authentication;
using VeloxAgent.Configuration;
using VeloxAgent.Download;
using VeloxAgent.Printer;
using VeloxAgent.Printing;
using VeloxAgent.Queue;
using VeloxAgent.Services;
using VeloxAgent.Utilities;

namespace VeloxAgent;

/// <summary>
/// Velox Windows Agent — Entry Point
/// Bridges the Velox Cloud Platform with physical Windows printers.
/// Day 5: Full printing pipeline with authentication, SQLite persistence,
/// download manager, printer discovery, silent spooler, and cleanup.
/// </summary>
public class Program
{
    public static async Task Main(string[] args)
    {
        Console.WriteLine("╔══════════════════════════════════════╗");
        Console.WriteLine("║       Velox Windows Agent v1.0       ║");
        Console.WriteLine("║    Scan. Upload. Done.               ║");
        Console.WriteLine("╚══════════════════════════════════════╝");
        Console.WriteLine();

        // Load configuration
        var configuration = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
            .AddEnvironmentVariables(prefix: "VELOX_")
            .AddCommandLine(args)
            .Build();

        // Initialize Serilog
        Log.Logger = new LoggerConfiguration()
            .ReadFrom.Configuration(configuration)
            .Enrich.FromLogContext()
            .Enrich.WithProperty("Application", "VeloxAgent")
            .CreateLogger();

        var logger = Log.Logger;

        try
        {
            logger.Information("Velox Windows Agent starting...");

            // 1. Bind and validate configuration
            var agentConfig = new AgentConfig();
            configuration.GetSection(AgentConfig.SectionName).Bind(agentConfig);

            var validationErrors = agentConfig.Validate();
            if (validationErrors.Count > 0)
            {
                foreach (var error in validationErrors)
                {
                    logger.Error("Configuration error: {Error}", error);
                }
                logger.Fatal("Agent cannot start due to configuration errors");
                return;
            }

            logger.Information("Configuration loaded successfully. ShopId: {ShopId}, DeviceId: {DeviceId}",
                agentConfig.ShopId, agentConfig.DeviceId);

            using var cts = new CancellationTokenSource();
            Console.CancelKeyPress += (_, e) =>
            {
                e.Cancel = true;
                cts.Cancel();
            };

            // 2. Initialize local SQLite Queue Persistence
            await using var jobRepository = new LocalJobRepository(agentConfig, logger);

            // 3. Initialize Authentication Service
            var authService = new AgentAuthService(agentConfig, logger);

            // 4. Initialize Download, Printer Discovery, Spooler, and Cleanup Services
            var downloadManager = new DownloadManager(agentConfig, logger);
            var printerDiscovery = new WindowsPrinterDiscoveryService(logger);
            var printEngine = new WindowsPrintEngine(printerDiscovery, logger);
            var cleanupService = new CleanupService(agentConfig, jobRepository, logger);

            // 5. Initialize Queue Manager
            var queueManager = new QueueManager(
                jobRepository,
                downloadManager,
                printEngine,
                cleanupService,
                authService,
                logger);

            // 6. Initialize WebSocket Client & Heartbeat Service
            await using var wsClient = new WebSocketClient(agentConfig, authService, logger);
            wsClient.SetQueueManager(queueManager);
            queueManager.SetEventEmitter((evt, data) => wsClient.EmitAsync(evt, data, cts.Token));

            var heartbeat = new HeartbeatService(wsClient, agentConfig, jobRepository, logger);

            // 7. Discover Windows Printers
            logger.Information("Discovering installed Windows printers...");
            var printers = await printerDiscovery.DiscoverPrintersAsync(cts.Token);
            logger.Information("Discovered {Count} local printer(s)", printers.Count);

            // 8. Authenticate with Velox Cloud Backend (Device Login)
            logger.Information("Authenticating agent with backend...");
            try
            {
                await authService.AuthenticateAsync(cts.Token);
            }
            catch (Exception ex)
            {
                logger.Warning(ex, "Initial authentication attempt failed. Will retry during connect loop.");
            }

            // 9. Connect to WebSocket Gateway
            await wsClient.ConnectAsync(cts.Token);

            // 10. Sync Discovered Printers with Backend
            if (wsClient.IsConnected && printers.Count > 0)
            {
                await wsClient.EmitAsync("agent.printers", new
                {
                    shopId = agentConfig.ShopId,
                    deviceId = agentConfig.DeviceId,
                    printers = printers.Select(p => new
                    {
                        name = p.Name,
                        printerType = p.PrinterType,
                        status = p.Status,
                        pagesPerMinute = p.PagesPerMinute,
                    }).ToList(),
                }, cts.Token);
            }

            // 11. Start Heartbeat Service
            heartbeat.Start();

            // 12. Crash Recovery: Check for unfinished jobs from previous session
            _ = Task.Run(async () =>
            {
                try
                {
                    await queueManager.RecoverInterruptedJobsAsync(cts.Token);
                }
                catch (Exception ex)
                {
                    logger.Error(ex, "Crash recovery encountered an error");
                }
            }, cts.Token);

            logger.Information("Agent is fully operational and listening for jobs. Press Ctrl+C to exit.");

            // Keep running until cancelled
            try
            {
                await Task.Delay(Timeout.Infinite, cts.Token);
            }
            catch (TaskCanceledException)
            {
                // Expected on shutdown
            }

            // Graceful shutdown
            await heartbeat.StopAsync();
            logger.Information("Agent shut down gracefully");
        }
        catch (Exception ex)
        {
            logger.Fatal(ex, "Agent terminated unexpectedly");
        }
        finally
        {
            await Log.CloseAndFlushAsync();
        }
    }
}
