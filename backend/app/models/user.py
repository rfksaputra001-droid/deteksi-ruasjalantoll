"""
User Model - Pydantic schemas for User
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from bson import ObjectId

# Try to import EmailStr, fallback to str with email pattern if not available
try:
    from pydantic import EmailStr
    EmailType = EmailStr
    EMAIL_PATTERN = None  # EmailStr handles validation internally
except ImportError:
    # Fallback to str with email pattern validation
    EmailType = str
    EMAIL_PATTERN = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'


class PyObjectId(str):
    """Custom ObjectId type for Pydantic"""
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, info):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)


class UserBase(BaseModel):
    namaUser: str = Field(..., min_length=1, max_length=100)
    emailUser: EmailType = Field(..., pattern=EMAIL_PATTERN)
    role: str = Field(default="user", pattern="^(admin|surveyor|user)$")
    isActive: bool = True
    phoneNumber: Optional[str] = None
    profileImage: Optional[str] = None


class UserCreate(UserBase):
    passwordUser: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    namaUser: Optional[str] = Field(None, min_length=1, max_length=100)
    emailUser: Optional[EmailType] = Field(None, pattern=EMAIL_PATTERN)
    role: Optional[str] = Field(None, pattern="^(admin|surveyor|user)$")
    isActive: Optional[bool] = None
    phoneNumber: Optional[str] = None
    profileImage: Optional[str] = None


class UserInDB(UserBase):
    id: str = Field(alias="_id")
    passwordUser: str
    lastLogin: Optional[datetime] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class UserResponse(BaseModel):
    id: str
    namaUser: str
    emailUser: str
    role: str
    isActive: bool
    phoneNumber: Optional[str] = None
    profileImage: Optional[str] = None
    lastLogin: Optional[datetime] = None
    createdAt: Optional[datetime] = None

    class Config:
        populate_by_name = True


class UserLoginRequest(BaseModel):
    emailUser: EmailStr
    passwordUser: str


class UserRegisterRequest(BaseModel):
    namaUser: str = Field(..., min_length=1, max_length=100)
    emailUser: EmailStr
    passwordUser: str = Field(..., min_length=6)


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str = Field(..., min_length=6)


class TokenResponse(BaseModel):
    status: str = "success"
    message: str
    data: dict
