using System.Diagnostics;
using TranskriptOkuyucu.Common;
using TranskriptOkuyucu.Endpoints;
using TranskriptOkuyucu.Services;

using Serilog;
using FluentValidation;
using Microsoft.Extensions.Http.Resilience;

var options = new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory,
    WebRootPath = Directory.Exists(Path.Combine(AppContext.BaseDirectory, "wwwroot"))
        ? Path.Combine(AppContext.BaseDirectory, "wwwroot")
        : Path.Combine(Directory.GetCurrentDirectory(), "wwwroot")
};

var builder = WebApplication.CreateBuilder(options);

// Configure Serilog
builder.Host.UseSerilog((context, loggerConfiguration) => 
    loggerConfiguration.WriteTo.Console()
                       .Enrich.FromLogContext());

// Register FluentValidation
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// Port Configuration (Defaults to 5241 unless overridden by environment)
var configuredUrl = Environment.GetEnvironmentVariable("ASPNETCORE_URLS") 
    ?? builder.Configuration["Urls"] 
    ?? "http://localhost:5241";
builder.WebHost.UseUrls(configuredUrl);

// Register Global Exception Handler
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

// Register Core Services with Memory Constraints
builder.Services.AddMemoryCache(cacheOptions =>
{
    cacheOptions.SizeLimit = builder.Configuration.GetValue<long>("Cache:SizeLimit", 500000);
    cacheOptions.CompactionPercentage = builder.Configuration.GetValue<double>("Cache:CompactionPercentage", 0.20);
    cacheOptions.ExpirationScanFrequency = TimeSpan.FromMinutes(builder.Configuration.GetValue<int>("Cache:ExpirationScanMinutes", 3));
});
builder.Services.AddResponseCompression();
builder.Services.AddHttpClient();

// Register Infrastructure & Concurrency Lock
builder.Services.AddSingleton<KeyedLock>();

// Register Application & Domain Services
builder.Services.AddSingleton<IEnglishLemmatizer, EnglishLemmatizer>();
builder.Services.AddSingleton<ILocalDictionaryRepository, LocalDictionaryRepository>();
builder.Services.AddHttpClient<IDictionaryApiClient, DictionaryApiClient>(client =>
{
    var dictConfig = builder.Configuration.GetSection("DictionaryApi");
    var baseUrl = dictConfig["BaseUrl"] ?? "https://api.dictionaryapi.dev/api/v2/entries/en/";
    var userAgent = dictConfig["UserAgent"] ?? "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
    
    client.BaseAddress = new Uri(baseUrl);
    client.DefaultRequestHeaders.Add("User-Agent", userAgent);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
}).AddStandardResilienceHandler();

builder.Services.AddHttpClient<ITranslationService, TranslationService>().AddStandardResilienceHandler();
builder.Services.AddHttpClient<IYouTubeTranscriptService, YouTubeTranscriptService>().AddStandardResilienceHandler();
builder.Services.AddSingleton<IDocxExportService, DocxExportService>();
builder.Services.AddSingleton<IDictionaryService, DictionaryService>();

// Enable CORS for local access
builder.Services.AddCors(corsOptions =>
{
    corsOptions.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseExceptionHandler();

app.UseResponseCompression();
app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();

// Register Modular Endpoints
app.MapTranscriptEndpoints();
app.MapDictionaryEndpoints();

// Friendly Console Banner & Auto-open Browser
app.Lifetime.ApplicationStarted.Register(() =>
{
    var appUrl = configuredUrl.Split(';').FirstOrDefault() ?? "http://localhost:5241";
    Console.ForegroundColor = ConsoleColor.Cyan;
    Console.WriteLine();
    Console.WriteLine("╔══════════════════════════════════════════════════════════════╗");
    Console.WriteLine("║   🎬 YouTube Transkript Okuyucu Başarıyla Başlatıldı!        ║");
    Console.WriteLine($"║   👉 Tarayıcınızda açın: {appUrl,-36}║");
    Console.WriteLine("║   💡 Kapatmak için: Ctrl + C tuşlarına basın.                ║");
    Console.WriteLine("╚══════════════════════════════════════════════════════════════╝");
    Console.WriteLine();
    Console.ResetColor();

    try
    {
        if (OperatingSystem.IsWindows())
        {
            Process.Start(new ProcessStartInfo(appUrl) { UseShellExecute = true });
        }
        else if (OperatingSystem.IsMacOS())
        {
            Process.Start("open", appUrl);
        }
        else if (OperatingSystem.IsLinux())
        {
            Process.Start("xdg-open", appUrl);
        }
    }
    catch
    {
        // Browser opening failure is non-fatal
    }
});

app.Run();
