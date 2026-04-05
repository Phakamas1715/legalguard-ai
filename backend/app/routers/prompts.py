"""Prompt Templates API — ตัวอย่าง Prompt สำหรับงานสนับสนุนศาลไทย.

สอดคล้องกับหลักธรรมาภิบาลปัญญาประดิษฐ์ในกระบวนการยุติธรรม
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.services.prompt_templates import (
    get_template,
    list_templates,
    render_template,
)

router = APIRouter(prefix="/prompts", tags=["prompt-templates"])


class RenderRequest(BaseModel):
    template_id: str
    variables: dict = Field(default_factory=dict)


@router.get("/templates")
async def get_templates(
    category: Optional[str] = Query(None, description="case_summary, evidence_analysis, witness_exam, admin"),
    role: Optional[str] = Query(None, description="judge, admin_judge, lawyer, government, all"),
):
    """List available prompt templates, optionally filtered by category or role."""
    templates = list_templates(category=category, role=role)
    return {
        "total": len(templates),
        "templates": [
            {
                "id": t.id,
                "name": t.name,
                "name_en": t.name_en,
                "category": t.category,
                "target_role": t.target_role,
                "description": t.description,
            }
            for t in templates
        ],
    }


@router.get("/templates/{template_id}")
async def get_template_detail(template_id: str):
    """Get full prompt template by ID."""
    tmpl = get_template(template_id)
    if not tmpl:
        return {"error": f"Template '{template_id}' not found"}
    return tmpl.model_dump()


@router.post("/render")
async def render(req: RenderRequest):
    """Render a prompt template with given variables."""
    result = render_template(req.template_id, **req.variables)
    if result is None:
        return {"error": f"Template '{req.template_id}' not found"}
    tmpl = get_template(req.template_id)
    return {
        "template_id": req.template_id,
        "rendered_prompt": result,
        "disclaimer": tmpl.disclaimer if tmpl else "",
    }
