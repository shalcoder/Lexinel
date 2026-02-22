from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import StreamingResponse
from services.sentinel_service import sentinel_scanner
from services.sar_generator import SARGenerator
from services.gemini import GeminiService
from services.storage import policy_db
import json
import io

router = APIRouter()
sar_gen = SARGenerator()
gemini = GeminiService()

@router.get("/scan")
async def start_sentinel_scan():
    """
    Starts a real-time scan of the IBM AML transactions.
    """
    async def event_generator():
        async for result in sentinel_scanner.scan_stream():
            yield f"data: {result.json()}\n\n"
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/violations")
async def get_violations():
    """
    Returns the queue of flagged transactions pending review.
    """
    return policy_db.get_hitl_violations()

@router.post("/resolve")
async def resolve_violation(data: dict = Body(...)):
    """
    Clears a violation from the HITL queue.
    """
    violation_id = data.get("id")
    if violation_id:
        policy_db.resolve_hitl_violation(violation_id)
        return {"status": "resolved"}
    raise HTTPException(status_code=400, detail="Missing violation id")

@router.post("/sar")
async def generate_sar(violation: dict = Body(...)):
    """
    Generates a formal SAR PDF for a specific violation.
    Uses Gemini to generate the chronological narrative.
    """
    try:
        # 1. Generate Narrative with Gemini
        prompt = f"""
        Act as a Senior AML Investigator. Generate a formal chronological narrative for a Suspicious Activity Report (SAR).
        Transaction Details: {json.dumps(violation)}
        
        The narrative should explain:
        1. Why this activity is suspicious (e.g. high value, smurfing, tax haven).
        2. The chronological flow of funds.
        3. Recommended next steps for law enforcement.
        
        Keep it professional, detailed, and forensic.
        """
        narrative = await gemini.chat_compliance(prompt, "SAR Narrative Generation Context")
        
        # 2. Generate PDF
        pdf_bytes = sar_gen.create_sar_report(violation, narrative)
        
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=SAR_{violation.get('id', 'Unknown')}.pdf"}
        )
    except Exception as e:
        print(f"[Sentinel API] SAR Generation Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/review")
async def send_to_human_review(data: dict = Body(...)):
    """
    Marks a violation as 'sent to human review' in the HITL queue.
    """
    violation_id = data.get("id")
    if not violation_id:
        raise HTTPException(status_code=400, detail="Missing violation id")

    # Find and update the violation tag
    violations = policy_db.get_hitl_violations()
    for v in violations:
        if v.get("id") == violation_id or v.get("transaction_id") == violation_id:
            v["review_status"] = "HUMAN_REVIEW"
            v["reviewed_at"] = __import__("datetime").datetime.now().isoformat()
            return {"status": "queued_for_review", "id": violation_id}

    # If not in HITL queue yet (e.g. flagged during scan), add it
    policy_db.add_hitl_violation({
        "id": violation_id,
        "transaction_id": violation_id,
        "review_status": "HUMAN_REVIEW",
        "verdict": "FLAGGED",
        "reviewed_at": __import__("datetime").datetime.now().isoformat(),
        **{k: v for k, v in data.items() if k != "id"},
    })
    return {"status": "queued_for_review", "id": violation_id}


@router.post("/freeze")
async def freeze_account(data: dict = Body(...)):
    """
    Freezes an account associated with a violation.
    Tags the HITL violation with frozen status.
    """
    violation_id = data.get("id")
    account_id   = data.get("account_id", "UNKNOWN")
    if not violation_id:
        raise HTTPException(status_code=400, detail="Missing violation id")

    violations = policy_db.get_hitl_violations()
    for v in violations:
        if v.get("id") == violation_id or v.get("transaction_id") == violation_id:
            v["review_status"] = "ACCOUNT_FROZEN"
            v["frozen_account"] = account_id
            v["frozen_at"] = __import__("datetime").datetime.now().isoformat()
            return {"status": "frozen", "account_id": account_id}

    policy_db.add_hitl_violation({
        "id": violation_id,
        "transaction_id": violation_id,
        "review_status": "ACCOUNT_FROZEN",
        "frozen_account": account_id,
        "frozen_at": __import__("datetime").datetime.now().isoformat(),
        **{k: v for k, v in data.items() if k != "id"},
    })
    return {"status": "frozen", "account_id": account_id}
