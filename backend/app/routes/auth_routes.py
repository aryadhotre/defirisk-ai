# backend/app/routes/auth_routes.py
"""
Auth endpoints. Mounted at /auth in main.py.
  POST /auth/signup  -> create user, return token
  POST /auth/login   -> verify creds, return token
  GET  /auth/me      -> current user (used by frontend to validate a stored token)
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.user_model import User
from app.security import hash_password, verify_password, create_access_token
from app.deps import get_current_user

router = APIRouter()


class SignupReq(BaseModel):
    email: EmailStr
    password: str


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class TokenResp(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str


@router.post("/signup", response_model=TokenResp)
def signup(body: SignupReq, db: Session = Depends(get_db)):
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    email = body.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(email=email, hashed_password=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResp(access_token=token, email=user.email)


@router.post("/login", response_model=TokenResp)
def login(body: LoginReq, db: Session = Depends(get_db)):
    email = body.email.lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user.id)})
    return TokenResp(access_token=token, email=user.email)


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email}