"""
Roboto SAI SDK - Advanced AI Integration Platform
Created by Roberto Villarreal Martinez

Core modules:
- xai_grok: xAI Grok SDK integration with entangled reasoning
- roboto_sai_client: Main client for Roboto SAI operations
"""

from .xai_grok_integration import XAIGrokIntegration, get_xai_grok, integrate_grok_with_roboto
from .roboto_sai_client import RobotoSAIClient

__version__ = "0.1.0"
__author__ = "Roberto Villarreal Martinez"
__license__ = "RVM-ECOL v1.0"

__all__ = [
    "XAIGrokIntegration",
    "get_xai_grok",
    "integrate_grok_with_roboto",
    "RobotoSAIClient"
]