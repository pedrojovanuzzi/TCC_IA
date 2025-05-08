from pydantic import BaseModel
from typing import List

class TokenRequest(BaseModel):
    username: str
    password: str

class DeleteFileRequest(BaseModel):
    folder: str
    filename: str

class DeleteRequest(BaseModel):
    folder: str
    filenames: List[str]

class Camera(BaseModel):
    name: str
    ip: str

class CameraOut(Camera):
    id: int

class DecryptRequest(BaseModel):
    folder: str
    filename: str
    
class DecryptRequest(BaseModel):
    folder: str
    filename: str