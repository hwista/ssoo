# Python 스택 확장 템플릿

> `_base.md`를 기반으로 Python 프로젝트에 추가할 내용

---

## 기술 스택

### 웹 프레임워크 (선택)
- **FastAPI** (권장) - 비동기, OpenAPI 자동 생성
- **Django** - 풀스택, Admin 포함
- **Flask** - 마이크로 프레임워크

### ORM/데이터베이스
- SQLAlchemy 2.x (async 지원)
- Alembic (마이그레이션)
- PostgreSQL / SQLite

### 검증/직렬화
- Pydantic v2
- dataclasses

### 테스트
- pytest
- pytest-asyncio
- httpx (API 테스트)

### 도구
- Poetry / uv (패키지 관리)
- Ruff (린터 + 포매터)
- mypy (타입 체크)
- pre-commit

---

## 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 모듈/패키지 | snake_case | `user_service.py` |
| 클래스 | PascalCase | `UserService` |
| 함수/메서드 | snake_case | `get_user_by_id` |
| 변수 | snake_case | `user_id` |
| 상수 | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |
| private | _접두사 | `_internal_method` |
| 타입 별칭 | PascalCase | `UserId = int` |
| Pydantic 모델 | PascalCase | `CreateUserRequest` |

---

## 폴더 구조

### FastAPI (Clean Architecture)

```
{{PROJECT_NAME}}/
├── src/
│   └── {{PROJECT_NAME}}/
│       ├── __init__.py
│       ├── main.py                 # FastAPI 앱 진입점
│       ├── config.py               # 설정
│       │
│       ├── api/                    # 라우터
│       │   ├── __init__.py
│       │   ├── deps.py             # 의존성 주입
│       │   └── v1/
│       │       ├── __init__.py
│       │       ├── router.py
│       │       └── endpoints/
│       │           ├── __init__.py
│       │           └── users.py
│       │
│       ├── domain/                 # 비즈니스 로직
│       │   ├── __init__.py
│       │   ├── entities/
│       │   │   ├── __init__.py
│       │   │   └── user.py
│       │   ├── services/
│       │   │   ├── __init__.py
│       │   │   └── user_service.py
│       │   └── exceptions.py
│       │
│       ├── infrastructure/         # 외부 의존성
│       │   ├── __init__.py
│       │   ├── database/
│       │   │   ├── __init__.py
│       │   │   ├── session.py
│       │   │   └── models/
│       │   │       ├── __init__.py
│       │   │       └── user.py
│       │   └── repositories/
│       │       ├── __init__.py
│       │       └── user_repository.py
│       │
│       └── schemas/                # Pydantic 모델
│           ├── __init__.py
│           └── user.py
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── unit/
│   └── integration/
│
├── alembic/                        # 마이그레이션
│   ├── versions/
│   └── env.py
│
├── pyproject.toml
├── alembic.ini
└── README.md
```

### Django

```
{{PROJECT_NAME}}/
├── src/
│   ├── manage.py
│   ├── config/                     # 프로젝트 설정
│   │   ├── __init__.py
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── local.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   │
│   └── apps/                       # Django 앱
│       ├── users/
│       │   ├── __init__.py
│       │   ├── admin.py
│       │   ├── models.py
│       │   ├── views.py
│       │   ├── serializers.py
│       │   ├── urls.py
│       │   └── tests/
│       └── ...
│
├── tests/
├── pyproject.toml
└── README.md
```

---

## 코드 패턴

### FastAPI 엔드포인트

```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated

from {{PROJECT_NAME}}.api.deps import get_user_service
from {{PROJECT_NAME}}.domain.services.user_service import UserService
from {{PROJECT_NAME}}.schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> UserResponse:
    """사용자 조회."""
    user = await user_service.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> UserResponse:
    """사용자 생성."""
    return await user_service.create(data)
```

### Pydantic 스키마

```python
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


class UserBase(BaseModel):
    """사용자 기본 스키마."""
    
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr


class UserCreate(UserBase):
    """사용자 생성 요청."""
    
    password: str = Field(..., min_length=8)


class UserResponse(UserBase):
    """사용자 응답."""
    
    id: int
    is_active: bool
    created_at: datetime
    
    model_config = {"from_attributes": True}
```

### SQLAlchemy 모델

```python
from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from {{PROJECT_NAME}}.infrastructure.database.base import Base


class User(Base):
    """사용자 모델."""
    
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
```

### Repository 패턴

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from {{PROJECT_NAME}}.infrastructure.database.models.user import User


class UserRepository:
    """사용자 리포지토리."""
    
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
    
    async def get_by_id(self, user_id: int) -> User | None:
        """ID로 사용자 조회."""
        result = await self._session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def get_by_email(self, email: str) -> User | None:
        """이메일로 사용자 조회."""
        result = await self._session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
    
    async def create(self, user: User) -> User:
        """사용자 생성."""
        self._session.add(user)
        await self._session.flush()
        return user
```

### Service 패턴

```python
from {{PROJECT_NAME}}.domain.exceptions import UserAlreadyExistsError
from {{PROJECT_NAME}}.infrastructure.repositories.user_repository import UserRepository
from {{PROJECT_NAME}}.infrastructure.database.models.user import User
from {{PROJECT_NAME}}.schemas.user import UserCreate


class UserService:
    """사용자 서비스."""
    
    def __init__(self, repository: UserRepository) -> None:
        self._repository = repository
    
    async def get_by_id(self, user_id: int) -> User | None:
        """ID로 사용자 조회."""
        return await self._repository.get_by_id(user_id)
    
    async def create(self, data: UserCreate) -> User:
        """사용자 생성."""
        existing = await self._repository.get_by_email(data.email)
        if existing:
            raise UserAlreadyExistsError(f"Email {data.email} already exists")
        
        user = User(
            name=data.name,
            email=data.email,
            hashed_password=self._hash_password(data.password),
        )
        return await self._repository.create(user)
    
    def _hash_password(self, password: str) -> str:
        """비밀번호 해시."""
        import bcrypt
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
```

---

## 🚫 금지 사항

1. **`# type: ignore` 남용** - 타입 문제는 해결할 것
2. **`Any` 타입** - 구체적인 타입 사용
3. **bare `except:`** - 구체적인 예외 명시
4. **mutable default argument** - `def func(items=[])` ❌
5. **global 변수** - 의존성 주입 사용
6. **print() 디버깅** - logging 사용
7. **하드코딩된 설정** - 환경변수/config 사용
8. **동기 코드와 비동기 혼용** - 일관성 유지

---

## ✅ 필수 설정 파일

### pyproject.toml

```toml
[project]
name = "{{PROJECT_NAME}}"
version = "0.1.0"
requires-python = ">=3.11"

dependencies = [
    "fastapi>=0.109.0",
    "uvicorn[standard]>=0.27.0",
    "sqlalchemy[asyncio]>=2.0.0",
    "asyncpg>=0.29.0",
    "pydantic>=2.5.0",
    "pydantic-settings>=2.1.0",
    "alembic>=1.13.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "httpx>=0.26.0",
    "ruff>=0.2.0",
    "mypy>=1.8.0",
    "pre-commit>=3.6.0",
]

[tool.ruff]
target-version = "py311"
line-length = 88

[tool.ruff.lint]
select = ["E", "F", "I", "N", "UP", "B", "C4", "SIM"]

[tool.mypy]
python_version = "3.11"
strict = true
warn_return_any = true
warn_unused_ignores = true

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

### .pre-commit-config.yaml

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.2.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.8.0
    hooks:
      - id: mypy
        additional_dependencies: [pydantic]
```

---

## 타입 힌팅 가이드

```python
from typing import Annotated, TypeAlias
from collections.abc import Sequence

# 타입 별칭
UserId: TypeAlias = int
Email: TypeAlias = str

# 함수 시그니처
def get_users(
    *,
    skip: int = 0,
    limit: int = 100,
    is_active: bool | None = None,
) -> Sequence[User]:
    ...

# 제네릭
from typing import TypeVar, Generic

T = TypeVar("T")

class Repository(Generic[T]):
    async def get_by_id(self, id: int) -> T | None:
        ...
```

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-05 | 초기 버전 생성 |
