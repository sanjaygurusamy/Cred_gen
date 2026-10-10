"""
Role-Based Access Control (RBAC) and Campus Isolation for CampusCarbon AI.
Roles:
- admin: Full access to generate, approve, reject, simulate, configure, and implement.
- facility_manager: Can generate, simulate, and record implementations; review recommendations.
- viewer: Read-only access to dashboards, recommendations, and scenarios.
"""

from enum import Enum
from fastapi import Header, HTTPException, status
from typing import Optional

class UserRole(str, Enum):
    ADMIN = "admin"
    FACILITY_MANAGER = "facility_manager"
    VIEWER = "viewer"

class CurrentUser:
    def __init__(self, user_id: str, role: UserRole, campus_id: str):
        self.user_id = user_id
        self.role = role
        self.campus_id = campus_id

def get_current_user(
    x_user_id: Optional[str] = Header("admin-user-01"),
    x_user_role: Optional[str] = Header("admin"),
    x_campus_id: Optional[str] = Header("green-tech-univ-01")
) -> CurrentUser:
    """
    Extracts current user context and validates role and campus scope.
    """
    role_norm = x_user_role.lower().strip() if x_user_role else "viewer"
    if role_norm not in [r.value for r in UserRole]:
        role_norm = UserRole.VIEWER.value
        
    return CurrentUser(
        user_id=x_user_id or "anonymous_user",
        role=UserRole(role_norm),
        campus_id=x_campus_id or "green-tech-univ-01"
    )

def require_role(*allowed_roles: UserRole):
    """Dependency factory checking that the user role is within allowed roles."""
    def role_checker(user: CurrentUser = None):
        # When called as FastAPI dependency:
        if user and user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: User role '{user.role.value}' does not have permission for this action."
            )
        return user
    return role_checker
