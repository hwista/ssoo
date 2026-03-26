# .NET 스택 확장 템플릿

> `_base.md`를 기반으로 .NET 프로젝트에 추가할 내용

---

## 기술 스택

### 백엔드
- .NET 8.x (ASP.NET Core)
- C# 12
- Entity Framework Core 8.x
- SQL Server / PostgreSQL
- MediatR (CQRS 패턴)
- FluentValidation
- Serilog (로깅)

### 프론트엔드 (선택)
- Blazor (Server/WASM)
- Razor Pages
- 또는 별도 SPA (React/Vue)

### 인프라
- Docker, Azure/AWS
- GitHub Actions CI/CD

---

## 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 클래스 | PascalCase | `UserService` |
| 인터페이스 | I + PascalCase | `IUserRepository` |
| 메서드 | PascalCase | `GetUserById` |
| 변수/파라미터 | camelCase | `userId` |
| 상수 | PascalCase | `DefaultPageSize` |
| private 필드 | _camelCase | `_userRepository` |
| 네임스페이스 | PascalCase.Dot | `Company.Project.Domain` |
| DTO | PascalCase + Dto | `CreateUserDto` |
| 커맨드/쿼리 | 동사 + 명사 | `CreateUserCommand` |

---

## 폴더 구조

### Clean Architecture

```
src/
├── {{PROJECT_NAME}}.Api/           # 진입점 (Controllers, Middleware)
│   ├── Controllers/
│   ├── Middleware/
│   ├── Program.cs
│   └── appsettings.json
│
├── {{PROJECT_NAME}}.Application/   # 유스케이스 (CQRS)
│   ├── Commands/
│   │   └── CreateUser/
│   │       ├── CreateUserCommand.cs
│   │       ├── CreateUserHandler.cs
│   │       └── CreateUserValidator.cs
│   ├── Queries/
│   ├── Interfaces/
│   ├── DTOs/
│   └── Behaviors/                  # MediatR Pipeline
│
├── {{PROJECT_NAME}}.Domain/        # 엔티티, 비즈니스 로직
│   ├── Entities/
│   ├── ValueObjects/
│   ├── Enums/
│   ├── Events/
│   └── Exceptions/
│
├── {{PROJECT_NAME}}.Infrastructure/ # 외부 의존성
│   ├── Data/
│   │   ├── ApplicationDbContext.cs
│   │   ├── Configurations/         # EF 설정
│   │   └── Migrations/
│   ├── Repositories/
│   └── Services/                   # 외부 API 호출
│
└── {{PROJECT_NAME}}.Shared/        # 공유 유틸리티
    ├── Extensions/
    └── Helpers/

tests/
├── {{PROJECT_NAME}}.UnitTests/
├── {{PROJECT_NAME}}.IntegrationTests/
└── {{PROJECT_NAME}}.FunctionalTests/
```

### Minimal API (간단한 프로젝트)

```
src/
├── {{PROJECT_NAME}}/
│   ├── Endpoints/
│   │   ├── UserEndpoints.cs
│   │   └── ...
│   ├── Data/
│   │   ├── AppDbContext.cs
│   │   └── Entities/
│   ├── Services/
│   ├── DTOs/
│   ├── Program.cs
│   └── appsettings.json
│
tests/
└── {{PROJECT_NAME}}.Tests/
```

---

## 레이어 의존성

```
Api → Application → Domain
 ↓         ↓
Infrastructure ──→ Domain
```

- **Domain**: 의존성 없음 (순수 C#)
- **Application**: Domain만 참조
- **Infrastructure**: Domain, Application 참조
- **Api**: 모든 레이어 참조 (DI 등록)

---

## 코드 패턴

### Controller 패턴

```csharp
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly ISender _mediator;

    public UsersController(ISender mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetUserQuery(id), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateUserDto dto, CancellationToken ct)
    {
        var id = await _mediator.Send(new CreateUserCommand(dto), ct);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }
}
```

### CQRS Handler 패턴

```csharp
public record CreateUserCommand(CreateUserDto Dto) : IRequest<Guid>;

public class CreateUserHandler : IRequestHandler<CreateUserCommand, Guid>
{
    private readonly IApplicationDbContext _context;

    public CreateUserHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(CreateUserCommand request, CancellationToken ct)
    {
        var user = User.Create(request.Dto.Name, request.Dto.Email);
        
        _context.Users.Add(user);
        await _context.SaveChangesAsync(ct);
        
        return user.Id;
    }
}
```

### FluentValidation

```csharp
public class CreateUserValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserValidator()
    {
        RuleFor(x => x.Dto.Name)
            .NotEmpty().WithMessage("Name is required")
            .MaximumLength(100);
            
        RuleFor(x => x.Dto.Email)
            .NotEmpty()
            .EmailAddress();
    }
}
```

### Entity 패턴 (Rich Domain Model)

```csharp
public class User : BaseEntity
{
    public string Name { get; private set; } = default!;
    public Email Email { get; private set; } = default!;
    public UserStatus Status { get; private set; }
    
    private User() { } // EF Core용
    
    public static User Create(string name, string email)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = name,
            Email = Email.Create(email),
            Status = UserStatus.Active,
            CreatedAt = DateTime.UtcNow
        };
        
        user.AddDomainEvent(new UserCreatedEvent(user.Id));
        return user;
    }
    
    public void Deactivate()
    {
        if (Status == UserStatus.Inactive)
            throw new DomainException("User already inactive");
            
        Status = UserStatus.Inactive;
        AddDomainEvent(new UserDeactivatedEvent(Id));
    }
}
```

---

## EF Core 설정

### DbContext

```csharp
public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) 
        : base(options) { }
    
    public DbSet<User> Users => Set<User>();
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(
            typeof(ApplicationDbContext).Assembly);
    }
}
```

### Entity Configuration

```csharp
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");
        
        builder.HasKey(x => x.Id);
        
        builder.Property(x => x.Name)
            .HasMaxLength(100)
            .IsRequired();
            
        builder.OwnsOne(x => x.Email, email =>
        {
            email.Property(e => e.Value)
                .HasColumnName("Email")
                .HasMaxLength(255)
                .IsRequired();
        });
        
        builder.HasIndex(x => x.Email)
            .IsUnique();
    }
}
```

---

## 🚫 금지 사항

1. **Anemic Domain Model** - Entity에 비즈니스 로직 없이 DTO처럼 사용
2. **public setter** - 상태 변경은 메서드로만
3. **Controller에서 직접 DbContext 사용** - Application 레이어 경유
4. **Exception for flow control** - Result 패턴 권장
5. **async void** - 항상 `Task` 반환
6. **Magic string** - 상수 또는 enum 사용
7. **God class** - 단일 책임 원칙 준수
8. **Circular dependency** - 레이어 방향 준수

---

## ✅ 필수 설정 파일

### Directory.Build.props (루트)

```xml
<Project>
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  </PropertyGroup>
</Project>
```

### .editorconfig

```ini
root = true

[*.cs]
indent_style = space
indent_size = 4

# Naming
dotnet_naming_rule.private_fields_with_underscore.symbols = private_fields
dotnet_naming_rule.private_fields_with_underscore.style = prefix_underscore
dotnet_naming_rule.private_fields_with_underscore.severity = suggestion

dotnet_naming_symbols.private_fields.applicable_kinds = field
dotnet_naming_symbols.private_fields.applicable_accessibilities = private

dotnet_naming_style.prefix_underscore.required_prefix = _
dotnet_naming_style.prefix_underscore.capitalization = camel_case
```

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-05 | 초기 버전 생성 |
