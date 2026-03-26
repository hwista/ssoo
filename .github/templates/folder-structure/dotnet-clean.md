# .NET Clean Architecture 폴더 구조

> 중대형 .NET 프로젝트용 Clean Architecture 구조

---

## 전체 구조

```
{{PROJECT_NAME}}/
│
├── src/
│   ├── {{PROJECT_NAME}}.Api/
│   │   ├── Controllers/
│   │   │   └── V1/
│   │   │       └── UsersController.cs
│   │   ├── Middleware/
│   │   │   ├── ExceptionHandlingMiddleware.cs
│   │   │   └── RequestLoggingMiddleware.cs
│   │   ├── Filters/
│   │   │   └── ValidationFilter.cs
│   │   ├── Extensions/
│   │   │   └── ServiceCollectionExtensions.cs
│   │   ├── Program.cs
│   │   ├── appsettings.json
│   │   ├── appsettings.Development.json
│   │   └── {{PROJECT_NAME}}.Api.csproj
│   │
│   ├── {{PROJECT_NAME}}.Application/
│   │   ├── Common/
│   │   │   ├── Behaviors/
│   │   │   │   ├── LoggingBehavior.cs
│   │   │   │   ├── ValidationBehavior.cs
│   │   │   │   └── TransactionBehavior.cs
│   │   │   ├── Interfaces/
│   │   │   │   ├── IApplicationDbContext.cs
│   │   │   │   ├── ICurrentUser.cs
│   │   │   │   └── IDateTime.cs
│   │   │   ├── Mappings/
│   │   │   │   └── MappingProfile.cs
│   │   │   └── Models/
│   │   │       ├── Result.cs
│   │   │       └── PaginatedList.cs
│   │   │
│   │   ├── Users/
│   │   │   ├── Commands/
│   │   │   │   ├── CreateUser/
│   │   │   │   │   ├── CreateUserCommand.cs
│   │   │   │   │   ├── CreateUserHandler.cs
│   │   │   │   │   └── CreateUserValidator.cs
│   │   │   │   └── UpdateUser/
│   │   │   │       └── ...
│   │   │   ├── Queries/
│   │   │   │   ├── GetUser/
│   │   │   │   │   ├── GetUserQuery.cs
│   │   │   │   │   ├── GetUserHandler.cs
│   │   │   │   │   └── UserDto.cs
│   │   │   │   └── GetUsers/
│   │   │   │       └── ...
│   │   │   └── EventHandlers/
│   │   │       └── UserCreatedEventHandler.cs
│   │   │
│   │   ├── DependencyInjection.cs
│   │   └── {{PROJECT_NAME}}.Application.csproj
│   │
│   ├── {{PROJECT_NAME}}.Domain/
│   │   ├── Common/
│   │   │   ├── BaseEntity.cs
│   │   │   ├── BaseAuditableEntity.cs
│   │   │   └── IDomainEvent.cs
│   │   ├── Entities/
│   │   │   └── User.cs
│   │   ├── ValueObjects/
│   │   │   ├── Email.cs
│   │   │   └── Address.cs
│   │   ├── Enums/
│   │   │   └── UserStatus.cs
│   │   ├── Events/
│   │   │   ├── UserCreatedEvent.cs
│   │   │   └── UserDeactivatedEvent.cs
│   │   ├── Exceptions/
│   │   │   ├── DomainException.cs
│   │   │   └── ValidationException.cs
│   │   └── {{PROJECT_NAME}}.Domain.csproj
│   │
│   ├── {{PROJECT_NAME}}.Infrastructure/
│   │   ├── Data/
│   │   │   ├── ApplicationDbContext.cs
│   │   │   ├── Configurations/
│   │   │   │   └── UserConfiguration.cs
│   │   │   ├── Migrations/
│   │   │   ├── Interceptors/
│   │   │   │   ├── AuditableEntityInterceptor.cs
│   │   │   │   └── DispatchDomainEventsInterceptor.cs
│   │   │   └── Seed/
│   │   │       └── ApplicationDbContextSeed.cs
│   │   ├── Identity/
│   │   │   ├── IdentityService.cs
│   │   │   └── CurrentUser.cs
│   │   ├── Services/
│   │   │   ├── DateTimeService.cs
│   │   │   └── EmailService.cs
│   │   ├── DependencyInjection.cs
│   │   └── {{PROJECT_NAME}}.Infrastructure.csproj
│   │
│   └── {{PROJECT_NAME}}.Shared/
│       ├── Extensions/
│       │   ├── StringExtensions.cs
│       │   └── DateTimeExtensions.cs
│       └── {{PROJECT_NAME}}.Shared.csproj
│
├── tests/
│   ├── {{PROJECT_NAME}}.UnitTests/
│   │   ├── Domain/
│   │   │   └── UserTests.cs
│   │   ├── Application/
│   │   │   └── Users/
│   │   │       └── CreateUserTests.cs
│   │   └── {{PROJECT_NAME}}.UnitTests.csproj
│   │
│   ├── {{PROJECT_NAME}}.IntegrationTests/
│   │   ├── Common/
│   │   │   ├── BaseIntegrationTest.cs
│   │   │   └── TestWebApplicationFactory.cs
│   │   ├── Controllers/
│   │   │   └── UsersControllerTests.cs
│   │   └── {{PROJECT_NAME}}.IntegrationTests.csproj
│   │
│   └── {{PROJECT_NAME}}.FunctionalTests/
│       ├── Scenarios/
│       │   └── UserScenarios.cs
│       └── {{PROJECT_NAME}}.FunctionalTests.csproj
│
├── docs/
│   ├── architecture/
│   │   └── decisions/
│   └── api/
│
├── Directory.Build.props
├── Directory.Packages.props
├── {{PROJECT_NAME}}.sln
├── .editorconfig
├── .gitignore
├── README.md
└── docker-compose.yml
```

