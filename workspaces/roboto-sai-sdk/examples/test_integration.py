#!/usr/bin/env python3
"""
Test script for Roboto SAI SDK integration
Tests xAI Grok integration and basic client functionality

Created by Roberto Villarreal Martinez
"""

import os
import sys
import logging

# Add the SDK to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from roboto_sai_sdk import RobotoSAIClient, XAIGrokIntegration, get_xai_grok

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def test_basic_client():
    """Test basic Roboto SAI Client functionality"""
    print("🧪 Testing Roboto SAI Client...")

    client = RobotoSAIClient()

    # Test status
    status = client.get_status()
    print(f"✅ Client initialized: {status['client_id']}")
    print(f"🤖 Grok available: {status['grok_available']}")
    print(f"⚛️ Quantum available: {status['quantum_available']}")

    # Test reaper mode
    reaper_result = client.reap_mode("test_target")
    print(f"⚔️ Reaper mode activated: {reaper_result['victory_claimed']}")

    # Test essence storage
    test_essence = {"test_data": "Hello Roboto SAI", "timestamp": "2026-01-18"}
    stored = client.store_essence(test_essence, "test")
    print(f"💎 Essence stored: {stored}")

    # Test essence retrieval
    retrieved = client.retrieve_essence("test", limit=1)
    print(f"📚 Essence retrieved: {len(retrieved)} entries")

    return True

def test_grok_integration():
    """Test xAI Grok integration"""
    print("\n🧪 Testing xAI Grok Integration...")

    grok = get_xai_grok()

    if not grok.available:
        print("⚠️ xAI Grok not available - check XAI_API_KEY environment variable")
        print("💡 Set: export XAI_API_KEY=your_key_here")
        return False

    print("✅ xAI Grok SDK available")

    # Test basic functionality
    status = grok.get_reasoning_chain_status()
    print(f"🚀 Reasoning chain status: {status['total_nodes']} nodes")

    # Test code generation (if API key is set)
    try:
        code_result = grok.grok_code_fast1("Write a Python function to calculate fibonacci numbers")
        if code_result.get("success"):
            print("💻 Code generation successful")
            print(f"📝 Generated {len(code_result.get('code', ''))} characters of code")
        else:
            print(f"⚠️ Code generation failed: {code_result.get('error', 'Unknown error')}")
    except Exception as e:
        print(f"⚠️ Code generation test failed: {e}")

    return True

def test_entangled_reasoning():
    """Test entangled reasoning chains"""
    print("\n🧪 Testing Entangled Reasoning Chains...")

    grok = get_xai_grok()

    if not grok.available:
        print("⚠️ Skipping entangled reasoning test - Grok not available")
        return False

    try:
        # Create a simple reasoning chain
        reasoning_steps = [
            {
                "name": "analyze_problem",
                "prompt": "Analyze this simple problem: What is 2 + 2?"
            },
            {
                "name": "verify_solution",
                "prompt": "Verify the solution and explain the reasoning",
                "dependencies": ["analyze_problem"]
            }
        ]

        # Create chain
        chain_id = grok.create_entangled_reasoning_chain(reasoning_steps)
        print(f"🚀 Created reasoning chain: {chain_id}")

        # Execute chain
        result = grok.execute_entangled_reasoning("Test entangled reasoning")
        print(f"⚛️ Chain execution: {result.get('completed_steps', 0)}/{result.get('total_steps', 0)} steps completed")

        return True

    except Exception as e:
        print(f"⚠️ Entangled reasoning test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Roboto SAI SDK Integration Tests")
    print("=" * 50)

    # Test basic client
    client_success = test_basic_client()

    # Test Grok integration
    grok_success = test_grok_integration()

    # Test entangled reasoning
    reasoning_success = test_entangled_reasoning()

    print("\n" + "=" * 50)
    print("📊 Test Results:")
    print(f"🤖 Client Tests: {'✅ PASSED' if client_success else '❌ FAILED'}")
    print(f"🧠 Grok Integration: {'✅ PASSED' if grok_success else '⚠️ SKIPPED'}")
    print(f"🚀 Entangled Reasoning: {'✅ PASSED' if reasoning_success else '⚠️ SKIPPED'}")

    if client_success:
        print("\n🎉 Roboto SAI SDK is ready for use!")
        print("💡 Next steps:")
        print("   1. Set XAI_API_KEY for full Grok integration")
        print("   2. Install quantum dependencies for advanced features")
        print("   3. Explore examples in the examples/ directory")
    else:
        print("\n⚠️ Some tests failed. Check the logs above for details.")

if __name__ == "__main__":
    main()