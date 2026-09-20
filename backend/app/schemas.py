from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr

# --- User Schemas ---
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "USER"

UserCreate = UserRegister  # Alias to prevent import conflicts

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# --- Venue Schemas ---
class VenueCreate(BaseModel):
    name: str
    capacity: int
    location: str

class VenueOut(BaseModel):
    id: int
    name: str
    capacity: int
    location: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Event Schemas ---
class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    date: str
    time: str
    venue_id: int
    capacity: int

class EventOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    date: str
    time: str
    venue_id: int
    capacity: int
    status: str
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Registration Schemas ---
class RegistrationCreate(BaseModel):
    event_id: int

class RegistrationOut(BaseModel):
    id: int
    user_id: int
    event_id: int
    status: str
    registered_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Agent Chat & Log Schemas ---
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ToolCallLog(BaseModel):
    tool_name: str
    tool_input: Optional[str] = None
    tool_output: Optional[str] = None
    latency_ms: Optional[float] = None

class ChatResponse(BaseModel):
    reply: str
    session_id: str
    detected_intent: Optional[str] = None
    tools_used: List[str] = []
    tool_calls: List[ToolCallLog] = []

class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    ip_address: Optional[str] = None
    details: Optional[str] = None
    timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True
