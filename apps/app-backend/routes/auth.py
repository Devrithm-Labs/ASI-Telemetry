from fastapi import APIRouter, Depends, status

from auth.dependencies import get_current_user
from auth.schemas import AuthResponse, LoginRequest, SignupRequest, UserResponse
from auth.service import login, signup

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup_endpoint(payload: SignupRequest):
    """Create a user account and return an access token."""
    return signup(payload)


@router.post("/login", response_model=AuthResponse)
def login_endpoint(payload: LoginRequest):
    """Verify credentials and return an access token."""
    return login(payload)


@router.get("/me", response_model=UserResponse)
def current_user_endpoint(current_user: UserResponse = Depends(get_current_user)):
    """Return the account associated with the supplied Bearer token."""
    return current_user
