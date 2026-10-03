using System.IO;
using System.Reflection;
using System.Text.Json;
using System.Windows;
using System.Windows.Input;
using Microsoft.Extensions.Configuration;
using Microsoft.Web.WebView2.Core;
using Serilog;
using VeloxAgent.Authentication;
using VeloxAgent.Configuration;
using VeloxAgent.Download;
using VeloxAgent.Printer;
using VeloxAgent.Printing;
using VeloxAgent.Queue;
using VeloxAgent.Services;
using VeloxAgent.Utilities;

namespace VeloxAgent.UI;

public partial class MainWindow : Window
{
    private AgentConfig _agentConfig = new();
    private WindowsPrinterDiscoveryService? _printerDiscovery;
    private WebSocketClient? _wsClient;
    private HeartbeatService? _heartbeat;
    private QueueManager? _queueManager;
    private LocalJobRepository? _jobRepository;
    private AgentAuthService? _authService;
    private CancellationTokenSource _cts = new();
    private IReadOnlyList<PrinterInfo> _printers = Array.Empty<PrinterInfo>();
    private DateTime _lastHeartbeatTime = DateTime.MinValue;
    private System.Windows.Threading.DispatcherTimer? _refreshTimer;
    private bool _isConnected;

    public MainWindow()
    {
        InitializeComponent();
        Loaded += MainWindow_Loaded;
        Closing += MainWindow_Closing;
    }

