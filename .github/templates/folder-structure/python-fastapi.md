# Python FastAPI 폴더 구조

> 중대형 FastAPI 프로젝트용 Clean Architecture 구조

---

## 전체 구조

```
{{PROJECT_NAME}}/
│
├── src/
│   └── {{PROJECT_NAME}}/
│       ├── __init__.py
│       ├── main.py                     # FastAPI 앱 진입점
│       ├── config.py                   # 설정 (pydantic-settings)
│       │
│       ├── api/                        # 🌐 API 레이어
│       │   ├── __init__.py
│       │   ├── deps.py                 # 공통 의존성
│       │   └── v1/
│       │       ├── __init__.py
│       │       ├── router.py           # v1 라우터 통합
│       │       └── endpoints/
│       │           ├── __init__.py
│       │           ├── users.py
│       │           ├── auth.py
│       │           └── health.py
│       │
│       ├── domain/                     # 🏛️ 도메인 레이어
│       │   ├── __init__.py
│       │   ├── entities/
│       │   │   ├── __init__.py
│       │   │   ├── base.py             # BaseEntity
│       │   │   └── user.py
│       │   ├── services/
│       │   │   ├── __init__.py
│       │   │   └── user_service.py
│       │   ├── interfaces/             # 추상 인터페이스
│       │   │   ├── __init__.py
│       │   │   └── user_repository.py
│       │   └── exceptions.py
│       │
│       ├── infrastructure/             # 🔧 인프라 레이어
│       │   ├── __init__.py
│       │   ├── database/
│       │   │   ├── __init__.py
│       │   │   ├── session.py          # async session factory
│       │   │   ├── base.py             # declarative base
│       │   │   └── models/
│       │   │       ├── __init__.py
│       │   │       └── user.py
│       │   ├── repositories/
│       │   │   ├── __init__.py
│       │   │   └── user_repository.py
│       │   └── external/               # 외부 API 클라이언트
│       │       ├── __init__.py
│       │       └── email_service.py
│       │
│       ├── schemas/                    # 📦 Pydantic 모델
│       │   ├── __init__.py
│       │   ├── base.py
│       │   ├── user.py
│       │   └── auth.py
│       │
│       └── core/                       # ⚙️ 공통 유틸리티
│           ├── __init__.py
│           ├── security.py             # JWT, 해싱
│           └── exceptions.py           # HTTP 예외 핸들러
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py                     # pytest fixtures
│   ├── factories/                      # 테스트 팩토리
│   │   ├── __init__.py
│   │   └── user_factory.py
│   ├── unit/
│   │   ├── __init__.py
│   │   ├── domain/
│   │   │   └── test_user_service.py
│   │   └── schemas/
│   │       └── test_user_schema.py
│   ├── integration/
│   │   ├── __init__.py
│   │   └── repositories/
│   │       └── test_user_repository.py
│   └── api/
│       ├── __init__.py
│       └── v1/
│           └── test_users.py
│
├── alembic/                            # 🗃️ 마이그레이션
│   ├── versions/
│   │   └── 2026_01_01_initial.py
│   ├── env.py
│   └── script.py.mako
│
├── scripts/                            # 🛠️ 스크립트
│   ├── seed.py
│   └── create_superuser.py
│
├── docs/                               # 📚 문서
│   └── api/
│
├── pyproject.toml
├── alembic.ini
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .pre-commit-config.yaml
├── .gitignore
└── README.md
```

---

## 레이어 의존성

```
┌─────────────────────────────────────────────────────────┐
│                         API                              │
│  (endpoints, deps, router)                              │
└─────────────────────────┬───────────────────────────────┘
                          │ imports
                          ▼
┌─────────────────────────────────────────────────────────┐
│                       Domain                             │
│  (services, entities, interfaces)                       │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ implements
┌─────────────────────────┴───────────────────────────────┐
│                   Infrastructure                         │
│  (database, repositories, external)                     │
└─────────────────────────────────────────────────────────┘
```

**의존성 규칙**:
- `domain` → 순수 Python (외부 의존성 최소)
- `infrastructure` → domain.interfaces 구현
- `api` → domain.services 호출
- `schemas` → 모든 레이어에서 사용

---

## 핵심 파일 예시

### main.py

```python
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from {{PROJECT_NAME}}.api.v1.router import api_router
from {{PROJECT_NAME}}.config import settings
from {{PROJECT_NAME}}.core.exceptions import setup_exception_handlers
from {{PROJECT_NAME}}.infrastructure.database.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """애플리케이션 라이프사이클."""
    await init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
setup_exception_handlers(app)

# Routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
```

### config.py

```python
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """애플리케이션 설정."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )
    
    # App
    PROJECT_NAME: str = "{{PROJECT_NAME}}"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str
    
    # Security
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
```

### api/deps.py

```python
from typing import Annotated
from collections.abc import AsyncIterator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from {{PROJECT_NAME}}.infrastructure.database.session import async_session_factory
from {{PROJECT_NAME}}.infrastructure.repositories.user_repository import UserRepository
from {{PROJECT_NAME}}.domain.services.user_service import UserService


async def get_db_session() -> AsyncIterator[AsyncSession]:
    """데이터베이스 세션 의존성."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


DbSession = Annotated[AsyncSession, Depends(get_db_session)]


def get_user_repository(session: DbSession) -> UserRepository:
    """UserRepository 의존성."""
    return UserRepository(session)


def get_user_service(
    repository: Annotated[UserRepository, Depends(get_user_repository)],
) -> UserService:
    """UserService 의존성."""
    return UserService(repository)


UserServiceDep = Annotated[UserService, Depends(get_user_service)]
```

---

## 설정 파일

### pyproject.toml

```toml
[project]
name = "{{PROJECT_NAME}}"
version = "0.1.0"
description = "{{PROJECT_DESCRIPTION}}"
requires-python = ">=3.11"

dependencies = [
    "fastapi>=0.109.0",
    "uvicorn[standard]>=0.27.0",
    "sqlalchemy[asyncio]>=2.0.0",
    "asyncpg>=0.29.0",
    "pydantic>=2.5.0",
    "pydantic-settings>=2.1.0",
    "alembic>=1.13.0",
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "pytest-cov>=4.1.0",
    "httpx>=0.26.0",
    "factory-boy>=3.3.0",
    "ruff>=0.2.0",
    "mypy>=1.8.0",
    "pre-commit>=3.6.0",
]

[tool.ruff]
target-version = "py311"
line-length = 88
src = ["src", "tests"]

[tool.ruff.lint]
select = [
    "E",    # pycodestyle errors
    "W",    # pycodestyle warnings
    "F",    # pyflakes
    "I",    # isort
    "N",    # pep8-naming
    "UP",   # pyupgrade
    "B",    # flake8-bugbear
    "C4",   # flake8-comprehensions
    "SIM",  # flake8-simplify
    "ARG",  # flake8-unused-arguments
    "PTH",  # flake8-use-pathlib
]

[tool.ruff.lint.isort]
known-first-party = ["{{PROJECT_NAME}}"]

[tool.mypy]
python_version = "3.11"
strict = true
plugins = ["pydantic.mypy"]

[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
addopts = "-v --cov=src --cov-report=term-missing"

[tool.coverage.run]
source = ["src"]
omit = ["*/tests/*", "*/__init__.py"]
```

### .env.example

```bash
# App
DEBUG=true

# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/{{PROJECT_NAME}}

# Security
SECRET_KEY=your-secret-key-here-change-in-production
```

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-05 | 초기 버전 생성 |
