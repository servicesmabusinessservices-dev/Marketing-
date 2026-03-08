# MySQL Free Host Setup + EF Migrations

This backend is now configured for MySQL migrations.

## Connection configuration

`appsettings.Development.json` uses:

```json
"ConnectionStrings": {
  "MySql": "Server=sql12.freesqldatabase.com;Port=3306;Database=sql12818835;User=sql12818835;Password=CHANGE_ME;SslMode=Preferred;"
}
```

Do not commit real passwords. Use env vars instead.

## Recommended secure runtime credentials

PowerShell:

```powershell
$env:MYSQL_PASSWORD="<YOUR_REAL_PASSWORD>"
```

Optional full override:

```powershell
$env:MYSQL_CONNECTION_STRING="Server=sql12.freesqldatabase.com;Port=3306;Database=sql12818835;User=sql12818835;Password=<YOUR_REAL_PASSWORD>;SslMode=Preferred;"
```

## EF migration commands

From workspace root:

```powershell
dotnet restore .\GmailManager.Api\GmailManager.Api.csproj
dotnet build .\GmailManager.Api\GmailManager.Api.csproj

dotnet ef migrations add InitialMySql --project .\GmailManager.Api\GmailManager.Api.csproj --startup-project .\GmailManager.Api\GmailManager.Api.csproj --context AppDbContext --output-dir Migrations

dotnet ef database update --project .\GmailManager.Api\GmailManager.Api.csproj --startup-project .\GmailManager.Api\GmailManager.Api.csproj --context AppDbContext
```

## Run API

```powershell
dotnet run --project .\GmailManager.Api\GmailManager.Api.csproj
```

## Notes

- If `database update` fails with access denied, verify the password in your provider dashboard and set `MYSQL_PASSWORD`.
- `SslMode=Preferred` is enabled for compatibility with free hosts.
