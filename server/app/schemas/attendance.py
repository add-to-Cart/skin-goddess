from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict


# Valid status values — documented here for the router to reference
ATTENDANCE_STATUSES = ("present", "late", "absent", "leave")


class AttendanceCreate(BaseModel):
    employee_id: int
    attendance_date: date
    status: str = "present"
    time_in: time | None = None
    time_out: time | None = None
    overtime_hours: float | None = None
    notes: str | None = None


class AttendanceUpdate(BaseModel):
    status: str | None = None
    time_in: time | None = None
    time_out: time | None = None
    overtime_hours: float | None = None
    notes: str | None = None


class AttendanceResponse(BaseModel):
    id: int
    employee_id: int
    attendance_date: date
    status: str
    time_in: time | None
    time_out: time | None
    overtime_hours: float | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
