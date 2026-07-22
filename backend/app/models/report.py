from pydantic import BaseModel


class ReportCreateRequest(BaseModel):
    session_id: str


class ReportCreateResponse(BaseModel):
    report_id: str
    file_path: str
    recommendation: str
    final_score: float