    // ── Title Bar ──────────────────────────────────────────────
    private void TitleBar_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ClickCount == 2)
        {
            WindowState = WindowState == WindowState.Maximized
                ? WindowState.Normal
                : WindowState.Maximized;
        }
        else
        {
            DragMove();
        }
    }

    private void MinimizeButton_Click(object sender, RoutedEventArgs e) => WindowState = WindowState.Minimized;
    private void CloseButton_Click(object sender, RoutedEventArgs e) => Close();

    // ── Initialization ─────────────────────────────────────────
    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        try
        {
            // 1. Load config
            var configPath = Path.Combine(AppContext.BaseDirectory, "appsettings.json");
            if (!File.Exists(configPath))
            {
                // Fall back to the console agent's config
                var agentDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "windows-agent"));
                configPath = Path.Combine(agentDir, "appsettings.json");
            }

            var configuration = new ConfigurationBuilder()
                .SetBasePath(Path.GetDirectoryName(configPath)!)
                .AddJsonFile(Path.GetFileName(configPath), optional: false, reloadOnChange: true)
                .AddEnvironmentVariables(prefix: "VELOX_")
                .Build();

            Log.Logger = new LoggerConfiguration()
                .ReadFrom.Configuration(configuration)
                .Enrich.FromLogContext()
                .Enrich.WithProperty("Application", "VeloxAgent.UI")
                .CreateLogger();

            _agentConfig = new AgentConfig();
            configuration.GetSection(AgentConfig.SectionName).Bind(_agentConfig);

            // 2. Initialize WebView2
            var userDataFolder = Path.Combine(Path.GetTempPath(), "VeloxAgentUI", Environment.ProcessId.ToString());
            var env = await CoreWebView2Environment.CreateAsync(userDataFolder: userDataFolder);
            await WebView.EnsureCoreWebView2Async(env);
            WebView.CoreWebView2.Settings.AreDevToolsEnabled = false;
            WebView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            WebView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;

            // Bridge: JS -> C#
            WebView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;

            // Load embedded HTML
            var html = LoadEmbeddedHtml();
            WebView.CoreWebView2.NavigateToString(html);

            // 3. Start agent services in background
            _ = Task.Run(() => InitializeAgentAsync());

            // 4. Periodic UI refresh every 2 seconds
            _refreshTimer = new System.Windows.Threading.DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(2)
            };
            _refreshTimer.Tick += async (_, _) => await PushStateToUI();
            _refreshTimer.Start();
        }
        catch (Exception ex)
        {
            Log.Logger.Error(ex, "Failed to initialize agent UI");
            MessageBox.Show($"Failed to start Velox Agent:\n{ex.Message}", "Velox Agent", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private string LoadEmbeddedHtml()
    {
        var assembly = Assembly.GetExecutingAssembly();
        var resourceName = assembly.GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith("agent-ui.html"));

        if (resourceName == null)
            return "<html><body><h1>UI resource not found</h1></body></html>";

        using var stream = assembly.GetManifestResourceStream(resourceName)!;
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    // ── Agent Services ─────────────────────────────────────────
    private async Task InitializeAgentAsync()
    {
        try
        {
            var logger = Log.Logger;

            _jobRepository = new LocalJobRepository(_agentConfig, logger);
            _authService = new AgentAuthService(_agentConfig, logger);
            var downloadManager = new DownloadManager(_agentConfig, logger);
            _printerDiscovery = new WindowsPrinterDiscoveryService(logger);
            var printEngine = new WindowsPrintEngine(_printerDiscovery, logger);
            var cleanupService = new CleanupService(_agentConfig, _jobRepository, logger);

            _queueManager = new QueueManager(
                _jobRepository, downloadManager, printEngine,
                cleanupService, _authService, logger);

            _wsClient = new WebSocketClient(_agentConfig, _authService, logger);
            _wsClient.SetQueueManager(_queueManager);
            _queueManager.SetEventEmitter((evt, data) => _wsClient.EmitAsync(evt, data, _cts.Token));

            // Discover printers
            _printers = await _printerDiscovery.DiscoverPrintersAsync(_cts.Token);
            await PushStateToUI();

            // Authenticate
            try
            {
                await _authService.AuthenticateAsync(_cts.Token);
            }
            catch (Exception ex)
            {
                logger.Warning(ex, "Initial auth failed, will retry on connect");
            }

            // Connect WebSocket
            await _wsClient.ConnectAsync(_cts.Token);
            _isConnected = _wsClient.IsConnected;

            // Sync printers
            if (_wsClient.IsConnected && _printers.Count > 0)
            {
                await _wsClient.EmitAsync("agent.printers", new
                {
                    shopId = _agentConfig.ShopId,
                    deviceId = _agentConfig.DeviceId,
                    printers = _printers.Select(p => new
                    {
                        name = p.Name,
                        printerType = p.PrinterType,
                        status = p.Status,
                        pagesPerMinute = p.PagesPerMinute,
                    }).ToList(),
                }, _cts.Token);
            }

            // Start heartbeat
            _heartbeat = new HeartbeatService(_wsClient, _agentConfig, _jobRepository, logger);
            _heartbeat.Start();
            _lastHeartbeatTime = DateTime.Now;

            // Crash recovery
            _ = Task.Run(async () =>
            {
                try { await _queueManager.RecoverInterruptedJobsAsync(_cts.Token); }
                catch { /* already logged */ }
            }, _cts.Token);

            // Heartbeat tracker
            _ = Task.Run(async () =>
            {
                while (!_cts.Token.IsCancellationRequested)
                {
                    await Task.Delay(TimeSpan.FromSeconds(_agentConfig.HeartbeatIntervalSeconds), _cts.Token);
                    _lastHeartbeatTime = DateTime.Now;
                    _isConnected = _wsClient?.IsConnected ?? false;
                }
            }, _cts.Token);

            await PushStateToUI();
        }
        catch (Exception ex)
        {
            Log.Logger.Error(ex, "Agent initialization failed");
        }
    }

    // ── C# -> JS Bridge ────────────────────────────────────────
    private async Task PushStateToUI()
    {
        try
        {
            var heartbeatAgo = _lastHeartbeatTime == DateTime.MinValue
                ? "—"
                : $"{(int)(DateTime.Now - _lastHeartbeatTime).TotalSeconds}s ago";

            int activeQueue = 0;
            if (_jobRepository != null)
            {
                try { activeQueue = await _jobRepository.GetActiveQueueCountAsync(); }
                catch { /* ignore */ }
            }

            var state = new
            {
                connected = _isConnected || (_wsClient?.IsConnected ?? false),
                deviceId = _agentConfig.DeviceId,
                shopId = _agentConfig.ShopId,
                lastHeartbeat = heartbeatAgo,
                activeQueue,
                printers = _printers.Select(p => new
                {
                    name = p.Name,
                    type = p.PrinterType,
                    status = p.Status,
                    isDefault = p.IsDefault,
                    supportsColor = p.SupportsColor,
                    canDuplex = p.CanDuplex,
                    ppm = p.PagesPerMinute,
                    synced = p.Status == "ONLINE",
                }).ToArray(),
            };

            var json = JsonSerializer.Serialize(state);
            var script = $"window.updateState({json})";

            await Dispatcher.InvokeAsync(async () =>
            {
                try
                {
                    if (WebView.CoreWebView2 != null)
                    {
                        await WebView.CoreWebView2.ExecuteScriptAsync(script);
                    }
                }
                catch { /* WebView not ready yet */ }
            });
        }
        catch { /* ignore during initialization */ }
    }

    // ── JS -> C# Bridge ────────────────────────────────────────
    private async void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var message = e.TryGetWebMessageAsString();
            if (message == "refresh-printers" && _printerDiscovery != null)
            {
                _printers = await _printerDiscovery.DiscoverPrintersAsync(_cts.Token);
                await PushStateToUI();
            }
        }
        catch (Exception ex)
        {
            Log.Logger.Warning(ex, "Error handling web message");
        }
    }

    // ── Shutdown ────────────────────────────────────────────────
    private async void MainWindow_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
    {
        _refreshTimer?.Stop();

        try
        {
            _cts.Cancel();
            if (_heartbeat != null) await _heartbeat.StopAsync();
            if (_wsClient != null) await _wsClient.DisposeAsync();
            if (_jobRepository != null) await _jobRepository.DisposeAsync();
        }
        catch { /* graceful shutdown */ }

        await Log.CloseAndFlushAsync();
    }
}