---

## 프로젝트 참조 관계

```
┌─────────────────────────────────────────────────────────┐
│                        Api                               │
│  (Controllers, Middleware, Program.cs)                  │
└─────────────────────────┬───────────────────────────────┘
                          │ references
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Application                           │
│  (Commands, Queries, Handlers, DTOs)                    │
└─────────────────────────┬───────────────────────────────┘
                          │ references
                          ▼
┌─────────────────────────────────────────────────────────┐
│                      Domain                              │
│  (Entities, ValueObjects, Events, Exceptions)           │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ references
┌─────────────────────────┴───────────────────────────────┐
│                   Infrastructure                         │
│  (DbContext, Repositories, External Services)           │
└─────────────────────────────────────────────────────────┘
```

**의존성 규칙**:
- `Domain` → 의존성 없음 (순수 C#)
- `Application` → Domain
- `Infrastructure` → Application, Domain
- `Api` → Application, Infrastructure (DI 등록 목적)

---

## 루트 설정 파일

### Directory.Build.props

```xml
<Project>
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <AnalysisLevel>latest-recommended</AnalysisLevel>
  </PropertyGroup>
  
  <ItemGroup>
    <Using Include="System.ComponentModel.DataAnnotations" />
  </ItemGroup>
</Project>
```

### Directory.Packages.props

```xml
<Project>
  <PropertyGroup>
    <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
  </PropertyGroup>
  
  <ItemGroup>
    <!-- Core -->
    <PackageVersion Include="MediatR" Version="12.2.0" />
    <PackageVersion Include="FluentValidation" Version="11.9.0" />
    <PackageVersion Include="FluentValidation.DependencyInjectionExtensions" Version="11.9.0" />
    <PackageVersion Include="AutoMapper" Version="12.0.1" />
    
    <!-- EF Core -->
    <PackageVersion Include="Microsoft.EntityFrameworkCore" Version="8.0.1" />
    <PackageVersion Include="Microsoft.EntityFrameworkCore.SqlServer" Version="8.0.1" />
    <PackageVersion Include="Microsoft.EntityFrameworkCore.Tools" Version="8.0.1" />
    
    <!-- Testing -->
    <PackageVersion Include="xunit" Version="2.6.6" />
    <PackageVersion Include="Moq" Version="4.20.70" />
    <PackageVersion Include="FluentAssertions" Version="6.12.0" />
    <PackageVersion Include="Microsoft.AspNetCore.Mvc.Testing" Version="8.0.1" />
  </ItemGroup>
</Project>
```

### .editorconfig

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 4
insert_final_newline = true
trim_trailing_whitespace = true

[*.cs]
# Naming conventions
dotnet_naming_rule.private_fields_with_underscore.symbols = private_fields
dotnet_naming_rule.private_fields_with_underscore.style = prefix_underscore
dotnet_naming_rule.private_fields_with_underscore.severity = warning

dotnet_naming_symbols.private_fields.applicable_kinds = field
dotnet_naming_symbols.private_fields.applicable_accessibilities = private

dotnet_naming_style.prefix_underscore.required_prefix = _
dotnet_naming_style.prefix_underscore.capitalization = camel_case

# Code style
csharp_style_var_for_built_in_types = true:suggestion
csharp_style_var_when_type_is_apparent = true:suggestion
csharp_prefer_braces = true:warning
csharp_using_directive_placement = outside_namespace:warning
csharp_prefer_static_local_function = true:suggestion
csharp_prefer_simple_using_statement = true:suggestion
csharp_style_namespace_declarations = file_scoped:warning

[*.{json,yaml,yml}]
indent_size = 2
```

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-05 | 초기 버전 생성 |
