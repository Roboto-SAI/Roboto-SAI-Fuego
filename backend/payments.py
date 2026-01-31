"""
Stripe Payment Integration Module
Handles checkout sessions and webhooks for subscriptions.
"""

import os
import logging
import stripe
from fastapi import APIRouter, HTTPException, Header, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from .utils.supabase_client import get_supabase_client
from supabase import create_client, Client

def get_service_client() -> Optional[Client]:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return None
    return create_client(url, key)

from datetime import datetime, timezone

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
logger.debug("Stripe initialized: secret key configured=%s", bool(stripe.api_key))


class CheckoutRequest(BaseModel):
    price_id: Optional[str] = None
    success_url: str
    cancel_url: str


@router.post("/api/create-checkout-session", tags=["Payments"])
async def create_checkout_session(req: CheckoutRequest, request: Request):
    """Create a Stripe Checkout Session for subscription."""
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Payment service unavailable")

    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=503, detail="Service unavailable")

    session_id_cookie = request.cookies.get("session_id")
    if not session_id_cookie:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Verify session with expiration check
    try:
        now = datetime.now(timezone.utc).isoformat()
        sess_res = supabase.table("auth_sessions").select("user_id").eq("id", session_id_cookie).gte("expires_at", now).execute()
        if not sess_res.data:
            raise HTTPException(status_code=401, detail="Session expired or invalid")
        
        user_id = sess_res.data[0]["user_id"]
        
        # Get user email
        user_res = supabase.table("users").select("email").eq("id", user_id).execute()
        user_email = user_res.data[0]["email"] if user_res.data else None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth check failed: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

    price_id = req.price_id or os.getenv("STRIPE_PRICE_ID")
    if not price_id:
        raise HTTPException(status_code=400, detail="Price not configured")

    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price": price_id,
                    "quantity": 1,
                },
            ],
            mode="subscription",
            success_url=req.success_url,
            cancel_url=req.cancel_url,
            customer_email=user_email,
            client_reference_id=user_id,
            metadata={
                "user_id": user_id
            }
        )
        return {"sessionId": checkout_session.id, "url": checkout_session.url}
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=400, detail="Payment processing failed")
    except Exception as e:
        logger.error(f"Checkout error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")


@router.post("/api/stripe-webhook", tags=["Payments"])
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    """Handle Stripe webhooks."""
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    payload = await request.body()

    if not webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook not configured")

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the event
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        handle_checkout_completed(session)
    elif event["type"] == "customer.subscription.updated":
         # Logic to update subscription status (e.g. renewals, cancellations)
         pass
    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        handle_subscription_deleted(subscription)

    return JSONResponse(content={"status": "success"})


def handle_checkout_completed(session):
    """Activate subscription for user."""
    user_id = session.get("client_reference_id")
    subscription_id = session.get("subscription")
    customer_id = session.get("customer")
    
    if not user_id:
        user_id = session.get("metadata", {}).get("user_id")
        
    if not user_id:
        logger.error("No user_id found in session")
        return

    logger.info(f"Activating subscription for user {user_id}")
    
    supabase = get_service_client() or get_supabase_client()
    if not supabase:
        logger.error("Database not available for webhook")
        return

    try:
        data = {
            "subscription_status": "active",
            "subscription_id": subscription_id,
            "stripe_customer_id": customer_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        supabase.table("users").update(data).eq("id", user_id).execute()
        logger.info(f"User {user_id} upgraded to premium")
    except Exception as e:
        logger.error(f"Failed to update user subscription: {e}")

def handle_subscription_deleted(subscription):
    """Deactivate subscription."""
    customer_id = subscription.get("customer")
    
    supabase = get_service_client() or get_supabase_client()
    if not supabase:
        return

    try:
        res = supabase.table("users").select("id").eq("stripe_customer_id", customer_id).execute()
        
        if res.data:
            user_id = res.data[0]["id"]
            data = {
                "subscription_status": "inactive",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            supabase.table("users").update(data).eq("id", user_id).execute()
            logger.info(f"Subscription canceled for user {user_id}")
        else:
            logger.warning(f"No user found for canceled subscription customer {customer_id}")
            
    except Exception as e:
        logger.error(f"Failed to cancel subscription: {e}")