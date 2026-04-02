from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.project import Project
from app.services.export_service import export_to_docx

router = APIRouter(tags=["export"])


@router.post("/projects/{project_id}/export")
def export_project(
    project_id: str,
    body: dict = {},
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    include_unanswered = body.get("include_unanswered", False)

    try:
        docx_bytes = export_to_docx(db, project_id, include_unanswered=include_unanswered)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    safe_name = project.name.replace(" ", "_").replace("/", "-")[:50]
    filename = f"{safe_name}_answers.docx"

    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
