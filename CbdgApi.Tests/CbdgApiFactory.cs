using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace CbdgApi.Tests;

/// <summary>
/// Boots the real app (real Npgsql provider, real migrations, real DbSeeder)
/// against a dedicated `cbdg_test` database - not EF's InMemory provider,
/// which doesn't reproduce relational SaveChanges/SQL-generation behavior
/// like the one this test suite exists to catch.
/// </summary>
public class CbdgApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        var connectionString = Environment.GetEnvironmentVariable("CBDG_TEST_DB_CONNECTION")
            ?? "Host=localhost;Port=5432;Database=cbdg_test;Username=cbdg;Password=cbdg_dev_password";
        builder.UseSetting("ConnectionStrings:Default", connectionString);
    }
}
