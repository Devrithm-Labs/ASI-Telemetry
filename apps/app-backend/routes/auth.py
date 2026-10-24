from fastapi import APIRouter, Depends, status

from auth.agent_linking import create_agent_link_token, verify_agent_link_token
from auth.dependencies import get_current_user
from auth.schemas import (
    AgentLinkTokenResponse,
    AuthResponse,
    LoginRequest,
    SignupRequest,
    UserResponse,
    VerifyAgentLinkRequest,
    VerifyAgentLinkResponse,
)
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


@router.post("/agent-link-token", response_model=AgentLinkTokenResponse)
def generate_agent_link_token_endpoint(current_user: UserResponse = Depends(get_current_user)):
    """
    Generates a short-lived (5 min), single-use pairing token for linking the
    authenticated account with the ASI:One chatbot agent without exposing raw API keys.
    """
    return create_agent_link_token(user_id=current_user.id)


@router.post("/verify-agent-link", response_model=VerifyAgentLinkResponse)
def verify_agent_link_endpoint(payload: VerifyAgentLinkRequest):
    """
    Verifies a one-time pairing token sent by the ASI:One chatbot agent.
    If valid, burns the token and returns a dedicated scoped session credential.
    """
    return verify_agent_link_token(token=payload.token, sender_address=payload.sender_address)

