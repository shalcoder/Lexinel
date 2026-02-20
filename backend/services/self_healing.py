"""
Self-Healing Service Module

Orchestrates autonomous AI agent self-healing by:
1. Analyzing vulnerabilities detected in agent responses
2. Generating patched system prompts using Gemini
3. Deploying patches to Stream 2 agents
4. Tracking healing history in Firestore
"""

import httpx
import json
from typing import List, Dict, Optional
from datetime import datetime
import uuid

from services.gemini import GeminiService
from services.storage import PolicyStorage


class SelfHealingService:
    def __init__(self):
        self.gemini = GeminiService()
        self.db = PolicyStorage()
    
    def is_self_healing_enabled(self) -> bool:
        """Check if user has enabled self-healing feature"""
        try:
            settings = self.db.get_gatekeeper_settings()
            return settings.get('self_healing_enabled', False)
        except Exception as e:
            print(f"[Self-Healing] Error checking status: {e}")
            return False
    
    async def generate_patch(
        self, 
        agent_id: str,
        current_prompt: str,
        violations: List[str]
    ) -> Dict:
        """
        Generate a patched system prompt using Gemini AI
        
        Args:
            agent_id: Identifier for the agent being patched
            current_prompt: Current system prompt of the agent
            violations: List of detected vulnerabilities
            
        Returns:
            Dict with patched_prompt, analysis, and metadata
        """
        try:
            # Call Gemini to generate patch
            patched_prompt = await self.gemini.hot_patch_system_prompt(
                current_prompt, 
                violations
            )
            
            # Generate healing ID
            healing_id = f"HEAL-{uuid.uuid4().hex[:8].upper()}"
            
            # Create analysis metadata
            analysis = {
                "healing_id": healing_id,
                "agent_id": agent_id,
                "violations_detected": violations,
                "timestamp": datetime.now().isoformat(),
                "status": "patch_generated",
                "patched_prompt": patched_prompt,
                "original_prompt_hash": hash(current_prompt)
            }
            
            return analysis
            
        except Exception as e:
            print(f"[Self-Healing] Patch generation failed: {e}")
            raise Exception(f"Failed to generate patch: {str(e)}")
    
    async def deploy_patch(
        self,
        agent_url: str,
        patched_prompt: str,
        healing_id: str
    ) -> Dict:
        """
        Deploy patched prompt to Stream 2 agent
        
        Args:
            agent_url: Base URL of the Stream 2 agent
            patched_prompt: The patched system prompt to deploy
            healing_id: Unique identifier for this healing operation
            
        Returns:
            Dict with deployment status and details
        """
        try:
            # Construct endpoint URL
            endpoint = f"{agent_url.rstrip('/')}/system/update-prompt"
            
            # Send patch to agent
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    endpoint,
                    json={"system_prompt": patched_prompt},
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    result = {
                        "healing_id": healing_id,
                        "status": "deployed",
                        "timestamp": datetime.now().isoformat(),
                        "agent_response": response.json(),
                        "success": True
                    }
                else:
                    result = {
                        "healing_id": healing_id,
                        "status": "deployment_failed",
                        "timestamp": datetime.now().isoformat(),
                        "error": f"Agent returned status {response.status_code}",
                        "success": False
                    }
                    
            return result
            
        except httpx.TimeoutException:
            return {
                "healing_id": healing_id,
                "status": "deployment_failed",
                "timestamp": datetime.now().isoformat(),
                "error": "Agent connection timeout",
                "success": False
            }
        except Exception as e:
            print(f"[Self-Healing] Deployment failed: {e}")
            return {
                "healing_id": healing_id,
                "status": "deployment_failed",
                "timestamp": datetime.now().isoformat(),
                "error": str(e),
                "success": False
            }
    
    async def track_healing_history(self, healing_record: Dict):
        """
        Store healing operation in Firestore history
        
        Args:
            healing_record: Complete record of the healing operation
        """
        try:
            # Add to Firestore healing_history collection
            await self.db.add_healing_record(healing_record)
            print(f"[Self-Healing] Recorded healing: {healing_record.get('healing_id')}")
        except Exception as e:
            print(f"[Self-Healing] Failed to track history: {e}")
    
    async def get_healing_history(self, limit: int = 20) -> List[Dict]:
        """
        Retrieve recent healing operations
        
        Args:
            limit: Maximum number of records to return
            
        Returns:
            List of healing records, newest first
        """
        try:
            return await self.db.get_healing_history(limit)
        except Exception as e:
            print(f"[Self-Healing] Failed to retrieve history: {e}")
            return []
    
    async def test_agent_endpoint(self, agent_url: str) -> Dict:
        """
        Test if Stream 2 agent has self-healing endpoint implemented
        
        Args:
            agent_url: Base URL of the Stream 2 agent
            
        Returns:
            Dict with test results
        """
        try:
            endpoint = f"{agent_url.rstrip('/')}/system/update-prompt"
            
            # Send test payload
            test_prompt = "TEST_PROMPT_DO_NOT_APPLY"
            
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    endpoint,
                    json={"system_prompt": test_prompt},
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    return {
                        "success": True,
                        "message": "Self-healing endpoint is ready",
                        "agent_response": response.json()
                    }
                else:
                    return {
                        "success": False,
                        "message": f"Endpoint returned status {response.status_code}",
                        "details": response.text[:200]
                    }
                    
        except httpx.TimeoutException:
            return {
                "success": False,
                "message": "Connection timeout - agent may not be running"
            }
        except httpx.ConnectError:
            return {
                "success": False,
                "message": "Cannot connect to agent - check URL and ensure agent is running"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Test failed: {str(e)}"
            }


# Global instance
self_healing_service = SelfHealingService()
