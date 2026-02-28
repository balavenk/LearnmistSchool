from typing import Any, Dict, List, TypeVar, Generic
from sqlalchemy.orm import Query
from math import ceil

T = TypeVar('T')

def paginate_query(query: Query, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    total_pages = ceil(total / page_size) if page_size else 1
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }
